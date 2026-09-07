"use client";

import React, { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { getApiBaseUrl } from "@/lib/api";
import { Html5Qrcode } from "html5-qrcode";
import NexusSelect from "../components/NexusSelect";

interface CounterSession {
  id: string;
  name: string;
  is_open: boolean;
}

interface ScanLog {
  id: string;
  name: string;
  email?: string;
  teamName?: string;
  teamNumber?: string;
  college?: string;
  role?: string;
  status: "OK" | "ALREADY_CLAIMED" | "ERROR" | "CLOSED";
  message?: string;
  timestamp: string;
}

interface CameraDevice {
  id: string;
  label: string;
}

export default function ScannerPage() {
  const router = useRouter();
  
  // State variables
  const [counters, setCounters] = useState<CounterSession[]>([]);
  const [selectedCounter, setSelectedCounter] = useState<string>("");
  const [isLoadingCounters, setIsLoadingCounters] = useState(true);
  const [error] = useState("");
  
  // Scan result state
  const [scanStatus, setScanStatus] = useState<"idle" | "scanning" | "processing" | "success" | "warning" | "error" | "closed">("idle");
  const [scanResult, setScanResult] = useState<{
    name?: string;
    email?: string;
    teamName?: string;
    teamNumber?: string;
    college?: string;
    role?: string;
    message?: string;
    time?: string;
  } | null>(null);
  const [recentScans, setRecentScans] = useState<ScanLog[]>([]);
  const [scanFlash, setScanFlash] = useState<"success" | "warning" | "error" | null>(null);

  // Camera settings
  const [cameras, setCameras] = useState<CameraDevice[]>([]);
  const [activeCameraId, setActiveCameraId] = useState<string>("");
  const [isCameraSupported, setIsCameraSupported] = useState(true);

  // References
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const isScanningActive = useRef(false);
  const scanInProgress = useRef(false);
  const lastScannedToken = useRef<string>("");

  // Haptic Vibration feedback for mobile scanning
  const vibrate = (type: "success" | "warning" | "error") => {
    if (typeof window !== "undefined" && "vibrate" in navigator) {
      try {
        if (type === "success") {
          navigator.vibrate(150);
        } else if (type === "warning") {
          navigator.vibrate([100, 60, 100]);
        } else {
          navigator.vibrate([200, 80, 200]);
        }
      } catch {
        // Ignore
      }
    }
  };

  // Auth check
  useEffect(() => {
    const token = localStorage.getItem("admin_token");
    const profile = localStorage.getItem("admin_profile");

    if (!token || !profile) {
      router.push("/nexus/login");
      return;
    }
  }, [router]);

  // Real-time counter updates via SSE
  useEffect(() => {
    const API_BASE = getApiBaseUrl();
    const token = localStorage.getItem("admin_token");
    if (!token) return;

    fetch(`${API_BASE}/api/counters`, {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then((res) => res.json())
      .then((data: CounterSession[]) => {
        setCounters(data);
        setIsLoadingCounters(false);
        const firstOpen = data.find((c) => c.is_open);
        if (firstOpen) {
          setSelectedCounter(firstOpen.id);
        } else if (data.length > 0) {
          setSelectedCounter(data[0].id);
        }
      })
      .catch(() => setIsLoadingCounters(false));

    const eventSource = new EventSource(`${API_BASE}/api/counters/events`);
    eventSource.onmessage = (event) => {
      try {
        const updatedCounters: CounterSession[] = JSON.parse(event.data);
        setCounters(updatedCounters);
      } catch (err) {
        console.error("SSE Counter Event Error:", err);
      }
    };

    return () => {
      eventSource.close();
    };
  }, []);

  // Update scanner state when selectedCounter changes
  const isSelectedCounterOpen = counters.find((c) => c.id === selectedCounter)?.is_open ?? false;

  useEffect(() => {
    if (!selectedCounter) return;

    if (!isSelectedCounterOpen) {
      setScanStatus("closed");
      stopScanner();
    } else {
      if (!isScanningActive.current) {
        setScanStatus("scanning");
        startScanner();
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedCounter, isSelectedCounterOpen]);

  // Enumerate cameras on mount
  useEffect(() => {
    Html5Qrcode.getCameras()
      .then((devices) => {
        if (devices && devices.length > 0) {
          setCameras(devices);
          const backCamera = devices.find((d) =>
            d.label.toLowerCase().includes("back") ||
            d.label.toLowerCase().includes("environment") ||
            d.label.toLowerCase().includes("rear")
          );
          setActiveCameraId(backCamera ? backCamera.id : devices[0].id);
        } else {
          setIsCameraSupported(false);
        }
      })
      .catch(() => {
        setIsCameraSupported(false);
      });
  }, []);

  // Visibility changes (Pause camera when app goes to background)
  useEffect(() => {
    const handlePause = () => stopScanner();
    const handleResume = () => {
      if (!document.hidden && isSelectedCounterOpen && !scanResult) {
        startScanner();
      }
    };

    const handleVisibilityChange = () => {
      if (document.hidden) {
        handlePause();
      } else {
        handleResume();
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("pagehide", handlePause);
    window.addEventListener("blur", handlePause);
    window.addEventListener("focus", handleResume);
    
    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("pagehide", handlePause);
      window.removeEventListener("blur", handlePause);
      window.removeEventListener("focus", handleResume);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isSelectedCounterOpen, scanResult, activeCameraId]);

  // Lifecycle cleanup (unmount)
  useEffect(() => {
    return () => {
      stopScanner();
    };
  }, []);

  const startScanner = async () => {
    if (isScanningActive.current) return;

    try {
      if (!scannerRef.current) {
        scannerRef.current = new Html5Qrcode("reader");
      }

      const cameraConfig = activeCameraId
        ? { deviceId: { exact: activeCameraId } }
        : { facingMode: "environment" };

      await scannerRef.current.start(
        cameraConfig,
        {
          fps: 15,
          qrbox: { width: 250, height: 250 },
          aspectRatio: 1.0,
        },
        onScanSuccess,
        onScanError
      );

      isScanningActive.current = true;
      setScanStatus("scanning");
    } catch {
      setIsCameraSupported(false);
    }
  };

  const stopScanner = async () => {
    if (!scannerRef.current) {
      isScanningActive.current = false;
      return;
    }

    const scanner = scannerRef.current;
    scannerRef.current = null;
    isScanningActive.current = false;

    try {
      const state = (scanner as unknown as { getState?: () => number }).getState?.() ?? null;
      if (state === 2 || state === 3) {
        await scanner.stop();
      }
    } catch {
      // Ignored
    }
    
    try {
      scanner.clear(); // Nuke the DOM elements created by html5-qrcode unconditionally
    } catch {
      // Ignored
    }

    // Bulletproof fallback: forcefully kill ANY video tracks on the page globally
    // This runs after graceful shutdown to catch any ghost tracks without triggering onabort()
    try {
      document.querySelectorAll("video").forEach((videoEl) => {
        if (videoEl.srcObject) {
          const stream = videoEl.srcObject as MediaStream;
          stream.getTracks().forEach((track) => track.stop());
          videoEl.srcObject = null;
        }
      });
    } catch {
      // Ignored
    }
  };

  const triggerFlash = (type: "success" | "warning" | "error") => {
    setScanFlash(type);
    setTimeout(() => setScanFlash(null), 800);
  };

  const handleNextScan = () => {
    setScanResult(null);
    setScanFlash(null);
    if (isSelectedCounterOpen) {
      setScanStatus("scanning");
    }
    lastScannedToken.current = "";
    scanInProgress.current = false;
  };

  const onScanSuccess = async (decodedText: string) => {
    if (scanInProgress.current || scanResult) return;
    
    scanInProgress.current = true;
    lastScannedToken.current = decodedText;
    
    setScanStatus("processing");

    try {
      const API_BASE = getApiBaseUrl();
      const res = await fetch(`${API_BASE}/api/claims`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token: decodedText,
          itemType: selectedCounter
        })
      });

      const data = await responseJsonSafe(res);

      if (res.status === 401) {
        localStorage.removeItem("admin_token");
        localStorage.removeItem("admin_profile");
        router.push("/nexus/login");
        return;
      }
      if (!res.ok) {
        vibrate("error");
        triggerFlash("error");
        setScanStatus("error");
        setScanResult({
          message: data.detail || "Invalid access pass signature."
        });
        addScanLog("Invalid Token", "ERROR", data.detail || "Verification failed");
      } else {
        const timeStr = new Date().toLocaleTimeString();
        if (data.status === "OK") {
          vibrate("success");
          triggerFlash("success");
          setScanStatus("success");
          setScanResult({
            name: data.participantName,
            email: data.email,
            teamName: data.teamName,
            teamNumber: data.teamNumber,
            college: data.college,
            role: data.role,
            time: timeStr
          });
          addScanLog(data.participantName, "OK", undefined, {
            email: data.email,
            teamName: data.teamName,
            teamNumber: data.teamNumber,
            college: data.college,
            role: data.role
          });
        } else if (data.status === "ALREADY_CLAIMED") {
          vibrate("warning");
          triggerFlash("warning");
          setScanStatus("warning");
          setScanResult({
            name: data.participantName,
            email: data.email,
            teamName: data.teamName,
            teamNumber: data.teamNumber,
            college: data.college,
            role: data.role,
            message: "Double claim blocked.",
            time: timeStr
          });
          addScanLog(data.participantName, "ALREADY_CLAIMED", "Already verified", {
            email: data.email,
            teamName: data.teamName,
            teamNumber: data.teamNumber,
            college: data.college,
            role: data.role
          });
        } else if (data.status === "COUNTER_CLOSED") {
          vibrate("error");
          triggerFlash("error");
          setScanStatus("closed");
          setScanResult({
            message: "Counter session is locked."
          });
          addScanLog(data.participantName || "Unknown", "CLOSED", "Counter locked");
        } else {
          vibrate("error");
          triggerFlash("error");
          setScanStatus("error");
          setScanResult({
            message: data.message || "Invalid ticket payload."
          });
          addScanLog(data.participantName || "Error", "ERROR", data.message);
        }
      }
    } catch {
      vibrate("error");
      triggerFlash("error");
      setScanStatus("error");
      setScanResult({
        message: "Failed to connect to backend server."
      });
    }
  };

  const responseJsonSafe = async (res: Response) => {
    try {
      return await res.json();
    } catch {
      return {};
    }
  };

  const onScanError = () => {
    // Expected during continuous video scanning
  };

  const addScanLog = (
    name: string,
    status: ScanLog["status"],
    message?: string,
    extraDetails?: {
      email?: string;
      teamName?: string;
      teamNumber?: string;
      college?: string;
      role?: string;
    }
  ) => {
    const newLog: ScanLog = {
      id: Math.random().toString(36).substring(2, 9),
      name,
      status,
      message,
      email: extraDetails?.email,
      teamName: extraDetails?.teamName,
      teamNumber: extraDetails?.teamNumber,
      college: extraDetails?.college,
      role: extraDetails?.role,
      timestamp: new Date().toLocaleTimeString()
    };
    setRecentScans((prev) => [newLog, ...prev.slice(0, 9)]);
  };

  return (
    <div
      className="relative overflow-hidden flex-1 w-full text-[#F0EDE8]"
      style={{ backgroundColor: "#111010", fontFamily: '"Space Grotesk", sans-serif' }}
    >
      <div className="nx-topo" />

      {/* Main Scanner Container */}
      <main className="relative z-10 mx-auto max-w-7xl p-4 sm:p-8 space-y-8">
        
        {/* Header Intro */}
        <div className="pb-4" style={{ borderBottom: "1px solid #2E2C2B" }}>
          <div className="flex items-center gap-2 mb-1">
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
              OPTICAL SENSOR
            </span>
            <span style={{ fontFamily: '"JetBrains Mono", monospace', fontSize: "0.7rem", color: "#888580" }}>{`
              // QR VERIFICATION
            `}</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black uppercase tracking-tight text-[#F0EDE8]">
            Access Pass Scanner
          </h1>
          <p className="text-xs text-[#888580] mt-1" style={{ fontFamily: '"JetBrains Mono", monospace' }}>
            Optical camera scanner for QR pass validation and counter checkout fulfillment.
          </p>
        </div>

        {/* Global Error Alert */}
        {error && (
          <div
            className="p-4 text-xs font-bold"
            style={{
              background: "rgba(255, 45, 111, 0.1)",
              border: "1px solid rgba(255, 45, 111, 0.3)",
              borderRadius: "4px",
              color: "#ff2d6f",
              fontFamily: '"JetBrains Mono", monospace',
            }}
          >
            <span>{error}</span>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          {/* Left Column: Viewfinder & Camera Controls (7/12 cols) */}
          <div className="lg:col-span-7 space-y-6">
            
            {/* Viewfinder Container */}
            <div className="nx-card text-center p-4 sm:p-6">
              
              <div className="mb-4 flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="text-left">
                  <h3 className="text-sm font-black uppercase tracking-tight text-[#F0EDE8]">Optical Viewfinder</h3>
                  <p className="text-xs text-[#888580]" style={{ fontFamily: '"JetBrains Mono", monospace' }}>Align QR pass inside boundary</p>
                </div>

                {cameras.length > 1 && (
                  <select
                    value={activeCameraId}
                    onChange={(e) => setActiveCameraId(e.target.value)}
                    className="nx-select hidden sm:block w-auto py-1 text-xs"
                  >
                    {cameras.map((c, i) => (
                      <option key={c.id} value={c.id} className="bg-[#1A1918] text-[#F0EDE8]">
                        {c.label || `Camera ${i + 1}`}
                      </option>
                    ))}
                  </select>
                )}
              </div>

              {/* Viewfinder Element Wrapper */}
              <div
                className="relative mx-auto aspect-square w-full max-w-sm overflow-hidden bg-black transition-all duration-300"
                style={{
                  borderRadius: "4px",
                  border: scanFlash === "success"
                    ? "2px solid #c8f135"
                    : scanFlash === "warning"
                    ? "2px solid #ffb830"
                    : scanFlash === "error"
                    ? "2px solid #ff2d6f"
                    : "2px solid #2E2C2B",
                  boxShadow: scanFlash === "success"
                    ? "0 0 20px rgba(200, 241, 53, 0.4)"
                    : scanFlash === "warning"
                    ? "0 0 20px rgba(255, 184, 48, 0.4)"
                    : scanFlash === "error"
                    ? "0 0 20px rgba(255, 45, 111, 0.4)"
                    : "none",
                }}
              >
                {/* HTML5 Qrcode Render Target */}
                <div id="reader" style={{ width: '100%', height: '100%' }} />

                {/* Scanner Viewfinder Targets Overlay */}
                {scanStatus !== "closed" && (
                  <div className="absolute inset-0 z-[5] pointer-events-none flex flex-col items-center justify-center">
                    
                    {/* Viewfinder Neon Box Frame */}
                    <div
                      className="w-[65%] h-[65%] relative transition-all duration-200"
                      style={{
                        borderRadius: "4px",
                        border: scanFlash === "success"
                          ? "2px solid #c8f135"
                          : scanFlash === "warning"
                          ? "2px solid #ffb830"
                          : scanFlash === "error"
                          ? "2px solid #ff2d6f"
                          : "2px solid rgba(200, 241, 53, 0.3)",
                      }}
                    >
                      {/* Viewfinder Corners */}
                      <div className="absolute -top-1 -left-1 w-5 h-5 border-t-2 border-l-2 border-[#c8f135]" />
                      <div className="absolute -top-1 -right-1 w-5 h-5 border-t-2 border-r-2 border-[#c8f135]" />
                      <div className="absolute -bottom-1 -left-1 w-5 h-5 border-b-2 border-l-2 border-[#c8f135]" />
                      <div className="absolute -bottom-1 -right-1 w-5 h-5 border-b-2 border-r-2 border-[#c8f135]" />

                      {/* Moving Scan Line */}
                      <div
                        className="absolute left-0 right-0 h-0.5 animate-scan-line"
                        style={{
                          backgroundColor: "#c8f135",
                          boxShadow: "0 0 8px #c8f135",
                        }}
                      />
                    </div>

                    <span
                      className="text-[10px] uppercase font-bold tracking-widest mt-6 px-3 py-1 rounded"
                      style={{
                        fontFamily: '"JetBrains Mono", monospace',
                        color: "#c8f135",
                        background: "rgba(17, 16, 16, 0.9)",
                        border: "1px solid rgba(200, 241, 53, 0.3)",
                      }}
                    >
                      Continuous Scan Active
                    </span>
                  </div>
                )}

                {/* Closed State Overlay */}
                {scanStatus === "closed" && (
                  <div className="absolute inset-0 z-10 flex flex-col items-center justify-center p-6 text-center backdrop-blur-sm" style={{ background: "rgba(17, 16, 16, 0.96)" }}>
                    <div
                      className="flex h-16 w-16 items-center justify-center rounded mb-4"
                      style={{
                        background: "rgba(255, 45, 111, 0.1)",
                        border: "1px solid rgba(255, 45, 111, 0.3)",
                        color: "#ff2d6f",
                      }}
                    >
                      <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                      </svg>
                    </div>
                    <span
                      className="text-[10px] uppercase font-bold tracking-widest px-3 py-1 rounded mb-3"
                      style={{
                        fontFamily: '"JetBrains Mono", monospace',
                        color: "#ff2d6f",
                        border: "1px solid rgba(255, 45, 111, 0.3)",
                        background: "rgba(255, 45, 111, 0.1)",
                      }}
                    >
                      Door Locked
                    </span>
                    <h4 className="font-black text-[#F0EDE8] text-base uppercase">Counter is Locked</h4>
                    <p className="text-xs text-[#888580] mt-2 max-w-xs" style={{ fontFamily: '"JetBrains Mono", monospace' }}>
                      Fulfillment disabled. Select an active open counter or unlock the session in Console.
                    </p>
                  </div>
                )}

                {/* On-Screen Floating Scan Result Banner */}
                {scanResult && scanStatus !== "closed" && (
                  <div className="absolute inset-x-3 bottom-3 z-10">
                    <div
                      className="rounded p-3 text-center shadow-2xl backdrop-blur-md"
                      style={{
                        background: scanResult.message === "Double claim blocked."
                          ? "rgba(26, 25, 24, 0.95)"
                          : scanResult.message
                          ? "rgba(26, 25, 24, 0.95)"
                          : "rgba(26, 25, 24, 0.95)",
                        border: `2px solid ${
                          scanResult.message === "Double claim blocked."
                            ? "#ffb830"
                            : scanResult.message
                            ? "#ff2d6f"
                            : "#c8f135"
                        }`,
                        boxShadow: `4px 4px 0px ${
                          scanResult.message === "Double claim blocked."
                            ? "#ffb830"
                            : scanResult.message
                            ? "#ff2d6f"
                            : "#c8f135"
                        }`,
                      }}
                    >
                      <span
                        className="inline-block px-2.5 py-0.5 rounded text-[10px] font-black uppercase tracking-wider mb-1"
                        style={{
                          fontFamily: '"JetBrains Mono", monospace',
                          color: scanResult.message === "Double claim blocked."
                            ? "#ffb830"
                            : scanResult.message
                            ? "#ff2d6f"
                            : "#c8f135",
                          background: "rgba(0,0,0,0.4)",
                        }}
                      >
                        {scanResult.message === "Double claim blocked."
                          ? "⚠ DOUBLE CLAIM"
                          : scanResult.message
                          ? "✕ DENIED"
                          : "✓ APPROVED"}
                      </span>
                      {scanResult.name && (
                        <p className="text-sm font-black text-[#F0EDE8] truncate max-w-[260px] mx-auto">{scanResult.name}</p>
                      )}
                      {scanResult.teamName && (
                        <p className="text-[11px] font-bold text-[#888580] truncate max-w-[260px] mx-auto mt-0.5" style={{ fontFamily: '"JetBrains Mono", monospace' }}>
                          Team: {scanResult.teamName} {scanResult.teamNumber ? `(${scanResult.teamNumber})` : ''}
                        </p>
                      )}

                      {/* Next Scan Action Button */}
                      <button
                        onClick={handleNextScan}
                        className="nx-btn nx-btn-primary nx-btn-sm mt-2.5 w-full"
                      >
                        <span>Next Scan ➔</span>
                      </button>
                    </div>
                  </div>
                )}

                {/* Camera support error */}
                {!isCameraSupported && (
                  <div className="absolute inset-0 z-10 flex flex-col items-center justify-center p-6 text-center" style={{ background: "#111010" }}>
                    <svg className="h-10 w-10 text-[#888580] mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 015.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 00-1.134-.175 2.31 2.31 0 01-1.64-1.055l-.822-1.316a2.192 2.192 0 00-1.736-1.039 48.774 48.774 0 00-5.232 0 2.192 2.192 0 00-1.736 1.039l-.821 1.316z" />
                      <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5h.008v.008H16.5V10.5z" />
                    </svg>
                    <h4 className="font-bold text-[#F0EDE8]">Camera Access Required</h4>
                    <p className="text-xs text-[#888580] mt-2 max-w-xs" style={{ fontFamily: '"JetBrains Mono", monospace' }}>
                      Video capture hardware missing or permissions denied.
                    </p>
                  </div>
                )}
              </div>

              {/* Latest Scan Result Card */}
              {scanResult && (
                <div
                  className="nx-card-flat mt-4 p-4 text-left"
                  style={{
                    borderColor: scanResult.message === "Double claim blocked."
                      ? "#ffb830"
                      : scanResult.message
                      ? "#ff2d6f"
                      : "#c8f135",
                  }}
                >
                  <div className="flex items-center justify-between pb-2 mb-2" style={{ borderBottom: "1px solid #2E2C2B" }}>
                    <div className="flex items-center gap-2">
                      <span
                        style={{
                          width: "8px",
                          height: "8px",
                          borderRadius: "50%",
                          backgroundColor: scanResult.message === "Double claim blocked."
                            ? "#ffb830"
                            : scanResult.message
                            ? "#ff2d6f"
                            : "#c8f135",
                        }}
                        className="animate-pulse"
                      />
                      <span
                        className="text-xs font-black uppercase tracking-wider"
                        style={{
                          fontFamily: '"JetBrains Mono", monospace',
                          color: scanResult.message === "Double claim blocked."
                            ? "#ffb830"
                            : scanResult.message
                            ? "#ff2d6f"
                            : "#c8f135",
                        }}
                      >
                        {scanResult.message === "Double claim blocked."
                          ? "⚠ DOUBLE CLAIM"
                          : scanResult.message
                          ? "✕ DENIED"
                          : "✓ APPROVED"}
                      </span>
                    </div>
                    <span className="text-[10px] font-mono text-[#888580]">{scanResult.time}</span>
                  </div>

                  {scanResult.name && (
                    <h4 className="text-base font-black text-[#F0EDE8] uppercase">{scanResult.name}</h4>
                  )}

                  <div className="mt-2 grid grid-cols-2 gap-2 text-xs text-[#888580]" style={{ fontFamily: '"JetBrains Mono", monospace' }}>
                    {scanResult.teamName && (
                      <div>
                        <span className="text-[10px] block">Team:</span>
                        <span className="font-bold text-[#c8f135]">{scanResult.teamName} {scanResult.teamNumber ? `(${scanResult.teamNumber})` : ''}</span>
                      </div>
                    )}
                    {scanResult.college && (
                      <div>
                        <span className="text-[10px] block">College:</span>
                        <span className="font-medium text-[#F0EDE8] truncate block">{scanResult.college}</span>
                      </div>
                    )}
                    {scanResult.email && (
                      <div className="col-span-2">
                        <span className="text-[10px] block">Email:</span>
                        <span className="text-[#888580] truncate block">{scanResult.email}</span>
                      </div>
                    )}
                  </div>

                  <button
                    onClick={handleNextScan}
                    className="nx-btn nx-btn-primary nx-btn-sm mt-3.5 w-full"
                  >
                    <span>Next Scan ➔</span>
                  </button>
                </div>
              )}

            </div>
          </div>

          {/* Right Column: Counter Selector & Recent Scans (5/12 cols) */}
          <div className="lg:col-span-5 space-y-6">
            
            {/* Counter Selector Card */}
            <div className="nx-card space-y-4 relative z-50">
              <div>
                <h3 className="text-sm font-black uppercase tracking-tight text-[#F0EDE8]">Target Counter Door</h3>
                <p className="text-xs text-[#888580]" style={{ fontFamily: '"JetBrains Mono", monospace' }}>Select active fulfillment session</p>
              </div>

              {isLoadingCounters ? (
                <div className="h-10 w-full rounded animate-pulse" style={{ background: "#222120" }} />
              ) : (
                <div className="space-y-3">
                  <NexusSelect
                    value={selectedCounter}
                    onChange={setSelectedCounter}
                    placeholder="Select counter session..."
                    options={
                      counters.length === 0
                        ? [{ value: "", label: "No counters defined" }]
                        : counters.map((c) => ({
                            value: c.id,
                            label: `${c.is_open ? "🔓" : "🔒"} ${c.name} ${c.is_open ? "(OPEN)" : "(LOCKED)"}`,
                          }))
                    }
                  />

                  {/* Active Counter Status Indicator */}
                  {selectedCounter && (
                    <div className="pt-1">
                      {counters.find(c => c.id === selectedCounter)?.is_open ? (
                        <div className="flex items-center gap-2 text-xs font-bold" style={{ color: "#c8f135", fontFamily: '"JetBrains Mono", monospace' }}>
                          <span className="h-2 w-2 rounded-full bg-[#c8f135] animate-ping" />
                          <span>COUNTER OPEN — READY FOR SCANS</span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2 text-xs font-bold" style={{ color: "#ff2d6f", fontFamily: '"JetBrains Mono", monospace' }}>
                          <span className="h-2 w-2 rounded-full bg-[#ff2d6f]" />
                          <span>COUNTER LOCKED — CLAIMS PAUSED</span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Recent Scans Panel */}
            <div className="nx-card space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-black uppercase tracking-tight text-[#F0EDE8]">Recent Scans</h3>
                  <p className="text-xs text-[#888580]" style={{ fontFamily: '"JetBrains Mono", monospace' }}>Session activity logs</p>
                </div>
                {recentScans.length > 0 && (
                  <button 
                    onClick={() => setRecentScans([])}
                    className="text-[10px] uppercase font-bold tracking-wider hover:text-white transition-all cursor-pointer"
                    style={{ color: "#888580", fontFamily: '"JetBrains Mono", monospace' }}
                  >
                    Clear Logs
                  </button>
                )}
              </div>

              <div className="space-y-2.5 max-h-[320px] overflow-y-auto pr-1">
                {recentScans.length === 0 ? (
                  <div className="py-8 text-center text-xs text-[#888580] italic" style={{ fontFamily: '"JetBrains Mono", monospace' }}>
                    No scan activity recorded yet.
                  </div>
                ) : (
                  recentScans.map((log) => (
                    <div 
                      key={log.id} 
                      className="flex items-center justify-between p-3 text-xs rounded"
                      style={{
                        background: "#222120",
                        border: "1px solid #2E2C2B",
                      }}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        {log.status === "OK" ? (
                          <span
                            className="flex h-6 w-6 shrink-0 items-center justify-center rounded text-xs font-bold"
                            style={{
                              background: "rgba(200, 241, 53, 0.12)",
                              border: "1px solid rgba(200, 241, 53, 0.3)",
                              color: "#c8f135",
                            }}
                          >
                            ✓
                          </span>
                        ) : log.status === "ALREADY_CLAIMED" ? (
                          <span
                            className="flex h-6 w-6 shrink-0 items-center justify-center rounded text-xs font-bold"
                            style={{
                              background: "rgba(255, 184, 48, 0.12)",
                              border: "1px solid rgba(255, 184, 48, 0.3)",
                              color: "#ffb830",
                            }}
                          >
                            !
                          </span>
                        ) : (
                          <span
                            className="flex h-6 w-6 shrink-0 items-center justify-center rounded text-xs font-bold"
                            style={{
                              background: "rgba(255, 45, 111, 0.12)",
                              border: "1px solid rgba(255, 45, 111, 0.3)",
                              color: "#ff2d6f",
                            }}
                          >
                            ✕
                          </span>
                        )}
                        <div className="min-w-0">
                          <p className="font-bold text-[#F0EDE8] truncate">{log.name}</p>
                          {log.teamName && (
                            <p className="text-[10px] text-[#c8f135] font-medium truncate" style={{ fontFamily: '"JetBrains Mono", monospace' }}>
                              {log.teamName} {log.teamNumber ? `(${log.teamNumber})` : ''}
                            </p>
                          )}
                          {log.email && !log.teamName && (
                            <p className="text-[10px] text-[#888580] font-mono truncate">{log.email}</p>
                          )}
                          {log.message && <p className="text-[10px] text-[#888580] truncate">{log.message}</p>}
                        </div>
                      </div>
                      <span className="text-[10px] text-[#888580] font-mono shrink-0 ml-2">{log.timestamp}</span>
                    </div>
                  ))
                )}
              </div>
            </div>

          </div>

        </div>
      </main>
    </div>
  );
}
