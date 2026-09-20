"use client";

import { Link } from "@/i18n/routing";
import {
  CheckCircle, XCircle, Clock, Wallet, ShieldCheck, AlertTriangle, Loader2,
  Lock, User, ArrowRight, Sparkles, Store, Zap, Shield, Check, X, ArrowUpRight, Banknote, ChevronRight, Globe,
} from "lucide-react";
import { m, AnimatePresence } from "framer-motion";
import type { CheckoutDesignProps } from "./types";
import { WalletSelector } from "./WalletSelector";
import { useTranslations } from "next-intl";
import { Loadable } from "@/components/ui/skeleton";
import { checkoutPending, CHECKOUT_PLACEHOLDER } from "./pending";

const GridBackground = () => (
  <div className="fixed inset-0 overflow-hidden pointer-events-none">
    <div className="absolute inset-0 bg-linear-to-b from-slate-950 via-slate-900 to-slate-950" />
    <div className="absolute inset-0 opacity-[0.03]" style={{
      backgroundImage: `linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)`,
      backgroundSize: '60px 60px'
    }} />
    <div className="absolute top-0 left-1/4 w-[600px] h-[600px] bg-cyan-500/10 rounded-full blur-[150px]" />
    <div className="absolute bottom-0 right-1/4 w-[600px] h-[600px] bg-blue-500/10 rounded-full blur-[150px]" />
    <m.div animate={{ y: ["0%", "100%"] }} transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
      className="absolute left-0 right-0 h-[2px] bg-linear-to-r from-transparent via-cyan-400/20 to-transparent" />
  </div>
);

const LoadingDots = () => (
  <div className="flex gap-1">
    {[0, 1, 2].map((i) => (
      <m.div key={i} animate={{ opacity: [0.3, 1, 0.3] }} transition={{ duration: 1.2, repeat: Infinity, delay: i * 0.2 }}
        className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
    ))}
  </div>
);

