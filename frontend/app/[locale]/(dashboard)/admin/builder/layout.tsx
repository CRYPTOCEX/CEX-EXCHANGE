import type React from "react";
import "./components/settings-panel/animations.css";
import "./components/settings-panel/styles.css";
import "./components/settings-panel/text-alignment.css";
import "./styles/global.css";

export default function BuilderLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <div className="min-h-screen overflow-y-auto">{children}</div>;
}
