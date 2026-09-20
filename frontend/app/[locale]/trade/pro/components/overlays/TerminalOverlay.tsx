"use client";

/**
 * TerminalOverlay — the full-view shell the workspace's secondary surfaces use.
 *
 * The Pattern Library established this shape and it is the one the terminal
 * should keep: a full-bleed panel that covers the WORKSPACE only, portalled
 * into `.tp-grid-layout` so the trading header stays visible and clickable
 * above it. A centred modal floating over everything is a different, weaker
 * idea — it wastes the space these views exist to use, and it hides the symbol
 * and price you are reading the view about.
 *
 * Reuses `FullBleedOverlay` from the binary terminal's shared UI rather than
 * re-rolling the scrim: `binary/components/binary-ui` is core (not an
 * extension), and the Pattern Library already imports across that boundary.
 * Notably the scrim there is `--overlay`, which is dark in BOTH themes — a
 * theme-following surface token would fade to white in light mode and stop
 * reading as a scrim at all.
 */

import {
  useEffect,
  useLayoutEffect,
  useState,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";
import { FullBleedOverlay } from "@/app/[locale]/binary/components/binary-ui";
import { useUIStore } from "../../stores/ui-store";

/**
 * The portal target has to be resolved BEFORE the browser paints.
 *
 * `FullBleedOverlay` is `absolute inset-0`, and the only positioned ancestor
 * that makes that mean "the workspace" is `.tp-grid-layout` (it carries
 * `position: relative` for exactly this). Resolving in a passive effect leaves
 * one painted frame where the panel is still mounted where the component sits
 * in the tree — inside the 40px `.tp-header`, which is NOT positioned, so the
 * panel escapes to the initial containing block and flashes full-page over the
 * header. A layout effect commits the portal before that frame is painted.
 *
 * `useLayoutEffect` warns when it runs on the server, and this component is in
 * the header's server-rendered tree (closed), so fall back to `useEffect` there.
 */
const useIsomorphicLayoutEffect =
  typeof window === "undefined" ? useEffect : useLayoutEffect;

interface PortalTarget {
  node: HTMLElement;
  /** True when the workspace grid was not found and we pinned to the viewport. */
  isFallback: boolean;
}

export interface TerminalOverlayProps {
  isOpen: boolean;
  onClose: () => void;
  children: ReactNode;
}

export function TerminalOverlay({ isOpen, onClose, children }: TerminalOverlayProps) {
  // `null` means "not resolved yet for this open". Resolution is redone on every
  // open rather than cached forever: the grid is remounted when the workspace
  // switches to (or back from) the mobile layout, and a cached reference would
  // then point at a detached node — the overlay would mount into nothing and
  // silently render blank.
  const [target, setTarget] = useState<PortalTarget | null>(null);

  useIsomorphicLayoutEffect(() => {
    if (!isOpen) {
      setTarget(null);
      return;
    }
    const gridLayout = document.querySelector<HTMLElement>(".tp-grid-layout");
    setTarget(
      gridLayout
        ? { node: gridLayout, isFallback: false }
        : { node: document.body, isFallback: true }
    );
  }, [isOpen]);

  // Escape closes, matching every other dismissible surface in the workspace.
  //
  // Bound to `document`, NOT `window`, and that is load-bearing rather than
  // stylistic. A maximized workspace panel restores itself on Escape from a
  // `window` listener, and this view renders above it — so this one has to run
  // first. Two listeners on the same node in the same phase run in REGISTRATION
  // order, which here depends on whether the panel was maximized before or
  // after the view was opened; `document` is strictly earlier in the bubble path
  // than `window`, so the order is fixed whatever happened first.
  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      // Anything that already consumed the key wins, whether or not it has a
      // store flag: Radix's dismissable layer (every <Dialog>) handles Escape on
      // `document` in the CAPTURE phase and calls preventDefault() WITHOUT
      // stopping propagation, so the same native event still arrives here.
      if (event.defaultPrevented) return;
      // The header stays live above this overlay by design, so the settings
      // modal (z-200) and the command palette (portalled to body) can be opened
      // ON TOP of it. Escape belongs to whichever surface is highest; without
      // this guard one Escape dismisses the modal AND throws away the view
      // underneath it. Read through `getState()` so the listener is not
      // re-subscribed on every store change.
      const ui = useUIStore.getState();
      if (ui.isSettingsOpen || ui.isCommandPaletteOpen || ui.isLayoutSaveOpen) {
        return;
      }
      // Claim the key. A maximized panel restores itself on Escape from its own
      // window listener, and this overlay renders ABOVE it (z-50 against the
      // panel's z-30) — so without this one keypress would close the view and
      // un-maximize the panel it was covering.
      event.preventDefault();
      onClose();
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [isOpen, onClose]);

  // Nothing is rendered until the target is known — see the layout-effect note.
  if (!isOpen || !target) return null;

  const overlay = (
    <FullBleedOverlay isOpen={isOpen} onClose={onClose}>
      {children}
    </FullBleedOverlay>
  );

  // Degraded path: no workspace grid in the DOM. `absolute` would then resolve
  // against the initial containing block, which only looks right by accident,
  // so the fallback is pinned to the viewport explicitly. It covers the header
  // too — worse than the intended shape, but usable, which rendering in place
  // inside a 40px header would not be.
  if (target.isFallback) {
    return createPortal(
      <div className="fixed inset-0 z-50">{overlay}</div>,
      target.node
    );
  }

  return createPortal(overlay, target.node);
}

export default TerminalOverlay;
