"use client";

/**
 * THE STEP THAT CLOSED THE HASH-THEFT HOLE.
 *
 * The spot deposit screen used to show the platform's shared exchange address
 * immediately and ask for a transaction hash afterwards. That address is public
 * — every depositor sees the same one — and the claim route bound a hash to
 * WHOEVER pasted it first, so anyone watching the address on chain could claim
 * a stranger's deposit and the real sender was told "Transaction already
 * exists" (plans/done/SPOT-DEPOSIT-MODES.md §Why).
 *
 * A credit now needs an INTENT THAT PREDATES THE DEPOSIT, and this is where the
 * customer creates one. What it asks for depends on the mode:
 *
 *   hash_claim / amount_match  the amount, because that is what the deposit is
 *                              later checked against (A) or matched by (B).
 *   ecosystem_custody          nothing: the address is the customer's own, so
 *                              there is nothing to disambiguate. One button.
 *
 * The custody case has a fallback that only the SERVER can decide: a network
 * with no ecosystem chain, no listed token, or an exchange address carrying a
 * tag falls back to amount_match (D2). The client cannot know which, so it asks
 * with no amount, and when the server refuses for want of one it re-renders
 * with the amount field and says why. That is one extra click on the networks
 * that fall back, and zero on the ones that do not.
 */

import { useState } from "react";
import { m } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AlertCircle, ArrowRight, ChevronLeft, Info, Wallet } from "lucide-react";
import { useTranslations } from "next-intl";
import { fadeInUp } from "../deposit-helpers";
import { GlassPanel, SectionTitle } from "../../../_components/finance-ui";
import type { SpotDepositMode } from "./intent-utils";

export function SpotDeclareStep({
  mode,
  currency,
  network,
  minimum,
  needsAmount,
  fellBackFromCustody,
  loading,
  error,
  onSubmit,
  onBack,
}: {
  /** The mode the platform will most likely create the intent in. */
  mode: SpotDepositMode;
  currency: string;
  network: string;
  /** The network's minimum deposit, when the exchange published one. */
  minimum?: number | null;
  /** True once the server has told us this network needs an amount after all. */
  needsAmount: boolean;
  /** True when that answer came back on an ecosystem-custody install (D2). */
  fellBackFromCustody: boolean;
  loading: boolean;
  error?: string | null;
  onSubmit: (amount: string | null) => void;
  onBack: () => void;
}) {
  const t = useTranslations("common");
  const [amount, setAmount] = useState("");
  const [touched, setTouched] = useState(false);

  const asksForAmount = mode !== "ecosystem_custody" || needsAmount;
  const parsed = Number(amount);
  const amountIsValid = amount.trim() !== "" && Number.isFinite(parsed) && parsed > 0;
  const belowMinimum =
    amountIsValid && typeof minimum === "number" && minimum > 0 && parsed < minimum;

  const submit = () => {
    setTouched(true);
    if (asksForAmount && (!amountIsValid || belowMinimum)) return;
    onSubmit(asksForAmount ? amount.trim() : null);
  };

  const hint =
    mode === "ecosystem_custody" && !needsAmount
      ? t("spot_deposit_declare_custody_hint")
      : mode === "amount_match" || needsAmount
        ? t("spot_deposit_declare_amount_hint")
        : t("spot_deposit_declare_hash_hint");

  return (
    <m.div {...fadeInUp}>
      <GlassPanel>
        <SectionTitle
          icon={asksForAmount ? Wallet : Info}
          title={
            asksForAmount ? t("spot_deposit_declare_title") : t("spot_deposit_declare_title_custody")
          }
          hint={`${currency} · ${network}`}
        />

        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">{hint}</p>

          {fellBackFromCustody && needsAmount && (
            <div className="flex items-start gap-2 rounded-xl border border-warning/25 bg-warning/5 p-3 text-xs text-warning-ink">
              <Info className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{t("spot_deposit_custody_fallback")}</span>
            </div>
          )}

          {asksForAmount && (
            <div className="space-y-2">
              <label
                htmlFor="spot-deposit-amount"
                className="block text-xs font-semibold uppercase tracking-wider text-subtle-foreground"
              >
                {t("spot_deposit_amount_label")} <span className="text-down">*</span>
              </label>
              <div className="flex items-center gap-2">
                <Input
                  id="spot-deposit-amount"
                  type="number"
                  inputMode="decimal"
                  step="any"
                  min={0}
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") submit();
                  }}
                  placeholder="0.00"
                  className="h-[calc(2.75rem*var(--control-height-scale))] flex-1 font-mono text-sm"
                  disabled={loading}
                />
                <div className="shrink-0 rounded-xl border border-border/70 bg-muted px-3 py-2.5 text-sm font-semibold text-muted-foreground dark:bg-surface-2/70">
                  {currency}
                </div>
              </div>
              {typeof minimum === "number" && minimum > 0 && (
                <p className="text-xs text-subtle-foreground">
                  {t("minimum")}: {minimum} {currency}
                </p>
              )}
              {touched && !amountIsValid && (
                <p className="text-xs text-destructive">{t("spot_deposit_amount_required")}</p>
              )}
              {touched && belowMinimum && (
                <p className="text-xs text-destructive">
                  {t("minimum")}: {minimum} {currency}
                </p>
              )}
            </div>
          )}

          {error && (
            <div className="flex items-start gap-2 rounded-xl border border-destructive/30 bg-destructive/5 p-3 text-xs text-destructive-ink">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              <div>
                <div className="font-semibold">{t("spot_deposit_intent_failed")}</div>
                <div className="mt-0.5">{error}</div>
              </div>
            </div>
          )}

          <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
            <Button variant="ghost" onClick={onBack} disabled={loading} className="gap-1.5">
              <ChevronLeft className="h-4 w-4" />
              {t("back_to_networks")}
            </Button>
            <Button onClick={submit} loading={loading} className="h-[calc(2.75rem*var(--control-height-scale))] gap-2 sm:min-w-[220px]">
              {!loading && <ArrowRight className="h-4 w-4" />}
              {asksForAmount ? t("continue") : t("spot_deposit_show_my_address")}
            </Button>
          </div>
        </div>
      </GlassPanel>
    </m.div>
  );
}
