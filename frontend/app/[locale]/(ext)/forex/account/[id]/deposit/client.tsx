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

export default function DepositClient() {
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
      <div className="container mx-auto px-4 pt-8 mb-24">
        <div className="text-center py-12">
          <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold mb-2">Something went wrong</h1>
          <p className="text-muted-foreground mb-4">
            There was an error loading the deposit page. Please try refreshing the page.
          </p>
          <Button onClick={() => window.location.reload()}>
            Refresh Page
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
                : "Please use a live account to make deposits."
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
            Deposit Submitted
          </CardTitle>
          <CardDescription>
            Your deposit has been submitted and is being processed
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
                  {deposit.transaction?.id
                    ? deposit.transaction.id.substring(0, 8) + "..."
                    : "N/A"}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-600 dark:text-green-200">
                  Status:
                </span>
                <span className="font-medium">
                  {deposit.transaction?.status || "PENDING"}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-600 dark:text-green-200">
                  Amount:
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
                  Currency:
                </span>
                <span className="font-medium">
                  {deposit.currency || selectedCurrency}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-600 dark:text-green-200">Type:</span>
                <span className="font-medium">
                  {deposit.type || selectedWalletType.value}
                </span>
              </div>
              {deposit.balance !== undefined && (
                <div className="flex justify-between">
                  <span className="text-zinc-600 dark:text-green-200">
                    New Balance:
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
              <p>• Processing typically takes 5-15 minutes</p>
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
            <CardTitle>Select Wallet Type</CardTitle>
            <CardDescription>
              Choose the type of wallet you want to deposit from
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
                      className={`flex items-center p-4 border rounded-lg cursor-pointer hover:bg-zinc-50 dark:hover:bg-zinc-700 w-full ${selectedWalletType.value === walletType.value ? "bg-blue-100 dark:bg-blue-900/30 border-blue-500 dark:border-blue-400" : ""}`}
                    >
                      <Wallet className="h-5 w-5 mr-3 text-blue-600" />
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

    // Step 3 => Network (non-FIAT) or Amount (FIAT)
    if (!isFiat && step === 3) {
      // Non-fiat => Network selection
      return (
        <>
          <div className="mb-6">
            <CardTitle>Select Network</CardTitle>
            <CardDescription>
              Choose the network for your deposit
            </CardDescription>
          </div>
          <div>
            {loading ? (
              <div className="flex justify-center py-8">
                <div className="w-8 h-8 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin" />
              </div>
            ) : depositMethods && depositMethods.length > 0 ? (
              <div className="space-y-4">
                {depositMethods.map((method: any) => (
                  <div
                    key={method.id || method.chain}
                    className={`border rounded-lg p-4 cursor-pointer hover:bg-zinc-50 hover:border-blue-300 dark:hover:bg-zinc-700 dark:hover:border-blue-400 ${selectedDepositMethod?.chain === method.chain ? "bg-blue-100 dark:bg-blue-900/30 border-blue-500 dark:border-blue-400" : ""}`}
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
                  No deposit methods available for this currency
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
          <CardTitle>Enter Deposit Amount</CardTitle>
          <CardDescription>
            Enter the amount you want to deposit
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
                label="Deposit Amount"
                prefix={selectedCurrency}
              />
              <p className="text-sm text-zinc-500 dark:text-zinc-400">
                Minimum deposit: {formatCurrency(100, selectedCurrency)}
              </p>
            </div>

            <div className="bg-blue-50 p-4 rounded-lg dark:bg-zinc-700 dark:text-zinc-100">
              <h3 className="font-medium text-blue-900 dark:text-zinc-100 mb-2">
                Deposit Summary
              </h3>
              <div className="space-y-2 text-zinc-700 dark:text-zinc-100">
                <div className="flex justify-between">
                  <span className="text-zinc-600 dark:text-zinc-300">
                    Wallet Type:
                  </span>
                  <span className="font-medium">
                    {selectedWalletType.label}
                  </span>
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
                      {selectedDepositMethod?.chain || "N/A"}
                    </span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-zinc-600 dark:text-zinc-300">
                    Amount:
                  </span>
                  <span className="font-medium">
                    {formatCurrency(depositAmount || 0, selectedCurrency)}
                  </span>
                </div>
                <Separator className="my-2 dark:border-zinc-600" />
                <div className="flex justify-between font-medium">
                  <span>Total:</span>
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
          <CardTitle>Confirm Your Deposit</CardTitle>
          <CardDescription>
            Review your deposit details before final submission
          </CardDescription>
        </div>
        <div className="space-y-6">
          <div className="bg-zinc-50 p-4 rounded-lg dark:bg-zinc-700 dark:text-zinc-100">
            <h4 className="font-medium mb-4">Deposit Details</h4>
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
                    {selectedDepositMethod?.chain || "N/A"}
                  </span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-zinc-600 dark:text-zinc-300">
                  Amount:
                </span>
                <span className="font-medium">
                  {formatCurrency(depositAmount, selectedCurrency)}
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
                  Total to be charged:
                </span>
                <span className="font-medium">
                  {formatCurrency((depositAmount || 0) + 5, selectedCurrency)}
                </span>
              </div>
            </div>
          </div>
          <p className="text-sm text-zinc-600 dark:text-zinc-300">
            By clicking “Submit”, you agree to proceed with this deposit.
          </p>
        </div>
      </>
    );
  }
  return (
    <div>
      <main className="container mx-auto px-4 pt-8 mb-24">
        {/* Title */}
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Deposit Funds</h1>
            <p className="text-zinc-600 dark:text-zinc-400 mt-2">
              Add funds to your {account.broker} account ({account.accountId})
            </p>
          </div>
          {/* Back Button */}
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
