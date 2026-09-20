"use client";

import { useEffect, useState, useCallback } from "react";
import { asJsonArray } from "@/lib/json-column";
import { useWithdrawStore } from "@/store/finance/withdraw-store";
import { useKycGate } from "@/hooks/use-kyc-gate";
import { FEATURE_MESSAGES } from "@/config/kyc-features";
import { useWalletStore } from "@/store/finance/wallet-store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Loader } from "@/components/ui/loader";
import { toast } from "sonner";
import { m, AnimatePresence } from "framer-motion";
import {
  Wallet,
  CheckCircle2,
  AlertCircle,
  Send,
  Building,
  CreditCard,
  Landmark,
  ChevronRight,
  Info,
  ArrowUpFromLine,
  RotateCcw,
  History,
  Plus,
  ShieldAlert,
} from "lucide-react";
import { useConfigStore } from "@/store/config";
import { useRouter } from "@/i18n/routing";
import { useSearchParams } from "next/navigation";
import { $fetch } from "@/lib/api";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useTranslations } from "next-intl";
import {
  maxWithdrawable as computeMaxWithdrawable,
  withdrawFigures,
  type WithdrawWalletKind,
} from "./fees";
import {
  countDecimals,
  getCurrencyPrecision,
  validateDecimalPrecision,
} from "@/lib/precision-utils";
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
import { SkeletonBlock, SkeletonText } from "@/components/ui/skeleton";
import { fadeInUp } from "../deposit/components/deposit-helpers";
import { WithdrawTwoFactorDialog } from "./components/withdraw-2fa-dialog";

