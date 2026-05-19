import { ReactNode } from "react";

interface DefaultEditorLayoutProps {
  children: ReactNode;
}

export default function DefaultEditorLayout({
  children,
}: DefaultEditorLayoutProps) {
  return (
    <div className="min-h-screen bg-background">
      {children}
    </div>
  );
} 