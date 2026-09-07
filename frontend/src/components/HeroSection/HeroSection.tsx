"use client";
import { useEffect, useState, useRef } from "react";
import Link from "next/link";
import styles from "./HeroSection.module.css";

import { useEventCountdown } from "@/hooks/useEventCountdown";

const UNSTOP_URL = "https://unstop.com/o/6Y45JWH?lb=useYshOh&utm_medium=Share&utm_source=online_coding_challenge&utm_campaign=Singuaji95983";

function createRipple(e: React.MouseEvent<HTMLElement>) {
  const target = e.currentTarget;
  const rect = target.getBoundingClientRect();
  const size = Math.max(rect.width, rect.height);
  const ripple = document.createElement("span");
  ripple.className = styles.ripple;
  ripple.style.width = ripple.style.height = `${size}px`;
  ripple.style.left = `${e.clientX - rect.left - size / 2}px`;
  ripple.style.top = `${e.clientY - rect.top - size / 2}px`;
  target.appendChild(ripple);
  ripple.addEventListener("animationend", () => ripple.remove());
}

function BigUnit({ v, label }: { v: number; label: string }) {
  return (
    <div className={styles.bigUnit}>
      <span className={styles.bigNum} suppressHydrationWarning>{String(v).padStart(2, "0")}</span>
      <span className={styles.bigLabel}>{label}</span>
    </div>
  );
}

function RailNode({
  label,
  value,
  center,
  active,
}: {
  label: string;
  value: string;
  center?: boolean;
  active?: boolean;
}) {
  return (
    <div
      className={`${styles.railNode} ${center ? styles.railNodeCenter : ""} ${
        active ? styles.active : ""
      }`}
    >
      <span className={styles.nodeMarker}>
        <span className={styles.nodeDot} />
      </span>
      <span className={styles.railNodeText}>
        <span className={styles.nodeLabel}>{label}</span>
        <span className={styles.nodeValue}>{value}</span>
      </span>
    </div>
  );
}

