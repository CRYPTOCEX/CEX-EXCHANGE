import type React from "react";
// settings-panel/animations.css is gone: 3 of its 7 keyframes (bounce, pulse,
// shake) were divergent redefinitions of names app/globals.css owns, and the
// other 4 (fade, slide, flip, zoom) had no consumer anywhere in the tree — the
// builder's animation picker only emits the 18 names globals.css defines, and
// the `animation="fade|slide|zoom|flip"` props on Stepper are framer-motion
// variants, not CSS animation-names.
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
