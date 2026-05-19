"use client";

import type React from "react";

interface UserProfileLayoutProps {
  children: React.ReactNode;
}

export default function UserProfileLayout({
  children,
}: UserProfileLayoutProps) {
  return (
    <div className="bg-zinc-950 min-h-screen">
      {/* Noise texture overlay for premium feel */}
      <div
        className="fixed inset-0 opacity-[0.015] pointer-events-none z-0"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
        }}
      />

      {/* Main content */}
      <div className="relative z-10 h-screen">{children}</div>
    </div>
  );
}
