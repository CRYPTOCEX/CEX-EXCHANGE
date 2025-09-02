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

export default function WithdrawClient() {
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
      <div className="container mx-auto py-12 px-4">
        <div className="max-w-2xl mx-auto">
          <div className="text-center py-8">
            <AlertCircle className="h-12 w-12 text-red-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-zinc-900 dark:text-zinc-100 mb-2">
              Something went wrong
            </h3>
            <p className="text-zinc-600 dark:text-zinc-300 mb-6">
              There was an error loading the withdrawal page. Please try again.
            </p>
            <Button
              onClick={() => window.location.reload()}
              className="px-6"
            >
              Reload Page
            </Button>
          </div>
        </div>
      </div>
    );
  }
}

function WithdrawClientContent() {
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
              Back to Dashboard
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
            Withdrawal Submitted
          </CardTitle>
          <CardDescription>
            Your withdrawal has been submitted and is being processed.
          </CardDescription>
        </div>
        <div className="space-y-6">
          <div className="bg-green-50 p-4 rounded-lg dark:bg-green-900/30 dark:text-green-100">
            <h4 className="font-medium mb-4">Transaction Details</h4>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-zinc-600 dark:text-green-200">
                  Transaction ID:
                </span>
                <span className="font-medium">
                  {withdraw.transaction
                    ? withdraw.transaction.id.substring(0, 8) + "..."
                    : "N/A"}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-600 dark:text-green-200">
                  Status:
                </span>
                <span className="font-medium">
                  {withdraw.status || "Pending"}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-600 dark:text-green-200">
                  Amount:
                </span>
                <span className="font-medium">
                  {formatCurrency(withdrawAmount, selectedCurrency)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-600 dark:text-green-200">Fee:</span>
                <span className="font-medium">
                  {formatCurrency(5, selectedCurrency)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-600 dark:text-green-200">
                  Total to Receive:
                </span>
                <span className="font-medium">
                  {formatCurrency(withdrawAmount - 5, selectedCurrency)}
                </span>
              </div>
            </div>
          </div>
          
          {/* Transaction Status Information */}
          <div className="bg-blue-50 p-4 rounded-lg dark:bg-blue-900/30 dark:text-blue-100">
            <div className="flex items-center mb-2">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-5 w-5 mr-2 text-blue-600"
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
              <h4 className="font-medium text-blue-900 dark:text-blue-100">
                What happens next?
              </h4>
            </div>
            <div className="text-sm text-blue-800 dark:text-blue-200 space-y-1">
              <p>• Your transaction is currently <strong>PENDING</strong> approval</p>
              <p>• You will receive an email notification once it's processed</p>
              <p>• You can track the status in your <strong>Forex Transactions</strong> page</p>
              <p>• Processing typically takes 15-30 minutes</p>
            </div>
          </div>

          <div className="flex justify-center gap-4 mt-6">
            <Button
              onClick={() => router.push("/forex/transactions")}
              variant="outline"
              className="px-6"
            >
              View Transactions
            </Button>
            <Button
              onClick={() => router.push("/forex/dashboard")}
              className="px-6"
            >
              Return to Dashboard
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
            <CardTitle>Select Wallet Type</CardTitle>
            <CardDescription>
              Choose the type of wallet you want to withdraw to.
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
                      className={`flex items-center p-4 border rounded-lg cursor-pointer hover:bg-zinc-50 dark:hover:bg-zinc-700 w-full ${selectedWalletType.value === walletType.value ? "bg-blue-100 dark:bg-blue-900/30 border-blue-500 dark:border-blue-400" : ""}`}
                    >
                      <Wallet className="h-5 w-5 mr-3" />
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
            <CardTitle>Select Currency</CardTitle>
            <CardDescription>
              Select the currency you want to deposit
            </CardDescription>
          </div>
          <div>
            {loading ? (
              <div className="flex justify-center py-8">
                <div className="w-8 h-8 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin" />
              </div>
            ) : currencies.length > 0 ? (
              <div className="grid grid-cols-2 gap-4">
                {currencies.map((currency: any) => (
                  <div
                    key={currency.value}
                    className={`border rounded-lg p-4 cursor-pointer hover:bg-zinc-50 hover:border-blue-300 dark:hover:bg-zinc-700 ${selectedCurrency === currency.value ? "bg-blue-100 dark:bg-blue-900/30 border-blue-500 dark:border-blue-400" : ""}`}
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
                  No currencies available for this wallet type
                </p>
                <Button
                  variant="outline"
                  className="mt-4"
                  onClick={() => setStep(1)}
                >
                  Go Back
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
              <CardTitle>Select Network</CardTitle>
              <CardDescription>
                Choose the network for your withdrawal.
              </CardDescription>
            </div>
            <div>
              {loading ? (
                <div className="flex justify-center py-8">
                  <div className="w-8 h-8 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin" />
                </div>
              ) : withdrawMethods && withdrawMethods.length > 0 ? (
                <div className="space-y-4">
                  {withdrawMethods.map((method: any) => (
                    <div
                      key={method.id || method.chain}
                      className={`border rounded-lg p-4 cursor-pointer hover:bg-zinc-50 hover:border-blue-300 dark:hover:bg-zinc-700 dark:hover:border-blue-400 ${selectedWithdrawMethod?.chain === method.chain ? "bg-blue-100 dark:bg-blue-900/30 border-blue-500 dark:border-blue-400" : ""}`}
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
                    No withdrawal methods available for this currency.
                  </p>
                  <Button
                    variant="outline"
                    className="mt-4"
                    onClick={() => setStep(2)}
                  >
                    Go Back
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
          <CardTitle>Enter Withdrawal Amount</CardTitle>
          <CardDescription>
            Enter the amount you want to withdraw.
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
              label="Withdrawal Amount"
              prefix={selectedCurrency}
            />
            <p className="text-sm text-zinc-500 dark:text-zinc-400">
              Minimum withdrawal: {formatCurrency(50, selectedCurrency)}
            </p>
          </div>
          {selectedWalletType.value !== "FIAT" && (
            <div className="space-y-2">
              <Label htmlFor="address" className="dark:text-white">
                Wallet Address
              </Label>
              <Input
                id="address"
                placeholder="Enter your wallet address"
                className="dark:bg-zinc-800 dark:text-white"
              />
              <p className="text-sm text-zinc-500 dark:text-zinc-400">
                Make sure to enter the correct address for the{" "}
                {selectedWithdrawMethod?.chain} network.
              </p>
            </div>
          )}
          <div className="bg-blue-50 p-4 rounded-lg dark:bg-zinc-700 dark:text-zinc-100">
            <h3 className="font-medium text-blue-900 dark:text-zinc-100 mb-2">
              Withdrawal Summary
            </h3>
            <div className="space-y-2 text-zinc-700 dark:text-zinc-100">
              <div className="flex justify-between">
                <span className="text-zinc-600 dark:text-zinc-300">
                  Wallet Type:
                </span>
                <span className="font-medium">{selectedWalletType.label}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-600 dark:text-zinc-300">
                  Currency:
                </span>
                <span className="font-medium">{selectedCurrency}</span>
              </div>
              {!isFiat && (
                <div className="flex justify-between">
                  <span className="text-zinc-600 dark:text-zinc-300">
                    Network:
                  </span>
                  <span className="font-medium">
                    {selectedWithdrawMethod?.chain || "N/A"}
                  </span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-zinc-600 dark:text-zinc-300">
                  Amount:
                </span>
                <span className="font-medium">
                  {formatCurrency(withdrawAmount || 0, selectedCurrency)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-600 dark:text-zinc-300">Fee:</span>
                <span className="font-medium">
                  {formatCurrency(5, selectedCurrency)}
                </span>
              </div>
              <div className="flex justify-between font-medium">
                <span>Total to Receive:</span>
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
          <CardTitle>Confirm Your Withdrawal</CardTitle>
          <CardDescription>
            Review your withdrawal details before final submission.
          </CardDescription>
        </div>
        <div className="space-y-6">
          <div className="bg-zinc-50 p-4 rounded-lg dark:bg-zinc-700 dark:text-zinc-100">
            <h4 className="font-medium mb-4">Withdrawal Details</h4>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-zinc-600 dark:text-zinc-300">
                  Wallet Type:
                </span>
                <span className="font-medium">{selectedWalletType.label}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-600 dark:text-zinc-300">
                  Currency:
                </span>
                <span className="font-medium">{selectedCurrency}</span>
              </div>
              {!isFiat && (
                <div className="flex justify-between">
                  <span className="text-zinc-600 dark:text-zinc-300">
                    Network:
                  </span>
                  <span className="font-medium">
                    {selectedWithdrawMethod?.chain || "N/A"}
                  </span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-zinc-600 dark:text-zinc-300">
                  Amount:
                </span>
                <span className="font-medium">
                  {formatCurrency(withdrawAmount, selectedCurrency)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-600 dark:text-zinc-300">Fee:</span>
                <span className="font-medium">
                  {formatCurrency(5, selectedCurrency)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-600 dark:text-zinc-300">
                  Total to Receive:
                </span>
                <span className="font-medium">
                  {formatCurrency(withdrawAmount - 5, selectedCurrency)}
                </span>
              </div>
            </div>
          </div>
          <p className="text-sm text-zinc-600 dark:text-zinc-300">
            By clicking “Submit”, you agree to proceed with this withdrawal.
          </p>
        </div>
      </>
    );
  }
  
  return (
    <div>
      <main className="container mx-auto px-4 pt-8 mb-24">
        {/* Header */}
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Withdraw Funds</h1>
            <p className="text-zinc-600 dark:text-zinc-400 mt-2">
              Withdraw funds from your {account.broker} account (
              {account.accountId})
            </p>
          </div>
          <Button
            variant="ghost"
            className="mb-6 group dark:text-zinc-100"
            onClick={() => router.push("/forex/dashboard")}
          >
            <ArrowLeft className="mr-2 h-4 w-4 transition-transform group-hover:-translate-x-1" />
            Back to Dashboard
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
