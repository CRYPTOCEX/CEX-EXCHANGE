"use client";

import React from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, m } from "framer-motion";
import { useOutsideClick } from "@/hooks/use-outside-click";
import { CloseIcon } from "../content/card-view/expanded-card";

/**
 * Selectors for floating layers Radix portals to `document.body`. While a view
 * dialog is open these must sit ABOVE it, and an Escape they handle must not
 * also close the dialog underneath.
 */
const OPEN_LAYER_SELECTOR =
  "[data-radix-popper-content-wrapper],[data-slot='dialog-content'],[data-slot='alert-dialog-content'],[role='menu'][data-state='open'],[role='listbox'][data-state='open']";

/** Marks the body while a dialog is open, so `globals.css` can lift poppers over it. */
const BODY_FLAG = "data-view-dialog-open";

interface ViewDialogHostProps {
  /** The open row, or null when closed. */
  activeRow: any | null;
  onClose: () => void;
  /** Rendered inside the centred wrapper; receives the panel ref. */
  children: (ref: React.RefObject<HTMLDivElement | null>) => React.ReactNode;
  /** Stable id used for the exit key. */
  hostId: string;
}

/**
 * The chrome around the expanded row/card panel: backdrop, centring wrapper,
 * portal, scroll lock, Escape handling and outside-click close.
 *
 * Both hosts (table rows and card grid) grew their own copy of this and the
 * copies diverged — the row path portals to `document.body` and wraps the panel
 * in an `m.div` so AnimatePresence can defer its unmount; the card path did
 * neither, so its close animation never played and its `position: fixed`
 * wrapper was one `transform`ed ancestor away from being re-parented. One host
 * for both is what keeps the two paths honest.
 */
export function ViewDialogHost({
  activeRow,
  onClose,
  children,
  hostId,
}: ViewDialogHostProps) {
  const panelRef = React.useRef<HTMLDivElement>(null);
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => setMounted(true), []);

  /* Escape closes the dialog — unless a layer INSIDE it is handling that same
     Escape. A <Select> or dropdown dismisses itself on Escape; without this
     check the keystroke dismissed the popup AND the whole dialog behind it, so
     one Escape undid two levels of the user's work. */
  React.useEffect(() => {
    if (!activeRow) return;

    function onKeyDown(event: KeyboardEvent) {
      if (event.key !== "Escape") return;
      if (event.defaultPrevented) return;
      if (document.querySelector(OPEN_LAYER_SELECTOR)) return;
      onClose();
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [activeRow, onClose]);

  /* Scroll lock — and the CLEANUP is the load-bearing half. `expandedButtons`
     renders inside this panel, so a link like "View Details" navigates away
     with a row still open: the table unmounts and, without restoring here,
     `body { overflow: hidden }` outlived it and the destination page could not
     be scrolled at all.

     The previous value is captured and put back rather than hard-coding
     "auto", which also stops this from clobbering a lock some ancestor (a
     dialog, a drawer) legitimately owns. */
  React.useEffect(() => {
    if (!activeRow) return;

    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    document.body.setAttribute(BODY_FLAG, "true");

    return () => {
      document.body.style.overflow = prevOverflow;
      document.body.removeAttribute(BODY_FLAG);
    };
  }, [activeRow]);

  useOutsideClick(panelRef, onClose);

  if (!mounted) return null;

  const content = (
    <>
      {/* Overlay backdrop */}
      <AnimatePresence>
        {activeRow && (
          <m.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-overlay/40 backdrop-blur-sm h-full w-full z-[var(--z-overlay-scrim)]"
          />
        )}
      </AnimatePresence>

      {/* Expanded panel.

          The wrapper is an `m.div` rather than a plain one on purpose:
          AnimatePresence can only defer the unmount of a motion component, so
          with a plain div the dialog vanished the instant the row cleared and
          the only thing left to animate was the source projecting back from
          the panel's box. That is what made closing look broken. */}
      <AnimatePresence>
        {activeRow && (
          <m.div
            key={`view-dialog-${activeRow.id}-${hostId}`}
            className="fixed inset-0 grid place-items-center z-[var(--z-overlay)] p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.16, ease: [0.22, 1, 0.36, 1] }}
          >
            <m.button
              key={`close-button-${activeRow.id}-${hostId}`}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0, transition: { duration: 0.05 } }}
              className="flex absolute top-4 right-4 lg:hidden items-center justify-center bg-card rounded-full h-8 w-8 z-[var(--z-overlay-control)] shadow-lg border border-border"
              onClick={onClose}
              aria-label="Close"
            >
              <CloseIcon />
            </m.button>
            {children(panelRef)}
          </m.div>
        )}
      </AnimatePresence>
    </>
  );

  /* Portaled to `document.body` for BOTH paths. A `position: fixed` element is
     re-parented to the nearest ancestor carrying `transform`, `filter`,
     `backdrop-filter`, `perspective` or `contain` — and the card grid sits
     under a transform-heavy hero with `perspective: 1000` on the cards
     themselves, so the inline card-path version was one style change away from
     rendering inside the grid instead of over the viewport. */
  return createPortal(content, document.body);
}
