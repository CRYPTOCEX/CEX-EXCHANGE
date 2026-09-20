"use client";

import { useEffect, useCallback, useState, useMemo } from "react";
import { useTransferStore } from "@/store/finance/transfer-store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Loader } from "@/components/ui/loader";
import { toast } from "sonner";
import { m, AnimatePresence } from "framer-motion";
import {
  ArrowRight,
  Wallet,
  Users,
  ArrowLeftRight,
  CheckCircle2,
  AlertCircle,
  TrendingUp,
  DollarSign,
  Banknote,
  Coins,
  ChevronRight,
  PartyPopper,
  Copy,
  Search,
  Plus,
  RotateCcw,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { withCurrentLocale } from "@/i18n/routing";
import { useKycGate } from "@/hooks/use-kyc-gate";
import KycRequiredNotice from "@/components/blocks/kyc/kyc-required-notice";
import { walletPrecision } from "@/store/finance/transfer-precision";
import {
  FinanceShell,
  PageHeader,
  GlassPanel,
  SectionTitle,
  SelectableCard,
  CurrencyMark,
  formatNumber,
  getWalletTheme,
} from "../_components/finance-ui";
import { cn } from "@/lib/utils";
import { MoneyFigure } from "@/components/ui/money-figure";
import { TransferVerificationDialog } from "./components/transfer-verification-dialog";

const fadeInUp = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -20 },
  transition: { duration: 0.3 },
};

const scaleIn = {
  initial: { opacity: 0, scale: 0.95 },
  animate: { opacity: 1, scale: 1 },
  exit: { opacity: 0, scale: 0.95 },
  transition: { duration: 0.2 },
};

