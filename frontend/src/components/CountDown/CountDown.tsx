'use client';

import { useCallback, useEffect, useRef, useState, type CSSProperties } from 'react';
import styles from './CountDown.module.css';

export const SEQUENCE = ['10', '9', '8', '7', '6', '5', '4', '3', '2', '1'] as const;

export interface StepSchedule {
  index: number;
  value: string;
  isGlitch: boolean;
  isLast: boolean;
  startMs: number;
  endMs: number;
  holdTime: number;
  vanishMs: number;
}

export const STEP_MS = 1600;

export const STEP_SCHEDULE: StepSchedule[] = (() => {
  let acc = 0;
  return SEQUENCE.map((val, idx) => {
    const isGlitch = val === '7' || val === '4' || val === '2' || val === '1';
    const isLast = idx === SEQUENCE.length - 1;
    const holdTime = STEP_MS;
    const vanishMs = isGlitch ? 380 : 220;
    const stepDuration = isLast ? (holdTime + vanishMs + 400) : (holdTime + vanishMs + 80);
    const startMs = acc;
    const endMs = acc + stepDuration;
    acc = endMs;
    return {
      index: idx,
      value: val,
      isGlitch,
      isLast,
      startMs,
      endMs,
      holdTime,
      vanishMs,
    };
  });
})();

export const TOTAL_COUNTDOWN_DURATION_MS = STEP_SCHEDULE[STEP_SCHEDULE.length - 1].endMs; // ~19960 ms

const STATUS_MESSAGES: Record<string, string> = {
  '10': 'INITIALIZING LAUNCH SEQUENCE...',
  '9': 'AUTHENTICATING NODES...',
  '8': 'AUTHENTICATION VERIFIED',
  '7': 'SIGNAL INTERFERENCE DETECTED',
  '6': 'SYSTEM INTEGRITY: STABLE',
  '5': 'RECOVERING DATA PACKETS...',
  '4': 'WARNING: SYSTEM INSTABILITY',
  '3': 'CONTAINMENT FAILING',
  '2': 'CRITICAL STATE',
  '1': 'FINAL SEQUENCE',
};

const BG_TOKENS = [
  '0x4F92A1', 'ACCESS_LAYER_07', 'SYS://CORE', 'ENCRYPTED',
  'NODE_04', '0x0007FF', 'PACKET_LOSS', 'CH_09::LOCK',
];

type Phase = 'active' | 'glitchOut' | 'plain' | 'gone';

export interface CountDownProps {
  onComplete?: () => void;
  isStarted?: boolean;
  startedAt?: string | null;
  serverTime?: string | null;
}

