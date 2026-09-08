import { getApiBaseUrl } from './api';

export class NtpClient {
  private _offset = 0;
  private _rtt = 0;
  private _synced = false;
  
  /**
   * Run the NTP-style synchronization.
   * Performs multiple ping-pongs and takes the one with the lowest RTT for max accuracy.
   */
  public async sync(samples = 3): Promise<void> {
    const API_BASE = getApiBaseUrl();
    let bestRtt = Infinity;
    let bestOffset = 0;

    for (let i = 0; i < samples; i++) {
      try {
        const t0 = Date.now();
        const res = await fetch(`${API_BASE}/api/countdown/sync`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ t0 })
        });
        
        if (!res.ok) continue;
        
        const data = await res.json();
        const t3 = Date.now();
        
        const { t1, t2 } = data;
        
        // NTP formulas
        const rtt = (t3 - t0) - (t2 - t1);
        const offset = ((t1 - t0) + (t2 - t3)) / 2;
        
        if (rtt < bestRtt) {
          bestRtt = rtt;
          bestOffset = offset;
        }
      } catch (err) {
        console.warn('[NtpClient] Sync sample failed:', err);
      }
    }
    
    if (bestRtt !== Infinity) {
      this._offset = bestOffset;
      this._rtt = bestRtt;
      this._synced = true;
      console.log(`[NtpClient] Synced. Offset: ${this._offset}ms, RTT: ${this._rtt}ms`);
    } else {
      console.warn('[NtpClient] Failed to synchronize clock.');
    }
  }

  public get offset(): number {
    return this._offset;
  }

  public get isSynced(): boolean {
    return this._synced;
  }

  /**
   * Get the current synchronized server time in milliseconds.
   */
  public getServerTime(): number {
    return Date.now() + this._offset;
  }
}

export const ntpClient = new NtpClient();
