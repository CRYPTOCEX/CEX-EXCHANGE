"use client";

import React, { ReactNode } from "react";
import { usePathname } from "@/i18n/routing";
import DashBoardLayoutProvider from "@/provider/dashboard.provider";

interface ConditionalLayoutProviderProps {
  children: ReactNode;
}

const ConditionalLayoutProvider = ({
  children,
}: ConditionalLayoutProviderProps) => {
  const pathname = usePathname();

  // List of all (ext) route prefixes that have their own layouts
  const extRoutes = [
    "/forex",
    "/ico",
    "/staking",
    "/p2p",
    "/affiliate",
    "/ecommerce",
    "/faq",
  ];

  // Check if current path is in the (ext) route group
  // These routes have their own layouts and should not use DashBoardLayoutProvider
  const isExtRoute = extRoutes.some((route) => pathname.startsWith(route));

  // If it's an (ext) route, just return children without DashBoardLayoutProvider
  // This allows the individual (ext) layouts to take full control
  if (isExtRoute) {
    return <>{children}</>;
  }

  // For all other routes, use DashBoardLayoutProvider with isGuest=true
  // Individual route groups like (dashboard) will override this in their own layouts
  return (
    <DashBoardLayoutProvider isGuest={true}>{children}</DashBoardLayoutProvider>
  );
};

export default ConditionalLayoutProvider;
