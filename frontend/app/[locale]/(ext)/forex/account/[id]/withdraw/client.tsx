"use client";

import React, { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Wallet,
  AlertCircle,
  ArrowLeft,
  CheckCircle,
  Copy,
} from "lucide-react";
import { toast } from "sonner";
import { useForexStore } from "@/store/forex/user";
import { useWithdrawStore } from "@/store/forex/withdraw";
import { formatCurrency } from "@/utils/formatters";
import { useRouter } from "@/i18n/routing";
import { StepLabelItem, Stepper } from "@/components/ui/stepper";
import WithdrawLoading from "./loading";
import { useParams } from "next/navigation";
import { useUserStore } from "@/store/user";
import { useConfigStore } from "@/store/config";
import KycRequiredNotice from "@/components/blocks/kyc/kyc-required-notice";
import { useTranslations } from "next-intl";

export default function WithdrawClient() {
  const tCommon = useTranslations("common");
  const tExt = useTranslations("ext");
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  if (!isClient) {
    return <WithdrawLoading />;
  }

  try {
    return <WithdrawClientContent />;
  } catch (error) {
    console.error("Error in WithdrawClient:", error);
    return (
      <div className="container mx-auto py-12">
        <div className="max-w-2xl mx-auto">
          <div className="text-center py-8">
            <AlertCircle className="h-12 w-12 text-red-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-zinc-900 dark:text-zinc-100 mb-2">
              {tCommon("something_went_wrong")}
            </h3>
            <p className="text-zinc-600 dark:text-zinc-300 mb-6">
              {tExt("there_was_an_error_loading_the_1")}
            </p>
            <Button
              onClick={() => window.location.reload()}
              className="px-6"
            >
              {tExt("reload_page")}
            </Button>
          </div>
        </div>
      </div>
    );
  }
}

