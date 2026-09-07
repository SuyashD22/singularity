"use client";

import React, { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import Image from "next/image";

export default function Navbar() {
  const router = useRouter();
  const pathname = usePathname();
  const [admin, setAdmin] = useState<{ name?: string; username?: string; role?: string } | null>(null);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [scrolled, setScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    const profile = localStorage.getItem("admin_profile");
    if (profile) {
      try {
        setAdmin(JSON.parse(profile));
      } catch (e) {
        console.error("Failed to parse admin profile", e);
      }
    }
  }, []);

  const handleLogout = () => {
    localStorage.removeItem("admin_token");
    localStorage.removeItem("admin_profile");
    router.push("/nexus/login");
  };

  if (pathname === "/nexus/login") {
    return null;
  }

  const isVolunteer = admin?.role === 'volunteer';

  const navLinks = [
    ...(!isVolunteer ? [{ label: "Console", href: "/nexus" }] : []),
    { label: "Registration", href: "/nexus/registration" },
    { label: "Scanner", href: "/nexus/scanner" },
    { label: "Claims", href: "/nexus/claims" },
    ...(!isVolunteer ? [
      { label: "Countdown", href: "/nexus/countdown" },
      { label: "Settings", href: "/nexus/settings" },
    ] : []),
  ];

  const roleBadgeStyle = (role?: string) => {
    if (role === "superadmin") return { bg: "rgba(200,241,53,0.12)", color: "#c8f135", border: "rgba(200,241,53,0.3)" };
    if (role === "volunteer") return { bg: "rgba(45,212,191,0.12)", color: "#2dd4bf", border: "rgba(45,212,191,0.3)" };
    return { bg: "rgba(255,255,255,0.06)", color: "#888580", border: "#2E2C2B" };
  };
  const rb = roleBadgeStyle(admin?.role);

  return (
    <>
      <header
        className="nx-navbar"
        style={{
          position: "sticky",
          top: 0,
          left: 0,
          right: 0,
          width: "100%",
          zIndex: 50,
          background: "#050505",
          borderBottom: "1px solid #c8f135",
          boxShadow: "0 4px 24px rgba(200, 241, 53, 0.12)",
          transition: "all 0.3s ease",
        }}
      >
        {/* Subtle Singularity grid overlay */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            backgroundImage: `linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px)`,
            backgroundSize: "20px 20px",
            pointerEvents: "none",
            zIndex: 0,
            opacity: 0.5,
          }}
        />

        <div
          style={{
            position: "relative",
            zIndex: 1,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "0 40px",
            height: "70px",
            maxWidth: "1400px",
            margin: "0 auto",
          }}
        >
          {/* Logo Brand matching Singularity navbar */}
          <div
            onClick={() => router.push(isVolunteer ? "/nexus/scanner" : "/nexus")}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              cursor: "pointer",
              userSelect: "none",
              flex: 1,
            }}
          >
            <Image
              src="/logo.webp"
              alt="Singularity"
              width={40}
              height={40}
              style={{ objectFit: "contain", borderRadius: "6px" }}
              draggable={false}
            />
            <span
              style={{
                fontFamily: 'var(--font-jetbrains), "JetBrains Mono", monospace',
                fontSize: "1.1rem",
                fontWeight: 900,
                letterSpacing: "0.05em",
                color: "#F0EDE8",
                textTransform: "uppercase",
              }}
            >
              SINGULARITY
            </span>
          </div>

          {/* Desktop Navigation Links — exact Singularity navbar typography & hover */}
          <nav
            className="hidden lg:flex items-center"
            style={{
              gap: "32px",
              listStyle: "none",
              flex: 2,
              justifyContent: "center",
            }}
          >
            {navLinks.map((item) => {
              const isActive = pathname === item.href;
              return (
                <button
                  key={item.href}
                  onClick={() => router.push(item.href)}
                  className={`nx-nav-link ${isActive ? "nx-nav-link-active" : ""}`}
                >
                  {item.label}
                </button>
              );
            })}
          </nav>

          {/* Right Actions: Admin Info & Polygon Sign Out Button */}
          <div style={{ display: "flex", alignItems: "center", gap: "24px", flex: 1, justifyContent: "flex-end" }}>
            {admin && (
              <div className="hidden sm:block" style={{ textAlign: "right" }}>
                <p
                  style={{
                    fontSize: "0.75rem",
                    fontWeight: 800,
                    color: "#F0EDE8",
                    margin: 0,
                    fontFamily: 'var(--font-jetbrains), "JetBrains Mono", monospace',
                  }}
                >
                  {admin.name || admin.username || "Admin"}
                </p>
                <span
                  style={{
                    fontSize: "0.6rem",
                    fontWeight: 800,
                    letterSpacing: "0.1em",
                    textTransform: "uppercase",
                    padding: "2px 7px",
                    borderRadius: "2px",
                    background: rb.bg,
                    color: rb.color,
                    border: `1px solid ${rb.border}`,
                    display: "inline-block",
                    fontFamily: 'var(--font-jetbrains), "JetBrains Mono", monospace',
                    marginTop: "2px",
                  }}
                >
                  {admin.role || "Admin"}
                </span>
              </div>
            )}

            {/* Desktop Sign Out Button matching Singularity registerBtn */}
            <button
              onClick={handleLogout}
              className="hidden lg:inline-flex items-center gap-2"
              style={{
                fontFamily: 'var(--font-jetbrains), "JetBrains Mono", monospace',
                fontSize: "0.85rem",
                fontWeight: 800,
                letterSpacing: "0.15em",
                textTransform: "uppercase",
                color: "#c8f135",
                background: "rgba(200, 241, 53, 0.04)",
                border: "1px solid rgba(200, 241, 53, 0.45)",
                padding: "10px 22px",
                whiteSpace: "nowrap",
                cursor: "pointer",
                clipPath: "polygon(10px 0, 100% 0, 100% calc(100% - 10px), calc(100% - 10px) 100%, 0 100%, 0 10px)",
                transition: "border-color 0.25s ease, background 0.25s ease, box-shadow 0.25s ease",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = "#c8f135";
                e.currentTarget.style.background = "rgba(200, 241, 53, 0.09)";
                e.currentTarget.style.boxShadow = "0 0 20px rgba(200, 241, 53, 0.25)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = "rgba(200, 241, 53, 0.45)";
                e.currentTarget.style.background = "rgba(200, 241, 53, 0.04)";
                e.currentTarget.style.boxShadow = "none";
              }}
            >
              <span>SIGN OUT</span>
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
            </button>

            {/* Mobile Hamburger Button — only visible on mobile (<lg) */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              aria-label="Toggle menu"
              aria-expanded={mobileMenuOpen}
              className="flex lg:hidden"
              style={{
                alignItems: "center",
                justifyContent: "center",
                width: "40px",
                height: "40px",
                background: mobileMenuOpen ? "rgba(200,241,53,0.09)" : "rgba(200,241,53,0.04)",
                border: mobileMenuOpen ? "1px solid #c8f135" : "1px solid rgba(200,241,53,0.4)",
                cursor: "pointer",
                padding: 0,
                flexShrink: 0,
                clipPath: "polygon(7px 0, 100% 0, 100% calc(100% - 7px), calc(100% - 7px) 100%, 0 100%, 0 7px)",
                transition: "border-color 0.3s ease, background 0.3s ease",
              }}
            >
              {/* Animated hamburger icon */}
              <span style={{ position: "relative", width: "18px", height: "12px", display: "block" }}>
                <span style={{
                  position: "absolute", left: 0, width: "100%", height: "2px",
                  background: "#c8f135",
                  top: mobileMenuOpen ? "50%" : "0",
                  transform: mobileMenuOpen ? "translateY(-50%) rotate(45deg)" : "none",
                  transition: "top 0.3s ease, transform 0.3s ease",
                }} />
                <span style={{
                  position: "absolute", left: 0, width: "100%", height: "2px",
                  background: "#c8f135",
                  top: "50%", transform: "translateY(-50%)",
                  opacity: mobileMenuOpen ? 0 : 1,
                  transition: "opacity 0.3s ease, transform 0.3s ease",
                }} />
                <span style={{
                  position: "absolute", left: 0, width: "100%", height: "2px",
                  background: "#c8f135",
                  top: mobileMenuOpen ? "50%" : "100%",
                  transform: mobileMenuOpen ? "translateY(-50%) rotate(-45deg)" : "translateY(-100%)",
                  transition: "top 0.3s ease, transform 0.3s ease",
                }} />
              </span>
            </button>
          </div>
        </div>
      </header>

      {/* Mobile Full-Screen Navigation Overlay — sibling of header to avoid backdrop-filter stacking context */}
      <div
        className="lg:hidden nx-mobile-menu"
        style={{
          display: "block",
          position: "fixed",
          inset: 0,
          zIndex: 49,
          background: "rgba(5,5,5,0.98)",
          backdropFilter: "blur(20px)",
          WebkitBackdropFilter: "blur(20px)",
          opacity: mobileMenuOpen ? 1 : 0,
          visibility: mobileMenuOpen ? "visible" : "hidden",
          overflowY: "auto",
          transition: "opacity 0.4s ease, visibility 0.4s ease",
        }}
      >
        <div style={{
          minHeight: "100vh",
          display: "flex",
          flexDirection: "column",
          padding: "80px 24px 28px",
        }}>
          <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "flex-start", paddingTop: "10px" }}>
            {/* Nav Links List */}
            <ul style={{ listStyle: "none", display: "flex", flexDirection: "column", padding: 0, margin: 0 }}>
              {navLinks.map((item, i) => {
                const isActive = pathname === item.href;
                return (
                  <li
                    key={item.href}
                    style={{
                      borderBottom: "1px solid rgba(255,255,255,0.06)",
                      opacity: mobileMenuOpen ? 1 : 0,
                      transform: mobileMenuOpen ? "translateY(0)" : "translateY(14px)",
                      transition: `opacity 0.45s ease ${80 + i * 55}ms, transform 0.45s ease ${80 + i * 55}ms`,
                    }}
                  >
                    <button
                      onClick={() => { router.push(item.href); setMobileMenuOpen(false); }}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "18px",
                        padding: "18px 4px",
                        width: "100%",
                        background: "transparent",
                        border: "none",
                        cursor: "pointer",
                        fontFamily: 'var(--font-mono, "JetBrains Mono", monospace)',
                        textTransform: "uppercase",
                        color: isActive ? "#c8f135" : "#F0EDE8",
                        transition: "color 0.25s ease, padding-left 0.25s ease",
                        textAlign: "left",
                      }}
                      onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.color = "#c8f135"; (e.currentTarget as HTMLButtonElement).style.paddingLeft = "14px"; }}
                      onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.color = isActive ? "#c8f135" : "#F0EDE8"; (e.currentTarget as HTMLButtonElement).style.paddingLeft = "4px"; }}
                    >
                      <span style={{
                        flex: 1,
                        fontSize: "1.4rem",
                        fontWeight: 900,
                        letterSpacing: "0.12em",
                        fontFamily: 'var(--font-mono, "JetBrains Mono", monospace)',
                      }}>{item.label}</span>
                      <span style={{
                        fontSize: "1rem",
                        color: "#c8f135",
                        opacity: isActive ? 1 : 0,
                        transform: isActive ? "translateX(0)" : "translateX(-6px)",
                        transition: "opacity 0.25s ease, transform 0.25s ease",
                      }}>→</span>
                    </button>
                  </li>
                );
              })}
            </ul>

            {/* Sign Out CTA */}
            <button
              onClick={() => { setMobileMenuOpen(false); handleLogout(); }}
              style={{
                position: "relative",
                alignSelf: "stretch",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "12px",
                marginTop: "40px",
                fontFamily: 'var(--font-mono, "JetBrains Mono", monospace)',
                fontSize: "1.1rem",
                fontWeight: 900,
                letterSpacing: "0.14em",
                textTransform: "uppercase",
                color: "#050505",
                background: "#c8f135",
                border: "1px solid #c8f135",
                padding: "22px 22px",
                cursor: "pointer",
                clipPath: "polygon(12px 0, 100% 0, 100% calc(100% - 12px), calc(100% - 12px) 100%, 0 100%, 0 12px)",
                boxShadow: "0 0 24px rgba(200,241,53,0.25)",
                overflow: "hidden",
                opacity: mobileMenuOpen ? 1 : 0,
                transform: mobileMenuOpen ? "translateY(0)" : "translateY(14px)",
                transition: `opacity 0.45s ease ${140 + navLinks.length * 55}ms, transform 0.45s ease ${140 + navLinks.length * 55}ms, background 0.25s ease, box-shadow 0.25s ease`,
              }}
              onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = "#d4ff50"; (e.currentTarget as HTMLButtonElement).style.boxShadow = "0 0 32px rgba(200,241,53,0.4)"; }}
              onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = "#c8f135"; (e.currentTarget as HTMLButtonElement).style.boxShadow = "0 0 24px rgba(200,241,53,0.25)"; }}
            >
              SIGN OUT
            </button>
          </div>

          {/* Footer */}
          <div style={{
            marginTop: "auto",
            paddingTop: "20px",
            borderTop: "1px solid rgba(255,255,255,0.06)",
            fontFamily: 'var(--font-mono, "JetBrains Mono", monospace)',
            fontSize: "0.6rem",
            letterSpacing: "0.3em",
            color: "#888580",
            opacity: 0.5,
          }}>
            SYSTEM&nbsp;//&nbsp;NAVIGATION
          </div>
        </div>
      </div>
    </>
  );
}
