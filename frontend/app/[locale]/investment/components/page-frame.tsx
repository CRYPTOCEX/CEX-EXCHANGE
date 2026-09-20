"use client";

/**
 * The frame every working investment screen renders inside — including its own
 * skeleton, its sign-in wall and its failure panel.
 *
 * WHY THE FRAME IS A COMPONENT AND NOT A CLASS STRING
 * ---------------------------------------------------
 * Because the loading state and the settled state must not describe the page
 * differently. The old tree had no `loading.tsx` at all, so an interior route
 * showed the PREVIOUS page until its data arrived; when skeletons were later
 * added inside the clients they were hand-written copies of the layout, which
 * is how every skeleton in this app has historically drifted from the page it
 * stands in for. Here the h1, the sentence under it and the header action live
 * in ONE place and all four states pass through it.
 *
 * NO HERO. Everybody who reaches /investment/portfolio or /investment/[id] is
 * signed in and came to find out where their money is. The pages this replaces
 * opened on a `text-4xl` marketing header addressed to a visitor, which pushed
 * the first real figure below the fold on a laptop.
 *
 * NO GROUND OF ITS OWN. `layout.tsx` draws `WorkspaceGround` at `fixed inset-0
 * -z-10`; an opaque `bg-background` here would hide it on every state.
 */

import type { ReactNode } from "react";
import { Icon } from "@/components/ui/icon";
import { AlertTriangle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link, usePathname } from "@/i18n/routing";
import { loginHref } from "@/lib/login-href";
import { backendErrorText, isAuthError } from "@/lib/backend-error";

/* ---------------------------------------------------------------------------
   Frame
   ------------------------------------------------------------------------- */

interface FrameProps {
  title: string;
  subtitle: string;
  /** The one action this page owns, if it owns one. */
  action?: ReactNode;
  /** A narrower column for reading-shaped pages (a single position, a form). */
  width?: "wide" | "narrow";
  children: ReactNode;
}

export function InvestmentFrame({
  title,
  subtitle,
  action,
  width = "wide",
  children,
}: FrameProps) {
  return (
    <div className="min-h-screen pt-header-clear">
      <div
        className={
          width === "narrow"
            ? "container mx-auto flex max-w-4xl flex-col gap-6 px-4 pb-16"
            : "container mx-auto flex flex-col gap-6 px-4 pb-16"
        }
      >
        <header className="flex flex-wrap items-end justify-between gap-4">
          <div className="flex flex-col gap-1">
            <h1 className="text-2xl font-bold leading-tight tracking-tight">
              {title}
            </h1>
            {/* Capped in CHARACTERS, not pixels: a subtitle is prose and reads
                badly past ~75 characters however wide the viewport is. */}
            <p className="max-w-[68ch] text-sm text-muted-foreground">
              {subtitle}
            </p>
          </div>
          {action}
        </header>
        {children}
      </div>
    </div>
  );
}

/**
 * A section label.
 *
 * `h2` on a working page is an eyebrow, not a large heading — the figures below
 * it are what the reader is scanning for, and a 24px heading above a 16px
 * number inverts that. Shared with the skeletons for the same reason the frame
 * is.
 */
export function SectionHeading({
  title,
  trailing,
}: {
  title: string;
  trailing?: ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <h2 className="text-xs font-semibold uppercase tracking-widest text-subtle-foreground">
        {title}
      </h2>
      {trailing}
    </div>
  );
}

/* ---------------------------------------------------------------------------
   Panels
   ------------------------------------------------------------------------- */

interface EmptyPanelProps {
  icon: string;
  title: string;
  /** What this section will hold once it has something. */
  body: string;
  action?: ReactNode;
}

/**
 * An empty state teaches what the section will contain and carries the one
 * action that fills it. Also used for the sign-in wall, deliberately, so the
 * two read as one family rather than as two unrelated dead ends.
 */
