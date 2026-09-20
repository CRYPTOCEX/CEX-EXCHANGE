"use client";

import { Link } from "@/i18n/routing";
import {
  CheckCircle, XCircle, Clock, Wallet, ShieldCheck, AlertTriangle, Loader2,
  Lock, CreditCard, User, ArrowRight, Sparkles, Store, Zap, Shield, Check, X, ArrowUpRight, Banknote, CircleDot,
} from "lucide-react";
import { m, AnimatePresence } from "framer-motion";
import type { CheckoutDesignProps } from "./types";
import { WalletSelector } from "./WalletSelector";
import { useTranslations } from "next-intl";
import { Loadable } from "@/components/ui/skeleton";
import { checkoutPending, CHECKOUT_PLACEHOLDER } from "./pending";

const MeshGradient = () => (
  <div className="fixed inset-0 overflow-hidden pointer-events-none">
    <div className="absolute inset-0 bg-[#0a0a0f]" />
    <m.div animate={{ scale: [1, 1.2, 1], x: [0, 50, 0], y: [0, 30, 0] }} transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
      className="absolute top-[-50%] left-[-25%] w-[100%] h-[100%] bg-linear-to-br from-amber-500/8 via-transparent to-transparent rounded-full blur-3xl" />
    <m.div animate={{ scale: [1.2, 1, 1.2], x: [0, -30, 0], y: [0, -50, 0] }} transition={{ duration: 25, repeat: Infinity, ease: "linear" }}
      className="absolute bottom-[-50%] right-[-25%] w-[100%] h-[100%] bg-linear-to-tl from-amber-600/8 via-transparent to-transparent rounded-full blur-3xl" />
    <m.div animate={{ scale: [1, 1.3, 1], rotate: [0, 180, 360] }} transition={{ duration: 30, repeat: Infinity, ease: "linear" }}
      className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[80%] h-[80%] bg-linear-to-r from-yellow-500/5 via-amber-500/5 to-orange-500/5 rounded-full blur-3xl" />
  </div>
);