export default function HeroSection() {
  const { days, hours, minutes, seconds } = useEventCountdown();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const railRef = useRef<HTMLDivElement>(null);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [mounted, setMounted] = useState(false);
  const [scanned, setScanned] = useState(false);

  const pulseRef = useRef<HTMLSpanElement>(null);
  const activeIndexRef = useRef<number | null>(null);
  const [activeNode, setActiveNode] = useState<number | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    const el = railRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setScanned(true);
          observer.disconnect();
        }
      },
      { threshold: 0.4 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const DURATION = 6000;
    const NODE_POS = [1 / 6, 1 / 2, 5 / 6];
    const HIT_WINDOW = 0.05;

    let raf: number;
    let start: number | null = null;

    const tick = (ts: number) => {
      if (start === null) start = ts;
      const progress = ((ts - start) % DURATION) / DURATION;

      if (pulseRef.current) {
        pulseRef.current.style.left = `${progress * 100}%`;
      }

      let hit: number | null = null;
      NODE_POS.forEach((p, i) => {
        if (Math.abs(progress - p) < HIT_WINDOW) hit = i;
      });

      if (hit !== activeIndexRef.current) {
        activeIndexRef.current = hit;
        setActiveNode(hit);
      }
      raf = requestAnimationFrame(tick);
    };

    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let w = (canvas.width = window.innerWidth);
    let h = (canvas.height = window.innerHeight);
    const onResize = () => {
      w = canvas.width = window.innerWidth;
      h = canvas.height = window.innerHeight;
    };
    window.addEventListener("resize", onResize, { passive: true });

    const pts: { x: number; y: number; vx: number; vy: number; r: number }[] = Array.from(
      { length: 60 },
      () => ({
        x: Math.random() * w,
        y: Math.random() * h,
        vx: (Math.random() - 0.5) * 0.4,
        vy: (Math.random() - 0.5) * 0.4,
        r: Math.random() * 1.5 + 0.5,
      })
    );

    let raf: number;
    let isVisible = true;

    const draw = () => {
      if (!isVisible) return;
      ctx.clearRect(0, 0, w, h);
      for (let i = 0; i < pts.length; i++) {
        for (let j = i + 1; j < pts.length; j++) {
          const dx = pts[i].x - pts[j].x;
          const dy = pts[i].y - pts[j].y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < 130) {
            ctx.strokeStyle = `rgba(200,241,53,${0.08 * (1 - dist / 130)})`;
            ctx.lineWidth = 0.5;
            ctx.beginPath();
            ctx.moveTo(pts[i].x, pts[i].y);
            ctx.lineTo(pts[j].x, pts[j].y);
            ctx.stroke();
          }
        }
      }
      pts.forEach((p) => {
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = "rgba(200,241,53,0.4)";
        ctx.fill();
        p.x += p.vx;
        p.y += p.vy;
        if (p.x < 0 || p.x > w) p.vx *= -1;
        if (p.y < 0 || p.y > h) p.vy *= -1;
      });
      raf = requestAnimationFrame(draw);
    };

    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        isVisible = entry.isIntersecting;
        if (isVisible) {
          raf = requestAnimationFrame(draw);
        } else {
          cancelAnimationFrame(raf);
        }
      },
      { threshold: 0 }
    );

    observer.observe(canvas);

    return () => {
      cancelAnimationFrame(raf);
      observer.disconnect();
      window.removeEventListener("resize", onResize);
    };
  }, []);

  return (
    <section className={styles.hero} id="home">
      <canvas ref={canvasRef} className={styles.canvas} aria-hidden="true" />
      <div className={styles.topo} aria-hidden="true" />

      {/* Decorative ambient nodes — invisible on desktop, extremely subtle
          on mobile (see .orbitalNodes / .orbNode in the mobile media query) */}
      <div className={styles.orbitalNodes} aria-hidden="true">
        <span className={styles.orbNode} />
        <span className={styles.orbNode} />
        <span className={styles.orbNode} />
      </div>

      <div className={styles.content}>
        <div className={styles.layout}>
          <div className={styles.left}>
            <h1 className={styles.title}>SINGULARITY<span className="sr-only"> 2026 — National-Level 24-Hour Hackathon hosted by A J Institute of Engineering and Technology (AJIET), Mangalore</span></h1>
            <div className={styles.titleLine} />

            <p className={styles.sub}>
              Singularity is a 24-hour national level hackathon hosted by A J Institute of Engineering and Technology (AJIET), Mangalore. Join the brightest minds to compete, collaborate, and create solutions that matter.
            </p>

            <div className={styles.ctas}>
              <Link
                href={UNSTOP_URL}
                className={`btn btn-primary ${styles.ctaBtn}`}
                onMouseDown={createRipple}
                aria-label="INIT_REGISTER - Register for Singularity 2026 hackathon on Unstop"
              >
                INIT_REGISTER
                <span className={styles.loadingDots} aria-hidden="true">
                  <span className={styles.dot} />
                  <span className={styles.dot} />
                  <span className={styles.dot} />
                </span>
                <span className={styles.arrowIcon} aria-hidden="true">
                  →
                </span>
              </Link>
              <a
                href="/Singularity-2026.pdf"
                download
                className={`btn btn-outline ${styles.ctaBtn} ${styles.ctaBtnOutline}`}
                onMouseDown={createRipple}
                aria-label="Download Singularity 2026 hackathon brochure (PDF)"
              >
                BROCHURE
              </a>
            </div>
          </div>

          <div className={styles.right}>
            <div className={styles.countdownPanel}>
              <span className={styles.panelLabel}>
                EVENT<br />
                <span className={styles.panelLabelAccent}>
                  COUNTDOWN
                  <span className={styles.statusDot} aria-hidden="true" />
                </span>
              </span>
              <div className={styles.panelDivider} />
              <div className={styles.countdownRow}>
                <BigUnit v={days} label="DAYS" />
                <BigUnit v={hours} label="HRS" />
                <BigUnit v={minutes} label="MIN" />
                <BigUnit v={seconds} label="SEC" />
              </div>
            </div>
          </div>
        </div>

        <div
          ref={railRef}
          className={`${styles.dataRail} ${scanned ? styles.scanned : ""}`}
        >
          <div className={styles.railLine}>
            <span ref={pulseRef} className={styles.railPulse} />
            {[0, 1, 2, 3, 4, 5].map((i) => (
              <span
                key={i}
                className={styles.railParticle}
                style={{ animationDelay: `${i * -1}s` }}
              />
            ))}
          </div>
          <div className={styles.railNodes}>
            <RailNode
              label="EVENT DATE"
              value="OCT 8–9, 2026"
              active={activeNode === 0}
            />
            <RailNode
              label="EVENT DURATION"
              value="24 HOURS"
              center
              active={activeNode === 1}
            />
            <RailNode
              label="EVENT LOCATION"
              value="AJIET, MANGALORE, KARNATAKA"
              active={activeNode === 2}
            />
          </div>
        </div>
      </div>

      <div className={styles.scrollHint}>
        <span className={styles.scrollLine} />
        <span className={styles.scrollText}>SCROLL</span>
      </div>
    </section>
  );
}
