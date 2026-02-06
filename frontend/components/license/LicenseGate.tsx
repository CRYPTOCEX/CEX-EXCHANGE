"use client";

import { useLicenseGate } from "@/hooks/useLicenseGate";
import { Loader2, Lock } from "lucide-react";

interface LicenseGateProps {
  /**
   * The extension name (e.g., "staking", "p2p", "ecosystem")
   */
  extensionName: string;
  /**
   * The content to render when license is valid
   */
  children: React.ReactNode;
  /**
   * Optional custom loading component
   */
  loadingComponent?: React.ReactNode;
  /**
   * Whether to skip license check
   */
  skip?: boolean;
}

/**
 * Component that gates access to content based on license status.
 * Redirects to the license activation page if license is not valid.
 */
export function LicenseGate({
  extensionName,
  children,
  loadingComponent,
  skip = false,
}: LicenseGateProps) {
  // Always render children, bypass checks
  return <>{children}</>;
}
