"use client";

import * as React from "react";

import { cn } from "@/lib/utils";

/**
 * The viewport-owning page frame — `PageShell`'s deliberate counterpart.
 *
 * WHICH ONE DO I WANT?
 * --------------------
 * `PageShell` frames a page **inside** the site chrome: it owns the container,
 * the gutter, the rhythm, and the 64px of top clearance that the `fixed top-0
 * h-16` site header demands. Its whole correctness mandate is that clearance.
 *
 * `EditorShell` is for a route whose **layout has already removed that chrome**
 * and which owns the whole viewport — an editor, a builder, a terminal. Every
 * axis `PageShell` offers is the opposite of what such a route needs: no
 * clearance (there is no header to clear), no container (the bar is full-bleed
 * by definition), no rhythm (the body is a two-region flex column), and
 * `h-screen … overflow-hidden` rather than `min-h-screen` — the difference
 * between "at least this tall" and "exactly this tall, and I own the scroll".
 *
 * WHY THIS EXISTS
 * ---------------
 * There were **sixteen** hand-rolled full-viewport surfaces in this app before
 * it, in five mutually incompatible root idioms — `h-screen flex flex-col`,
 * `h-screen w-screen … overflow-hidden`, `flex h-screen w-full overflow-x-hidden`
 * plus a self-fullscreen toggle, `fixed inset-0 z-40|z-50`, and
 * `h-screen-mobile` with a private `--vh` writer — plus a sixth where the
 * height arrives as a prop. Bars came in three heights (h-10, h-12/14, h-16).
 * That is the same sprawl `PageShell` was created to end, one layer up.
 *
 * THE THREE CALLS THAT ARE NOT TASTE
 * ----------------------------------
 * 1. **`min-h-0` on the body.** A flex child will not shrink below its content
 *    without it, so the inner scroller silently becomes a page scroller. The
 *    page builder omits it and escapes only because its child happens to set
 *    `overflow-auto`.
 * 2. **In flow, never `fixed inset-0`.** Three surfaces here paint over chrome
 *    that is still mounted and still eating pointer events; `admin/design`
 *    records the outcome — a `fixed z-50` header intercepted clicks and made
 *    Save unreachable. Suppress the chrome in the segment layout instead (a
 *    `CHROMELESS` regex list returning bare children), then be an ordinary
 *    100vh block.
 * 3. **`h-screen`, not `h-screen-mobile`.** `h-screen-mobile` resolves to
 *    `calc(var(--vh, 1vh) * 100)` and `--vh` is written by exactly four private
 *    effects inside the trade and binary trees. Anywhere else it silently
 *    degrades to plain `100vh`, so it buys nothing unless you ship the effect
 *    with it.
 *
 * The bar is `h-12`. `h-10` is the trading-terminal density (it pairs with the
 * 9–13px type scale of `trade/pro`) and is too tight for a title; `h-16` reads
 * as a replacement site header rather than as the editor's own bar.
 */
export interface EditorShellProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Left of the bar: back affordance, title, identity. */
  bar: React.ReactNode;
  /** Right of the bar: status, secondary actions, and the primary action last. */
  actions?: React.ReactNode;
  /** Classes for the scrolling body, not the frame. */
  bodyClassName?: string;
}

export const EditorShell = React.forwardRef<HTMLDivElement, EditorShellProps>(
  ({ className, bodyClassName, bar, actions, children, ...props }, ref) => (
    <div
      ref={ref}
      className={cn("flex h-screen flex-col overflow-hidden bg-background", className)}
      {...props}
    >
      <header className="flex h-12 shrink-0 items-center justify-between gap-3 border-b border-border bg-card px-3">
        <div className="flex min-w-0 flex-1 items-center gap-2">{bar}</div>
        {actions ? (
          <div className="flex shrink-0 items-center gap-2">{actions}</div>
        ) : null}
      </header>

      {/* The only scroller in the tree. */}
      <div className={cn("min-h-0 flex-1 overflow-y-auto", bodyClassName)}>
        {children}
      </div>
    </div>
  )
);
EditorShell.displayName = "EditorShell";

/** The hairline between groups in the bar. */
export const EditorBarDivider = () => (
  <span aria-hidden className="h-4 w-px shrink-0 bg-border" />
);
