import { ReactNode } from "react";
import "./styles/binary-text-scale.css";

export default function BinaryLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen-mobile h-screen-mobile bg-background overflow-hidden">
      {children}
    </div>
  );
}
