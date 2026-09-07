"use client";
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import CountDown, { TOTAL_COUNTDOWN_DURATION_MS } from "@/components/CountDown/CountDown";
import SplashScreen from "@/components/SplashScreen/SplashScreen";
import Navbar from "@/components/Navbar/Navbar";
import { getApiBaseUrl, fetchCountdownState, CountdownState } from "@/lib/api";

export default function SplashWrapper({
  children,
}: {
  children: React.ReactNode;
}) {
  const [countdownState, setCountdownState] = useState<CountdownState | null>(null);
  const [showCountdown, setShowCountdown] = useState(false);
  const [showSplash, setShowSplash] = useState(false);
  const [hasLoadedState, setHasLoadedState] = useState(false);

  // Fetch initial state and listen to real-time admin changes via SSE
  useEffect(() => {
    let isMounted = true;

    async function loadCountdown() {
      try {
        const state = await fetchCountdownState();
        if (isMounted) {
          setCountdownState(state);

          const serverOffset = state.serverTime ? (new Date(state.serverTime).getTime() - Date.now()) : 0;
          const isAlreadyCompleted = Boolean(
            state.isStarted &&
            state.startedAt &&
            ((Date.now() + serverOffset) - new Date(state.startedAt).getTime()) >= TOTAL_COUNTDOWN_DURATION_MS
          );

          if (state.isDisplayed && !isAlreadyCompleted) {
            setShowCountdown(true);
            setShowSplash(false);
          } else {
            setShowCountdown(false);
            setShowSplash(true);
          }
          setHasLoadedState(true);
        }
      } catch (err) {
        console.error("Error loading countdown state in SplashWrapper:", err);
        if (isMounted) {
          setShowSplash(true);
          setHasLoadedState(true);
        }
      }
    }

    loadCountdown();

    const API_BASE = getApiBaseUrl();
    const eventSource = new EventSource(`${API_BASE}/api/countdown/events`);

    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (isMounted && data) {
          const isDisp = Boolean(data.isDisplayed);
          const isSt = Boolean(data.isStarted);
          const serverOffset = data.serverTime ? (new Date(data.serverTime).getTime() - Date.now()) : 0;
          const isAlreadyCompleted = Boolean(
            isSt &&
            data.startedAt &&
            ((Date.now() + serverOffset) - new Date(data.startedAt).getTime()) >= TOTAL_COUNTDOWN_DURATION_MS
          );

          setCountdownState({
            isDisplayed: isDisp,
            isStarted: isSt,
            startedAt: data.startedAt || null,
            updatedAt: data.updatedAt || new Date().toISOString(),
            serverTime: data.serverTime,
          });

          // If admin clicked Remove (isDisplayed: false) or already completed, remove countdown immediately
          if (!isDisp || isAlreadyCompleted) {
            setShowCountdown(false);
          } else {
            setShowCountdown(true);
          }
        }
      } catch (err) {
        console.error("SSE parse error in SplashWrapper:", err);
      }
    };

    return () => {
      isMounted = false;
      eventSource.close();
    };
  }, []);

  useEffect(() => {
    if (!hasLoadedState || showCountdown || showSplash) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "auto";
    }
  }, [hasLoadedState, showCountdown, showSplash]);

  useEffect(() => {
    // Ensure we start at the top on reload
    if (typeof window !== "undefined") {
      if ("scrollRestoration" in window.history) {
        window.history.scrollRestoration = "manual";
      }
      window.scrollTo(0, 0);
    }
  }, []);

  const isIntroActive = !hasLoadedState || showCountdown || showSplash;

  return (
    <>
      <AnimatePresence mode="wait">
        {hasLoadedState && showCountdown && countdownState?.isDisplayed && (
          <motion.div
            key="countdown-intro"
            initial={{ opacity: 1 }}
            exit={{ opacity: 0, transition: { duration: 0.5 } }}
            style={{ position: "fixed", inset: 0, zIndex: 99999, background: "#000000" }}
          >
            <CountDown
              isStarted={countdownState.isStarted}
              startedAt={countdownState.startedAt}
              serverTime={countdownState.serverTime}
              onComplete={() => {
                setShowCountdown(false);
                setShowSplash(true);
              }}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {hasLoadedState && showSplash && (
        <SplashScreen onComplete={() => setShowSplash(false)} />
      )}

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: isIntroActive ? 0 : 1 }}
        transition={{ duration: 0.8 }}
      >
        <Navbar hideLogo={isIntroActive} />
        {children}
      </motion.div>
    </>
  );
}