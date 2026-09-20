"use client";

/**
 * ONE FORM, ONE SAVE, AND ONLY THE ENDPOINTS THAT ACTUALLY CHANGED.
 * ===========================================================================
 *
 * This tab was seven stacked cards with FIVE save buttons between them —
 * "Update" on price, "Update Bias", "Update Price Mode", "Update Volatility
 * Settings" and a "Save all changes" at the bottom whose scope overlapped the
 * first one. Nothing said which button owned which field, nothing showed what
 * was unsaved, and two of the controls could not save at all:
 *
 *  - **The volatility-pause switch was dead twice over.** It was wired with
 *    `onChange`, but this is a Radix `Switch` — it renders a `<button>`, so a
 *    DOM change event never fires and the toggle could not move. And the save
 *    posted `volatilityPauseEnabled`, while the column, the model and the
 *    handler's destructure all call it `pauseOnHighVolatility`, so the value was
 *    dropped server-side with a 200 and a success toast. The read-out beside it
 *    had the same typo, so a market with the guard switched ON displayed
 *    "Disabled". R16: a control that reports success and does nothing.
 *  - **Aggression is an ENUM of three values** — CONSERVATIVE, MODERATE,
 *    AGGRESSIVE — and it was edited with a 1-to-10 slider whose ten positions
 *    were bucketed back into three on save. Seven of the ten did nothing
 *    visible. It is a three-way choice now, which is what the column is.
 *
 * There are four write endpoints behind this screen (`index.put`, `bias.put`,
 * `price-mode.put`, `volatility.put`) and one button. Each field belongs to a
 * declared GROUP; saving posts only the groups whose values actually differ from
 * what was loaded. That is why one button is honest here: it is not "save
 * everything", it is "apply what I changed".
 *
 * `target.put` is deliberately unused — its three fields are a strict subset of
 * `index.put`'s, and two endpoints that can write the same column is how the old
 * screen ended up with two buttons for one field.
 */

