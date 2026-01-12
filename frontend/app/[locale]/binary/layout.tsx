import { ReactNode } from "react";

export default function BinaryLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen-mobile h-screen-mobile bg-zinc-950 dark:bg-zinc-950 overflow-hidden">
      {children}
    </div>
  );
}
