"use client";

import { Link } from "@/i18n/routing";
import {
  CheckCircle, XCircle, Clock, Wallet, ShieldCheck, AlertTriangle, Loader2,
  Lock, CreditCard, User, ArrowRight, Sparkles, Store, Zap, Shield, Check, X, ArrowUpRight, Banknote,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import type { CheckoutDesignProps } from "./types";
import { WalletSelector } from "./WalletSelector";
import { useTranslations } from "next-intl";

export default function DesignV3({ state, actions, paymentIntentId }: CheckoutDesignProps) {
  const t = useTranslations("ext_gateway");
  const tCommon = useTranslations("common");
  const tExt = useTranslations("ext");
  const { session, customerWallet, walletLoading, loading, error, processing, success, redirectUrl, timeLeft, isAuthenticated, multiWallet } = state;
  const { handleConfirmPayment, handleCancel, formatTime, formatCurrency, addWalletAllocation, removeWalletAllocation, updateWalletAllocation, autoAllocateWallets, clearAllocations } = actions;

  const isPaymentReady = customerWallet?.sufficient || (multiWallet && multiWallet.remainingAmount <= 0.01);
  const timerPercentage = timeLeft > 0 ? (timeLeft / 1800) * 100 : 0;

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-violet-950 via-slate-900 to-slate-950 flex items-center justify-center relative overflow-hidden">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-violet-500/20 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-blue-500/20 rounded-full blur-3xl animate-pulse delay-1000" />
        <div className="relative z-10 text-center space-y-8">
          <div className="relative mx-auto w-24 h-24">
            <div className="absolute inset-0 rounded-full border-2 border-transparent border-t-violet-400 border-r-violet-400/50 animate-spin" />
            <div className="absolute inset-2 rounded-full bg-white/5 backdrop-blur-xl flex items-center justify-center">
              <CreditCard className="w-8 h-8 text-violet-300" />
            </div>
          </div>
          <div className="space-y-2">
            <p className="text-white/80 font-medium">{t("preparing_checkout")}</p>
            <p className="text-white/40 text-sm">{tCommon('please_wait')}</p>
          </div>
        </div>
      </div>
    );
  }

  if (error && !session) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-red-950/20 to-slate-950 flex items-center justify-center p-4 relative overflow-hidden">
        <div className="absolute top-1/3 left-1/3 w-96 h-96 bg-red-500/10 rounded-full blur-3xl" />
        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="relative z-10 text-center space-y-8 max-w-md">
          <div className="w-28 h-28 rounded-3xl bg-red-500/10 backdrop-blur-xl border border-red-500/20 flex items-center justify-center mx-auto">
            <X className="w-14 h-14 text-red-400" />
          </div>
          <div className="space-y-3">
            <h1 className="text-3xl font-semibold text-white">{tCommon("something_went_wrong")}</h1>
            <p className="text-white/50 leading-relaxed">{error}</p>
          </div>
          <button onClick={handleCancel} className="inline-flex items-center gap-2 text-white/60 hover:text-white transition-colors cursor-pointer">
            <ArrowRight className="w-4 h-4 rotate-180" /> {t("return_to_store")}
          </button>
        </motion.div>
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-emerald-950 via-slate-900 to-slate-950 flex items-center justify-center p-4 relative overflow-hidden">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-emerald-500/20 rounded-full blur-3xl" />
        {[...Array(20)].map((_, i) => (
          <motion.div key={i}
            initial={{ opacity: 0, y: 100, x: Math.random() * 400 - 200 }}
            animate={{ opacity: [0, 1, 0], y: -400, x: Math.random() * 400 - 200 }}
            transition={{ duration: 3 + Math.random() * 2, repeat: Infinity, delay: Math.random() * 2 }}
            className={`absolute bottom-0 w-2 h-2 rounded-full ${i % 3 === 0 ? "bg-emerald-400" : i % 3 === 1 ? "bg-teal-400" : "bg-green-400"}`}
            style={{ left: `${10 + Math.random() * 80}%` }} />
        ))}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="relative z-10 text-center space-y-8">
          <motion.div initial={{ scale: 0, rotate: -180 }} animate={{ scale: 1, rotate: 0 }} transition={{ type: "spring", duration: 0.8 }}
            className="w-32 h-32 rounded-full bg-gradient-to-br from-emerald-400 to-green-500 flex items-center justify-center mx-auto shadow-2xl shadow-emerald-500/40">
            <Check className="w-16 h-16 text-white stroke-[3]" />
          </motion.div>
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="space-y-4">
            <h1 className="text-4xl font-bold text-white">{t("payment_successful")}</h1>
            <p className="text-white/60 text-lg">
              <span className="text-emerald-400 font-semibold">{formatCurrency(session?.amount || 0, session?.currency || "USD")}</span> {t("paid_to")} {session?.merchant.name}
            </p>
          </motion.div>
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }} className="flex items-center justify-center gap-2 text-emerald-300">
            <Loader2 className="w-4 h-4 animate-spin" /><span>{t("redirecting_to_merchant_ellipsis")}</span>
          </motion.div>
          {redirectUrl && (
            <motion.a initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.7 }} href={redirectUrl}
              className="inline-flex items-center gap-2 bg-white/10 hover:bg-white/20 backdrop-blur-xl px-8 py-4 rounded-2xl text-white font-medium transition-all border border-white/10 cursor-pointer">
              {tExt("continue_shopping")} <ArrowUpRight className="w-4 h-4" />
            </motion.a>
          )}
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-violet-950 via-slate-900 to-slate-950 relative overflow-hidden">
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
        <div className="absolute top-[-20%] left-[-10%] w-[600px] h-[600px] bg-violet-500/20 rounded-full blur-3xl" />
        <div className="absolute bottom-[-20%] right-[-10%] w-[600px] h-[600px] bg-blue-500/15 rounded-full blur-3xl" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-indigo-500/10 rounded-full blur-3xl" />
      </div>

      <AnimatePresence>
        {session?.testMode && (
          <motion.div initial={{ y: -50 }} animate={{ y: 0 }} className="relative z-20 bg-gradient-to-r from-amber-500 to-orange-500 text-white py-2 text-center text-sm font-medium">
            <div className="flex items-center justify-center gap-2"><AlertTriangle className="w-4 h-4" /> {t("test_mode_no_real_charges_will_be_made")}</div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="relative z-10 min-h-screen flex items-center justify-center p-4 md:p-8">
        <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-lg">
          <div className="bg-white/5 backdrop-blur-2xl rounded-3xl border border-white/10 shadow-2xl overflow-hidden">
            <div className="p-6 md:p-8 border-b border-white/10">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  {session?.merchant.logo ? (
                    <img src={session.merchant.logo} alt={session.merchant.name} className="w-14 h-14 rounded-2xl object-cover ring-2 ring-white/10" />
                  ) : (
                    <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center">
                      <Store className="w-7 h-7 text-white" />
                    </div>
                  )}
                  <div>
                    <h2 className="text-white font-semibold text-lg">{session?.merchant.name}</h2>
                    {session?.merchant.website && <p className="text-white/40 text-sm">{new URL(session.merchant.website).hostname}</p>}
                  </div>
                </div>
                {timeLeft > 0 && (
                  <div className="relative w-14 h-14">
                    <svg className="w-full h-full -rotate-90">
                      <circle cx="28" cy="28" r="24" fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="3" />
                      <circle cx="28" cy="28" r="24" fill="none" stroke="url(#timer-gradient)" strokeWidth="3" strokeLinecap="round"
                        strokeDasharray={`${(timerPercentage / 100) * 150.8} 150.8`} />
                      <defs><linearGradient id="timer-gradient" x1="0%" y1="0%" x2="100%" y2="0%">
                        <stop offset="0%" stopColor="#a78bfa" /><stop offset="100%" stopColor="#818cf8" />
                      </linearGradient></defs>
                    </svg>
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span className="text-white text-xs font-mono">{formatTime(timeLeft)}</span>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="p-6 md:p-8 text-center border-b border-white/10 bg-gradient-to-b from-white/5 to-transparent">
              <p className="text-white/40 text-sm uppercase tracking-wider mb-2">{t("amount_due")}</p>
              <div className="text-5xl md:text-6xl font-bold bg-gradient-to-r from-white via-white to-white/70 bg-clip-text text-transparent">
                {formatCurrency(session?.amount || 0, session?.currency || "USD")}
              </div>
              {session?.description && <p className="text-white/50 mt-4 text-sm">{session.description}</p>}
              {session?.lineItems && session.lineItems.length > 0 && (
                <div className="mt-6 space-y-2 text-left">
                  {session.lineItems.map((item, index) => (
                    <div key={index} className="flex justify-between items-center py-2 px-4 rounded-xl bg-white/5">
                      <span className="text-white/70 text-sm">{item.name} <span className="text-white/30">×{item.quantity}</span></span>
                      <span className="text-white/90 text-sm font-medium">{formatCurrency(item.unitPrice * item.quantity, session.currency)}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="p-6 md:p-8 space-y-6">
              <AnimatePresence>
                {error && (
                  <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}
                    className="bg-red-500/10 border border-red-500/20 rounded-2xl p-4 flex items-center gap-3">
                    <XCircle className="w-5 h-5 text-red-400 shrink-0" /><p className="text-red-300 text-sm">{error}</p>
                  </motion.div>
                )}
              </AnimatePresence>

              {!isAuthenticated ? (
                <div className="space-y-6">
                  <div className="text-center py-4">
                    <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-violet-500/20 to-purple-500/20 backdrop-blur-xl border border-violet-500/20 flex items-center justify-center mx-auto mb-4">
                      <User className="w-10 h-10 text-violet-300" />
                    </div>
                    <h3 className="text-xl text-white font-medium">{t("sign_in_to_pay")}</h3>
                    <p className="text-white/40 mt-2 text-sm">{t("log_in_to_your_account_to_complete_payment")}</p>
                  </div>
                  <Link href={`/login?redirect=/gateway/checkout/${paymentIntentId}`} className="block cursor-pointer">
                    <button className="w-full py-4 bg-gradient-to-r from-violet-500 to-purple-500 hover:from-violet-400 hover:to-purple-400 text-white font-semibold rounded-2xl transition-all shadow-lg shadow-violet-500/25 flex items-center justify-center gap-2 cursor-pointer">
                      {tCommon("sign_in_to_continue")} <ArrowRight className="w-4 h-4" />
                    </button>
                  </Link>
                  <div className="relative">
                    <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-white/10" /></div>
                    <div className="relative flex justify-center"><span className="bg-transparent px-4 text-white/30 text-sm backdrop-blur-xl">{t("new_here")}</span></div>
                  </div>
                  <Link href={`/register?redirect=/gateway/checkout/${paymentIntentId}`} className="block cursor-pointer">
                    <button className="w-full py-4 bg-white/5 hover:bg-white/10 backdrop-blur-xl border border-white/10 text-white font-medium rounded-2xl transition-all flex items-center justify-center gap-2 cursor-pointer">
                      <Sparkles className="w-4 h-4" /> {tCommon("create_account")}
                    </button>
                  </Link>
                </div>
              ) : walletLoading ? (
                <div className="space-y-4"><div className="h-24 rounded-2xl bg-white/5 animate-pulse" /><div className="h-14 rounded-2xl bg-white/5 animate-pulse" /></div>
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
                    theme="glass"
                  />
                  <button onClick={handleConfirmPayment} disabled={!isPaymentReady || processing}
                    className={`w-full py-5 font-semibold rounded-2xl transition-all flex items-center justify-center gap-3 ${isPaymentReady
                      ? "bg-gradient-to-r from-emerald-500 to-green-500 hover:from-emerald-400 hover:to-green-400 text-white shadow-lg shadow-emerald-500/25 cursor-pointer"
                      : "bg-white/5 text-white/30 cursor-not-allowed"}`}>
                    {processing ? <><Loader2 className="w-5 h-5 animate-spin" /> {tCommon('processing')}</>
                      : <><Lock className="w-4 h-4" /> Pay {formatCurrency(session?.amount || 0, session?.currency || "USD")}</>}
                  </button>
                </div>
              ) : customerWallet ? (
                <div className="space-y-6">
                  <div className={`rounded-2xl p-5 border backdrop-blur-xl ${customerWallet.sufficient ? "bg-emerald-500/10 border-emerald-500/20" : "bg-red-500/10 border-red-500/20"}`}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${customerWallet.sufficient ? "bg-emerald-500/20" : "bg-red-500/20"}`}>
                          <Wallet className={`w-6 h-6 ${customerWallet.sufficient ? "text-emerald-400" : "text-red-400"}`} />
                        </div>
                        <div>
                          <p className="text-white/50 text-xs uppercase tracking-wider">{customerWallet.type} Balance</p>
                          <p className="text-white text-xl font-semibold">{formatCurrency(customerWallet.balance, customerWallet.currency)}</p>
                        </div>
                      </div>
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center ${customerWallet.sufficient ? "bg-emerald-500/20" : "bg-red-500/20"}`}>
                        {customerWallet.sufficient ? <Check className="w-5 h-5 text-emerald-400" /> : <X className="w-5 h-5 text-red-400" />}
                      </div>
                    </div>
                  </div>
                  {!customerWallet.sufficient && (
                    <div className="space-y-4">
                      <div className="text-center"><p className="text-white/50 text-sm">{t("you_need")} <span className="text-white font-medium">{formatCurrency(session!.amount - customerWallet.balance, session!.currency)}</span> more</p></div>
                      <Link href={`/finance/deposit?type=${session?.walletType?.toLowerCase()}&currency=${session?.currency}`} className="block cursor-pointer">
                        <button className="w-full py-4 bg-white/5 hover:bg-white/10 backdrop-blur-xl border border-white/10 text-white font-medium rounded-2xl transition-all flex items-center justify-center gap-2 cursor-pointer">
                          <Zap className="w-4 h-4 text-yellow-400" /> {tCommon("add_funds")}
                        </button>
                      </Link>
                    </div>
                  )}
                  <button onClick={handleConfirmPayment} disabled={!customerWallet.sufficient || processing}
                    className={`w-full py-5 font-semibold rounded-2xl transition-all flex items-center justify-center gap-3 ${customerWallet.sufficient
                      ? "bg-gradient-to-r from-emerald-500 to-green-500 hover:from-emerald-400 hover:to-green-400 text-white shadow-lg shadow-emerald-500/25 cursor-pointer"
                      : "bg-white/5 text-white/30 cursor-not-allowed"}`}>
                    {processing ? <><Loader2 className="w-5 h-5 animate-spin" /> {tCommon('processing')}</>
                      : <><Lock className="w-4 h-4" /> Pay {formatCurrency(session?.amount || 0, session?.currency || "USD")}</>}
                  </button>
                </div>
              ) : (
                <div className="space-y-6">
                  <div className="rounded-2xl p-5 bg-white/5 border border-white/10 backdrop-blur-xl">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-xl bg-white/5 flex items-center justify-center"><Wallet className="w-6 h-6 text-white/30" /></div>
                      <div><p className="text-white/50 text-xs uppercase tracking-wider">{session?.walletType} Wallet</p><p className="text-white/30 text-lg">{t("not_available")}</p></div>
                    </div>
                  </div>
                  <p className="text-white/40 text-sm text-center">{t("you_need_to_fund_your_wallet_with")} <span className="text-white">{formatCurrency(session?.amount || 0, session?.currency || "USD")}</span></p>
                  <Link href={`/finance/deposit?type=${session?.walletType?.toLowerCase()}&currency=${session?.currency}`} className="block cursor-pointer">
                    <button className="w-full py-5 bg-gradient-to-r from-violet-500 to-purple-500 hover:from-violet-400 hover:to-purple-400 text-white font-semibold rounded-2xl transition-all shadow-lg shadow-violet-500/25 flex items-center justify-center gap-2 cursor-pointer">
                      <Banknote className="w-5 h-5" /> Deposit {session?.currency}
                    </button>
                  </Link>
                </div>
              )}

              <button onClick={handleCancel} disabled={processing} className="w-full text-center text-white/30 hover:text-white/60 text-sm transition-colors py-2 cursor-pointer disabled:cursor-not-allowed">{t("cancel_and_return_to_store")}</button>
            </div>

            <div className="px-6 md:px-8 py-4 bg-white/[0.02] border-t border-white/5">
              <div className="flex items-center justify-center gap-6 text-white/20 text-xs">
                <div className="flex items-center gap-1.5"><Shield className="w-3.5 h-3.5" /><span>SSL Secured</span></div>
                <div className="flex items-center gap-1.5"><Lock className="w-3.5 h-3.5" /><span>Encrypted</span></div>
                <div className="flex items-center gap-1.5"><ShieldCheck className="w-3.5 h-3.5" /><span>Protected</span></div>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
