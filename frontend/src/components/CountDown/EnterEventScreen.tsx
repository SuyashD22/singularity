'use client';

import React, { useState, useCallback, useRef } from 'react';
import { hapticsManager } from '@/lib/haptics';
import styles from './EnterEventScreen.module.css';

const TEASER_TEXTS = [
  "We're almost there. Just saying.",
  "Give us a minute. Literally.",
  "It's cooking. Almost ready.",
  "Just a little more time.",
  "Coming soon. We mean it.",
  "Almost ready. Promise.",
  "Something good is loading.",
  "Your wait won't be too long.",
  "We're getting things ready.",
  "Almost done. Hang tight.",
  "It's nearly time.",
  "Just putting the final touches.",
  "We're getting there.",
  "A little longer. Then we're live.",
  "Almost ready to serve.",
  "Freshly made. Coming soon.",
  "Still cooking. Check back soon.",
  "We're adding the final touches.",
  "Not long now.",
  "Your patience is appreciated.",
  "Almost time to begin.",
  "We're making it worth the wait.",
  "Just a few finishing touches.",
  "Coming soon. Stay close.",
  "See you on the other side.",
];

interface Ripple {
  id: number;
  x: number;
  y: number;
}

interface EnterEventScreenProps {
  onEnter?: () => void;
  isStarted?: boolean;
}

export default function EnterEventScreen({ onEnter }: EnterEventScreenProps) {
  const [tapped, setTapped] = useState(false);
  const [currentText, setCurrentText] = useState('');
  const [textVisible, setTextVisible] = useState(false);
  const [ripples, setRipples] = useState<Ripple[]>([]);
  const isTransitioningRef = useRef(false);

  // Pool to ensure all 25 texts are shown before repeating
  const remainingIndicesRef = useRef<number[]>([]);

  const getNextRandomText = useCallback(() => {
    if (remainingIndicesRef.current.length === 0) {
      // Refill and shuffle pool
      const all = Array.from({ length: TEASER_TEXTS.length }, (_, i) => i);
      // Fisher-Yates shuffle
      for (let i = all.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [all[i], all[j]] = [all[j], all[i]];
      }
      remainingIndicesRef.current = all;
    }
    const idx = remainingIndicesRef.current.pop()!;
    return TEASER_TEXTS[idx];
  }, []);

  const triggerRipple = (clientX: number, clientY: number) => {
    const id = Date.now() + Math.random();
    setRipples((prev) => [...prev.slice(-3), { id, x: clientX, y: clientY }]);
    setTimeout(() => {
      setRipples((prev) => prev.filter((r) => r.id !== id));
    }, 600);
  };

  const handleInteraction = useCallback(
    (e: React.MouseEvent<HTMLDivElement> | React.TouchEvent<HTMLDivElement>) => {
      let clientX = window.innerWidth / 2;
      let clientY = window.innerHeight / 2;

      if ('touches' in e && e.touches.length > 0) {
        clientX = e.touches[0].clientX;
        clientY = e.touches[0].clientY;
      } else if ('clientX' in e) {
        clientX = e.clientX;
        clientY = e.clientY;
      }

      triggerRipple(clientX, clientY);

      // Silently unlock sound hardware on user gesture (NO audio chime played on tap)
      try {
        hapticsManager.unlock();
      } catch {
        // Proceed gracefully if browser blocks audio
      }

      if (onEnter) {
        onEnter();
      }

      if (isTransitioningRef.current) return;

      if (!tapped) {
        // First tap: transition from "ARE YOU READY?" to first random teaser
        isTransitioningRef.current = true;
        setTapped(true);
        const next = getNextRandomText();
        setCurrentText(next);
        setTimeout(() => {
          setTextVisible(true);
          isTransitioningRef.current = false;
        }, 50);
      } else {
        // Subsequent taps: smooth crossfade to next random teaser
        isTransitioningRef.current = true;
        setTextVisible(false);
        setTimeout(() => {
          const next = getNextRandomText();
          setCurrentText(next);
          setTextVisible(true);
          isTransitioningRef.current = false;
        }, 220);
      }
    },
    [tapped, onEnter, getNextRandomText]
  );

  return (
    <div
      className={styles.container}
      onClick={handleInteraction}
      role="region"
      aria-label="Launch Event Interaction Screen"
    >
      <div className={styles.scanlines} aria-hidden />
      <div className={styles.vignette} aria-hidden />

      {/* Subtle touch ripples */}
      {ripples.map((r) => (
        <div
          key={r.id}
          className={styles.ripple}
          style={{ left: `${r.x}px`, top: `${r.y}px` }}
          aria-hidden
        />
      ))}

      {/* Header with matching muted third image text color */}
      <header className={styles.header}>
        <span>[ SYSTEM // SECURE CHANNEL ]</span>
        <span>[ STANDBY // STAGE ARMED ]</span>
      </header>

      {/* Center Content */}
      <div className={styles.centerContent}>
        {!tapped ? (
          <>
            <h1 className={styles.readyHeading}>ARE YOU READY?</h1>
            <p className={styles.touchHint}>[ TOUCH TO INTERACT ]</p>
          </>
        ) : (
          <>
            <div
              className={`${styles.teaserWrap} ${
                textVisible ? styles.teaserVisible : styles.teaserHidden
              }`}
            >
              <p className={styles.teaserText}>{currentText}</p>
            </div>
            <p className={styles.touchHint}>[ TOUCH TO INTERACT ]</p>
          </>
        )}
      </div>

      {/* Footer with matching muted third image text color */}
      <footer className={styles.footer}>
        <span>[ LIVE BROADCAST // AWAITING LAUNCH TRIGGER ]</span>
      </footer>
    </div>
  );
}