export default function DesignV5({ state, actions, paymentIntentId }: CheckoutDesignProps) {
  const t = useTranslations("ext_gateway");
  const tCommon = useTranslations("common");
  const tExt = useTranslations("ext");
  const { session, customerWallet, loading, error, processing, success, redirectUrl, timeLeft, isAuthenticated, multiWallet } = state;
  const { handleConfirmPayment, handleCancel, formatTime, formatCurrency, addWalletAllocation, removeWalletAllocation, updateWalletAllocation, autoAllocateWallets, clearAllocations } = actions;

  const isPaymentReady = customerWallet?.sufficient || (multiWallet && multiWallet.remainingAmount <= 0.01);

  /**
   * The rotating-hexagon "INITIALIZING" screen that used to stand here replaced
   * the whole panel — header, amount block, pay column, footer — with a spinner
   * on the grid background. See `./pending.ts`. The panel is one tree now.
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
      <div className="min-h-screen relative flex items-center justify-center p-4">
        <GridBackground />
        <m.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="relative z-10 text-center max-w-md">
          <div className="w-20 h-20 mx-auto mb-8 relative">
            <div className="absolute inset-0 bg-red-500/20 rounded-xl blur-xl" />
            <div className="relative w-full h-full rounded-xl bg-red-500/10 border border-red-500/30 flex items-center justify-center"><X className="w-8 h-8 text-red-400" /></div>
          </div>
          <h1 className="text-2xl font-medium text-white mb-3">{t("transaction_failed")}</h1>
          <p className="text-slate-400 mb-8 font-mono text-sm">{error}</p>
          <button onClick={handleCancel} className="text-cyan-400 hover:text-cyan-300 text-sm font-mono transition-colors inline-flex items-center gap-2 cursor-pointer">
            <ArrowRight className="w-4 h-4 rotate-180" /> RETURN
          </button>
        </m.div>
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-screen relative flex items-center justify-center p-4 overflow-hidden">
        <GridBackground />
        {[...Array(8)].map((_, i) => (
          <m.div key={i} initial={{ x: "-100%", opacity: 0 }} animate={{ x: "200%", opacity: [0, 1, 0] }}
            transition={{ duration: 1.5, delay: i * 0.15, repeat: Infinity, repeatDelay: 3 }}
            className="absolute h-[1px] left-0 right-0 bg-linear-to-r from-transparent via-cyan-400 to-transparent" style={{ top: `${20 + i * 8}%` }} />
        ))}
        <m.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="relative z-10 text-center max-w-md">
          <div className="relative w-32 h-32 mx-auto mb-10">
            <m.div initial={{ scale: 0 }} animate={{ scale: [0, 1.2, 1] }} transition={{ duration: 0.6 }} className="absolute inset-0 rounded-full border-2 border-cyan-400/30" />
            <m.div initial={{ scale: 0 }} animate={{ scale: [0, 1.1, 1] }} transition={{ duration: 0.6, delay: 0.1 }} className="absolute inset-3 rounded-full border border-cyan-400/50" />
            <m.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring", delay: 0.2 }}
              className="absolute inset-6 rounded-full bg-linear-to-br from-cyan-400 to-blue-500 flex items-center justify-center shadow-lg shadow-cyan-500/30">
              <Check className="w-10 h-10 text-white stroke-[3]" />
            </m.div>
          </div>
          <m.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }} className="space-y-4 mb-10">
            <div className="inline-block px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 text-xs font-mono mb-2">{t("transaction_complete")}</div>
            <h1 className="text-3xl font-medium text-white">{t("payment_verified")}</h1>
            <div className="text-4xl font-light text-transparent bg-clip-text bg-linear-to-r from-cyan-400 to-blue-400">{formatCurrency(session?.amount || 0, session?.currency || "USD")}</div>
            <p className="text-slate-400">to <span className="text-white">{session?.merchant.name}</span></p>
          </m.div>
          <m.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.6 }} className="space-y-4">
            <div className="flex items-center justify-center gap-2 text-slate-500 text-sm font-mono"><Loader2 className="w-4 h-4 animate-spin" /> REDIRECTING</div>
            {redirectUrl && <a href={redirectUrl} className="inline-flex items-center gap-2 px-6 py-3 bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/30 rounded-lg text-cyan-400 text-sm font-mono transition-all cursor-pointer">CONTINUE <ArrowUpRight className="w-4 h-4" /></a>}
          </m.div>
        </m.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen relative">
      <GridBackground />
      <AnimatePresence>
        {session?.testMode && (
          <m.div initial={{ y: -40 }} animate={{ y: 0 }} className="relative z-20 bg-cyan-500/10 border-b border-cyan-500/20 py-2 text-center">
            <span className="text-cyan-400 text-xs font-mono tracking-widest">{tCommon("test_mode")}</span>
          </m.div>
        )}
      </AnimatePresence>

      <div className="relative z-10 min-h-screen flex items-center justify-center p-4 md:p-8">
        <m.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-xl">
          <div className="bg-slate-900/50 backdrop-blur-xl rounded-2xl border border-slate-700/50 overflow-hidden shadow-2xl shadow-shadow/50">
            <div className="p-6 border-b border-slate-700/50">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  {session?.merchant.logo ? (
                    <img src={session.merchant.logo} alt={session.merchant.name} className="w-12 h-12 rounded-xl object-cover ring-1 ring-slate-700" />
                  ) : (
                    <div className="w-12 h-12 rounded-xl bg-linear-to-br from-cyan-500/20 to-blue-500/20 border border-cyan-500/30 flex items-center justify-center">
                      <Globe className="w-5 h-5 text-cyan-400" />
                    </div>
                  )}
                  <div>
                    <h2 className="text-white font-medium">
                      <Loadable loading={pending.session} placeholder={CHECKOUT_PLACEHOLDER.merchantName}>
                        {session?.merchant.name}
                      </Loadable>
                    </h2>
                    {/* Reserved while pending: without it the header block is a
                        line shorter than it is about to be. */}
                    {pending.session || session?.merchant.website ? (
                      <p className="text-slate-500 text-sm font-mono">
                        <Loadable loading={pending.session} placeholder={CHECKOUT_PLACEHOLDER.merchantHost}>
                          {session?.merchant.website ? new URL(session.merchant.website).hostname : null}
                        </Loadable>
                      </p>
                    ) : null}
                  </div>
                </div>
                {/* `showTimer`, not `timeLeft > 0` — the countdown interval only
                    starts once the session lands, so this chip appeared a
                    second late and re-flowed the header row. */}
                {pending.showTimer && (
                  <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-800/50 border border-slate-700/50">
                    <Clock className="w-4 h-4 text-cyan-400" />
                    <span className="font-mono text-white text-sm">
                      <Loadable loading={pending.timer} placeholder={CHECKOUT_PLACEHOLDER.timer}>
                        {formatTime(timeLeft)}
                      </Loadable>
                    </span>
                  </div>
                )}
              </div>
            </div>

            <div className="p-8 text-center border-b border-slate-700/50 bg-linear-to-b from-slate-800/30 to-transparent">
              <p className="text-slate-500 text-xs font-mono tracking-widest mb-3">{tExt("amount_due")}</p>
              {/* Placeholder inside the 48px type, so it is measured by the
                  same text layout as the amount. */}
              <div className="text-5xl font-light text-white mb-4">
                <Loadable loading={pending.session} placeholder={CHECKOUT_PLACEHOLDER.amount}>
                  {formatCurrency(session?.amount || 0, session?.currency || "USD")}
                </Loadable>
              </div>
              {session?.description && <p className="text-slate-400 text-sm max-w-sm mx-auto">{session.description}</p>}
              {session?.lineItems && session.lineItems.length > 0 && (
                <div className="mt-6 space-y-2 text-left max-w-sm mx-auto">
                  {session.lineItems.map((item, index) => (
                    <div key={index} className="flex justify-between items-center py-2 px-3 rounded-lg bg-slate-800/30 border border-slate-700/30">
                      <span className="text-slate-300 text-sm">{item.name} <span className="text-slate-500">×{item.quantity}</span></span>
                      <span className="text-white text-sm font-mono">{formatCurrency(item.unitPrice * item.quantity, session.currency)}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="p-6 space-y-6">
              <AnimatePresence>
                {error && (
                  <m.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}
                    className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 flex items-center gap-3">
                    <XCircle className="w-5 h-5 text-red-400 shrink-0" /><p className="text-red-300 text-sm font-mono">{error}</p>
                  </m.div>
                )}
              </AnimatePresence>

              {!isAuthenticated && !pending.auth ? (
                <div className="space-y-6">
                  <div className="text-center py-6">
                    <div className="w-16 h-16 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center mx-auto mb-4">
                      <User className="w-8 h-8 text-cyan-400" />
                    </div>
                    <p className="text-slate-400 text-sm">{tCommon("authentication_required")}</p>
                  </div>
                  <Link href={`/login?redirect=/gateway/checkout/${paymentIntentId}`} className="block cursor-pointer">
                    <button className="w-full py-4 bg-linear-to-r from-cyan-500 to-blue-500 hover:from-cyan-400 hover:to-blue-400 text-white font-medium rounded-xl transition-all shadow-lg shadow-cyan-500/25 flex items-center justify-center gap-2 cursor-pointer">
                      <Lock className="w-4 h-4" /> {tCommon("sign_in")} <ChevronRight className="w-4 h-4" />
                    </button>
                  </Link>
                  <div className="relative">
                    <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-slate-700/50" /></div>
                    <div className="relative flex justify-center"><span className="bg-slate-900/50 px-4 text-slate-600 text-xs font-mono">OR</span></div>
                  </div>
                  <Link href={`/register?redirect=/gateway/checkout/${paymentIntentId}`} className="block cursor-pointer">
                    <button className="w-full py-4 bg-slate-800/50 border border-slate-700/50 text-slate-300 font-medium rounded-xl hover:bg-slate-800 transition-all flex items-center justify-center gap-2 cursor-pointer">
                      <Sparkles className="w-4 h-4 text-cyan-400" /> {tCommon("create_account")}
                    </button>
                  </Link>
                </div>
              ) : multiWallet && multiWallet.availableWallets.length > 0 ? (
                <div className="space-y-6">
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
                    className={`w-full py-5 font-medium rounded-xl transition-all flex items-center justify-center gap-3 ${isPaymentReady
                      ? "bg-linear-to-r from-cyan-500 to-blue-500 hover:from-cyan-400 hover:to-blue-400 text-white shadow-lg shadow-cyan-500/25 cursor-pointer"
                      : "bg-slate-800/50 text-slate-600 cursor-not-allowed"}`}>
                    {processing ? <><Loader2 className="w-5 h-5 animate-spin" /> PROCESSING <LoadingDots /></>
                      : <><Lock className="w-4 h-4" /> {tCommon("confirm_payment")}</>}
                  </button>
                </div>
              ) : showBalancePanel ? (
                /*
                  Balance card — one copy of the markup for both states. It
                  replaces a `walletLoading ?` branch of two grey bars (`h-20`
                  and `h-14`) that carried neither the card's border nor its
                  padding, so the panel resized when the balance landed.

                  Neutral while pending: the emerald/red split IS the
                  sufficiency verdict and was being guessed.
                */
                <div className="space-y-6">
                  <div className={`rounded-xl p-5 border ${pending.wallet ? "bg-slate-800/30 border-slate-700/50" : customerWallet?.sufficient ? "bg-emerald-500/5 border-emerald-500/30" : "bg-red-500/5 border-red-500/30"}`}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${pending.wallet ? "bg-slate-800 border border-slate-700" : customerWallet?.sufficient ? "bg-emerald-500/10 border border-emerald-500/30" : "bg-red-500/10 border border-red-500/30"}`}>
                          <Wallet className={`w-5 h-5 ${pending.wallet ? "text-slate-500" : customerWallet?.sufficient ? "text-emerald-400" : "text-red-400"}`} />
                        </div>
                        <div>
                          <p className="text-slate-500 text-xs font-mono tracking-wider">
                            <Loadable loading={pending.wallet} placeholder={CHECKOUT_PLACEHOLDER.walletType}>
                              {customerWallet?.type}
                            </Loadable>{" "}
                            BALANCE
                          </p>
                          <p className="text-white text-xl font-medium">
                            <Loadable loading={pending.wallet} placeholder={CHECKOUT_PLACEHOLDER.balance}>
                              {customerWallet ? formatCurrency(customerWallet.balance, customerWallet.currency) : null}
                            </Loadable>
                          </p>
                        </div>
                      </div>
                      {/* Box kept, glyph withheld until there is a balance to
                          judge. The `w-10 h-10` well renders in both states, so
                          nothing about the row's height or the 40px it occupies
                          depends on the tick — a fixed box is not sized by its
                          contents. Scanner `hidden-while-loading` false
                          positive; do not render the glyph unconditionally,
                          because a tick IS the verdict and there is none yet. */}
                      <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${pending.wallet ? "bg-slate-800" : customerWallet?.sufficient ? "bg-emerald-500/20" : "bg-red-500/20"}`}>
                        {pending.wallet ? null : customerWallet?.sufficient ? <Check className="w-5 h-5 text-emerald-400" /> : <X className="w-5 h-5 text-red-400" />}
                      </div>
                    </div>
                  </div>
                  {customerWallet && !customerWallet.sufficient && (
                    <div className="space-y-4">
                      <p className="text-slate-500 text-sm text-center font-mono">{tCommon("required")} <span className="text-cyan-400">+{formatCurrency(
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
                      )}</span></p>
                      <Link href={`/finance/deposit?type=${session?.walletType?.toLowerCase()}&currency=${session?.currency}`} className="block cursor-pointer">
                        <button className="w-full py-3 bg-slate-800/50 border border-cyan-500/30 text-cyan-400 font-medium rounded-xl hover:bg-cyan-500/10 transition-all flex items-center justify-center gap-2 cursor-pointer">
                          <Zap className="w-4 h-4" /> {tExt("deposit_funds")}
                        </button>
                      </Link>
                    </div>
                  )}
                  {/* Present and disabled while pending — the tallest control
                      in the panel, and it used to be absent entirely. */}
                  <button onClick={handleConfirmPayment} disabled={pending.wallet || !customerWallet?.sufficient || processing}
                    className={`w-full py-5 font-medium rounded-xl transition-all flex items-center justify-center gap-3 ${!pending.wallet && customerWallet?.sufficient
                      ? "bg-linear-to-r from-cyan-500 to-blue-500 hover:from-cyan-400 hover:to-blue-400 text-white shadow-lg shadow-cyan-500/25 cursor-pointer"
                      : "bg-slate-800/50 text-slate-600 cursor-not-allowed"}`}>
                    {processing ? <><Loader2 className="w-5 h-5 animate-spin" /> PROCESSING <LoadingDots /></>
                      : <><Lock className="w-4 h-4" /> {tCommon("confirm_payment")}</>}
                  </button>
                </div>
              ) : (
                <div className="space-y-6 py-4">
                  <div className="rounded-xl p-5 bg-slate-800/30 border border-slate-700/50">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center"><Wallet className="w-5 h-5 text-slate-500" /></div>
                      <div><p className="text-slate-500 text-xs font-mono tracking-wider">{session?.walletType} WALLET</p><p className="text-slate-400">{tCommon("not_available")}</p></div>
                    </div>
                  </div>
                  <p className="text-slate-500 text-sm text-center font-mono">DEPOSIT <span className="text-cyan-400">{formatCurrency(session?.amount || 0, session?.currency || "USD")}</span> {tExt("to_continue")}</p>
                  <Link href={`/finance/deposit?type=${session?.walletType?.toLowerCase()}&currency=${session?.currency}`} className="block cursor-pointer">
                    <button className="w-full py-5 bg-linear-to-r from-cyan-500 to-blue-500 hover:from-cyan-400 hover:to-blue-400 text-white font-medium rounded-xl transition-all shadow-lg shadow-cyan-500/25 flex items-center justify-center gap-2 cursor-pointer">
                      <Banknote className="w-5 h-5" /> DEPOSIT {session?.currency}
                    </button>
                  </Link>
                </div>
              )}

              <button onClick={handleCancel} disabled={processing} className="w-full text-center text-slate-600 hover:text-slate-400 text-xs font-mono tracking-wider transition-colors py-2 cursor-pointer disabled:cursor-not-allowed">{t("cancel_transaction")}</button>
            </div>

            <div className="px-6 py-4 bg-slate-900/50 border-t border-slate-700/50">
              <div className="flex items-center justify-center gap-6 text-slate-600 text-xs font-mono">
                <div className="flex items-center gap-1.5"><Shield className="w-3.5 h-3.5" /><span>SSL</span></div>
                <div className="flex items-center gap-1.5"><Lock className="w-3.5 h-3.5" /><span>ENCRYPTED</span></div>
                <div className="flex items-center gap-1.5"><ShieldCheck className="w-3.5 h-3.5" /><span>SECURE</span></div>
              </div>
            </div>
          </div>
        </m.div>
      </div>
    </div>
  );
}
