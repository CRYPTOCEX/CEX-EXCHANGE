"use client";

/**
 * Fee calculator — rebuilt on the Obsidian landing kit.
 *
 * The panel used to be a translucent `bg-card/90` plate over a `blur-xl`
 * accent glow, inside a second `rounded-3xl` radius, with `backdrop-blur-sm`
 * on top. Three separate ways of faking elevation stacked on one box (R3), and
 * the translucency is what made it hard to read: an alpha fill composites onto
 * whatever the page ground happens to be behind it, so the "You charge" strip
 * sat on a colour that is neither `--card` nor `--surface-2` and every label on
 * it measured differently from the same label elsewhere on the page.
 *
 * It is now one opaque `Panel` — a hairline and one step up the ramp, which is
 * what every other section on this page uses — with the figures on the next
 * rung. Radii come from the ramp (`rounded-lg`), not from `2xl`/`3xl`.
 */

import { useState, useMemo } from "react";
import { Calculator, DollarSign, Percent, ArrowRight, Check } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { Loadable } from "@/components/ui/skeleton";
import { Panel, Section, SectionHeading } from "@/components/landing";
import { useTranslations } from "next-intl";

interface FeeStructure {
  type: string;
  percentage: number;
  fixed: number;
  example: {
    amount: number;
    fee: number;
    netAmount: number;
  };
}

interface FeeCalculatorSectionProps {
  feeStructure: FeeStructure;
  isLoading?: boolean;
}

const MAX_AMOUNT = 10000;
const SLIDER_MAX = 1000;

