"use client";

import React, { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { getApiBaseUrl } from "@/lib/api";
import NexusSelect from "../components/NexusSelect";

/* ─────────────────────────── Types ─────────────────────────── */
interface ClaimRecord {
  id: number;
  personId?: string;
  itemType: string;
  sessionName: string;
  claimedAt: string | null; // null if unclaimed
  isStaff: boolean;
  name: string;
  email: string | null;
  role: string;
  teamName: string | null;
  teamNumber: string | null;
  college: string | null;
}

interface CounterSession {
  id: string;
  name: string;
  isOpen: boolean;
}

/* ─────────────────────────── Helpers ──────────────────────────── */
function formatTime(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleTimeString("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true
  });
}
function formatDate(iso: string | null) {
  if (!iso) return "";
  return new Date(iso).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short"
  });
}

function roleBadgeStyle(role: string) {
  const key = role.toLowerCase().replace(/^staff \(/, "").replace(/\)$/, "");
  if (key === "hod") return { bg: "rgba(167, 139, 250, 0.12)", color: "#a78bfa", border: "rgba(167, 139, 250, 0.3)" };
  if (key === "faculty") return { bg: "rgba(99, 102, 241, 0.12)", color: "#818cf8", border: "rgba(99, 102, 241, 0.3)" };
  if (key === "volunteer") return { bg: "rgba(45, 212, 191, 0.12)", color: "#2dd4bf", border: "rgba(45, 212, 191, 0.3)" };
  return { bg: "rgba(255, 255, 255, 0.05)", color: "#888580", border: "#2E2C2B" };
}

