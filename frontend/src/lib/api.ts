import axios from "axios";

/**
 * Returns the base API URL for the backend.
 * Priority:
 *  1. NEXT_PUBLIC_API_URL env var (set this in production)
 *  2. Dynamically resolved from browser hostname (for local-network devices)
 *  3. Fallback to http://localhost:3001
 */
export function getApiBaseUrl(): string {
  let url = process.env.NEXT_PUBLIC_API_URL;
  if (url) {
    url = url.replace(/\/$/, "");
    // If NEXT_PUBLIC_API_URL is configured with https://localhost or https://127.0.0.1,
    // normalize to http:// since local Node.js backend listens on plain HTTP
    if (/^https:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/i.test(url)) {
      url = url.replace(/^https:/i, "http:");
    }
    return url;
  }
  if (typeof window !== "undefined" && window.location.hostname) {
    return `${window.location.protocol}//${window.location.hostname}:3001`;
  }
  return "http://localhost:3001";
}

/** Returns the stored admin role ('superadmin' | 'admin' | 'volunteer') or null if not logged in. */
export function getAdminRole(): string | null {
  if (typeof window === "undefined") return null;
  const profile = localStorage.getItem("admin_profile");
  if (!profile) return null;
  try {
    return JSON.parse(profile)?.role || null;
  } catch {
    return null;
  }
}

const rawBaseUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";
const normalizedBaseUrl = /^https:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/i.test(rawBaseUrl.replace(/\/$/, ""))
  ? rawBaseUrl.replace(/\/$/, "").replace(/^https:/i, "http:")
  : rawBaseUrl;

const api = axios.create({
  baseURL: normalizedBaseUrl,
  headers: { "Content-Type": "application/json" },
});

export interface RegistrationPayload {
  full_name: string;
  email: string;
  phone: string;
  college: string;
  year_of_study: string;
  team_name?: string;
  team_size: number;
  is_team_lead: boolean;
  team_lead_email?: string;
  track: string;
  experience_level: string;
  project_idea?: string;
}

export const submitRegistration = (data: RegistrationPayload) =>
  api.post("/api/registrations/", data).then((r) => r.data);

export const fetchEventInfo = () =>
  api.get("/api/event-info").then((r) => r.data);

export const fetchFAQ = () =>
  api.get("/api/faq/").then((r) => r.data);

export const fetchStats = () =>
  api.get("/api/registrations/stats").then((r) => r.data);

export interface CountdownState {
  isDisplayed: boolean;
  isStarted: boolean;
  startedAt: string | null;
  updatedAt: string;
  serverTime?: string;
}

export const fetchCountdownState = async (): Promise<CountdownState> => {
  const API_BASE = getApiBaseUrl();
  const res = await fetch(`${API_BASE}/api/countdown`, { cache: 'no-store' });
  if (!res.ok) throw new Error("Failed to fetch countdown state");
  return res.json();
};

export const toggleCountdownDisplay = async (token: string) => {
  const API_BASE = getApiBaseUrl();
  const res = await fetch(`${API_BASE}/api/countdown/display`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`
    }
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || "Failed to enable countdown display");
  }
  return res.json();
};

export const triggerCountdownStart = async (token: string) => {
  const API_BASE = getApiBaseUrl();
  const res = await fetch(`${API_BASE}/api/countdown/start`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`
    }
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || "Failed to start countdown");
  }
  return res.json();
};

export const removeCountdown = async (token: string) => {
  const API_BASE = getApiBaseUrl();
  const res = await fetch(`${API_BASE}/api/countdown/remove`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`
    }
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || "Failed to remove countdown");
  }
  return res.json();
};

export const resetCountdownState = async (token: string) => {
  const API_BASE = getApiBaseUrl();
  const res = await fetch(`${API_BASE}/api/countdown/reset`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`
    }
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || "Failed to reset countdown");
  }
  return res.json();
};

export default api;

