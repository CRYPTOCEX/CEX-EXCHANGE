"use client";

/**
 * Live status illustration for a supervised Hummingbot instance.
 *
 * This is not decoration. A market maker's card is otherwise a wall of numbers,
 * and the two things an operator scans for — "is it quoting?" and "is it about
 * to be killed?" — are exactly the two that read poorly as text. So the art is
 * driven entirely by real state: the quote ladders only move while the process
 * is actually RUNNING, the ring arc is real memory against the real cap, and a
 * CRASHED instance visibly breaks rather than just turning red.
 *
 * Conventions follow components/landing/art:
 *  - Every colour is a token (`hsl(var(--…))`), so it themes light/dark and
 *    follows the operator's brand hue. No literal hex.
 *  - Gradient/filter ids are per-instance via useId(). Two cards on one page
 *    with a hardcoded id means the second definition wins for both.
 *  - Motion is disabled under prefers-reduced-motion, and anything that would
 *    park invisible (a dasharray draw) is reset so the shape still reads.
 */

import { useId } from "react";
import { cn } from "@/lib/utils";

export type HbInstanceArtStatus =
  | "STOPPED"
  | "STARTING"
  | "RUNNING"
  | "STOPPING"
  | "CRASHED";

const ART_CSS = `
@keyframes hbart-quote{0%,100%{transform:scaleX(.55)}50%{transform:scaleX(1)}}
@keyframes hbart-core{0%,100%{transform:scale(1);opacity:1}50%{transform:scale(1.09);opacity:.82}}
@keyframes hbart-halo{0%{transform:scale(.7);opacity:.5}100%{transform:scale(1.45);opacity:0}}
@keyframes hbart-spin{to{transform:rotate(360deg)}}
@keyframes hbart-drift{0%{transform:translateY(0)}100%{transform:translateY(-10px)}}
@keyframes hbart-flicker{0%,100%{opacity:1}45%{opacity:.35}55%{opacity:.9}}
.hbart-q{transform-box:fill-box;transform-origin:left center;animation:hbart-quote 2.6s ease-in-out infinite}
.hbart-q-r{transform-origin:right center}
.hbart-core{transform-box:fill-box;transform-origin:center;animation:hbart-core 2.8s ease-in-out infinite}
.hbart-halo{transform-box:fill-box;transform-origin:center;animation:hbart-halo 2.8s ease-out infinite}
.hbart-spin{transform-box:fill-box;transform-origin:center;animation:hbart-spin 2.4s linear infinite}
.hbart-drift{animation:hbart-drift 2.2s ease-in infinite}
.hbart-flicker{animation:hbart-flicker 1.6s ease-in-out infinite}
@media (prefers-reduced-motion:reduce){
  .hbart-q,.hbart-core,.hbart-halo,.hbart-spin,.hbart-drift,.hbart-flicker{animation:none}
  /* The halo only exists mid-animation; parked it would be a stray disc. */
  .hbart-halo{opacity:0}
  /* Ladders animate from a compressed scale — reset or they read as stubs. */
  .hbart-q{transform:scaleX(1)}
}
`;

/** Token driving each state's accent. Matches the status chips on the card. */
const ACCENT: Record<HbInstanceArtStatus, string> = {
  RUNNING: "var(--success)",
  STARTING: "var(--primary)",
  STOPPING: "var(--warning)",
  STOPPED: "var(--muted-foreground)",
  CRASHED: "var(--destructive)",
};

/** Bid/ask rungs. Widths are a fixed profile so cards look consistent. */
const RUNGS = [
  { y: 30, w: 20 },
  { y: 42, w: 27 },
  { y: 54, w: 16 },
  { y: 66, w: 24 },
  { y: 78, w: 13 },
];

export interface HbInstanceArtProps {
  status: HbInstanceArtStatus;
  /** Resident memory in MB, when known. Linux only — null elsewhere. */
  rssMb?: number | null;
  /** Configured ceiling, used as the ring's full sweep. */
  memoryLimitMb?: number;
  /** Drawn as a faint counter so a long-lived bot looks settled. */
  uptimeMs?: number | null;
  className?: string;
}