import React, { useEffect, useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import {
  AlertOctagon,
  Check,
  Compass,
  DollarSign,
  Globe,
  Minus,
  RefreshCw,
  RotateCcw,
  Save,
  Shield,
  Sliders,
  Trash2,
  TrendingDown,
  TrendingUp,
  Waves,
} from "lucide-react";

import { $fetch } from "@/lib/api";
import { cn } from "@/lib/utils";
import { useRouter } from "@/i18n/routing";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import type { MarketBias, MarketPhase, PriceMode } from "../types";

interface MarketConfigProps {
  /**
   * The RESOLVED market-maker payload. Never null, and for a second reason
   * beyond the dereference: every field below is SEEDED from this. Mounted
   * against a pending payload the form would fill with defaults and never
   * re-seed, and the operator would save those defaults over the live config.
   */
  data: Record<string, any>;
  onRefresh: () => void;
  /** Opens the page's daily-reset confirmation. One implementation, two doors. */
  onResetDaily?: () => void;
}

/** Every editable value, flattened. One shape for the form and the baseline. */
interface FormState {
  targetPrice: string;
  priceRangeLow: string;
  priceRangeHigh: string;
  aggressionLevel: string;
  realLiquidityPercent: number;
  /** ECO + following only. 0 disables the top-up; see the control's comment. */
  requoteFloorPerSide: number;
  /** FUTURES only. The endpoint refuses it on an ECO market. */
  futuresLeverage: string;
  maxDailyVolume: string;
  pauseOnHighVolatility: boolean;
  volatilityThreshold: number;
  marketBias: MarketBias;
  biasStrength: number;
  priceMode: PriceMode;
  externalSymbol: string;
  correlationStrength: number;
  baseVolatility: number;
  volatilityMultiplier: number;
  momentumDecay: number;
}

/**
 * Which endpoint owns which fields.
 *
 * The single source for both "is this group dirty" and "what do we post", so a
 * field cannot be edited on screen and then left out of every request — which is
 * exactly what happened to `pauseOnHighVolatility`.
 */
const GROUPS = {
  core: [
    "targetPrice",
    "priceRangeLow",
    "priceRangeHigh",
    "aggressionLevel",
    "realLiquidityPercent",
    "requoteFloorPerSide",
    "futuresLeverage",
    "maxDailyVolume",
    "pauseOnHighVolatility",
    "volatilityThreshold",
  ],
  bias: ["marketBias", "biasStrength"],
  priceMode: ["priceMode", "externalSymbol", "correlationStrength"],
  volatility: ["baseVolatility", "volatilityMultiplier", "momentumDecay"],
} as const satisfies Record<string, readonly (keyof FormState)[]>;

type GroupId = keyof typeof GROUPS;

function toForm(data: Record<string, any>): FormState {
  return {
    targetPrice: String(data.targetPrice ?? ""),
    priceRangeLow: String(data.priceRangeLow ?? ""),
    priceRangeHigh: String(data.priceRangeHigh ?? ""),
    aggressionLevel: String(data.aggressionLevel ?? "MODERATE"),
    realLiquidityPercent: Number(data.realLiquidityPercent ?? 0),
    // 3 rather than 0 when the column is absent, matching the backend default.
    // Reading a missing column as 0 would show the panel saying the top-up is OFF
    // on a market that is actually running it -- the settings split-brain this
    // codebase has been bitten by before.
    requoteFloorPerSide: Number(data.requoteFloorPerSide ?? 3),
    // 1 rather than "", so an ECO maker (which has no stored value) produces a
    // baseline the dirty check can compare against instead of reading as an
    // edit on every render.
    futuresLeverage: String(data.futuresLeverage ?? 1),
    maxDailyVolume: String(data.maxDailyVolume ?? ""),
    // The column, the model and the handler all use this name. The form used to
    // read `volatilityPauseEnabled`, which is in none of them.
    pauseOnHighVolatility: Boolean(data.pauseOnHighVolatility),
    volatilityThreshold: Number(data.volatilityThreshold ?? 5),
    marketBias: (data.marketBias ?? "NEUTRAL") as MarketBias,
    biasStrength: Number(data.biasStrength ?? 50),
    priceMode: (data.priceMode ?? "AUTONOMOUS") as PriceMode,
    externalSymbol: String(data.externalSymbol ?? ""),
    correlationStrength: Number(data.correlationStrength ?? 50),
    baseVolatility: Number(data.baseVolatility ?? 2),
    volatilityMultiplier: Number(data.volatilityMultiplier ?? 1),
    momentumDecay: Number(data.momentumDecay ?? 0.95),
  };
}

/** A titled section. Nine of them, so the chrome is written once. */
function Section({
  icon: Icon,
  title,
  description,
  tone = "primary",
  children,
  className,
}: {
  icon: React.ElementType;
  title: React.ReactNode;
  description?: React.ReactNode;
  tone?: "primary" | "warning" | "destructive";
  children: React.ReactNode;
  className?: string;
}) {
  const fill =
    tone === "warning"
      ? "bg-warning/10 text-warning"
      : tone === "destructive"
        ? "bg-destructive/10 text-destructive"
        : "bg-primary/10 text-primary";

  return (
    <Card className={className}>
      <CardHeader padding="md">
        <div className="flex items-center gap-3">
          <span className={cn("grid h-8 w-8 shrink-0 place-items-center rounded-sm", fill)}>
            <Icon className="h-4 w-4" />
          </span>
          <div className="min-w-0">
            <CardTitle className="text-base font-semibold text-foreground">
              {title}
            </CardTitle>
            {description ? (
              <p className="text-xs text-muted-foreground">{description}</p>
            ) : null}
          </div>
        </div>
      </CardHeader>
      <CardContent padding="md" className="space-y-5">
        {children}
      </CardContent>
    </Card>
  );
}

/** A slider with its label and its live value on one line. */
function Field({
  label,
  value,
  children,
  hint,
}: {
  label: React.ReactNode;
  value?: React.ReactNode;
  children: React.ReactNode;
  hint?: React.ReactNode;
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-4">
        <label className="text-sm font-medium text-muted-foreground">{label}</label>
        {value !== undefined ? (
          <span className="font-mono text-sm font-medium tabular-nums text-foreground">
            {value}
          </span>
        ) : null}
      </div>
      {children}
      {hint ? <p className="text-xs text-muted-foreground">{hint}</p> : null}
    </div>
  );
}

/**
 * An inline advisory, rendered beside the setting that caused it.
 *
 * The engine already computes these verdicts and, until now, wrote them to `logger.warn`
 * where no operator would ever meet them — `getRangeAdequacy()` carries the comment
 * "Surfaced so the admin UI can warn instead of silently shipping an exploitable market"
 * and had no API field, let alone a consumer. This is that surface.
 */
function Notice({
  tone = "warning",
  title,
  children,
}: {
  tone?: "warning" | "destructive";
  title?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div
      className={cn(
        "flex gap-2 rounded-md border px-3 py-2 text-xs",
        tone === "destructive"
          ? "border-destructive/40 bg-destructive/10 text-destructive"
          : "border-warning/40 bg-warning/10 text-warning"
      )}
    >
      <AlertOctagon className="mt-0.5 h-3.5 w-3.5 shrink-0" />
      <div className="min-w-0 space-y-1">
        {title ? <p className="font-semibold">{title}</p> : null}
        <p className="leading-relaxed">{children}</p>
      </div>
    </div>
  );
}

/** A 2-or-3 way choice, rendered as a segmented control. */
function Choice<T extends string>({
  options,
  value,
  onChange,
  columns = 3,
}: {
  options: { value: T; label: React.ReactNode; hint?: React.ReactNode; icon?: React.ElementType }[];
  value: T;
  onChange: (next: T) => void;
  columns?: 2 | 3 | 4;
}) {
  return (
    <div
      className={cn(
        "grid gap-2",
        columns === 2 ? "grid-cols-2" : columns === 4 ? "grid-cols-2 sm:grid-cols-4" : "grid-cols-3"
      )}
    >
      {options.map((option) => {
        const OptionIcon = option.icon;
        const selected = value === option.value;
        return (
          <button
            key={option.value}
            type="button"
            aria-pressed={selected}
            onClick={() => onChange(option.value)}
            className={cn(
              "rounded-md border px-3 py-2.5 text-center outline-hidden transition-colors focus-visible:ring-[3px] focus-visible:ring-ring/50",
              selected
                ? "border-primary bg-primary/10"
                : "border-border hover:border-border-strong hover:bg-muted"
            )}
          >
            {OptionIcon ? (
              <OptionIcon
                className={cn(
                  "mx-auto mb-1.5 h-4 w-4",
                  selected ? "text-primary" : "text-muted-foreground"
                )}
              />
            ) : null}
            <span
              className={cn(
                "block text-sm font-medium",
                selected ? "text-foreground" : "text-muted-foreground"
              )}
            >
              {option.label}
            </span>
            {option.hint ? (
              <span className="mt-0.5 block text-[11px] text-subtle-foreground">
                {option.hint}
              </span>
            ) : null}
          </button>
        );
      })}
    </div>
  );
}

export const MarketConfig: React.FC<MarketConfigProps> = ({
  data,
  onRefresh,
  onResetDaily,
}) => {
  const t = useTranslations("ext_admin_ai_market-maker");
  const tCommon = useTranslations("common");
  const tExtAdmin = useTranslations("ext_admin");
  const tExtAdminAi = useTranslations("ext_admin_ai");
  const tExt = useTranslations("ext");
  const router = useRouter();

  const quote = data.market?.pair || "";
  /*
   * ABSENT MEANS ECO, never unknown.
   *
   * Every maker created before futures support carries no `marketType`, and
   * reading absence as anything else would show a leverage control on markets
   * that have no leverage — and then send the field, which the endpoint refuses,
   * so every save on an existing market would start failing.
   */
  const isFutures = (data as any).marketType === "FUTURES";

  const incoming = useMemo(() => toForm(data), [data]);
  const signature = JSON.stringify(incoming);

  const [form, setForm] = useState<FormState>(incoming);
  const [baseline, setBaseline] = useState<FormState>(incoming);
  const [saving, setSaving] = useState(false);
  const [phaseTarget, setPhaseTarget] = useState<MarketPhase | null>(null);
  const [phaseRunning, setPhaseRunning] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const dirtyGroups = useMemo(
    () =>
      (Object.keys(GROUPS) as GroupId[]).filter((group) =>
        GROUPS[group].some((field) => form[field] !== baseline[field])
      ),
    [form, baseline]
  );
  const isDirty = dirtyGroups.length > 0;

  /**
   * Adopt server-side changes ONLY while nothing is pending.
   *
   * The record refetches on every socket push, so re-seeding unconditionally
   * would erase whatever the operator is typing mid-edit; never re-seeding would
   * leave the form showing values another admin has since changed. Keyed on a
   * signature rather than on `data`, whose identity changes on every push.
   */
  useEffect(() => {
    if (isDirty) return;
    setForm(incoming);
    setBaseline(incoming);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [signature]);

  /**
   * THE TETHER READOUT — is this market actually tracking?
   *
   * The containment band travels with the reference now, so the question this answers has
   * changed. It used to be "can the price ever reach the reference", because the band was
   * pinned to the target and the leash out-pulled the tether two to one. That failure no
   * longer exists: the band is re-centred on the reference at the configured width, so the
   * reference is at its centre by construction.
   *
   * What is worth showing instead is whether a reference is arriving at all, and how far
   * the price currently sits from it — a market that is CONVERGING looks the same on a
   * status badge as one that is ADRIFT because its feed died.
   */
  const tetherView = useMemo(() => {
    const tether = (data as any)?.tether ?? {};
    const reference = Number(tether.externalPrice);
    const error = Number(tether.trackingErrorPercent);
    const halfLife = Number(tether.halfLifeHours);

    return {
      verdict: String(tether.verdict ?? "NOT_TETHERED"),
      hasReference: Number.isFinite(reference) && reference > 0,
      reference,
      trackingErrorPercent: Number.isFinite(error) ? error : null,
      message: typeof tether.message === "string" ? tether.message : null,
      halfLifeHours: Number.isFinite(halfLife) && halfLife > 0 ? halfLife : null,
    };
  }, [data]);

  /** Range adequacy, computed server-side against the market's configured volatility. */
  const rangeAdequacy = (data as any)?.rangeAdequacy ?? null;

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const discard = () => setForm(baseline);

  const handleSave = async () => {
    const low = Number(form.priceRangeLow);
    const high = Number(form.priceRangeHigh);
    const target = Number(form.targetPrice);

    // Validated here as well as on the server so the operator is told before a
    // round trip — the endpoint enforces exactly the same three rules.
    if (dirtyGroups.includes("core")) {
      if (!(target > 0) || !(low > 0) || !(high > 0)) {
        toast.error(t("prices_must_be_positive"));
        return;
      }
      if (low >= high) {
        toast.error(t("range_low_below_high"));
        return;
      }
      if (target < low || target > high) {
        toast.error(t("target_inside_range"));
        return;
      }
    }

    const requests: { group: GroupId; url: string; body: Record<string, any> }[] = [];
    if (dirtyGroups.includes("core")) {
      requests.push({
        group: "core",
        url: `/api/admin/ai/market-maker/market/${data.id}`,
        body: {
          targetPrice: target,
          priceRangeLow: low,
          priceRangeHigh: high,
          aggressionLevel: form.aggressionLevel,
          realLiquidityPercent: Number(form.realLiquidityPercent),
          requoteFloorPerSide: Number(form.requoteFloorPerSide),
          /*
           * SENT ONLY ON FUTURES.
           *
           * The endpoint REFUSES this field on an ECO market — deliberately,
           * because storing a leverage nothing will ever read is how a control
           * comes to look meaningful. Sending it unconditionally would make
           * every ecosystem save fail with "leverage applies to futures markets
           * only", from a field that is not even on screen.
           */
          ...(isFutures && { futuresLeverage: Number(form.futuresLeverage) }),
          maxDailyVolume: Number(form.maxDailyVolume),
          pauseOnHighVolatility: form.pauseOnHighVolatility,
          volatilityThreshold: Number(form.volatilityThreshold),
        },
      });
    }
    if (dirtyGroups.includes("bias")) {
      requests.push({
        group: "bias",
        url: `/api/admin/ai/market-maker/market/${data.id}/bias`,
        body: {
          marketBias: form.marketBias,
          biasStrength: Number(form.biasStrength),
        },
      });
    }
    if (dirtyGroups.includes("priceMode")) {
      requests.push({
        group: "priceMode",
        url: `/api/admin/ai/market-maker/market/${data.id}/price-mode`,
        body: {
          priceMode: form.priceMode,
          externalSymbol: form.externalSymbol || null,
          correlationStrength: Number(form.correlationStrength),
        },
      });
    }
    if (dirtyGroups.includes("volatility")) {
      requests.push({
        group: "volatility",
        url: `/api/admin/ai/market-maker/market/${data.id}/volatility`,
        body: {
          baseVolatility: Number(form.baseVolatility),
          volatilityMultiplier: Number(form.volatilityMultiplier),
          momentumDecay: Number(form.momentumDecay),
        },
      });
    }
    if (requests.length === 0) return;

    setSaving(true);
    /* Sequential, not `Promise.all`. Each of these reloads the running market
       instance, and firing four config reloads at one engine concurrently is how
       a half-applied config gets loaded. Four requests is also the worst case. */
    const failed: GroupId[] = [];
    const saved: GroupId[] = [];
    for (const request of requests) {
      const { error } = await $fetch({
        url: request.url,
        method: "PUT",
        body: request.body,
        silent: true,
      });
      if (error) {
        failed.push(request.group);
        toast.error(typeof error === "string" ? error : tExtAdminAi("save_failed"));
      } else {
        saved.push(request.group);
      }
    }
    setSaving(false);

    /* Only the groups that actually landed lose their dirty mark. A partial
       failure leaves the failed section still showing as unsaved instead of
       reporting a success the server refused. */
    if (saved.length > 0) {
      setBaseline((prev) => {
        const next = { ...prev };
        for (const group of saved) {
          for (const field of GROUPS[group]) {
            (next as any)[field] = form[field];
          }
        }
        return next;
      });
      if (failed.length === 0) toast.success(tExtAdminAi("save_done"));
      onRefresh();
    }
  };

  const runForcePhase = async () => {
    if (!phaseTarget) return;
    setPhaseRunning(true);
    const { error } = await $fetch({
      url: `/api/admin/ai/market-maker/market/${data.id}/phase`,
      method: "POST",
      body: { targetPhase: phaseTarget },
      silent: true,
    });
    setPhaseRunning(false);
    if (error) {
      toast.error(typeof error === "string" ? error : t("force_phase_failed"));
      return;
    }
    setPhaseTarget(null);
    toast.success(t("force_phase_done"));
    onRefresh();
  };

  const runDelete = async () => {
    setDeleting(true);
    const { error } = await $fetch({
      url: `/api/admin/ai/market-maker/market/${data.id}`,
      method: "DELETE",
      silent: true,
    });
    setDeleting(false);
    if (error) {
      toast.error(typeof error === "string" ? error : t("delete_failed"));
      return;
    }
    toast.success(t("delete_done"));
    // The i18n router, not `window.location`: a full document load throws away
    // the session's client state to reach a page one push would have opened.
    router.push("/admin/ai/market-maker/market");
  };

  const PHASES: MarketPhase[] = [
    "ACCUMULATION",
    "MARKUP",
    "DISTRIBUTION",
    "MARKDOWN",
  ];

  /* Literal keys, never `` t(`phase_${x}`) ``. See the note in MarketOverview:
     a computed key is invisible to the extractor and to the optimizer, and the
     optimizer deletes what it cannot see referenced. */
  const PHASE_LABEL: Record<MarketPhase, string> = {
    ACCUMULATION: t("phase_accumulation"),
    MARKUP: t("phase_markup"),
    DISTRIBUTION: tExt("distribution"),
    MARKDOWN: t("phase_markdown"),
  };

  return (
    <div className="space-y-6 pb-24">
      <div className="grid gap-6 lg:grid-cols-2">
        {/* PRICE --------------------------------------------------------- */}
        <Section
          icon={DollarSign}
          title={tExtAdmin("price_configuration")}
          description={tExtAdmin("set_the_target_price_and_trading_range")}
        >
          <Input
            label={`${tExtAdmin("target")}${quote ? ` (${quote})` : ""}`}
            type="number"
            step="0.000001"
            value={form.targetPrice}
            onChange={(e) => set("targetPrice", e.target.value)}
          />
          <div className="grid gap-4 sm:grid-cols-2">
            <Input
              label={`${tExtAdmin("range_low")}${quote ? ` (${quote})` : ""}`}
              type="number"
              step="0.000001"
              value={form.priceRangeLow}
              onChange={(e) => set("priceRangeLow", e.target.value)}
            />
            <Input
              label={`${tExtAdmin("range_high")}${quote ? ` (${quote})` : ""}`}
              type="number"
              step="0.000001"
              value={form.priceRangeHigh}
              onChange={(e) => set("priceRangeHigh", e.target.value)}
            />
          </div>
          <p className="rounded-md border border-border bg-surface-2 px-3 py-2 text-xs text-muted-foreground">
            {t("range_explainer")}
          </p>
          {rangeAdequacy && rangeAdequacy.adequate === false ? (
            <Notice>
              {t("range_adequacy_warning", {
                sigmas: Number(rangeAdequacy.sigmas ?? 0).toFixed(2),
              })}
            </Notice>
          ) : null}
        </Section>

        {/* TRADING ------------------------------------------------------- */}
        <Section
          icon={Sliders}
          title={tExtAdmin("trading_configuration")}
          description={tExtAdmin("adjust_trading_behavior_and_limits")}
        >
          <Field label={tExtAdmin("aggression_level")}>
            {/* Three options, because the column is an enum of three. */}
            <Choice
              value={form.aggressionLevel}
              onChange={(next) => set("aggressionLevel", next)}
              options={[
                { value: "CONSERVATIVE", label: tExtAdmin("conservative") },
                { value: "MODERATE", label: tCommon("moderate") },
                { value: "AGGRESSIVE", label: tExtAdmin("aggressive") },
              ]}
            />
          </Field>

          <Field
            label={`${tExtAdmin("real_liquidity")} %`}
            value={`${form.realLiquidityPercent}%`}
            hint={t("real_liquidity_hint", {
              real: form.realLiquidityPercent,
              simulated: 100 - form.realLiquidityPercent,
            })}
          >
            <Slider
              value={[form.realLiquidityPercent]}
              onValueChange={([next]) => set("realLiquidityPercent", next)}
              min={0}
              max={100}
              step={1}
              aria-label={`${tExtAdmin("real_liquidity")} %`}
            />
          </Field>

          {/*
            THE REAL DEPTH FLOOR, AND ONLY WHERE IT DOES ANYTHING.

            It applies to an ECOSYSTEM market that FOLLOWS an exchange and posts
            real liquidity, because that is the only combination the top-up runs
            for: an autonomous market keeps the one-hour quote life and was never
            thinned, a futures quote reserves its margin when it is placed, and at
            0% real liquidity there is no real book to keep.

            Hidden rather than disabled, for the same reason as leverage below —
            a greyed-out control still reads as a knob this market has, and an
            operator who sets it on an autonomous market and sees nothing happen
            has been told something false by the UI.
          */}
          {!isFutures &&
          form.realLiquidityPercent > 0 &&
          form.priceMode !== "AUTONOMOUS" ? (
            <Field
              label={tExtAdmin("real_depth_floor")}
              value={
                form.requoteFloorPerSide > 0
                  ? `${form.requoteFloorPerSide} / ${tCommon("side")}`
                  : tCommon("off")
              }
              hint={t("real_depth_floor_hint")}
            >
              <Slider
                value={[form.requoteFloorPerSide]}
                onValueChange={([next]) => set("requoteFloorPerSide", next)}
                min={0}
                max={20}
                step={1}
                aria-label={tExtAdmin("real_depth_floor")}
              />
            </Field>
          ) : null}

          {/*
            LEVERAGE, AND ONLY ON FUTURES.

            There is nothing to leverage on the ecosystem: a maker there funds
            its orders from pool balances rather than posting margin. The field
            is hidden rather than disabled, because a disabled risk control
            still reads as one this market has.
          */}
          {isFutures ? (
            // `Field` carries the hint; `Input` has no such prop. Wrapped rather
            // than widening a primitive used across the whole admin.
            <Field
              label={t("futures_leverage")}
              value={`${form.futuresLeverage}x`}
              hint={t("futures_leverage_hint")}
            >
              <Input
                type="number"
                min={1}
                max={125}
                step="1"
                value={form.futuresLeverage}
                onChange={(e) => set("futuresLeverage", e.target.value)}
                aria-label={t("futures_leverage")}
              />
            </Field>
          ) : null}

          <Input
            label={`${tExtAdmin("max_daily_volume")}${quote ? ` (${quote})` : ""}`}
            type="number"
            value={form.maxDailyVolume}
            onChange={(e) => set("maxDailyVolume", e.target.value)}
          />
        </Section>

        {/* SAFETY -------------------------------------------------------- */}
        <Section
          icon={Shield}
          tone="warning"
          title={tExtAdmin("safety_configuration")}
          description={tExtAdmin("configure_safety_limits_and_automatic_pauses")}
        >
          <div className="flex items-center justify-between gap-4 rounded-md border border-border bg-surface-2 px-4 py-3">
            <div className="min-w-0">
              <p className="text-sm font-medium text-foreground">
                {tExtAdmin("volatility_pause")}
              </p>
              <p className="text-xs text-muted-foreground">
                {tExtAdmin("automatically_pause_trading_during_high_volatility")}
              </p>
            </div>
            {/* Radix `Switch` is a `<button>`: `onCheckedChange`, never
                `onChange` — which is what this was wired with, so the control
                could not be moved at all. */}
            <Switch
              checked={form.pauseOnHighVolatility}
              onCheckedChange={(next) => set("pauseOnHighVolatility", next)}
              aria-label={tExtAdmin("volatility_pause")}
            />
          </div>

          {form.pauseOnHighVolatility ? (
            <Field
              label={tExtAdmin("volatility_threshold")}
              value={`${form.volatilityThreshold}%`}
              hint={t("volatility_threshold_hint", {
                pct: form.volatilityThreshold,
              })}
            >
              <Slider
                value={[form.volatilityThreshold]}
                onValueChange={([next]) => set("volatilityThreshold", next)}
                min={1}
                max={50}
                step={1}
                aria-label={tExtAdmin("volatility_threshold")}
              />
            </Field>
          ) : null}
        </Section>

        {/* VOLATILITY ---------------------------------------------------- */}
        <Section
          icon={Waves}
          title={tCommon("volatility")}
          description={t("volatility_settings_hint")}
        >
          <Field
            label={tExtAdmin("base_volatility")}
            value={`${form.baseVolatility}%`}
            hint={t("base_volatility_hint")}
          >
            <Slider
              value={[form.baseVolatility]}
              onValueChange={([next]) => set("baseVolatility", next)}
              min={0.5}
              max={10}
              step={0.1}
              aria-label={tExtAdmin("base_volatility")}
            />
          </Field>
          <Field
            label={tExtAdmin("volatility_multiplier")}
            value={`${form.volatilityMultiplier}x`}
          >
            <Slider
              value={[form.volatilityMultiplier]}
              onValueChange={([next]) => set("volatilityMultiplier", next)}
              min={0.5}
              max={2}
              step={0.1}
              aria-label={tExtAdmin("volatility_multiplier")}
            />
          </Field>
          <Field
            label={tExtAdmin("momentum_decay")}
            value={form.momentumDecay.toFixed(2)}
            hint={t("momentum_decay_hint")}
          >
            <Slider
              value={[form.momentumDecay]}
              onValueChange={([next]) => set("momentumDecay", next)}
              min={0.8}
              max={0.99}
              step={0.01}
              aria-label={tExtAdmin("momentum_decay")}
            />
          </Field>
        </Section>

        {/* PRICE MODE ---------------------------------------------------- */}
        <Section
          icon={Globe}
          title={tExtAdmin("price_mode")}
          description={t("price_mode_hint")}
        >
          <Choice
            value={form.priceMode}
            onChange={(next) => set("priceMode", next)}
            options={[
              {
                value: "AUTONOMOUS",
                label: t("price_mode_autonomous"),
                hint: t("price_mode_autonomous_short"),
                icon: Compass,
              },
              {
                value: "HYBRID",
                label: t("price_mode_hybrid"),
                hint: tCommon("both"),
                icon: RefreshCw,
              },
              {
                value: "FOLLOW_EXTERNAL",
                label: t("price_mode_follow_external"),
                hint: t("price_mode_follow_external_short"),
                icon: Globe,
              },
            ]}
          />

          {form.priceMode !== "AUTONOMOUS" ? (
            <>
              <Input
                label={tExtAdmin("external_symbol")}
                placeholder="BTC/USDT"
                value={form.externalSymbol}
                onChange={(e) => set("externalSymbol", e.target.value)}
              />
              <Field
                label={tExtAdmin("correlation_strength")}
                value={`${form.correlationStrength}%`}
                /*
                 * The slider sets how FAST the price converges on the reference, not how
                 * CLOSE it ends up — a distinction the 6.0.4 release note got backwards
                 * ("how closely to follow") and that nothing on this screen corrected.
                 * The adjacent Bias Strength field has always carried a hint; this one
                 * shipped with none at all.
                 */
                hint={t("correlation_strength_hint")}
              >
                <Slider
                  value={[form.correlationStrength]}
                  onValueChange={([next]) => set("correlationStrength", next)}
                  min={0}
                  max={100}
                  step={1}
                  aria-label={tExtAdmin("correlation_strength")}
                />
              </Field>

              {/* Is a reference arriving, and is the price actually near it? */}
              {tetherView.hasReference ? (
                <p className="text-xs text-muted-foreground">
                  {t("tether_reference")}:{" "}
                  <span className="font-mono tabular-nums text-foreground">
                    {tetherView.reference}
                  </span>
                  {tetherView.trackingErrorPercent !== null
                    ? ` · ${t("tether_error", {
                        percent: tetherView.trackingErrorPercent.toFixed(2),
                      })}`
                    : ""}
                  {tetherView.halfLifeHours
                    ? ` · ${t("tether_half_life", {
                        hours: tetherView.halfLifeHours.toFixed(0),
                      })}`
                    : ""}
                </p>
              ) : (
                <Notice tone="destructive" title={t("tether_not_receiving")}>
                  {tetherView.message ?? t("tether_status")}
                </Notice>
              )}

              {/*
                * ADRIFT is a fault worth interrupting for — a dead feed, or a symbol
                * mapped to the wrong asset. CONVERGING is normal and is stated without
                * alarm, because a tether is a drift and takes hours, not seconds.
                */}
              {(tetherView.verdict === "ADRIFT" ||
                tetherView.verdict === "REFERENCE_REJECTED") &&
              tetherView.message ? (
                <Notice tone="destructive">{tetherView.message}</Notice>
              ) : tetherView.verdict === "CONVERGING" && tetherView.message ? (
                <p className="text-xs text-muted-foreground">{tetherView.message}</p>
              ) : null}

              {/*
                * The range means something DIFFERENT here, and the operator is editing it
                * two cards away under a label that describes the autonomous reading.
                */}
              <p className="rounded-md border border-border bg-surface-2 px-3 py-2 text-xs text-muted-foreground">
                {t("range_is_tracking_tolerance")}
              </p>
            </>
          ) : null}
        </Section>

        {/* BIAS ---------------------------------------------------------- */}
        <Section
          icon={Compass}
          title={t("market_bias")}
          description={t("market_bias_hint")}
        >
          <Choice
            value={form.marketBias}
            onChange={(next) => set("marketBias", next)}
            options={[
              { value: "BULLISH", label: tCommon("bullish"), icon: TrendingUp },
              { value: "NEUTRAL", label: tCommon("neutral"), icon: Minus },
              { value: "BEARISH", label: tCommon("bearish"), icon: TrendingDown },
            ]}
          />
          <Field
            label={tExtAdmin("bias_strength")}
            value={`${form.biasStrength}%`}
            hint={t("bias_strength_hint")}
          >
            <Slider
              value={[form.biasStrength]}
              onValueChange={([next]) => set("biasStrength", next)}
              min={0}
              max={100}
              step={1}
              aria-label={tExtAdmin("bias_strength")}
            />
          </Field>
        </Section>
      </div>

      {/* OPERATIONS ------------------------------------------------------ */}
      {/* Not part of the form: these take effect immediately and are confirmed
          one at a time, so they must not sit behind the same Save button as a
          slider. */}
      <Section
        icon={Waves}
        title={t("operations")}
        description={t("operations_hint")}
      >
        <div className="space-y-2">
          <p className="text-sm font-medium text-muted-foreground">
            {t("force_phase")}
          </p>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {PHASES.map((phase) => (
              <Button
                key={phase}
                variant="outline"
                size="sm"
                disabled={data.currentPhase === phase || phaseRunning}
                onClick={() => setPhaseTarget(phase)}
              >
                {PHASE_LABEL[phase]}
              </Button>
            ))}
          </div>
          <p className="text-xs text-muted-foreground">{t("force_phase_hint")}</p>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-4 border-t border-border pt-5">
          <div className="min-w-0">
            <p className="text-sm font-medium text-foreground">
              {t("reset_daily_counters")}
            </p>
            <p className="text-xs text-muted-foreground">
              {t("reset_daily_hint")}
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={onResetDaily}>
            <RefreshCw className="h-4 w-4" />
            {t("reset_daily_counters")}
          </Button>
        </div>
      </Section>

      {/* DANGER ---------------------------------------------------------- */}
      <Card tone="destructive">
        <CardHeader padding="md">
          <div className="flex items-center gap-3">
            <span className="grid h-8 w-8 shrink-0 place-items-center rounded-sm bg-destructive/10 text-destructive">
              <AlertOctagon className="h-4 w-4" />
            </span>
            <div>
              <CardTitle className="text-base font-semibold text-destructive">
                {tCommon("danger_zone")}
              </CardTitle>
              <p className="text-xs text-muted-foreground">
                {tExtAdmin("irreversible_actions")}
              </p>
            </div>
          </div>
        </CardHeader>
        <CardContent padding="md">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="min-w-0">
              <p className="text-sm font-medium text-foreground">
                {tExtAdmin("delete_market_maker")}
              </p>
              <p className="text-xs text-muted-foreground">
                {tExtAdmin("permanently_remove_this_market_maker_and")}
              </p>
            </div>
            <Button variant="outline" tone="destructive" onClick={() => setDeleteOpen(true)}>
              <Trash2 className="h-4 w-4" />
              {tCommon("delete")}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* THE ONE SAVE AFFORDANCE ----------------------------------------- */}
      {/* The platform's placement (`SettingsPage`'s floating bar), so a form in
          an addon and a form in core are saved the same way. It appears only
          when something is actually unsaved, and it names how much. */}
      {isDirty ? (
        <div className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2 animate-in fade-in slide-in-from-bottom-2">
          <div className="flex items-center gap-3 rounded-lg border border-border bg-card/95 px-4 py-3 shadow-lg backdrop-blur-xl">
            <span className="flex items-center gap-2 rounded-full bg-warning/10 px-3 py-1.5">
              <span aria-hidden className="h-2 w-2 rounded-full bg-warning" />
              <span className="text-sm font-medium text-warning-ink">
                {tCommon("unsaved_changes")}
              </span>
            </span>
            <span aria-hidden className="h-8 w-px bg-border" />
            <Button variant="ghost" size="sm" onClick={discard} disabled={saving}>
              <RotateCcw className="h-4 w-4" />
              <span className="hidden sm:inline">{tExtAdminAi("discard")}</span>
            </Button>
            <Button size="sm" onClick={handleSave} loading={saving}>
              {!saving ? <Save className="h-4 w-4" /> : null}
              {tCommon("save_changes")}
            </Button>
          </div>
        </div>
      ) : null}

      {/* R6: force-phase names what it overrides. */}
      <AlertDialog
        open={phaseTarget !== null}
        onOpenChange={(open) => {
          if (!open && !phaseRunning) setPhaseTarget(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("force_phase")}</AlertDialogTitle>
            <AlertDialogDescription>
              {phaseTarget
                ? t("force_phase_confirm", {
                    phase: PHASE_LABEL[phaseTarget],
                  })
                : ""}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={phaseRunning}>
              {tCommon("cancel")}
            </AlertDialogCancel>
            <Button onClick={runForcePhase} disabled={phaseRunning}>
              {phaseRunning ? (
                <RefreshCw className="h-4 w-4 animate-spin" />
              ) : (
                <Check className="h-4 w-4" />
              )}
              {t("force_phase")}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog
        open={deleteOpen}
        onOpenChange={(open) => {
          if (!open && !deleting) setDeleteOpen(false);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{tExtAdmin("delete_market_maker")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("delete_confirm", {
                symbol: data.market
                  ? `${data.market.currency}/${data.market.pair}`
                  : t("unlinked_market"),
                bots: Array.isArray(data.bots) ? data.bots.length : 0,
              })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>
              {tCommon("cancel")}
            </AlertDialogCancel>
            <Button variant="destructive" onClick={runDelete} disabled={deleting}>
              {deleting ? (
                <RefreshCw className="h-4 w-4 animate-spin" />
              ) : (
                <Trash2 className="h-4 w-4" />
              )}
              {tCommon("delete")}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default MarketConfig;
