"use client";

import { m } from "framer-motion";
import { Badge } from "@/components/ui/badge";
import { Coins, Landmark, Wifi } from "lucide-react";
import { useTranslations } from "next-intl";
import {
  fadeInUp,
  extractFeeValue,
  extractAmountValue,
  getNetworkDisplayName,
  getNetworkSubtitle,
} from "./deposit-helpers";
import {
  GlassPanel,
  SectionTitle,
  SelectableCard,
} from "../../_components/finance-ui";
import { SkeletonBlock, SkeletonText } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

interface DepositMethodSelectorProps {
  walletType: string;
  selectedCurrency: string;
  depositMethods: any;
  selectedDepositMethod: any;
  loading: boolean;
  onMethodSelect: (method: any) => void;
}

export function DepositMethodSelector({
  walletType,
  selectedCurrency,
  depositMethods,
  selectedDepositMethod,
  loading,
  onMethodSelect,
}: DepositMethodSelectorProps) {
  const t = useTranslations("common");
  const tExtAdmin = useTranslations("ext_admin");

  /**
   * ONE panel. The pending copy is gone.
   * ==========================================================================
   *
   * That copy re-declared `<motion.div {...fadeInUp}><GlassPanel><SectionTitle
   * step={3} …>` — the same three wrappers, retyped — and then diverged from
   * them: it passed a `hint` the settled panel does not have, so the section
   * header was two lines while loading and one line after, and everything below
   * it moved by ~18px. That is the duplicate-drift failure in miniature: the
   * copy was written at the same time as the original and had already stopped
   * agreeing with it.
   *
   * `step={3}` and the title are static. Only the method tiles wait, and they
   * now wait inside the real grid.
   *
   * `if (!depositMethods) return null` is kept but gated on `!loading` —
   * `depositMethods` is undefined for the whole fetch, so on its own it would
   * have collapsed this entire step to nothing and then expanded it to a
   * three-column grid of tiles, moving the confirm button at the bottom of the
   * page by the full height of the panel.
   */
  const isPending =
    loading &&
    (!depositMethods ||
      (Array.isArray(depositMethods) && depositMethods.length === 0));

  if (!isPending && !depositMethods) return null;

  const fiatGateways = walletType === "FIAT" ? (depositMethods as any)?.gateways || [] : [];
  const fiatMethods = walletType === "FIAT" ? (depositMethods as any)?.methods || [] : [];
  const cryptoChains =
    (walletType === "SPOT" || walletType === "ECO") && Array.isArray(depositMethods)
      ? depositMethods
      : [];

  return (
    <m.div {...fadeInUp} data-tour="deposit-method">
      <GlassPanel>
        <SectionTitle step={3} title={t("select_deposit_method")} />

        {/* Six pending tiles in the REAL `grid-cols-1 sm:grid-cols-2
            lg:grid-cols-3` at the real tile size — the 44px logo square and two
            text lines are what a method tile is made of, so the grid's row
            height is the settled one. */}
        {isPending && (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div
                key={`pending-method-${i}`}
                className="rounded-2xl border border-border/70 bg-card/40 p-4 dark:bg-surface-2/40"
              >
                <div className="flex items-center gap-3">
                  <SkeletonBlock className="h-11 w-11 rounded-xl" />
                  <div className="flex-1">
                    <p className="text-sm font-semibold">
                      <SkeletonText placeholder={t("method_name")} />
                    </p>
                    <p className="text-xs text-muted-foreground">
                      <SkeletonText placeholder={t("network_provider")} />
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* FIAT: Payment Gateways */}
        {fiatGateways.length > 0 && (
          <div className="mb-6">
            <div className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-subtle-foreground">
              <Wifi className="h-3.5 w-3.5" />
              {t("payment_gateways")}
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {fiatGateways.map((gateway: any) => (
                <MethodCard
                  key={gateway.id}
                  method={gateway}
                  isSelected={selectedDepositMethod?.id === gateway.id}
                  selectedCurrency={selectedCurrency}
                  onSelect={() => onMethodSelect(gateway)}
                  t={t}
                  tExtAdmin={tExtAdmin}
                />
              ))}
            </div>
          </div>
        )}

        {/* FIAT: Manual Methods */}
        {fiatMethods.length > 0 && (
          <div className="mb-2">
            <div className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-subtle-foreground">
              <Landmark className="h-3.5 w-3.5" />
              {t("manual_transfer_methods")}
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {fiatMethods.map((method: any) => (
                <MethodCard
                  key={method.id}
                  method={method}
                  isManual
                  isSelected={selectedDepositMethod?.id === method.id}
                  selectedCurrency={selectedCurrency}
                  onSelect={() => onMethodSelect(method)}
                  t={t}
                  tExtAdmin={tExtAdmin}
                />
              ))}
            </div>
          </div>
        )}

        {/* SPOT/ECO: Blockchain Networks */}
        {cryptoChains.length > 0 && (
          <div>
            <div className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-subtle-foreground">
              <Coins className="h-3.5 w-3.5" />
              {t("select_blockchain_network")}
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {cryptoChains.map((chain: any) => (
                <SelectableCard
                  key={chain.id}
                  selected={selectedDepositMethod?.id === chain.id}
                  onClick={() => onMethodSelect(chain)}
                  icon={
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-primary-foreground">
                      <Coins className="h-5 w-5" />
                    </div>
                  }
                  title={getNetworkDisplayName(chain)}
                  subtitle={getNetworkSubtitle(chain, selectedCurrency)}
                  badges={
                    <>
                      <Badge variant="outline" className="text-[10px]">
                        {t("fee")}:{" "}
                        {(() => {
                          if (!chain.fee) return `0 ${selectedCurrency}`;
                          if (typeof chain.fee === "object") {
                            return `${chain.fee?.percentage || chain.fee?.min || 0}%`;
                          }
                          return `${chain.fee} ${selectedCurrency}`;
                        })()}
                      </Badge>
                      {(chain.limits?.withdraw?.min || chain.limits?.deposit?.min) && (
                        <Badge variant="outline" className="text-[10px]">
                          {t("min")}:{" "}
                          {extractAmountValue(
                            chain.limits?.withdraw?.min || chain.limits?.deposit?.min,
                            selectedCurrency
                          )}{" "}
                          {selectedCurrency}
                        </Badge>
                      )}
                    </>
                  }
                />
              ))}
            </div>
          </div>
        )}
      </GlassPanel>
    </m.div>
  );
}

function MethodCard({
  method,
  isSelected,
  selectedCurrency,
  onSelect,
  isManual,
  t,
  tExtAdmin,
}: any) {
  const tCommon = useTranslations("common");
  return (
    <SelectableCard
      selected={isSelected}
      onClick={onSelect}
      icon={
        method.image ? (
          <div className="flex h-12 w-12 items-center justify-center overflow-hidden rounded-lg border border-border/70 bg-card p-1">
            <img src={method.image} alt={method.title} className="h-full w-full object-contain" />
          </div>
        ) : (
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary text-primary-foreground">
            <Landmark className="h-5 w-5" />
          </div>
        )
      }
      title={typeof method.title === "string" ? method.title : method.name || tCommon("payment_method")}
      subtitle={
        typeof method.description === "string"
          ? method.description
          : isManual
          ? tCommon("manual_transfer")
          : tCommon("payment_gateway", { title: String(method.title) })
      }
      badges={
        <>
          <Badge variant="outline" className="text-[10px]">
            {(() => {
              try {
                const fixed = extractFeeValue(method.fixedFee, selectedCurrency);
                const pct = extractFeeValue(method.percentageFee, selectedCurrency);
                return `${fixed} + ${pct}% ${tCommon("fee")}`;
              } catch {
                return `${tCommon("fee")} ${tCommon("not_available")}`;
              }
            })()}
          </Badge>
          <Badge variant="secondary" className="text-[10px]">
            {(() => {
              try {
                const min = extractAmountValue(method.minAmount, selectedCurrency);
                const max = extractAmountValue(method.maxAmount, selectedCurrency);
                return `${min} – ${max || "∞"} ${selectedCurrency}`;
              } catch {
                return `${tExtAdmin("amount_range")} ${tCommon("not_available")}`;
              }
            })()}
          </Badge>
        </>
      }
    />
  );
}