export function TransferForm() {
  const t = useTranslations("finance");
  const tCommon = useTranslations("common");
  const kycGate = useKycGate("transfer_wallets");
  const {
    transferType,
    setTransferType,
    availableWalletTypes,
    fromWalletType,
    setFromWalletType,
    fromCurrencies,
    fromCurrency,
    setFromCurrency,
    availableToWalletTypes,
    toWalletType,
    setToWalletType,
    toCurrencies,
    toCurrency,
    setToCurrency,
    recipientUuid,
    setRecipientUuid,
    recipientExists,
    recipientValidating,
    amount,
    setAmount,
    availableBalance,
    estimatedReceiveAmount,
    transferFee,
    exchangeRate,
    exchangeRateLoading,
    fromPriceUSD,
    toPriceUSD,
    loading,
    error,
    setError,
    transferSuccess,
    setTransferSuccess,
    fetchWalletTypes,
    fetchFromCurrencies,
    fetchToWalletTypes,
    fetchToCurrencies,
    fetchBalance,
    checkRecipient,
    submitTransfer,
    fetchVerificationPolicy,
    reset,
  } = useTransferStore();

  const [toCurrencySearch, setToCurrencySearch] = useState("");

  const filteredToCurrencies = useMemo(() => {
    if (!toCurrencySearch.trim()) return toCurrencies;
    const term = toCurrencySearch.toLowerCase();
    return toCurrencies.filter(
      (c) => c.value.toLowerCase().includes(term) || c.label.toLowerCase().includes(term)
    );
  }, [toCurrencies, toCurrencySearch]);

  useEffect(() => {
    fetchWalletTypes();
    // Fetched up front so the submit button can divert straight to the prompt
    // instead of round-tripping into a 403 first. The server enforces the policy
    // regardless, so a failed fetch costs a nicer flow, never the protection.
    void fetchVerificationPolicy();
  }, []);

  useEffect(() => {
    if (!recipientUuid.trim()) return;
    const id = setTimeout(() => checkRecipient(recipientUuid), 500);
    return () => clearTimeout(id);
  }, [recipientUuid]);

  const handleFromWalletSelect = useCallback(
    async (walletId: string) => {
      setFromWalletType(walletId);
      await fetchFromCurrencies(walletId);
      if (transferType === "wallet") await fetchToWalletTypes(walletId);
    },
    [transferType]
  );

  const handleFromCurrencySelect = useCallback(
    async (curr: string) => {
      setFromCurrency(curr);
      if (fromWalletType) await fetchBalance(fromWalletType, curr);
    },
    [fromWalletType]
  );

  const handleToWalletSelect = useCallback(
    async (walletId: string) => {
      setToWalletType(walletId);
      setToCurrencySearch("");
      if (fromWalletType) await fetchToCurrencies(fromWalletType, walletId);
    },
    [fromWalletType]
  );

  const handleSubmit = useCallback(async () => {
    try {
      await submitTransfer();
    } catch {
      toast.error(t("transfer_failed_please_try_again"));
    }
  }, [submitTransfer]);

  const getWalletIcon = (walletType: string) => {
    switch (walletType) {
      case "FIAT": return <DollarSign className="h-5 w-5" />;
      case "SPOT": return <Coins className="h-5 w-5" />;
      case "ECO": return <TrendingUp className="h-5 w-5" />;
      case "FUTURES": return <Banknote className="h-5 w-5" />;
      default: return <Wallet className="h-5 w-5" />;
    }
  };

  const isFormValid = () => {
    if (loading || recipientValidating || exchangeRateLoading) return false;
    const basic =
      fromWalletType &&
      fromCurrency &&
      amount > 0 &&
      amount <= availableBalance &&
      !isNaN(amount) &&
      amount !== null &&
      amount !== undefined;
    if (!basic) return false;

    if (transferType === "wallet") {
      if (!toWalletType || !toCurrency || toWalletType === fromWalletType) return false;
      if (fromCurrency !== toCurrency && (!exchangeRate || estimatedReceiveAmount <= 0)) return false;
      return true;
    } else if (transferType === "client") {
      return (
        recipientUuid &&
        recipientUuid.trim().length > 0 &&
        recipientExists === true &&
        !recipientValidating
      );
    }
    return false;
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success(tCommon("copied_to_clipboard"));
  };

  // Money-movement surface: gated at the root so both transfer types (between
  // your own wallets and to another user) sit behind it. No login prompt lives
  // on this page, so "anonymous" renders nothing like "loading" does.
  if (kycGate.state === "loading" || kycGate.state === "anonymous") return null;
  if (!kycGate.allowed) {
    return (
      <FinanceShell maxWidth="narrow">
        <KycRequiredNotice
          feature="transfer_wallets"
          requirement={kycGate.requirement ?? "verification"}
        />
      </FinanceShell>
    );
  }

  // Success state
  if (transferSuccess) {
    const { fromTransfer, toTransfer, fromType, toType, fromCurrency: fc, toCurrency: tc, message } = transferSuccess;
    return (
      <FinanceShell maxWidth="narrow">
        <m.div {...fadeInUp} className="space-y-6 text-center">
          <div className="relative mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-success shadow-lg shadow-success/30">
            <div className="absolute inset-0 animate-ping rounded-full bg-success/20" />
            <CheckCircle2 className="relative h-10 w-10 text-success-foreground" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-foreground">
              {t("transfer_successful")}
            </h1>
            <p className="mt-2 text-sm text-subtle-foreground">
              {message || t("your_transfer_has_been_completed_successfully")}
            </p>
          </div>

          <m.div {...scaleIn}>
            <GlassPanel>
              <SectionTitle icon={PartyPopper} title={t("transfer_details")} />
              <div className="grid gap-4 md:grid-cols-2">
                <TransferDirection
                  direction="from"
                  type={fromType}
                  amount={fromTransfer.amount}
                  currency={fc}
                  status={fromTransfer.status}
                  id={fromTransfer.id}
                  copyToClipboard={copyToClipboard}
                  tCommon={tCommon}
                  t={t}
                />
                <TransferDirection
                  direction="to"
                  type={toType}
                  amount={toTransfer.amount}
                  currency={tc}
                  status={toTransfer.status}
                  id={toTransfer.id}
                  copyToClipboard={copyToClipboard}
                  tCommon={tCommon}
                  t={t}
                />
              </div>

              <Alert className="mt-5 border-success/30 bg-success/5">
                <CheckCircle2 className="h-4 w-4 text-up" />
                <AlertDescription className="text-xs text-success">
                  {t("successfully_transferred")} <strong>{fromTransfer.amount} {fc}</strong>{" "}
                  {tCommon("from_your")} <strong>{fromType}</strong> {tCommon("wallet")}
                  {fc !== tc ? <> {t("and_received")} <strong>{toTransfer.amount} {tc}</strong></> : ""}
                  {" "}{t("in_your")} <strong>{toType}</strong> {tCommon("wallet")}
                </AlertDescription>
              </Alert>

              <div className="mt-5 flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => (window.location.href = withCurrentLocale("/finance/wallet"))}
                  className="h-11 flex-1 gap-1.5"
                >
                  <Wallet className="h-4 w-4" />
                  {t("view_wallets")}
                </Button>
                <Button
                  onClick={() => {
                    setTransferSuccess(null);
                    reset();
                  }}
                  className="h-11 flex-1 gap-1.5 bg-primary text-primary-foreground shadow-md shadow-primary/20"
                >
                  <Plus className="h-4 w-4" />
                  {t("make_another_transfer")}
                </Button>
              </div>
            </GlassPanel>
          </m.div>
        </m.div>
      </FinanceShell>
    );
  }

  return (
    <FinanceShell maxWidth="narrow">
      <PageHeader
        icon={ArrowLeftRight}
        eyebrow="Finance"
        title={t("transfer_funds")}
        description={t("move_funds_between_another_user")}
        actions={
          transferType && (
            <Button variant="ghost" onClick={reset} className="gap-1.5">
              <RotateCcw className="h-4 w-4" />
              {tCommon("start_over")}
            </Button>
          )
        }
      />

      <AnimatePresence>
        {error && (
          <m.div {...fadeInUp} className="mb-5">
            <Alert className="border-destructive/30 bg-destructive/5">
              <AlertCircle className="h-4 w-4 text-down" />
              <AlertTitle className="text-destructive">Error</AlertTitle>
              <AlertDescription className="text-destructive">{error}</AlertDescription>
            </Alert>
          </m.div>
        )}
      </AnimatePresence>

      <div className="space-y-5">
        {/* Transfer type */}
        <m.div {...fadeInUp}>
          <GlassPanel>
            <SectionTitle icon={ArrowLeftRight} title={t("choose_transfer_type")} />
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              <TransferTypeCard
                selected={transferType === "wallet"}
                onClick={async () => await setTransferType("wallet")}
                icon={Wallet}
                title={t("between_wallets")}
                description={t("move_funds_between_your_different_wallet_types")}
                fill="bg-primary"
              />
              <TransferTypeCard
                selected={transferType === "client"}
                onClick={async () => await setTransferType("client")}
                icon={Users}
                title={t("to_another_user")}
                description={t("send_funds_to_another_users_account")}
                fill="bg-primary"
              />
            </div>
          </GlassPanel>
        </m.div>

        {/* From wallet */}
        <AnimatePresence>
          {transferType && (
            <m.div {...fadeInUp}>
              <GlassPanel>
                <SectionTitle step={1} title={t("select_source_wallet")} />
                {availableWalletTypes.length === 0 ? (
                  <Alert className="border-warning/30 bg-warning/5">
                    <AlertCircle className="h-4 w-4 text-warning" />
                    <AlertTitle className="text-foreground">
                      {tCommon("no_wallets_available")}
                    </AlertTitle>
                    <AlertDescription className="text-warning">
                      {t("no_wallets_available_description")}
                    </AlertDescription>
                  </Alert>
                ) : (
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                    {availableWalletTypes.map((w) => (
                      <WalletPill
                        key={w.id}
                        selected={fromWalletType === w.id}
                        onClick={() => handleFromWalletSelect(w.id)}
                        type={w.id}
                        name={w.name}
                        icon={getWalletIcon(w.id)}
                      />
                    ))}
                  </div>
                )}
              </GlassPanel>
            </m.div>
          )}
        </AnimatePresence>

        {/* From currency */}
        <AnimatePresence>
          {fromWalletType && fromCurrencies.length > 0 && (
            <m.div {...fadeInUp}>
              <GlassPanel>
                <SectionTitle step={2} title={tCommon("select_currency")} />
                <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-4">
                  {fromCurrencies.map((c, i) => (
                    <SelectableCard
                      key={`${c.value}-${i}`}
                      selected={fromCurrency === c.value}
                      onClick={() => handleFromCurrencySelect(c.value)}
                      icon={<CurrencyMark code={c.value} size="md" />}
                      title={c.value}
                      subtitle={c.label.split("-")[1]?.trim() || c.label}
                    />
                  ))}
                </div>
              </GlassPanel>
            </m.div>
          )}
        </AnimatePresence>

        {/* Recipient (client) */}
        <AnimatePresence>
          {transferType === "client" && fromCurrency && (
            <m.div {...fadeInUp}>
              <GlassPanel>
                <SectionTitle step={3} title={t("recipient_details")} />
                <div className="relative">
                  <Input
                    placeholder={t("enter_recipient_uuid")}
                    value={recipientUuid}
                    onChange={(e) => setRecipientUuid(e.target.value)}
                    className={cn(
                      "h-12 pr-10",
                      recipientExists === true && "border-success",
                      recipientExists === false && "border-destructive"
                    )}
                  />
                  <div className="absolute right-3 top-1/2 -translate-y-1/2">
                    {recipientValidating && <Loader size="sm" />}
                    {recipientExists === true && <CheckCircle2 className="h-5 w-5 text-up" />}
                    {recipientExists === false && !recipientValidating && (
                      <AlertCircle className="h-5 w-5 text-down" />
                    )}
                  </div>
                </div>
                {recipientExists === true && (
                  <p className="mt-2 text-xs font-medium text-up">
                    ✓ {t("recipient_found_and_verified")}
                  </p>
                )}
                {recipientExists === false && (
                  <p className="mt-2 text-xs font-medium text-down">
                    ✗ {t("recipient_not_found")}
                  </p>
                )}
              </GlassPanel>
            </m.div>
          )}
        </AnimatePresence>

        {/* Destination wallet */}
        <AnimatePresence>
          {transferType === "wallet" && fromCurrency && availableToWalletTypes.length > 0 && (
            <m.div {...fadeInUp}>
              <GlassPanel>
                <SectionTitle step={3} title={t("select_destination_wallet")} />
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                  {availableToWalletTypes.map((w) => (
                    <WalletPill
                      key={w.id}
                      selected={toWalletType === w.id}
                      onClick={() => handleToWalletSelect(w.id)}
                      type={w.id}
                      name={w.name}
                      icon={getWalletIcon(w.id)}
                    />
                  ))}
                </div>
              </GlassPanel>
            </m.div>
          )}
        </AnimatePresence>

        {/* To currency */}
        <AnimatePresence>
          {transferType === "wallet" && toWalletType && toCurrencies.length > 0 && (
            <m.div {...fadeInUp}>
              <GlassPanel>
                <SectionTitle
                  step={4}
                  title={t("select_target_currency")}
                  trailing={
                    <div className="relative w-full max-w-xs">
                      <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        placeholder={`${tCommon("search_currencies")}…`}
                        value={toCurrencySearch}
                        onChange={(e) => setToCurrencySearch(e.target.value)}
                        className="pl-9 text-sm"
                      />
                    </div>
                  }
                />
                <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-4">
                  {filteredToCurrencies.map((c, i) => (
                    <SelectableCard
                      key={`${c.value}-${i}`}
                      selected={toCurrency === c.value}
                      onClick={() => setToCurrency(c.value)}
                      icon={<CurrencyMark code={c.value} size="md" />}
                      title={c.value}
                      subtitle={c.label.split("-")[1]?.trim() || c.label}
                    />
                  ))}
                </div>
                {filteredToCurrencies.length === 0 && toCurrencySearch && (
                  <div className="mt-4 rounded-2xl border border-dashed border-border bg-card/40 p-6 text-center text-sm text-subtle-foreground dark:bg-surface-2/40">
                    {tCommon("no_currencies_found")} "{toCurrencySearch}"
                  </div>
                )}
              </GlassPanel>
            </m.div>
          )}
        </AnimatePresence>

        {/* Amount + summary */}
        <AnimatePresence>
          {((transferType === "wallet" && toCurrency) || (transferType === "client" && recipientExists)) && (
            <m.div {...fadeInUp}>
              <GlassPanel>
                <SectionTitle step={transferType === "wallet" ? 5 : 4} title={t("transfer_details")} />

                <div className="space-y-5">
                  <div>
                    <div className="mb-2 flex items-center justify-between">
                      <label className="block text-xs font-semibold uppercase tracking-wider text-subtle-foreground">
                        {tCommon("amount")}
                      </label>
                      {availableBalance > 0 && (
                        <button
                          onClick={() => setAmount(availableBalance)}
                          className="text-xs font-semibold text-primary hover:underline"
                        >
                          {tCommon("max")}
                        </button>
                      )}
                    </div>
                    <div className="relative">
                      <Input
                        type="number"
                        placeholder="0.00"
                        value={amount || ""}
                        onChange={(e) => {
                          const value = e.target.value;
                          if (value === "" || value === "0") {
                            setAmount(0);
                            return;
                          }
                          const numValue = parseFloat(value);
                          if (isNaN(numValue) || numValue < 0) return;
                          const decimalPlaces = (value.split(".")[1] || "").length;
                          const maxDecimals = fromWalletType === "FIAT" ? 2 : 8;
                          if (decimalPlaces <= maxDecimals) setAmount(numValue);
                        }}
                        min="0"
                        step={fromWalletType === "FIAT" ? "0.01" : "0.00000001"}
                        className="h-14 pr-20 text-2xl font-bold tabular-nums"
                      />
                      <div className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-sm font-bold text-subtle-foreground">
                        {fromCurrency}
                      </div>
                    </div>
                    {availableBalance > 0 && (
                      <div className="mt-2 text-xs text-subtle-foreground">
                        {tCommon("available")}{" "}
                        <strong className="tabular-nums text-foreground">
                          <MoneyFigure
                            value={`${formatNumber(availableBalance, { decimals: 8 })} ${fromCurrency}`}
                          />
                        </strong>
                      </div>
                    )}
                  </div>

                  {amount > 0 && (
                    <m.div {...scaleIn} className="space-y-3">
                      <div className="space-y-2 rounded-2xl border border-border/70 bg-muted/70 p-4 dark:bg-surface-2/40">
                        <h4 className="text-xs font-semibold uppercase tracking-wider text-subtle-foreground">
                          {t("transfer_summary")}
                        </h4>
                        <Row label={tCommon("amount")}>
                          <MoneyFigure value={`${amount} ${fromCurrency}`} />
                        </Row>
                        {transferFee > 0 && (
                          <Row label={t("transfer_fee")}>
                            <span className="text-warning">
                              {/* At the SOURCE wallet's precision, not cents. A 0.005 BTC
                                  fee rendered `0.01` here and a 0.00001 BTC fee rendered
                                  `0.00` — the second one also suppressed this whole row,
                                  because the guard above is `transferFee > 0`. */}
                              <MoneyFigure
                                value={`${transferFee.toFixed(walletPrecision(fromWalletType))} ${fromCurrency}`}
                              />
                            </span>
                          </Row>
                        )}
                        {transferType === "wallet" && fromCurrency !== toCurrency && (
                          <>
                            {exchangeRateLoading ? (
                              <div className="flex items-center justify-center gap-2 py-2 text-xs text-subtle-foreground">
                                <Loader size="sm" /> {t("fetching_exchange_rate") || `${t("fetching_exchange_rate")}…`}
                              </div>
                            ) : exchangeRate && exchangeRate !== 1 ? (
                              <>
                                <Row label="Rate">
                                  1 {fromCurrency} ={" "}
                                  {exchangeRate < 0.01 ? exchangeRate.toFixed(8) : exchangeRate.toFixed(2)} {toCurrency}
                                </Row>
                                {fromPriceUSD && (
                                  <Row label={t("price", { fromCurrency: String(fromCurrency) })}>
                                    <span className="text-xs text-subtle-foreground">
                                      ${fromPriceUSD < 0.01 ? fromPriceUSD.toFixed(8) : fromPriceUSD.toFixed(2)}
                                    </span>
                                  </Row>
                                )}
                                {toPriceUSD && (
                                  <Row label={t("price", { toCurrency: String(toCurrency) })}>
                                    <span className="text-xs text-subtle-foreground">
                                      ${toPriceUSD < 0.01 ? toPriceUSD.toFixed(8) : toPriceUSD.toFixed(2)}
                                    </span>
                                  </Row>
                                )}
                              </>
                            ) : null}
                          </>
                        )}

                        <div className="my-1 border-t border-border" />
                        <div className="flex items-center justify-between rounded-xl bg-success/5 px-3 py-2.5">
                          <span className="text-sm font-bold text-muted-foreground">
                            {t("recipient_receives")}
                          </span>
                          {exchangeRateLoading ? (
                            <span className="text-xs italic text-subtle-foreground">
                              {t("calculating") || `${t("calculating")}…`}
                            </span>
                          ) : (
                            <span className="text-base font-bold tabular-nums text-up">
                              {/* The same-currency and client-transfer branches used to
                                  hardcode 2 decimals, so moving 0.001 BTC to another user
                                  read "Recipient receives 0.00 BTC". Only the
                                  cross-currency branch ever asked what the asset was. */}
                              {estimatedReceiveAmount.toFixed(
                                walletPrecision(
                                  transferType === "wallet" && fromCurrency !== toCurrency
                                    ? toWalletType
                                    : fromWalletType
                                )
                              )}{" "}
                              {transferType === "wallet" ? toCurrency : fromCurrency}
                            </span>
                          )}
                        </div>
                      </div>

                      <Alert className="border-info/30 bg-info/10">
                        <ArrowLeftRight className="h-4 w-4 text-primary" />
                        <AlertDescription className="text-xs text-primary">
                          {transferType === "wallet" ? (
                            <>
                              {tCommon("transfer")} <strong>{amount} {fromCurrency}</strong> {tCommon("from_your")}{" "}
                              <Badge variant="secondary" className="mx-0.5 text-[10px]">
                                {availableWalletTypes.find((w) => w.id === fromWalletType)?.name}
                              </Badge>{" "}
                              {t("wallet_to_your")}{" "}
                              <Badge variant="secondary" className="mx-0.5 text-[10px]">
                                {availableToWalletTypes.find((w) => w.id === toWalletType)?.name}
                              </Badge>{" "}
                              {tCommon("wallet")}
                            </>
                          ) : (
                            <>
                              {tCommon("send")} <strong>{amount} {fromCurrency}</strong> {tCommon("from_your")}{" "}
                              <Badge variant="secondary" className="mx-0.5 text-[10px]">
                                {availableWalletTypes.find((w) => w.id === fromWalletType)?.name}
                              </Badge>{" "}
                              {t("wallet_to_user")}{" "}
                              <Badge variant="secondary" className="mx-0.5 text-[10px]">
                                {recipientUuid}
                              </Badge>
                            </>
                          )}
                        </AlertDescription>
                      </Alert>
                    </m.div>
                  )}

                  <Button
                    onClick={handleSubmit}
                    disabled={!isFormValid() || loading}
                    className="h-12 w-full bg-primary text-base font-semibold text-primary-foreground shadow-lg shadow-primary/20"
                    size="lg"
                  >
                    {loading ? (
                      <>
                        <Loader size="sm" className="mr-2" />
                        {t("processing_transfer")}
                      </>
                    ) : (
                      <>
                        {t("complete_transfer")}
                        <ChevronRight className="ml-2 h-5 w-5" />
                      </>
                    )}
                  </Button>
                </div>
              </GlassPanel>
            </m.div>
          )}
        </AnimatePresence>
      </div>

      {/* Opens itself off store state when the policy demands a credential, and
          resumes the transfer once one is accepted. */}
      <TransferVerificationDialog />
    </FinanceShell>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3 text-sm">
      <span className="text-xs font-medium text-subtle-foreground">{label}</span>
      <div className="text-sm font-semibold text-foreground">{children}</div>
    </div>
  );
}