export default function CountDown({ 
  onComplete,
  isStarted = true,
  startedAt = null,
  serverTime = null,
}: CountDownProps = {}) {
  const [index, setIndex] = useState(0);
  const [phase, setPhase] = useState<Phase>('active');
  const [seed, setSeed] = useState(0);
  const [flash, setFlash] = useState(false);
  const [shake, setShake] = useState(false);

  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const schedule = useCallback((fn: () => void, ms: number) => {
    timers.current.push(setTimeout(fn, ms));
  }, []);
  const clearTimers = useCallback(() => {
    timers.current.forEach(clearTimeout);
    timers.current = [];
  }, []);

  // Clock skew correction between client device and backend
  const clockOffsetRef = useRef<number>(0);
  useEffect(() => {
    if (serverTime) {
      clockOffsetRef.current = new Date(serverTime).getTime() - Date.now();
    }
  }, [serverTime]);

  const localStartedAtRef = useRef<number | null>(null);
  const lastBeepedIndexRef = useRef<number | null>(null);

  const getElapsedMs = useCallback(() => {
    if (startedAt) {
      const serverNow = Date.now() + clockOffsetRef.current;
      const start = new Date(startedAt).getTime();
      return serverNow - start;
    }
    if (localStartedAtRef.current) {
      return Date.now() - localStartedAtRef.current;
    }
    return 0;
  }, [startedAt]);

  // ── Audio: Web Audio API beep (MAXIMUM FULL CAPACITY) ────────────────────
  // Driven to 0 dBFS true peak with high RMS saturation — absolute maximum digital volume.
  const BEEP_HZ   = 800;   // original 800Hz tone
  const BEEP_MS   = 150;   // 150ms duration
  const audioCtxRef = useRef<AudioContext | null>(null);

  const playBeep = useCallback(() => {
    try {
      if (!audioCtxRef.current) {
        audioCtxRef.current = new AudioContext();
      }
      const ctx = audioCtxRef.current;

      if (ctx.state === 'suspended') {
        ctx.resume();
      }

      const now = ctx.currentTime;
      const durSec = BEEP_MS / 1000;

      // Primary 800 Hz oscillator
      const osc = ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(BEEP_HZ, now);

      // Harmonic presence oscillator
      const harm = ctx.createOscillator();
      harm.type = 'triangle';
      harm.frequency.setValueAtTime(BEEP_HZ, now);

      // Pre-gain: drives the saturator to 100% capacity
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

      // Master Envelope at full 1.0 scale
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
    } catch {
      // Audio context might be restricted if autoplay without interaction
    }
  }, []);
  // ──────────────────────────────────────────────────────────────────────────

  const current = SEQUENCE[index];
  const isLast = index === SEQUENCE.length - 1;

  // Real-time synchronization state machine
  useEffect(() => {
    clearTimers();

    if (!isStarted) {
      setIndex(0);
      setPhase('active');
      setShake(false);
      setFlash(false);
      localStartedAtRef.current = null;
      lastBeepedIndexRef.current = null;
      return;
    }

    if (!startedAt && !localStartedAtRef.current) {
      localStartedAtRef.current = Date.now();
    }

    const elapsed = getElapsedMs();

    // If whole countdown already completed globally, finish immediately
    if (elapsed >= TOTAL_COUNTDOWN_DURATION_MS) {
      onComplete?.();
      return;
    }

    const safeElapsed = Math.max(0, elapsed);
    const activeStep = STEP_SCHEDULE.find((s) => safeElapsed >= s.startMs && safeElapsed < s.endMs) || STEP_SCHEDULE[0];

    // If client is on the wrong step (e.g. late arrival, tab switch), jump to active step
    if (activeStep.index !== index) {
      setIndex(activeStep.index);
      return;
    }

    const offsetInStep = safeElapsed - activeStep.startMs;

    // Trigger sound on each new step
    if (lastBeepedIndexRef.current !== activeStep.index) {
      lastBeepedIndexRef.current = activeStep.index;
      playBeep();
    }

    setSeed((s) => s + 1);

    // Mid-hold shake for glitch numbers
    if (activeStep.isGlitch) {
      const shakeStart = activeStep.holdTime * 0.5; // 800ms
      const shakeEnd = shakeStart + 140; // 940ms
      if (offsetInStep < shakeStart) {
        schedule(() => {
          setShake(true);
          schedule(() => setShake(false), 140);
        }, shakeStart - offsetInStep);
      } else if (offsetInStep < shakeEnd) {
        setShake(true);
        schedule(() => setShake(false), shakeEnd - offsetInStep);
      } else {
        setShake(false);
      }
    } else {
      setShake(false);
    }

    // Phase schedule based on current position inside active step
    if (offsetInStep < activeStep.holdTime) {
      setPhase('active');
      setFlash(false);

      // Begin exit phase
      schedule(() => {
        if (activeStep.isGlitch) {
          setPhase('glitchOut');
          setFlash(true);
          schedule(() => setFlash(false), 90);
        } else {
          setPhase('plain');
        }
      }, activeStep.holdTime - offsetInStep);

      // Vanish / gone phase
      schedule(() => {
        setPhase('gone');
      }, (activeStep.holdTime + activeStep.vanishMs) - offsetInStep);

    } else if (offsetInStep < activeStep.holdTime + activeStep.vanishMs) {
      setPhase(activeStep.isGlitch ? 'glitchOut' : 'plain');
      schedule(() => {
        setPhase('gone');
      }, (activeStep.holdTime + activeStep.vanishMs) - offsetInStep);
    } else {
      setPhase('gone');
    }

    // Advance to next step or complete countdown
    const timeUntilEnd = activeStep.endMs - safeElapsed;
    schedule(() => {
      if (activeStep.isLast) {
        onComplete?.();
      } else {
        setIndex(activeStep.index + 1);
      }
    }, Math.max(20, timeUntilEnd));

    return clearTimers;
  }, [index, isStarted, startedAt, getElapsedMs, schedule, clearTimers, playBeep, onComplete]);

  // Drift check & background tab synchronization listener
  useEffect(() => {
    if (!isStarted) return;

    const checkDrift = () => {
      const elapsed = getElapsedMs();
      if (elapsed >= TOTAL_COUNTDOWN_DURATION_MS) {
        onComplete?.();
        return;
      }
      const safeElapsed = Math.max(0, elapsed);
      const currentStep = STEP_SCHEDULE.find((s) => safeElapsed >= s.startMs && safeElapsed < s.endMs);
      if (currentStep && currentStep.index !== index) {
        setIndex(currentStep.index);
      }
    };

    const interval = setInterval(checkDrift, 250);
    const handleVisibility = () => {
      if (!document.hidden) checkDrift();
    };
    document.addEventListener('visibilitychange', handleVisibility);
    window.addEventListener('focus', checkDrift);

    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', handleVisibility);
      window.removeEventListener('focus', checkDrift);
    };
  }, [isStarted, getElapsedMs, index, onComplete]);

  return (
    <div className={`${styles.stage} ${shake ? styles.shake : ''}`} id="countdown-stage">
      <div className={styles.scanlines} aria-hidden />
      <div className={styles.vignette} aria-hidden />

      <div className={styles.bgNoise} aria-hidden>
        {BG_TOKENS.map((t, i) => (
          <span key={t} className={styles.bgToken} style={{ '--i': i } as CSSProperties}>
            {t}
          </span>
        ))}
      </div>

      <header className={styles.header}>
        <span>[ SYSTEM // SECURE CHANNEL ]</span>
        <span>STATUS: {!isStarted ? 'ARMED // STANDBY' : (phase === 'gone' && isLast ? 'TERMINATED' : 'ACTIVE')}</span>
      </header>

      <div className={styles.numberWrap}>
        {phase !== 'gone' && (
          <GlitchNumber key={`${current}-${seed}`} value={current} phase={phase} step={index} seed={seed} />
        )}
      </div>

      <footer className={styles.footer}>
        <span className={styles.footerText}>
          {!isStarted ? 'SEQUENCE ARMED — AWAITING LAUNCH TRIGGER...' : STATUS_MESSAGES[current]}
        </span>
      </footer>

      {flash && <div className={styles.flash} aria-hidden />}
    </div>
  );
}

