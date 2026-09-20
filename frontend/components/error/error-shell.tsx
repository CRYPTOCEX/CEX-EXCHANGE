"use client";

/**
 * One layout for every error surface in the product — the seven static HTTP
 * pages under `error-page/`, and the `error.tsx` / `not-found.tsx` boundaries
 * React mounts when a route throws.
 *
 * HISTORY. The seven `error-page/` routes were seven byte-identical copies of
 * the same file, differing only in a PNG path, three translation keys and a
 * max-width. Each shipped a light and a dark screenshot picked in JS from
 * `useTheme()`, which is `undefined` until mount — so every dark-mode visitor
 * saw the light illustration flash first, and the pages carried a hardcoded
 * zinc ink scale on top of it. They now compose the landing kit, so an error
 * looks like the rest of the product rather than like a different website, and
 * the illustration is drawn from tokens instead of shipped as two rasters per
 * status code.
 *
 * WHY THE BOUNDARIES LIVE HERE TOO (2026-07-30). The four `error.tsx` /
 * `not-found.tsx` boundaries had each grown their own fallback, and all four
 * were broken in a different way:
 *
 *   (dashboard)/error.tsx  no page padding at all, so it rendered UNDER the
 *                          `fixed top-0` header — the alert text landed on top
 *                          of the logo. It also passed `color="destructive"`
 *                          to <Alert> and <Button>, and neither has a `color`
 *                          prop (the axes are `variant`/`tone`), so React
 *                          forwarded it to the DOM as the legacy HTML `color`
 *                          attribute and both rendered in their default,
 *                          non-destructive skin.
 *   [locale]/error.tsx     `fixed inset-0 z-50` — a scrim over the page rather
 *                          than page content, which is why it read as a
 *                          half-rendered modal.
 *   (ext)/ico/error.tsx    same `fixed inset-0` scrim.
 *   [locale]/not-found.tsx rendered `next/error`, the PAGES-ROUTER fallback:
 *                          an unstyled white document with a hairline rule,
 *                          ignoring the palette entirely.
 *
 * A boundary is not a modal and not a widget — it replaces the page, so it has
 * to look like a page. `standalone` is the one axis that matters: whether this
 * shell owns the viewport, or is rendering inside a layout that already paints
 * the fixed header and the footer.
 *
 * Colour (DESIGN-SYSTEM.md R2): the mark carries the state and the copy stays
 * on the ink scale. `destructive` is reserved for the codes that mean *we*
 * failed (500, 503, and every thrown error); the 4xx family is the accent,
 * because "not found" and "not permitted" are outcomes, not faults. Two colours
 * across every error surface, each one meaning something — not a decorative hue
 * per status code.
 */

import React, { Fragment, useEffect, useState } from "react";
import { m, useReducedMotion } from "framer-motion";
import { useTranslations } from "next-intl";
import { ChevronDown, ChevronUp, Home, RefreshCw } from "lucide-react";
import { Link } from "@/i18n/routing";
import { Button } from "@/components/ui/button";
import { LandingShell, Panel, PrimaryCta } from "@/components/landing/kit";
import { cn } from "@/lib/utils";

export type ErrorTone = "accent" | "destructive";

/**
 * Clears the `fixed top-0` header. Same value as the dashboard's `PAGE_PADDING`
 * — inlined rather than imported, because that constant belongs to the
 * dashboard route group and this shell also renders inside extension layouts,
 * which have the same fixed header and the same requirement.
 *
 * `pt-header-clear` is `--header-height + 2rem` and equals the `pt-24` it
 * replaces at the shipped 4rem bar, so nothing moves today. The literal could
 * not survive navbar variants: the bar is `h-header` now, and a 6.5rem
 * `stacked` navbar over a fixed 96px of clearance puts the site header on top
 * of the error code — on the one screen a visitor already cannot navigate away
 * from without it.
 */
const IN_LAYOUT_PADDING = "pt-header-clear pb-16";

/**
 * The dial behind the status code.
 *
 * Tokens only: the tone rides `currentColor` from a static class on the
 * wrapper, everything neutral is `hsl(var(--muted-foreground))` at low alpha.
 * The dashed ring is a separate `<svg>` layer so the rotation applies to the
 * element box — an SVG element rotates about its own centre, where a `<g>`
 * would need an explicit transform-origin in user units.
 */
