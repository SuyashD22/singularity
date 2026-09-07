"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { getApiBaseUrl } from "@/lib/api";

interface CounterSession {
  id: string;
  name: string;
  is_open: boolean;
  opened_at: string | null;
  closed_at: string | null;
}

interface Participant {
  id: string;
  name: string;
  email: string;
  is_reported: boolean;
  team_id: number | null;
  role: string;
}

export default function DashboardPage() {
  const router = useRouter();
  const [admin, setAdmin] = useState<Record<string, unknown> | null>(null);

  const handleLogout = () => {
    localStorage.removeItem("admin_token");
    localStorage.removeItem("admin_profile");
    router.push("/nexus/login");
  };

  const [counters, setCounters] = useState<CounterSession[]>([]);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [staff, setStaff] = useState<Record<string, unknown>[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // Confirmation Modal States
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [confirmSessionId, setConfirmSessionId] = useState<string | null>(null);
  const [confirmSessionName, setConfirmSessionName] = useState("");

  // Authenticate and fetch initial data
  useEffect(() => {
    const token = localStorage.getItem("admin_token");
    const profile = localStorage.getItem("admin_profile");

    if (!token || !profile) {
      router.push("/nexus/login");
      return;
    }

    try {
      const parsedProfile = JSON.parse(profile);
      // Volunteers are not allowed on the Console page
      if (parsedProfile.role === 'volunteer') {
        router.push("/nexus/scanner");
        return;
      }
      setAdmin(parsedProfile);
    } catch {
      router.push("/nexus/login");
      return;
    }

    fetchDashboardData(token);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router]);

  const fetchDashboardData = async (token: string) => {
    setIsLoading(true);
    setError("");

    try {
      const API_BASE = getApiBaseUrl();
      // Fetch Counters
      const countersRes = await fetch(`${API_BASE}/api/counters`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (countersRes.status === 401) return handleLogout();
      if (!countersRes.ok) throw new Error("Failed to load counter sessions.");
      const countersData = await countersRes.json();
      setCounters(countersData);

      // Fetch Participants
      const partsRes = await fetch(`${API_BASE}/api/participants`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (partsRes.status === 401) return handleLogout();
      if (!partsRes.ok) throw new Error("Failed to load participants.");
      const partsData = await partsRes.json();
      setParticipants(partsData);

      // Fetch Staff
      const staffRes = await fetch(`${API_BASE}/api/staff`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (staffRes.status === 401) return handleLogout();
      if (!staffRes.ok) throw new Error("Failed to load staff.");
      const staffData = await staffRes.json();
      setStaff(staffData);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "An error occurred while fetching data.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleToggleCounter = (sessionId: string) => {
    const session = counters.find(c => c.id === sessionId);
    if (!session) return;

    // Both locking and unlocking require confirmation modal
    setConfirmSessionId(sessionId);
    setConfirmSessionName(session.name);
    setShowConfirmModal(true);
  };

  const executeToggleCounter = async (sessionId: string) => {
    const token = localStorage.getItem("admin_token");
    if (!token) return;

    setActionLoading(sessionId);
    try {
      const API_BASE = getApiBaseUrl();
      const response = await fetch(`${API_BASE}/api/counters/${sessionId}/toggle`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      if (response.status === 401) return handleLogout();
      if (!response.ok) {
        throw new Error("Failed to update counter session door.");
      }

      // Fetch updated list of all counters to reflect any that were closed in the process
      const countersRes = await fetch(`${API_BASE}/api/counters`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (countersRes.ok) {
        const countersData = await countersRes.json();
        setCounters(countersData);
      } else {
        const updatedSession = await response.json();
        setCounters(prev => 
          prev.map(c => c.id === sessionId ? updatedSession : c)
        );
      }
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Could not toggle counter door.");
    } finally {
      setActionLoading(null);
    }
  };

  const handleConfirmOpen = () => {
    if (confirmSessionId) {
      executeToggleCounter(confirmSessionId);
    }
    setShowConfirmModal(false);
    setConfirmSessionId(null);
  };

  if (isLoading && !admin) {
    return (
      <div
        className="flex min-h-screen items-center justify-center text-white"
        style={{ backgroundColor: "#111010", fontFamily: '"Space Grotesk", sans-serif' }}
      >
        <div className="flex flex-col items-center gap-3">
          <div
            className="h-8 w-8 animate-spin rounded-full border-2 border-t-transparent"
            style={{ borderColor: "#c8f135", borderTopColor: "transparent" }}
          />
          <span
            className="text-xs uppercase tracking-widest text-[#888580]"
            style={{ fontFamily: '"JetBrains Mono", monospace' }}
          >
            Loading Terminal...
          </span>
        </div>
      </div>
    );
  }

  // Calculate Statistics
  const totalParticipants = participants.length;
  const reportedCount = participants.filter(p => p.is_reported).length;
  const reportedPercentage = totalParticipants > 0 ? Math.round((reportedCount / totalParticipants) * 100) : 0;

  const totalStaff = staff.length;
  const reportedStaffCount = staff.filter(s => s.is_reported).length;
  const reportedStaffPercentage = totalStaff > 0 ? Math.round((reportedStaffCount / totalStaff) * 100) : 0;

  const isTargetSessionOpen = counters.find(c => c.id === confirmSessionId)?.is_open || false;

  return (
    <div
      className="relative overflow-hidden flex-1 w-full text-[#F0EDE8]"
      style={{ backgroundColor: "#111010", fontFamily: '"Space Grotesk", sans-serif' }}
    >
      {/* Topo background pattern overlay */}
      <div className="nx-topo" />

      {/* Main Dashboard Layout */}
      <main className="relative z-10 mx-auto max-w-7xl p-4 sm:p-8 space-y-8">

        {/* Header Title Section */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4" style={{ borderBottom: "1px solid #2E2C2B" }}>
          <div>
            <div className="flex items-center gap-2">
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
                SYSTEM LIVE
              </span>
              <span
                style={{
                  fontFamily: '"JetBrains Mono", monospace',
                  fontSize: "0.7rem",
                  color: "#888580",
                }}
              >{`
                // ADMIN CONSOLE
              `}</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black uppercase tracking-tight text-[#F0EDE8] mt-1">
              Command Overview
            </h1>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => fetchDashboardData(localStorage.getItem("admin_token") || "")}
              disabled={isLoading}
              className="nx-btn nx-btn-outline nx-btn-sm"
              title="Refresh Data"
            >
              <svg className={`h-3.5 w-3.5 ${isLoading ? 'animate-spin' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              <span>Refresh</span>
            </button>
          </div>
        </div>

        {/* Error Alert */}
        {error && (
          <div
            className="flex items-center gap-3 p-4 text-xs"
            style={{
              background: "rgba(255, 45, 111, 0.1)",
              border: "1px solid rgba(255, 45, 111, 0.3)",
              borderRadius: "4px",
              color: "#ff2d6f",
              fontFamily: '"JetBrains Mono", monospace',
            }}
          >
            <svg className="h-5 w-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <div className="flex-1">
              <p className="font-bold">Sync Error</p>
              <p className="text-[#ff2d6f]/80 mt-0.5">{error}</p>
            </div>
            <button 
              onClick={() => fetchDashboardData(localStorage.getItem("admin_token") || "")}
              className="nx-btn nx-btn-danger nx-btn-sm"
            >
              Retry
            </button>
          </div>
        )}

        {/* Top Cards Statistics Row */}
        <section className="grid gap-6 lg:grid-cols-3 md:grid-cols-2">
          {/* Participant Check-In Progress card */}
          <div className="nx-card">
            <div className="flex items-start justify-between mb-4">
              <div>
                <span
                  style={{
                    fontFamily: '"JetBrains Mono", monospace',
                    fontSize: "0.65rem",
                    letterSpacing: "0.1em",
                    textTransform: "uppercase",
                    color: "#888580",
                    fontWeight: 700,
                  }}
                >
                  Participants Check-In
                </span>
                <p className="text-3xl font-black text-[#F0EDE8] mt-1 tracking-tight">
                  {reportedCount} <span className="text-sm font-bold text-[#888580]">/ {totalParticipants}</span>
                </p>
              </div>
              <div className="text-right">
                <span
                  style={{
                    fontFamily: '"JetBrains Mono", monospace',
                    fontSize: "1.75rem",
                    fontWeight: 900,
                    color: "#c8f135",
                  }}
                >
                  {reportedPercentage}%
                </span>
              </div>
            </div>
            
            {/* Custom Meter */}
            <div
              className="w-full h-2 rounded overflow-hidden"
              style={{ background: "#222120", border: "1px solid #2E2C2B" }}
            >
              <div 
                className="h-full transition-all duration-1000"
                style={{
                  width: `${reportedPercentage}%`,
                  backgroundColor: "#c8f135",
                  boxShadow: "0 0 8px rgba(200, 241, 53, 0.4)",
                }}
              />
            </div>
            
            <p
              className="text-xs mt-3 text-[#888580]"
              style={{ fontFamily: '"JetBrains Mono", monospace', fontSize: "0.7rem" }}
            >
              Updates dynamically when participant passes are scanned.
            </p>
          </div>

          {/* Event Staff Check-In Card */}
          <div className="nx-card">
            <div className="flex items-start justify-between mb-4">
              <div>
                <span
                  style={{
                    fontFamily: '"JetBrains Mono", monospace',
                    fontSize: "0.65rem",
                    letterSpacing: "0.1em",
                    textTransform: "uppercase",
                    color: "#888580",
                    fontWeight: 700,
                  }}
                >
                  Staff / Vol Check-In
                </span>
                <p className="text-3xl font-black text-[#F0EDE8] mt-1 tracking-tight">
                  {reportedStaffCount} <span className="text-sm font-bold text-[#888580]">/ {totalStaff}</span>
                </p>
              </div>
              <div className="text-right">
                <span
                  style={{
                    fontFamily: '"JetBrains Mono", monospace',
                    fontSize: "1.75rem",
                    fontWeight: 900,
                    color: "#c8f135",
                  }}
                >
                  {reportedStaffPercentage}%
                </span>
              </div>
            </div>
            
            {/* Custom Meter */}
            <div
              className="w-full h-2 rounded overflow-hidden"
              style={{ background: "#222120", border: "1px solid #2E2C2B" }}
            >
              <div 
                className="h-full transition-all duration-1000"
                style={{
                  width: `${reportedStaffPercentage}%`,
                  backgroundColor: "#c8f135",
                  boxShadow: "0 0 8px rgba(200, 241, 53, 0.4)",
                }}
              />
            </div>
            
            <p
              className="text-xs mt-3 text-[#888580]"
              style={{ fontFamily: '"JetBrains Mono", monospace', fontSize: "0.7rem" }}
            >
              HODs, Faculty Coordinators, and Volunteers reported.
            </p>
          </div>

          {/* Quick Stats Panel */}
          <div className="nx-card md:col-span-2 lg:col-span-1">
            <div className="grid grid-cols-2 gap-4 h-full items-center">
              <div style={{ borderRight: "1px solid #2E2C2B", paddingRight: "16px" }}>
                <span
                  style={{
                    fontFamily: '"JetBrains Mono", monospace',
                    fontSize: "0.65rem",
                    letterSpacing: "0.1em",
                    textTransform: "uppercase",
                    color: "#888580",
                    fontWeight: 700,
                  }}
                >
                  Registered Teams
                </span>
                <p className="text-3xl font-black text-[#F0EDE8] mt-1">
                  {isLoading ? "..." : Array.from(new Set(participants.map(p => p.team_id).filter(id => id !== null))).length}
                </p>
              </div>
              <div style={{ paddingLeft: "8px" }}>
                <span
                  style={{
                    fontFamily: '"JetBrains Mono", monospace',
                    fontSize: "0.65rem",
                    letterSpacing: "0.1em",
                    textTransform: "uppercase",
                    color: "#888580",
                    fontWeight: 700,
                  }}
                >
                  Active Counter
                </span>
                <p
                  className="text-lg font-black mt-1.5 truncate"
                  style={{
                    color: counters.find(c => c.is_open) ? "#c8f135" : "#888580",
                    fontFamily: '"Space Grotesk", sans-serif',
                  }}
                >
                  {isLoading ? "..." : counters.find(c => c.is_open)?.name || "None"}
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Counter Controllers Dashboard Grid */}
        <section className="space-y-4 pt-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
            <div>
              <h3 className="text-xl font-black uppercase tracking-tight text-[#F0EDE8]">
                Session Counter Doors
              </h3>
              <p className="text-xs text-[#888580]" style={{ fontFamily: '"JetBrains Mono", monospace' }}>
                Only open counters allow verification & claims processing at kiosks
              </p>
            </div>
          </div>

          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {isLoading && counters.length === 0 ? (
              Array.from({ length: 3 }).map((_, i) => (
                <div
                  key={i}
                  className="h-[200px] rounded animate-pulse"
                  style={{ background: "#1A1918", border: "2px solid #2E2C2B" }}
                />
              ))
            ) : (
              counters.map((session) => (
                <div 
                  key={session.id}
                  className="nx-card relative"
                  style={{
                    borderColor: session.is_open ? "#c8f135" : "#2E2C2B",
                    boxShadow: session.is_open ? "4px 4px 0px #c8f135" : "4px 4px 0px rgba(0,0,0,0.5)",
                  }}
                >
                  {/* Glowing left edge accent when open */}
                  {session.is_open && (
                    <div
                      style={{
                        position: "absolute",
                        top: 0,
                        bottom: 0,
                        left: 0,
                        width: "4px",
                        backgroundColor: "#c8f135",
                      }}
                    />
                  )}

                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <span
                        style={{
                          fontFamily: '"JetBrains Mono", monospace',
                          fontSize: "0.65rem",
                          color: "#888580",
                          letterSpacing: "0.15em",
                          textTransform: "uppercase",
                          fontWeight: 700,
                        }}
                      >
                        SESSION // {session.id}
                      </span>
                      <h4 className="text-lg font-black uppercase tracking-tight text-[#F0EDE8] mt-0.5">
                        {session.name}
                      </h4>
                    </div>

                    <span
                      style={{
                        fontFamily: '"JetBrains Mono", monospace',
                        fontSize: "0.65rem",
                        fontWeight: 700,
                        letterSpacing: "0.1em",
                        padding: "3px 8px",
                        borderRadius: "2px",
                        border: session.is_open
                          ? "1px solid rgba(200, 241, 53, 0.4)"
                          : "1px solid #2E2C2B",
                        backgroundColor: session.is_open
                          ? "rgba(200, 241, 53, 0.12)"
                          : "#222120",
                        color: session.is_open ? "#c8f135" : "#888580",
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "6px",
                      }}
                    >
                      <span
                        style={{
                          width: "6px",
                          height: "6px",
                          borderRadius: "50%",
                          backgroundColor: session.is_open ? "#c8f135" : "#888580",
                        }}
                        className={session.is_open ? "animate-pulse" : ""}
                      />
                      {session.is_open ? "ACTIVE" : "LOCKED"}
                    </span>
                  </div>

                  <div
                    className="space-y-1.5 mb-6 text-xs text-[#888580]"
                    style={{ fontFamily: '"JetBrains Mono", monospace' }}
                  >
                    <p>
                      Opened: <span className="text-[#F0EDE8]">{session.opened_at ? new Date(session.opened_at).toLocaleTimeString() : "N/A"}</span>
                    </p>
                    <p>
                      Closed: <span className="text-[#F0EDE8]">{session.closed_at ? new Date(session.closed_at).toLocaleTimeString() : "N/A"}</span>
                    </p>
                  </div>

                  {/* Toggle Button */}
                  <button
                    onClick={() => handleToggleCounter(session.id)}
                    disabled={actionLoading !== null}
                    className={`nx-btn w-full ${session.is_open ? 'nx-btn-outline' : 'nx-btn-primary'}`}
                    style={session.is_open ? { borderColor: "#ff2d6f", color: "#ff2d6f", boxShadow: "4px 4px 0px #ff2d6f" } : {}}
                  >
                    {actionLoading === session.id ? (
                      <div className="flex items-center justify-center gap-2">
                        <div
                          className="h-3 w-3 animate-spin rounded-full border-2 border-t-transparent"
                          style={{
                            borderColor: session.is_open ? '#ff2d6f' : '#111010',
                            borderTopColor: 'transparent',
                          }}
                        />
                        <span>Updating Door...</span>
                      </div>
                    ) : session.is_open ? (
                      "Lock Counter Door"
                    ) : (
                      "Unlock Counter Door"
                    )}
                  </button>
                </div>
              ))
            )}
          </div>
        </section>
      </main>

      {/* Confirmation Modal */}
      {showConfirmModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div
            className="nx-card max-w-md w-full p-6 space-y-5"
            style={{
              backgroundColor: "#1A1918",
              borderColor: isTargetSessionOpen ? "#ff2d6f" : "#c8f135",
              boxShadow: isTargetSessionOpen ? "6px 6px 0px #ff2d6f" : "6px 6px 0px #c8f135",
            }}
          >
            <div className="flex items-center gap-3">
              <div
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded"
                style={{
                  background: isTargetSessionOpen ? "rgba(255, 45, 111, 0.12)" : "rgba(200, 241, 53, 0.12)",
                  border: isTargetSessionOpen ? "1px solid rgba(255, 45, 111, 0.3)" : "1px solid rgba(200, 241, 53, 0.3)",
                  color: isTargetSessionOpen ? "#ff2d6f" : "#c8f135",
                }}
              >
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <h3 className="text-lg font-black uppercase tracking-tight text-[#F0EDE8]">
                {isTargetSessionOpen ? "Lock Counter Door?" : "Unlock Counter Door?"}
              </h3>
            </div>
            
            <p className="text-xs sm:text-sm text-[#888580] leading-relaxed">
              {isTargetSessionOpen ? (
                <>Are you sure you want to lock and close <span className="font-bold text-[#F0EDE8]">&quot;{confirmSessionName}&quot;</span>? Scanners will no longer be able to verify claims for this counter.</>
              ) : (
                <>Do you want to close any other active counter sessions and open <span className="font-bold text-[#c8f135]">&quot;{confirmSessionName}&quot;</span>?</>
              )}
            </p>

            <div className="flex justify-end gap-3 pt-2">
              <button
                onClick={() => {
                  setShowConfirmModal(false);
                  setConfirmSessionId(null);
                }}
                className="nx-btn nx-btn-ghost nx-btn-sm"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmOpen}
                className={`nx-btn nx-btn-sm ${isTargetSessionOpen ? 'nx-btn-danger' : 'nx-btn-primary'}`}
              >
                {isTargetSessionOpen ? "Lock Door" : "Unlock Door"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
