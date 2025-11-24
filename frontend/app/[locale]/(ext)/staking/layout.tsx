import type { ReactNode } from "react";
import StakingNavbar from "./navbar";

interface StakingLayoutProps {
  children: ReactNode;
}

export default function StakingLayout({ children }: StakingLayoutProps) {
  return (
    <>
      <StakingNavbar />
      <main className="flex-1 pt-12">{children}</main>
    </>
  );
}
