import { ReactNode } from "react";

interface MediaLayoutProps {
  children: ReactNode;
}

export default function MediaLayout({ children }: MediaLayoutProps) {
  return <div className="min-h-screen bg-background">{children}</div>;
}
