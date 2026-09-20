"use client";

/**
 * The accessibility audit, running on every keystroke.
 *
 * This exists because the panel is about to hand a non-specialist the ability
 * to make text unreadable, and "it looked fine to me" is not a check. Phase 13
 * of the migration found tonal chips sitting at 3.94:1 that had shipped for the
 * life of the codebase precisely because nobody had ever computed them.
 *
 * It reports rather than prevents. An owner who wants a 3:1 accent for a
 * marketing skin should be able to have one; what they should not be able to do
 * is have one without knowing.
 */

import * as React from "react";
import { AlertTriangle, Check, Eye } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  auditPalette,
  chartSeparation,
  CVD_TARGET,
  hslTripleToHex,
  type ContrastFinding,
  type SeriesFinding,
} from "@/lib/design-contrast";
import type { Scheme } from "./use-design-draft";
import { useTranslations } from "next-intl";

function Swatch({ value }: { value: string }) {
  const hex = hslTripleToHex(value);
  return (
    <span
      className="inline-block h-3 w-3 shrink-0 rounded-sm border border-border align-middle"
      style={{ background: hex ?? "transparent" }}
    />
  );
}

function Row({
  finding,
  inkValue,
  groundValue,
}: {
  finding: ContrastFinding;
  inkValue: string;
  groundValue: string;
}) {
  return (
    <li className="flex items-center gap-2 py-1.5 text-xs">
      {finding.pass ? (
        <Check className="h-3.5 w-3.5 shrink-0 text-success" />
      ) : (
        <AlertTriangle className="h-3.5 w-3.5 shrink-0 text-warning" />
      )}
      <Swatch value={inkValue} />
      <Swatch value={groundValue} />
      <span className={cn("flex-1 truncate", finding.pass ? "text-muted-foreground" : "text-foreground")}>
        {finding.label}
      </span>
      <span
        className={cn(
          "shrink-0 font-mono tabular-nums",
          finding.pass ? "text-subtle-foreground" : "text-warning-ink font-semibold"
        )}
      >
        {finding.ratio.toFixed(2)}:1
      </span>
      <span className="w-14 shrink-0 text-right font-mono text-[10px] text-subtle-foreground">
        min {finding.min}
      </span>
    </li>
  );
}

export function DesignAudit({
  resolveToken,
  scheme,
}: {
  resolveToken: (name: string, scheme: Scheme) => string;
  scheme: Scheme;
}) {
  const t = useTranslations("components");
  const findings = React.useMemo(
    () => auditPalette(resolveToken, scheme),
    [resolveToken, scheme]
  );
  const series = React.useMemo(
    () => chartSeparation(resolveToken, scheme),
    [resolveToken, scheme]
  );

  const failures = findings.filter((f) => !f.pass);
  const seriesFailures = series.filter((s) => !s.pass);
  const seriesMarginal = series.filter((s) => s.pass && s.marginal);
  const clean = failures.length === 0 && seriesFailures.length === 0;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        {clean ? (
          <Badge variant="success" className="gap-1">
            <Check className="h-3 w-3" />
            {findings.length + series.length} checks pass
          </Badge>
        ) : (
          <Badge variant="warning" className="gap-1">
            <AlertTriangle className="h-3 w-3" />
            {failures.length + seriesFailures.length} need attention
          </Badge>
        )}
        <span className="text-xs text-subtle-foreground">
          {scheme === "light" ? t("light") : t("dark")} scheme
        </span>
      </div>

      <div>
        <h4 className="mb-1 text-xs font-semibold uppercase tracking-wide text-subtle-foreground">
          {t("text_and_boundaries")}
        </h4>
        <ul className="divide-y divide-border">
          {[...findings]
            .sort((a, b) => Number(a.pass) - Number(b.pass))
            .map((f) => (
              <Row
                key={`${f.ink}-${f.ground}`}
                finding={f}
                inkValue={resolveToken(f.ink, scheme)}
                groundValue={resolveToken(f.ground, scheme)}
              />
            ))}
        </ul>
      </div>

      <div>
        <h4 className="mb-1 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-subtle-foreground">
          <Eye className="h-3 w-3" />
          {t("chart_series_colour_blind_safe")}
        </h4>
        <p className="mb-2 text-[11px] leading-relaxed text-muted-foreground">
          {t("measured_as_perceptual_distance_oklab_e")}
        </p>
        <ul className="divide-y divide-border">
          {series.map((s: SeriesFinding) => (
            <li key={s.a} className="flex items-center gap-2 py-1.5 text-xs">
              {s.pass && !s.marginal ? (
                <Check className="h-3.5 w-3.5 shrink-0 text-success" />
              ) : (
                <AlertTriangle
                  className={cn("h-3.5 w-3.5 shrink-0", s.pass ? "text-warning" : "text-destructive")}
                />
              )}
              <Swatch value={resolveToken(s.a, scheme)} />
              <Swatch value={resolveToken(s.b, scheme)} />
              <span className="flex-1 truncate text-muted-foreground">
                {s.a.replace("--chart-", "Series ")} vs {s.b.replace("--chart-", "Series ")}
              </span>
              <span className="shrink-0 font-mono tabular-nums text-subtle-foreground">
                ΔE {s.cvd.toFixed(1)}
              </span>
            </li>
          ))}
        </ul>
        {seriesMarginal.length > 0 && seriesFailures.length === 0 ? (
          <p className="mt-2 text-[11px] text-muted-foreground">
            {seriesMarginal.length} pair
            {seriesMarginal.length === 1 ? "" : "s"} clear the floor but sit under
            ΔE {CVD_TARGET} — readable, but pair those series with a second cue
            (a shape or a direct label) rather than relying on colour alone.
          </p>
        ) : null}
      </div>
    </div>
  );
}
