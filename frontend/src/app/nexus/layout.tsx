import "./nexus.css";
import Navbar from "./components/Navbar";
import AuthGuard from "./components/AuthGuard";
import React from "react";

export default function NexusLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-col min-h-screen nx-admin-root" style={{ backgroundColor: "#111010" }}>
      <AuthGuard>
        <Navbar />
        <main className="flex-1 nx-content">
          {children}
        </main>
      </AuthGuard>
    </div>
  );
}