export function HbInstanceArt({
  status,
  rssMb,
  memoryLimitMb = 1536,
  uptimeMs,
  className,
}: HbInstanceArtProps) {
  const uid = useId().replace(/[^a-zA-Z0-9]/g, "");
  const glowId = `hbart-glow-${uid}`;
  const accent = ACCENT[status];

  const live = status === "RUNNING";
  const starting = status === "STARTING";
  const crashed = status === "CRASHED";
  const stopping = status === "STOPPING";
  const dormant = status === "STOPPED";

  // Memory ring. Unknown usage draws no arc at all rather than implying zero —
  // on Windows rss is genuinely unavailable and a full-looking ring would lie.
  const R = 44;
  const CIRC = 2 * Math.PI * R;
  const ratio =
    typeof rssMb === "number" && memoryLimitMb > 0
      ? Math.max(0, Math.min(1, rssMb / memoryLimitMb))
      : null;
  const near = ratio !== null && ratio > 0.85;

  const label =
    `Instance ${status.toLowerCase()}` +
    (ratio !== null ? `, using ${Math.round(ratio * 100)}% of its memory limit` : "") +
    (uptimeMs ? `, up for ${Math.round(uptimeMs / 60000)} minutes` : "");

  return (
    <svg
      viewBox="0 0 108 108"
      role="img"
      aria-label={label}
      className={cn("h-24 w-24 shrink-0", className)}
    >
      <style>{ART_CSS}</style>
      <defs>
        <radialGradient id={glowId} cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor={`hsl(${accent})`} stopOpacity="0.32" />
          <stop offset="100%" stopColor={`hsl(${accent})`} stopOpacity="0" />
        </radialGradient>
      </defs>

      {/* Ambient glow — the only thing that says "alive" at a glance. */}
      {!dormant && <circle cx="54" cy="54" r="50" fill={`url(#${glowId})`} />}

      {/* Memory ring: track + arc. */}
      <circle
        cx="54"
        cy="54"
        r={R}
        fill="none"
        stroke="hsl(var(--border))"
        strokeWidth="3"
      />
      {ratio !== null && (
        <circle
          cx="54"
          cy="54"
          r={R}
          fill="none"
          stroke={near ? "hsl(var(--destructive))" : `hsl(${accent})`}
          strokeWidth="3"
          strokeLinecap="round"
          strokeDasharray={`${CIRC * ratio} ${CIRC}`}
          transform="rotate(-90 54 54)"
          className={near ? "hbart-flicker" : undefined}
        />
      )}

      {/* Starting: an indeterminate sweep, because there is no progress to show. */}
      {starting && (
        <circle
          cx="54"
          cy="54"
          r={R}
          fill="none"
          stroke={`hsl(${accent})`}
          strokeWidth="3"
          strokeLinecap="round"
          strokeDasharray={`${CIRC * 0.18} ${CIRC}`}
          className="hbart-spin"
        />
      )}

      {/* Quote ladders: bids left, asks right. They move only while RUNNING —
          a stopped bot showing animated depth would be a lie. */}
      <g opacity={crashed ? 0.28 : dormant ? 0.32 : 1}>
        {RUNGS.map((r, i) => (
          <g key={`b${r.y}`} className={crashed ? "hbart-drift" : undefined} style={crashed ? { animationDelay: `${i * 0.12}s` } : undefined}>
            <rect
              x={48 - r.w}
              y={r.y}
              width={r.w}
              height="6"
              rx="3"
              fill="hsl(var(--success))"
              opacity={live ? 0.9 : 0.5}
              className={live ? "hbart-q hbart-q-r" : undefined}
              style={live ? { animationDelay: `${i * 0.18}s` } : undefined}
            />
          </g>
        ))}
        {RUNGS.map((r, i) => (
          <g key={`a${r.y}`} className={crashed ? "hbart-drift" : undefined} style={crashed ? { animationDelay: `${i * 0.15}s` } : undefined}>
            <rect
              x={60}
              y={r.y}
              width={r.w}
              height="6"
              rx="3"
              fill="hsl(var(--destructive))"
              opacity={live ? 0.9 : 0.5}
              className={live ? "hbart-q" : undefined}
              style={live ? { animationDelay: `${i * 0.21 + 0.09}s` } : undefined}
            />
          </g>
        ))}
      </g>

      {/* The spread — the gap the maker quotes around. */}
      <line
        x1="54"
        y1="26"
        x2="54"
        y2="86"
        stroke="hsl(var(--border))"
        strokeWidth="1"
        strokeDasharray="2 3"
      />

      {/* Core: the bot itself. Pulses while quoting, fractures when crashed. */}
      {live && <circle cx="54" cy="54" r="9" fill={`hsl(${accent})`} opacity="0.35" className="hbart-halo" />}
      <circle
        cx="54"
        cy="54"
        r="9"
        fill="hsl(var(--card))"
        stroke={`hsl(${accent})`}
        strokeWidth="2.5"
        className={live ? "hbart-core" : stopping ? "hbart-flicker" : undefined}
      />
      {crashed ? (
        // A broken core reads instantly; colour alone does not.
        <g stroke="hsl(var(--destructive))" strokeWidth="2.2" strokeLinecap="round">
          <line x1="50" y1="50" x2="58" y2="58" />
          <line x1="58" y1="50" x2="50" y2="58" />
        </g>
      ) : dormant ? (
        <rect x="51" y="51" width="6" height="6" rx="1" fill="hsl(var(--muted-foreground))" />
      ) : (
        <circle cx="54" cy="54" r="3" fill={`hsl(${accent})`} className={live ? "hbart-core" : undefined} />
      )}
    </svg>
  );
}