function TransferTypeCard({
  selected,
  onClick,
  icon: Icon,
  title,
  description,
  fill,
}: {
  selected: boolean;
  onClick: () => void;
  icon: any;
  title: string;
  description: string;
  /**
   * A flat `bg-*` fill class for the accent rule, the bloom and the icon tile.
   *
   * It was `gradient` and the two call sites disagreed about what that meant —
   * one passed `"bg-primary"` and the other `"from-primary to-primary"`. Both
   * rendered flat `--primary` by different accidents (a `bg-gradient-*` with no
   * stops is dropped by the browser; two identical stops are a solid fill), so
   * the gradient never existed. R3: elevation and accent are flat surfaces.
   */
  fill: string;
}) {
  return (
    <m.button
      whileHover={{ y: -2 }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className={cn(
        "group relative overflow-hidden rounded-2xl border bg-card/70 p-5 text-left backdrop-blur-xl transition-all",
        selected
          ? "border-transparent ring-2 ring-primary"
          : "border-border/70 hover:border-border-strong"
      )}
    >
      <div className={cn("absolute inset-x-0 top-0 h-1", fill)} />
      <div
        aria-hidden
        className={cn(
          "absolute -right-12 -top-12 h-32 w-32 rounded-full blur-2xl transition-opacity",
          fill,
          selected ? "opacity-30" : "opacity-10 group-hover:opacity-25"
        )}
      />
      <div className="relative flex items-center gap-4">
        <div className={cn("flex h-12 w-12 items-center justify-center rounded-xl text-primary-foreground shadow-md", fill)}>
          <Icon className="h-5 w-5" />
        </div>
        <div className="min-w-0">
          <div className="text-base font-bold text-foreground">{title}</div>
          <div className="mt-0.5 text-xs text-subtle-foreground">{description}</div>
        </div>
      </div>
    </m.button>
  );
}

function WalletPill({
  selected,
  onClick,
  type,
  name,
  icon,
}: {
  selected: boolean;
  onClick: () => void;
  type: string;
  name: string;
  icon: React.ReactNode;
}) {
  const theme = getWalletTheme(type);
  return (
    <m.button
      whileHover={{ y: -2 }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className={cn(
        "group relative flex flex-col items-center justify-center gap-2 overflow-hidden rounded-2xl border p-4 text-center transition-all",
        selected
          ? "border-primary bg-primary/5 ring-2 ring-primary/20"
          : "border-border/70 bg-card/60 hover:border-border-strong"
      )}
    >
      <div className={cn("flex h-11 w-11 items-center justify-center rounded-xl text-primary-foreground shadow-md", theme.gradient)}>
        {icon}
      </div>
      <div className="text-sm font-semibold text-foreground">{name}</div>
    </m.button>
  );
}

function TransferDirection({
  direction,
  type,
  amount,
  currency,
  status,
  id,
  copyToClipboard,
  tCommon,
  t,
}: any) {
  const tFinance = useTranslations("finance");
  return (
    <div className="rounded-2xl border border-border/70 bg-card/60 p-4 dark:bg-surface-2/40">
      <h3 className="mb-3 flex items-center gap-2 text-sm font-bold text-foreground">
        <ArrowRight className={cn("h-4 w-4", direction === "from" && "rotate-180")} />
        {direction === "from" ? tCommon("from") : tCommon("to")} {type} {tCommon("wallet")}
      </h3>
      <div className="space-y-2">
        <div className="flex justify-between text-sm">
          <span className="text-subtle-foreground">{tCommon("amount")}</span>
          <span
            className={cn(
              "font-semibold tabular-nums",
              direction === "from" ? "text-down" : "text-up"
            )}
          >
            <MoneyFigure value={`${direction === "from" ? "−" : "+"}${amount} ${currency}`} />
          </span>
        </div>
        <div className="flex items-center justify-between text-sm">
          <span className="text-subtle-foreground">{tCommon("status")}</span>
          <Badge variant={status === "COMPLETED" ? "default" : "secondary"} className="text-[10px]">
            {status}
          </Badge>
        </div>
        <div className="flex items-center justify-between text-sm">
          <span className="text-subtle-foreground">{tFinance("transfer_id")}</span>
          <div className="flex items-center gap-1.5">
            <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs bg-muted text-muted-foreground">
              {id.slice(0, 8)}
            </code>
            <button
              onClick={() => copyToClipboard(id)}
              className="flex h-6 w-6 items-center justify-center rounded-lg border border-border bg-card text-subtle-foreground hover:bg-muted"
            >
              <Copy className="h-3 w-3" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
