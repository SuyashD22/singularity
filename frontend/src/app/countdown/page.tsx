"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import CountDown, { TOTAL_COUNTDOWN_DURATION_MS } from "@/components/CountDown/CountDown";
import SplashScreen from "@/components/SplashScreen/SplashScreen";
import { getApiBaseUrl, fetchCountdownState, CountdownState } from "@/lib/api";

export default function PublicCountdownPage() {
  const router = useRouter();
  const [state, setState] = useState<CountdownState>({
    isDisplayed: false,
    isStarted: false,
    startedAt: null,
    updatedAt: new Date().toISOString(),
  });
  const [hasCompleted, setHasCompleted] = useState(false);
  const [showSplash, setShowSplash] = useState(false);

  // Sync state via initial fetch and SSE stream
  useEffect(() => {
    let isMounted = true;

    async function loadState() {
      try {
        const data = await fetchCountdownState();
        if (isMounted) {
          setState(data);
          const serverOffset = data.serverTime ? (new Date(data.serverTime).getTime() - Date.now()) : 0;
          if (data.isStarted && data.startedAt && ((Date.now() + serverOffset) - new Date(data.startedAt).getTime()) >= TOTAL_COUNTDOWN_DURATION_MS) {
            handleCountdownComplete();
          }
        }
      } catch (err) {
        console.error("Error fetching countdown state:", err);
      }
    }

    loadState();

    const API_BASE = getApiBaseUrl();
    const eventSource = new EventSource(`${API_BASE}/api/countdown/events`);

    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (isMounted && data) {
          const fresh = {
            isDisplayed: Boolean(data.isDisplayed),
            isStarted: Boolean(data.isStarted),
            startedAt: data.startedAt || null,
            updatedAt: data.updatedAt || new Date().toISOString(),
            serverTime: data.serverTime,
          };
          setState(fresh);

          const serverOffset = data.serverTime ? (new Date(data.serverTime).getTime() - Date.now()) : 0;
          if (fresh.isStarted && fresh.startedAt && ((Date.now() + serverOffset) - new Date(fresh.startedAt).getTime()) >= TOTAL_COUNTDOWN_DURATION_MS) {
            handleCountdownComplete();
          }
        }
      } catch (err) {
        console.error("SSE parse error in /countdown:", err);
      }
    };

    // Polling fallback
    const interval = setInterval(async () => {
      try {
        const fresh = await fetchCountdownState();
        if (isMounted) {
          setState(fresh);
          const serverOffset = fresh.serverTime ? (new Date(fresh.serverTime).getTime() - Date.now()) : 0;
          if (fresh.isStarted && fresh.startedAt && ((Date.now() + serverOffset) - new Date(fresh.startedAt).getTime()) >= TOTAL_COUNTDOWN_DURATION_MS) {
            handleCountdownComplete();
          }
        }
      } catch {
        // Ignore network drops
      }
    }, 3000);

    return () => {
      isMounted = false;
      eventSource.close();
      clearInterval(interval);
    };
  }, []);

  // When countdown animation completes: show splash screen, then continue to normal website
  const handleCountdownComplete = () => {
    setHasCompleted(true);
    setShowSplash(true);
  };

  const handleSplashComplete = () => {
    setShowSplash(false);
    router.push("/");
  };

  // If splash is active after countdown completes
  if (showSplash) {
    return <SplashScreen onComplete={handleSplashComplete} />;
  }

  // If countdown completed and splash finished, redirect or render blank while navigating
  if (hasCompleted) {
    return (
      <div className="fixed inset-0 bg-black flex items-center justify-center text-white font-mono text-xs">
        LAUNCH SEQUENCE COMPLETE // REDIRECTING TO TERMINAL...
      </div>
    );
  }

  // When NOT displayed: Standby screen (countdown animation is hidden)
  if (!state.isDisplayed) {
    return (
      <div className="relative flex min-h-screen w-full flex-col items-center justify-center overflow-hidden bg-black px-4 font-mono text-slate-300 select-none">
        {/* Ambient background glow */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-[400px] w-[400px] rounded-full bg-yellow-400/5 blur-[120px]" />

        {/* Scanline overlay */}
        <div 
          className="pointer-events-none absolute inset-0 opacity-20"
          style={{
            backgroundImage: "linear-gradient(rgba(18, 16, 16, 0) 50%, rgba(0, 0, 0, 0.25) 50%)",
            backgroundSize: "100% 4px"
          }}
        />

        <div className="z-10 text-center space-y-6 max-w-lg">
          <div className="inline-flex items-center gap-2 rounded-full border border-slate-800 bg-slate-900/60 px-4 py-1.5 text-xs tracking-widest text-slate-400 uppercase">
            <span className="h-2 w-2 rounded-full bg-slate-600" />
            STANDBY MODE // CHANNEL SECURED
          </div>

          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-white">
            Singularity <span className="text-yellow-400">&apos;26</span>
          </h1>

          <div className="p-4 rounded-xl border border-slate-800/80 bg-slate-950/60 text-xs text-slate-400 space-y-2">
            <p className="tracking-wider text-yellow-400/90 font-bold">
              [ AWAITING LAUNCH BROADCAST SIGNAL ]
            </p>
            <p className="text-slate-500 text-[11px]">
              System link is active. Stage control sequence will attach automatically upon admin initialization.
            </p>
          </div>
        </div>

        {/* Corner Telemetry */}
        <div className="absolute top-6 left-6 text-[10px] text-slate-600 uppercase tracking-widest">
          SYS://STAGE_NODE_01
        </div>
        <div className="absolute top-6 right-6 text-[10px] text-slate-600 uppercase tracking-widest">
          FREQ: 2.40 GHz // STABLE
        </div>
        <div className="absolute bottom-6 left-6 text-[10px] text-slate-600 uppercase tracking-widest">
          PROTOCOL: TLS_EDGE_DIRECT
        </div>
        <div className="absolute bottom-6 right-6 text-[10px] text-slate-600 uppercase tracking-widest">
          STATUS: IDLE
        </div>
      </div>
    );
  }

  // When DISPLAY is ON: Render the existing CountDown component (idle 10 if not started, ticking if started)
  return (
    <div className="fixed inset-0 z-[99999] bg-black">
      <CountDown
        isStarted={state.isStarted}
        startedAt={state.startedAt}
        serverTime={state.serverTime}
        onComplete={handleCountdownComplete}
      />
    </div>
  );
}
