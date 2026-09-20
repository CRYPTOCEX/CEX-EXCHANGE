"use client";

import { m } from "framer-motion";
import { Badge } from "@/components/ui/badge";
import { TagConfig } from "../types";

interface HeroTagProps {
  config: TagConfig;
  theme?: {
    primary?: string;
    secondary?: string;
  };
  animate?: boolean;
}

/**
 * Hero tag styling.
 *
 * Every named theme resolves to the accent. A hero eyebrow announces a page —
 * it is not reporting a state — so the status tokens have no business here
 * (DESIGN-SYSTEM.md R2), and the `green`/`emerald`/`red`/`orange` entries were
 * a leftover of the old per-extension identity hues.
 *
 * That mattered for more than tidiness: `text-success` on a 10% success tint
 * measures 2.81:1 in LIGHT mode, and the browser gate caught exactly that on
 * the /forex hero ("Professional Forex Investment Platform", 2.80:1). The
 * reserved status tokens are tuned to sit on a NEUTRAL ground with an icon
 * beside them, not to be small text on a wash of themselves.
 *
 * The names are kept because roughly a dozen call sites pass one of them as a
 * string; what changes is that picking one no longer repaints the page.
 *
 * `primary` previously pointed at `--primary-rgb`, a variable this codebase
 * never defines, so it silently fell back to the hardcoded teal 20,184,166 —
 * the pre-Obsidian brand colour, still shipping.
 */
const ACCENT_TAG = {
  bg: "hsl(var(--primary) / 0.1)",
  border: "hsl(var(--primary) / 0.2)",
  text: "hsl(var(--primary))",
};

const colorMap: Record<string, { bg: string; border: string; text: string }> = {
  primary: ACCENT_TAG,
  teal: ACCENT_TAG,
  cyan: ACCENT_TAG,
  blue: ACCENT_TAG,
  purple: ACCENT_TAG,
  pink: ACCENT_TAG,
  red: ACCENT_TAG,
  orange: ACCENT_TAG,
  green: ACCENT_TAG,
  emerald: ACCENT_TAG,
  indigo: ACCENT_TAG,
  violet: ACCENT_TAG,
};

export default function HeroTag({
  config,
  theme = { primary: "primary" },
  animate = true,
}: HeroTagProps) {
  const { text, icon: Icon, className } = config;
  const colors = colorMap[theme.primary || "primary"] || colorMap.teal;

  const content = (
    <Badge
      className={className || "px-4 py-2 backdrop-blur-sm pointer-events-none"}
      style={
        !className
          ? {
              backgroundColor: colors.bg,
              borderColor: colors.border,
              color: colors.text,
            }
          : undefined
      }
    >
      {Icon && <Icon className="w-4 h-4 mr-2" />}
      {text}
    </Badge>
  );

  if (!animate) return <div className="mb-2">{content}</div>;

  return (
    <m.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="mb-2"
    >
      {content}
    </m.div>
  );
}
