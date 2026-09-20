"use client";

import type React from "react";

interface UserProfileLayoutProps {
  children: React.ReactNode;
}

export default function UserProfileLayout({
  children,
}: UserProfileLayoutProps) {
  return (
    <div className="bg-background min-h-screen">
      {/* Noise texture overlay for premium feel */}
      <div
        className="fixed inset-0 opacity-[0.015] pointer-events-none z-0"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
        }}
      />

      {/* Main content.
          `<main>`, not a `<div>`. This route had NO main landmark at all —
          measured in the browser, not read off the source — so there was no
          "skip to main content" target on the account screen, and any audit
          scoped to `main` silently fell back to `document.body`, i.e. the
          navigation bar and the footer, which are identical on every route.
          The classes are the div's own, so the layout is unchanged. */}
      <main className="relative z-10 h-screen">{children}</main>
    </div>
  );
}
