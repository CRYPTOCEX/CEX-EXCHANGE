"use client";

import { m, useReducedMotion } from "framer-motion";
import {
  AlertTriangle,
  ArrowRight,
  BookOpen,
  CheckCircle2,
  Coins,
  FlaskConical,
  KeyRound,
  Percent,
  Plug,
  Radio,
  ShieldCheck,
  Webhook,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ImageWithFallback } from "@/components/ui/image-with-fallback";
import { Switch } from "@/components/ui/switch";
import { Link } from "@/i18n/routing";
import { cn } from "@/lib/utils";

import {
  READINESS_LABEL,
  READINESS_TONE,
  readinessOf,
  type GatewayListItem,
  type GatewayReadiness,
} from "../types";
import { useTranslations } from "next-intl";

const READINESS_ICON: Record<GatewayReadiness, typeof CheckCircle2> = {
  live: CheckCircle2,
  // The webhook glyph, because the webhook is what is broken and the fix is a
  // key pasted next to it — not the credential glyph the two "cannot
  // authenticate" states already own.
  "cannot-confirm": Webhook,
  "ready-but-off": ShieldCheck,
  "on-but-unconfigured": AlertTriangle,
  "needs-credentials": KeyRound,
  unsupported: Plug,
};

/**
 * A gateway, as one scannable tile.
 *
 * The tile answers, in reading order: which vendor, is it taking money, why
 * not, and what does it cost. The row's own columns — title, alias, version,
 * productId — answered none of those, which is why the list this replaces
 * could show sixteen enabled gateways on an install that could not take a
 * single payment.
 *
 * Ledger shell (`Card` default): hairline border, flat fill, no shadow. The
 * only colour on the tile is the readiness chip and the fee figure, and both
 * ship with a label and an icon rather than colour alone (design system R2).
 */
