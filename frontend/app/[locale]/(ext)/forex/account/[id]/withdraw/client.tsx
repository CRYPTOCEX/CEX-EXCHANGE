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
import { MoneyFigure } from "@/components/ui/money-figure";
import { useRouter } from "@/i18n/routing";
import { StepLabelItem, Stepper } from "@/components/ui/stepper";
import { Loadable } from "@/components/ui/skeleton";
import { useParams } from "next/navigation";
import KycRequiredNotice from "@/components/blocks/kyc/kyc-required-notice";
import { useKycGate } from "@/hooks/use-kyc-gate";
import { useTranslations } from "next-intl";
import { quoteForexFee } from "../fee";

export default function WithdrawClient() {
  const tCommon = useTranslations("common");
  const tExt = useTranslations("ext");
  /*
    THE `isClient` GATE IS GONE — see deposit/client.tsx for the same audit.
    ========================================================================

    It was `if (!isClient) return <WithdrawLoading/>`: the route's own
    `loading.tsx`, so the server sent a card of grey bars and the real wizard
    arrived at hydration.

    Its stated reason — "two persisted zustand stores" — did not hold up.
    `useForexStore` (store/forex/user.ts:95) and `useWithdrawStore`
    (store/forex/withdraw.tsx:41) are both plain `create()` with no `persist`
    middleware, so both are at their coded initial state on the server and in
    the browser's first render alike.

    The KYC gate does read a persisted store (`useConfigStore.settings`), and it
    still cannot diverge here — though the reason had to be rewritten. It used
    to be "the server resolves to allowed and a browser with enforcement
    persisted resolves to loading, because `useUserStore` starts
    `isLoading: true`". Boot-time auth resolution killed that proof by seeding
    the profile before the first render (`store/auth-boot.ts`), so `isLoading`
    is already false.

    The surviving reason is stronger, because it never depended on the user
    store at all: React uses `useSyncExternalStore`'s `getServerSnapshot` for
    the HYDRATION render as well as for SSR, zustand passes
    `api.getInitialState` as that argument, and `persist` overrides
    `getInitialState` to the PRE-rehydration config (zustand middleware.js:380).
    So the hydrating render reads `settings === {}` whatever localStorage says,
    both sides resolve to "allowed", and the only branch that reads
    `gate.state` fires on `needs_kyc` / `needs_level` — neither of those. The
    two remaining reads are `isPending || !gate.allowed`, and `isPending` is
    true on both sides, so the `disabled` attribute agrees too.

    Measured with the harness, including with `bicrypto-config-store` seeded to
    force enforcement on: `hydrationErrors: 0`.
  */

  try {
    return <WithdrawClientContent />;
  } catch (error) {
    console.error("Error in WithdrawClient:", error);
    return (
      <div className="container mx-auto py-12">
        <div className="max-w-2xl mx-auto">
          <div className="text-center py-8">
            <AlertCircle className="h-12 w-12 text-destructive mx-auto mb-4" />
            <h3 className="text-lg font-medium text-foreground mb-2">
              {tCommon("something_went_wrong")}
            </h3>
            <p className="text-muted-foreground mb-6">
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
  const t = useTranslations("ext_forex");
  const tCommon = useTranslations("common");
  const tExt = useTranslations("ext");
  const gate = useKycGate("withdraw_forex");
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

  /*
    Both "nothing available" panels end in a Go back button, so each tells the
    user to reverse out of the wizard — the worst thing to flash while the
    answer is still in flight. They were unreachable during a fetch only
    because a spinner sat in front of them; with the tiles rendering through the
    load, `length === 0` holds for the whole request, so both guards name
    `loading`. Hoisted so that half reads as deliberate.
  */
  const showNoCurrencies = !loading && currencies.length === 0;
  const showNoWithdrawMethods =
    !loading && !(withdrawMethods && withdrawMethods.length > 0);

  /*
    The stand-in tiles — `null` IS the pending entry, painted by the same
    renderer as a real one. Four currencies fills two whole rows of the
    `grid-cols-2` grid with no orphan; three networks matches what a chain
    typically offers in the single-column list. Both counts settle, which is
    the accepted trade for a list of unknowable length (plans/SKELETONS.md).
  */
  const currencyTiles: (any | null)[] = loading
    ? [null, null, null, null]
    : currencies;
  const withdrawMethodRows: (any | null)[] = loading
    ? [null, null, null]
    : withdrawMethods || [];

  // The real fee, from the currency's configured percentage, rather than the
  // literal 5 these screens used to quote against a "total to receive" the
  // backend never paid.
  const withdrawQuote = quoteForexFee(
    withdrawAmount,
    currencies,
    selectedCurrency,
    selectedWalletType?.value
  );

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
  /*
    TWO FULL-PAGE SWAPS REMOVED, AND ONE INVERTED GUARD THEY WERE HIDING.
    Mirrors the deposit wizard next door; the same three notes apply.

      `gate.state === "loading"` is the USER store, not this page's data — true
      for every render up to hydration, so a cached account still got a grey
      page. `"anonymous"` never resolves, so a signed-out visitor never left it.

      `isLoadingAccount` withheld the whole wizard — h1, back button, the 4- or
      5-step Stepper and its labels — to avoid printing two words of the
      subtitle. `loading.tsx` here is one centred card with six bars and no
      stepper rail, so the page it replaced looked nothing like it.

      `!gate.allowed` is TRUE while the gate is merely undecided, so with the
      swap above gone it would have shown "complete verification" to everyone
      mid-fetch. It now names the two states that mean "not permitted".
  */
  const isPending = isLoadingAccount || !account;

  if (gate.state === "needs_kyc" || gate.state === "needs_level") {
    return (
      <KycRequiredNotice
        feature="withdraw_forex"
        requirement={gate.requirement ?? "verification"}
      />
    );
  }

  // Show error state if account not found or invalid
  if (accountError) {
    return (
      <div className="container mx-auto py-12 px-4">
        <div className="max-w-2xl mx-auto">
          <div className="text-center py-8">
            <AlertCircle className="h-12 w-12 text-destructive mx-auto mb-4" />
            <h3 className="text-lg font-medium text-foreground mb-2">
              {accountError}
            </h3>
            <p className="text-muted-foreground mb-6">
              {accountError === "Account not found" 
                ? tExt("the_account_youre_trying_to_access")
                : t("please_use_a_live_account_to_make_withdrawals")
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

  // Determine if the wallet is FIAT; if so, fewer steps (no network)
  const isFiat =
    selectedWalletType.value === "FIAT" || !selectedWalletType.value;
  const totalSteps = isFiat ? 4 : 5;

  // Define step labels with appropriate descriptions.
  const stepLabels: StepLabelItem[] = isFiat
    ? [
        {
          label: tCommon("wallet_type"),
          description: t("choose_the_wallet_type_you_want_to_withdraw_to"),
        },
        {
          label: tCommon("currency"),
          description: t("select_the_currency_you_want_to_withdraw"),
        },
        {
          label: tCommon("amount"),
          description: t("enter_the_withdrawal_amount"),
        },
        {
          label: tCommon("confirm"),
          description: t("review_your_withdrawal_details"),
        },
      ]
    : [
        {
          label: tCommon("wallet_type"),
          description: t("choose_the_wallet_type_you_want_to_withdraw_to"),
        },
        {
          label: tCommon("currency"),
          description: t("select_the_currency_you_want_to_withdraw"),
        },
        {
          label: tCommon("network"),
          description: t("choose_the_network_for_your_withdrawal"),
        },
        {
          label: tCommon("amount"),
          description: t("enter_the_withdrawal_amount"),
        },
        {
          label: tCommon("confirm"),
          description: t("review_your_withdrawal_details"),
        },
      ];

  // Step navigation
  function handleNext() {
    // Step 1: Validate wallet type selection
    if (step === 1) {
      if (!selectedWalletType.value) {
        toast.error(t("please_select_a_wallet_type"));
        return;
      }
      fetchCurrencies();
      // Don't automatically advance to step 2 - wait for currency fetch to complete
      return;
    }
    
    // Step 2: Validate currency selection
    if (step === 2) {
      if (!selectedCurrency || selectedCurrency === "Select a currency") {
        toast.error(t("please_select_a_currency"));
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
          toast.error(tExt("please_select_a_network"));
          return;
        }
        setStep(4); // Go to amount step for non-FIAT
      } else {
        // For FIAT, this is the amount step, validate before proceeding
        if (!withdrawAmount || withdrawAmount <= 0) {
          toast.error(tCommon("please_enter_a_valid_amount"));
          return;
        }
        if (!account || withdrawAmount > account.balance) {
          toast.error(tCommon("insufficient_balance"));
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
          toast.error(tCommon("please_enter_a_valid_amount"));
          return;
        }
        if (!account || withdrawAmount > account.balance) {
          toast.error(tCommon("insufficient_balance"));
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
    /* The page no longer withholds itself while the account and the permission
       check resolve, so the submit path carries both explicitly. `account` was
       also read UNGUARDED two lines down — behind the removed early return that
       was safe; without it, this threw on the first render. */
    if (isPending || !gate.allowed || !account) return;
    if (withdrawAmount <= 0) {
      toast.error(tCommon("please_enter_a_valid_amount"));
      return;
    }
    if (withdrawAmount > account.balance) {
      toast.error(tCommon("insufficient_balance"));
      return;
    }
    await handleWithdraw(id);
  }

  // Disable "Next" if required fields are missing
  function disableNext() {
    /* What used to be enforced by NOT RENDERING THE PAGE: no advancing a
       withdrawal for an account that has not loaded, and none at all until the
       gate has said yes. */
    if (isPending || !gate.allowed) return true;
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
          <CardTitle className="text-success flex items-center">
            <CheckCircle className="h-6 w-6 mr-2" />
            {tCommon("withdrawal_submitted")}
          </CardTitle>
          <CardDescription>
            {tExt("your_withdrawal_has_been_submitted_and")}
          </CardDescription>
        </div>
        <div className="space-y-6">
          <div className="bg-success/5 p-4 rounded-lg dark:bg-success/30 text-success-ink">
            <h4 className="font-medium mb-4">{tCommon("transaction_details")}</h4>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-muted-foreground">
                  {tCommon("transaction_id")}:
                </span>
                <span className="font-medium">
                  {withdraw.transaction
                    ? withdraw.transaction.id.substring(0, 8) + "..."
                    : "N/A"}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">
                  {tCommon("status")}:
                </span>
                <span className="font-medium">
                  {withdraw.status || tCommon("pending")}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">
                  {tCommon("amount")}:
                </span>
                <span className="font-medium">
                  <MoneyFigure value={formatCurrency(withdrawAmount, selectedCurrency)} />
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">{tCommon("fee")}:</span>
                <span className="font-medium">
                  <MoneyFigure value={formatCurrency(withdrawQuote.fee, selectedCurrency)} />
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">
                  {tExt("total_to_receive_1")}:
                </span>
                <span className="font-medium">
                  <MoneyFigure value={formatCurrency(withdrawQuote.totalReceived, selectedCurrency)} />
                </span>
              </div>
            </div>
          </div>
          
          {/* Transaction Status Information */}
          <div className={`bg-success/10 p-4 rounded-lg dark:bg-success/10 text-success-ink`}>
            <div className="flex items-center mb-2">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className={`h-5 w-5 mr-2 text-success`}
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
              <h4 className={`font-medium text-success`}>
                {tCommon("what_happens_next")}
              </h4>
            </div>
            <div className={`text-sm text-success space-y-1`}>
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
              {tCommon("view_transactions")}
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
                      className={`flex items-center p-4 border rounded-lg cursor-pointer hover:bg-muted w-full ${selectedWalletType.value === walletType.value ? `bg-success/20 dark:bg-success/10 border-success` : ""}`}
                    >
                      <Wallet className={`h-5 w-5 mr-3 text-success`} />
                      <div>
                        <p className="font-medium text-foreground">
                          {walletType.label} Wallet
                        </p>
                        <p className="text-sm text-subtle-foreground">
                          {walletType.value === "FIAT"
                            ? t("withdraw_to_bank_account")
                            : t("withdraw_to_cryptocurrency_wallet")}
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
          {/*
            Identical conversion to the deposit wizard's currency step. The step
            title and description already render above; only the tiles were
            withheld, behind a 32px ring in a `py-8` box (96px) standing in for
            a two-column grid of ~82px tiles — so every step of the wizard ended
            in a jump that carried the Continue/Back footer with it.
          */}
          <div>
            {showNoCurrencies ? (
              <div className="text-center py-8">
                <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">
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
            ) : (
              <div className="grid grid-cols-2 gap-4">
                {currencyTiles.map((currency: any, i: number) => {
                  const pending = !currency;
                  return (
                    <div
                      key={currency?.value ?? `pending-${i}`}
                      className={`border rounded-lg p-4 ${pending ? "cursor-default" : "cursor-pointer hover:bg-muted hover:border-success/30"} ${!pending && selectedCurrency === currency.value ? `bg-success/20 dark:bg-success/10 border-success` : ""}`}
                      onClick={() => currency && setSelectedCurrency(currency.value)}
                    >
                      <div className="flex items-center">
                        <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center mr-3 text-muted-foreground">
                          {pending ? null : currency.symbol || currency.value.charAt(0)}
                        </div>
                        <div>
                          <p className="font-medium text-foreground">
                            <Loadable loading={pending} placeholder={tExt("us_dollar")}>
                              {currency?.label}
                            </Loadable>
                          </p>
                          <p className="text-sm text-subtle-foreground">
                            <Loadable loading={pending} placeholder="USD">
                              {currency?.value}
                            </Loadable>
                          </p>
                        </div>
                      </div>
                    </div>
                  );
                })}
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
            {/* Same conversion as the currency step above. */}
            <div>
              {showNoWithdrawMethods ? (
                <div className="text-center py-8">
                  <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">
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
              ) : (
                <div className="space-y-4">
                  {withdrawMethodRows.map((method: any, i: number) => {
                    const pending = !method;
                    return (
                      <div
                        key={method ? method.id || method.chain : `pending-${i}`}
                        className={`border rounded-lg p-4 ${pending ? "cursor-default" : "cursor-pointer hover:bg-muted hover:border-success/30 dark:hover:border-success/50"} ${!pending && selectedWithdrawMethod?.chain === method.chain ? `bg-success/20 dark:bg-success/10 border-success` : ""}`}
                        onClick={() => {
                          if (!method) return;
                          setSelectedWithdrawMethod(method);
                          // Auto-advance to next step after selecting network
                          setTimeout(() => {
                            setStep(4);
                          }, 300);
                        }}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center">
                            <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center mr-3">
                              {pending ? null : method.chain?.charAt(0) || "N"}
                            </div>
                            <div>
                              <p className="font-medium text-foreground">
                                <Loadable loading={pending} placeholder="Ethereum">
                                  {pending ? null : method.chain || method.name}
                                </Loadable>
                              </p>
                              <p className="text-sm text-subtle-foreground">
                                <Loadable
                                  loading={pending}
                                  placeholder={`${selectedCurrency || "USDT"} on Network`}
                                >
                                  {pending
                                    ? null
                                    : method.description ||
                                      `${selectedCurrency} on ${method.chain || tCommon("network")}`}
                                </Loadable>
                              </p>
                            </div>
                          </div>
                          <div className="text-sm text-subtle-foreground">
                            <Loadable loading={pending} placeholder="Select">
                              {pending
                                ? null
                                : method.fee
                                ? tExt("fee", { fee: String(method.fee) })
                                : tCommon("select")}
                            </Loadable>
                          </div>
                        </div>
                      </div>
                    );
                  })}
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
            <p className="text-sm text-subtle-foreground">
              {tExt("minimum_withdrawal_1")}: {formatCurrency(50, selectedCurrency)}
            </p>
          </div>
          {selectedWalletType.value !== "FIAT" && (
            <div className="space-y-2">
              <Label htmlFor="address" className="text-primary-foreground">
                {tCommon("wallet_address")}
              </Label>
              <Input
                id="address"
                placeholder={tExt("enter_your_wallet_address")}
                className="bg-muted text-foreground"
              />
              <p className="text-sm text-subtle-foreground">
                {tCommon("make_sure_to_enter_the_correct_address_for_the")}{" "}
                {selectedWithdrawMethod?.chain} {tCommon("network")}
              </p>
            </div>
          )}
          <div className={`bg-success/10 p-4 rounded-lg dark:bg-success/10 text-foreground`}>
            <h3 className={`font-medium text-success mb-2`}>
              {tCommon("withdrawal_summary")}
            </h3>
            <div className="space-y-2 text-muted-foreground">
              <div className="flex justify-between">
                <span className="text-muted-foreground">
                  {tCommon("wallet_type")}:
                </span>
                <span className="font-medium">{selectedWalletType.label}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">
                  {tCommon("currency")}:
                </span>
                <span className="font-medium">{selectedCurrency}</span>
              </div>
              {!isFiat && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">
                    {tCommon("network")}:
                  </span>
                  <span className="font-medium">
                    {selectedWithdrawMethod?.chain || "N/A"}
                  </span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-muted-foreground">
                  {tCommon("amount")}:
                </span>
                <span className="font-medium">
                  <MoneyFigure value={formatCurrency(withdrawAmount || 0, selectedCurrency)} />
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">{tCommon("fee")}:</span>
                <span className="font-medium">
                  <MoneyFigure value={formatCurrency(withdrawQuote.fee, selectedCurrency)} />
                </span>
              </div>
              <div className="flex justify-between font-medium">
                <span>{tExt("total_to_receive_1")}:</span>
                <span>
                  <MoneyFigure value={formatCurrency(withdrawQuote.totalReceived, selectedCurrency)} />
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
          <div className="bg-muted p-4 rounded-lg text-foreground">
            <h4 className="font-medium mb-4">{tCommon("withdrawal_details")}</h4>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-muted-foreground">
                  {tCommon("wallet_type")}:
                </span>
                <span className="font-medium">{selectedWalletType.label}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">
                  {tCommon("currency")}:
                </span>
                <span className="font-medium">{selectedCurrency}</span>
              </div>
              {!isFiat && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">
                    {tCommon("network")}:
                  </span>
                  <span className="font-medium">
                    {selectedWithdrawMethod?.chain || "N/A"}
                  </span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-muted-foreground">
                  {tCommon("amount")}:
                </span>
                <span className="font-medium">
                  <MoneyFigure value={formatCurrency(withdrawAmount, selectedCurrency)} />
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">{tCommon("fee")}:</span>
                <span className="font-medium">
                  <MoneyFigure value={formatCurrency(withdrawQuote.fee, selectedCurrency)} />
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">
                  {tExt("total_to_receive_1")}:
                </span>
                <span className="font-medium">
                  <MoneyFigure value={formatCurrency(withdrawQuote.totalReceived, selectedCurrency)} />
                </span>
              </div>
            </div>
          </div>
          <p className="text-sm text-muted-foreground">
            {tExt('by_clicking_submit_you_agree_to')}
          </p>
        </div>
      </>
    );
  }
  
  return (
    <div className="min-h-screen bg-linear-to-b from-background via-muted/10 to-background dark:via-surface-2/30">
      <main className="container mx-auto px-4 pt-20 pb-24">
        {/* Header */}
        <div className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl md:text-4xl font-bold text-foreground">
              {tCommon("withdraw_funds")}
            </h1>
            <p className="text-muted-foreground mt-2">
              {tCommon("withdraw_funds_from_your")}{" "}
              <Loadable loading={isPending} placeholder="BrokerServer">
                {account?.broker}
              </Loadable>{" "}
              {tCommon("account")}
              <Loadable loading={isPending} placeholder="12345678">
                {account?.accountId}
              </Loadable>
              )
            </p>
          </div>
          <Button
            variant="outline"
            className={`group rounded-xl border-border hover:bg-success/5 dark:hover:bg-success/10 hover:border-success/30`}
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
