"use client";

import type React from "react";

interface UserProfileLayoutProps {
  children: React.ReactNode;
}

export default function UserProfileLayout({
  children,
}: UserProfileLayoutProps) {
  return (
    <div className="bg-zinc-50 dark:bg-zinc-950 min-h-screen">
      <div className="h-screen">{children}</div>
    </div>
  );
}
