"use client";

import { useEffect } from "react";
import { useDepositStore } from "@/store/finance/deposit-store";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { m, AnimatePresence } from "framer-motion";
import { AlertCircle, ArrowDownToLine, RefreshCw, RotateCcw } from "lucide-react";
import { toast } from "sonner";
import { useConfigStore } from "@/store/config";
import { useSearchParams } from "next/navigation";
import { wsManager } from "@/services/ws-manager";
import { useTranslations } from "next-intl";
import { useAddonDisplayName } from "@/hooks/use-addon-display-name";
import { useKycGate } from "@/hooks/use-kyc-gate";
import KycRequiredNotice from "@/components/blocks/kyc/kyc-required-notice";
import { fadeInUp } from "./components/deposit-helpers";

import { FinanceShell, PageHeader } from "../_components/finance-ui";

// Components
import { WalletTypeSelector } from "./components/WalletTypeSelector";
import { CurrencySelector } from "./components/CurrencySelector";
import { DepositMethodSelector } from "./components/DepositMethodSelector";
import { FiatDeposit } from "./components/FiatDeposit";
import { SpotDeposit } from "./components/SpotDeposit";
import { EcoDeposit } from "./components/EcoDeposit";
import { DepositSuccess } from "./components/DepositSuccess";
import { DepositError } from "./components/DepositError";

