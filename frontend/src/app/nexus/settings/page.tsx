"use client";

import React, { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { getApiBaseUrl } from "@/lib/api";
import NexusSelect from "../components/NexusSelect";

interface ImportedParticipant {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  role: string;
  team_id: number | null;
}

interface AdminUser {
  id: number;
  username: string;
  name: string | null;
  role: string;
  createdAt: string;
}

export default function SettingsPage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [admin, setAdmin] = useState<Record<string, unknown> | null>(null);
  
  // Navigation tabs: 'feed' | 'admins'
  const [activeTab, setActiveTab] = useState<"feed" | "admins">("admins");

  // Global State Notification
  const [error, setError] = useState("");
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);

  // === Tab 1: CSV Import Feed State ===
  const [file, setFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isClearing, setIsClearing] = useState(false);
  const [successList, setSuccessList] = useState<ImportedParticipant[] | null>(null);

  // === Tab 2: Admin Management State ===
  const [adminsList, setAdminsList] = useState<AdminUser[]>([]);
  const [adminsLoading, setAdminsLoading] = useState(false);
  
  // Form Create admin
  const [createUsername, setCreateUsername] = useState("");
  const [createName, setCreateName] = useState("");
  const [createPassword, setCreatePassword] = useState("");
  const [createRole, setCreateRole] = useState("admin");
  const [createLoading, setCreateLoading] = useState(false);

  // Form Change password
  const [editingAdminId, setEditingAdminId] = useState<number | null>(null);
  const [updatePasswordValue, setUpdatePasswordValue] = useState("");
  const [updateLoading, setUpdateLoading] = useState(false);

  // Authenticate Admin
  useEffect(() => {
    const token = localStorage.getItem("admin_token");
    const profile = localStorage.getItem("admin_profile");

    if (!token || !profile) {
      router.push("/nexus/login");
      return;
    }

    try {
      const parsedProfile = JSON.parse(profile);
      // Volunteers cannot access Settings
      if (parsedProfile.role === 'volunteer') {
        router.push("/nexus/scanner");
        return;
      }
      setAdmin(parsedProfile);
    } catch {
      router.push("/nexus/login");
      return;
    }
  }, [router]);

  // Load admins list when tab changes
  useEffect(() => {
    if (activeTab === "admins") {
      fetchAdmins();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab]);

  // Toast Auto-dismissal
  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 4000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  const handleLogout = () => {
    localStorage.removeItem("admin_token");
    localStorage.removeItem("admin_profile");
    router.push("/nexus/login");
  };

  const fetchAdmins = async () => {
    const token = localStorage.getItem("admin_token");
    if (!token) return;

    setAdminsLoading(true);
    setError("");

    try {
      const API_BASE = getApiBaseUrl();
      const res = await fetch(`${API_BASE}/api/admin`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.status === 401) return handleLogout();
      if (!res.ok) throw new Error("Failed to load administrator accounts.");
      const data = await res.json();
      setAdminsList(data);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setAdminsLoading(false);
    }
  };

  // === CSV Import actions ===
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      validateAndSetFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      validateAndSetFile(e.target.files[0]);
    }
  };

  const validateAndSetFile = (selectedFile: File) => {
    setError("");
    const name = selectedFile.name.toLowerCase();
    if (!name.endsWith(".csv") && !name.endsWith(".xlsx") && !name.endsWith(".xls")) {
      setError("Please select a valid CSV or Excel spreadsheet (.csv, .xlsx, .xls).");
      return;
    }
    setFile(selectedFile);
  };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) return;

    setIsLoading(true);
    setError("");
    setSuccessList(null);

    const token = localStorage.getItem("admin_token");
    if (!token) return;

    try {
      const formData = new FormData();
      formData.append("file", file);

      const API_BASE = getApiBaseUrl();
      const response = await fetch(`${API_BASE}/api/upload/csv`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`
        },
        body: formData
      });

      const data = await response.json();

      if (response.status === 401) return handleLogout();
      if (!response.ok) {
        throw new Error(data.detail || "Failed to process the uploaded file.");
      }

      setToast({ message: data.message || "File uploaded successfully!", type: "success" });
      setSuccessList(data.participants || []);
      setFile(null);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "An error occurred during file upload.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleClearData = async () => {
    const confirmation = window.confirm("WARNING: This will permanently wipe all participants, claims, and counter session logs from the event database! Are you absolutely sure?");
    if (!confirmation) return;

    setIsClearing(true);
    setError("");
    const token = localStorage.getItem("admin_token");
    if (!token) return;

    try {
      const API_BASE = getApiBaseUrl();
      const response = await fetch(`${API_BASE}/api/upload/clear`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      if (response.status === 401) return handleLogout();
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.detail || "Failed to clear database records.");
      }

      setSuccessList(null);
      setToast({ message: "Successfully wiped all participant records.", type: "success" });
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Clear database request failed.");
    } finally {
      setIsClearing(false);
    }
  };

  // === Admin Account Actions ===
  const handleCreateAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!createUsername || !createPassword) return;

    setCreateLoading(true);
    setError("");

    const token = localStorage.getItem("admin_token");
    if (!token) return;

    try {
      const API_BASE = getApiBaseUrl();
      const response = await fetch(`${API_BASE}/api/admin/register`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          username: createUsername,
          name: createName || null,
          password: createPassword,
          role: createRole
        })
      });

      const data = await response.json();

      if (response.status === 401) return handleLogout();
      if (!response.ok) {
        throw new Error(data.detail || "Failed to register new administrator.");
      }

      setToast({ message: `Successfully registered admin "${createUsername}"!`, type: "success" });
      setCreateUsername("");
      setCreateName("");
      setCreatePassword("");
      setCreateRole("admin");
      
      // Reload administrator accounts list
      await fetchAdmins();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Registration request failed.");
    } finally {
      setCreateLoading(false);
    }
  };

  const handleUpdatePassword = async (id: number, username: string) => {
    if (!updatePasswordValue) return;

    setUpdateLoading(true);
    setError("");

    const token = localStorage.getItem("admin_token");
    if (!token) return;

    try {
      const API_BASE = getApiBaseUrl();
      const response = await fetch(`${API_BASE}/api/admin/${id}/password`, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ password: updatePasswordValue })
      });

      if (response.status === 401) return handleLogout();
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.detail || "Failed to update password.");
      }

      setToast({ message: `Successfully updated password for "${username}"!`, type: "success" });
      setEditingAdminId(null);
      setUpdatePasswordValue("");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Password update failed.");
    } finally {
      setUpdateLoading(false);
    }
  };

  const handleDeleteAdmin = async (id: number, username: string) => {
    const confirmed = window.confirm(`Are you sure you want to delete administrator account "${username}"?`);
    if (!confirmed) return;

    setError("");
    const token = localStorage.getItem("admin_token");
    if (!token) return;

    try {
      const API_BASE = getApiBaseUrl();
      const response = await fetch(`${API_BASE}/api/admin/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` }
      });

      if (response.status === 401) return handleLogout();
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.detail || "Failed to delete administrator.");
      }

      setToast({ message: `Successfully deleted admin account "${username}"!`, type: "success" });
      await fetchAdmins();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Deletion failed.");
    }
  };

  if (!admin) return null;

  return (
    <div
      className="relative overflow-hidden flex-1 w-full text-[#F0EDE8]"
      style={{ backgroundColor: "#111010", fontFamily: '"Space Grotesk", sans-serif' }}
    >
      <div className="nx-topo" />

      {/* Main Container */}
      <main className="relative z-10 mx-auto max-w-7xl p-4 sm:p-8 space-y-8">
        
        {/* Floating Toast Notification Banner */}
        {toast && (
          <div
            className="fixed bottom-6 right-6 z-50 flex items-center gap-3 p-4 max-w-md"
            style={{
              background: toast.type === "success" ? "#1A1918" : "#1A1918",
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
              CONFIGURATION
            </span>
            <span style={{ fontFamily: '"JetBrains Mono", monospace', fontSize: "0.7rem", color: "#888580" }}>{`
              // SYSTEM SETTINGS
            `}</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black uppercase tracking-tight text-[#F0EDE8]">
            System Settings
          </h1>
          <p className="text-xs text-[#888580] mt-1" style={{ fontFamily: '"JetBrains Mono", monospace' }}>
            Import event roster feeds, execute database wipe procedures, or manage administrative credentials.
          </p>
        </div>

        {/* Global Error Banner */}
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
            <span>{error}</span>
          </div>
        )}

        {/* Two-Column Grid Sidebar Layout */}
        <div className="flex flex-col md:flex-row gap-8 items-start">
          
          {/* Left Navigation Sidebar */}
          <aside
            className="w-full md:w-60 shrink-0 flex flex-row md:flex-col gap-2 pb-4 md:pb-0 md:pr-6"
            style={{ borderRight: "1px solid #2E2C2B" }}
          >
            <button
              onClick={() => {
                setActiveTab("admins");
                setError("");
              }}
              className="w-full text-left px-4 py-2.5 rounded text-xs uppercase tracking-wider font-bold transition-all cursor-pointer"
              style={{
                fontFamily: '"JetBrains Mono", monospace',
                borderLeft: activeTab === "admins" ? "3px solid #c8f135" : "3px solid transparent",
                backgroundColor: activeTab === "admins" ? "rgba(200,241,53,0.1)" : "transparent",
                color: activeTab === "admins" ? "#c8f135" : "#888580",
              }}
            >
              Admin Accounts
            </button>
            <button
              onClick={() => {
                setActiveTab("feed");
                setError("");
              }}
              className="w-full text-left px-4 py-2.5 rounded text-xs uppercase tracking-wider font-bold transition-all cursor-pointer"
              style={{
                fontFamily: '"JetBrains Mono", monospace',
                borderLeft: activeTab === "feed" ? "3px solid #c8f135" : "3px solid transparent",
                backgroundColor: activeTab === "feed" ? "rgba(200,241,53,0.1)" : "transparent",
                color: activeTab === "feed" ? "#c8f135" : "#888580",
              }}
            >
              Import Feed
            </button>
          </aside>

          {/* Right Panel Content */}
          <div className="flex-1 w-full min-w-0">
            {activeTab === "feed" ? (
              <div className="space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pt-1">
                  <div>
                    <h3 className="text-lg font-black uppercase tracking-tight text-[#F0EDE8]">
                      Bulk Import & Database Purge
                    </h3>
                    <p className="text-xs text-[#888580]" style={{ fontFamily: '"JetBrains Mono", monospace' }}>
                      Upload participant roster or reset all event claim records
                    </p>
                  </div>
                  
                  <button
                    onClick={handleClearData}
                    disabled={isClearing}
                    className="nx-btn nx-btn-danger nx-btn-sm"
                  >
                    {isClearing ? "Wiping..." : "Wipe All Data"}
                  </button>
                </div>

                {/* CSV Uploader */}
                <div className="nx-card">
                  <form onSubmit={handleUpload} className="space-y-6">
                    <div
                      onDragOver={handleDragOver}
                      onDragLeave={handleDragLeave}
                      onDrop={handleDrop}
                      onClick={() => fileInputRef.current?.click()}
                      className="flex flex-col items-center justify-center p-6 sm:p-12 text-center transition-all cursor-pointer"
                      style={{
                        border: isDragging ? "2px dashed #c8f135" : file ? "2px solid #c8f135" : "2px dashed #2E2C2B",
                        backgroundColor: isDragging ? "rgba(200,241,53,0.05)" : file ? "rgba(200,241,53,0.03)" : "#222120",
                        borderRadius: "4px",
                      }}
                    >
                      <input
                        type="file"
                        ref={fileInputRef}
                        onChange={handleFileChange}
                        accept=".csv,.xlsx,.xls"
                        className="hidden"
                      />

                      <div
                        className="flex h-12 w-12 items-center justify-center rounded mb-4"
                        style={{
                          background: file ? "rgba(200,241,53,0.12)" : "rgba(255,255,255,0.05)",
                          border: `1px solid ${file ? "rgba(200,241,53,0.3)" : "#2E2C2B"}`,
                          color: file ? "#c8f135" : "#888580",
                        }}
                      >
                        {file ? (
                          <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                        ) : (
                          <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                          </svg>
                        )}
                      </div>

                      {file ? (
                        <div>
                          <p className="text-sm font-bold text-[#F0EDE8] max-w-xs truncate mx-auto">{file.name}</p>
                          <p className="text-xs text-[#888580] mt-1" style={{ fontFamily: '"JetBrains Mono", monospace' }}>
                            {(file.size / 1024).toFixed(1)} KB &bull; Ready to synchronize
                          </p>
                        </div>
                      ) : (
                        <div>
                          <p className="text-sm font-bold text-[#F0EDE8]">
                            Drag and drop roster file, or <span style={{ color: "#c8f135" }} className="underline">browse</span>
                          </p>
                          <p className="text-xs text-[#888580] mt-1.5" style={{ fontFamily: '"JetBrains Mono", monospace' }}>
                            Supports CSV, XLSX, and XLS formats (Max 10MB)
                          </p>
                        </div>
                      )}
                    </div>

                    {file && (
                      <div className="flex justify-end gap-3">
                        <button
                          type="button"
                          onClick={() => setFile(null)}
                          className="nx-btn nx-btn-ghost nx-btn-sm"
                        >
                          Clear File
                        </button>
                        <button
                          type="submit"
                          disabled={isLoading}
                          className="nx-btn nx-btn-primary nx-btn-sm"
                        >
                          {isLoading ? "Importing Data..." : "Upload and Sync"}
                        </button>
                      </div>
                    )}
                  </form>
                </div>

                {/* CSV Reference Guide */}
                <div className="nx-card-flat mt-6">
                  <h4
                    className="text-xs font-black uppercase tracking-wider text-[#888580] mb-3"
                    style={{ fontFamily: '"JetBrains Mono", monospace' }}
                  >
                    Expected Column Schema
                  </h4>
                  <p className="text-xs text-[#888580] mb-4">
                    The CSV parser checks headers automatically. Ensure your file contains headers matching these values.
                    <br /><span style={{ color: "#c8f135" }} className="font-bold inline-block mt-1">Role Support:</span> Set the <code className="text-[#c8f135] bg-[#222120] px-1 py-0.5 rounded font-mono">role</code> column to <code className="text-[#F0EDE8]">faculty</code>, <code className="text-[#F0EDE8]">volunteer</code>, or <code className="text-[#F0EDE8]">hod</code> to import staff.
                  </p>
                  <div
                    className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 text-xs"
                    style={{ fontFamily: '"JetBrains Mono", monospace', color: "#c8f135" }}
                  >
                    <div className="p-2 rounded" style={{ background: "#222120", border: "1px solid #2E2C2B" }}>&bull; name (Full Name)</div>
                    <div className="p-2 rounded" style={{ background: "#222120", border: "1px solid #2E2C2B" }}>&bull; email (Unique Email)</div>
                    <div className="p-2 rounded" style={{ background: "#222120", border: "1px solid #2E2C2B" }}>&bull; phone (Optional)</div>
                    <div className="p-2 rounded" style={{ background: "#222120", border: "1px solid #2E2C2B" }}>&bull; team_name (or teamName)</div>
                    <div className="p-2 rounded" style={{ background: "#222120", border: "1px solid #2E2C2B" }}>&bull; team_number (Optional)</div>
                    <div className="p-2 rounded" style={{ background: "#222120", border: "1px solid #2E2C2B" }}>&bull; college (College Name)</div>
                  </div>
                </div>

                {/* Uploaded Success Listing */}
                {successList && (
                  <div className="space-y-4">
                    <div className="flex items-center gap-2 text-[#c8f135]">
                      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                      <h3 className="text-base font-black uppercase tracking-tight">
                        Successfully Imported {successList.length} Records
                      </h3>
                    </div>

                    <div className="nx-table-container hidden sm:block">
                      <table className="nx-table" style={{ minWidth: "680px" }}>
                        <thead>
                          <tr>
                            <th style={{ width: "28%" }}>Name</th>
                            <th style={{ width: "34%" }}>Email</th>
                            <th style={{ width: "22%" }}>Phone</th>
                            <th style={{ width: "16%" }}>Role</th>
                          </tr>
                        </thead>
                        <tbody>
                          {successList.map((p) => (
                            <tr key={p.id}>
                              <td className="font-bold text-[#F0EDE8]">{p.name}</td>
                              <td className="text-[#888580]">{p.email}</td>
                              <td className="text-[#888580]" style={{ fontFamily: 'var(--font-mono, "JetBrains Mono", monospace)' }}>{p.phone || "N/A"}</td>
                              <td>
                                <span className="nx-badge nx-badge-lime">
                                  {p.role}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    <div className="sm:hidden space-y-3">
                      {successList.map((p) => (
                        <div key={p.id} className="nx-card-flat p-4 space-y-2 text-xs">
                          <div className="flex justify-between items-start">
                            <h4 className="font-bold text-[#F0EDE8] text-sm">{p.name}</h4>
                            <span className="nx-badge nx-badge-lime">
                              {p.role}
                            </span>
                          </div>
                          <p className="text-[#888580] truncate"><span className="font-medium text-[#F0EDE8]">Email:</span> {p.email}</p>
                          <p className="text-[#888580]"><span className="font-medium text-[#F0EDE8]">Phone:</span> {p.phone || "N/A"}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              // === Admin Management Tab Content ===
              <div className="space-y-6">
                <div className="flex items-center justify-between pt-1">
                  <h3 className="text-lg font-black uppercase tracking-tight text-[#F0EDE8]">
                    Administrative Access Accounts
                  </h3>
                </div>

                {/* Create Administrator Card */}
                <div className="nx-card">
                  <h4
                    className="text-xs font-black uppercase tracking-wider text-[#888580] mb-4"
                    style={{ fontFamily: '"JetBrains Mono", monospace' }}
                  >
                    Register New Administrator
                  </h4>
                  
                  <form onSubmit={handleCreateAdmin} className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 items-end">
                    <div>
                      <label className="block text-xs font-bold text-[#888580] uppercase mb-1.5" style={{ fontFamily: '"JetBrains Mono", monospace' }}>
                        Operator ID / Username
                      </label>
                      <input
                        type="text"
                        required
                        value={createUsername}
                        onChange={(e) => setCreateUsername(e.target.value)}
                        placeholder="e.g. j_doe"
                        className="nx-input"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-[#888580] uppercase mb-1.5" style={{ fontFamily: '"JetBrains Mono", monospace' }}>
                        Full Name (Optional)
                      </label>
                      <input
                        type="text"
                        value={createName}
                        onChange={(e) => setCreateName(e.target.value)}
                        placeholder="e.g. John Doe"
                        className="nx-input"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-[#888580] uppercase mb-1.5" style={{ fontFamily: '"JetBrains Mono", monospace' }}>
                        Access Level
                      </label>
                      <NexusSelect
                        value={createRole}
                        onChange={setCreateRole}
                        options={[
                          { value: "admin", label: "Administrator" },
                          { value: "volunteer", label: "Volunteer" },
                          ...(admin?.role === "superadmin" ? [{ value: "superadmin", label: "Superadmin" }] : []),
                        ]}
                      />
                    </div>
                    <div className="flex gap-2 items-end">
                      <div className="flex-1">
                        <label className="block text-xs font-bold text-[#888580] uppercase mb-1.5" style={{ fontFamily: '"JetBrains Mono", monospace' }}>
                          Password
                        </label>
                        <input
                          type="password"
                          required
                          value={createPassword}
                          onChange={(e) => setCreatePassword(e.target.value)}
                          placeholder="••••••••"
                          className="nx-input"
                        />
                      </div>
                      <button
                        type="submit"
                        disabled={createLoading}
                        className="nx-btn nx-btn-primary shrink-0 h-[42px] px-5 flex items-center justify-center gap-2 font-bold text-xs uppercase tracking-wider"
                      >
                        {createLoading ? (
                          <>
                            <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-[#111010] border-t-transparent" />
                            <span>Adding...</span>
                          </>
                        ) : (
                          <>
                            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                            </svg>
                            <span>Add User</span>
                          </>
                        )}
                      </button>
                    </div>
                  </form>
                </div>

                {/* Admins Table/List */}
                {adminsLoading ? (
                  <div className="flex justify-center items-center py-12">
                    <div className="flex flex-col items-center gap-2 text-[#888580]">
                      <div
                        className="h-6 w-6 animate-spin rounded-full border-2 border-t-transparent"
                        style={{ borderColor: "#c8f135", borderTopColor: "transparent" }}
                      />
                      <span className="text-xs" style={{ fontFamily: '"JetBrains Mono", monospace' }}>
                        Loading administrative records...
                      </span>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <h4
                      className="text-xs font-black uppercase tracking-wider text-[#888580]"
                      style={{ fontFamily: '"JetBrains Mono", monospace' }}
                    >
                      Active Administrative Credentials
                    </h4>
                    
                    {/* Desktop View Table */}
                    <div className="nx-table-container hidden sm:block">
                      <table className="nx-table" style={{ minWidth: "760px" }}>
                        <thead>
                          <tr>
                            <th style={{ width: "22%", minWidth: "160px" }}>Username</th>
                            <th style={{ width: "22%", minWidth: "160px" }}>Full Name</th>
                            <th style={{ width: "16%", minWidth: "120px" }}>Role</th>
                            <th style={{ width: "18%", minWidth: "130px" }}>Created Date</th>
                            <th style={{ width: "22%", minWidth: "180px", textAlign: "right" }}>Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {adminsList.map((item) => (
                            <tr key={item.id}>
                              <td style={{ verticalAlign: "middle" }}>
                                <div style={{ display: "inline-flex", alignItems: "center", gap: "8px" }}>
                                  <span className="font-bold text-[#F0EDE8]">{item.username}</span>
                                  {item.username === "admin" && (
                                    <span className="nx-badge nx-badge-lime">
                                      Root
                                    </span>
                                  )}
                                </div>
                              </td>
                              <td className="text-[#888580]" style={{ verticalAlign: "middle" }}>
                                {item.name || "N/A"}
                              </td>
                              <td style={{ verticalAlign: "middle" }}>
                                <span className={`nx-badge ${
                                  item.role === 'superadmin' ? 'nx-badge-lime' :
                                  item.role === 'volunteer' ? 'nx-badge-teal' :
                                  'nx-badge-gray'
                                } capitalize`}>
                                  {item.role}
                                </span>
                              </td>
                              <td className="text-[#888580]" style={{ fontFamily: 'var(--font-mono, "JetBrains Mono", monospace)', fontSize: "0.75rem", verticalAlign: "middle" }}>
                                {new Date(item.createdAt).toLocaleDateString()}
                              </td>
                              <td style={{ textAlign: "right", verticalAlign: "middle" }}>
                                {editingAdminId === item.id ? (
                                  <div style={{ display: "inline-flex", alignItems: "center", gap: "8px", justifyContent: "flex-end" }}>
                                    <input
                                      type="password"
                                      value={updatePasswordValue}
                                      onChange={(e) => setUpdatePasswordValue(e.target.value)}
                                      placeholder="New password..."
                                      className="nx-input"
                                      style={{ width: "130px", padding: "4px 8px", fontSize: "0.75rem" }}
                                    />
                                    <button
                                      onClick={() => handleUpdatePassword(item.id, item.username)}
                                      disabled={updateLoading}
                                      className="nx-table-btn nx-table-btn-primary"
                                    >
                                      Save
                                    </button>
                                    <button
                                      onClick={() => {
                                        setEditingAdminId(null);
                                        setUpdatePasswordValue("");
                                      }}
                                      className="nx-table-btn"
                                    >
                                      Cancel
                                    </button>
                                  </div>
                                ) : (
                                  <div style={{ display: "inline-flex", alignItems: "center", gap: "8px", justifyContent: "flex-end" }}>
                                    <button
                                      onClick={() => setEditingAdminId(item.id)}
                                      className="nx-table-btn"
                                    >
                                      Password
                                    </button>
                                    {item.username !== "admin" && admin.username !== item.username && (
                                      <button
                                        onClick={() => handleDeleteAdmin(item.id, item.username)}
                                        className="nx-table-btn nx-table-btn-danger"
                                      >
                                        Delete
                                      </button>
                                    )}
                                  </div>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    {/* Mobile View Card List */}
                    <div className="sm:hidden space-y-3">
                      {adminsList.map((item) => (
                        <div key={item.id} className="nx-card-flat p-4 space-y-3 text-xs">
                          <div className="flex justify-between items-start">
                            <div>
                              <h4 className="font-bold text-[#F0EDE8] text-sm flex items-center gap-1.5">
                                <span>{item.username}</span>
                                {item.username === "admin" && (
                                  <span className="nx-badge nx-badge-lime">
                                    Root
                                  </span>
                                )}
                              </h4>
                              <p className="text-[#888580] text-xs mt-0.5">
                                {item.name || "No Full Name"} • <span className="capitalize">{item.role}</span>
                              </p>
                            </div>
                            <p className="text-[#888580] text-[10px]" style={{ fontFamily: '"JetBrains Mono", monospace' }}>
                              {new Date(item.createdAt).toLocaleDateString()}
                            </p>
                          </div>

                          {editingAdminId === item.id ? (
                            <div className="flex flex-col gap-2 pt-2" style={{ borderTop: "1px solid #2E2C2B" }}>
                              <label className="block text-xs font-bold text-[#888580]">Update Key</label>
                              <div className="flex gap-2">
                                <input
                                  type="password"
                                  value={updatePasswordValue}
                                  onChange={(e) => setUpdatePasswordValue(e.target.value)}
                                  placeholder="New password..."
                                  className="nx-input flex-1"
                                />
                                <button
                                  onClick={() => handleUpdatePassword(item.id, item.username)}
                                  disabled={updateLoading}
                                  className="nx-btn nx-btn-primary nx-btn-sm"
                                >
                                  Save
                                </button>
                                <button
                                  onClick={() => {
                                    setEditingAdminId(null);
                                    setUpdatePasswordValue("");
                                  }}
                                  className="nx-btn nx-btn-ghost nx-btn-sm"
                                >
                                  Cancel
                                </button>
                              </div>
                            </div>
                          ) : (
                            <div className="flex gap-2 justify-end pt-2" style={{ borderTop: "1px solid #2E2C2B" }}>
                              <button
                                onClick={() => setEditingAdminId(item.id)}
                                className="nx-btn nx-btn-outline nx-btn-sm"
                              >
                                Password
                              </button>
                              {item.username !== "admin" && admin.username !== item.username && (
                                <button
                                  onClick={() => handleDeleteAdmin(item.id, item.username)}
                                  className="nx-btn nx-btn-danger nx-btn-sm"
                                >
                                  Delete
                                </button>
                              )}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>

                  </div>
                )}

              </div>
            )}
          </div>
        </div>

      </main>
    </div>
  );
}
