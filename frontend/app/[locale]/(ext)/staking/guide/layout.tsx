import type { ReactNode } from "react";

interface StakingLayoutProps {
  children: ReactNode;
}

export default function StakingLayout({ children }: StakingLayoutProps) {
  return (
    <>
      <main className="container px-4 md:px-6 py-12">{children}</main>
    </>
  );
}
