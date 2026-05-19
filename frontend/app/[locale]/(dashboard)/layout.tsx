import React from "react";
import DashBoardLayoutProvider from "@/provider/dashboard.provider";

interface DashboardLayoutProps {
  children: React.ReactNode;
}

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  // Override guest mode for dashboard routes - show admin header/sidebar
  return (
    <DashBoardLayoutProvider isGuest={false}>
      {children}
    </DashBoardLayoutProvider>
  );
}
