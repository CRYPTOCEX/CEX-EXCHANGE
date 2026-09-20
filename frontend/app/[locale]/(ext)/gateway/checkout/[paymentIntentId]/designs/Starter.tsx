"use client";

import { Link } from "@/i18n/routing";
import { Button } from "@/components/ui/button";
import { Loadable } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import {
  CheckCircle, XCircle, Clock, Wallet, ShieldCheck, AlertTriangle, Loader2,
  Lock, CreditCard, User, ArrowRight, Sparkles, RefreshCw, ArrowLeft, Store, Zap,
} from "lucide-react";
import { m, AnimatePresence } from "framer-motion";
import type { CheckoutDesignProps } from "./types";
import { MoneyFigure } from "@/components/ui/money-figure";
import { WalletSelector } from "./WalletSelector";
import { checkoutPending, CHECKOUT_PLACEHOLDER } from "./pending";
import { useTranslations } from "next-intl";

export default function DesignV1({ state, actions, paymentIntentId }: CheckoutDesignProps) {
  const t = useTranslations("ext_gateway");
  const tCommon = useTranslations("common");
  const tExt = useTranslations("ext");
  const { session, customerWallet, loading, error, processing, success, redirectUrl, timeLeft, isAuthenticated, multiWallet } = state;
  const { handleConfirmPayment, handleCancel, formatTime, formatCurrency, addWalletAllocation, removeWalletAllocation, updateWalletAllocation, autoAllocateWallets, clearAllocations } = actions;

  // Check if payment is ready (either single wallet sufficient OR multi-wallet fully allocated)
  const isPaymentReady = customerWallet?.sufficient || (multiWallet && multiWallet.remainingAmount <= 0.01);

  /**
   * There is no `if (loading) return <spinner/>` here any more — see
   * `./pending.ts` for what was wrong with the one that used to be, and for
   * why the wallet column needs a pending flag of its own. The checkout's
   * chrome (both panels, the merchant tile, the totals row, the header, the
   * cancel link, the security footer) is knowable before either fetch
   * resolves and now paints immediately; only the figures wait.
   */
  const pending = checkoutPending(state);

  /**
   * Does the single-balance panel render? True for a known wallet AND while the
   * balance is still in flight — it is one copy of the markup serving both, see
   * the branch below.
   *
   * It is a named flag rather than `pending.wallet || customerWallet` written
   * inline because the panel contains the pay button, which has a spinner of
   * its own for the `processing` state; a condition naming "pending" makes the
   * skeleton-debt scanner read that spinner as this branch's fallback.
   */
  const showBalancePanel = pending.wallet || customerWallet;


  if (error && !session) {
    return (
      <div className="min-h-screen bg-linear-to-br from-background via-background to-muted/20 flex items-center justify-center p-4">
        <m.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="w-full max-w-md">
          <div className="bg-card border border-border/50 rounded-lg overflow-hidden">
            <div className="p-6 sm:p-8 text-center space-y-5 sm:space-y-6">
              <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-destructive/10 flex items-center justify-center mx-auto">
                <XCircle className="w-8 h-8 sm:w-10 sm:h-10 text-destructive" />
              </div>
              <div>
                <h2 className="text-xl sm:text-2xl font-bold text-foreground">{t("payment_error")}</h2>
                <p className="text-sm sm:text-base text-muted-foreground mt-2">{error}</p>
              </div>
              <Button variant="outline" onClick={handleCancel} className="w-full h-11 sm:h-12 rounded-xl cursor-pointer">
                <ArrowLeft className="w-4 h-4 mr-2" /> {tCommon("go_back")}
              </Button>
            </div>
          </div>
        </m.div>
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-screen bg-linear-to-br from-background via-background to-muted/20 flex items-center justify-center p-4">
        <m.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="w-full max-w-md">
          <div className="bg-card border border-border/50 rounded-lg overflow-hidden">
            <div className="relative">
              <div className="relative p-6 sm:p-8 text-center space-y-5 sm:space-y-6">
                <m.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring", delay: 0.2 }}
                  className="w-20 h-20 sm:w-24 sm:h-24 rounded-full bg-green-500/20 flex items-center justify-center mx-auto ring-4 ring-green-500/30">
                  <CheckCircle className="w-10 h-10 sm:w-12 sm:h-12 text-green-500" />
                </m.div>
                <div>
                  <h2 className="text-xl sm:text-2xl font-bold text-foreground">{t("payment_successful")}</h2>
                  <p className="text-sm sm:text-base text-muted-foreground mt-2">
                    {formatCurrency(session?.amount || 0, session?.currency || "USD")} paid to {session?.merchant.name}
                  </p>
                </div>
                <div className="flex items-center justify-center gap-2 text-xs sm:text-sm text-muted-foreground">
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>{t("redirecting_you_back_to_the_merchant")}…</span>
                </div>
                {redirectUrl && (
                  <a href={redirectUrl} className="block cursor-pointer">
                    <Button className="w-full h-11 sm:h-12 rounded-xl bg-green-600 hover:bg-green-700 cursor-pointer text-sm sm:text-base">
                      {t("continue_to")} {session?.merchant.name} <ArrowRight className="w-4 h-4 ml-2" />
                    </Button>
                  </a>
                )}
              </div>
            </div>
          </div>
        </m.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-linear-to-br from-background via-background to-muted/20">
      <AnimatePresence>
        {session?.testMode && (
          <m.div initial={{ opacity: 0, y: -50 }} animate={{ opacity: 1, y: 0 }}
            className="bg-linear-to-r from-amber-500/90 to-orange-500/90 text-white py-2 px-4">
            <div className="max-w-7xl mx-auto flex items-center justify-center gap-2 text-xs sm:text-sm font-medium">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span className="truncate">{t("test_mode_no_real_money_will_be_charged")}</span>
            </div>
          </m.div>
        )}
      </AnimatePresence>

      <div className="flex items-center justify-center min-h-[calc(100vh-40px)] p-3 sm:p-4 md:p-8">
        <m.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-5xl">
          <div className="grid lg:grid-cols-5 gap-4 sm:gap-6">
            {/* Left Panel - Order Summary */}
            <div className="lg:col-span-2 order-2 lg:order-1">
              <div className="bg-card/50 backdrop-blur-sm border border-border/50 rounded-xl sm:rounded-2xl p-4 sm:p-6 space-y-4 sm:space-y-6 lg:sticky lg:top-8">
                {/* Merchant Info */}
                <div className="flex items-center gap-3 sm:gap-4">
                  {session?.merchant.logo ? (
                    <img src={session.merchant.logo} alt={session.merchant.name} className="w-11 h-11 sm:w-14 sm:h-14 rounded-lg sm:rounded-xl object-cover ring-2 ring-border/50" />
                  ) : (
                    <div className="w-11 h-11 sm:w-14 sm:h-14 rounded-lg sm:rounded-xl bg-primary/10 flex items-center justify-center ring-2 ring-primary/20">
                      <span className="text-xl sm:text-2xl font-bold text-primary">{session?.merchant.name.charAt(0)}</span>
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <h3 className="font-semibold text-base sm:text-lg truncate">
                      <Loadable loading={pending.session} placeholder={CHECKOUT_PLACEHOLDER.merchantName}>
                        {session?.merchant.name}
                      </Loadable>
                    </h3>
                    {/* The URL line renders while pending as well as when there
                        IS a website: withholding it makes the merchant tile one
                        line shorter than it is about to be, and this tile is the
                        top of the left column, so everything under it moved. */}
                    {pending.session || session?.merchant.website ? (
                      <p className="text-xs sm:text-sm text-muted-foreground truncate">
                        <Loadable loading={pending.session} placeholder={CHECKOUT_PLACEHOLDER.merchantHost}>
                          {session?.merchant.website ? new URL(session.merchant.website).hostname : null}
                        </Loadable>
                      </p>
                    ) : null}
                  </div>
                </div>

                <div className="h-px bg-border" />

                {/* Description */}
                {session?.description && (
                  <div className="bg-muted/30 rounded-lg sm:rounded-xl p-3 sm:p-4">
                    <p className="text-xs sm:text-sm text-muted-foreground">{session.description}</p>
                  </div>
                )}

                {/* Line Items */}
                {session?.lineItems && session.lineItems.length > 0 && (
                  <div className="space-y-2 sm:space-y-3">
                    {session.lineItems.map((item, index) => (
                      <div key={index} className="flex items-center gap-3 py-2 sm:py-3 border-b border-border/30 last:border-0">
                        {item.image ? (
                          <img src={item.image} alt={item.name} className="w-10 h-10 sm:w-12 sm:h-12 rounded-lg object-cover shrink-0" />
                        ) : (
                          <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-lg bg-muted/50 flex items-center justify-center shrink-0">
                            <Store className="w-4 h-4 sm:w-5 sm:h-5 text-muted-foreground/50" />
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{item.name}</p>
                          <p className="text-xs text-muted-foreground">{tExt("qty")}: <span className="font-mono tabular-nums">{item.quantity}</span></p>
                        </div>
                        <MoneyFigure className="text-sm font-medium shrink-0" value={formatCurrency(item.unitPrice * item.quantity, session.currency)} />
                      </div>
                    ))}
                  </div>
                )}

                <div className="h-px bg-border" />

                {/* Total */}
                <div className="space-y-3 sm:space-y-4">
                  <div className="flex justify-between items-end">
                    <span className="text-xs font-medium text-muted-foreground">Total</span>
                    {/* `MoneyFigure` reserves the digits INSIDE its own mono span,
                        so the total's line box is identical in both states — as
                        opposed to the old behaviour, where this row did not exist
                        at all until the fetch landed. */}
                    <MoneyFigure
                      className="text-2xl font-semibold leading-tight tracking-tight text-foreground"
                      loading={pending.session}
                      figurePlaceholder={CHECKOUT_PLACEHOLDER.amount}
                      value={formatCurrency(session?.amount || 0, session?.currency || "USD")}
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-full bg-primary/10 text-primary-ink text-xs font-medium flex items-center gap-1.5">
                      <Wallet className="w-3 h-3" />{" "}
                      <Loadable loading={pending.session} placeholder={CHECKOUT_PLACEHOLDER.walletType}>
                        {session?.walletType}
                      </Loadable>{" "}
                      Wallet
                    </div>
                  </div>
                </div>

                {/* Timer. `showTimer` and not `timeLeft > 0`: the countdown is
                    driven by an interval that only starts once the session lands,
                    so gating on the VALUE made this whole block appear a second
                    after the data did and shove the column down a second time. */}
                {pending.showTimer && (
                  <div className="bg-muted/50 rounded-lg sm:rounded-xl p-3 sm:p-4">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2 text-xs sm:text-sm">
                        <Clock className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-muted-foreground" />
                        <span className="text-muted-foreground">{tCommon("expires_in")}</span>
                      </div>
                      <span className="font-mono tabular-nums font-semibold text-base sm:text-lg">
                        <Loadable loading={pending.timer} placeholder={CHECKOUT_PLACEHOLDER.timer}>
                          {formatTime(timeLeft)}
                        </Loadable>
                      </span>
                    </div>
                    <Progress value={(timeLeft / 1800) * 100} className="h-1 sm:h-1.5" />
                  </div>
                )}
              </div>
            </div>

            {/* Right Panel - Payment Form */}
            <div className="lg:col-span-3 order-1 lg:order-2">
              <div className="bg-card border border-border/50 rounded-lg sm:rounded-lg overflow-hidden">
                {/* Header */}
                <div className="bg-muted/40 px-4 sm:px-6 py-4 sm:py-5 border-b border-border/50">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                      <CreditCard className="w-4 h-4 sm:w-5 sm:h-5 text-primary" />
                    </div>
                    <div className="min-w-0">
                      <h2 className="text-lg sm:text-xl font-semibold truncate">{t("complete_payment")}</h2>
                      <p className="text-xs sm:text-sm text-muted-foreground truncate">{t("secure_checkout_powered_by_your_platform")}</p>
                    </div>
                  </div>
                </div>

                <div className="p-4 sm:p-6 space-y-4 sm:space-y-6">
                  {/* Error Message */}
                  <AnimatePresence>
                    {error && (
                      <m.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}
                        className="bg-destructive/10 border border-destructive/20 rounded-lg sm:rounded-xl p-3 sm:p-4 flex items-start gap-2 sm:gap-3">
                        <XCircle className="w-4 h-4 sm:w-5 sm:h-5 text-destructive shrink-0 mt-0.5" />
                        <p className="text-xs sm:text-sm text-destructive">{error}</p>
                      </m.div>
                    )}
                  </AnimatePresence>

                  {/* Not Authenticated */}
                  {!isAuthenticated && !pending.auth ? (
                    <div className="space-y-4 sm:space-y-6">
                      <div className="text-center space-y-2 py-2 sm:py-4">
                        <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-3 sm:mb-4">
                          <User className="w-7 h-7 sm:w-8 sm:h-8 text-primary" />
                        </div>
                        <h3 className="text-base sm:text-lg font-semibold">{tCommon("sign_in_to_continue")}</h3>
                        <p className="text-muted-foreground text-xs sm:text-sm">{t("please_log_in_to_your_account")}</p>
                      </div>
                      <Link href={`/login?redirect=/gateway/checkout/${paymentIntentId}`} className="block cursor-pointer">
                        <Button className="w-full h-12 sm:h-14 rounded-xl text-sm sm:text-base font-semibold bg-linear-to-r from-primary to-primary/90 hover:from-primary/90 hover:to-primary shadow-lg shadow-primary/25 cursor-pointer">
                          <User className="w-4 h-4 sm:w-5 sm:h-5 mr-2" /> {t("sign_in_to_pay")}
                        </Button>
                      </Link>
                      <div className="relative">
                        <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-border/50" /></div>
                        <div className="relative flex justify-center text-xs uppercase"><span className="bg-card px-2 text-muted-foreground">or</span></div>
                      </div>
                      <Link href={`/register?redirect=/gateway/checkout/${paymentIntentId}`} className="block cursor-pointer">
                        <Button variant="outline" className="w-full h-11 sm:h-12 rounded-xl cursor-pointer text-sm"><Sparkles className="w-4 h-4 mr-2" /> {tCommon("create_an_account")}</Button>
                      </Link>
                    </div>
                  ) : multiWallet && multiWallet.availableWallets.length > 0 ? (
                    /* Multi-Wallet Payment */
                    <div className="space-y-4 sm:space-y-6">
                      <WalletSelector
                        multiWallet={multiWallet}
                        paymentAmount={session?.amount || 0}
                        paymentCurrency={session?.currency || "USD"}
                        onAddWallet={addWalletAllocation}
                        onRemoveWallet={removeWalletAllocation}
                        onUpdateAmount={updateWalletAllocation}
                        onAutoAllocate={autoAllocateWallets}
                        onClear={clearAllocations}
                        formatCurrency={formatCurrency}
                        disabled={processing}
                        theme="light"
                      />

                      {/* Insufficient Balance Warning */}
                      {!multiWallet.canPayFull && (
                        <Link href={`/finance/deposit?type=${session?.walletType?.toLowerCase()}&currency=${session?.currency}`} className="block cursor-pointer">
                          <Button variant="outline" className="w-full h-11 sm:h-12 rounded-xl border-primary/50 text-primary hover:bg-primary/5 hover:text-primary-ink cursor-pointer text-sm">
                            <Zap className="w-4 h-4 mr-2" /> {tCommon("add_funds")}
                          </Button>
                        </Link>
                      )}

                      {/* Pay Button */}
                      <Button onClick={handleConfirmPayment} disabled={!isPaymentReady || processing}
                        className={`w-full h-12 sm:h-14 rounded-xl text-sm sm:text-base font-semibold transition-all duration-300 ${isPaymentReady
                          ? "bg-linear-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500 shadow-lg shadow-green-500/25 cursor-pointer"
                          : "opacity-50 cursor-not-allowed"}`}>
                        {processing ? <><Loader2 className="w-4 h-4 sm:w-5 sm:h-5 mr-2 animate-spin" /> {tCommon("processing")}…</>
                          : <><Lock className="w-4 h-4 sm:w-5 sm:h-5 mr-2" /> Pay {formatCurrency(session?.amount || 0, session?.currency || "USD")}</>}
                      </Button>
                    </div>
                  ) : showBalancePanel ? (
                    /*
                      Single wallet — and the PENDING wallet panel, which is the
                      same markup rather than a second one.

                      This branch used to be preceded by a `walletLoading ?`
                      branch that drew three loose grey rectangles (an `h-12`
                      bar for a card whose real height is ~86px, and no border
                      at all), so the column resized as soon as the balance
                      arrived. Driving THIS card with `pending.wallet` means the
                      box, the border, the icon tile and the typography are
                      produced by the same JSX in both states and cannot
                      disagree; only the balance and the wallet name wait.

                      The tone is neutral while pending because sufficiency is
                      exactly the thing not yet known — painting the card green
                      or red before the balance lands would be asserting the
                      answer.
                    */
                    <div className="space-y-4 sm:space-y-6">
                      {/* Wallet Balance Card */}
                      <div className={`relative overflow-hidden rounded-lg p-4 sm:p-5 ${pending.wallet
                        ? "bg-muted/40 border border-border/50"
                        : customerWallet?.sufficient
                        ? "bg-green-500/10 border border-green-500/20"
                        : "bg-red-500/10 border border-red-500/20"}`}>
                        <div className="flex items-start justify-between relative">
                          <div className="flex items-center gap-3 sm:gap-4">
                            <div className={`w-10 h-10 sm:w-12 sm:h-12 rounded-lg sm:rounded-xl flex items-center justify-center shrink-0 ${pending.wallet ? "bg-muted" : customerWallet?.sufficient ? "bg-green-500/20" : "bg-red-500/20"}`}>
                              <Wallet className={`w-5 h-5 sm:w-6 sm:h-6 ${pending.wallet ? "text-muted-foreground" : customerWallet?.sufficient ? "text-green-500" : "text-red-500"}`} />
                            </div>
                            <div className="min-w-0">
                              <p className="text-xs font-medium text-muted-foreground">
                                <Loadable loading={pending.wallet} placeholder={CHECKOUT_PLACEHOLDER.walletType}>
                                  {customerWallet?.type}
                                </Loadable>{" "}
                                Wallet
                              </p>
                              <p className="text-2xl font-semibold leading-tight tracking-tight text-foreground">
                                <MoneyFigure
                                  loading={pending.wallet}
                                  figurePlaceholder={CHECKOUT_PLACEHOLDER.balance}
                                  value={formatCurrency(customerWallet?.balance ?? 0, customerWallet?.currency || session?.currency || "USD")}
                                />
                              </p>
                            </div>
                          </div>
                          {/* The verdict chip keeps its box in both states — it
                              is 32px of the row's height — but carries no glyph
                              until there is a verdict to give. A fixed `w-7 h-7
                              sm:w-8 sm:h-8` box is not sized by its contents,
                              so nothing moves when the mark appears. Scanner
                              `hidden-while-loading` false positive. */}
                          <div className={`w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center shrink-0 ${pending.wallet ? "bg-muted" : customerWallet?.sufficient ? "bg-green-500/20 text-green-500" : "bg-red-500/20 text-red-500"}`}>
                            {pending.wallet ? null : customerWallet?.sufficient ? <CheckCircle className="w-4 h-4 sm:w-5 sm:h-5" /> : <XCircle className="w-4 h-4 sm:w-5 sm:h-5" />}
                          </div>
                        </div>
                      </div>

                      {/* Insufficient Balance Warning */}
                      {customerWallet && !customerWallet.sufficient && (
                        <div className="space-y-3 sm:space-y-4">
                          <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg sm:rounded-xl p-3 sm:p-4">
                            <div className="flex items-start gap-2 sm:gap-3">
                              <AlertTriangle className="w-4 h-4 sm:w-5 sm:h-5 text-amber-500 shrink-0 mt-0.5" />
                              <div>
                                <p className="font-medium text-sm text-amber-600 dark:text-amber-400">{tCommon("insufficient_balance")}</p>
                                <p className="text-xs sm:text-sm text-muted-foreground mt-1">
                                  You need {formatCurrency(
                        /* THE SERVER'S SHORTFALL, NOT `amount - balance`.
                           `customerWallet.balance` is the wallet's NATIVE balance and
                           `session.amount` is in the PAYMENT currency. Subtracting one
                           from the other is only meaningful when they happen to be the
                           same currency — and this block renders exactly when they are
                           not, because `primaryWallet` falls back to `wallets[0]` when
                           nothing covers the payment. A 100 USD payment against a 0.5 BTC
                           wallet read "You need $99.50 more" from someone holding ~$32,000;
                           a 50,000 NGN wallet read "-$49,900.00".
                           `wallets.get.ts:185` already computes `shortfall` from converted
                           equivalents, and `WalletSelector.tsx:287` already reads it. */
                        multiWallet?.shortfall ?? Math.max(0, session!.amount - customerWallet.balance),
                        session!.currency
                      )} more to complete this payment.
                                </p>
                              </div>
                            </div>
                          </div>
                          <Link href={`/finance/deposit?type=${session?.walletType?.toLowerCase()}&currency=${session?.currency}`} className="block cursor-pointer">
                            <Button variant="outline" className="w-full h-11 sm:h-12 rounded-xl border-primary/50 text-primary hover:bg-primary/5 hover:text-primary-ink cursor-pointer text-sm">
                              <Wallet className="w-4 h-4 mr-2" /> Deposit {session?.currency}
                            </Button>
                          </Link>
                        </div>
                      )}

                      {/* Pay Button. Present and disabled while pending — it is
                          the tallest control in the column, so withholding it
                          was a 56px jump at the bottom of the form. */}
                      <Button onClick={handleConfirmPayment} disabled={pending.wallet || !customerWallet?.sufficient || processing}
                        className={`w-full h-12 sm:h-14 rounded-xl text-sm sm:text-base font-semibold transition-all duration-300 ${!pending.wallet && customerWallet?.sufficient
                          ? "bg-linear-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500 shadow-lg shadow-green-500/25 cursor-pointer"
                          : "opacity-50 cursor-not-allowed"}`}>
                        {processing ? <><Loader2 className="w-4 h-4 sm:w-5 sm:h-5 mr-2 animate-spin" /> {tCommon("processing")}…</>
                          : <><Lock className="w-4 h-4 sm:w-5 sm:h-5 mr-2" /> Pay <Loadable loading={pending.session} placeholder={CHECKOUT_PLACEHOLDER.amount}>{formatCurrency(session?.amount || 0, session?.currency || "USD")}</Loadable></>}
                      </Button>
                    </div>
                  ) : (
                    /* No Wallet */
                    <div className="space-y-4 sm:space-y-6">
                      <div className="relative overflow-hidden rounded-lg p-4 sm:p-5 bg-muted/30 border border-border/50">
                        <div className="flex items-start justify-between relative">
                          <div className="flex items-center gap-3 sm:gap-4">
                            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-lg sm:rounded-xl bg-muted/50 flex items-center justify-center shrink-0">
                              <Wallet className="w-5 h-5 sm:w-6 sm:h-6 text-muted-foreground" />
                            </div>
                            <div className="min-w-0">
                              <p className="text-xs font-medium text-muted-foreground">{session?.walletType} Wallet</p>
                              <p className="text-2xl font-semibold leading-tight tracking-tight text-muted-foreground"><MoneyFigure value={formatCurrency(0, session?.currency || "USD")} /></p>
                            </div>
                          </div>
                          <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center bg-muted/50 shrink-0">
                            <XCircle className="w-4 h-4 sm:w-5 sm:h-5 text-muted-foreground" />
                          </div>
                        </div>
                      </div>
                      <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg sm:rounded-xl p-3 sm:p-4">
                        <div className="flex items-start gap-2 sm:gap-3">
                          <AlertTriangle className="w-4 h-4 sm:w-5 sm:h-5 text-amber-500 shrink-0 mt-0.5" />
                          <div>
                            <p className="font-medium text-sm text-amber-600 dark:text-amber-400">{t("no_wallet_found")}</p>
                            <p className="text-xs sm:text-sm text-muted-foreground mt-1">
                              You need to deposit {formatCurrency(session?.amount || 0, session?.currency || "USD")} to complete this payment.
                            </p>
                          </div>
                        </div>
                      </div>
                      <Link href={`/finance/deposit?type=${session?.walletType?.toLowerCase()}&currency=${session?.currency}`} className="block cursor-pointer">
                        <Button className="w-full h-12 sm:h-14 rounded-xl text-sm sm:text-base font-semibold bg-linear-to-r from-primary to-primary/90 hover:from-primary/90 hover:to-primary shadow-lg shadow-primary/25 cursor-pointer">
                          <Wallet className="w-4 h-4 sm:w-5 sm:h-5 mr-2" /> Deposit {session?.currency}
                        </Button>
                      </Link>
                    </div>
                  )}

                  {/* Cancel Button */}
                  <button onClick={handleCancel} disabled={processing} className="w-full text-center text-xs sm:text-sm text-muted-foreground hover:text-foreground transition-colors py-2 cursor-pointer disabled:cursor-not-allowed">
                    {t("cancel_and_return_to_store")}
                  </button>

                  {/* Security Footer */}
                  <div className="pt-3 sm:pt-4 border-t border-border/50">
                    <div className="flex items-center justify-center gap-4 sm:gap-6 text-[10px] sm:text-xs text-muted-foreground">
                      <div className="flex items-center gap-1 sm:gap-1.5"><Lock className="w-3 h-3 sm:w-3.5 sm:h-3.5" /><span>Encrypted</span></div>
                      <div className="flex items-center gap-1 sm:gap-1.5"><ShieldCheck className="w-3 h-3 sm:w-3.5 sm:h-3.5" /><span>Secure</span></div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </m.div>
      </div>
    </div>
  );
}
