"use client";

/**
 * Shared Hummingbot chrome.
 *
 * This file was a per-extension colour identity, which is the thing the design
 * system exists to prevent. `HbAccent` was a union of six *hue names*
 * ("emerald" | "cyan" | "red" | "amber" | "violet" | "muted") — the same
 * hue-name-as-string layer that kept a green wash on the ecommerce hero long
 * after every class on it was token-clean. Phase 6 renamed the classes behind
 * those names (emerald → success, amber → warning) without changing a pixel,
 * so the union kept meaning exactly what it always had: this addon is green.
 *
 * Two of the six ("cyan" and "violet") already resolved to the identical
 * `primary` triplet, so the type promised a distinction it could not deliver.
 *
 * `HbAccent` is now a *role*, not a colour. `up`/`down` stay because a market
 * maker's pills really do report direction of money; everything decorative is
 * the accent, and `warning` is kept for the one genuine caution state.
 */

import type { ReactNode } from "react";

export type HbAccent = "accent" | "up" | "down" | "warning" | "muted";

const ACCENT: Record<HbAccent, string> = {
  accent: "text-primary-ink bg-primary/10 border-primary/20",
  up: "text-up-ink bg-up/10 border-up/20",
  down: "text-down-ink bg-down/10 border-down/20",
  warning: "text-warning-ink bg-warning/10 border-warning/20",
  muted: "text-muted-foreground bg-surface-3 border-border",
};

/** Compact KPI tile used across the Hummingbot admin/user pages. */
export function HbStatPill({
  icon,
  label,
  value,
  accent = "accent",
}: {
  icon: ReactNode;
  label: string;
  value: ReactNode;
  accent?: HbAccent;
}) {
  // Is this a FIGURE or is it prose? Monospace + tabular exists so digits stop
  // shifting sideways as a value updates — that reason covers 12, "1.2 GB" and
  // "30%", and nothing else. A ReactNode or a worded value ("Not connected")
  // set in a 24px monospace face just reads as broken, so it stays sans.
  const isFigure =
    typeof value === "number" ||
    (typeof value === "string" && /\d/.test(value) && !/[A-Za-z]{3,}/.test(value));

  return (
    <div className="rounded-lg border border-border bg-card p-4 transition-colors hover:border-border-strong">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-muted-foreground">{label}</span>
        <span className={`grid h-7 w-7 shrink-0 place-items-center rounded-sm border ${ACCENT[accent]}`}>{icon}</span>
      </div>
      <div
        className={`mt-2 text-2xl font-semibold leading-tight tracking-tight text-foreground${
          isFigure ? " font-mono tabular-nums" : ""
        }`}
      >
        {value}
      </div>
    </div>
  );
}

/** Hero banner shared by every Hummingbot page. */
export function HbHero({
  icon,
  badge,
  title,
  subtitle,
  actions,
}: {
  icon: ReactNode;
  badge?: string;
  title: ReactNode;
  subtitle?: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <section className="overflow-hidden rounded-lg border border-border bg-card p-6 sm:p-8">
      <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-start gap-4">
          <div className="grid h-16 w-16 shrink-0 place-items-center rounded-xl border border-primary/20 bg-primary/10 text-primary">
            {icon}
          </div>
          <div>
            {badge && (
              <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-up/20 bg-up/10 px-3 py-1 text-xs font-medium text-up-ink">
                <span className="relative flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-up opacity-75" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-up" />
                </span>
                {badge}
              </div>
            )}
            <h1 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">{title}</h1>
            {subtitle && <p className="mt-2 max-w-2xl text-sm text-muted-foreground">{subtitle}</p>}
          </div>
        </div>
        {actions && <div className="flex flex-wrap gap-3">{actions}</div>}
      </div>
    </section>
  );
}

/** Primary button styling shared by hero CTAs. */
export const HB_CTA_CLASS = "bg-primary text-primary-foreground hover:bg-primary/90";
export const HB_OUTLINE_CLASS = "border-border hover:border-border-strong hover:bg-surface-2";