function ErrorMark({ code, tone }: { code: string; tone: ErrorTone }) {
  const prefersReducedMotion = useReducedMotion();

  return (
    <div
      className={cn(
        "relative mx-auto h-36 w-36 sm:h-40 sm:w-40",
        tone === "destructive" ? "text-destructive" : "text-primary"
      )}
    >
      <svg
        viewBox="0 0 200 200"
        fill="none"
        aria-hidden="true"
        className="absolute inset-0 h-full w-full"
      >
        <circle cx="100" cy="100" r="62" fill="currentColor" opacity="0.07" />
        <circle
          cx="100"
          cy="100"
          r="62"
          stroke="hsl(var(--muted-foreground))"
          strokeWidth="1"
          opacity="0.3"
        />
        <g
          stroke="hsl(var(--muted-foreground))"
          strokeWidth="1.5"
          strokeLinecap="round"
          opacity="0.45"
        >
          <path d="M100 16v12" />
          <path d="M100 172v12" />
          <path d="M16 100h12" />
          <path d="M172 100h12" />
        </g>
      </svg>

      <m.svg
        viewBox="0 0 200 200"
        fill="none"
        aria-hidden="true"
        className="absolute inset-0 h-full w-full"
        animate={prefersReducedMotion ? undefined : { rotate: 360 }}
        transition={
          prefersReducedMotion
            ? undefined
            : { duration: 48, repeat: Infinity, ease: "linear" }
        }
      >
        <circle
          cx="100"
          cy="100"
          r="88"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeDasharray="3 13"
          opacity="0.6"
        />
        <circle cx="188" cy="100" r="3.5" fill="currentColor" />
      </m.svg>

      <span className="absolute inset-0 flex items-center justify-center font-mono text-4xl font-bold tracking-tight text-foreground sm:text-5xl">
        {code}
      </span>
    </div>
  );
}

export function ErrorShell({
  code,
  title,
  description,
  action,
  details,
  tone = "accent",
  standalone = true,
  homeHref = "/dashboard",
  className,
}: {
  /** HTTP status code — the page's only real identity. */
  code: string;
  title: string;
  /** A single node, or a list rendered one sentence per line. */
  description?: React.ReactNode | React.ReactNode[];
  /** Defaults to the homepage link every one of these pages already had. */
  action?: React.ReactNode;
  /** Optional block below the actions — the dev-only stack, in practice. */
  details?: React.ReactNode;
  tone?: ErrorTone;
  /** Target of the default CTA. Ignored when `action` is supplied. */
  homeHref?: string;
  /**
   * Extra classes on the outer wrapper. The escape hatch exists for layouts
   * that park something ELSE in the header strip: ICO renders its platform
   * announcement `absolute … top-24 z-50`, out of flow, so a page under it has
   * to clear more than the header alone.
   */
  className?: string;
  /**
   * `true` (default): this shell owns the viewport — the dedicated
   * `error-page/*` routes and any boundary whose layout paints no chrome.
   *
   * `false`: it is rendering INSIDE a layout that already has a `fixed top-0`
   * header and a footer below, so it must sit in normal page flow and clear the
   * header itself. The landing ground is dropped in this mode on purpose:
   * `PageBackground` and `NoiseOverlay` are `fixed inset-0`, so they would
   * paint across the surrounding chrome rather than behind this panel.
   */
  standalone?: boolean;
}) {
  const t = useTranslations("common");
  const lines: React.ReactNode[] = Array.isArray(description)
    ? description
    : [description];

  const panel = (
    <Panel className="w-full max-w-lg p-8 text-center sm:p-12">
      <ErrorMark code={code} tone={tone} />

      <h1 className="mt-8 text-balance text-2xl font-semibold leading-tight tracking-tight text-foreground sm:text-3xl">
        {title}
      </h1>

      {description !== undefined && (
        <p className="mt-3 text-pretty text-sm leading-relaxed text-muted-foreground sm:text-base">
          {lines.map((line, index) => (
            <Fragment key={index}>
              {index > 0 && <br />}
              {line}
            </Fragment>
          ))}
        </p>
      )}

      <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
        {action ?? (
          <PrimaryCta href={homeHref} className="w-full sm:w-auto sm:min-w-[240px]">
            {t("go_to_homepage")}
          </PrimaryCta>
        )}
      </div>

      {details}
    </Panel>
  );

  if (!standalone) {
    return (
      <div
        className={cn(
          "flex min-h-[60vh] items-center justify-center px-4",
          IN_LAYOUT_PADDING,
          className
        )}
      >
        {panel}
      </div>
    );
  }

  return (
    <LandingShell
      className={cn(
        "min-h-screen items-center justify-center px-4 py-16",
        className
      )}
    >
      {panel}
    </LandingShell>
  );
}

/**
 * The stack trace, in development only.
 *
 * In production it degrades to `error.digest` — the id Next writes into the
 * server log for the same throw, which is the only thing that makes a user's
 * "it broke" reportable. Returns null when there is nothing to show, and owns
 * its own top margin so the shell can render it bare without leaving a gap.
 */