/* ─────────────────────────── Page ─────────────────────────── */
export default function ClaimsReportPage() {
  const router = useRouter();

  const [claims, setClaims] = useState<ClaimRecord[]>([]);
  const [counters, setCounters] = useState<CounterSession[]>([]);
  const [allParticipants, setAllParticipants] = useState<Record<string, unknown>[]>([]);
  const [allStaff, setAllStaff] = useState<Record<string, unknown>[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  // View toggle: participants | staff
  const [activeView, setActiveView] = useState<"participants" | "staff">("participants");

  // Active counter / session filter
  const [selectedItemType, setSelectedItemType] = useState<string>("");

  // Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all"); // "all" | "claimed" | "unclaimed"
  
  // Participants filters
  const [teamNameFilter, setTeamNameFilter] = useState("");
  const [teamNumberFilter, setTeamNumberFilter] = useState("");

  // Staff filters
  const [roleFilter, setRoleFilter] = useState("all"); // "all" | "hod" | "faculty" | "volunteer"

  /* ── Auth + Data Fetch ── */
  useEffect(() => {
    const token = localStorage.getItem("admin_token");
    const profile = localStorage.getItem("admin_profile");
    if (!token || !profile) { router.push("/nexus/login"); return; }
    try {
      JSON.parse(profile);
    } catch {
      router.push("/nexus/login");
      return;
    }
    fetchData(token);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router]);

  const fetchData = async (token: string) => {
    setIsLoading(true);
    setError("");
    try {
      const API_BASE = getApiBaseUrl();
      const [claimsRes, countersRes, partsRes, staffRes] = await Promise.all([
        fetch(`${API_BASE}/api/claims/report`, { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`${API_BASE}/api/counters`, { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`${API_BASE}/api/participants`, { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`${API_BASE}/api/staff`, { headers: { Authorization: `Bearer ${token}` } }),
      ]);
      if (claimsRes.status === 401 || countersRes.status === 401 || partsRes.status === 401 || staffRes.status === 401) {
        localStorage.removeItem("admin_token");
        localStorage.removeItem("admin_profile");
        router.push("/nexus/login");
        return;
      }
      if (!claimsRes.ok) throw new Error("Failed to load claims.");
      setClaims(await claimsRes.json());
      if (countersRes.ok) {
        const cData = await countersRes.json();
        setCounters(cData);
        if (cData.length > 0) {
          setSelectedItemType(cData[0].id);
        }
      }
      if (partsRes.ok) setAllParticipants(await partsRes.json());
      if (staffRes.ok) setAllStaff(await staffRes.json());
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to load data.");
    } finally {
      setIsLoading(false);
    }
  };

  /* ── Derived data ── */
  const summaryByItemType = useMemo(() => {
    const map: Record<string, { sessionName: string; participants: number; staff: number }> = {};
    for (const c of claims) {
      if (!map[c.itemType]) map[c.itemType] = { sessionName: c.sessionName, participants: 0, staff: 0 };
      if (c.isStaff) map[c.itemType].staff++;
      else map[c.itemType].participants++;
    }
    return map;
  }, [claims]);

  const filteredClaims = useMemo(() => {
    if (!selectedItemType) return [];

    // Build a roster list showing claimed and unclaimed people for the selected session
    const roster = activeView === "participants" ? allParticipants : allStaff;
    const baseList: ClaimRecord[] = roster.map((person) => {
      // Find if they have a claim for this specific session
      const claimForSession = claims.find(c => c.personId === person.id && c.itemType === selectedItemType);
      
      return {
        id: claimForSession ? claimForSession.id : Math.random(), // fake id for unclaimed
        personId: person.id as string,
        itemType: selectedItemType,
        sessionName: counters.find(c => c.id === selectedItemType)?.name || selectedItemType,
        claimedAt: claimForSession ? claimForSession.claimedAt : null,
        isStaff: activeView === "staff",
        name: person.name as string,
        email: (person.email as string) || null,
        role: (person.role as string) || "participant",
        teamName: (person.team_name as string) || null,
        teamNumber: (person.team_number as string) || null,
        college: (person.college as string) || null,
      } as ClaimRecord;
    });

    return baseList.filter((c) => {
      // 1. View Filter
      if (activeView === "participants" && c.isStaff) return false;
      if (activeView === "staff" && !c.isStaff) return false;

      // 2. Status Filter
      if (statusFilter === "claimed" && !c.claimedAt) return false;
      if (statusFilter === "unclaimed" && c.claimedAt) return false;

      // 3. Search Filter
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        if (!c.name.toLowerCase().includes(q) && !(c.email?.toLowerCase().includes(q))) return false;
      }

      // 4. Team Filters (participants only)
      if (activeView === "participants") {
        if (teamNameFilter && !(c.teamName?.toLowerCase().includes(teamNameFilter.toLowerCase()))) return false;
        if (teamNumberFilter && !(String(c.teamNumber).toLowerCase().includes(teamNumberFilter.toLowerCase()))) return false;
      }

      // 5. Role Filter (staff only)
      if (activeView === "staff" && roleFilter !== "all") {
        const normalizedRole = c.role.toLowerCase().replace(/^staff \(/, "").replace(/\)$/, "");
        if (normalizedRole !== roleFilter) return false;
      }
      
      return true;
    });
  }, [claims, allParticipants, allStaff, counters, activeView, selectedItemType, searchQuery, teamNameFilter, teamNumberFilter, roleFilter, statusFilter]);

  // Group participants by team
  const grouped = useMemo(() => {
    if (activeView === "staff") return { "": filteredClaims };
    const groups: Record<string, ClaimRecord[]> = {};
    for (const c of filteredClaims) {
      const key = c.teamName ? `${c.teamName}${c.teamNumber ? ` — ${c.teamNumber}` : ""}` : "No Team";
      if (!groups[key]) groups[key] = [];
      groups[key].push(c);
    }
    return groups;
  }, [filteredClaims, activeView]);

  return (
    <div
      className="relative overflow-hidden flex-1 w-full text-[#F0EDE8]"
      style={{ backgroundColor: "#111010", fontFamily: '"Space Grotesk", sans-serif' }}
    >
      <div className="nx-topo" />

      <main className="relative z-10 mx-auto max-w-7xl px-4 py-8 sm:px-6 space-y-6">

        {/* Header */}
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
              LOGS & METRICS
            </span>
            <span style={{ fontFamily: '"JetBrains Mono", monospace', fontSize: "0.7rem", color: "#888580" }}>{`
              // CLAIMS AUDIT TRACKER
            `}</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black uppercase tracking-tight text-[#F0EDE8]">
            Claims Audit Tracker
          </h1>
          <p className="text-xs text-[#888580] mt-1" style={{ fontFamily: '"JetBrains Mono", monospace' }}>
            Monitor kiosk fulfillment, food distributions, and verification logs in real-time.
          </p>
        </div>

        {/* ── Summary Cards ── */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
          {counters.map((session) => {
            const stats = summaryByItemType[session.id];
            const total = (stats?.participants ?? 0) + (stats?.staff ?? 0);
            const isSelected = selectedItemType === session.id;
            return (
              <button
                key={session.id}
                onClick={() => setSelectedItemType(session.id)}
                className="nx-card-flat text-left transition-all cursor-pointer p-4"
                style={{
                  borderColor: isSelected ? "#c8f135" : "#2E2C2B",
                  backgroundColor: isSelected ? "rgba(200, 241, 53, 0.08)" : "#1A1918",
                  boxShadow: isSelected ? "4px 4px 0px #c8f135" : "none",
                }}
              >
                <div className="flex items-start justify-between mb-2">
                  <div
                    className="text-[10px] font-bold uppercase tracking-wider text-[#888580] leading-tight max-w-[80%]"
                    style={{ fontFamily: '"JetBrains Mono", monospace' }}
                  >
                    {session.name}
                  </div>
                  <span
                    style={{
                      width: "8px",
                      height: "8px",
                      borderRadius: "50%",
                      backgroundColor: session.isOpen ? "#c8f135" : "#888580",
                    }}
                    className={session.isOpen ? "animate-pulse" : ""}
                  />
                </div>
                <div
                  className="text-3xl font-black text-[#F0EDE8]"
                  style={{ fontFamily: '"JetBrains Mono", monospace' }}
                >
                  {total}
                </div>
                <div
                  className="mt-2 space-y-0.5 text-[11px] font-semibold"
                  style={{ fontFamily: '"JetBrains Mono", monospace' }}
                >
                  <div className="flex justify-between">
                    <span className="text-[#888580]">Parts</span>
                    <span style={{ color: "#c8f135" }}>{stats?.participants ?? 0} / {allParticipants.length}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#888580]">Staff</span>
                    <span style={{ color: "#2dd4bf" }}>{stats?.staff ?? 0} / {allStaff.length}</span>
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        {/* ── Toggle Buttons ── */}
        <div
          className="inline-flex items-center p-1 rounded-md"
          style={{ background: "#1A1918", border: "1px solid #2E2C2B" }}
        >
          <button
            onClick={() => { setActiveView("participants"); }}
            className={`px-3.5 py-1.5 text-xs uppercase tracking-wider transition-all rounded cursor-pointer ${
              activeView === "participants"
                ? "bg-[#c8f135] text-[#111010] font-black"
                : "text-[#888580] font-bold hover:text-[#F0EDE8] hover:bg-[#222120]"
            }`}
            style={{ fontFamily: '"JetBrains Mono", monospace' }}
          >
            Participants ({allParticipants.length})
          </button>
          <button
            onClick={() => { setActiveView("staff"); }}
            className={`px-3.5 py-1.5 text-xs uppercase tracking-wider transition-all rounded cursor-pointer ${
              activeView === "staff"
                ? "bg-[#c8f135] text-[#111010] font-black"
                : "text-[#888580] font-bold hover:text-[#F0EDE8] hover:bg-[#222120]"
            }`}
            style={{ fontFamily: '"JetBrains Mono", monospace' }}
          >
            Faculty & Volunteers ({allStaff.length})
          </button>
        </div>

        {/* ── Filters Bar ── */}
        <div className="nx-card-flat p-4 space-y-3">
          <div className="flex flex-col sm:flex-row gap-3 items-end">
            {/* Search */}
            <div className="relative flex-1">
              <label className="block text-[10px] font-bold text-[#888580] uppercase mb-1.5" style={{ fontFamily: '"JetBrains Mono", monospace' }}>
                Search Name / Email
              </label>
              <input
                type="text"
                placeholder="Search name or email..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="nx-input"
              />
            </div>

            {/* Status Filter */}
            <div className="w-full sm:w-44 shrink-0">
              <label className="block text-[10px] font-bold text-[#888580] uppercase mb-1" style={{ fontFamily: '"JetBrains Mono", monospace' }}>
                Claim Status
              </label>
              <NexusSelect
                value={statusFilter}
                onChange={setStatusFilter}
                options={[
                  { value: "all", label: "All Statuses" },
                  { value: "claimed", label: "Claimed" },
                  { value: "unclaimed", label: "Unclaimed" },
                ]}
              />
            </div>

            {/* Participants View Specific Filters */}
            {activeView === "participants" && (
              <>
                <div className="w-full sm:w-48 shrink-0">
                  <label className="block text-[10px] font-bold text-[#888580] uppercase mb-1" style={{ fontFamily: '"JetBrains Mono", monospace' }}>
                    Team Name
                  </label>
                  <input
                    type="text"
                    placeholder="Filter team name..."
                    value={teamNameFilter}
                    onChange={(e) => setTeamNameFilter(e.target.value)}
                    className="nx-input"
                  />
                </div>
                <div className="w-full sm:w-32 shrink-0">
                  <label className="block text-[10px] font-bold text-[#888580] uppercase mb-1" style={{ fontFamily: '"JetBrains Mono", monospace' }}>
                    Team No.
                  </label>
                  <input
                    type="text"
                    placeholder="Team no..."
                    value={teamNumberFilter}
                    onChange={(e) => setTeamNumberFilter(e.target.value)}
                    className="nx-input"
                  />
                </div>
              </>
            )}

            {/* Staff View Specific Filters */}
            {activeView === "staff" && (
              <div className="w-full sm:w-48 shrink-0">
                <label className="block text-[10px] font-bold text-[#888580] uppercase mb-1" style={{ fontFamily: '"JetBrains Mono", monospace' }}>
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
            )}
          </div>

          <div className="flex items-center justify-between pt-1" style={{ fontFamily: '"JetBrains Mono", monospace' }}>
            <span className="text-xs text-[#888580]">
              Showing <span className="font-bold text-[#F0EDE8]">{filteredClaims.length}</span> {activeView === "staff" ? "staff" : "participant"} record{filteredClaims.length !== 1 ? "s" : ""}
              {selectedItemType && (
                <span className="ml-1">for <span style={{ color: "#c8f135" }} className="font-bold">{summaryByItemType[selectedItemType]?.sessionName ?? selectedItemType}</span></span>
              )}
            </span>
            {(searchQuery || teamNameFilter || teamNumberFilter || roleFilter !== "all" || statusFilter !== "all") && (
              <button
                onClick={() => { setSearchQuery(""); setTeamNameFilter(""); setTeamNumberFilter(""); setRoleFilter("all"); setStatusFilter("all"); }}
                className="text-xs hover:underline cursor-pointer"
                style={{ color: "#c8f135" }}
              >
                Clear Filters ✕
              </button>
            )}
          </div>
        </div>

        {/* ── Error / Loading ── */}
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
            {error}
          </div>
        )}

        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-24 gap-4 text-[#888580]">
            <div
              className="h-8 w-8 animate-spin rounded-full border-2 border-t-transparent"
              style={{ borderColor: "#c8f135", borderTopColor: "transparent" }}
            />
            <span className="text-xs" style={{ fontFamily: '"JetBrains Mono", monospace' }}>
              Loading audit logs...
            </span>
          </div>
        ) : filteredClaims.length === 0 ? (
          <div className="nx-card-flat flex flex-col items-center justify-center py-24 text-center">
            <svg className="h-12 w-12 text-[#888580] mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
            <h3 className="text-sm font-bold uppercase tracking-wider text-[#F0EDE8]">No Claim Records</h3>
            <p className="text-xs text-[#888580] mt-1" style={{ fontFamily: '"JetBrains Mono", monospace' }}>
              No claims match the active filter criteria.
            </p>
          </div>
        ) : (
          <div className="space-y-5">
            {activeView === "participants" ? (
              // ── Team-grouped participant view ──
              Object.entries(grouped)
                .sort(([a], [b]) => a.localeCompare(b))
                .map(([teamLabel, members]) => (
                  <div
                    key={teamLabel}
                    className="overflow-hidden rounded"
                    style={{ border: "1px solid #2E2C2B", background: "#1A1918" }}
                  >
                    {/* Team Header */}
                    <div
                      className="flex items-center justify-between px-4 py-3"
                      style={{ borderBottom: "1px solid #2E2C2B", background: "#222120" }}
                    >
                      <div className="flex items-center gap-2.5">
                        <span
                          style={{
                            fontFamily: '"JetBrains Mono", monospace',
                            background: "rgba(200, 241, 53, 0.12)",
                            border: "1px solid rgba(200, 241, 53, 0.3)",
                            color: "#c8f135",
                            padding: "2px 8px",
                            borderRadius: "2px",
                            fontSize: "0.75rem",
                            fontWeight: 800,
                          }}
                        >
                          {members[0]?.teamNumber ? members[0].teamNumber : "—"}
                        </span>
                        <span className="font-black text-[#F0EDE8] text-sm uppercase tracking-tight">
                          {teamLabel}
                        </span>
                      </div>
                      <span
                        className="nx-badge nx-badge-lime"
                        style={{ fontFamily: '"JetBrains Mono", monospace', fontSize: "0.7rem" }}
                      >
                        {members.filter(m => m.claimedAt !== null).length} / {members.length} claimed
                      </span>
                    </div>

                    {/* Members Table */}
                    <div className="nx-table-container">
                      <table className="nx-table" style={{ minWidth: "750px" }}>
                        <thead>
                          <tr>
                            <th style={{ width: "50px" }}>#</th>
                            <th style={{ width: "35%" }}>Attendee</th>
                            <th style={{ width: "35%" }}>Email</th>
                            <th style={{ width: "15%" }}>Status</th>
                            <th style={{ width: "15%", textAlign: "right" }}>Claimed At</th>
                          </tr>
                        </thead>
                        <tbody>
                          {members.map((member, i) => (
                            <tr key={member.id}>
                              <td className="text-[#888580] font-mono">{i + 1}</td>
                              <td>
                                <span className="font-bold text-[#F0EDE8]">{member.name}</span>
                              </td>
                              <td>
                                <span className="text-[#888580] font-mono text-[11px]">{member.email || "—"}</span>
                              </td>
                              <td>
                                {member.claimedAt ? (
                                  <span className="nx-badge nx-badge-lime">
                                    Claimed
                                  </span>
                                ) : (
                                  <span className="nx-badge nx-badge-gray">
                                    Unclaimed
                                  </span>
                                )}
                              </td>
                              <td className="text-right font-mono">
                                {member.claimedAt ? (
                                  <div className="flex flex-col items-end">
                                    <span className="font-bold text-[#F0EDE8]">{formatTime(member.claimedAt)}</span>
                                    <span className="text-[10px] text-[#888580]">{formatDate(member.claimedAt)}</span>
                                  </div>
                                ) : (
                                  <span className="text-[#888580] text-[10px]">--:--</span>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ))
            ) : (
              // ── Staff flat view ──
              <div
                className="overflow-hidden rounded"
                style={{ border: "1px solid #2E2C2B", background: "#1A1918" }}
              >
                <div
                  className="flex items-center justify-between px-4 py-3"
                  style={{ borderBottom: "1px solid #2E2C2B", background: "#222120" }}
                >
                  <span className="font-black text-[#F0EDE8] text-sm uppercase tracking-tight">
                    Faculty & Volunteer Claims
                  </span>
                  <span className="nx-badge nx-badge-lime" style={{ fontFamily: '"JetBrains Mono", monospace' }}>
                    {filteredClaims.filter(m => m.claimedAt !== null).length} / {filteredClaims.length} claimed
                  </span>
                </div>
                <div className="nx-table-container">
                  <table className="nx-table" style={{ minWidth: "850px" }}>
                    <thead>
                      <tr>
                        <th style={{ width: "50px" }}>#</th>
                        <th style={{ width: "25%" }}>Name</th>
                        <th style={{ width: "30%" }}>Email</th>
                        <th style={{ width: "15%" }}>Role</th>
                        <th style={{ width: "15%" }}>Status</th>
                        <th style={{ width: "15%", textAlign: "right" }}>Claimed At</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredClaims.map((member, i) => {
                        const rb = roleBadgeStyle(member.role);
                        return (
                          <tr key={member.id}>
                            <td className="text-[#888580] font-mono">{i + 1}</td>
                            <td>
                              <span className="font-bold text-[#F0EDE8]">{member.name}</span>
                            </td>
                            <td>
                              <span className="text-[#888580] font-mono text-[11px]">{member.email || "—"}</span>
                            </td>
                            <td>
                              <span
                                style={{
                                  background: rb.bg,
                                  color: rb.color,
                                  border: `1px solid ${rb.border}`,
                                  padding: "2px 8px",
                                  borderRadius: "2px",
                                  fontSize: "0.65rem",
                                  fontWeight: 700,
                                  textTransform: "uppercase",
                                  fontFamily: '"JetBrains Mono", monospace',
                                }}
                              >
                                {member.role}
                              </span>
                            </td>
                            <td>
                              {member.claimedAt ? (
                                <span className="nx-badge nx-badge-lime">
                                  Claimed
                                </span>
                              ) : (
                                <span className="nx-badge nx-badge-gray">
                                  Unclaimed
                                </span>
                              )}
                            </td>
                            <td className="text-right font-mono">
                              {member.claimedAt ? (
                                <div className="flex flex-col items-end">
                                  <span className="font-bold text-[#F0EDE8]">{formatTime(member.claimedAt)}</span>
                                  <span className="text-[10px] text-[#888580]">{formatDate(member.claimedAt)}</span>
                                </div>
                              ) : (
                                <span className="text-[#888580] text-[10px]">--:--</span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

      </main>
    </div>
  );
}
