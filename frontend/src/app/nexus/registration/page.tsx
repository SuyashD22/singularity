"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { getApiBaseUrl } from "@/lib/api";
import NexusSelect from "../components/NexusSelect";

interface Participant {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  role: string;
  is_reported: boolean;
  reported_at: string | null;
  team_id: number | null;
  team_name: string | null;
  team_number: string | null;
  college: string | null;
}

export default function RegistrationPage() {
  const router = useRouter();
  const [admin, setAdmin] = useState<Record<string, unknown> | null>(null);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [staff, setStaff] = useState<Participant[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  // In-page view toggle: 'participants' | 'staff'
  const [activeView, setActiveView] = useState<"participants" | "staff">("participants");

  // Filters State
  const [searchQuery, setSearchQuery] = useState("");
  const [teamNameFilter, setTeamNameFilter] = useState("");
  const [teamNumberFilter, setTeamNumberFilter] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all"); // 'all' | 'unconfirmed' | 'confirmed'

  // Async Action State
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);

  // Authenticate Admin and Fetch Data
  useEffect(() => {
    const token = localStorage.getItem("admin_token");
    const profile = localStorage.getItem("admin_profile");

    if (!token || !profile) {
      router.push("/nexus/login");
      return;
    }

    try {
      const parsedProfile = JSON.parse(profile);
      setAdmin(parsedProfile);
    } catch {
      router.push("/nexus/login");
      return;
    }

    fetchRosters(token);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router]);

  // Toast Auto-dismissal
  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 4000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  const fetchRosters = async (token: string) => {
    setIsLoading(true);
    setError("");

    try {
      const API_BASE = getApiBaseUrl();
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
      if (!staffRes.ok) throw new Error("Failed to load staff list.");
      const staffData = await staffRes.json();
      setStaff(staffData);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "An error occurred while loading lists.");
    } finally {
      setIsLoading(false);
    }
  };

  // Perform Check-In Action
  const handleConfirmCheckin = async (id: string, name: string) => {
    const token = localStorage.getItem("admin_token");
    if (!token) return;

    setActionLoading(id);
    setToast(null);

    try {
      const API_BASE = getApiBaseUrl();
      const response = await fetch(`${API_BASE}/api/participants/${id}/report`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json"
        }
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.detail || "Check-in request failed.");
      }

      setToast({
        message: `Successfully checked in ${name} and emailed access pass!`,
        type: "success"
      });

      // Refresh rosters to sync local state
      await fetchRosters(token);
    } catch (err: unknown) {
      setToast({
        message: err instanceof Error ? err.message : `Failed to check in ${name}.`,
        type: "error"
      });
    } finally {
      setActionLoading(null);
    }
  };

  const handleBulkCheckinStaff = async () => {
    const token = localStorage.getItem("admin_token");
    if (!token) return;

    setActionLoading("bulk-staff");
    setToast(null);

    try {
      const API_BASE = getApiBaseUrl();
      const response = await fetch(`${API_BASE}/api/checkin/bulk-staff`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json"
        }
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.detail || "Bulk check-in request failed.");
      }

      setToast({
        message: data.message || `Successfully bulk generated and emailed passes!`,
        type: "success"
      });

      // Refresh rosters to sync local state
      await fetchRosters(token);
    } catch (err: unknown) {
      setToast({
        message: err instanceof Error ? err.message : `Failed to perform bulk check-in.`,
        type: "error"
      });
    } finally {
      setActionLoading(null);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("admin_token");
    localStorage.removeItem("admin_profile");
    router.push("/nexus/login");
  };

  // Filter Logic - Client Side
  const filteredParticipants = participants.filter((p) => {
    const matchesSearch =
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.email.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesTeamName =
      !teamNameFilter ||
      (p.team_name && p.team_name.toLowerCase().includes(teamNameFilter.toLowerCase()));

    const matchesTeamNumber =
      !teamNumberFilter ||
      (p.team_number && p.team_number.toLowerCase().includes(teamNumberFilter.toLowerCase()));

    const matchesStatus =
      statusFilter === "all" ||
      (statusFilter === "confirmed" && p.is_reported) ||
      (statusFilter === "unconfirmed" && !p.is_reported);

    return matchesSearch && matchesTeamName && matchesTeamNumber && matchesStatus;
  });

  // Sort: Group by Team Number naturally (e.g. T-01, T-02), then by Name
  const sortedParticipants = [...filteredParticipants].sort((a, b) => {
    const numA = a.team_number || "";
    const numB = b.team_number || "";

    if (numA && !numB) return -1;
    if (!numA && numB) return 1;
    if (numA !== numB) {
      return numA.localeCompare(numB, undefined, { numeric: true, sensitivity: "base" });
    }
    return a.name.localeCompare(b.name);
  });

  const filteredStaff = staff.filter((s) => {
    const matchesSearch =
      s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.email.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesRole = roleFilter === "all" || s.role === roleFilter;

    const matchesStatus =
      statusFilter === "all" ||
      (statusFilter === "confirmed" && s.is_reported) ||
      (statusFilter === "unconfirmed" && !s.is_reported);

    return matchesSearch && matchesRole && matchesStatus;
  });

  const sortedStaff = [...filteredStaff].sort((a, b) => a.name.localeCompare(b.name));

  if (!admin) return null;

  return (
    <div
      className="relative overflow-hidden flex-1 w-full text-[#F0EDE8]"
      style={{ backgroundColor: "#111010", fontFamily: '"Space Grotesk", sans-serif' }}
    >
      <div className="nx-topo" />

      {/* Main Container */}
      <main className="relative z-10 mx-auto max-w-7xl p-4 sm:p-8 space-y-6">
        
        {/* Floating Toast Notification Banner */}
        {toast && (
          <div
            className="fixed bottom-6 right-6 z-50 flex items-center gap-3 p-4 max-w-md"
            style={{
              background: "#1A1918",
              border: `2px solid ${toast.type === "success" ? "#c8f135" : "#ff2d6f"}`,
              boxShadow: `4px 4px 0px ${toast.type === "success" ? "#c8f135" : "#ff2d6f"}`,
              borderRadius: "4px",
              color: toast.type === "success" ? "#c8f135" : "#ff2d6f",
              fontFamily: '"JetBrains Mono", monospace',
            }}
          >
            {toast.type === "success" ? (
              <svg className="h-5 w-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            ) : (
              <svg className="h-5 w-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            )}
            <span className="text-xs font-bold">{toast.message}</span>
          </div>
        )}

        {/* Header Intro with Underlined Tabs on the Right */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between pb-4 gap-4" style={{ borderBottom: "1px solid #2E2C2B" }}>
          <div className="flex flex-col gap-1">
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
                DESK PROTOCOL
              </span>
              <span style={{ fontFamily: '"JetBrains Mono", monospace', fontSize: "0.7rem", color: "#888580" }}>{`
                // CHECK-IN REGISTRY
              `}</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black uppercase tracking-tight text-[#F0EDE8]">
              Check-In & Registration
            </h1>
            <p className="text-xs text-[#888580]" style={{ fontFamily: '"JetBrains Mono", monospace' }}>
              Confirm attendee arrivals, issuing and dispatching cryptographic entry passes.
            </p>
          </div>

          {/* Underlined Text Tabs on the Right */}
          <div className="flex gap-6 shrink-0" style={{ fontFamily: '"JetBrains Mono", monospace' }}>
            <button
              onClick={() => {
                setActiveView("participants");
                setSearchQuery("");
                setStatusFilter("all");
              }}
              className="pb-2 text-xs uppercase tracking-wider font-bold transition-all cursor-pointer"
              style={{
                borderBottom: activeView === "participants" ? "2px solid #c8f135" : "2px solid transparent",
                color: activeView === "participants" ? "#c8f135" : "#888580",
              }}
            >
              Participants ({participants.length})
            </button>
            <button
              onClick={() => {
                setActiveView("staff");
                setSearchQuery("");
                setStatusFilter("all");
              }}
              className="pb-2 text-xs uppercase tracking-wider font-bold transition-all cursor-pointer"
              style={{
                borderBottom: activeView === "staff" ? "2px solid #c8f135" : "2px solid transparent",
                color: activeView === "staff" ? "#c8f135" : "#888580",
              }}
            >
              Staff & Vols ({staff.length})
            </button>
          </div>
        </div>

        {/* Loader Screen */}
        {isLoading ? (
          <div className="flex justify-center items-center py-24">
            <div className="flex flex-col items-center gap-3 text-[#888580]">
              <div
                className="h-8 w-8 animate-spin rounded-full border-2 border-t-transparent"
                style={{ borderColor: "#c8f135", borderTopColor: "transparent" }}
              />
              <span className="text-xs" style={{ fontFamily: '"JetBrains Mono", monospace' }}>
                Loading records from Turso database...
              </span>
            </div>
          </div>
        ) : error ? (
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
            <span>{error}</span>
          </div>
        ) : (
          <div className="space-y-4">
            
            {/* Dynamic Filter Layout */}
            <div className="nx-card-flat space-y-4">
              <div className="flex items-center justify-between">
                <h4
                  className="text-xs font-black uppercase tracking-wider text-[#888580]"
                  style={{ fontFamily: '"JetBrains Mono", monospace' }}
                >
                  Filter Parameters
                </h4>
              </div>

              <div className="grid gap-4 md:grid-cols-4 sm:grid-cols-2 items-end">
                {/* Search bar */}
                <div>
                  <label className="block text-xs font-bold text-[#888580] uppercase mb-1.5" style={{ fontFamily: '"JetBrains Mono", monospace' }}>
                    Search Name / Email
                  </label>
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search name or email..."
                    className="nx-input"
                  />
                </div>

                {/* Status Filter */}
                <div>
                  <label className="block text-xs font-bold text-[#888580] uppercase mb-1.5" style={{ fontFamily: '"JetBrains Mono", monospace' }}>
                    Check-in Status
                  </label>
                  <NexusSelect
                    value={statusFilter}
                    onChange={setStatusFilter}
                    options={[
                      { value: "all", label: "All Statuses" },
                      { value: "unconfirmed", label: "Unconfirmed" },
                      { value: "confirmed", label: "Confirmed" },
                    ]}
                  />
                </div>

                {/* Participants View Specific Filters */}
                {activeView === "participants" && (
                  <>
                    <div>
                      <label className="block text-xs font-bold text-[#888580] uppercase mb-1.5" style={{ fontFamily: '"JetBrains Mono", monospace' }}>
                        Team Name
                      </label>
                      <input
                        type="text"
                        value={teamNameFilter}
                        onChange={(e) => setTeamNameFilter(e.target.value)}
                        placeholder="Filter team name..."
                        className="nx-input"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-[#888580] uppercase mb-1.5" style={{ fontFamily: '"JetBrains Mono", monospace' }}>
                        Team Number
                      </label>
                      <input
                        type="text"
                        value={teamNumberFilter}
                        onChange={(e) => setTeamNumberFilter(e.target.value)}
                        placeholder="Filter team no..."
                        className="nx-input"
                      />
                    </div>
                  </>
                )}

                {/* Volunteers & Staff View Specific Filters */}
                {activeView === "staff" && (
                  <>
                    <div>
                      <label className="block text-xs font-bold text-[#888580] uppercase mb-1.5" style={{ fontFamily: '"JetBrains Mono", monospace' }}>
                        Role Type
                      </label>
                      <NexusSelect
                        value={roleFilter}
                        onChange={setRoleFilter}
                        options={[
                          { value: "all", label: "All Roles" },
                          { value: "hod", label: "HODs" },
                          { value: "faculty", label: "Faculty" },
                          { value: "volunteer", label: "Volunteers" },
                        ]}
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-[#888580] uppercase mb-1.5 opacity-0 select-none">
                        Action
                      </label>
                      <button
                        onClick={handleBulkCheckinStaff}
                        disabled={actionLoading === "bulk-staff"}
                        className="nx-btn nx-btn-primary w-full h-[42px]"
                      >
                        {actionLoading === "bulk-staff" ? (
                          <>
                            <div className="h-3 w-3 animate-spin rounded-full border-2 border-[#111010] border-t-transparent" />
                            <span>Processing...</span>
                          </>
                        ) : (
                          <>
                            <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                            </svg>
                            <span className="truncate">Bulk Send Pending Passes</span>
                          </>
                        )}
                      </button>
                    </div>
                  </>
                )}

              </div>
            </div>

            {/* View Panels */}
            {activeView === "participants" ? (
              <>
                {/* Desktop View Table */}
                <div className="nx-table-container hidden md:block">
                  <table className="nx-table" style={{ minWidth: "980px" }}>
                    <thead>
                      <tr>
                        <th style={{ width: "22%", minWidth: "180px" }}>Attendee</th>
                        <th style={{ width: "26%", minWidth: "220px" }}>Contact Info</th>
                        <th style={{ width: "18%", minWidth: "160px" }}>Team Details</th>
                        <th style={{ width: "16%", minWidth: "150px" }}>Affiliation</th>
                        <th style={{ width: "10%", minWidth: "100px" }}>Status</th>
                        <th style={{ width: "8%", minWidth: "130px", textAlign: "right" }}>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {sortedParticipants.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="p-8 text-center text-[#888580] font-semibold">
                            No matching participant records found.
                          </td>
                        </tr>
                      ) : (
                        sortedParticipants.map((p) => (
                          <tr key={p.id}>
                            <td style={{ verticalAlign: "middle" }}>
                              <p className="font-bold text-[#F0EDE8] text-sm">{p.name}</p>
                              <p className="text-xs text-[#888580] font-mono mt-0.5">{p.id}</p>
                            </td>
                            <td style={{ verticalAlign: "middle" }}>
                              <p className="text-[#F0EDE8] text-xs">{p.email}</p>
                              <p className="text-[#888580] text-xs font-mono mt-0.5">{p.phone || "No Phone"}</p>
                            </td>
                            <td style={{ verticalAlign: "middle" }}>
                              <p className="font-bold text-[#F0EDE8] text-xs">{p.team_name || "N/A"}</p>
                              {p.team_number && (
                                <span className="nx-badge nx-badge-lime mt-1 font-mono text-[10px]">
                                  NO: {p.team_number}
                                </span>
                              )}
                            </td>
                            <td className="text-[#888580] text-xs" style={{ verticalAlign: "middle" }}>
                              {p.college || "N/A"}
                            </td>
                            <td style={{ verticalAlign: "middle" }}>
                              {p.is_reported ? (
                                <span className="nx-badge nx-badge-lime">
                                  CONFIRMED
                                </span>
                              ) : (
                                <span className="nx-badge nx-badge-gray">
                                  PENDING
                                </span>
                              )}
                            </td>
                            <td style={{ textAlign: "right", verticalAlign: "middle" }}>
                              <button
                                onClick={() => handleConfirmCheckin(p.id, p.name)}
                                disabled={actionLoading !== null}
                                className={`nx-table-btn ${p.is_reported ? '' : 'nx-table-btn-primary'}`}
                              >
                                {actionLoading === p.id ? (
                                  <div className="flex items-center gap-1">
                                    <div className="h-3 w-3 animate-spin rounded-full border-2 border-current border-t-transparent" />
                                    <span>Sending...</span>
                                  </div>
                                ) : p.is_reported ? (
                                  "Resend Pass"
                                ) : (
                                  "Confirm & Email"
                                )}
                              </button>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Mobile View Card List */}
                <div className="md:hidden space-y-3">
                  {sortedParticipants.length === 0 ? (
                    <div className="nx-card-flat p-8 text-center text-[#888580] font-semibold">
                      No matching participant records found.
                    </div>
                  ) : (
                    sortedParticipants.map((p) => (
                      <div key={p.id} className="nx-card-flat p-4 space-y-3 text-xs">
                        <div className="flex justify-between items-start">
                          <div>
                            <h4 className="font-bold text-[#F0EDE8] text-sm">{p.name}</h4>
                            <p className="text-xs text-[#888580] font-mono mt-0.5">{p.id.substring(0, 8)}...</p>
                          </div>
                          {p.is_reported ? (
                            <span className="nx-badge nx-badge-lime">
                              CONFIRMED
                            </span>
                          ) : (
                            <span className="nx-badge nx-badge-gray">
                              PENDING
                            </span>
                          )}
                        </div>

                        <div className="grid grid-cols-2 gap-2 text-[#888580] pt-2" style={{ borderTop: "1px solid #2E2C2B" }}>
                          <p className="truncate"><span className="block text-[10px] font-bold uppercase text-[#888580]">Email</span> {p.email}</p>
                          <p><span className="block text-[10px] font-bold uppercase text-[#888580]">Phone</span> {p.phone || "N/A"}</p>
                          <p className="truncate"><span className="block text-[10px] font-bold uppercase text-[#888580]">Team</span> {p.team_name || "N/A"}</p>
                          <p><span className="block text-[10px] font-bold uppercase text-[#888580]">Team No</span> {p.team_number || "N/A"}</p>
                        </div>

                        <div className="pt-2" style={{ borderTop: "1px solid #2E2C2B" }}>
                          <button
                            onClick={() => handleConfirmCheckin(p.id, p.name)}
                            disabled={actionLoading !== null}
                            className={`nx-btn w-full nx-btn-sm ${p.is_reported ? 'nx-btn-outline' : 'nx-btn-primary'}`}
                          >
                            {actionLoading === p.id ? (
                              <div className="flex items-center justify-center gap-1">
                                <div className="h-3 w-3 animate-spin rounded-full border-2 border-current border-t-transparent" />
                                <span>Sending...</span>
                              </div>
                            ) : p.is_reported ? (
                              "Resend Pass"
                            ) : (
                              "Confirm & Email Pass"
                            )}
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </>
            ) : (
              <>
                {/* Desktop View Table */}
                <div className="nx-table-container hidden md:block">
                  <table className="nx-table" style={{ minWidth: "900px" }}>
                    <thead>
                      <tr>
                        <th style={{ width: "25%", minWidth: "200px" }}>Personnel</th>
                        <th style={{ width: "30%", minWidth: "240px" }}>Contact Info</th>
                        <th style={{ width: "18%", minWidth: "150px" }}>Assigned Role</th>
                        <th style={{ width: "14%", minWidth: "120px" }}>Status</th>
                        <th style={{ width: "13%", minWidth: "130px", textAlign: "right" }}>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {sortedStaff.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="p-8 text-center text-[#888580] font-semibold">
                            No matching staff members found.
                          </td>
                        </tr>
                      ) : (
                        sortedStaff.map((s) => (
                          <tr key={s.id}>
                            <td style={{ verticalAlign: "middle" }}>
                              <p className="font-bold text-[#F0EDE8] text-sm">{s.name}</p>
                              <p className="text-xs text-[#888580] font-mono mt-0.5">{s.id}</p>
                            </td>
                            <td style={{ verticalAlign: "middle" }}>
                              <p className="text-[#F0EDE8] text-xs">{s.email}</p>
                              <p className="text-[#888580] text-xs font-mono mt-0.5">{s.phone || "No Phone"}</p>
                            </td>
                            <td style={{ verticalAlign: "middle" }}>
                              <span className="nx-badge nx-badge-lime uppercase">
                                {s.role}
                              </span>
                            </td>
                            <td style={{ verticalAlign: "middle" }}>
                              {s.is_reported ? (
                                <span className="nx-badge nx-badge-lime">
                                  Checked In
                                </span>
                              ) : (
                                <span className="nx-badge nx-badge-gray">
                                  Pending
                                </span>
                              )}
                            </td>
                            <td className="text-right">
                              <button
                                onClick={() => handleConfirmCheckin(s.id, s.name)}
                                disabled={actionLoading !== null}
                                className={`nx-btn nx-btn-sm ${s.is_reported ? 'nx-btn-outline' : 'nx-btn-primary'}`}
                              >
                                {actionLoading === s.id ? (
                                  <div className="flex items-center gap-1">
                                    <div className="h-3 w-3 animate-spin rounded-full border-2 border-current border-t-transparent" />
                                    <span>Sending...</span>
                                  </div>
                                ) : s.is_reported ? (
                                  "Resend Pass"
                                ) : (
                                  "Confirm & Email"
                                )}
                              </button>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Mobile View Card List */}
                <div className="md:hidden space-y-3">
                  {sortedStaff.length === 0 ? (
                    <div className="nx-card-flat p-8 text-center text-[#888580] font-semibold">
                      No matching staff members found.
                    </div>
                  ) : (
                    sortedStaff.map((s) => (
                      <div key={s.id} className="nx-card-flat p-4 space-y-3 text-xs">
                        <div className="flex justify-between items-start">
                          <div>
                            <h4 className="font-bold text-[#F0EDE8] text-sm">{s.name}</h4>
                            <p className="text-xs text-[#888580] font-mono mt-0.5">{s.id.substring(0, 8)}...</p>
                          </div>
                          {s.is_reported ? (
                            <span className="nx-badge nx-badge-lime">
                              Confirmed
                            </span>
                          ) : (
                            <span className="nx-badge nx-badge-gray">
                              Pending
                            </span>
                          )}
                        </div>

                        <div className="grid grid-cols-2 gap-2 text-[#888580] pt-2" style={{ borderTop: "1px solid #2E2C2B" }}>
                          <p className="truncate"><span className="block text-[10px] font-bold uppercase text-[#888580]">Email</span> {s.email}</p>
                          <p><span className="block text-[10px] font-bold uppercase text-[#888580]">Phone</span> {s.phone || "N/A"}</p>
                          <p className="col-span-2">
                            <span className="block text-[10px] font-bold uppercase text-[#888580]">Role</span>
                            <span className="nx-badge nx-badge-lime uppercase mt-0.5">
                              {s.role}
                            </span>
                          </p>
                        </div>

                        <div className="pt-2" style={{ borderTop: "1px solid #2E2C2B" }}>
                          <button
                            onClick={() => handleConfirmCheckin(s.id, s.name)}
                            disabled={actionLoading !== null}
                            className={`nx-btn w-full nx-btn-sm ${s.is_reported ? 'nx-btn-outline' : 'nx-btn-primary'}`}
                          >
                            {actionLoading === s.id ? (
                              <div className="flex items-center justify-center gap-1">
                                <div className="h-3 w-3 animate-spin rounded-full border-2 border-current border-t-transparent" />
                                <span>Sending...</span>
                              </div>
                            ) : s.is_reported ? (
                              "Resend Pass"
                            ) : (
                              "Confirm & Email Pass"
                            )}
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </>
            )}

          </div>
        )}

      </main>
    </div>
  );
}
