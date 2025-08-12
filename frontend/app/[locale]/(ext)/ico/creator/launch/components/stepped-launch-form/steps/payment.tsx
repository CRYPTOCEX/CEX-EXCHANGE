"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { $fetch } from "@/lib/api";
import type { FormData } from "../types";
import { useTranslations } from "next-intl";

interface PaymentStepProps {
  formData: FormData;
  updateFormData: (field: keyof FormData, value: any) => void;
  errors: Record<string, string>;
}

export default function PaymentStep({
  formData,
  updateFormData,
  errors,
  isAdmin = false, // add default
}: PaymentStepProps & { isAdmin?: boolean }) {
  const t = useTranslations("ext");
  const plan = formData.selectedPlan as unknown as icoLaunchPlanAttributes;

  // Local states for terms, payment status, wallet details, etc.
  const [isTermsAccepted, setIsTermsAccepted] = useState(
    formData.termsAccepted
  );
  const [isPaymentComplete, setIsPaymentComplete] = useState(
    formData.paymentComplete
  );
  const [walletBalance, setWalletBalance] = useState<number>(0);
  const [loadingWallet, setLoadingWallet] = useState<boolean>(false);
  const [walletError, setWalletError] = useState<string | null>(null);

  // Fetch the user's wallet based on the selected plan's walletType and currency
  useEffect(() => {
    if (!plan?.walletType || !plan?.currency) return;

    setLoadingWallet(true);
    setWalletError(null);

    $fetch<{ balance: number }>({
      url: `/api/finance/wallet/${plan.walletType}/${plan.currency}`,
      silent: true,
    })
      .then((response) => {
        setWalletBalance(response.data?.balance ?? 0);
      })
      .catch(() => {
        setWalletError("Failed to load wallet details. Please try again.");
      })
      .finally(() => {
        setLoadingWallet(false);
      });
  }, [plan?.walletType, plan?.currency]);

  // Calculate plan cost and whether the wallet covers it
  const planCost = plan ? plan.price : 0;
  const hasSufficientBalance = walletBalance >= planCost;

  const handleTermsChange = (checked: boolean) => {
    setIsTermsAccepted(checked);
    updateFormData("termsAccepted", checked);
  };

  const handleCompletePayment = () => {
    if (!hasSufficientBalance) return;
    setIsPaymentComplete(true);
    updateFormData("paymentComplete", true);
  };

  useEffect(() => {
    // If admin, mark payment complete immediately
    if (isAdmin && !formData.paymentComplete) {
      updateFormData("paymentComplete", true);
    }
  }, [isAdmin]);

  if (isAdmin) {
    return (
      <div className="p-4 bg-muted/50 rounded">
        <p className="text-sm text-green-700 font-medium">
          {t("as_admin_payment_confirmation_is_not_required")}.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Display wallet and plan details */}
      {plan ? (
        <div className="space-y-2">
          {loadingWallet ? (
            <p className="text-sm">{t("loading_wallet_details")}.</p>
          ) : walletError ? (
            <p className="text-sm text-destructive">{walletError}</p>
          ) : (
            <>
              <p className="text-sm">
                <span className="font-medium">{t("wallet_balance")}</span>{" "}
                {walletBalance.toFixed(2)} {plan.currency}
              </p>
              <p className="text-sm">
                <span className="font-medium">{t("plan_cost")}</span>
                / $
                {planCost} {plan.currency}
              </p>
              {!hasSufficientBalance && (
                <p className="text-sm text-destructive">
                  {t("your_wallet_does_not_have_sufficient_balance")}.
                </p>
              )}
            </>
          )}
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">
          {t("please_select_a_plan_to_view_payment_details")}.
        </p>
      )}

      {/* Terms and conditions */}
      <div className="flex items-center space-x-2">
        <Checkbox
          id="terms"
          checked={isTermsAccepted}
          onCheckedChange={handleTermsChange}
        />
        <label htmlFor="terms" className="text-sm font-medium">
          {t("i_agree_to_the_terms_and_conditions")}
        </label>
      </div>
      {errors.termsAccepted && (
        <p className="text-sm font-medium text-destructive">
          {errors.termsAccepted}
        </p>
      )}

      {/* Complete Payment Button */}
      {!isPaymentComplete && (
        <Button
          onClick={handleCompletePayment}
          disabled={!plan || !hasSufficientBalance || !isTermsAccepted}
        >
          {hasSufficientBalance ? "Complete Payment" : "Insufficient Balance"}
        </Button>
      )}

      {errors.payment && (
        <p className="text-sm font-medium text-destructive">{errors.payment}</p>
      )}

      {isPaymentComplete && (
        <p className="text-sm font-medium text-green-600">
          {t("payment_completed_successfully")}
        </p>
      )}
    </div>
  );
}