function WithdrawClientContent() {
  const tCommon = useTranslations("common");
  const tExt = useTranslations("ext");
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
    withdrawMethods,
    selectedWithdrawMethod,
    setSelectedWithdrawMethod,
    withdrawAmount,
    setWithdrawAmount,
    withdraw,
    handleWithdraw,
    fetchCurrencies,
    fetchWithdrawMethods,
    clearAll,
    fetchAccount,
  } = useWithdrawStore();

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
      setAccountError("Withdrawals are only available for live accounts");
      setIsLoadingAccount(false);
      return;
    }
    
    setAccount(foundAccount);
    setAccountError(null);
    setIsLoadingAccount(false);
    fetchAccount(id);

    // Clear store state when component unmounts
    return () => {
      clearAll();
    };
  }, [id, accounts, clearAll, fetchAccount]);
  const kycEnabled = settings?.kycStatus === true || settings?.kycStatus === "true";
  const hasAccess = hasKyc() && canAccessFeature("withdraw_forex");
  
  if (kycEnabled && !hasAccess) {
    return <KycRequiredNotice feature="withdraw_forex" />;
  }

  // Show loading state while fetching account
  if (isLoadingAccount) {
    return <WithdrawLoading />;
  }

  // Show error state if account not found or invalid
  if (accountError) {
    return (
      <div className="container mx-auto py-12 px-4">
        <div className="max-w-2xl mx-auto">
          <div className="text-center py-8">
            <AlertCircle className="h-12 w-12 text-red-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-zinc-900 dark:text-zinc-100 mb-2">
              {accountError}
            </h3>
            <p className="text-zinc-600 dark:text-zinc-300 mb-6">
              {accountError === "Account not found" 
                ? "The account you're trying to access doesn't exist or you don't have permission to view it."
                : "Please use a live account to make withdrawals."
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
    return <WithdrawLoading />;
  }

  // Determine if the wallet is FIAT; if so, fewer steps (no network)
  const isFiat =
    selectedWalletType.value === "FIAT" || !selectedWalletType.value;
  const totalSteps = isFiat ? 4 : 5;

  // Define step labels with appropriate descriptions.
  const stepLabels: StepLabelItem[] = isFiat
    ? [
        {
          label: "Wallet Type",
          description: "Choose the wallet type you want to withdraw to",
        },
        {
          label: "Currency",
          description: "Select the currency you want to withdraw",
        },
        {
          label: "Amount",
          description: "Enter the withdrawal amount",
        },
        {
          label: "Confirm",
          description: "Review your withdrawal details",
        },
      ]
    : [
        {
          label: "Wallet Type",
          description: "Choose the wallet type you want to withdraw to",
        },
        {
          label: "Currency",
          description: "Select the currency you want to withdraw",
        },
        {
          label: "Network",
          description: "Choose the network for your withdrawal",
        },
        {
          label: "Amount",
          description: "Enter the withdrawal amount",
        },
        {
          label: "Confirm",
          description: "Review your withdrawal details",
        },
      ];

  // Step navigation
  function handleNext() {
    // Step 1: Validate wallet type selection
    if (step === 1) {
      if (!selectedWalletType.value) {
        toast.error("Please select a wallet type");
        return;
      }
      fetchCurrencies();
      // Don't automatically advance to step 2 - wait for currency fetch to complete
      return;
    }
    
    // Step 2: Validate currency selection
    if (step === 2) {
      if (!selectedCurrency || selectedCurrency === "Select a currency") {
        toast.error("Please select a currency");
        return;
      }
      
      if (!isFiat) {
        fetchWithdrawMethods();
        // Don't automatically advance - wait for methods to load
        return;
      } else {
        // For FIAT, go directly to amount step
        setStep(3);
      }
    }
    
    // Step 3: For non-FIAT, validate network selection; for FIAT, validate amount
    if (step === 3) {
      if (!isFiat) {
        if (!selectedWithdrawMethod) {
          toast.error("Please select a network");
          return;
        }
        setStep(4); // Go to amount step for non-FIAT
      } else {
        // For FIAT, this is the amount step, validate before proceeding
        if (!withdrawAmount || withdrawAmount <= 0) {
          toast.error("Please enter a valid amount");
          return;
        }
        if (!account || withdrawAmount > account.balance) {
          toast.error("Insufficient balance");
          return;
        }
        setStep(4); // Go to confirmation for FIAT
      }
    }
    
    // Step 4: Amount validation for non-FIAT, or confirmation for FIAT
    if (step === 4) {
      if (!isFiat) {
        // Validate amount for non-fiat
        if (!withdrawAmount || withdrawAmount <= 0) {
          toast.error("Please enter a valid amount");
          return;
        }
        if (!account || withdrawAmount > account.balance) {
          toast.error("Insufficient balance");
          return;
        }
        setStep(5); // Go to confirmation for non-FIAT
      }
      // For FIAT, step 4 is already confirmation, so this should trigger submit
    }
  }
  function handlePrev() {
    if (step > 1) {
      setStep(step - 1);
    }
  }

  // Final "Submit" action for withdrawal
  async function handleSubmit() {
    if (withdrawAmount <= 0) {
      toast.error("Please enter a valid amount");
      return;
    }
    if (withdrawAmount > account.balance) {
      toast.error("Insufficient balance");
      return;
    }
    await handleWithdraw(id);
  }

  // Disable "Next" if required fields are missing
  function disableNext() {
    if (withdraw) return true;
    if (step === 1 && !selectedWalletType.value) return true;
    if (
      step === 2 &&
      (!selectedCurrency || selectedCurrency === "Select a currency")
    )
      return true;
    if (!isFiat && step === 3 && !selectedWithdrawMethod) return true;
    if (!isFiat && step === 4 && (!withdrawAmount || withdrawAmount < 50)) return true;
    return false;
  }

  // Render success step after a successful withdrawal.
  function renderSuccessStep() {
    if (!selectedCurrency) return null;
    return (
      <>
        <div className="mb-6">
          <CardTitle className="text-green-600 flex items-center">
            <CheckCircle className="h-6 w-6 mr-2" />
            {tCommon("withdrawal_submitted")}
          </CardTitle>
          <CardDescription>
            {tExt("your_withdrawal_has_been_submitted_and")}
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
                  {withdraw.transaction
                    ? withdraw.transaction.id.substring(0, 8) + "..."
                    : "N/A"}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-600 dark:text-green-200">
                  {tCommon("status")}:
                </span>
                <span className="font-medium">
                  {withdraw.status || "Pending"}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-600 dark:text-green-200">
                  {tCommon("amount")}:
                </span>
                <span className="font-medium">
                  {formatCurrency(withdrawAmount, selectedCurrency)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-600 dark:text-green-200">{tCommon("fee")}:</span>
                <span className="font-medium">
                  {formatCurrency(5, selectedCurrency)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-600 dark:text-green-200">
                  {tExt("total_to_receive_1")}:
                </span>
                <span className="font-medium">
                  {formatCurrency(withdrawAmount - 5, selectedCurrency)}
                </span>
              </div>
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
              <p>{tExt("your_transaction_is_currently")} <strong>PENDING</strong> approval</p>
              <p>{tExt("you_will_receive_an_email_notification")}</p>
              <p>{tExt("you_can_track_the_status_in_your")} <strong>{tCommon("forex_transactions")}</strong> page</p>
              <p>{tCommon("processing_typically_takes_15_30_minutes")}</p>
            </div>
          </div>

          <div className="flex justify-center gap-4 mt-6">
            <Button
              onClick={() => router.push("/forex/transaction")}
              variant="outline"
              className="px-6"
            >
              {tExt("view_transactions")}
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

  // Render step content based on the current step.
  function renderStepContent() {
    if (withdraw) {
      return renderSuccessStep();
    }
    // Step 1: Wallet Type selection
    if (step === 1) {
      return (
        <>
          <div className="mb-6">
            <CardTitle>{tCommon("select_wallet_type")}</CardTitle>
            <CardDescription>
              {tExt("choose_the_type_of_wallet_you_want_to_withdraw_to_1")}
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
                            ? "Withdraw to bank account"
                            : "Withdraw to cryptocurrency wallet"}
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

    // Step 2: Currency selection
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
                  {tExt("no_currencies_available_for_this_wallet_type")}
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

    // Step 3: Either network selection (non-FIAT) or amount entry (FIAT)
    if (step === 3) {
      if (!isFiat) {
        // Non-FIAT: Network selection
        return (
          <>
            <div className="mb-6">
              <CardTitle>{tCommon("select_network")}</CardTitle>
              <CardDescription>
                {tExt("choose_the_network_for_your_withdrawal_1")}
              </CardDescription>
            </div>
            <div>
              {loading ? (
                <div className="flex justify-center py-8">
                  <div className={`w-8 h-8 border-4 border-emerald-100/20 border-t-emerald-600 rounded-full animate-spin`} />
                </div>
              ) : withdrawMethods && withdrawMethods.length > 0 ? (
                <div className="space-y-4">
                  {withdrawMethods.map((method: any) => (
                    <div
                      key={method.id || method.chain}
                      className={`border rounded-lg p-4 cursor-pointer hover:bg-zinc-50 hover:border-emerald-100/30 dark:hover:bg-zinc-700 dark:hover:border-emerald-400/50 ${selectedWithdrawMethod?.chain === method.chain ? `bg-emerald-100/20 dark:bg-emerald-100/10 border-emerald-600 dark:border-emerald-400` : ""}`}
                      onClick={() => {
                        setSelectedWithdrawMethod(method);
                        // Auto-advance to next step after selecting network
                        setTimeout(() => {
                          setStep(4);
                        }, 300);
                      }}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center">
                          <div className="w-8 h-8 rounded-full bg-zinc-100 dark:bg-zinc-600 flex items-center justify-center mr-3">
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
                        <div className="text-sm text-zinc-500">
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
                    {tExt("no_withdrawal_methods_available_for_this_currency_1")}
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
      } else {
        // FIAT: directly render amount entry
        return renderAmountStep();
      }
    }

    // Step 4: Either the amount entry (for non-FIAT) or confirmation (for FIAT)
    if (step === 4) {
      if (!isFiat) {
        return renderAmountStep();
      } else {
        return renderConfirmStep();
      }
    }

    // Step 5: Confirmation (for non-FIAT)
    if (step === 5) {
      return renderConfirmStep();
    }
    return null;
  }

  // Render "Enter Amount" step – includes extra input fields (uncontrolled) for wallet address (non-FIAT)
  // or bank details (FIAT). Consider storing these values in state if you need them for your API.
  function renderAmountStep() {
    if (!selectedCurrency) return null;
    return (
      <>
        <div className="mb-6">
          <CardTitle>{tCommon("enter_withdrawal_amount")}</CardTitle>
          <CardDescription>
            {tCommon("enter_the_amount_you_want_to_withdraw_1")}
          </CardDescription>
        </div>
        <div className="space-y-6">
          <div className="space-y-2">
            <Input
              id="amount"
              type="number"
              placeholder="0.00"
              value={withdrawAmount || ""}
              onChange={(e) => {
                const val = parseFloat(e.target.value);
                setWithdrawAmount(!isNaN(val) ? val : 0);
              }}
              label={tCommon("withdrawal_amount")}
              prefix={selectedCurrency}
            />
            <p className="text-sm text-zinc-500 dark:text-zinc-400">
              {tExt("minimum_withdrawal_1")}: {formatCurrency(50, selectedCurrency)}
            </p>
          </div>
          {selectedWalletType.value !== "FIAT" && (
            <div className="space-y-2">
              <Label htmlFor="address" className="dark:text-white">
                {tCommon("wallet_address")}
              </Label>
              <Input
                id="address"
                placeholder={tExt("enter_your_wallet_address")}
                className="dark:bg-zinc-800 dark:text-white"
              />
              <p className="text-sm text-zinc-500 dark:text-zinc-400">
                {tCommon("make_sure_to_enter_the_correct_address_for_the")}{" "}
                {selectedWithdrawMethod?.chain} {tCommon("network")}
              </p>
            </div>
          )}
          <div className={`bg-emerald-100/10 p-4 rounded-lg dark:bg-emerald-100/10 dark:text-zinc-100`}>
            <h3 className={`font-medium text-emerald-700 dark:text-emerald-400 mb-2`}>
              {tCommon("withdrawal_summary")}
            </h3>
            <div className="space-y-2 text-zinc-700 dark:text-zinc-100">
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
                    {selectedWithdrawMethod?.chain || "N/A"}
                  </span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-zinc-600 dark:text-zinc-300">
                  {tCommon("amount")}:
                </span>
                <span className="font-medium">
                  {formatCurrency(withdrawAmount || 0, selectedCurrency)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-600 dark:text-zinc-300">{tCommon("fee")}:</span>
                <span className="font-medium">
                  {formatCurrency(5, selectedCurrency)}
                </span>
              </div>
              <div className="flex justify-between font-medium">
                <span>{tExt("total_to_receive_1")}:</span>
                <span>
                  {formatCurrency(withdrawAmount - 5, selectedCurrency)}
                </span>
              </div>
            </div>
          </div>
        </div>
      </>
    );
  }

  // Render confirmation step where the user reviews all withdrawal details.
  function renderConfirmStep() {
    if (!selectedCurrency) return null;
    return (
      <>
        <div className="mb-6">
          <CardTitle>{tCommon("confirm_your_withdrawal")}</CardTitle>
          <CardDescription>
            {tExt("review_your_withdrawal_details_before_final")}
          </CardDescription>
        </div>
        <div className="space-y-6">
          <div className="bg-zinc-50 p-4 rounded-lg dark:bg-zinc-700 dark:text-zinc-100">
            <h4 className="font-medium mb-4">{tCommon("withdrawal_details")}</h4>
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
                    {selectedWithdrawMethod?.chain || "N/A"}
                  </span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-zinc-600 dark:text-zinc-300">
                  {tCommon("amount")}:
                </span>
                <span className="font-medium">
                  {formatCurrency(withdrawAmount, selectedCurrency)}
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
                  {tExt("total_to_receive_1")}:
                </span>
                <span className="font-medium">
                  {formatCurrency(withdrawAmount - 5, selectedCurrency)}
                </span>
              </div>
            </div>
          </div>
          <p className="text-sm text-zinc-600 dark:text-zinc-300">
            {tExt('by_clicking_submit_you_agree_to')}
          </p>
        </div>
      </>
    );
  }
  
  return (
    <div className="min-h-screen bg-linear-to-b from-background via-muted/10 to-background dark:from-zinc-950 dark:via-zinc-900/30 dark:to-zinc-950">
      <main className="container mx-auto px-4 pt-20 pb-24">
        {/* Header */}
        <div className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl md:text-4xl font-bold bg-linear-to-r from-zinc-900 to-zinc-600 dark:from-white dark:to-zinc-300 bg-clip-text text-transparent">
              {tCommon("withdraw_funds")}
            </h1>
            <p className="text-zinc-600 dark:text-zinc-400 mt-2">
              {tCommon("withdraw_funds_from_your")} {account.broker} {tCommon("account")}{account.accountId})
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
          isDone={!!withdraw}
          direction="vertical"
          showStepDescription
        >
          <div className="mx-auto">{renderStepContent()}</div>
        </Stepper>
      </main>
    </div>
  );
}