export function WithdrawForm() {
  const t = useTranslations("finance");
  const tCommon = useTranslations("common");
  const searchParams = useSearchParams();
  const initialType = searchParams?.get("type");
  const initialCurrency = searchParams?.get("currency");
  const { settings, extensions } = useConfigStore();
  const router = useRouter();
  const kycGate = useKycGate("withdraw_wallet");

  const [precisionError, setPrecisionError] = useState<string | null>(null);

  const {
    walletType,
    currency,
    amount,
    network,
    withdrawMethod,
    customFields,
    memo,
    withdrawalMethods,
    isLoading,
    isSubmitting,
    error,
    success,
    setWalletType,
    setCurrency,
    setAmount,
    setNetwork,
    setWithdrawMethod,
    setCustomFields,
    setMemo,
    fetchWithdrawalMethods,
    submitWithdrawal,
    reset,
    twoFactorPolicy,
    fetchTwoFactorPolicy,
  } = useWithdrawStore();

  // Coins/chains that require a destination tag or memo. The withdrawal-method
  // metadata currently doesn't expose a `requiresMemo` flag, so we gate on the
  // selected currency ticker. Matches XRP, XLM, EOS, ATOM, HBAR, plus BNB on
  // the Beacon Chain (BEP2) — a BNB withdrawal on BEP20/BSC does NOT need a
  // memo, so we combine currency + chain for BNB.
  const MEMO_REQUIRED_CURRENCIES = new Set([
    "XRP",
    "XLM",
    "EOS",
    "ATOM",
    "HBAR",
  ]);

  const requiresMemo = (() => {
    if (!currency) return false;
    const upper = currency.toUpperCase();
    if (MEMO_REQUIRED_CURRENCIES.has(upper)) return true;
    // BNB only needs a memo on BEP2 (Beacon Chain), not BEP20/BSC.
    if (upper === "BNB") {
      const method = withdrawalMethods.find((m) => m.id === withdrawMethod);
      const chain = (method?.network || method?.chain || network || "")
        .toString()
        .toUpperCase();
      return chain.includes("BEP2") && !chain.includes("BEP20");
    }
    return false;
  })();

  const {
    fetchWallets,
    fetchWallet,
    wallet,
    fiatWallets,
    spotWallets,
    ecoWallets,
  } = useWalletStore();

  const [availableCurrencies, setAvailableCurrencies] = useState<any[]>([]);
  const [isFetchingCurrencies, setIsFetchingCurrencies] = useState(false);
  const [walletTypesWithBalance, setWalletTypesWithBalance] = useState<Set<string>>(new Set());
  const [maxWithdrawable, setMaxWithdrawable] = useState<any>(null);
  const [isFetchingMax, setIsFetchingMax] = useState(false);

  const checkAvailableWalletTypes = useCallback(async () => {
    const isSpotEnabled = settings?.spotWallets === true || settings?.spotWallets === "true";
    const isFiatEnabled = settings?.fiatWallets === true || settings?.fiatWallets === "true";
    const isEcosystemEnabled = extensions?.includes("ecosystem");

    const walletTypes: string[] = [];
    if (isFiatEnabled) walletTypes.push("FIAT");
    if (isSpotEnabled) walletTypes.push("SPOT");
    if (isEcosystemEnabled) walletTypes.push("ECO");

    const availableTypes = new Set<string>();
    for (const type of walletTypes) {
      try {
        const { data, error } = await $fetch({
          url: `/api/finance/currency?action=withdraw&walletType=${type}`,
          silent: true,
        });
        if (!error && data && data.length > 0) availableTypes.add(type);
      } catch {
        /* One unreachable wallet type must not hide the others: skip it and
           keep probing the rest of the list. */
      }
    }
    setWalletTypesWithBalance(availableTypes);
  }, [settings, extensions]);

  useEffect(() => {
    reset();
    fetchWallets();
    checkAvailableWalletTypes();
    // Ask the backend what it will actually enforce, so a user who cannot
    // withdraw learns why before filling in the whole form.
    fetchTwoFactorPolicy();
    if (initialType && initialType.toUpperCase() !== "FUTURES") {
      setWalletType(initialType.toUpperCase());
    }
  }, [reset, fetchWallets, checkAvailableWalletTypes, fetchTwoFactorPolicy, initialType, setWalletType]);

  // 2FA enrollment gate: blocks the form outright (a code challenge, by
  // contrast, is handled at submit time by the verification dialog).
  const twoFactorBlocked = Boolean(twoFactorPolicy && !twoFactorPolicy.satisfied);
  const twoFactorBlockedReason = (() => {
    if (!twoFactorBlocked || !twoFactorPolicy) return null;
    const labels: Record<string, string> = {
      APP: "authenticator app",
      EMAIL: "email",
      SMS: "SMS",
    };
    const accepted = twoFactorPolicy.acceptedTypes
      .map((type) => labels[type] || type)
      .join(", ");
    if (twoFactorPolicy.userEnabled && twoFactorPolicy.userType) {
      return `Withdrawals require ${accepted} two-factor authentication. Your account currently uses ${
        labels[twoFactorPolicy.userType] || twoFactorPolicy.userType
      } 2FA.`;
    }
    return `Withdrawals require two-factor authentication (${accepted}). Enable it to protect and unlock withdrawals.`;
  })();

  // KYC gate, expressed as a disabled-button reason rather than a full-page
  // notice — this form is the authoritative withdraw surface and the user has
  // already picked a wallet/currency by the time it matters. The copy is taken
  // from FEATURE_MESSAGES so it matches KycRequiredNotice word for word, and
  // the "needs_level" branch never tells an already-approved user to complete
  // verification. `state` is "allowed" whenever enforcement is off, so this is
  // silent on platforms that do not enforce per-feature KYC.
  const kycBlockedReason = (() => {
    const copy = FEATURE_MESSAGES["withdraw_wallet"];
    switch (kycGate.state) {
      case "loading":
      case "anonymous":
        // Not a KYC problem — a login one. Keep the form closed until we know
        // who this is, which is what the old `user`-less check did too.
        return "Please log in to continue";
      case "needs_kyc":
        return copy.description;
      case "needs_level":
        return `${copy.title} is not available on your current verification level. Complete a higher verification level, or contact support if you believe this is an error.`;
      default:
        return null;
    }
  })();

  const fetchCurrencies = useCallback(async (type: string) => {
    if (!type) return;
    setIsFetchingCurrencies(true);
    try {
      const { data, error } = await $fetch({
        url: `/api/finance/currency?action=withdraw&walletType=${type}`,
        silent: true,
      });
      if (!error && data) setAvailableCurrencies(data);
      else setAvailableCurrencies([]);
    } catch {
      setAvailableCurrencies([]);
    } finally {
      setIsFetchingCurrencies(false);
    }
  }, []);

  useEffect(() => {
    if (walletType && walletType !== "FUTURES") {
      fetchCurrencies(walletType);
      const wallets = walletType === "FIAT" ? fiatWallets || [] : walletType === "SPOT" ? spotWallets || [] : ecoWallets || [];
      if (initialCurrency && wallets.some((w: any) => w.currency === initialCurrency.toUpperCase())) {
        setCurrency(initialCurrency.toUpperCase());
      }
    }
  }, [walletType, fiatWallets, spotWallets, ecoWallets, initialCurrency, setCurrency, fetchCurrencies]);

  const fetchMaxWithdrawable = useCallback(async () => {
    if (!walletType || !currency || !withdrawMethod) return;
    const method = withdrawalMethods.find((m) => m.id === withdrawMethod);
    if (!method) return;
    const chain = method.network || method.id;
    // Every ECO chain: the endpoint carries the network fee quote for EVM
    // tokens (charged on top of the amount) as well as the UTXO maximum.
    if (walletType !== "ECO") {
      setMaxWithdrawable(null);
      return;
    }
    setIsFetchingMax(true);
    try {
      const { data, error } = await $fetch({
        url: `/api/ecosystem/withdraw/max?currency=${currency}&chain=${chain}`,
        silent: true,
      });
      if (!error && data) setMaxWithdrawable(data);
      else setMaxWithdrawable(null);
    } catch {
      setMaxWithdrawable(null);
    } finally {
      setIsFetchingMax(false);
    }
  }, [walletType, currency, withdrawMethod, withdrawalMethods]);

  useEffect(() => {
    if (walletType && currency) {
      fetchWallet(walletType, currency);
      fetchWithdrawalMethods();
    }
  }, [walletType, currency, fetchWallet, fetchWithdrawalMethods]);

  useEffect(() => {
    if (walletType && currency && withdrawMethod) fetchMaxWithdrawable();
  }, [walletType, currency, withdrawMethod, fetchMaxWithdrawable]);

  const getMethodIcon = (methodType: string) => {
    switch (methodType?.toLowerCase()) {
      case "bank": return <Landmark className="h-5 w-5" />;
      case "card": return <CreditCard className="h-5 w-5" />;
      case "crypto": return <Send className="h-5 w-5" />;
      default: return <Wallet className="h-5 w-5" />;
    }
  };

  const handleMaxAmount = () => {
    if (maxWithdrawable && maxWithdrawable.maxAmount > 0) {
      const method = withdrawalMethods.find((m) => m.id === withdrawMethod);
      const selectedNetwork = method?.network || network;
      const maxPrecision = getCurrencyPrecision(currency, selectedNetwork);
      setAmount(maxWithdrawable.maxAmount.toFixed(maxPrecision));
      setPrecisionError(null);
      return;
    }
    if (wallet && wallet.balance) {
      /*
        `balance − fixedFee` is what this used to be, and on SPOT and ECO the
        fee is charged ON TOP of the amount rather than netted from it — so the
        server requires `balance ≥ amount + fee` and this button proposed an
        amount guaranteed to be refused with `400 Insufficient funds`. The one
        control whose entire job is to name a valid amount could not.

        `computeMaxWithdrawable` solves the inequality per wallet type and
        rounds DOWN, because rounding up reintroduces the refusal at the last
        decimal place.
      */
      const maxAmount = computeMaxWithdrawable(Number(wallet.balance), feeInputs);
      setAmount(maxAmount.toFixed(feeInputs.precision));
      setPrecisionError(null);
    }
  };

  /**
   * THE FEE INPUTS, ASSEMBLED ONCE — including the one the form never read.
   *
   * `spotWithdrawFee` is a platform SETTING that the SPOT route adds to the
   * currency's own percentage (`withdraw/spot/index.post.ts:274`). The form did
   * not know it existed, so a customer withdrawing 1 ETH read "you'll receive
   * 0.995" and had 1.01 taken. Settings are TEXT rows, hence the string type.
   */
  const feeInputs = (() => {
    const method = withdrawalMethods.find((m) => m.id === withdrawMethod);
    const selectedNetwork = method?.network || network;
    return {
      kind: (walletType || "SPOT") as WithdrawWalletKind,
      fixedFee: method?.fixedFee || 0,
      percentageFee: method?.percentageFee || 0,
      platformPercentageFee: (settings as any)?.spotWithdrawFee ?? null,
      chainFeePaidByPlatform:
        (settings as any)?.withdrawChainFee === true ||
        (settings as any)?.withdrawChainFee === "true",
      precision: getCurrencyPrecision(currency, selectedNetwork),
      networkFee: walletType === "ECO" ? maxWithdrawable?.estimatedNetworkFee ?? 0 : 0,
    };
  })();

  /**
   * What this withdrawal costs, per the wallet type's own backend route.
   *
   * Replaces a single `fixedFee + amount × percentageFee / 100` that matched
   * none of the three routes — see `./fees.ts` for the arithmetic each one
   * actually performs and what the mismatch cost.
   */
  const figures = withdrawFigures({ ...feeInputs, amount: Number(amount) || 0 });

  const getNetworkFee = () => figures.internalFee + figures.externalFee;

  const getEstimatedTime = () => {
    const method = withdrawalMethods.find((m) => m.id === withdrawMethod);
    return method?.processingTime || "5-30 min";
  };

  const getMinWithdrawalAmount = () => {
    const method = withdrawalMethods.find((m) => m.id === withdrawMethod);
    /*
      `method.minAmount` IS THE MINIMUM, AND IT IS COMPARED AGAINST THE GROSS.

      This grossed it up — `(minAmount + fixedFee) / (1 − pct/100)` — on the
      theory that the minimum applies to what the customer RECEIVES. It does
      not: every route checks the typed amount directly
      (`withdraw/fiat/index.post.ts:193`, `withdraw/spot/index.post.ts:203`).
      With `minAmount 10`, `fixedFee 1`, `percentageFee 2` the form advertised
      *Min: 11.2245 USD* and kept the button disabled below it, on a server that
      accepts 10.
    */
    if (method && method.minAmount) return method.minAmount;
    return 1;
  };

  const getMinAmount = () => getMinWithdrawalAmount().toString();

  const handleSetMinAmount = () => setAmount(getMinWithdrawalAmount().toString());

  const getMaxAmount = () => {
    const method = withdrawalMethods.find((m) => m.id === withdrawMethod);
    return method?.maxAmount || null;
  };

  const getDisabledReason = () => {
    if (twoFactorBlocked) return twoFactorBlockedReason;
    if (kycBlockedReason) return kycBlockedReason;
    if (!amount || Number(amount) <= 0) return "Enter valid amount";
    if (precisionError) return "Fix decimal precision error";

    /*
      THE GUARD HAS TO COVER THE FEE, BECAUSE THE SERVER'S DOES.

      This compared the AMOUNT against the balance, while SPOT and ECO require
      `balance ≥ amount + fee` (`withdraw/spot/index.post.ts:310`,
      `ecosystem/withdraw/index.post.ts:574`). So the form enabled the button on
      an amount the server was always going to refuse, and the customer met the
      limit as a `400` after pressing Withdraw rather than as a disabled button
      with a reason on it.

      `wallet.balance` is a DECIMAL(36,18) STRING off the wire; `Number()` here
      is what stops `"100" > 100` from being a string comparison.
    */
    let balance = 0;
    if (wallet && wallet.balance !== undefined) balance = Number(wallet.balance) || 0;
    if (figures.totalDebited > balance) return "Insufficient balance";

    const minAmount = getMinAmount();
    if (minAmount && Number(amount) < Number(minAmount))
      return `Minimum amount: ${minAmount} ${currency}`;

    const maxAmount = getMaxAmount();
    if (maxAmount && Number(amount) > maxAmount)
      return `Maximum amount: ${maxAmount} ${currency}`;

    if (walletType !== "FIAT" && !withdrawMethod) return "Please select a withdrawal method";

    const method = withdrawalMethods.find((m) => m.id === withdrawMethod);
    if (method?.customFields) {
      // `asJsonArray`, not JSON.parse: this property arrives as an ARRAY from
      // the FIAT branch and as a STRING from the crypto one, and parsing the
      // array threw — the catch then returned "Invalid method configuration"
      // and BLOCKED the withdrawal for every fiat method with a required field.
      for (const field of asJsonArray<any>(method.customFields)) {
        if (field.required && !customFields[field.name])
          return `${field.title || field.name} is required`;
      }
    }

    // Memo / destination-tag validation for memo-required coins.
    if (requiresMemo && (!memo || !memo.trim())) {
      return `Memo / destination tag is required for ${currency}`;
    }
    return null;
  };

  const handleWalletTypeSelect = (type: string) => {
    setWalletType(type);
    setAvailableCurrencies([]);
  };

  // ─── Success state
  if (success) {
    return (
      <FinanceShell maxWidth="narrow">
        <m.div {...fadeInUp} className="space-y-6 text-center">
          <div className="relative mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-success shadow-lg shadow-success/30">
            <div className="absolute inset-0 animate-ping rounded-full bg-success/20" />
            <CheckCircle2 className="relative h-10 w-10 text-success-foreground" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-foreground">
              {tCommon("withdrawal_submitted")}
            </h1>
            <p className="mt-2 text-sm text-subtle-foreground">
              {t("your_withdrawal_request_processed_soon")}
            </p>
          </div>

          <GlassPanel>
            <SectionTitle title={tCommon("withdrawal_details")} />
            <div className="space-y-2">
              <Row label={tCommon("amount")}>
                <span className="font-bold text-down">
                  −{amount} {currency}
                </span>
              </Row>
              <Row label={tCommon("wallet")}>{walletType}</Row>
              <Row label={tCommon("method")}>
                {withdrawalMethods.find((m) => m.id === withdrawMethod)?.title}
              </Row>
              {settings?.withdrawProcessingTime !== "false" && (
                <Row label={t("estimated_time")}>{getEstimatedTime()}</Row>
              )}
            </div>
            <div className="mt-5 flex gap-2">
              <Button
                variant="outline"
                onClick={() => router.push("/finance/history")}
                className="h-11 flex-1 gap-1.5"
              >
                <History className="h-4 w-4" />
                {tCommon("view_history")}
              </Button>
              <Button
                onClick={reset}
                className="h-11 flex-1 gap-1.5 bg-primary text-primary-foreground shadow-md shadow-primary/20"
              >
                <Plus className="h-4 w-4" />
                {t("make_another_withdrawal")}
              </Button>
            </div>
          </GlassPanel>
        </m.div>
      </FinanceShell>
    );
  }

  /**
   * "No withdrawal methods available" — resolved, and there really are none.
   *
   * `!isLoading` here is the fix rather than the defect: `withdrawalMethods` is
   * `[]` for the whole lookup, so without it every customer who picks a
   * currency is told for a beat that they cannot withdraw it at all — on the
   * page whose entire purpose is getting their money out. The pending panel
   * directly below (`currency && isLoading && …`) is what occupies the slot
   * meanwhile, so this alert and that panel are mutually exclusive by
   * construction and the step keeps a box in every state.
   *
   * Named so the distinction is stated where a reader looks for it.
   */
  const showNoWithdrawalMethods =
    Boolean(currency) && withdrawalMethods.length === 0 && !isLoading;

  return (
    <FinanceShell maxWidth="narrow">
      <PageHeader
        icon={ArrowUpFromLine}
        eyebrow="Finance"
        title={tCommon("withdraw_funds")}
        description={t("withdraw_your_funds_preferred_destination")}
        actions={
          <Button variant="ghost" onClick={reset} className="gap-1.5">
            <RotateCcw className="h-4 w-4" />
            {tCommon("start_over")}
          </Button>
        }
      />

      {/* Step-up verification prompt. Renders nothing unless the admin has
          enabled per-withdrawal 2FA and the store has opened it. */}
      <WithdrawTwoFactorDialog />

      <AnimatePresence>
        {twoFactorBlocked && (
          <m.div {...fadeInUp} className="mb-5">
            <Alert className="border-warning/30 bg-warning/5">
              <ShieldAlert className="h-4 w-4 text-warning" />
              <AlertTitle className="text-warning">
                {t("two_factor_required_to_withdraw")}
              </AlertTitle>
              <AlertDescription className="text-warning">
                <span>{twoFactorBlockedReason}</span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => router.push("/user/profile?tab=security")}
                  className="mt-3 gap-1.5"
                >
                  <ShieldAlert className="h-3.5 w-3.5" />
                  {tCommon("set_up_2fa")}
                </Button>
              </AlertDescription>
            </Alert>
          </m.div>
        )}
      </AnimatePresence>

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
        {/* Step 1: Wallet type */}
        <m.div {...fadeInUp}>
          {/* The only rung on this page that exists before the customer has
              answered anything, and it carried no anchor — so the walkthrough
              opened with nothing to point at and every later stop pointed at a
              rung that had not been revealed yet. */}
          <GlassPanel data-tour="withdraw-wallet-type">
            <SectionTitle step={1} title={tCommon("select_wallet_type")} hint={t("where_to_withdraw_from")} />
            {walletTypesWithBalance.size === 0 ? (
              <Alert className="border-warning/30 bg-warning/5">
                <AlertCircle className="h-4 w-4 text-warning" />
                <AlertTitle className="text-warning">
                  {tCommon("no_wallets_available")}
                </AlertTitle>
                <AlertDescription className="text-warning">
                  {t("you_dont_have_any")}
                </AlertDescription>
              </Alert>
            ) : (
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                {[
                  { value: "FIAT", label: tCommon("fiat") },
                  { value: "SPOT", label: tCommon("spot") },
                  { value: "ECO", label: tCommon("eco") },
                ]
                  .filter((w) => walletTypesWithBalance.has(w.value))
                  .map((w) => {
                    const theme = getWalletTheme(w.value);
                    const selected = walletType === w.value;
                    return (
                      <m.button
                        key={w.value}
                        whileHover={{ y: -2 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => handleWalletTypeSelect(w.value)}
                        className={cn(
                          "group relative overflow-hidden rounded-2xl border bg-card/70 p-5 text-left backdrop-blur-xl transition-all",
                          selected
                            ? "border-transparent ring-2 ring-primary"
                            : "border-border/70 hover:border-border-strong",
                          ""
                        )}
                      >
                        <div className={cn("absolute inset-x-0 top-0 h-1", theme.gradient)} />
                        <div className="relative flex items-center gap-3">
                          <div
                            className={cn(
                              "flex h-12 w-12 items-center justify-center rounded-xl text-overlay-foreground shadow-md",
                              theme.gradient
                            )}
                          >
                            <Wallet className="h-5 w-5" />
                          </div>
                          <div>
                            <div className="text-base font-bold text-foreground">{w.label}</div>
                            <div className="mt-0.5 text-xs text-subtle-foreground">
                              {w.value === "FIAT" && t("to_bank_account")}
                              {w.value === "SPOT" && t("send_to_crypto_address")}
                              {w.value === "ECO" && t("network_withdraw")}
                            </div>
                          </div>
                        </div>
                      </m.button>
                    );
                  })}
              </div>
            )}
          </GlassPanel>
        </m.div>

        {/* Step 2: Currency */}
        <AnimatePresence>
          {walletType && availableCurrencies.length === 0 && !isFetchingCurrencies && (
            <m.div {...fadeInUp}>
              <Alert className="border-warning/30 bg-warning/5">
                <AlertCircle className="h-4 w-4 text-warning" />
                <AlertTitle className="text-warning">
                  {tCommon("no_currencies_available")}
                </AlertTitle>
                <AlertDescription className="text-warning">
                  {t("no_currencies_with_balance_available_in")} {walletType.toLowerCase()} {tCommon("wallet")}
                </AlertDescription>
              </Alert>
            </m.div>
          )}
          {walletType && availableCurrencies.length > 0 && (
            <m.div {...fadeInUp}>
              <GlassPanel data-tour="withdraw-currency">
                <SectionTitle
                  step={2}
                  title={tCommon("select_currency")}
                  hint={t("available", { length: availableCurrencies.length })}
                  trailing={isFetchingCurrencies ? <Loader size="sm" /> : null}
                />
                <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-4">
                  {availableCurrencies.filter(Boolean).map((curr: any, idx: number) => {
                    const code = curr.value || curr.name || curr.currency || `currency-${idx}`;
                    const label = curr.label || curr.name || code;
                    const icon = curr.icon || null;
                    const chain = curr.chain || null;
                    if (!code || code === `currency-${idx}`) return null;

                    let balance = 0;
                    if (curr.balance !== undefined) balance = parseFloat(curr.balance) || 0;
                    else if (label && typeof label === "string" && label.includes("-")) {
                      const balanceFromLabel = label.split("-")[1];
                      balance = balanceFromLabel ? parseFloat(balanceFromLabel.trim()) : 0;
                    }

                    const isEcoToken = curr.type === "NATIVE" || curr.type === "BEP20" || curr.chain;
                    const selected = currency === code;

                    return (
                      <SelectableCard
                        key={code}
                        selected={selected}
                        onClick={() => setCurrency(code)}
                        icon={<CurrencyMark code={code} icon={icon} size="md" />}
                        title={
                          <div className="flex items-baseline gap-1.5">
                            {code}
                            {chain && (
                              <span className="text-[10px] font-normal text-muted-foreground">
                                ({chain})
                              </span>
                            )}
                          </div>
                        }
                        subtitle={
                          isEcoToken && balance === 0
                            ? t("available_for_withdrawal")
                            : `${tCommon("balance")} ${formatNumber(balance, { decimals: 6 })}`
                        }
                      />
                    );
                  })}
                </div>
              </GlassPanel>
            </m.div>
          )}
        </AnimatePresence>

        {/* Step 3: Method */}
        <AnimatePresence>
          {showNoWithdrawalMethods && (
            <m.div {...fadeInUp}>
              <Alert className="border-warning/30 bg-warning/5">
                <AlertCircle className="h-4 w-4 text-warning" />
                <AlertTitle className="text-warning">
                  {t("no_withdrawal_methods_available")}
                </AlertTitle>
                <AlertDescription className="text-warning">
                  {t("no_withdrawal_methods_available_for")} {currency}
                </AlertDescription>
              </Alert>
            </m.div>
          )}
          {/* Step 3 while the methods are in flight.
              `withdrawalMethods.length > 0` alone meant this whole panel — a
              `GlassPanel` with a section title and a two-column grid of
              destination tiles, ~200px — did not exist during the fetch and
              then appeared, pushing the amount step and the confirm button
              down by its full height. The step number, the title and the hint
              are static; the tiles are what waits. The "no methods available"
              alert above keeps its own `!isLoading` guard, so an account with
              genuinely no destinations still gets the warning and not a
              permanent placeholder. */}
          {currency && isLoading && withdrawalMethods.length === 0 && (
            <m.div {...fadeInUp}>
              <GlassPanel>
                <SectionTitle step={3} title={t("select_withdrawal_method")} hint={t("pick_your_preferred_destination")} />
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  {[0, 1, 2, 3].map((i) => (
                    <div
                      key={`pending-withdraw-method-${i}`}
                      className="rounded-2xl border border-border/70 bg-card/40 p-4 dark:bg-surface-2/40"
                    >
                      <div className="flex items-center gap-3">
                        <SkeletonBlock className="h-10 w-10 rounded-xl" />
                        <div className="flex-1">
                          <p className="text-sm font-semibold">
                            <SkeletonText placeholder="Destination" />
                          </p>
                          <p className="text-xs text-muted-foreground">
                            <SkeletonText placeholder={tCommon("network_provider")} />
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </GlassPanel>
            </m.div>
          )}
          {currency && withdrawalMethods.length > 0 && (
            <m.div {...fadeInUp}>
              <GlassPanel data-tour="withdraw-method">
                <SectionTitle step={3} title={t("select_withdrawal_method")} hint={t("pick_your_preferred_destination")} />
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  {withdrawalMethods.map((method: any) => (
                    <SelectableCard
                      key={method.id}
                      selected={withdrawMethod === method.id}
                      onClick={() => {
                        setWithdrawMethod(method.id);
                        if (walletType === "SPOT" || walletType === "ECO") {
                          setNetwork(method.network || method.id);
                        }
                      }}
                      icon={
                        method.image ? (
                          <div className="flex h-12 w-12 items-center justify-center overflow-hidden rounded-lg border border-border/70 bg-card p-1">
                            <img src={method.image} alt={method.title} className="h-full w-full object-contain" />
                          </div>
                        ) : (
                          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary text-primary-foreground">
                            {getMethodIcon("payment")}
                          </div>
                        )
                      }
                      title={method.title}
                      subtitle={method.minAmount && method.maxAmount ? `${method.minAmount} – ${method.maxAmount} ${currency}` : ""}
                      badges={
                        <>
                          {method.processingTime && (
                            <Badge variant="outline" className="text-[10px]">
                              {method.processingTime}
                            </Badge>
                          )}
                          {method.fixedFee > 0 || method.percentageFee > 0 ? (
                            <Badge variant="outline" className="text-[10px]">
                              {method.fixedFee > 0 && `${method.fixedFee} ${currency}`}
                              {method.percentageFee > 0 && `${method.fixedFee > 0 ? " + " : ""}${method.percentageFee}%`}
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="text-[10px] text-up">
                              {tCommon("free")}
                            </Badge>
                          )}
                        </>
                      }
                    />
                  ))}
                </div>
              </GlassPanel>
            </m.div>
          )}
        </AnimatePresence>

        {/* Step 4: Details */}
        <AnimatePresence>
          {withdrawMethod && (
            <m.div {...fadeInUp}>
              <GlassPanel>
                <SectionTitle step={4} title={t("enter_details")} hint={t("amount_and_destination")} />

                <div className="space-y-5">
                  {/* Amount */}
                  <div>
                    <div className="mb-2 flex items-center justify-between">
                      <label className="block text-xs font-semibold uppercase tracking-wider text-subtle-foreground">
                        {tCommon("withdrawal_amount")}
                      </label>
                      <div className="flex items-center gap-2 text-xs">
                        <button
                          type="button"
                          onClick={handleSetMinAmount}
                          className="font-semibold text-primary hover:underline"
                        >
                          {t("set_min")}
                        </button>
                        <span className="text-muted-foreground">|</span>
                        <button
                          type="button"
                          onClick={handleMaxAmount}
                          className="font-semibold text-primary hover:underline"
                        >
                          {t("use_max")}
                        </button>
                      </div>
                    </div>
                    <div className="relative">
                      <Input
                        data-tour="withdraw-amount"
                        type="number"
                        placeholder="0.00"
                        value={amount || ""}
                        onChange={(e) => {
                          const value = e.target.value;
                          if (precisionError) setPrecisionError(null);
                          if (value === "" || value === "0") {
                            setAmount(value);
                            return;
                          }
                          const numValue = parseFloat(value);
                          if (isNaN(numValue) || numValue < 0) return;
                          const method = withdrawalMethods.find((m) => m.id === withdrawMethod);
                          const selectedNetwork = method?.network || network;
                          const maxPrecision = getCurrencyPrecision(currency, selectedNetwork);
                          const validation = validateDecimalPrecision(value, maxPrecision);
                          if (!validation.isValid) {
                            setPrecisionError(
                              `${currency} on ${selectedNetwork || "this network"} supports max ${validation.maxDecimals} decimals (you entered ${validation.actualDecimals}).`
                            );
                            return;
                          }
                          setPrecisionError(null);
                          setAmount(value);
                        }}
                        min="0"
                        step="0.00000001"
                        className={cn(
                          "h-14 pr-20 text-2xl font-bold tabular-nums",
                          precisionError && "border-destructive"
                        )}
                      />
                      <div className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-sm font-bold text-subtle-foreground">
                        {currency}
                      </div>
                    </div>
                    {precisionError && (
                      <Alert className="mt-2 border-destructive/30 bg-destructive/5">
                        <AlertCircle className="h-4 w-4 text-down" />
                        <AlertDescription className="text-xs text-destructive">
                          {precisionError}
                        </AlertDescription>
                      </Alert>
                    )}
                    <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-xs text-subtle-foreground">
                      <span>
                        {tCommon("available")}{" "}
                        <strong className="text-foreground tabular-nums">
                          {(() => {
                            const curr = availableCurrencies.find(
                              (c) => (c.value || c.name || c.currency) === currency
                            );
                            if (curr) {
                              if (curr.balance !== undefined) return parseFloat(curr.balance).toFixed(8);
                              if (curr.label && curr.label.includes("-")) {
                                const balanceFromLabel = curr.label.split("-")[1];
                                const balance = balanceFromLabel ? parseFloat(balanceFromLabel) : 0;
                                return balance.toFixed(8);
                              }
                            }
                            return wallet?.balance?.toFixed(8) || "0.00000000";
                          })()}{" "}
                          {currency}
                        </strong>
                      </span>
                      <span>
                        {tCommon("min")}: <strong className="text-foreground tabular-nums">{getMinAmount()} {currency}</strong>
                        {getMaxAmount() && (
                          <>
                            {" • "}{tCommon("max")}: <strong className="text-foreground text-foreground tabular-nums">{getMaxAmount()} {currency}</strong>
                          </>
                        )}
                      </span>
                    </div>

                    {maxWithdrawable && maxWithdrawable.isUtxoChain && (
                      <Alert className="mt-3 border-info/30 bg-info/10">
                        <Info className="h-4 w-4 text-primary" />
                        <AlertDescription className="text-xs text-primary">
                          {isFetchingMax ? (
                            <span className="flex items-center gap-2">
                              <Loader size="sm" /> {t("calculating_maximum_withdrawable_amount")}…
                            </span>
                          ) : maxWithdrawable.maxAmount > 0 ? (
                            <>
                              <strong>{t("maximum_you_can_withdraw")}:</strong> {maxWithdrawable.maxAmount.toFixed(8)} {currency}
                              <div className="mt-1 opacity-75">
                                {t("after_platform_fee")}: {maxWithdrawable.platformFee.toFixed(8)} {currency}
                              </div>
                            </>
                          ) : (
                            <span className="text-down">
                              <strong>{t("cannot_withdraw")}:</strong> {maxWithdrawable.utxoInfo?.reason || tCommon("insufficient_funds")}
                            </span>
                          )}
                        </AlertDescription>
                      </Alert>
                    )}
                  </div>

                  {/* Method instructions */}
                  {(() => {
                    const method = withdrawalMethods.find((m) => m.id === withdrawMethod);
                    if (method?.instructions) {
                      return (
                        <Alert className="border-info/30 bg-info/10">
                          <Info className="h-4 w-4 text-primary" />
                          <AlertDescription className="text-xs text-primary">
                            <strong>{tCommon("instructions")}</strong> {method.instructions}
                          </AlertDescription>
                        </Alert>
                      );
                    }
                    return null;
                  })()}

                  {/* Custom fields */}
                  {(() => {
                    const method = withdrawalMethods.find((m) => m.id === withdrawMethod);
                    if (!method?.customFields) return null;
                    {
                      // See the note on the validator above: the array shape
                      // threw here and the catch returned null, so the
                      // destination fields (IBAN, account number) never
                      // rendered at all for a fiat method.
                      const fields = asJsonArray<any>(method.customFields);
                      return (
                        <div className="space-y-3">
                          {fields.map((field: any, index: number) => (
                            <div
                              key={field.name || index}
                              className="space-y-1.5"
                              {...(index === 0 ? { "data-tour": "withdraw-destination" } : {})}
                            >
                              <label className="block text-xs font-semibold uppercase tracking-wider text-subtle-foreground">
                                {field.title}
                                {field.required && <span className="ml-1 text-down">*</span>}
                              </label>
                              {field.type === "textarea" ? (
                                <textarea
                                  placeholder={`Enter ${field.title.toLowerCase()}`}
                                  value={customFields[field.name] || ""}
                                  onChange={(e) => setCustomFields({ [field.name]: e.target.value })}
                                  className="w-full rounded-lg border border-border bg-card p-3 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                                  rows={3}
                                />
                              ) : field.type === "select" && field.options ? (
                                <Select
                                  value={customFields[field.name] || ""}
                                  onValueChange={(value) => setCustomFields({ [field.name]: value })}
                                >
                                  <SelectTrigger className="w-full h-auto rounded-lg border-border bg-card p-2.5 text-sm">
                                    <SelectValue
                                      placeholder={`${tCommon("select")} ${field.title}`}
                                    />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {/* The empty-value option that used to sit here was the
                                        native placeholder; SelectValue renders it now. Options
                                        come from admin-authored JSON, and Radix throws on an
                                        item whose value is "" — such an option was
                                        indistinguishable from the placeholder anyway, so it is
                                        skipped rather than allowed to crash the form. */}
                                    {field.options
                                      .filter((option: any) => option?.value)
                                      .map((option: any, oi: number) => (
                                        <SelectItem
                                          key={option.value || `option-${oi}`}
                                          value={String(option.value)}
                                        >
                                          {option.label}
                                        </SelectItem>
                                      ))}
                                  </SelectContent>
                                </Select>
                              ) : (
                                <Input
                                  type={field.type === "number" ? "number" : "text"}
                                  placeholder={`Enter ${field.title.toLowerCase()}`}
                                  value={customFields[field.name] || ""}
                                  onChange={(e) => {
                                    const value = e.target.value;
                                    if (field.name.toLowerCase().includes("address")) {
                                      const sanitizedValue = value.replace(/[^a-zA-Z0-9]/g, "");
                                      setCustomFields({ [field.name]: sanitizedValue });
                                    } else {
                                      setCustomFields({ [field.name]: value });
                                    }
                                  }}
                                  className={field.name.toLowerCase().includes("address") ? "font-mono text-sm" : ""}
                                />
                              )}
                            </div>
                          ))}
                        </div>
                      );
                    }
                  })()}

                  {/* Memo / destination tag (conditionally required) */}
                  {requiresMemo && (
                    <div className="space-y-1.5">
                      <label className="block text-xs font-semibold uppercase tracking-wider text-subtle-foreground">
                        {t("destination_tag_memo") ||
                          t("destination_tag_memo")}{" "}
                        <span className="ml-0.5 text-[10px] normal-case text-subtle-foreground">
                          (required for this coin)
                        </span>
                        <span className="ml-1 text-down">*</span>
                      </label>
                      <Input
                        type="text"
                        placeholder={t("enter_destination_tag_or_memo")}
                        value={memo || ""}
                        onChange={(e) => setMemo(e.target.value)}
                        className={cn(
                          "font-mono text-sm",
                          !memo && "border-destructive/50 focus:border-destructive"
                        )}
                      />
                      <p className="text-xs text-subtle-foreground">
                        {t("for_this_currency_a_missing_memo")}{" "}
                        <strong className="font-bold text-down">
                          unrecoverable
                        </strong>
                        .
                      </p>
                    </div>
                  )}

                  {/* Fee summary */}
                  <div className="space-y-2 rounded-2xl border border-border/70 bg-muted/70 p-4 dark:bg-surface-2/40">
                    <Row label={tCommon("withdrawal_amount")}>
                      <span className="tabular-nums">
                        <MoneyFigure value={`${amount || "0"} ${currency}`} />
                      </span>
                    </Row>
                    {/*
                      TWO FEES, TWO DIRECTIONS. "Fee" is not one quantity on this
                      form: an INTERNAL fee is added to what leaves the wallet, an
                      EXTERNAL one is subtracted from what arrives, and on SPOT
                      both exist at once. A single "Platform fee" row cannot be
                      right about both — and the row that was here was the sum of
                      the two, which is right about neither.

                      Each row renders only when it is non-zero, so FIAT still
                      shows one fee and ECO still shows one.
                    */}
                    {figures.internalFee > 0 && (
                      <Row label={tCommon("platform_fee")}>
                        <span className="tabular-nums text-warning">
                          <MoneyFigure
                            value={`${figures.internalFee.toFixed(feeInputs.precision)} ${currency}`}
                          />
                        </span>
                      </Row>
                    )}
                    {figures.externalFee > 0 && (
                      <Row label={tCommon("network_fee") || tCommon("platform_fee")}>
                        <span className="tabular-nums text-warning">
                          <MoneyFigure
                            value={`${figures.externalFee.toFixed(feeInputs.precision)} ${currency}`}
                          />
                        </span>
                      </Row>
                    )}
                    {figures.networkFee > 0 && (
                      <Row label={tCommon("network_fee_estimated")}>
                        <span className="tabular-nums text-warning">
                          <MoneyFigure
                            value={`${figures.networkFee.toFixed(feeInputs.precision)} ${currency}`}
                          />
                        </span>
                      </Row>
                    )}
                    <div className="my-1 border-t border-border" />
                    {/*
                      BOTH ENDS OF THE TRANSACTION, ALWAYS.

                      What this said before depended on a hardcoded UTXO-chain
                      list and got two of the three wallet types wrong:

                        - SPOT charges its percentage ON TOP and nets the chain
                          fee off the send, so NEITHER "you'll receive = amount −
                          fee" nor "total debited = amount + fee" alone described
                          it, and the platform percentage was not in `fee` at all.
                        - ECO UTXO chains took the `amount − fee` branch, but the
                          master wallet pays the network cost on every chain and
                          the recipient gets the FULL amount there too.

                      Showing the wallet side and the destination side together
                      removes the need to pick, and neither figure can be read as
                      the other.
                    */}
                    <div className="flex items-center justify-between rounded-xl bg-success/5 px-3 py-2.5">
                      <span className="text-sm font-bold text-muted-foreground">
                        {t("total_debited") || t("total_debited")}
                      </span>
                      <span className="text-base font-bold tabular-nums text-up">
                        <MoneyFigure
                          value={`${figures.totalDebited.toFixed(feeInputs.precision)} ${currency}`}
                        />
                      </span>
                    </div>
                    <div className="mt-1 flex items-center justify-between px-3 text-xs text-subtle-foreground">
                      <span>{t("recipient_receives") || t("recipient_receives")}</span>
                      <span className="tabular-nums">
                        <MoneyFigure
                          value={`${figures.netReceived.toFixed(feeInputs.precision)} ${currency}`}
                        />
                      </span>
                    </div>
                  </div>

                  {settings?.withdrawProcessingTime !== "false" && (
                    <Alert className="border-info/30 bg-info/10">
                      <Info className="h-4 w-4 text-primary" />
                      <AlertDescription className="text-xs text-primary">
                        {t("estimated_processing_time")} <strong>{getEstimatedTime()}</strong>
                      </AlertDescription>
                    </Alert>
                  )}

                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div>
                          <Button
                            data-tour="withdraw-submit"
                            // Wrapped: submitWithdrawal's first argument is the
                            // 2FA token, so passing it directly would hand it
                            // the click event.
                            onClick={() => submitWithdrawal()}
                            disabled={!!getDisabledReason() || isSubmitting}
                            className="h-12 w-full bg-primary text-base font-semibold text-primary-foreground shadow-lg shadow-primary/20"
                            size="lg"
                          >
                            {isSubmitting ? (
                              <>
                                <Loader size="sm" className="mr-2" />
                                {tCommon("processing")}
                              </>
                            ) : (
                              <>
                                {tCommon("withdraw")}
                                <ChevronRight className="ml-2 h-5 w-5" />
                              </>
                            )}
                          </Button>
                        </div>
                      </TooltipTrigger>
                      {getDisabledReason() && (
                        <TooltipContent>
                          <p>{getDisabledReason()}</p>
                        </TooltipContent>
                      )}
                    </Tooltip>
                </div>
              </GlassPanel>
            </m.div>
          )}
        </AnimatePresence>
      </div>
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
