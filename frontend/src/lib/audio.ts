/**
 * High-performance, cross-platform Web Audio manager for Singularity '26.
 * Bypasses modern browser autoplay restrictions on iOS Safari, Android Chrome,
 * desktop Chrome, Safari, and Edge via global interaction listeners, hardware
 * pipeline priming (silent buffer play), and synchronous/asynchronous context resumption.
 */

type AudioStateListener = (unlocked: boolean) => void;

class SoundManager {
  private ctx: AudioContext | null = null;
  private isUnlocked: boolean = false;
  private listeners: Set<AudioStateListener> = new Set();
  private setupDone: boolean = false;

  constructor() {
    if (typeof window !== 'undefined') {
      this.initGlobalListeners();
    }
  }

  private getAudioContextClass(): typeof AudioContext | null {
    if (typeof window === 'undefined') return null;
    return (
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext ||
      null
    );
  }

  public getContext(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    if (!this.ctx) {
      const AudioCtx = this.getAudioContextClass();
      if (AudioCtx) {
        try {
          this.ctx = new AudioCtx();
        } catch (e) {
          console.warn('[Audio] Failed to instantiate AudioContext:', e);
        }
      }
    }
    return this.ctx;
  }

  public subscribe(listener: AudioStateListener): () => void {
    this.listeners.add(listener);
    listener(this.isUnlocked);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notifyListeners() {
    this.listeners.forEach((fn) => {
      try {
        fn(this.isUnlocked);
      } catch (err) {
        console.error('[Audio] Error in listener:', err);
      }
    });
  }

  public checkUnlocked(): boolean {
    if (!this.ctx) {
      this.getContext();
    }
    if (this.ctx && this.ctx.state === 'running') {
      if (!this.isUnlocked) {
        this.isUnlocked = true;
        this.notifyListeners();
      }
      return true;
    }
    return this.isUnlocked;
  }

  /**
   * Unlock Web Audio hardware. Safe to call on ANY user gesture (touch, click, key).
   */
  public async unlock(): Promise<boolean> {
    const ctx = this.getContext();
    if (!ctx) return false;

    try {
      if (ctx.state === 'suspended') {
        await ctx.resume();
      }

      // Play 1-sample silent buffer — essential on iOS Safari to awaken audio hardware
      const buffer = ctx.createBuffer(1, 1, 22050);
      const source = ctx.createBufferSource();
      source.buffer = buffer;
      source.connect(ctx.destination);
      source.start(0);

      if (ctx.state === 'running') {
        this.isUnlocked = true;
        this.notifyListeners();
        return true;
      }
    } catch (e) {
      console.warn('[Audio] Unlock attempt deferred until direct user gesture:', e);
    }

    const running = ctx.state === 'running';
    if (running !== this.isUnlocked) {
      this.isUnlocked = running;
      this.notifyListeners();
    }
    return running;
  }

  /**
   * Automatically arm user gesture listeners on window/document.
   */
  public initGlobalListeners() {
    if (this.setupDone || typeof window === 'undefined') return;
    this.setupDone = true;

    const handleInteraction = async () => {
      const ok = await this.unlock();
      if (ok) {
        // Remove listeners once unlocked
        removeListeners();
      }
    };

    const events = ['pointerdown', 'touchstart', 'touchend', 'mousedown', 'keydown', 'click'];
    const addListeners = () => {
      events.forEach((ev) => {
        window.addEventListener(ev, handleInteraction, { capture: true, passive: true });
      });
    };

    const removeListeners = () => {
      events.forEach((ev) => {
        window.removeEventListener(ev, handleInteraction, { capture: true });
      });
    };

    addListeners();

    // Also check on tab focus or visibility change
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden && this.ctx && this.ctx.state === 'suspended') {
        this.unlock().catch(() => {});
      }
    });
  }

  /**
   * Synthesize and play the signature high-impact countdown beep.
   * Driven to 0 dBFS true peak with waveshaper saturation for maximum clarity and presence.
   */
  public async playBeep(freq = 800, durationMs = 150): Promise<boolean> {
    const ctx = this.getContext();
    if (!ctx) return false;

    try {
      if (ctx.state === 'suspended') {
        await ctx.resume();
      }
    } catch {
      // Audio context might be restricted by browser until user touches page
      return false;
    }

    if (ctx.state !== 'running') {
      return false;
    }

    try {
      const now = ctx.currentTime;
      const durSec = durationMs / 1000;

      // Primary sine oscillator (clean fundamental)
      const osc = ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now);

      // Harmonic triangle oscillator (presence & cutting through mobile speakers)
      const harm = ctx.createOscillator();
      harm.type = 'triangle';
      harm.frequency.setValueAtTime(freq, now);

      // Pre-gain: drives saturator to 100% capacity
      const preGain = ctx.createGain();
      preGain.gain.setValueAtTime(2.0, now);

      // Tanh Waveshaper: pushes every wave cycle right to the ±1.0 digital ceiling
      const shaper = ctx.createWaveShaper();
      const curve = new Float32Array(1024);
      for (let i = 0; i < 1024; i++) {
        const x = (i * 2) / 1024 - 1;
        curve[i] = Math.tanh(x * 3.5);
      }
      shaper.curve = curve;

      // Master Envelope
      const masterGain = ctx.createGain();
      masterGain.gain.setValueAtTime(1.0, now);
      masterGain.gain.setValueAtTime(1.0, now + durSec - 0.015);
      masterGain.gain.linearRampToValueAtTime(0, now + durSec);

      osc.connect(preGain);
      harm.connect(preGain);
      preGain.connect(shaper);
      shaper.connect(masterGain);
      masterGain.connect(ctx.destination);

      osc.start(now);
      harm.start(now);
      osc.stop(now + durSec + 0.01);
      harm.stop(now + durSec + 0.01);

      this.isUnlocked = true;
      this.notifyListeners();
      return true;
    } catch (err) {
      console.warn('[Audio] playBeep error:', err);
      return false;
    }
  }

  /**
   * Play a crisp, futuristic confirmation chime when the user clicks "ENTER EVENT".
   * Confirms to the user and the operating system that audio output is 100% active and primed.
   */
  public async playEnterChime(): Promise<boolean> {
    const ctx = this.getContext();
    if (!ctx) return false;
    try {
      if (ctx.state === 'suspended') {
        await ctx.resume();
      }
      if (ctx.state !== 'running') return false;

      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      // Futuristic ascending chime: 660Hz -> 1100Hz
      osc.frequency.setValueAtTime(660, now);
      osc.frequency.exponentialRampToValueAtTime(1100, now + 0.12);

      gain.gain.setValueAtTime(0.35, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 0.26);
      return true;
    } catch {
      return false;
    }
  }
  /**
   * Pre-schedule all countdown beeps precisely onto the AudioContext hardware timeline.
   * Eliminates JS event loop jitter and network lag. Handles late joiners by discarding
   * timestamps that have already passed relative to the synchronized epoch.
   * 
   * @param targetEpochMs The exact synchronized server epoch timestamp when sequence starts
   * @param scheduleOffsets Array of offsets in MS relative to the start of the sequence
   * @param serverClockOffset The calculated NTP sync offset
   */
  public async preScheduleCountdownBeeps(targetEpochMs: number, scheduleOffsets: number[], serverClockOffset: number): Promise<boolean> {
    const ctx = this.getContext();
    if (!ctx) return false;

    try {
      if (ctx.state === 'suspended') {
        await ctx.resume();
      }
    } catch {
      return false;
    }

    if (ctx.state !== 'running') return false;

    // To schedule precisely, we need to map a future server epoch to ctx.currentTime
    // ctx.currentTime is completely relative to when AudioContext started.
    // 
    // Equation:
    // estimatedServerNow = Date.now() + serverClockOffset
    // targetTimeDelta = targetEpochMs - estimatedServerNow
    // targetAudioCtxTime = ctx.currentTime + (targetTimeDelta / 1000)
    
    const estimatedServerNow = Date.now() + serverClockOffset;
    const targetTimeDeltaSec = (targetEpochMs - estimatedServerNow) / 1000;
    const targetAudioCtxTime = ctx.currentTime + targetTimeDeltaSec;

    for (let i = 0; i < scheduleOffsets.length; i++) {
      const offsetSec = scheduleOffsets[i] / 1000;
      const scheduledStart = targetAudioCtxTime + offsetSec;
      
      // Late joiner check: if this beep's absolute time has passed, skip it.
      if (scheduledStart < ctx.currentTime) {
        continue;
      }
      
      const durSec = 0.15; // 150ms beep
      const freq = 800;
      
      try {
        const osc = ctx.createOscillator();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, scheduledStart);

        const harm = ctx.createOscillator();
        harm.type = 'triangle';
        harm.frequency.setValueAtTime(freq, scheduledStart);

        const preGain = ctx.createGain();
        preGain.gain.setValueAtTime(2.0, scheduledStart);

        const shaper = ctx.createWaveShaper();
        const curve = new Float32Array(1024);
        for (let j = 0; j < 1024; j++) {
          const x = (j * 2) / 1024 - 1;
          curve[j] = Math.tanh(x * 3.5);
        }
        shaper.curve = curve;

        const masterGain = ctx.createGain();
        masterGain.gain.setValueAtTime(0, Math.max(0, scheduledStart - 0.001)); // init quiet
        masterGain.gain.setValueAtTime(1.0, scheduledStart);
        masterGain.gain.setValueAtTime(1.0, scheduledStart + durSec - 0.015);
        masterGain.gain.linearRampToValueAtTime(0, scheduledStart + durSec);

        osc.connect(preGain);
        harm.connect(preGain);
        preGain.connect(shaper);
        shaper.connect(masterGain);
        masterGain.connect(ctx.destination);

        osc.start(scheduledStart);
        harm.start(scheduledStart);
        osc.stop(scheduledStart + durSec + 0.01);
        harm.stop(scheduledStart + durSec + 0.01);
      } catch (err) {
        console.warn(`[Audio] Failed to schedule beep ${i}:`, err);
      }
    }

    this.isUnlocked = true;
    this.notifyListeners();
    return true;
  }
}

export const soundManager = new SoundManager();
