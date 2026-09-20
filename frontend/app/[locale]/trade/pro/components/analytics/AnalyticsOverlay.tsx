"use client";

/**
 * AnalyticsOverlay — trading analytics as a full view.
 *
 * This used to be a hand-rolled centred dialog — `max-w-6xl h-[85vh]` floating
 * on a hardcoded black scrim — while the Pattern Library next to it in the
 * same toolbar was a full-bleed workspace overlay. Two adjacent buttons opening
 * two different kinds of surface is the inconsistency; analytics is the one
 * that was wrong, and it was also the one throwing away the most space — it
 * draws four summary cards, a P&L chart, a distribution and a volume table.
 *
 * AnalyticsPanel keeps its own header because that header carries the time-range
 * selector, so no OverlayHeader is stacked on top of it — it just receives an
 * `onClose` to render the dismiss control in the row it already owns.
 */

import AnalyticsPanel from "./AnalyticsPanel";
import { TerminalOverlay } from "../overlays/TerminalOverlay";

export interface AnalyticsOverlayProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function AnalyticsOverlay({ isOpen, onClose }: AnalyticsOverlayProps) {
  return (
    <TerminalOverlay isOpen={isOpen} onClose={onClose}>
      <AnalyticsPanel className="h-full" onClose={onClose} />
    </TerminalOverlay>
  );
}
