"use client";

import React, { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Wallet, AlertCircle, ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { useForexStore } from "@/store/forex/user";
import { useDepositStore } from "@/store/forex/deposit";
import { formatCurrency } from "@/utils/formatters";
import { useRouter } from "@/i18n/routing";
import DepositLoading from "./loading";
import { useParams } from "next/navigation";
import { StepLabelItem, Stepper } from "@/components/ui/stepper";
import { useUserStore } from "@/store/user";
import { useConfigStore } from "@/store/config";
import KycRequiredNotice from "@/components/blocks/kyc/kyc-required-notice";
import { useTranslations } from "next-intl";

export default function DepositClient() {
  const tCommon = useTranslations("common");
  const tExt = useTranslations("ext");
  const [isClient, setIsClient] = useState(false);
  const [hasError, setHasError] = useState(false);
  
  // Initialize client-side rendering flag
  useEffect(() => {
    setIsClient(true);
  }, []);

  // Error boundary effect
  useEffect(() => {
    const handleError = (error: ErrorEvent) => {
      console.error("Client error:", error);
      setHasError(true);
    };

    window.addEventListener('error', handleError);
    return () => window.removeEventListener('error', handleError);
  }, []);

  // Don't render anything until client-side
  if (!isClient) {
    return <DepositLoading />;
  }

  // Show error fallback if there's an error
  if (hasError) {
    return (
      <div className="container mx-auto pt-8 mb-24">
        <div className="text-center py-12">
          <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold mb-2">{tCommon("something_went_wrong")}</h1>
          <p className="text-muted-foreground mb-4">
            {tExt("there_was_an_error_loading_the")}
          </p>
          <Button onClick={() => window.location.reload()}>
            {tCommon("refresh_page")}
          </Button>
        </div>
      </div>
    );
  }

  try {
    return <DepositClientContent />;
  } catch (error) {
    console.error("Render error:", error);
    setHasError(true);
    return null;
  }
}

function DepositClientContent() {
  const t = useTranslations("ext");
  const tCommon = useTranslations("common");
  const { hasKyc, canAccessFeature } = useUserStore();
  const { settings } = useConfigStore();
  const { id } = useParams() as {
    id: string;
  };
  const router = useRouter();
  const { accounts, fetchAccounts } = useForexStore();
  const [account, setAccount] = useState<any>(null);
  const [accountError, setAccountError] = useState<string | null>(null);
  const [isLoadingAccount, setIsLoadingAccount] = useState(true);

  // Zustand store for deposit
  const {
    step,
    setStep,
    loading,
    walletTypes,
    selectedWalletType,
    setSelectedWalletType,
    currencies,
    selectedCurrency,
    setSelectedCurrency,
    depositMethods,
    selectedDepositMethod,
    setSelectedDepositMethod,
    depositAmount,
    setDepositAmount,
    deposit,
    fetchCurrencies,
    fetchDepositMethods,
    handleDeposit,
    clearAll,
  } = useDepositStore();

  // If no accounts loaded yet, fetch them
  useEffect(() => {
    if (!accounts.length) {
      fetchAccounts();
    }
  }, [accounts, fetchAccounts]);

  // Find the matching account once accounts are available
  useEffect(() => {
    if (accounts.length === 0) {
      // Still loading accounts
      setIsLoadingAccount(true);
      return;
    }

    const foundAccount = accounts.find((a) => a.id === id);
    if (!foundAccount) {
      setAccountError("Account not found");
      setIsLoadingAccount(false);
      return;
    }
    
    if (foundAccount.type !== "LIVE") {
      setAccountError("Deposits are only available for live accounts");
      setIsLoadingAccount(false);
      return;
    }
    
    setAccount(foundAccount);
    setAccountError(null);
    setIsLoadingAccount(false);

    // Clear store when component unmounts
    return () => {
      clearAll();
    };
  }, [id, accounts, clearAll]);

  // If user hasn't chosen a wallet type but is on a step > 1, reset to step 1
  useEffect(() => {
    if (!selectedWalletType.value && step > 1) {
      setStep(1);
    }
  }, [selectedWalletType.value, step, setStep]);

  const kycEnabled = settings?.kycStatus === true || settings?.kycStatus === "true";
  const hasAccess = hasKyc() && canAccessFeature("deposit_forex");
  
  if (kycEnabled && !hasAccess) {
    return <KycRequiredNotice feature="deposit_forex" />;
  }

  // Show loading state while fetching account
  if (isLoadingAccount) {
    return <DepositLoading />;
  }

  // Show error state if account not found or invalid
  if (accountError) {
    return (
      <div className="container mx-auto py-12">
        <div className="max-w-2xl mx-auto">
          <div className="text-center py-8">
            <AlertCircle className="h-12 w-12 text-red-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-zinc-900 dark:text-zinc-100 mb-2">
              {accountError}
            </h3>
            <p className="text-zinc-600 dark:text-zinc-300 mb-6">
              {accountError === "Account not found" 
                ? "The account you're trying to access doesn't exist or you don't have permission to view it."
                : "Please use a live account to make deposits."
              }
            </p>
            <Button
              onClick={() => router.push("/forex/dashboard")}
              className="px-6"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              {tCommon("back_to_dashboard")}
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // If account not found or still loading
  if (!account) {
    return <DepositLoading />;
  }

  // If no wallet type is selected, treat it as FIAT by default
  const isFiat =
    selectedWalletType.value === "FIAT" || !selectedWalletType.value;

  // If fiat => 4 steps total, else => 5
  const totalSteps = isFiat ? 4 : 5;

  // Step labels
  const stepLabels: StepLabelItem[] = isFiat
    ? [
        {
          label: "Wallet Type",
          description: "Choose the type of wallet you want to deposit from",
        },
        {
          label: "Currency",
          description: "Select the currency you want to deposit",
        },
        {
          label: "Amount",
          description: "Enter the amount you want to deposit",
        },
        {
          label: "Confirm",
          description: "Review your deposit details",
        },
      ]
    : [
        {
          label: "Wallet Type",
          description: "Choose the type of wallet you want to deposit from",
        },
        {
          label: "Currency",
          description: "Select the currency you want to deposit",
        },
        {
          label: "Network",
          description: "Choose the network for your deposit",
        },
        {
          label: "Amount",
          description: "Enter the amount you want to deposit",
        },
        {
          label: "Confirm",
          description: "Review your deposit details",
        },
      ];

  // Step Navigation
  function handleNext() {
    // Step 1 => fetchCurrencies => step 2
    if (step === 1 && selectedWalletType.value) {
      fetchCurrencies();
      setStep(2);
    }
    // Step 2 => if non-fiat => fetchDepositMethods => step 3; else => step 3 is Amount
    else if (step === 2 && selectedCurrency) {
      if (!isFiat) {
        fetchDepositMethods();
      }
      setStep(3);
    }
    // Step 3 => if non-fiat => require deposit method => step 4; if fiat => step 3 is amount => step 4 is confirm
    else if (step === 3) {
      if (!isFiat) {
        if (!selectedDepositMethod) {
          toast.error("Please select a network");
          return;
        }
        setStep(4);
      } else {
        setStep(4);
      }
    }
    // Step 4 => if non-fiat => step 4 is amount => step 5 is confirm; if fiat => step 4 is confirm => submit
    else if (step === 4) {
      if (!isFiat) {
        // Validate amount for non-fiat
        if (!depositAmount || depositAmount < 100) {
          toast.error("Please enter a valid amount (minimum 100)");
          return;
        }
        setStep(5);
      } else {
        // For fiat, step 4 is confirm, so this would be handled by submit
        return;
      }
    }
  }
  function handlePrev() {
    if (step > 1) {
      setStep(step - 1);
    }
  }

  // Final "Submit" action
  async function handleSubmit() {
    // Example minimum deposit check
    if (depositAmount < 100) {
      toast.error("Please enter a valid amount (min $100)");
      return;
    }

    // Actually perform the deposit.
    // The store code now handles success/fail toasts and keeps the step from exceeding max.
    await handleDeposit(id);
  }

  // Disable "Next" if required fields are missing
  function disableNext() {
    // If we have deposit data, disable the next button
    if (deposit) return true;
    if (step === 1 && !selectedWalletType.value) return true;
    if (step === 2 && !selectedCurrency) return true;
    if (!isFiat && step === 3 && !selectedDepositMethod) return true;
    if (!isFiat && step === 4 && (!depositAmount || depositAmount < 100)) return true;
    return false;
  }

  // Add a new function to render the success step after the renderConfirmStep function
  function renderSuccessStep() {
    if (!deposit || !selectedCurrency) return null;
    return (
      <>
        <div className="mb-6">
          <CardTitle className="text-green-600 flex items-center">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-6 w-6 mr-2"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M5 13l4 4L19 7"
              />
            </svg>
            {t("deposit_submitted")}
          </CardTitle>
          <CardDescription>
            {t("your_deposit_has_been_submitted_and")}
          </CardDescription>
        </div>
        <div className="space-y-6">
          <div className="bg-green-50 p-4 rounded-lg dark:bg-green-900/30 dark:text-green-100">
            <h4 className="font-medium mb-4">{tCommon("transaction_details")}</h4>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-zinc-600 dark:text-green-200">
                  {tCommon("transaction_id")}:
                </span>
                <span className="font-medium">
                  {deposit.transaction?.id
                    ? deposit.transaction.id.substring(0, 8) + "..."
                    : "N/A"}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-600 dark:text-green-200">
                  {tCommon("status")}:
                </span>
                <span className="font-medium">
                  {deposit.transaction?.status || "PENDING"}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-600 dark:text-green-200">
                  {tCommon("amount")}:
                </span>
                <span className="font-medium">
                  {formatCurrency(
                    deposit.transaction?.amount || depositAmount,
                    deposit.currency || selectedCurrency
                  )}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-600 dark:text-green-200">
                  {tCommon("currency")}:
                </span>
                <span className="font-medium">
                  {deposit.currency || selectedCurrency}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-600 dark:text-green-200">{tCommon("type")}:</span>
                <span className="font-medium">
                  {deposit.type || selectedWalletType.value}
                </span>
              </div>
              {deposit.balance !== undefined && (
                <div className="flex justify-between">
                  <span className="text-zinc-600 dark:text-green-200">
                    {tCommon('new_balance')}:
                  </span>
                  <span className="font-medium">
                    {formatCurrency(
                      deposit.balance,
                      deposit.currency || selectedCurrency
                    )}
                  </span>
                </div>
              )}
            </div>
          </div>
          
          {/* Transaction Status Information */}
          <div className={`bg-teal-500/10 p-4 rounded-lg dark:bg-teal-500/10 dark:text-teal-300`}>
            <div className="flex items-center mb-2">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className={`h-5 w-5 mr-2 text-teal-600 dark:text-teal-300`}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              <h4 className={`font-medium text-teal-600 dark:text-teal-300`}>
                {tCommon("what_happens_next")}
              </h4>
            </div>
            <div className={`text-sm text-teal-600 dark:text-teal-300 space-y-1`}>
              <p>{t("your_transaction_is_currently")} <strong>PENDING</strong> approval</p>
              <p>{t("you_will_receive_an_email_notification")}</p>
              <p>{t("you_can_track_the_status_in_your")} <strong>{tCommon("forex_transactions")}</strong> page</p>
              <p>{tCommon("processing_typically_takes_5_15_minutes")}</p>
            </div>
          </div>

          <div className="flex justify-center gap-4 mt-6">
            <Button
              onClick={() => router.push("/forex/transaction")}
              variant="outline"
              className="px-6"
            >
              {t("view_transactions")}
            </Button>
            <Button
              onClick={() => router.push("/forex/dashboard")}
              className="px-6"
            >
              {tCommon("return_to_dashboard")}
            </Button>
          </div>
        </div>
      </>
    );
  }

  // Render the step content
  function renderStepContent() {
    if (deposit) {
      return renderSuccessStep();
    }
    // Step 1 => Wallet Type
    if (step === 1) {
      return (
        <>
          <div className="mb-6">
            <CardTitle>{tCommon("select_wallet_type")}</CardTitle>
            <CardDescription>
              {tCommon("choose_the_type_of_wallet_you_want_to_deposit_from")}
            </CardDescription>
          </div>
          <div>
            <RadioGroup
              value={selectedWalletType.value}
              onValueChange={(value) => {
                const walletType = walletTypes.find((wt) => wt.value === value);
                if (walletType) {
                  setSelectedWalletType(walletType);
                }
              }}
            >
              {walletTypes.map((walletType) => {
                return (
                  <div
                    key={walletType.value}
                    className="flex items-center space-x-2 mb-4"
                  >
                    {/* Hide the actual radio circle but keep the radio behavior */}
                    <RadioGroupItem
                      value={walletType.value}
                      id={walletType.value}
                      className="hidden"
                    />
                    <Label
                      htmlFor={walletType.value}
                      className={`flex items-center p-4 border rounded-lg cursor-pointer hover:bg-zinc-50 dark:hover:bg-zinc-700 w-full ${selectedWalletType.value === walletType.value ? `bg-emerald-100/20 dark:bg-emerald-100/10 border-emerald-600 dark:border-emerald-400` : ""}`}
                    >
                      <Wallet className={`h-5 w-5 mr-3 text-emerald-600 dark:text-emerald-400`} />
                      <div>
                        <p className="font-medium text-zinc-800 dark:text-zinc-100">
                          {walletType.label} Wallet
                        </p>
                        <p className="text-sm text-zinc-500 dark:text-zinc-400">
                          {walletType.value === "FIAT"
                            ? "Deposit using bank transfer or credit card"
                            : "Deposit using cryptocurrency"}
                        </p>
                      </div>
                    </Label>
                  </div>
                );
              })}
            </RadioGroup>
          </div>
        </>
      );
    }

    // Step 2 => Currency
    if (step === 2) {
      return (
        <>
          <div className="mb-6">
            <CardTitle>{tCommon("select_currency")}</CardTitle>
            <CardDescription>
              {tCommon("select_the_currency_you_want_to_deposit")}
            </CardDescription>
          </div>
          <div>
            {loading ? (
              <div className="flex justify-center py-8">
                <div className={`w-8 h-8 border-4 border-emerald-100/20 border-t-emerald-600 rounded-full animate-spin`} />
              </div>
            ) : currencies.length > 0 ? (
              <div className="grid grid-cols-2 gap-4">
                {currencies.map((currency: any) => (
                  <div
                    key={currency.value}
                    className={`border rounded-lg p-4 cursor-pointer hover:bg-zinc-50 hover:border-emerald-100/30 dark:hover:bg-zinc-700 ${selectedCurrency === currency.value ? `bg-emerald-100/20 dark:bg-emerald-100/10 border-emerald-600 dark:border-emerald-400` : ""}`}
                    onClick={() => setSelectedCurrency(currency.value)}
                  >
                    <div className="flex items-center">
                      <div className="w-8 h-8 rounded-full bg-zinc-100 dark:bg-zinc-600 flex items-center justify-center mr-3 text-zinc-600 dark:text-zinc-100">
                        {currency.symbol || currency.value.charAt(0)}
                      </div>
                      <div>
                        <p className="font-medium text-zinc-800 dark:text-zinc-100">
                          {currency.label}
                        </p>
                        <p className="text-sm text-zinc-500 dark:text-zinc-400">
                          {currency.value}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <AlertCircle className="h-12 w-12 text-zinc-400 mx-auto mb-4" />
                <p className="text-zinc-600 dark:text-zinc-300">
                  {t("no_currencies_available_for_this_wallet_type")}
                </p>
                <Button
                  variant="outline"
                  className="mt-4"
                  onClick={() => setStep(1)}
                >
                  {tCommon("go_back")}
                </Button>
              </div>
            )}
          </div>
        </>
      );
    }

    // Step 3 => Network (non-FIAT) or Amount (FIAT)
    if (!isFiat && step === 3) {
      // Non-fiat => Network selection
      return (
        <>
          <div className="mb-6">
            <CardTitle>{tCommon("select_network")}</CardTitle>
            <CardDescription>
              {tCommon("choose_the_network_for_your_deposit")}
            </CardDescription>
          </div>
          <div>
            {loading ? (
              <div className="flex justify-center py-8">
                <div className={`w-8 h-8 border-4 border-emerald-100/20 border-t-emerald-600 rounded-full animate-spin`} />
              </div>
            ) : depositMethods && depositMethods.length > 0 ? (
              <div className="space-y-4">
                {depositMethods.map((method: any) => (
                  <div
                    key={method.id || method.chain}
                    className={`border rounded-lg p-4 cursor-pointer hover:bg-zinc-50 hover:border-emerald-100/30 dark:hover:bg-zinc-700 dark:hover:border-emerald-400/50 ${selectedDepositMethod?.chain === method.chain ? `bg-emerald-100/20 dark:bg-emerald-100/10 border-emerald-600 dark:border-emerald-400` : ""}`}
                    onClick={() => {
                      setSelectedDepositMethod(method);
                      // Auto-advance to next step after selecting network
                      setTimeout(() => {
                        setStep(4);
                      }, 300);
                    }}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center">
                        <div className="w-8 h-8 rounded-full bg-zinc-100 dark:bg-zinc-600 flex items-center justify-center mr-3 text-zinc-600 dark:text-zinc-100">
                          {method.chain?.charAt(0) || "N"}
                        </div>
                        <div>
                          <p className="font-medium text-zinc-800 dark:text-zinc-100">
                            {method.chain || method.name}
                          </p>
                          <p className="text-sm text-zinc-500 dark:text-zinc-400">
                            {method.description ||
                              `${selectedCurrency} on ${method.chain || "Network"}`}
                          </p>
                        </div>
                      </div>
                      <div className="text-sm text-zinc-500 dark:text-zinc-400">
                        {method.fee ? `Fee: ${method.fee}` : "Select"}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <AlertCircle className="h-12 w-12 text-zinc-400 mx-auto mb-4" />
                <p className="text-zinc-600 dark:text-zinc-300">
                  {tCommon("no_deposit_methods_available_for_this_currency")}
                </p>
                <Button
                  variant="outline"
                  className="mt-4"
                  onClick={() => setStep(2)}
                >
                  {tCommon("go_back")}
                </Button>
              </div>
            )}
          </div>
        </>
      );
    } else if (isFiat && step === 3) {
      // FIAT => Step 3 => Amount
      return renderAmountStep();
    }

    // Step 4 => Amount (non-FIAT) or Confirm (FIAT)
    if (!isFiat && step === 4) {
      return renderAmountStep();
    }

    // Step 4 => Confirm (FIAT) or Step 5 => Confirm (non-FIAT)
    if ((isFiat && step === 4) || (!isFiat && step === 5)) {
      return renderConfirmStep();
    }
    return null;
  }

  // Render "Enter Amount" step
  function renderAmountStep() {
    if (!selectedCurrency) return null;
    return (
      <>
        <div className="mb-6">
          <CardTitle>{tCommon("enter_deposit_amount")}</CardTitle>
          <CardDescription>
            {tCommon("enter_the_amount_you_want_to_deposit")}
          </CardDescription>
        </div>
        <div>
          <div className="space-y-6">
            <div className="space-y-2">
              <Input
                id="amount"
                type="number"
                placeholder="0.00"
                value={depositAmount || ""}
                onChange={(e) => {
                  const val = parseFloat(e.target.value);
                  setDepositAmount(!isNaN(val) ? val : 0);
                }}
                label={tCommon("deposit_amount")}
                prefix={selectedCurrency}
              />
              <p className="text-sm text-zinc-500 dark:text-zinc-400">
                {tCommon("minimum_deposit")}: {formatCurrency(100, selectedCurrency)}
              </p>
            </div>

            <div className={`bg-emerald-100/10 p-4 rounded-lg dark:bg-emerald-100/10 dark:text-zinc-100`}>
              <h3 className={`font-medium text-emerald-700 dark:text-emerald-400 mb-2`}>
                {tCommon("deposit_summary")}
              </h3>
              <div className="space-y-2 text-zinc-700 dark:text-zinc-100">
                <div className="flex justify-between">
                  <span className="text-zinc-600 dark:text-zinc-300">
                    {tCommon("wallet_type")}:
                  </span>
                  <span className="font-medium">
                    {selectedWalletType.label}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-600 dark:text-zinc-300">
                    {tCommon("currency")}:
                  </span>
                  <span className="font-medium">{selectedCurrency}</span>
                </div>
                {!isFiat && (
                  <div className="flex justify-between">
                    <span className="text-zinc-600 dark:text-zinc-300">
                      {tCommon("network")}:
                    </span>
                    <span className="font-medium">
                      {selectedDepositMethod?.chain || "N/A"}
                    </span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-zinc-600 dark:text-zinc-300">
                    {tCommon("amount")}:
                  </span>
                  <span className="font-medium">
                    {formatCurrency(depositAmount || 0, selectedCurrency)}
                  </span>
                </div>
                <Separator className="my-2 dark:border-zinc-600" />
                <div className="flex justify-between font-medium">
                  <span>{tCommon("total")}:</span>
                  <span>
                    {formatCurrency(depositAmount || 0, selectedCurrency)}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </>
    );
  }

  // Render "Confirmation" step
  function renderConfirmStep() {
    if (!selectedCurrency) return null;
    return (
      <>
        <div className="mb-6">
          <CardTitle>{tCommon("confirm_your_deposit")}</CardTitle>
          <CardDescription>
            {tCommon("review_your_deposit_final_submission")}
          </CardDescription>
        </div>
        <div className="space-y-6">
          <div className="bg-zinc-50 p-4 rounded-lg dark:bg-zinc-700 dark:text-zinc-100">
            <h4 className="font-medium mb-4">{tCommon("deposit_details")}</h4>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-zinc-600 dark:text-zinc-300">
                  {tCommon("wallet_type")}:
                </span>
                <span className="font-medium">{selectedWalletType.label}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-600 dark:text-zinc-300">
                  {tCommon("currency")}:
                </span>
                <span className="font-medium">{selectedCurrency}</span>
              </div>
              {!isFiat && (
                <div className="flex justify-between">
                  <span className="text-zinc-600 dark:text-zinc-300">
                    {tCommon("network")}:
                  </span>
                  <span className="font-medium">
                    {selectedDepositMethod?.chain || "N/A"}
                  </span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-zinc-600 dark:text-zinc-300">
                  {tCommon("amount")}:
                </span>
                <span className="font-medium">
                  {formatCurrency(depositAmount, selectedCurrency)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-600 dark:text-zinc-300">{tCommon("fee")}:</span>
                <span className="font-medium">
                  {formatCurrency(5, selectedCurrency)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-600 dark:text-zinc-300">
                  {t("total_to_be_charged_1")}:
                </span>
                <span className="font-medium">
                  {formatCurrency((depositAmount || 0) + 5, selectedCurrency)}
                </span>
              </div>
            </div>
          </div>
          <p className="text-sm text-zinc-600 dark:text-zinc-300">
            {t("by_clicking_submit_you_agree_to")}
          </p>
        </div>
      </>
    );
  }
  return (
    <div className="min-h-screen bg-linear-to-b from-background via-muted/10 to-background dark:from-zinc-950 dark:via-zinc-900/30 dark:to-zinc-950">
      <main className="container mx-auto pt-20 pb-24">
        {/* Header */}
        <div className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl md:text-4xl font-bold bg-linear-to-r from-zinc-900 to-zinc-600 dark:from-white dark:to-zinc-300 bg-clip-text text-transparent">
              {t("deposit_funds")}
            </h1>
            <p className="text-zinc-600 dark:text-zinc-400 mt-2">
              {tCommon("add_funds_to_your")} {account.broker} {tCommon("account")}{account.accountId})
            </p>
          </div>
          <Button
            variant="outline"
            className={`group rounded-xl border-zinc-200 dark:border-zinc-700 hover:bg-emerald-100/5 dark:hover:bg-emerald-600/10 hover:border-emerald-600/30`}
            onClick={() => router.push("/forex/dashboard")}
          >
            <ArrowLeft className="mr-2 h-4 w-4 transition-transform group-hover:-translate-x-1" />
            {tCommon("back_to_dashboard")}
          </Button>
        </div>

        {/* Stepper */}
        <Stepper
          currentStep={step}
          totalSteps={totalSteps}
          stepLabels={stepLabels}
          onNext={handleNext}
          onPrev={handlePrev}
          onSubmit={handleSubmit}
          isSubmitting={loading}
          disableNext={disableNext()}
          isDone={!!deposit}
          direction="vertical"
          showStepDescription
        >
          {/* The step content is rendered here */}
          <div className="mx-auto">{renderStepContent()}</div>
        </Stepper>
      </main>
    </div>
  );
}
