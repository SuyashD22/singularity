"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { getApiBaseUrl } from "@/lib/api";

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  // If already logged in, redirect to dashboard
  useEffect(() => {
    const token = localStorage.getItem("admin_token");
    if (token) {
      router.push("/nexus");
    }
  }, [router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      const API_BASE = getApiBaseUrl();
      const response = await fetch(`${API_BASE}/api/admin/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ username, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.detail || "Authentication failed.");
      }

      // Store credentials and trigger success state
      localStorage.setItem("admin_token", data.token);
      localStorage.setItem("admin_profile", JSON.stringify(data.admin)); // includes role
      setIsSuccess(true);

      // Redirect based on role: volunteers go straight to scanner
      const role = data.admin?.role || 'admin';
      setTimeout(() => {
        router.push(role === 'volunteer' ? "/nexus/scanner" : "/nexus");
      }, 1000);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Something went wrong. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div
      className="relative flex min-h-screen items-center justify-center px-4"
      style={{
        backgroundColor: "#111010",
        fontFamily: '"Space Grotesk", sans-serif',
      }}
    >
      {/* Topo background pattern overlay */}
      <div className="nx-topo" />

      {/* Subtle radial ambient glow */}
      <div
        style={{
          position: "absolute",
          top: "20%",
          left: "50%",
          transform: "translateX(-50%)",
          width: "600px",
          height: "400px",
          background: "radial-gradient(ellipse at center, rgba(200, 241, 53, 0.05) 0%, transparent 70%)",
          pointerEvents: "none",
          zIndex: 1,
        }}
      />

      <div className="relative z-10 w-full max-w-md">
        {/* Brand Header */}
        <div className="mb-8 text-center">
          <div className="flex justify-center mb-4">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/logo.webp"
              alt="Singularity"
              style={{ width: "64px", height: "64px", objectFit: "contain", borderRadius: "10px" }}
              draggable={false}
            />
          </div>
          <h1 className="text-3xl font-black tracking-tight text-[#F0EDE8] uppercase sm:text-4xl">
            Singularity
          </h1>
          
          <div className="mt-2 flex items-center justify-center gap-2">
            <span
              style={{
                fontFamily: '"JetBrains Mono", monospace',
                fontSize: "0.7rem",
                letterSpacing: "0.15em",
                textTransform: "uppercase",
                color: "#888580",
              }}
            >
              ADMIN CONTROL ACCESS
            </span>
          </div>
        </div>


        {/* Login Card */}
        <div
          className="nx-card"
          style={{
            padding: "32px",
            boxShadow: isSuccess ? "4px 4px 0px #c8f135" : "4px 4px 0px #c8f135",
          }}
        >
          <div className="mb-6 pb-4" style={{ borderBottom: "1px solid #2E2C2B" }}>
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold uppercase tracking-tight text-[#F0EDE8]">
                Console Authentication
              </h2>
              <span
                style={{
                  fontFamily: '"JetBrains Mono", monospace',
                  fontSize: "0.65rem",
                  color: "#c8f135",
                  background: "rgba(200,241,53,0.1)",
                  padding: "2px 8px",
                  borderRadius: "2px",
                  border: "1px solid rgba(200,241,53,0.3)",
                }}
              >
                SECURE
              </span>
            </div>
            <p className="mt-1 text-xs text-[#888580]">
              Authorized administrative personnel only.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Username Input */}
            <div>
              <label
                className="block mb-2 text-xs font-bold uppercase tracking-wider text-[#888580]"
                style={{ fontFamily: '"JetBrains Mono", monospace' }}
              >
                Operator ID / Username
              </label>
              <input
                type="text"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="admin"
                disabled={isLoading || isSuccess}
                className="nx-input"
              />
            </div>

            {/* Password Input */}
            <div>
              <label
                className="block mb-2 text-xs font-bold uppercase tracking-wider text-[#888580]"
                style={{ fontFamily: '"JetBrains Mono", monospace' }}
              >
                Access Key / Password
              </label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                disabled={isLoading || isSuccess}
                className="nx-input"
              />
            </div>

            {/* Error Notification */}
            {error && (
              <div
                className="flex items-center gap-2 p-3 text-xs"
                style={{
                  background: "rgba(255, 45, 111, 0.1)",
                  border: "1px solid rgba(255, 45, 111, 0.3)",
                  borderRadius: "4px",
                  color: "#ff2d6f",
                  fontFamily: '"JetBrains Mono", monospace',
                }}
              >
                <svg className="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                <span>{error}</span>
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading || isSuccess}
              className={`nx-btn w-full ${isSuccess ? "" : "nx-btn-primary"}`}
              style={{
                padding: "14px",
                fontSize: "0.8rem",
                ...(isSuccess
                  ? {
                      backgroundColor: "#c8f135",
                      borderColor: "#c8f135",
                      color: "#111010",
                      boxShadow: "4px 4px 0px #fff",
                    }
                  : {}),
              }}
            >
              {isLoading ? (
                <div className="flex items-center justify-center gap-2">
                  <div
                    className="h-4 w-4 animate-spin rounded-full border-2 border-[#111010] border-t-transparent"
                  />
                  <span>Verifying Credentials...</span>
                </div>
              ) : isSuccess ? (
                <div className="flex items-center justify-center gap-2">
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                  <span>Access Granted — Redirecting</span>
                </div>
              ) : (
                "Authorize Connection"
              )}
            </button>
          </form>
        </div>

        {/* Footer info */}
        <p
          className="mt-8 text-center text-xs text-[#888580]"
          style={{ fontFamily: '"JetBrains Mono", monospace' }}
        >
          SINGULARITY // CORE v1.2.0 &copy; 2026
        </p>
      </div>
    </div>
  );
}
