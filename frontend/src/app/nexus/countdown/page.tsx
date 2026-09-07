"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  getApiBaseUrl,
  fetchCountdownState,
  toggleCountdownDisplay,
  triggerCountdownStart,
  removeCountdown,
  resetCountdownState,
  CountdownState
} from "@/lib/api";

export default function NexusCountdownPage() {
  const router = useRouter();
  const [token, setToken] = useState<string>("");
  const [, setAdmin] = useState<{ role?: string } | null>(null);
  const [state, setState] = useState<CountdownState>({
    isDisplayed: false,
    isStarted: false,
    startedAt: null,
    updatedAt: new Date().toISOString()
  });
  const [, setIsLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);

  // Auth verification
  useEffect(() => {
    const savedToken = localStorage.getItem("admin_token");
    const savedProfile = localStorage.getItem("admin_profile");

    if (!savedToken || !savedProfile) {
      router.push("/nexus/login");
      return;
    }

    try {
      const parsedProfile = JSON.parse(savedProfile);
      if (parsedProfile.role === "volunteer") {
        router.push("/nexus/scanner");
        return;
      }
      setToken(savedToken);
      setAdmin(parsedProfile);
    } catch {
      router.push("/nexus/login");
      return;
    }
  }, [router]);

  // Fetch initial countdown state & setup real-time SSE stream
  useEffect(() => {
    let isMounted = true;

    async function loadInitial() {
      try {
        const initial = await fetchCountdownState();
        if (isMounted) {
          setState(initial);
          setIsLoading(false);
        }
      } catch (err) {
        console.error("Failed to load initial countdown state:", err);
        if (isMounted) setIsLoading(false);
      }
    }

    loadInitial();

    // Setup real-time SSE listener
    const API_BASE = getApiBaseUrl();
    const eventSource = new EventSource(`${API_BASE}/api/countdown/events`);

    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (isMounted && data) {
          setState({
            isDisplayed: Boolean(data.isDisplayed),
            isStarted: Boolean(data.isStarted),
            startedAt: data.startedAt || null,
            updatedAt: data.updatedAt || new Date().toISOString()
          });
        }
      } catch (e) {
        console.error("SSE parse error:", e);
      }
    };

    // Polling fallback every 4 seconds to guarantee sync
    const pollInterval = setInterval(async () => {
      try {
        const fresh = await fetchCountdownState();
        if (isMounted) setState(fresh);
      } catch {
        // Silently ignore transient network errors during poll
      }
    }, 4000);

    return () => {
      isMounted = false;
      eventSource.close();
      clearInterval(pollInterval);
    };
  }, []);

  const showFeedback = (type: "success" | "error", message: string) => {
    setFeedback({ type, message });
    setTimeout(() => setFeedback(null), 4000);
  };

  const handleDisplay = async () => {
    if (!token) return;
    setActionLoading("display");
    try {
      const res = await toggleCountdownDisplay(token);
      if (res.state) setState(res.state);
      showFeedback("success", "Countdown display enabled. Public site now rendering in idle state.");
    } catch (err: unknown) {
      showFeedback("error", err instanceof Error ? err.message : "Failed to enable display");
    } finally {
      setActionLoading(null);
    }
  };

  const handleStart = async () => {
    if (!token) return;
    if (!state.isDisplayed) {
      showFeedback("error", "Display must be enabled first before starting the countdown.");
      return;
    }
    setActionLoading("start");
    try {
      const res = await triggerCountdownStart(token);
      if (res.state) setState(res.state);
      showFeedback("success", "Countdown started! Public frontend running sequence 10 -> 1 in real time.");
    } catch (err: unknown) {
      showFeedback("error", err instanceof Error ? err.message : "Failed to start countdown");
    } finally {
      setActionLoading(null);
    }
  };

  const handleRemove = async () => {
    if (!token) return;
    setActionLoading("remove");
    try {
      const res = await removeCountdown(token);
      if (res.state) setState(res.state);
      showFeedback("success", "Countdown removed. Public site returning to normal view.");
    } catch (err: unknown) {
      showFeedback("error", err instanceof Error ? err.message : "Failed to remove countdown");
    } finally {
      setActionLoading(null);
    }
  };

  const handleReset = async () => {
    if (!token) return;
    setActionLoading("reset");
    try {
      const res = await resetCountdownState(token);
      if (res.state) setState(res.state);
      showFeedback("success", "Countdown reset to static idle state (10). Ready to start again.");
    } catch (err: unknown) {
      showFeedback("error", err instanceof Error ? err.message : "Failed to reset countdown");
    } finally {
      setActionLoading(null);
    }
  };

  return (
    <div
      className="relative overflow-hidden flex-1 w-full text-[#F0EDE8]"
      style={{ backgroundColor: "#111010", fontFamily: '"Space Grotesk", sans-serif' }}
    >
      <div className="nx-topo" />

      <main className="relative z-10 mx-auto max-w-5xl w-full px-4 sm:px-6 py-8 sm:py-10 flex-1 space-y-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-6" style={{ borderBottom: "1px solid #2E2C2B" }}>
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span
                style={{
                  fontFamily: '"JetBrains Mono", monospace',
                  fontSize: "0.65rem",
                  letterSpacing: "0.15em",
                  color: "#c8f135",
                  background: "rgba(200,241,53,0.1)",
                  padding: "2px 8px",
                  borderRadius: "2px",
                  border: "1px solid rgba(200,241,53,0.3)",
                }}
              >
                CONTROL PROTOCOL
              </span>
              <span style={{ fontFamily: '"JetBrains Mono", monospace', fontSize: "0.7rem", color: "#888580" }}>{`
                // BROADCAST SYNC
              `}</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black uppercase tracking-tight text-[#F0EDE8]">
              Launch Countdown Control
            </h1>
            <p className="text-xs text-[#888580] mt-1" style={{ fontFamily: '"JetBrains Mono", monospace' }}>
              Broadcast real-time triggers to stage displays and the main public frontend.
            </p>
          </div>

          {/* Real-time Status Badge */}
          <div className="flex items-center gap-3">
            <div
              className="nx-card-flat flex items-center gap-3 py-2 px-4"
              style={{
                borderColor: state.isStarted ? "#c8f135" : state.isDisplayed ? "rgba(200,241,53,0.4)" : "#2E2C2B",
                background: state.isStarted ? "rgba(200,241,53,0.08)" : "#1A1918",
              }}
            >
              <span
                style={{
                  width: "8px",
                  height: "8px",
                  borderRadius: "50%",
                  backgroundColor: state.isStarted ? "#c8f135" : state.isDisplayed ? "#c8f135" : "#888580",
                }}
                className={state.isStarted ? "animate-ping" : state.isDisplayed ? "animate-pulse" : ""}
              />
              <div>
                <span
                  style={{
                    fontFamily: '"JetBrains Mono", monospace',
                    fontSize: "0.6rem",
                    color: "#888580",
                    letterSpacing: "0.1em",
                    textTransform: "uppercase",
                    display: "block",
                  }}
                >
                  STATE
                </span>
                <span
                  style={{
                    fontFamily: '"JetBrains Mono", monospace',
                    fontSize: "0.75rem",
                    fontWeight: 700,
                    color: state.isStarted ? "#c8f135" : state.isDisplayed ? "#c8f135" : "#888580",
                    letterSpacing: "0.05em",
                  }}
                >
                  {state.isStarted
                    ? "LIVE RUNNING"
                    : state.isDisplayed
                    ? "DISPLAYED // IDLE (10)"
                    : "OFFLINE // REMOVED"}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Feedback Banner */}
        {feedback && (
          <div
            className="p-4 text-xs font-bold flex items-center gap-3"
            style={{
              background: feedback.type === "success" ? "rgba(200, 241, 53, 0.1)" : "rgba(255, 45, 111, 0.1)",
              border: `1px solid ${feedback.type === "success" ? "rgba(200, 241, 53, 0.3)" : "rgba(255, 45, 111, 0.3)"}`,
              borderRadius: "4px",
              color: feedback.type === "success" ? "#c8f135" : "#ff2d6f",
              fontFamily: '"JetBrains Mono", monospace',
            }}
          >
            <span className="text-base">{feedback.type === "success" ? "✓" : "⚠"}</span>
            <span>{feedback.message}</span>
          </div>
        )}

        {/* Main Control Console Card */}
        <div className="nx-card">
          <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4" style={{ borderBottom: "1px solid #2E2C2B" }}>
            <div>
              <h3 className="text-lg font-black uppercase tracking-tight text-[#F0EDE8] flex items-center gap-2">
                <svg className="h-5 w-5 text-[#c8f135]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
                Sequence Triggers
              </h3>
              <p className="text-xs text-[#888580] mt-0.5" style={{ fontFamily: '"JetBrains Mono", monospace' }}>
                Follow flow: Click <strong style={{ color: "#c8f135" }}>DISPLAY</strong> to attach idle state, then <strong style={{ color: "#c8f135" }}>START</strong> to trigger sequence.
              </p>
            </div>

            <span
              style={{
                fontFamily: '"JetBrains Mono", monospace',
                fontSize: "0.65rem",
                color: "#888580",
              }}
            >
              Synced: {new Date(state.updatedAt).toLocaleTimeString()}
            </span>
          </div>

          {/* Buttons Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* 1. DISPLAY BUTTON */}
            <button
              onClick={handleDisplay}
              disabled={actionLoading !== null || state.isDisplayed}
              className="flex flex-col items-center justify-center p-6 text-center transition-all cursor-pointer rounded-lg group"
              style={{
                border: "2px solid #c8f135",
                background: state.isDisplayed ? "rgba(200, 241, 53, 0.12)" : "#111010",
                boxShadow: state.isDisplayed ? "2px 2px 0px #c8f135" : "4px 4px 0px #c8f135",
                transform: state.isDisplayed ? "translate(2px, 2px)" : "none",
                opacity: (actionLoading !== null && actionLoading !== "display") ? 0.6 : 1,
              }}
            >
              <div
                className="h-10 w-10 rounded-md flex items-center justify-center mb-3"
                style={{
                  background: "rgba(200, 241, 53, 0.12)",
                  border: "1.5px solid #c8f135",
                  color: "#c8f135",
                }}
              >
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                </svg>
              </div>
              <span
                style={{
                  fontFamily: '"JetBrains Mono", monospace',
                  fontSize: "0.85rem",
                  fontWeight: 900,
                  letterSpacing: "0.08em",
                  textTransform: "uppercase",
                  color: "#F0EDE8",
                }}
              >
                {actionLoading === "display" ? "Enabling..." : state.isDisplayed ? "Display Active ✓" : "1. Display"}
              </span>
              <span className="text-[11px] text-[#888580] mt-1" style={{ fontFamily: '"JetBrains Mono", monospace' }}>
                {state.isDisplayed ? "Attached on public site" : "Arm idle screen"}
              </span>
            </button>

            {/* 2. START BUTTON */}
            <button
              onClick={handleStart}
              disabled={actionLoading !== null || !state.isDisplayed || state.isStarted}
              className="flex flex-col items-center justify-center p-6 text-center transition-all cursor-pointer rounded-lg"
              style={{
                border: state.isDisplayed ? "2px solid #c8f135" : "2px solid rgba(200, 241, 53, 0.4)",
                background: state.isStarted
                  ? "rgba(200, 241, 53, 0.18)"
                  : "#111010",
                boxShadow: state.isDisplayed ? "4px 4px 0px #c8f135" : "4px 4px 0px rgba(200, 241, 53, 0.2)",
                opacity: !state.isDisplayed || state.isStarted ? 0.5 : 1,
              }}
            >
              <div
                className="h-10 w-10 rounded-md flex items-center justify-center mb-3"
                style={{
                  background: state.isDisplayed ? "rgba(200, 241, 53, 0.15)" : "rgba(255, 255, 255, 0.04)",
                  border: `1.5px solid ${state.isDisplayed ? "#c8f135" : "#2E2C2B"}`,
                  color: state.isDisplayed ? "#c8f135" : "#888580",
                }}
              >
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <span
                style={{
                  fontFamily: '"JetBrains Mono", monospace',
                  fontSize: "0.85rem",
                  fontWeight: 900,
                  letterSpacing: "0.08em",
                  textTransform: "uppercase",
                  color: state.isDisplayed ? "#F0EDE8" : "#888580",
                }}
              >
                {actionLoading === "start" ? "Starting..." : state.isStarted ? "Running Live" : "2. Start"}
              </span>
              <span
                className="text-[11px] mt-1 text-[#888580]"
                style={{ fontFamily: '"JetBrains Mono", monospace' }}
              >
                {!state.isDisplayed
                  ? "Requires Display ON"
                  : state.isStarted
                  ? "Sequence Active (10 -> 1)"
                  : "Begin live countdown"}
              </span>
            </button>

            {/* 3. REMOVE BUTTON */}
            <button
              onClick={handleRemove}
              disabled={actionLoading !== null || !state.isDisplayed}
              className="flex flex-col items-center justify-center p-6 text-center transition-all cursor-pointer rounded-lg"
              style={{
                border: "2px solid #ff2d6f",
                background: "#111010",
                boxShadow: "4px 4px 0px #ff2d6f",
                opacity: !state.isDisplayed ? 0.5 : 1,
              }}
            >
              <div
                className="h-10 w-10 rounded-md flex items-center justify-center mb-3"
                style={{
                  background: "rgba(255, 45, 111, 0.12)",
                  border: "1.5px solid #ff2d6f",
                  color: "#ff2d6f",
                }}
              >
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </div>
              <span
                style={{
                  fontFamily: '"JetBrains Mono", monospace',
                  fontSize: "0.85rem",
                  fontWeight: 900,
                  letterSpacing: "0.08em",
                  textTransform: "uppercase",
                  color: "#ff2d6f",
                }}
              >
                {actionLoading === "remove" ? "Removing..." : "Remove"}
              </span>
              <span className="text-[11px] text-[#888580] mt-1" style={{ fontFamily: '"JetBrains Mono", monospace' }}>
                Hide countdown completely
              </span>
            </button>

            {/* 4. RESET BUTTON */}
            <button
              onClick={handleReset}
              disabled={actionLoading !== null || !state.isStarted}
              className="flex flex-col items-center justify-center p-6 text-center transition-all cursor-pointer rounded-lg"
              style={{
                border: "2px solid #c8f135",
                background: "#111010",
                boxShadow: "4px 4px 0px #c8f135",
                opacity: !state.isStarted ? 0.5 : 1,
              }}
            >
              <div
                className="h-10 w-10 rounded-md flex items-center justify-center mb-3"
                style={{
                  background: "rgba(200, 241, 53, 0.12)",
                  border: "1.5px solid #c8f135",
                  color: "#c8f135",
                }}
              >
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
              </div>
              <span
                style={{
                  fontFamily: '"JetBrains Mono", monospace',
                  fontSize: "0.85rem",
                  fontWeight: 900,
                  letterSpacing: "0.08em",
                  textTransform: "uppercase",
                  color: "#F0EDE8",
                }}
              >
                {actionLoading === "reset" ? "Resetting..." : "Reset"}
              </span>
              <span className="text-[11px] text-[#888580] mt-1" style={{ fontFamily: '"JetBrains Mono", monospace' }}>
                Reset back to idle (10)
              </span>
            </button>
          </div>
        </div>

        {/* Instructions Card */}
        <div className="nx-card-flat max-w-2xl space-y-4">
          <h4
            className="text-xs font-black uppercase tracking-wider text-[#F0EDE8] flex items-center gap-2"
            style={{ fontFamily: '"JetBrains Mono", monospace' }}
          >
            <span className="h-2 w-2 rounded-full" style={{ backgroundColor: "#c8f135" }} />
            Operating Protocol
          </h4>
          <ol
            className="space-y-3 text-xs text-[#888580] list-decimal list-inside leading-relaxed"
            style={{ fontFamily: '"Space Grotesk", sans-serif' }}
          >
            <li>
              <strong className="text-[#F0EDE8]">Stage Screens</strong>: Open <code className="text-[#c8f135] bg-[#222120] px-1 py-0.5 rounded font-mono">/countdown</code> on auditoriums/kiosks.
            </li>
            <li>
              <strong className="text-[#F0EDE8]">Display</strong>: Arms the screen in standby mode (static 10 with audio ready).
            </li>
            <li>
              <strong className="text-[#F0EDE8]">Start</strong>: Initiates the 10-second synchronized live descent.
            </li>
            <li>
              <strong className="text-[#F0EDE8]">Auto Advance</strong>: Screen automatically launches public site splash upon hitting zero.
            </li>
            <li>
              <strong className="text-[#F0EDE8]">Remove</strong>: Cleanly dismisses countdown from all client browsers.
            </li>
          </ol>
        </div>
      </main>
    </div>
  );
}