function ErrorDetails({ error }: { error: Error & { digest?: string } }) {
  // `common.error_details_development_only` ("Error details") already exists and
  // is already what `binary/components/error-boundaries.tsx` puts on the same
  // disclosure. Both predecessors of this shell hardcoded the label instead.
  // Declared above the early return: hooks cannot run conditionally.
  const t = useTranslations("common");
  const [open, setOpen] = useState(false);

  if (process.env.NODE_ENV !== "development") {
    return error.digest ? (
      <p className="mt-6 font-mono text-xs text-muted-foreground">
        {error.digest}
      </p>
    ) : null;
  }

  return (
    <div className="mt-6 overflow-hidden rounded-lg border border-border text-left">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between px-4 py-3 text-sm text-muted-foreground transition-colors hover:bg-muted/50"
      >
        <span>{t("error_details_development_only")}</span>
        {open ? (
          <ChevronUp className="h-4 w-4" />
        ) : (
          <ChevronDown className="h-4 w-4" />
        )}
      </button>
      {open && (
        <div className="border-t border-border bg-muted/30 px-4 py-3">
          <pre className="max-h-48 overflow-auto whitespace-pre-wrap break-all font-mono text-xs text-destructive">
            {error.message}
            {error.stack ? `\n\n${error.stack}` : ""}
          </pre>
        </div>
      )}
    </div>
  );
}

/**
 * The fallback every `error.tsx` renders.
 *
 * Each boundary is now a five-line file that picks `standalone` and a home
 * link, so the four of them cannot drift apart again.
 */
export function ErrorBoundaryFallback({
  error,
  reset,
  standalone = true,
  homeHref = "/",
  extraAction,
  className,
}: {
  error: Error & { digest?: string };
  reset: () => void;
  standalone?: boolean;
  /** Where "Go Home" points — extensions send you to their own landing page. */
  homeHref?: string;
  /** An additional link rendered alongside retry/home. */
  extraAction?: React.ReactNode;
  /** Passed through to the shell wrapper — see `ErrorShell.className`. */
  className?: string;
}) {
  const t = useTranslations("common");
  const [isRetrying, setIsRetrying] = useState(false);

  useEffect(() => {
    console.error("Error boundary caught:", error);
  }, [error]);

  /*
   * TELL THE PAGE-LEVEL FURNITURE THAT THIS PAGE FAILED.
   *
   * -------------------------------------------------------------------------
   * WHY THE ASSISTANT DOES NOT KNOW ON ITS OWN
   * -------------------------------------------------------------------------
   * A Next error boundary replaces the SEGMENT, not the layout above it — and
   * the admin assistant is mounted in `[locale]/layout.tsx`, above the router,
   * precisely so a procedure can walk somebody across screens without it
   * remounting. So when a page throws, the rail is still there, still holding
   * its 26rem gutter, and still showing a skeleton beside a 500.
   *
   * It cannot detect this for itself: nothing in React tells a sibling of the
   * boundary that the boundary fired. The boundary is the only component that
   * knows, so it is the one that says so.
   *
   * An attribute rather than context, for the same reason the pinned gutter uses
   * one: the consumer is a stylesheet, and the rail must disappear along with
   * the width it reserved — a hidden panel over a page still indented for it
   * would be the worse half of the bug.
   */
  useEffect(() => {
    const root = document.documentElement;
    root.setAttribute("data-page-error", "true");
    // Removed on retry and on navigation away, both of which unmount this.
    return () => root.removeAttribute("data-page-error");
  }, []);

  const handleRetry = () => {
    setIsRetrying(true);
    try {
      reset();
    } finally {
      // `reset()` re-renders the segment; if it throws again this boundary
      // remounts and the flag is irrelevant. The timeout only covers the case
      // where the retry succeeds slowly.
      setTimeout(() => setIsRetrying(false), 1000);
    }
  };

  return (
    <ErrorShell
      code="500"
      tone="destructive"
      standalone={standalone}
      className={className}
      title={t("something_went_wrong")}
      description={t("an_error_occurred_while_loading_the_page")}
      details={<ErrorDetails error={error} />}
      action={
        <>
          <Button
            onClick={handleRetry}
            loading={isRetrying}
            size="xl"
            fullWidth
            className="sm:w-auto sm:min-w-[180px]"
          >
            {!isRetrying && <RefreshCw className="h-4 w-4" />}
            {t("try_again")}
          </Button>
          {/*
            `asChild` rather than <Link><Button/></Link>: an <a> wrapping a
            <button> is invalid HTML, and it is what made these CTAs two
            separately focusable stops in the tab order.
          */}
          <Button
            asChild
            variant="outline"
            size="xl"
            fullWidth
            className="sm:w-auto sm:min-w-[180px]"
          >
            <Link href={homeHref}>
              <Home className="h-4 w-4" />
              {t("go_home")}
            </Link>
          </Button>
          {extraAction}
        </>
      }
    />
  );
}

export default ErrorShell;