export function DepositForm() {
  const t = useTranslations("common");
  const tExt = useTranslations("ext");
  const tComponentsBlocks = useTranslations("components_blocks");
  const searchParams = useSearchParams();
  const initialType = searchParams?.get("type");
  const initialCurrency = searchParams?.get("currency");
  const { settings, extensions } = useConfigStore();
  const { getWalletTypeLabel } = useAddonDisplayName();
  const kycGate = useKycGate("deposit_wallet");

  const isSpotEnabled = settings?.spotWallets === true || settings?.spotWallets === "true";
  const isFiatEnabled = settings?.fiatWallets === true || settings?.fiatWallets === "true";
  const isEcosystemEnabled = extensions?.includes("ecosystem");

  const {
    step,
    selectedWalletType,
    selectedCurrency,
    selectedDepositMethod,
    depositAddress,
    currencies,
    depositMethods,
    loading,
    error,
    deposit,
    setStep,
    setSelectedWalletType,
    setSelectedCurrency,
    setSelectedDepositMethod,
    setDepositAmount,
    setDeposit,
    setError,
    fetchCurrencies,
    fetchDepositMethods,
    fetchDepositAddress,
    setTransactionHash,
    retryFetchDepositAddress,
    reset,
  } = useDepositStore();

  useEffect(() => {
    reset();
    if (initialType) {
      const walletType = {
        value: initialType.toUpperCase(),
        label: initialType.charAt(0).toUpperCase() + initialType.slice(1).toLowerCase(),
      };
      setSelectedWalletType(walletType);
      if (initialCurrency) setSelectedCurrency(initialCurrency);
    }
  }, []);

  useEffect(() => {
    if (selectedWalletType) fetchCurrencies();
  }, [selectedWalletType]);

  useEffect(() => {
    if (selectedWalletType && selectedCurrency) fetchDepositMethods();
  }, [selectedWalletType, selectedCurrency]);

  // Leaving the page only closes the sockets. An ECO deposit address is the
  // user's own permanent address now, so there is nothing to "unlock" on the
  // way out — the old per-session custodial lock is gone.
  useEffect(() => {
    return () => {
      wsManager.close("eco-deposit");
      wsManager.close("spot-deposit");
    };
  }, []);

  const handleWalletSelect = (walletType: any) => {
    if (selectedWalletType && selectedWalletType.value !== walletType.value) {
      wsManager.close("eco-deposit");
      reset();
    }
    setSelectedWalletType(walletType);
  };

  const handleCurrencySelect = (currency: string) => {
    setSelectedCurrency(currency);
    setSelectedDepositMethod(null);
    setDepositAmount(0);
    setTransactionHash("");
    setDeposit(null);
    setError(null);
    setStep(3);
  };

  const handleMethodSelect = async (method: any) => {
    if (
      selectedWalletType?.value === "ECO" &&
      selectedDepositMethod &&
      depositAddress &&
      (selectedDepositMethod.chain !== method.chain || selectedDepositMethod.id !== method.id)
    ) {
      wsManager.sendMessage(
        {
          action: "UNSUBSCRIBE",
          payload: {
            currency: selectedCurrency,
            chain: selectedDepositMethod?.chain || selectedDepositMethod?.id,
            address: (typeof depositAddress === "string" ? depositAddress : depositAddress?.address)?.toLowerCase(),
          },
        },
        "eco-deposit"
      );
    }

    setSelectedDepositMethod(method);

    if (selectedWalletType?.value === "SPOT" || selectedWalletType?.value === "ECO") {
      try {
        const result = await fetchDepositAddress();
        if (!result.success) {
          toast.error(result.error || t("failed_to_generate_deposit_address"));
        } else {
          setStep(4);
        }
      } catch {
        toast.error(t("failed_to_generate_deposit_address"));
      }
    } else {
      setStep(4);
    }
  };

  const availableWallets = [
    ...(isFiatEnabled ? [{ value: "FIAT", label: t("fiat") }] : []),
    ...(isSpotEnabled ? [{ value: "SPOT", label: t("spot") }] : []),
    ...(isEcosystemEnabled ? [{ value: "ECO", label: getWalletTypeLabel("ECO", "Eco") }] : []),
  ];

  // Money-in surface: gated at the root, so every step of the flow (wallet
  // type, currency, method, address) sits behind it. The page has no login
  // prompt of its own, so "anonymous" renders nothing like "loading" does.
  if (kycGate.state === "loading" || kycGate.state === "anonymous") return null;
  if (!kycGate.allowed) {
    return (
      <FinanceShell maxWidth="narrow">
        <KycRequiredNotice
          feature="deposit_wallet"
          requirement={kycGate.requirement ?? "verification"}
        />
      </FinanceShell>
    );
  }

  if (deposit?.confirmed) {
    return (
      <FinanceShell maxWidth="narrow">
        <DepositSuccess
          deposit={deposit}
          selectedCurrency={selectedCurrency}
          selectedWalletType={selectedWalletType}
          onReset={() => {
            setDeposit(null);
            reset();
          }}
        />
      </FinanceShell>
    );
  }

  if (error) {
    return (
      <FinanceShell maxWidth="narrow">
        <DepositError
          error={error}
          onRetry={() => {
            setError(null);
            setDeposit(null);
            setStep(1);
          }}
          onCancel={() => {
            setError(null);
            setDeposit(null);
          }}
        />
      </FinanceShell>
    );
  }

  // FIAT deposit flow
  if (selectedWalletType?.value === "FIAT" && (step === 4 || step === 5 || step === 6)) {
    return (
      <FinanceShell maxWidth="narrow">
        <PageHeader
          icon={ArrowDownToLine}
          eyebrow="Finance"
          title={tExt("deposit_funds")}
          description={t("add_funds_to_your_wallet_quickly_and_securely")}
          actions={
            <Button variant="ghost" onClick={reset} className="gap-1.5">
              <RotateCcw className="h-4 w-4" />
              {t("start_over")}
            </Button>
          }
        />
        <ErrorAlert
          error={error}
          selectedWalletType={selectedWalletType}
          selectedDepositMethod={selectedDepositMethod}
          loading={loading}
          retryFetchDepositAddress={retryFetchDepositAddress}
          t={t}
          tComponentsBlocks={tComponentsBlocks}
        />
        <FiatDeposit />
      </FinanceShell>
    );
  }

  if (selectedWalletType?.value === "SPOT" && (step === 4 || step === 5)) {
    return (
      <FinanceShell maxWidth="narrow">
        <SpotDeposit />
      </FinanceShell>
    );
  }

  if (selectedWalletType?.value === "ECO" && step === 4) {
    return (
      <FinanceShell maxWidth="narrow">
        <EcoDeposit />
      </FinanceShell>
    );
  }

  try {
    return (
      <FinanceShell maxWidth="narrow">
        <PageHeader
          icon={ArrowDownToLine}
          eyebrow="Finance"
          title={tExt("deposit_funds")}
          description={t("add_funds_to_your_wallet_quickly_and_securely")}
          actions={
            <Button variant="ghost" onClick={reset} className="gap-1.5">
              <RotateCcw className="h-4 w-4" />
              {t("start_over")}
            </Button>
          }
        />

        <Stepper
          steps={[
            { label: t("wallet"), done: !!selectedWalletType, active: step === 1 || !selectedWalletType },
            { label: t("currency"), done: !!selectedCurrency, active: !!selectedWalletType && !selectedCurrency },
            { label: t("method"), done: !!selectedDepositMethod, active: !!selectedCurrency && !selectedDepositMethod },
            { label: t("confirm"), done: false, active: !!selectedDepositMethod },
          ]}
        />

        <ErrorAlert
          error={error}
          selectedWalletType={selectedWalletType}
          selectedDepositMethod={selectedDepositMethod}
          loading={loading}
          retryFetchDepositAddress={retryFetchDepositAddress}
          t={t}
          tComponentsBlocks={tComponentsBlocks}
        />

        <div className="space-y-5">
          <WalletTypeSelector
            selectedWalletType={selectedWalletType}
            onSelect={handleWalletSelect}
            availableWallets={availableWallets}
          />

          <AnimatePresence>
            {selectedWalletType && currencies.length > 0 && (
              <CurrencySelector
                currencies={currencies}
                selectedCurrency={selectedCurrency}
                onSelect={handleCurrencySelect}
              />
            )}
          </AnimatePresence>

          <AnimatePresence>
            {selectedCurrency && (
              <DepositMethodSelector
                walletType={selectedWalletType?.value || ""}
                selectedCurrency={selectedCurrency}
                depositMethods={depositMethods}
                selectedDepositMethod={selectedDepositMethod}
                loading={loading}
                onMethodSelect={handleMethodSelect}
              />
            )}
          </AnimatePresence>
        </div>
      </FinanceShell>
    );
  } catch (err) {
    console.error("Error rendering deposit form:", err);
    return (
      <FinanceShell maxWidth="narrow">
        <DepositError
          error={t("an_error_occurred_while_loading_the")}
          onRetry={() => window.location.reload()}
          onCancel={() => reset()}
        />
      </FinanceShell>
    );
  }
}