function GlitchNumber({ value, phase, step, seed }: { value: string; phase: Phase; step: number; seed: number }) {
  const isGlitchNumber = value === '7' || value === '4' || value === '2' || value === '1';

  // Deterministic calculation based on step and seed to avoid SSR hydration mismatch
  const r1 = (Math.sin((step + 1) * 37 + seed * 13) * 6).toFixed(2);
  const r2 = (Math.cos((step + 1) * 41 + seed * 17) * 6).toFixed(2);
  const r3 = (25 + Math.abs(Math.sin((step + 1) * 19 + seed * 23)) * 50).toFixed(2);

  const style = {
    '--dx1': `${r1}px`,
    '--dx2': `${r2}px`,
    '--sliceY': `${r3}%`,
  } as CSSProperties;

  let phaseClass = styles.active;
  if (phase === 'glitchOut') phaseClass = styles.glitchOut;
  if (phase === 'plain') phaseClass = styles.plainOut;

  return (
    <div
      className={`${styles.numberBox} ${phaseClass}`}
      style={style}
      data-intensity={Math.min(step, 5)}
    >
      <span className={styles.mainNumber}>
        {value}
      </span>

      {/* RGB ghost layers only exist for glitch numbers (7, 4, 2, 1) */}
      {isGlitchNumber && (
        <>
          <span className={`${styles.ghostLayer} ${styles.ghostRed}`} aria-hidden>{value}</span>
          <span className={`${styles.ghostLayer} ${styles.ghostCyan}`} aria-hidden>{value}</span>
        </>
      )}
    </div>
  );
}