/**
 * Haptic feedback manager for Singularity '26.
 * Replaces the previous Web Audio implementation with device vibration.
 */

type HapticsStateListener = (unlocked: boolean) => void;

class HapticsManager {
  private isUnlocked: boolean = true;
  private listeners: Set<HapticsStateListener> = new Set();

  constructor() {}

  public subscribe(listener: HapticsStateListener): () => void {
    this.listeners.add(listener);
    listener(this.isUnlocked);
    return () => {
      this.listeners.delete(listener);
    };
  }

  public checkUnlocked(): boolean {
    return true;
  }

  public async unlock(): Promise<boolean> {
    return true;
  }

  public initGlobalListeners() {
    // No-op since vibration does not require the same explicit user gesture unlocking
    // as the Web Audio API did. The browsers usually allow navigator.vibrate 
    // after any interaction anyway.
  }

  public async playBeep(freq = 800, durationMs = 150): Promise<boolean> {
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      navigator.vibrate(durationMs);
    }
    return true;
  }

  public async playEnterChime(): Promise<boolean> {
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      navigator.vibrate([100, 50, 100]);
    }
    return true;
  }

  public async preScheduleCountdownBeeps(targetEpochMs: number, schedule: { offsetMs: number, isGlitch: boolean }[], serverClockOffset: number): Promise<boolean> {
    if (typeof window === 'undefined') return false;

    const estimatedServerNow = Date.now() + serverClockOffset;

    schedule.forEach(step => {
      const scheduledTimeMs = targetEpochMs + step.offsetMs;
      const delay = scheduledTimeMs - estimatedServerNow;
      
      if (delay > 0) {
        setTimeout(() => {
          if (typeof navigator !== 'undefined' && navigator.vibrate) {
            if (step.isGlitch) {
              navigator.vibrate([150, 200, 50, 100, 50]);
            } else {
              navigator.vibrate(150);
            }
          }
        }, delay);
      }
    });

    return true;
  }
}

export const hapticsManager = new HapticsManager();
