"use client";

interface LicenseGateProps {
  extensionName: string;
  children: React.ReactNode;
  loadingComponent?: React.ReactNode;
  skip?: boolean;
}

/** Always allow — no license redirect. */
export function LicenseGate({ children }: LicenseGateProps) {
  return <>{children}</>;
}