export function GatewayCard({
  gateway,
  index,
  busy,
  onToggle,
}: {
  gateway: GatewayListItem;
  index: number;
  busy: boolean;
  onToggle: (next: boolean) => void;
}) {
  const t = useTranslations("dashboard_admin");
  const tCommon = useTranslations("common");
  /*
   * SELF-ORCHESTRATING, and reduced-motion aware.
   *
   * Not `variants` inherited from a parent: a motion child that carries only
   * `variants` takes its label through MotionContext, which works when it
   * mounts WITH the parent and fails silently when it mounts after the
   * parent's `animate` has run — it keeps `initial` and renders at opacity 0.
   * Every tile here sits behind the config fetch, i.e. mounts on
   * loading true -> false, which is exactly that case.
   *
   * The entrance is also the one thing a CSS media query cannot switch off:
   * framer writes inline styles, so `prefers-reduced-motion` has to be read in
   * JS and the animation skipped, not merely un-transitioned.
   */
  const reduceMotion = useReducedMotion();
  const readiness = readinessOf(gateway);
  const ReadinessIcon = READINESS_ICON[readiness];
  const href = `/admin/finance/deposit/gateway/${gateway.id}`;

  const missingCount = gateway.missingRequired.length;

  return (
    /*
     * The motion wrapper is the GRID ITEM, so it — not the card — is what the
     * row stretches. Without `h-full` here the card's own `h-full` resolves
     * against an auto-height parent and every tile in a row renders ragged.
     */
    <m.div
      className="h-full"
      initial={reduceMotion ? false : { opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={
        reduceMotion
          ? { duration: 0 }
          : {
              duration: 0.35,
              // Capped: past ~10 tiles the stagger stops reading as sequence
              // and starts reading as the page being slow.
              delay: Math.min(index * 0.04, 0.4),
              ease: [0.22, 1, 0.36, 1] as const,
            }
      }
    >
    <Card padding="md" className="flex h-full flex-col gap-4">
      {/* ---- identity + the switch ------------------------------------- */}
      <div className="flex items-start gap-3">
        {/*
          A WHITE PLATE, in both themes, and that is deliberate.

          These are third-party brand marks shipped as raster assets — every one
          of them is dark ink drawn for a light background (Authorize.Net is navy
          type, TransFi is black type beside a blue glyph). On `bg-surface-3` the
          dark theme renders several of them as an empty box. We do not control
          the artwork, so the substrate has to be fixed rather than themed: this
          is the same category as the translucent-card-over-a-photograph case,
          not a `dark:` colour fork. The hairline keeps the plate reading as a
          deliberate chip rather than a blown-out gap.
        */}
        {/*
          `fill`, not a declared width/height, because these logos have no
          COMMON aspect ratio: PayFast and Authorize.Net are 2:1 wordmarks,
          others are near-square glyphs. Declaring one size makes next/image
          treat that ratio as intrinsic and warn "has either width or height
          modified, but not the other" on every tile, since `object-contain`
          then letterboxes to a different ratio than was declared. `fill` +
          `object-contain` is the API for exactly this case: the BOX is fixed,
          the artwork fits itself into it.
        */}
        <div className="relative flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-md border border-border bg-white p-1.5">
          <ImageWithFallback
            src={gateway.image}
            alt=""
            fill
            sizes="44px"
            className="object-contain"
            fallback={
              <Coins className="h-5 w-5 text-muted-foreground" aria-hidden />
            }
          />
        </div>

        <div className="min-w-0 flex-1">
          <Link
            href={href}
            className="block truncate font-semibold leading-tight hover:underline"
          >
            {gateway.title}
          </Link>
          <p className="truncate font-mono text-xs text-muted-foreground">
            {gateway.alias || gateway.name}
          </p>
        </div>

        {/*
          Labelled, not a bare switch: the control changes whether the platform
          takes money through this vendor, and "on" next to "cannot
          authenticate" is a combination an operator must be able to read at a
          glance rather than infer from a green track.
        */}
        <div className="flex shrink-0 flex-col items-end gap-1">
          <Switch
            checked={gateway.status}
            disabled={busy}
            onCheckedChange={onToggle}
            aria-label={`${gateway.status ? tCommon("disable") : tCommon("enable_1")} ${gateway.title}`}
          />
          <span className="text-[10px] uppercase tracking-wide text-muted-foreground">
            {gateway.status ? tCommon("on") : tCommon("off")}
          </span>
        </div>
      </div>

      {/* ---- readiness -------------------------------------------------- */}
      <div className="flex flex-wrap items-center gap-1.5">
        <Badge tone={READINESS_TONE[readiness]} appearance="soft">
          <ReadinessIcon className="h-3 w-3" aria-hidden />
          {READINESS_LABEL[readiness]}
        </Badge>

        {gateway.supported && gateway.mode !== "unknown" && (
          <Badge
            tone={gateway.mode === "live" ? "info" : "neutral"}
            appearance="outline"
          >
            {gateway.mode === "live" ? (
              <Radio className="h-3 w-3" aria-hidden />
            ) : (
              <FlaskConical className="h-3 w-3" aria-hidden />
            )}
            {gateway.mode === "live" ? t("live_keys") : t("test_keys")}
          </Badge>
        )}

        {missingCount > 0 && gateway.supported && (
          <Badge tone="warning" appearance="outline">
            {missingCount} of {gateway.requiredCount} key
            {gateway.requiredCount === 1 ? "" : "s"} missing
          </Badge>
        )}

        {/*
          The key ITSELF, not a count.

          The readiness chip beside it says the confirmation door is dead; this
          says which variable opens it. One name is the whole repair, and the
          badge above cannot carry it — that one counts against
          `requiredCount`, and every key that lands here is one the outbound
          leg does not require, so it is not in that denominator.
        */}
        {gateway.inboundComplete === false && gateway.missingInbound.length > 0 && (
          <Badge tone="destructive" appearance="outline" className="font-mono text-[10px]">
            {gateway.missingInbound[0]}
            {gateway.missingInbound.length > 1
              ? ` +${gateway.missingInbound.length - 1}`
              : ""}
          </Badge>
        )}
      </div>

      {/* ---- what it is ------------------------------------------------- */}
      <p className="line-clamp-2 text-sm text-muted-foreground">
        {gateway.summary || gateway.description}
      </p>

      {/* ---- the two figures -------------------------------------------- */}
      <dl className="mt-auto grid grid-cols-2 gap-2 border-t border-border pt-3 text-sm">
        <div className="min-w-0">
          <dt className="flex items-center gap-1 text-xs text-muted-foreground">
            <Percent className="h-3 w-3" aria-hidden />
            {tCommon("platform_fee")}
          </dt>
          <dd
            className={cn(
              "truncate",
              // R4: a fee is a figure. "Varies by currency" is prose and is not
              // set in mono, which is what the shared isFigureValue rule asks.
              /\d/.test(gateway.feeSummary) &&
                !/[A-Za-z]{3,}/.test(gateway.feeSummary)
                ? "font-mono tabular-nums"
                : ""
            )}
          >
            {gateway.feeSummary}
          </dd>
        </div>
        <div className="min-w-0">
          <dt className="flex items-center gap-1 text-xs text-muted-foreground">
            <Coins className="h-3 w-3" aria-hidden />
            Currencies
          </dt>
          <dd className="font-mono tabular-nums">{gateway.currencyCount}</dd>
        </div>
      </dl>

      {/* ---- actions ---------------------------------------------------- */}
      <div className="flex items-center gap-2">
        <Button asChild size="sm" variant="outline" className="flex-1">
          <Link href={href}>
            {gateway.credentialsComplete ? (
              <BookOpen className="h-3.5 w-3.5" />
            ) : (
              <KeyRound className="h-3.5 w-3.5" />
            )}
            {gateway.credentialsComplete ? tCommon("configure") : t("set_up")}
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </Button>
      </div>
    </Card>
    </m.div>
  );
}

/**
 * The tile with its strings withheld.
 *
 * Same shell, same padding, same row count — so the section does not change
 * material or height when the fetch lands. `SkeletonText` is not used here
 * because every line's width is already fixed by the layout above it.
 */
export function GatewayCardSkeleton() {
  return (
    <Card padding="md" className="flex h-full flex-col gap-4">
      <div className="flex items-start gap-3">
        <div className="h-11 w-11 shrink-0 animate-pulse rounded-md border border-border bg-surface-3" />
        <div className="flex-1 space-y-2 pt-1">
          <div className="h-3.5 w-28 animate-pulse rounded bg-surface-3" />
          <div className="h-3 w-16 animate-pulse rounded bg-surface-3" />
        </div>
        <div className="h-5 w-9 shrink-0 animate-pulse rounded-full bg-surface-3" />
      </div>
      <div className="h-5 w-40 animate-pulse rounded-full bg-surface-3" />
      <div className="space-y-2">
        <div className="h-3 w-full animate-pulse rounded bg-surface-3" />
        <div className="h-3 w-3/5 animate-pulse rounded bg-surface-3" />
      </div>
      <div className="mt-auto grid grid-cols-2 gap-2 border-t border-border pt-3">
        <div className="h-8 animate-pulse rounded bg-surface-3" />
        <div className="h-8 animate-pulse rounded bg-surface-3" />
      </div>
      <div className="h-9 w-full animate-pulse rounded-md bg-surface-3" />
    </Card>
  );
}
