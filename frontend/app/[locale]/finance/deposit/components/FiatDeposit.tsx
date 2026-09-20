"use client";

import { useCallback, useState } from "react";
import { m, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { CheckCircle2, FileText, History, Plus } from "lucide-react";
import { useTranslations } from "next-intl";
import { withCurrentLocale } from "@/i18n/routing";
import { useDepositStore } from "@/store/finance/deposit-store";
import { fadeInUp, extractAmountValue } from "./deposit-helpers";
import { ManualDepositForm } from "./ManualDepositForm";
import { GatewayProcessing } from "./GatewayProcessing";
import { GlassPanel, SectionTitle } from "../../_components/finance-ui";
import { MoneyFigure } from "@/components/ui/money-figure";

import {
  StripeGateway,
  PayPalGateway,
  AdyenGateway,
  KlarnaGateway,
  PaytmGateway,
  PayFastGateway,
  PayUGateway,
  IPay88Gateway,
  AuthorizeNetGateway,
  RedirectGateway,
  isRedirectGateway,
} from "./gateways";
import type { DepositResult } from "./gateways";

export function FiatDeposit() {
  const t = useTranslations("common");

  const {
    step,
    selectedCurrency,
    selectedDepositMethod,
    depositAmount,
    loading,
    deposit,
    setStep,
    setDepositAmount,
    setDeposit,
    setError,
    handleFiatDeposit,
  } = useDepositStore();

  const [gatewayProcessing, setGatewayProcessing] = useState(false);
  const [activeGatewayName, setActiveGatewayName] = useState<string | null>(null);

  const handleGatewaySuccess = useCallback(
    (result: DepositResult) => {
      setGatewayProcessing(false);
      setActiveGatewayName(null);
      setDeposit(result);
    },
    [setDeposit]
  );

  const handleGatewayError = useCallback(
    (error: string) => {
      setGatewayProcessing(false);
      setActiveGatewayName(null);
      setError(error);
    },
    [setError]
  );

  const handleGatewayCancel = useCallback(() => {
    setGatewayProcessing(false);
    setActiveGatewayName(null);
  }, []);

  const handleGatewayProcessing = useCallback((active: boolean) => {
    setGatewayProcessing(active);
  }, []);

  const handleProceedToManual = useCallback(() => {
    if (!depositAmount || Number(depositAmount) <= 0) {
      toast.error(t("please_enter_a_valid_amount"));
      return;
    }
    setStep(5);
  }, [depositAmount, setStep]);

  if (gatewayProcessing) {
    return (
      <GatewayProcessing
        gatewayName={activeGatewayName}
        variant="gateway"
        onCancel={() => {
          setGatewayProcessing(false);
          setActiveGatewayName(null);
        }}
      />
    );
  }

  if (step === 5 && selectedDepositMethod && !selectedDepositMethod.isGateway) {
    return (
      <AnimatePresence>
        <m.div {...fadeInUp}>
          <ManualDepositForm
            method={selectedDepositMethod}
            currency={selectedCurrency}
            amount={depositAmount}
            onSubmit={handleFiatDeposit}
            loading={loading}
            onBack={() => setStep(4)}
          />
        </m.div>
      </AnimatePresence>
    );
  }

  if (step === 6 && deposit) {
    return (
      <div className="mx-auto w-full max-w-2xl space-y-6">
        <m.div {...fadeInUp} className="text-center">
          <div className="relative mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-success shadow-lg shadow-success/30">
            <div className="absolute inset-0 animate-ping rounded-full bg-success/20" />
            <CheckCircle2 className="relative h-10 w-10 text-success-foreground" />
          </div>
          <h1 className="mt-5 text-3xl font-bold text-foreground">
            {t("deposit_request_submitted")}
          </h1>
          <p className="mt-2 text-sm text-subtle-foreground">
            {t("your_deposit_request_has_been_submitted")}
          </p>
        </m.div>

        <m.div {...fadeInUp}>
          <GlassPanel>
            <SectionTitle icon={FileText} title="Receipt" hint={t("save_these_details_for_your_records")} />
            <div className="space-y-2">
              <DetailRow label={t("transaction_id")}>
                <span className="font-mono text-xs">{deposit.transaction?.id || deposit.id}</span>
              </DetailRow>
              <DetailRow label={t("amount")}>
                <MoneyFigure
                  value={`${(deposit.transaction?.amount || deposit.amount) ?? ""} ${deposit.currency || selectedCurrency}`}
                />
              </DetailRow>
              <DetailRow label={t("status")}>
                <span className="rounded-full border border-warning/30 bg-warning/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-warning-ink">
                  {deposit.transaction?.status || deposit.status || t("pending")}
                </span>
              </DetailRow>
            </div>

            <div className="mt-4 rounded-xl border border-info/20 bg-info/10 p-3">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-primary">
                {t("next_steps")}
              </h4>
              <ul className="mt-2 list-disc space-y-1 pl-4 text-xs text-primary">
                <li>{t("our_team_will_review_your_deposit_request")}</li>
                <li>{t("you_will_receive_an_email_confirmation_shortly")}</li>
                <li>{t("processing_typically_takes_1_3_business_days")}</li>
              </ul>
            </div>

            <div className="mt-5 flex gap-2">
              <Button
                variant="outline"
                onClick={() => (window.location.href = withCurrentLocale("/finance/history"))}
                className="h-11 flex-1 gap-1.5"
              >
                <History className="h-4 w-4" />
                {t("view_transactions")}
              </Button>
              <Button
                onClick={() => useDepositStore.getState().reset()}
                className="h-11 flex-1 gap-1.5 bg-primary text-primary-foreground shadow-md shadow-primary/20"
              >
                <Plus className="h-4 w-4" />
                {t("make_another_deposit")}
              </Button>
            </div>
          </GlassPanel>
        </m.div>
      </div>
    );
  }

  if (step !== 4 || !selectedDepositMethod) return null;

  const isGateway = selectedDepositMethod.isGateway === true;
  const alias = isGateway ? selectedDepositMethod.alias?.toLowerCase() || selectedDepositMethod.id?.toLowerCase() : undefined;
  const minAmount = extractAmountValue(
    selectedDepositMethod.minAmount || selectedDepositMethod.limits?.deposit?.min,
    selectedCurrency
  );
  const isAmountValid = depositAmount > 0 && depositAmount >= minAmount;
  const gatewayProps = {
    amount: depositAmount,
    currency: selectedCurrency,
    method: selectedDepositMethod,
    onSuccess: handleGatewaySuccess,
    onError: handleGatewayError,
    onCancel: handleGatewayCancel,
    onProcessing: handleGatewayProcessing,
  };

  return (
    <AnimatePresence>
      <m.div {...fadeInUp}>
        <GlassPanel>
          <SectionTitle step={4} title={t("enter_amount")} hint={t("how_much_would_you_like_to_deposit")} />

          <div className="space-y-2">
            <label className="block text-xs font-semibold uppercase tracking-wider text-subtle-foreground">
              {t("deposit_amount")}
            </label>
            <div className="relative">
              <Input
                type="number"
                placeholder="0.00"
                value={depositAmount || ""}
                onChange={(e) => setDepositAmount(Number(e.target.value) || 0)}
                min="0"
                step="0.00000001"
                className="h-14 pr-20 text-2xl font-bold tabular-nums"
              />
              <div className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-sm font-bold text-subtle-foreground">
                {selectedCurrency}
              </div>
            </div>
            {(selectedDepositMethod.minAmount || selectedDepositMethod.limits?.deposit?.min) && (
              <div className="flex items-center justify-between text-xs text-subtle-foreground">
                <span>
                  {t("minimum")}{" "}
                  <strong className="text-muted-foreground">
                    {extractAmountValue(
                      selectedDepositMethod.minAmount || selectedDepositMethod.limits?.deposit?.min,
                      selectedCurrency
                    )}{" "}
                    {selectedCurrency}
                  </strong>
                </span>
              </div>
            )}
          </div>

          <div className="mt-5">{isAmountValid ? renderGateway(alias, gatewayProps, handleProceedToManual) : null}</div>
        </GlassPanel>
      </m.div>
    </AnimatePresence>
  );
}

function DetailRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-xl border border-border/60 bg-card/60 px-3 py-2">
      <span className="text-xs text-subtle-foreground">{label}</span>
      <span className="text-sm font-semibold text-foreground">{children}</span>
    </div>
  );
}

function renderGateway(alias: string | undefined, props: any, onManualProceed: () => void) {
  if (!alias) {
    return (
      <Button
        onClick={onManualProceed}
        className="h-12 w-full bg-primary text-base font-semibold text-primary-foreground shadow-md shadow-primary/20"
        size="lg"
      >
        Continue
      </Button>
    );
  }

  switch (alias) {
    case "stripe":
      return <StripeGateway {...props} />;
    case "paypal":
      return <PayPalGateway {...props} />;
    case "adyen":
      return <AdyenGateway {...props} />;
    case "klarna":
      return <KlarnaGateway {...props} />;
    case "paytm":
      return <PaytmGateway {...props} />;
    case "payfast":
      return <PayFastGateway {...props} />;
    case "payu":
      return <PayUGateway {...props} />;
    case "ipay88":
      return <IPay88Gateway {...props} />;
    case "authorizenet":
      return <AuthorizeNetGateway {...props} />;
    default:
      if (isRedirectGateway(alias)) {
        return <RedirectGateway alias={alias} {...props} />;
      }
      return <RedirectGateway alias={alias} {...props} />;
  }
}
