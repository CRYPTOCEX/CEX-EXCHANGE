"use client";

import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { PageHeader } from "@/components/layout/page-shell";

/**
 * The support masthead — the same instrument band every reworked surface opens
 * with.
 *
 * Passed to `PageShell`'s `header` slot, which means it OWNS the top clearance:
 * supplying `header` flips the container below to plain `py-8`, so
 * `pt-header-clear` here is the only thing keeping the page out from under the
 * fixed site header, and the band supplies its own `pb-8`.
 *
 * The inner wrapper repeats PageShell's container string verbatim because
 * `containerVariants` is not exported — get it wrong and the title sits at a
 * different left edge from every card beneath it.
 *
 * `bg-card/70` + a backdrop blur rather than a solid fill, because the support
 * layout draws `WorkspaceGround` (masked hairline grid, one diffuse accent stop,
 * a surface ramp — all in the top ~380px). A solid band would cover the entire
 * interesting part of it and leave back the flat black field the ground exists
 * to fix.
 */
export function SupportMasthead({
  title,
  description,
  rail,
  actions,
  className,
}: {
  title: ReactNode;
  description?: ReactNode;
  /** The mono status strip above the title. */
  rail?: ReactNode;
  actions?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "border-border bg-card/70 border-b backdrop-blur-sm",
        className
      )}
    >
      <div className="container mx-auto w-full px-4 pt-header-clear pb-8">
        <div className="divide-border divide-y">
          {rail ? (
            <div className="text-subtle-foreground flex flex-wrap items-center gap-x-3 gap-y-1 pb-3 font-mono text-[11px] tracking-wider uppercase">
              {rail}
            </div>
          ) : null}
          <div className={rail ? "pt-4" : ""}>
            <PageHeader
              title={title}
              description={description}
              actions={actions}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * One entry on the rail: a solid state dot and a label.
 *
 * The meaning lives on the DOT, never on a halo or an animation —
 * `animate-ping` is neutralised under `prefers-reduced-motion` (globals.css sets
 * both `animation: none` and `opacity: 0`), so anything expressed only by a
 * pulse disappears for those readers.
 */
export function RailStat({
  label,
  tone = "muted",
}: {
  label: ReactNode;
  tone?: "ok" | "warn" | "bad" | "muted";
}) {
  const dot =
    tone === "ok"
      ? "bg-success"
      : tone === "warn"
        ? "bg-warning"
        : tone === "bad"
          ? "bg-destructive"
          : "bg-muted-foreground/50";
  const text =
    tone === "ok"
      ? "text-muted-foreground"
      : tone === "warn"
        ? "text-warning-ink"
        : tone === "bad"
          ? "text-destructive"
          : "text-subtle-foreground";

  return (
    <span className={cn("flex items-center gap-1.5 font-medium", text)}>
      <span className={cn("size-1.5 shrink-0 rounded-full", dot)} aria-hidden />
      {label}
    </span>
  );
}