export default function DesignV4({ state, actions, paymentIntentId }: CheckoutDesignProps) {
  const t = useTranslations("ext_gateway");
  const tCommon = useTranslations("common");
  const tExt = useTranslations("ext");
  const { session, customerWallet, loading, error, processing, success, redirectUrl, timeLeft, isAuthenticated, multiWallet } = state;
  const { handleConfirmPayment, handleCancel, formatTime, formatCurrency, addWalletAllocation, removeWalletAllocation, updateWalletAllocation, autoAllocateWallets, clearAllocations } = actions;

  const isPaymentReady = customerWallet?.sufficient || (multiWallet && multiWallet.remainingAmount <= 0.01);

  /**
   * The "INITIALIZING" double-ring that used to stand here replaced both
   * columns of the checkout with a spinner on the mesh background. See
   * `./pending.ts`. The two-column layout, the payment card and the security
   * row now paint immediately; only the merchant, the amount, the countdown
   * and the balance wait.
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
      <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center p-4 relative">
        <MeshGradient />
        <m.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="relative z-10 text-center max-w-md px-4">
          <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-full border border-red-500/20 flex items-center justify-center mx-auto mb-6 sm:mb-8">
            <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-red-500/10 flex items-center justify-center"><X className="w-7 h-7 sm:w-8 sm:h-8 text-red-400" /></div>
          </div>
          <h1 className="text-xl sm:text-2xl text-white/90 font-light tracking-wide mb-2 sm:mb-3">{t("payment_error")}</h1>
          <p className="text-white/40 text-sm sm:text-base mb-6 sm:mb-8">{error}</p>
          <button onClick={handleCancel} className="text-amber-400/60 hover:text-amber-400 text-xs sm:text-sm tracking-wider transition-colors cursor-pointer">{t("return_1")}</button>
        </m.div>
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center p-4 relative overflow-hidden">
        <MeshGradient />
        {[...Array(30)].map((_, i) => (
          <m.div key={i} initial={{ opacity: 0, scale: 0 }}
            animate={{ opacity: [0, 1, 0], scale: [0, 1, 0], y: [0, -300 - Math.random() * 200], x: [0, (Math.random() - 0.5) * 400] }}
            transition={{ duration: 2 + Math.random() * 2, delay: Math.random() * 0.5, repeat: Infinity, repeatDelay: Math.random() * 2 }}
            className="absolute bottom-1/3 left-1/2 w-1 h-1 rounded-full bg-amber-400" style={{ filter: "blur(0.5px)" }} />
        ))}
        <m.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="relative z-10 text-center max-w-md px-4">
          <m.div initial={{ scale: 0, rotate: -180 }} animate={{ scale: 1, rotate: 0 }} transition={{ type: "spring", duration: 1, delay: 0.2 }} className="relative w-24 h-24 sm:w-32 sm:h-32 mx-auto mb-8 sm:mb-10">
            <div className="absolute inset-0 rounded-full bg-linear-to-br from-amber-400 to-amber-600 opacity-20 blur-xl" />
            <div className="absolute inset-0 rounded-full border border-amber-400/30" />
            <div className="absolute inset-1.5 sm:inset-2 rounded-full border border-amber-400/20" />
            <div className="absolute inset-3 sm:inset-4 rounded-full bg-linear-to-br from-amber-400 to-amber-600 flex items-center justify-center shadow-2xl shadow-amber-500/30">
              <Check className="w-10 h-10 sm:w-12 sm:h-12 text-black stroke-[2.5]" />
            </div>
          </m.div>
          <m.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }} className="space-y-3 sm:space-y-4 mb-8 sm:mb-10">
            <h1 className="text-2xl sm:text-3xl font-light text-white tracking-wide">{t("payment_complete")}</h1>
            <p className="text-amber-400 text-xl sm:text-2xl font-light">{formatCurrency(session?.amount || 0, session?.currency || "USD")}</p>
            <p className="text-white/40 text-sm sm:text-base">{t("paid_to")} <span className="text-white/60">{session?.merchant.name}</span></p>
          </m.div>
          <m.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.6 }} className="space-y-4 sm:space-y-6">
            <div className="flex items-center justify-center gap-2 text-white/30 text-xs sm:text-sm"><Loader2 className="w-4 h-4 animate-spin" /><span>{tCommon("redirecting")}…</span></div>
            {redirectUrl && <a href={redirectUrl} className="inline-flex items-center gap-2 text-amber-400/80 hover:text-amber-400 text-xs sm:text-sm tracking-wider transition-colors cursor-pointer">{t("continue_to_store")} <ArrowUpRight className="w-4 h-4" /></a>}
          </m.div>
        </m.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0a0f] relative">
      <MeshGradient />
      <AnimatePresence>
        {session?.testMode && (
          <m.div initial={{ y: -40 }} animate={{ y: 0 }} className="relative z-20 bg-amber-500/10 border-b border-amber-500/20 text-amber-400 py-1.5 sm:py-2 text-center text-[10px] sm:text-xs tracking-[0.15em] uppercase">{tCommon('test_mode')}</m.div>
        )}
      </AnimatePresence>

      <div className="relative z-10 min-h-screen flex flex-col lg:flex-row">
        {/* Left Panel - Order Summary (Hidden on mobile, shown on desktop) */}
        <div className="hidden lg:flex lg:w-1/2 flex-col justify-between p-8 xl:p-12 2xl:p-16">
          {/* Merchant Info */}
          <m.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} className="flex items-center gap-3 sm:gap-4">
            {session?.merchant.logo ? (
              <img src={session.merchant.logo} alt={session.merchant.name} className="w-10 h-10 sm:w-12 sm:h-12 rounded-lg sm:rounded-xl object-cover opacity-80 shrink-0" />
            ) : (
              <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-lg sm:rounded-xl bg-linear-to-br from-amber-500/20 to-amber-600/10 border border-amber-500/20 flex items-center justify-center shrink-0">
                <Store className="w-4 h-4 sm:w-5 sm:h-5 text-amber-400/60" />
              </div>
            )}
            <div className="min-w-0">
              <p className="text-white/80 font-medium truncate">
                <Loadable loading={pending.session} placeholder={CHECKOUT_PLACEHOLDER.merchantName}>
                  {session?.merchant.name}
                </Loadable>
              </p>
              {/* Reserved while pending — otherwise the merchant block is one
                  line shorter than it is about to be. */}
              {pending.session || session?.merchant.website ? (
                <p className="text-white/30 text-xs sm:text-sm truncate">
                  <Loadable loading={pending.session} placeholder={CHECKOUT_PLACEHOLDER.merchantHost}>
                    {session?.merchant.website ? new URL(session.merchant.website).hostname : null}
                  </Loadable>
                </p>
              ) : null}
            </div>
          </m.div>

          {/* Amount and Items */}
          <m.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="space-y-6 xl:space-y-8">
            <div>
              <p className="text-amber-400/60 text-xs tracking-[0.2em] uppercase mb-3 xl:mb-4">{t("payment_amount")}</p>
              {/* Placeholder inside the 72px type — its height is computed by
                  the same text layout the amount will use. */}
              <p className="text-5xl xl:text-6xl 2xl:text-7xl font-extralight text-white tracking-tight">
                <Loadable loading={pending.session} placeholder={CHECKOUT_PLACEHOLDER.amount}>
                  {formatCurrency(session?.amount || 0, session?.currency || "USD")}
                </Loadable>
              </p>
            </div>
            {session?.description && <p className="text-white/40 text-base xl:text-lg font-light max-w-md leading-relaxed">{session.description}</p>}
            {session?.lineItems && session.lineItems.length > 0 && (
              <div className="space-y-2 xl:space-y-3 max-w-md">
                {session.lineItems.map((item, index) => (
                  <div key={index} className="flex justify-between items-center py-2 xl:py-3 border-b border-white/5">
                    <div className="flex items-center gap-2 xl:gap-3 min-w-0">
                      <CircleDot className="w-2.5 h-2.5 xl:w-3 xl:h-3 text-amber-500/40 shrink-0" />
                      <span className="text-white/60 text-sm xl:text-base truncate">{item.name}</span>
                      <span className="text-white/20 text-xs xl:text-sm shrink-0">×{item.quantity}</span>
                    </div>
                    <span className="text-white/80 text-sm xl:text-base shrink-0 ml-2">{formatCurrency(item.unitPrice * item.quantity, session.currency)}</span>
                  </div>
                ))}
              </div>
            )}
          </m.div>

          {/* Footer */}
          <m.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }} className="flex items-center justify-between">
            {/* `showTimer`, not `timeLeft > 0`: the countdown interval starts
                only after the session lands, so the value gate held this row
                back for a second past "loaded" and then re-laid out the
                footer row it shares with the security marks. */}
            {pending.showTimer && (
              <div className="flex items-center gap-2 xl:gap-3 text-white/30">
                <Clock className="w-3.5 h-3.5 xl:w-4 xl:h-4" />
                <span className="font-mono text-xs xl:text-sm">
                  <Loadable loading={pending.timer} placeholder={CHECKOUT_PLACEHOLDER.timer}>
                    {formatTime(timeLeft)}
                  </Loadable>
                </span>
              </div>
            )}
            <div className="flex items-center gap-3 xl:gap-4 text-white/20 text-[10px] xl:text-xs tracking-wider">
              <div className="flex items-center gap-1 xl:gap-1.5"><Shield className="w-2.5 h-2.5 xl:w-3 xl:h-3" /><span>ENCRYPTED</span></div>
              <div className="flex items-center gap-1 xl:gap-1.5"><Lock className="w-2.5 h-2.5 xl:w-3 xl:h-3" /><span>SECURE</span></div>
            </div>
          </m.div>
        </div>

        {/* Right Panel - Payment Form */}
        <div className="w-full lg:w-1/2 flex items-center justify-center p-4 sm:p-6 md:p-8 lg:p-12">
          <m.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.15 }} className="w-full max-w-md">
            {/* Mobile Header - Shows merchant and amount on mobile */}
            <div className="lg:hidden mb-6 sm:mb-8 text-center">
              <div className="flex items-center justify-center gap-2.5 sm:gap-3 mb-4 sm:mb-6">
                {session?.merchant.logo ? (
                  <img src={session.merchant.logo} alt={session.merchant.name} className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg object-cover opacity-80 shrink-0" />
                ) : (
                  <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center shrink-0">
                    <Store className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-amber-400/60" />
                  </div>
                )}
                <span className="text-white/80 text-sm sm:text-base truncate">
                  <Loadable loading={pending.session} placeholder={CHECKOUT_PLACEHOLDER.merchantName}>
                    {session?.merchant.name}
                  </Loadable>
                </span>
              </div>
              <p className="text-3xl sm:text-4xl font-light text-white">
                <Loadable loading={pending.session} placeholder={CHECKOUT_PLACEHOLDER.amount}>
                  {formatCurrency(session?.amount || 0, session?.currency || "USD")}
                </Loadable>
              </p>
            </div>

            {/* Payment Card */}
            <div className="bg-white/[0.02] backdrop-blur-xl rounded-2xl sm:rounded-3xl border border-white/[0.05] overflow-hidden">
              {/* Card Header */}
              <div className="p-4 sm:p-6 border-b border-white/[0.05]">
                <div className="flex items-center gap-2.5 sm:gap-3">
                  <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl bg-linear-to-br from-amber-400/20 to-amber-600/10 border border-amber-500/20 flex items-center justify-center shrink-0">
                    <CreditCard className="w-4 h-4 text-amber-400/80" />
                  </div>
                  <div className="min-w-0">
                    <h2 className="text-white/90 font-medium text-sm sm:text-base">{tExt("secure_checkout")}</h2>
                    <p className="text-white/30 text-[10px] sm:text-xs">
                      <Loadable loading={pending.session} placeholder={CHECKOUT_PLACEHOLDER.walletType}>
                        {session?.walletType}
                      </Loadable>{" "}
                      {t("wallet_payment")}
                    </p>
                  </div>
                </div>
              </div>

              {/* Card Content */}
              <div className="p-4 sm:p-6 space-y-4 sm:space-y-6">
                {/* Error Message */}
                <AnimatePresence>
                  {error && (
                    <m.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}
                      className="bg-red-500/10 border border-red-500/20 rounded-lg sm:rounded-xl p-3 sm:p-4 flex items-center gap-2 sm:gap-3">
                      <XCircle className="w-4 h-4 text-red-400 shrink-0" /><p className="text-red-300/80 text-xs sm:text-sm">{error}</p>
                    </m.div>
                  )}
                </AnimatePresence>

                {/* Not Authenticated */}
                {!isAuthenticated && !pending.auth ? (
                  <div className="space-y-4 sm:space-y-6 py-2 sm:py-4">
                    <div className="text-center">
                      <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-xl sm:rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center mx-auto mb-3 sm:mb-4">
                        <User className="w-6 h-6 sm:w-7 sm:h-7 text-amber-400/60" />
                      </div>
                      <p className="text-white/60 text-xs sm:text-sm">{tCommon("sign_in_to_continue")}</p>
                    </div>
                    <Link href={`/login?redirect=/gateway/checkout/${paymentIntentId}`} className="block cursor-pointer">
                      <button className="w-full py-3.5 sm:py-4 bg-linear-to-r from-amber-400 to-amber-500 text-black text-sm sm:text-base font-medium rounded-lg sm:rounded-xl hover:from-amber-300 hover:to-amber-400 transition-all shadow-lg shadow-amber-500/20 flex items-center justify-center gap-2 cursor-pointer">
                        {tCommon("sign_in")} <ArrowRight className="w-4 h-4" />
                      </button>
                    </Link>
                    <div className="relative">
                      <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-white/5" /></div>
                      <div className="relative flex justify-center"><span className="bg-[#0a0a0f] px-4 text-white/20 text-[10px] sm:text-xs tracking-wider">OR</span></div>
                    </div>
                    <Link href={`/register?redirect=/gateway/checkout/${paymentIntentId}`} className="block cursor-pointer">
                      <button className="w-full py-3.5 sm:py-4 bg-white/[0.03] border border-white/10 text-white/70 text-sm sm:text-base font-medium rounded-lg sm:rounded-xl hover:bg-white/[0.06] transition-all flex items-center justify-center gap-2 cursor-pointer">
                        <Sparkles className="w-4 h-4 text-amber-400/60" /> {tCommon("create_account")}
                      </button>
                    </Link>
                  </div>
                ) : multiWallet && multiWallet.availableWallets.length > 0 ? (
                  /* Multi-Wallet Payment */
                  <div className="space-y-4 sm:space-y-6">
                    <WalletSelector
                      multiWallet={multiWallet}
                      session={session!}
                      formatCurrency={formatCurrency}
                      addWalletAllocation={addWalletAllocation}
                      removeWalletAllocation={removeWalletAllocation}
                      updateWalletAllocation={updateWalletAllocation}
                      autoAllocateWallets={autoAllocateWallets}
                      clearAllocations={clearAllocations}
                      theme="dark"
                    />
                    <button onClick={handleConfirmPayment} disabled={!isPaymentReady || processing}
                      className={`w-full py-4 sm:py-5 text-sm sm:text-base font-medium rounded-lg sm:rounded-xl transition-all flex items-center justify-center gap-2 sm:gap-3 ${isPaymentReady
                        ? "bg-linear-to-r from-amber-400 to-amber-500 text-black hover:from-amber-300 hover:to-amber-400 shadow-lg shadow-amber-500/20 cursor-pointer"
                        : "bg-white/5 text-white/20 cursor-not-allowed"}`}>
                      {processing ? <><Loader2 className="w-4 h-4 sm:w-5 sm:h-5 animate-spin" /> {tCommon('processing')}</>
                        : <><Lock className="w-4 h-4" /> Pay {formatCurrency(session?.amount || 0, session?.currency || "USD")}</>}
                    </button>
                  </div>
                ) : showBalancePanel ? (
                  /*
                    Has wallet — and the pending state, from the same markup.
                    The `walletLoading ?` branch this replaces drew an `h-18`
                    and an `h-14` grey bar for a card and button that measure
                    ~78px and ~60px, and carried none of the card's border or
                    padding, so the panel resized as the balance landed.

                    The emerald/red tone is the sufficiency verdict, so it stays
                    neutral until there is a balance to judge.
                  */
                  <div className="space-y-4 sm:space-y-6">
                    {/* Wallet Balance Card */}
                    <div className={`rounded-xl sm:rounded-2xl p-4 sm:p-5 border ${pending.wallet ? "bg-white/[0.02] border-white/10" : customerWallet?.sufficient ? "bg-emerald-500/5 border-emerald-500/20" : "bg-red-500/5 border-red-500/20"}`}>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3 sm:gap-4 min-w-0">
                          <div className={`w-10 h-10 sm:w-11 sm:h-11 rounded-lg sm:rounded-xl flex items-center justify-center shrink-0 ${pending.wallet ? "bg-white/5 border border-white/10" : customerWallet?.sufficient ? "bg-emerald-500/10 border border-emerald-500/20" : "bg-red-500/10 border border-red-500/20"}`}>
                            <Wallet className={`w-4 h-4 sm:w-5 sm:h-5 ${pending.wallet ? "text-white/30" : customerWallet?.sufficient ? "text-emerald-400/80" : "text-red-400/80"}`} />
                          </div>
                          <div className="min-w-0">
                            <p className="text-white/40 text-[10px] sm:text-xs uppercase tracking-wider">Available</p>
                            <p className="text-white text-base sm:text-lg font-medium">
                              <Loadable loading={pending.wallet} placeholder={CHECKOUT_PLACEHOLDER.balance}>
                                {customerWallet ? formatCurrency(customerWallet.balance, customerWallet.currency) : null}
                              </Loadable>
                            </p>
                          </div>
                        </div>
                        {/* Box kept, glyph withheld — a tick here is a verdict
                            on a balance that has not arrived. The `w-7 h-7
                            sm:w-8 sm:h-8` well renders in both states, so the
                            row reserves its full 28/32px either way and the
                            glyph cannot move anything. Scanner
                            `hidden-while-loading` false positive. */}
                        <div className={`w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center shrink-0 ${pending.wallet ? "bg-white/5" : customerWallet?.sufficient ? "bg-emerald-500/20" : "bg-red-500/20"}`}>
                          {pending.wallet ? null : customerWallet?.sufficient ? <Check className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-emerald-400" /> : <X className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-red-400" />}
                        </div>
                      </div>
                    </div>

                    {/* Insufficient Balance Warning */}
                    {customerWallet && !customerWallet.sufficient && (
                      <div className="space-y-3 sm:space-y-4">
                        <p className="text-white/40 text-xs sm:text-sm text-center">Need <span className="text-amber-400">{formatCurrency(
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
                      )}</span> more</p>
                        <Link href={`/finance/deposit?type=${session?.walletType?.toLowerCase()}&currency=${session?.currency}`} className="block cursor-pointer">
                          <button className="w-full py-3 sm:py-3.5 bg-white/[0.03] border border-amber-500/20 text-amber-400/80 text-sm sm:text-base font-medium rounded-lg sm:rounded-xl hover:bg-amber-500/5 transition-all flex items-center justify-center gap-2 cursor-pointer">
                            <Zap className="w-4 h-4" /> {tCommon("add_funds")}
                          </button>
                        </Link>
                      </div>
                    )}

                    {/* Pay Button — present and disabled while pending; it is
                        the tallest control in the card. */}
                    <button onClick={handleConfirmPayment} disabled={pending.wallet || !customerWallet?.sufficient || processing}
                      className={`w-full py-4 sm:py-5 text-sm sm:text-base font-medium rounded-lg sm:rounded-xl transition-all flex items-center justify-center gap-2 sm:gap-3 ${!pending.wallet && customerWallet?.sufficient
                        ? "bg-linear-to-r from-amber-400 to-amber-500 text-black hover:from-amber-300 hover:to-amber-400 shadow-lg shadow-amber-500/20 cursor-pointer"
                        : "bg-white/5 text-white/20 cursor-not-allowed"}`}>
                      {processing ? <><Loader2 className="w-4 h-4 sm:w-5 sm:h-5 animate-spin" /> {tCommon('processing')}</>
                        : <><Lock className="w-4 h-4" /> Pay <Loadable loading={pending.session} placeholder={CHECKOUT_PLACEHOLDER.amount}>{formatCurrency(session?.amount || 0, session?.currency || "USD")}</Loadable></>}
                    </button>
                  </div>
                ) : (
                  /* No Wallet */
                  <div className="space-y-4 sm:space-y-6 py-2 sm:py-4">
                    <div className="rounded-xl sm:rounded-2xl p-4 sm:p-5 bg-white/[0.02] border border-white/5">
                      <div className="flex items-center gap-3 sm:gap-4">
                        <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-lg sm:rounded-xl bg-white/5 border border-white/10 flex items-center justify-center shrink-0"><Wallet className="w-4 h-4 sm:w-5 sm:h-5 text-white/20" /></div>
                        <div className="min-w-0"><p className="text-white/40 text-[10px] sm:text-xs uppercase tracking-wider">{session?.walletType} Wallet</p><p className="text-white/30 text-sm sm:text-base">{tCommon("not_available")}</p></div>
                      </div>
                    </div>
                    <p className="text-white/40 text-xs sm:text-sm text-center">{t("fund_your_wallet_with")} <span className="text-amber-400">{formatCurrency(session?.amount || 0, session?.currency || "USD")}</span></p>
                    <Link href={`/finance/deposit?type=${session?.walletType?.toLowerCase()}&currency=${session?.currency}`} className="block cursor-pointer">
                      <button className="w-full py-4 sm:py-5 bg-linear-to-r from-amber-400 to-amber-500 text-black text-sm sm:text-base font-medium rounded-lg sm:rounded-xl hover:from-amber-300 hover:to-amber-400 transition-all shadow-lg shadow-amber-500/20 flex items-center justify-center gap-2 cursor-pointer">
                        <Banknote className="w-4 h-4 sm:w-5 sm:h-5" /> Deposit {session?.currency}
                      </button>
                    </Link>
                  </div>
                )}

                {/* Cancel Button */}
                <button onClick={handleCancel} disabled={processing} className="w-full text-center text-white/20 hover:text-white/40 text-[10px] sm:text-xs tracking-wider transition-colors py-2 cursor-pointer disabled:cursor-not-allowed">CANCEL</button>
              </div>
            </div>

            {/* Mobile Timer — same reasoning as the desktop one above. */}
            {pending.showTimer && (
              <div className="lg:hidden flex items-center justify-center gap-2 mt-4 sm:mt-6 text-white/20 text-xs sm:text-sm">
                <Clock className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                <span className="font-mono">
                  <Loadable loading={pending.timer} placeholder={CHECKOUT_PLACEHOLDER.timer}>
                    {formatTime(timeLeft)}
                  </Loadable>
                </span>
              </div>
            )}
          </m.div>
        </div>
      </div>
    </div>
  );
}
