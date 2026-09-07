import type { Metadata, Viewport } from "next";
import React from "react";
import { Geist, Geist_Mono, Bebas_Neue, Space_Grotesk, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { getSiteUrl } from "@/lib/site";

const siteName = "Singularity 2026";
const siteUrl = getSiteUrl();

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const bebasNeue = Bebas_Neue({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-bebas",
  display: "swap",
});

const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-space-grotesk",
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  weight: ["400", "700", "800"],
  variable: "--font-jetbrains",
  display: "swap",
});

// Viewport must be exported separately in the App Router — NOT inside `metadata`.
// Without this, real mobile browsers render at ~980px desktop width then scale down,
// which breaks layouts. DevTools emulation injects its own viewport so it masks the bug.
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
  themeColor: "#c8f135",
};

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "Singularity 2026 | National-Level Hackathon at AJIET, Mangalore",
    template: "%s | Singularity 2026",
  },
  description:
    "Singularity 2026 is a 24-hour national-level inter-college hackathon hosted by A J Institute of Engineering and Technology (AJIET), Mangalore. Join the ultimate coding competition to build, compete, and connect on Oct 8-9, 2026.",
  alternates: {
    canonical: "/",
  },

  keywords: [
    "Hackathon",
    "AJIET Hackathon",
    "Singularity AJIET 2026",
    "2026 AJIET Hackathon",
    "AJIET Hackathon Mangalore",
    "Singularity Hackathon",
    "Singularity 2026",
    "A J Institute of Engineering and Technology",
    "A J Institute of Engineering and Technology Hackathon",
    "AJIET Mangalore",
    "Inter-college hackathon",
    "National-Level hackathon",
    "24-hour hackathon",
    "Tech competition",
    "Student innovation",
    "Hackathon registration",
  ],
  
  applicationName: siteName,
  category: "technology",
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
      "max-video-preview": -1,
    },
  },

  icons: {
    icon: [
      { url: '/favicon-48x48.png', sizes: '48x48', type: 'image/png' },
      { url: '/favicon-192x192.png', sizes: '192x192', type: 'image/png' },
      { url: '/icon-512x512.png', sizes: '512x512', type: 'image/png' },
    ],
    apple: [
      { url: '/apple-touch-icon.png', sizes: '180x180', type: 'image/png' },
    ],
  },

  openGraph: {
    title: "Singularity 2026 | National-Level Hackathon at AJIET",
    description: "24 hours. 3 tracks. Hosted by A J Institute of Engineering and Technology (AJIET), Mangalore. Join the ultimate inter-college hackathon.",
    type: "website",
    url: siteUrl,
    siteName,
    locale: "en_IN",
    images: [
      {
        url: `${siteUrl}/og.png`,
        width: 1200,
        height: 630,
        alt: "Singularity 2026 Hackathon",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Singularity 2026 | National-Level Hackathon at AJIET",
    description: "24 hours. 3 tracks. Hosted by A J Institute of Engineering and Technology (AJIET), Mangalore. Join the ultimate inter-college hackathon.",
    images: [`${siteUrl}/og.png`],
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable} ${bebasNeue.variable} ${spaceGrotesk.variable} ${jetbrainsMono.variable} antialiased`}>
      <head>
        <link rel="manifest" href="/manifest.json" />
      </head>
      <body className="bg-black text-white font-sans">
        {/* Global dot-grid background — visible site-wide */}
        <div
          aria-hidden="true"
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 0,
            pointerEvents: "none",
            backgroundImage: `radial-gradient(circle, rgba(200,241,53,0.08) 1px, transparent 1px)`,
            backgroundSize: "40px 40px",
          }}
        />
        <div style={{ position: "relative", zIndex: 1 }}>
          {children}
        </div>
      </body>
    </html>
  );
}