export function EmptyPanel({ icon, title, body, action }: EmptyPanelProps) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-lg border border-border bg-surface-2 px-6 py-12 text-center">
      <span className="grid size-10 place-items-center rounded-full bg-surface-3 text-muted-foreground">
        <Icon icon={icon} className="size-5" aria-hidden="true" />
      </span>
      <div className="flex flex-col gap-1">
        <p className="text-sm font-semibold text-foreground">{title}</p>
        <p className="mx-auto max-w-[56ch] text-xs leading-relaxed text-muted-foreground">
          {body}
        </p>
      </div>
      {action}
    </div>
  );
}

interface ErrorPanelProps {
  title: string;
  /** The server's own words, if it sent any worth showing. */
  error: unknown;
  /** Shown when the server's message is machine text or absent. */
  fallback: string;
  /** What did NOT change because this screen failed to load. */
  reassurance: string;
  authSentence: string;
  retryLabel: string;
  onRetry?: () => void;
  retrying?: boolean;
}

/**
 * The hard-failure panel.
 *
 * Fixed anatomy, because every ad-hoc version of this in the old tree said less:
 * what failed, then the server's sentence ONLY if it is a sentence, then what
 * has not changed, then exactly one action. The reassurance is the part people
 * actually need — a portfolio that will not load is frightening in a way a
 * failed settings page is not, and the money is fine.
 */
export function ErrorPanel({
  title,
  error,
  fallback,
  reassurance,
  authSentence,
  retryLabel,
  onRetry,
  retrying,
}: ErrorPanelProps) {
  return (
    <div className="flex flex-col items-start gap-3 rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-4">
      <div className="flex items-start gap-2">
        <AlertTriangle
          className="mt-0.5 size-4 shrink-0 text-destructive-ink"
          aria-hidden="true"
        />
        <div className="flex flex-col gap-1">
          <p className="text-sm font-semibold text-destructive-ink">{title}</p>
          <p className="max-w-[72ch] text-xs leading-relaxed text-muted-foreground">
            {backendErrorText(error, fallback, authSentence)} {reassurance}
          </p>
        </div>
      </div>
      {onRetry && (
        <Button variant="outline" size="xs" loading={retrying} onClick={onRetry}>
          <RefreshCw className="size-3.5" aria-hidden="true" />
          {retryLabel}
        </Button>
      )}
    </div>
  );
}

interface StaleNoteProps {
  error: unknown;
  /** "These figures are from the last successful load…" */
  staleSentence: string;
  fallback: string;
  authSentence: string;
  signInLabel: string;
}

/**
 * A failed REFRESH keeps the previous data on screen — it was correct a moment
 * ago and blanking it helps nobody — but the screen has to say so rather than
 * let figures from ten minutes ago pass for current ones.
 *
 * The session-ended variant carries the sign-in inline, because the Refresh
 * button beside it will 401 forever and cannot fix what is wrong.
 */
export function StaleNote({
  error,
  staleSentence,
  fallback,
  authSentence,
  signInLabel,
}: StaleNoteProps) {
  const pathname = usePathname();
  const sessionEnded = isAuthError(error);

  return (
    <p className="flex items-start gap-2 rounded-lg border border-warning/30 bg-warning/10 px-3 py-2 text-xs text-warning-ink">
      <AlertTriangle className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />
      {sessionEnded ? (
        <span>
          {staleSentence} {authSentence}{" "}
          {/* `-ink`, not `text-primary`: this link sits on the strip's own
              `bg-warning/10`, which is exactly where the raw tone measures
              below the 4.5:1 floor. The UNDERLINE is the affordance here, not
              the colour. */}
          <Link
            href={loginHref(pathname)}
            className="font-medium text-primary-ink underline underline-offset-2"
          >
            {signInLabel}
          </Link>
        </span>
      ) : (
        <span>
          {staleSentence} {backendErrorText(error, fallback, authSentence)}
        </span>
      )}
    </p>
  );
}