export default function FeeCalculatorSection({
  feeStructure,
  isLoading,
}: FeeCalculatorSectionProps) {
  const t = useTranslations("ext_gateway");
  const tExt = useTranslations("ext");
  const tCommon = useTranslations("common");
  const [amount, setAmount] = useState(100);

  const calculation = useMemo(() => {
    const percentage = feeStructure?.percentage || 2.9;
    const fixed = feeStructure?.fixed || 0.3;
    const fee = amount * (percentage / 100) + fixed;
    /**
     * A fee floor of $0.30 on a $0 payment nets -$0.30, and the panel used to
     * print it: "You receive -$0.30". Nobody is charged for taking nothing, so
     * the net is clamped at zero rather than rendering a negative payout.
     */
    const netAmount = Math.max(0, amount - fee);
    return {
      fee: Math.round(fee * 100) / 100,
      netAmount: Math.round(netAmount * 100) / 100,
      percentage,
      fixed,
    };
  }, [amount, feeStructure]);

  const money = (value: number) =>
    value.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  /**
   * There is no `if (isLoading) return <a different Section/>` here any more.
   *
   * It was a Panel of three grey bars and a bar where the heading goes — a
   * second tree, and one that did not resemble the first: it dropped the
   * eyebrow, the subtitle, the amount label, the slider, its two end captions
   * and the three benefit lines, then swapped the lot for the real section.
   * Every one of those is a translated literal that needs no fetch.
   *
   * What is actually unknown here is TWO NUMBERS — the percentage and the fixed
   * fee — plus the two results derived from them. Note that they cannot simply
   * be printed while pending either: `calculation` falls back to 2.9% + $0.30,
   * so an unresolved fee structure rendered a plausible, specific, possibly
   * wrong price. On a pricing calculator that is worse than a placeholder.
   */
  return (
    <Section bordered>
      <SectionHeading
        eyebrow={t("transparent_pricing")}
        eyebrowIcon={Calculator}
        title={`${t("simple")}, ${t("predictable_fees")}`}
        highlight={t("predictable_fees")}
        subtitle={t("no_hidden_fees_description")}
      />

      <Panel className="mx-auto max-w-3xl p-6 sm:p-8">
        {/* Rate. Two figures and the word between them, on the ramp rather
            than on an accent tint — the accent stays on the digits. */}
        <div className="flex flex-wrap items-center justify-center gap-2 sm:gap-3">
          <span className="inline-flex items-center gap-2 rounded-lg border border-border bg-surface-2 px-3 py-1.5">
            <Percent className="h-3.5 w-3.5 text-primary" />
            <span className="font-mono text-sm font-semibold tabular-nums text-primary">
              <Loadable loading={!!isLoading} placeholder="2.9">
                {calculation.percentage}
              </Loadable>
              %
            </span>
          </span>
          <span className="text-sm text-muted-foreground">+</span>
          <span className="inline-flex items-center gap-2 rounded-lg border border-border bg-surface-2 px-3 py-1.5">
            <DollarSign className="h-3.5 w-3.5 text-primary" />
            <span className="font-mono text-sm font-semibold tabular-nums text-primary">
              $
              <Loadable loading={!!isLoading} placeholder="0.30">
                {calculation.fixed.toFixed(2)}
              </Loadable>
            </span>
          </span>
          <span className="text-sm text-muted-foreground">{tExt("per_transaction")}</span>
        </div>

        {/* Amount */}
        <div className="mt-8">
          <label
            htmlFor="fee-calculator-amount"
            className="mb-2 block text-xs font-semibold uppercase tracking-wider text-muted-foreground"
          >
            {t("payment_amount")}
          </label>
          <div className="relative">
            <DollarSign className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              id="fee-calculator-amount"
              type="number"
              value={amount}
              onChange={(e) =>
                setAmount(Math.min(MAX_AMOUNT, Math.max(0, Number(e.target.value) || 0)))
              }
              className="h-12 pl-9 font-mono text-lg font-semibold tabular-nums"
              min={0}
              max={MAX_AMOUNT}
            />
          </div>
          {/* The slider stops at $1,000 while the field accepts $10,000, so a
              typed amount above the track pins the handle at the far end
              instead of appearing to reset it. */}
          <Slider
            value={[Math.min(amount, SLIDER_MAX)]}
            onValueChange={([value]) => setAmount(value)}
            min={0}
            max={SLIDER_MAX}
            step={10}
            className="mt-5"
            aria-label={t("payment_amount")}
          />
          <div className="mt-2 flex justify-between font-mono text-[11px] tabular-nums text-subtle-foreground">
            <span>$0</span>
            <span>${SLIDER_MAX.toLocaleString("en-US")}</span>
          </div>
        </div>

        {/* Result. One rung up, hairline dividers between the three cells —
            the arrow is the relationship, so it does not need a box. */}
        <div className="mt-8 grid grid-cols-3 divide-x divide-border rounded-lg border border-border bg-surface-2">
          <div className="min-w-0 px-3 py-5 text-center sm:px-5">
            <p className="truncate text-xs font-medium uppercase tracking-wide text-muted-foreground">
              {t("you_charge")}
            </p>
            <p className="mt-1.5 truncate font-mono text-xl font-semibold tabular-nums text-foreground sm:text-2xl">
              ${money(amount)}
            </p>
          </div>
          <div className="flex min-w-0 flex-col items-center justify-center px-2 py-5">
            <ArrowRight className="h-4 w-4 shrink-0 text-subtle-foreground" />
            <p className="mt-1.5 max-w-full truncate font-mono text-xs tabular-nums text-muted-foreground">
              {tExt("fee_1")}
              <Loadable loading={!!isLoading} placeholder="3.20">
                {money(calculation.fee)}
              </Loadable>
            </p>
          </div>
          <div className="min-w-0 px-3 py-5 text-center sm:px-5">
            <p className="truncate text-xs font-medium uppercase tracking-wide text-muted-foreground">
              {tCommon("you_receive")}
            </p>
            <p className="mt-1.5 truncate font-mono text-xl font-semibold tabular-nums text-primary sm:text-2xl">
              $
              <Loadable loading={!!isLoading} placeholder="96.80">
                {money(calculation.netAmount)}
              </Loadable>
            </p>
          </div>
        </div>

        {/* Reassurance. Icon carries the accent, the label stays ink (R2). */}
        <ul className="mt-6 flex flex-wrap justify-center gap-x-6 gap-y-2">
          {[t("no_setup_fees"), t("no_monthly_fees"), t("no_hidden_charges")].map((benefit) => (
            <li key={benefit} className="flex items-center gap-2 text-sm text-muted-foreground">
              <Check className="h-4 w-4 shrink-0 text-primary" />
              {benefit}
            </li>
          ))}
        </ul>
      </Panel>
    </Section>
  );
}
