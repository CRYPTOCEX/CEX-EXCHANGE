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
import { MoneyFigure } from "@/components/ui/money-figure";
import { useRouter } from "@/i18n/routing";
import { Loadable } from "@/components/ui/skeleton";
import { useParams } from "next/navigation";
import { StepLabelItem, Stepper } from "@/components/ui/stepper";
import KycRequiredNotice from "@/components/blocks/kyc/kyc-required-notice";
import { useKycGate } from "@/hooks/use-kyc-gate";
import { useTranslations } from "next-intl";
import { quoteForexFee } from "../fee";

export default function DepositClient() {
  const tCommon = useTranslations("common");
  const tExt = useTranslations("ext");
  const [hasError, setHasError] = useState(false);

  // Error boundary effect
  useEffect(() => {
    const handleError = (error: ErrorEvent) => {
      console.error("Client error:", error);
      setHasError(true);
    };

    window.addEventListener('error', handleError);
    return () => window.removeEventListener('error', handleError);
  }, []);

  /*
    THE `isClient` GATE IS GONE, AND THE AUDIT IT WAS WAITING FOR IS BELOW.
    =======================================================================

    It was `if (!isClient) return <DepositLoading/>` — the route's own
    `loading.tsx`, i.e. still a whole-page swap, just a one-frame one. The
    server rendered a stepper made of grey bars and the real wizard arrived at
    hydration; `curl` on this route produced none of the page's own markup.

    The comment that guarded it said `DepositClientContent` "reads two persisted
    zustand stores". It does not. Checked one at a time:

      `useForexStore`   store/forex/user.ts:95     plain `create()`, no persist
      `useDepositStore` store/forex/deposit.tsx:49 plain `create()`, no persist

    Neither is wrapped in `persist`, so both hold their coded initial state on
    the server and in the browser's first render alike.

    The one real persisted read is INDIRECT, through `useKycGate` →
    `useConfigStore` (`bicrypto-config-store`, whose `partialize` includes
    `settings`). It is safe here, and the reason is worth writing down because
    it is not obvious:

      - `isKycFeatureEnforced({})` is false, so the SERVER's gate is "allowed".
      - The browser's FIRST render sees `{}` too, and that is a property of the
        machinery rather than of this page: React's `useSyncExternalStore` uses
        the `getServerSnapshot` argument for the hydration pass as well as for
        SSR, zustand passes `api.getInitialState` as that argument, and the
        `persist` middleware overrides `getInitialState` to return the
        PRE-rehydration config (zustand middleware.js:380). So localStorage
        cannot reach the hydrating render no matter what it holds; the persisted
        settings only land afterwards, as an ordinary update.
      - This used to be argued from `useUserStore` starting at
        `isLoading: true`, which `useKycGate` answered with "loading". That
        proof is DEAD: boot-time auth resolution now seeds the profile and
        clears `isLoading` before the first render (see `store/auth-boot.ts`).
        The gate is "allowed" on both sides now, not "allowed" vs "loading" —
        which is why the reason above had to be established independently before
        that change could ship.
      - The only branch below that reads `gate.state` fires on `needs_kyc` /
        `needs_level`. "allowed" is not one of those, so both sides render the
        same tree.
      - `gate.allowed` is read twice more, in `handleSubmit` and `disableNext`,
        and both are `isPending || !gate.allowed` — `isPending` is
        `isLoadingAccount || !account`, which is true on the server AND in the
        first client render, so the `gate.allowed` term cannot change the
        rendered `disabled` attribute either.

    Verified rather than reasoned about: harness run over this route reports
    `hydrationErrors: 0`, including with `bicrypto-config-store` seeded with
    `kycStatus`/`kycFeatureEnforcement` enabled — the hostile case that makes
    the client gate say "loading" where the server said "allowed".
  */

  // Show error fallback if there's an error
  if (hasError) {
    return (
      // `pt-8` is 32px under a 64px fixed header. This branch stands in for the
      // whole page, so it owns the clearance the page's hero normally supplies.
      <div className="container mx-auto pt-header-clear mb-24">
        <div className="text-center py-12">
          <AlertCircle className="h-12 w-12 text-destructive mx-auto mb-4" />
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
  const gate = useKycGate("deposit_forex");
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

  /*
    Both "nothing available" panels end in a Go back button, so each is a dead
    end the user is being told to reverse out of — the worst thing to flash
    while the answer is still on its way. They were unreachable during a fetch
    only because a spinner stood in front of them; with the tiles rendering
    through the load, `length === 0` is true for the whole request, so both
    guards name `loading` explicitly. Hoisted so that half reads as deliberate.
  */
  const showNoCurrencies = !loading && currencies.length === 0;
  const showNoDepositMethods =
    !loading && !(depositMethods && depositMethods.length > 0);

  /*
    The stand-in tiles. `null` IS the pending entry, painted by the same
    renderer as a real one — no second copy of either row.

    Four currencies because the grid is `grid-cols-2`: four is two full rows and
    cannot leave an orphan. Three networks because the list is single-column and
    a chain usually offers a handful; both counts settle, which is the accepted
    trade for a list of unknowable length (plans/SKELETONS.md).
  */
  const currencyTiles: (any | null)[] = loading
    ? [null, null, null, null]
    : currencies;
  const depositMethodRows: (any | null)[] = loading
    ? [null, null, null]
    : depositMethods || [];

  // The real fee, computed the way the backend computes it, rather than the
  // literal 5 this screen used to print.
  const depositQuote = quoteForexFee(
    depositAmount,
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

  /*
    TWO FULL-PAGE SWAPS REMOVED, AND ONE INVERTED GUARD THAT REMOVING THEM
    WOULD OTHERWISE HAVE EXPOSED.
    ========================================================================

    Removed:

      `if (gate.state === "loading" || gate.state === "anonymous")` — this is
      the USER store, not this page's data. It is "loading" for every render up
      to hydration, so the deposit wizard was replaced by `loading.tsx` even
      when the account was already in the forex store. And "anonymous" never
      resolves, so a signed-out visitor sat on a grey page forever.

      `if (isLoadingAccount)` — the account fetch. The only thing on this page
      that needs the account is ONE line of the subtitle ("Add funds to your
      <broker> account (<id>)"). Everything else — the h1, the back button, the
      four- or five-step Stepper with all its labels and descriptions, and step
      1's wallet-type radio list, which comes from a constant — is knowable
      immediately. Swapping the page for `loading.tsx` to withhold two words
      cost the user the entire wizard: that file is a single centred card with
      six `h-4`/`h-10` bars and no stepper rail at all.

    INVERTED GUARD: `if (!gate.allowed)` came next, and `allowed` is FALSE while
    the gate is still "loading". With the swap above gone, that line would have
    told every visitor to complete KYC for the duration of the user fetch. It
    now names the two states that actually mean "not permitted", so a gate that
    has not decided yet decides nothing.
  */
  const isPending = isLoadingAccount || !account;

  if (gate.state === "needs_kyc" || gate.state === "needs_level") {
    return (
      <KycRequiredNotice
        feature="deposit_forex"
        requirement={gate.requirement ?? "verification"}
      />
    );
  }

  // Show error state if account not found or invalid
  if (accountError) {
    return (
      // Same reason as `hasError` above: 48px of top padding is not clearance.
      <div className="container mx-auto pt-header-clear pb-12">
        <div className="max-w-2xl mx-auto">
          <div className="text-center py-8">
            <AlertCircle className="h-12 w-12 text-destructive mx-auto mb-4" />
            <h3 className="text-lg font-medium text-foreground mb-2">
              {accountError}
            </h3>
            <p className="text-muted-foreground mb-6">
              {accountError === "Account not found" 
                ? t("the_account_youre_trying_to_access")
                : t("please_use_a_live_account_to_make_deposits")
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

  // If no wallet type is selected, treat it as FIAT by default
  const isFiat =
    selectedWalletType.value === "FIAT" || !selectedWalletType.value;

  // If fiat => 4 steps total, else => 5
  const totalSteps = isFiat ? 4 : 5;

  // Step labels
  const stepLabels: StepLabelItem[] = isFiat
    ? [
        {
          label: tCommon("wallet_type"),
          description: t("choose_the_type_of_wallet_you_want_to_deposit_from"),
        },
        {
          label: tCommon("currency"),
          description: t("select_the_currency_you_want_to_deposit"),
        },
        {
          label: tCommon("amount"),
          description: tCommon("enter_the_amount_you_want_to_deposit"),
        },
        {
          label: tCommon("confirm"),
          description: t("review_your_deposit_details"),
        },
      ]
    : [
        {
          label: tCommon("wallet_type"),
          description: t("choose_the_type_of_wallet_you_want_to_deposit_from"),
        },
        {
          label: tCommon("currency"),
          description: t("select_the_currency_you_want_to_deposit"),
        },
        {
          label: tCommon("network"),
          description: t("choose_the_network_for_your_deposit"),
        },
        {
          label: tCommon("amount"),
          description: tCommon("enter_the_amount_you_want_to_deposit"),
        },
        {
          label: tCommon("confirm"),
          description: t("review_your_deposit_details"),
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
          toast.error(t("please_select_a_network"));
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
          toast.error(t("please_enter_a_valid_amount_minimum_100"));
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
    /* Same reason as `disableNext`: the page no longer withholds itself, so
       the submit path carries the account and permission checks explicitly. */
    if (isPending || !gate.allowed) return;
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
    /* The wizard now renders while the account and the permission check are
       still resolving, so the two things that used to be enforced by NOT
       RENDERING THE PAGE have to be enforced here instead: you cannot advance
       a deposit for an account that has not loaded, and you cannot advance one
       at all unless the gate has said yes. */
    if (isPending || !gate.allowed) return true;
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
          <CardTitle className="text-success flex items-center">
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
          <div className="bg-success/5 p-4 rounded-lg dark:bg-success/30 text-success-ink">
            <h4 className="font-medium mb-4">{tCommon("transaction_details")}</h4>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-muted-foreground">
                  {tCommon("transaction_id")}:
                </span>
                <span className="font-medium">
                  {/*
                    The route returns walletService's operation result, whose id
                    field is `transactionId`. Reading `.id` — a key that object
                    does not have — showed "N/A" for every successful deposit.
                  */}
                  {deposit.transaction?.transactionId
                    ? deposit.transaction.transactionId.substring(0, 8) + "..."
                    : "N/A"}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">
                  {tCommon("status")}:
                </span>
                <span className="font-medium">
                  {/*
                    A forex deposit settles synchronously — the wallet debit and
                    the forex-account credit commit in one transaction before
                    this screen renders. It is never pending.
                  */}
                  COMPLETED
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">
                  {tCommon("amount")}:
                </span>
                <span className="font-medium">
                  <MoneyFigure
                    value={formatCurrency(
                      deposit.transaction?.amount || depositAmount,
                      deposit.currency || selectedCurrency
                    )}
                  />
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">
                  {tCommon("currency")}:
                </span>
                <span className="font-medium">
                  {deposit.currency || selectedCurrency}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">{tCommon("type")}:</span>
                <span className="font-medium">
                  {deposit.type || selectedWalletType.value}
                </span>
              </div>
              {deposit.balance !== undefined && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">
                    {tCommon('new_balance')}:
                  </span>
                  <span className="font-medium">
                    <MoneyFigure
                      value={formatCurrency(
                        deposit.balance,
                        deposit.currency || selectedCurrency
                      )}
                    />
                  </span>
                </div>
              )}
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
            {/*
              This used to promise a pending approval and a 5–15 minute wait.
              A forex deposit needs neither: it is already done by the time this
              renders, and the money is in the account.
            */}
            <div className={`text-sm text-success space-y-1`}>
              <p>{t("your_funds_are_available_in_your_forex_account")}</p>
              <p>{t("you_will_receive_an_email_notification")}</p>
              <p>{t("you_can_track_the_status_in_your")} <strong>{tCommon("forex_transactions")}</strong> page</p>
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
                      className={`flex items-center p-4 border rounded-lg cursor-pointer hover:bg-muted w-full ${selectedWalletType.value === walletType.value ? `bg-success/20 dark:bg-success/10 border-success` : ""}`}
                    >
                      <Wallet className={`h-5 w-5 mr-3 text-success`} />
                      <div>
                        <p className="font-medium text-foreground">
                          {walletType.label} Wallet
                        </p>
                        <p className="text-sm text-subtle-foreground">
                          {walletType.value === "FIAT"
                            ? t("deposit_using_bank_transfer_or_credit_card")
                            : t("deposit_using_cryptocurrency")}
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
          {/*
            The wizard's own step title and description already render above;
            only the option tiles were withheld, and the old stand-in was a 32px
            ring in a `py-8` box — 96px — against a two-column grid of ~82px
            tiles. Every step of this wizard therefore ended in a jump, and the
            Continue/Back footer below moved with it, which is the one control
            the user's pointer is heading for.

            The tile is `border rounded-lg p-4` around a 32px badge and two text
            lines: none of that depends on which currency it turns out to be.
          */}
          <div>
            {showNoCurrencies ? (
              <div className="text-center py-8">
                <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">
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
                        {/* The badge well is already `bg-muted` at 32px in the
                            settled state, so the pending form is the same box
                            with the pulse and no glyph. */}
                        <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center mr-3 text-muted-foreground">
                          {pending ? null : currency.symbol || currency.value.charAt(0)}
                        </div>
                        <div>
                          <p className="font-medium text-foreground">
                            <Loadable loading={pending} placeholder={t("us_dollar")}>
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
          {/* Same conversion as the currency step above: the rows are a fixed
              frame around values that are not yet known, so the frame paints
              and the words wait. */}
          <div>
            {showNoDepositMethods ? (
              <div className="text-center py-8">
                <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">
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
            ) : (
              <div className="space-y-4">
                {depositMethodRows.map((method: any, i: number) => {
                  const pending = !method;
                  return (
                    <div
                      key={method ? method.id || method.chain : `pending-${i}`}
                      className={`border rounded-lg p-4 ${pending ? "cursor-default" : "cursor-pointer hover:bg-muted hover:border-success/30 dark:hover:border-success/50"} ${!pending && selectedDepositMethod?.chain === method.chain ? `bg-success/20 dark:bg-success/10 border-success` : ""}`}
                      onClick={() => {
                        if (!method) return;
                        setSelectedDepositMethod(method);
                        // Auto-advance to next step after selecting network
                        setTimeout(() => {
                          setStep(4);
                        }, 300);
                      }}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center">
                          <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center mr-3 text-muted-foreground">
                            {pending ? null : method.chain?.charAt(0) || "N"}
                          </div>
                          <div>
                            <p className="font-medium text-foreground">
                              <Loadable loading={pending} placeholder="Ethereum">
                                {pending ? null : method.chain || method.name}
                              </Loadable>
                            </p>
                            <p className="text-sm text-subtle-foreground">
                              {/* `selectedCurrency` is already chosen by this
                                  step, so half of the fallback sentence is
                                  known — but the description that overrides it
                                  is not, so the whole line waits as one. */}
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
                              ? t("fee", { fee: String(method.fee) })
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
              <p className="text-sm text-subtle-foreground">
                {tCommon("minimum_deposit")}: {formatCurrency(100, selectedCurrency)}
              </p>
            </div>

            <div className={`bg-success/10 p-4 rounded-lg dark:bg-success/10 text-foreground`}>
              <h3 className={`font-medium text-success mb-2`}>
                {tCommon("deposit_summary")}
              </h3>
              <div className="space-y-2 text-muted-foreground">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">
                    {tCommon("wallet_type")}:
                  </span>
                  <span className="font-medium">
                    {selectedWalletType.label}
                  </span>
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
                      {selectedDepositMethod?.chain || "N/A"}
                    </span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-muted-foreground">
                    {tCommon("amount")}:
                  </span>
                  <span className="font-medium">
                    <MoneyFigure value={formatCurrency(depositAmount || 0, selectedCurrency)} />
                  </span>
                </div>
                <Separator className="my-2 border-border-strong" />
                <div className="flex justify-between font-medium">
                  <span>{tCommon("total")}:</span>
                  <span>
                    <MoneyFigure value={formatCurrency(depositAmount || 0, selectedCurrency)} />
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
          <div className="bg-muted p-4 rounded-lg text-foreground">
            <h4 className="font-medium mb-4">{tCommon("deposit_details")}</h4>
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
                    {selectedDepositMethod?.chain || "N/A"}
                  </span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-muted-foreground">
                  {tCommon("amount")}:
                </span>
                <span className="font-medium">
                  <MoneyFigure value={formatCurrency(depositAmount, selectedCurrency)} />
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">{tCommon("fee")}:</span>
                <span className="font-medium">
                  <MoneyFigure value={formatCurrency(depositQuote.fee, selectedCurrency)} />
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">
                  {t("total_to_be_charged_1")}:
                </span>
                <span className="font-medium">
                  <MoneyFigure value={formatCurrency(depositQuote.totalCharged, selectedCurrency)} />
                </span>
              </div>
            </div>
          </div>
          <p className="text-sm text-muted-foreground">
            {t("by_clicking_submit_you_agree_to")}
          </p>
        </div>
      </>
    );
  }
  return (
    <div className="min-h-screen bg-linear-to-b from-background via-muted/10 to-background dark:via-surface-2/30">
      <main className="container mx-auto pt-20 pb-24">
        {/* Header */}
        <div className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl md:text-4xl font-bold text-foreground">
              {t("deposit_funds")}
            </h1>
            {/* The only value on this page that comes from the account fetch.
                One `Loadable` inside the real `<p>`, so the subtitle occupies
                its single `text-muted-foreground` line from the first paint and
                the Stepper below it never moves. */}
            <p className="text-muted-foreground mt-2">
              {tCommon("add_funds_to_your")}{" "}
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
