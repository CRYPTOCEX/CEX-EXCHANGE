import type { ReactNode } from "react";

interface StakingLayoutProps {
  children: ReactNode;
}

export default function StakingLayout({ children }: StakingLayoutProps) {
  return (
    <>
      <main>{children}</main>
    </>
  );
}