function Stepper({ steps }: { steps: { label: string; done: boolean; active: boolean }[] }) {
  return (
    <div className="mb-6 hidden items-center gap-2 rounded-2xl border border-border/70 bg-card/60 p-2 backdrop-blur sm:flex">
      {steps.map((s, i) => (
        <div key={s.label} className="flex flex-1 items-center gap-2">
          <div
            className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[11px] font-bold transition ${
              /* `from-success to-success` is two identical stops = a flat fill.
                 The active rung also wore `--success-foreground` on a `bg-primary`
                 ground — the two happen to share a value today, so nothing looked
                 wrong, but the panel treats them as independent tokens and the
                 moment they differ this rung inks itself from the wrong one. */
              s.done
                ? "bg-success text-success-foreground"
                : s.active
                ? "bg-primary text-primary-foreground shadow-md shadow-primary/20"
                : "bg-muted text-muted-foreground"
            }`}
          >
            {s.done ? "✓" : i + 1}
          </div>
          <div
            className={`text-xs font-semibold ${
              s.done || s.active
                ? "text-foreground"
                : "text-muted-foreground"
            }`}
          >
            {s.label}
          </div>
          {i < steps.length - 1 && (
            <div className="mx-2 h-px flex-1 bg-muted" />
          )}
        </div>
      ))}
    </div>
  );
}

function ErrorAlert({ error, selectedWalletType, selectedDepositMethod, loading, retryFetchDepositAddress, t, tComponentsBlocks }: any) {
  const tCommon = useTranslations("common");
  if (!error) return null;

  /**
   * The retry button's leading glyph, or nothing while the retry is out.
   *
   * `null` and not a second icon: `<Button loading>` renders the shared
   * spinner in that slot (components/ui/button.tsx). See the note at the call
   * site for why this is resolved to a value instead of branched.
   */
  const RetryIcon = loading ? null : RefreshCw;

  return (
    <AnimatePresence>
      <m.div {...fadeInUp} className="mb-5">
        <Alert className="border-destructive/30 bg-destructive/5">
          <AlertCircle className="h-4 w-4 text-destructive" />
          <AlertTitle className="text-destructive">Error</AlertTitle>
          <AlertDescription className="text-destructive">
            {error}
            {/* The retry used to appear only for "All custodial wallets are
                currently in use", the one transient failure the shared
                custodial model had. That model is gone — an ECO address is
                the customer's own and is never busy — so the retry now covers
                any failed ECO address fetch (an RPC hiccup, a chain that was
                slow to derive), which is the same transient class. Gated on a
                chosen method because that is what the retry re-requests. */}
            {selectedWalletType?.value === "ECO" &&
              Boolean(selectedDepositMethod) && (
                /* IN-FLIGHT, NOT PENDING. The hand-rolled spinner here was a
                    bare `<div className="h-4 w-4 animate-spin rounded-full
                    border-b-2">` — a second, differently-drawn spinner shape
                    that exists nowhere else in the product. `<Button loading>`
                    puts the shared `LoaderCircle` glyph in the same leading
                    slot the `RefreshCw` icon occupies, so the retry button
                    keeps its width and gains the app's one spinner. */
                <div className="mt-3">
                  <Button
                    onClick={retryFetchDepositAddress}
                    loading={loading}
                    size="sm"
                    variant="outline"
                    className="border-destructive"
                  >
                    {RetryIcon && <RetryIcon className="mr-2 h-4 w-4" />}
                    {loading ? `${tCommon("retrying")}.` : tCommon("try_again")}
                  </Button>
                </div>
              )}
          </AlertDescription>
        </Alert>
      </m.div>
    </AnimatePresence>
  );
}
