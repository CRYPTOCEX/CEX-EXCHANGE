"use client";

import { m } from "framer-motion";
import { AlertCircle } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useTranslations } from "next-intl";
import { fadeInUp, getWalletIcon } from "./deposit-helpers";
import {
  GlassPanel,
  SectionTitle,
  getWalletTheme,
} from "../../_components/finance-ui";
import { cn } from "@/lib/utils";

interface WalletTypeSelectorProps {
  selectedWalletType: { value: string; label: string } | null;
  onSelect: (wallet: { value: string; label: string }) => void;
  availableWallets: { value: string; label: string }[];
}

export function WalletTypeSelector({
  selectedWalletType,
  onSelect,
  availableWallets,
}: WalletTypeSelectorProps) {
  const t = useTranslations("common");
  const tFinance = useTranslations("finance");

  if (availableWallets.length === 0) {
    return (
      <m.div {...fadeInUp}>
        <GlassPanel>
          <SectionTitle step={1} title={t("select_wallet_type")} />
          <Alert className="border-warning/30 bg-warning/5">
            <AlertCircle className="h-4 w-4 text-warning" />
            <AlertTitle className="text-foreground">
              {t("no_wallets_available")}
            </AlertTitle>
            <AlertDescription className="text-warning">
              {tFinance("no_wallets_available_description")}
            </AlertDescription>
          </Alert>
        </GlassPanel>
      </m.div>
    );
  }

  return (
    <m.div {...fadeInUp} data-tour="deposit-wallet-type">
      <GlassPanel>
        <SectionTitle
          step={1}
          title={t("select_wallet_type")}
          hint={t("choose_where_the_funds_will_arrive")}
        />
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          {availableWallets.map((wallet) => {
            const Icon = getWalletIcon(wallet.value);
            const theme = getWalletTheme(wallet.value);
            const isSelected = selectedWalletType?.value === wallet.value;
            return (
              <m.button
                key={wallet.value}
                whileHover={{ y: -2 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => onSelect(wallet)}
                className={cn(
                  "group relative overflow-hidden rounded-2xl border bg-card/70 p-5 text-left transition-all backdrop-blur-xl",
                  isSelected
                    ? "border-transparent ring-2 ring-primary"
                    : "border-border/70 hover:border-border-strong",
                  ""
                )}
              >
                <div
                  aria-hidden
                  className={cn(
                    "absolute inset-x-0 top-0 h-1",
                    theme.gradient,
                    !isSelected && "opacity-50 group-hover:opacity-100"
                  )}
                />
                <div
                  aria-hidden
                  className={cn(
                    "absolute -right-12 -top-12 h-32 w-32 rounded-full blur-2xl transition-opacity",
                    `bg-linear-to-br ${theme.gradient}`,
                    isSelected ? "opacity-30" : "opacity-10 group-hover:opacity-25"
                  )}
                />
                <div className="relative flex items-center gap-4">
                  <div
                    className={cn(
                      "flex h-12 w-12 items-center justify-center rounded-xl shadow-md text-overlay-foreground",
                      theme.gradient
                    )}
                  >
                    <Icon className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="text-base font-bold text-foreground">
                      {wallet.label}
                    </div>
                    <div className="mt-0.5 text-xs text-subtle-foreground">
                      {wallet.value === "FIAT" && t("cash_cards_bank_wires")}
                      {wallet.value === "SPOT" && t("major_crypto_on_exchange")}
                      {wallet.value === "ECO" && t("native_ecosystem_assets")}
                    </div>
                  </div>
                </div>
              </m.button>
            );
          })}
        </div>
      </GlassPanel>
    </m.div>
  );
}
