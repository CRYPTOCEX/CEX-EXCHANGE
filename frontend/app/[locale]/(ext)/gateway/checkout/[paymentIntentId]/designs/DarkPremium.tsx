"use client";

import { Link } from "@/i18n/routing";
import {
  CheckCircle, XCircle, Clock, Wallet, ShieldCheck, AlertTriangle, Loader2,
  Lock, User, ArrowRight, Sparkles, ChevronRight, Store, Timer, Zap, Shield, Fingerprint, ArrowUpRight,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import type { CheckoutDesignProps } from "./types";
import { WalletSelector } from "./WalletSelector";

export default function DesignV2({ state, actions, paymentIntentId }: CheckoutDesignProps) {
  const { session, customerWallet, walletLoading, loading, error, processing, success, redirectUrl, timeLeft, isAuthenticated, multiWallet } = state;
  const { handleConfirmPayment, handleCancel, formatTime, formatCurrency, addWalletAllocation, removeWalletAllocation, updateWalletAllocation, autoAllocateWallets, clearAllocations } = actions;

  // Check if payment is ready (either single wallet sufficient OR multi-wallet fully allocated)
  const isPaymentReady = customerWallet?.sufficient || (multiWallet && multiWallet.remainingAmount <= 0.01);
  const hasMultipleWallets = multiWallet && multiWallet.availableWallets.length > 1;

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center p-4">
        <div className="text-center space-y-4 sm:space-y-6">
          <div className="relative">
            <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full border-2 border-white/10 flex items-center justify-center">
              <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-full border-t-2 border-white animate-spin" />
            </div>
          </div>
          <p className="text-white/60 text-xs sm:text-sm tracking-wide">Loading checkout...</p>
        </div>
      </div>
    );
  }

  if (error && !session) {
    const isExpired = error.toLowerCase().includes("expired");
    const isNotFound = error.toLowerCase().includes("not found");
    const isCancelled = error.toLowerCase().includes("cancelled");
    const isCompleted = error.toLowerCase().includes("completed") || error.toLowerCase().includes("succeeded");

    const getErrorTitle = () => {
      if (isExpired) return "Session Expired";
      if (isNotFound) return "Payment Not Found";
      if (isCancelled) return "Payment Cancelled";
      if (isCompleted) return "Payment Already Completed";
      return "Payment Failed";
    };

    const getErrorDescription = () => {
      if (isExpired) return "This payment session has expired. Please return to the merchant and start a new checkout.";
      if (isNotFound) return "We couldn't find this payment. It may have been deleted or the link is invalid.";
      if (isCancelled) return "This payment has been cancelled.";
      if (isCompleted) return "This payment has already been completed successfully.";
      return error;
    };

    return (
      <div className="min-h-screen bg-black flex items-center justify-center p-4">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center space-y-6 sm:space-y-8 max-w-md px-4">
          <div className={`w-20 h-20 sm:w-24 sm:h-24 rounded-full border flex items-center justify-center mx-auto ${
            isCompleted ? "border-emerald-500/30" : isExpired ? "border-amber-500/30" : "border-red-500/30"
          }`}>
            {isCompleted ? (
              <CheckCircle className="w-10 h-10 sm:w-12 sm:h-12 text-emerald-500" />
            ) : isExpired ? (
              <Clock className="w-10 h-10 sm:w-12 sm:h-12 text-amber-500" />
            ) : (
              <XCircle className="w-10 h-10 sm:w-12 sm:h-12 text-red-500" />
            )}
          </div>
          <div className="space-y-2 sm:space-y-3">
            <h1 className="text-xl sm:text-2xl font-light text-white">{getErrorTitle()}</h1>
            <p className="text-white/50 text-sm sm:text-base leading-relaxed">{getErrorDescription()}</p>
          </div>
          <button onClick={handleCancel} className="inline-flex items-center gap-2 text-white/60 hover:text-white text-xs sm:text-sm transition-colors cursor-pointer">
            <ArrowRight className="w-4 h-4 rotate-180" /> Return to merchant
          </button>
        </motion.div>
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center p-4 overflow-hidden">
        <div className="absolute inset-0 flex items-center justify-center">
          {[...Array(3)].map((_, i) => (
            <motion.div key={i} initial={{ scale: 0, opacity: 0.5 }} animate={{ scale: 4, opacity: 0 }}
              transition={{ duration: 2, repeat: Infinity, delay: i * 0.6, ease: "easeOut" }}
              className="absolute w-24 h-24 sm:w-32 sm:h-32 rounded-full border border-emerald-500/30" />
          ))}
        </div>
        <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="relative text-center space-y-6 sm:space-y-8 max-w-md z-10 px-4">
          <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring", delay: 0.2 }}
            className="w-22 h-22 sm:w-28 sm:h-28 rounded-full bg-gradient-to-br from-emerald-500 to-green-600 flex items-center justify-center mx-auto shadow-2xl shadow-emerald-500/30">
            <CheckCircle className="w-11 h-11 sm:w-14 sm:h-14 text-white" />
          </motion.div>
          <div className="space-y-2 sm:space-y-3">
            <motion.h1 initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="text-2xl sm:text-3xl font-light text-white">Payment Complete</motion.h1>
            <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4 }} className="text-white/50 text-sm sm:text-base">
              {formatCurrency(session?.amount || 0, session?.currency || "USD")} sent to <span className="text-white">{session?.merchant.name}</span>
            </motion.p>
          </div>
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }} className="flex items-center justify-center gap-2 text-emerald-400/80 text-xs sm:text-sm">
            <Loader2 className="w-4 h-4 animate-spin" /><span>Redirecting to merchant...</span>
          </motion.div>
          {redirectUrl && (
            <motion.a initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.6 }} href={redirectUrl}
              className="inline-flex items-center gap-2 text-white bg-white/10 hover:bg-white/20 px-5 py-2.5 sm:px-6 sm:py-3 rounded-full transition-colors cursor-pointer text-sm sm:text-base">
              Continue <ArrowRight className="w-4 h-4" />
            </motion.a>
          )}
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white">
      <AnimatePresence>
        {session?.testMode && (
          <motion.div initial={{ y: -40 }} animate={{ y: 0 }} className="bg-amber-500 text-black py-1.5 text-center text-[10px] sm:text-xs font-medium tracking-wider">
            TEST MODE — No real charges
          </motion.div>
        )}
      </AnimatePresence>

      <div className="min-h-[calc(100vh-32px)] flex flex-col lg:flex-row">
        {/* Left Side - Order Summary */}
        <div className="lg:w-1/2 bg-gradient-to-br from-zinc-900 to-black p-4 sm:p-6 md:p-8 lg:p-12 xl:p-16 flex flex-col justify-between order-2 lg:order-1">
          <div className="space-y-6 sm:space-y-8 lg:space-y-12">
            {/* Merchant Info */}
            <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} className="flex items-center gap-3 sm:gap-4">
              {session?.merchant.logo ? (
                <img src={session.merchant.logo} alt={session.merchant.name} className="w-10 h-10 sm:w-12 sm:h-12 rounded-lg sm:rounded-xl object-cover shrink-0" />
              ) : (
                <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-lg sm:rounded-xl bg-white/10 flex items-center justify-center shrink-0">
                  <Store className="w-5 h-5 sm:w-6 sm:h-6 text-white/60" />
                </div>
              )}
              <div className="min-w-0">
                <h2 className="text-base sm:text-lg font-medium truncate">{session?.merchant.name}</h2>
                {session?.merchant.website && <p className="text-white/40 text-xs sm:text-sm truncate">{new URL(session.merchant.website).hostname}</p>}
              </div>
            </motion.div>

            {/* Total Amount */}
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="space-y-1 sm:space-y-2">
              <p className="text-white/40 text-xs sm:text-sm tracking-wide uppercase">Total Amount</p>
              <span className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-extralight tracking-tight">{formatCurrency(session?.amount || 0, session?.currency || "USD")}</span>
            </motion.div>

            {/* Description */}
            {session?.description && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }} className="space-y-2 sm:space-y-4">
                <p className="text-white/40 text-xs sm:text-sm tracking-wide uppercase">Order Details</p>
                <p className="text-white/70 text-sm sm:text-base">{session.description}</p>
              </motion.div>
            )}

            {/* Line Items */}
            {session?.lineItems && session.lineItems.length > 0 && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }} className="space-y-3 sm:space-y-4">
                <p className="text-white/40 text-xs sm:text-sm tracking-wide uppercase">Items</p>
                <div className="space-y-2 sm:space-y-3">
                  {session.lineItems.map((item, index) => (
                    <div key={index} className="flex items-center gap-3 sm:gap-4 py-2 sm:py-3 border-b border-white/5 last:border-0">
                      {item.image ? (
                        <img src={item.image} alt={item.name} className="w-11 h-11 sm:w-14 sm:h-14 rounded-lg sm:rounded-xl object-cover shrink-0" />
                      ) : (
                        <div className="w-11 h-11 sm:w-14 sm:h-14 rounded-lg sm:rounded-xl bg-white/5 flex items-center justify-center shrink-0">
                          <Store className="w-5 h-5 sm:w-6 sm:h-6 text-white/20" />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-white/90 text-sm sm:text-base font-medium truncate">{item.name}</p>
                        {item.description && <p className="text-white/40 text-xs sm:text-sm truncate">{item.description}</p>}
                        <p className="text-white/40 text-xs sm:text-sm">Qty: {item.quantity}</p>
                      </div>
                      <p className="text-white/90 text-sm sm:text-base font-medium shrink-0">{formatCurrency(item.unitPrice * item.quantity, session.currency)}</p>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}
          </div>

          {/* Timer */}
          {timeLeft > 0 && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4 }} className="flex items-center gap-2 sm:gap-3 pt-4 sm:pt-6 lg:pt-8 mt-4 lg:mt-0">
              <Timer className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-white/40" />
              <span className="text-white/40 text-xs sm:text-sm">Expires in</span>
              <span className="font-mono text-sm sm:text-base text-white">{formatTime(timeLeft)}</span>
            </motion.div>
          )}
        </div>

        {/* Right Side - Payment Form */}
        <div className="lg:w-1/2 bg-black p-4 sm:p-6 md:p-8 lg:p-12 xl:p-16 flex items-center justify-center order-1 lg:order-2">
          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.2 }} className="w-full max-w-md space-y-5 sm:space-y-6 lg:space-y-8">
            {/* Error Message */}
            <AnimatePresence>
              {error && (
                <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
                  className="bg-red-500/10 border border-red-500/20 rounded-xl sm:rounded-2xl p-3 sm:p-4 flex items-center gap-2 sm:gap-3">
                  <XCircle className="w-4 h-4 sm:w-5 sm:h-5 text-red-500 shrink-0" />
                  <p className="text-red-400 text-xs sm:text-sm">{error}</p>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Not Authenticated */}
            {!isAuthenticated ? (
              <div className="space-y-5 sm:space-y-6 lg:space-y-8">
                <div className="text-center space-y-3 sm:space-y-4">
                  <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full border border-white/10 flex items-center justify-center mx-auto">
                    <Fingerprint className="w-8 h-8 sm:w-10 sm:h-10 text-white/40" />
                  </div>
                  <div>
                    <h3 className="text-lg sm:text-xl font-light">Authentication Required</h3>
                    <p className="text-white/40 text-sm sm:text-base mt-1 sm:mt-2">Sign in to complete your payment</p>
                  </div>
                </div>
                <Link href={`/login?redirect=/gateway/checkout/${paymentIntentId}`} className="block">
                  <button className="w-full py-3.5 sm:py-4 bg-white text-black text-sm sm:text-base font-medium rounded-xl sm:rounded-2xl hover:bg-white/90 transition-colors flex items-center justify-center gap-2 cursor-pointer">
                    Sign In <ChevronRight className="w-4 h-4" />
                  </button>
                </Link>
                <div className="relative">
                  <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-white/10" /></div>
                  <div className="relative flex justify-center"><span className="bg-black px-4 text-white/30 text-xs sm:text-sm">or</span></div>
                </div>
                <Link href={`/register?redirect=/gateway/checkout/${paymentIntentId}`} className="block">
                  <button className="w-full py-3.5 sm:py-4 border border-white/10 text-white text-sm sm:text-base font-medium rounded-xl sm:rounded-2xl hover:bg-white/5 transition-colors flex items-center justify-center gap-2 cursor-pointer">
                    <Sparkles className="w-4 h-4" /> Create Account
                  </button>
                </Link>
              </div>
            ) : walletLoading ? (
              /* Wallet Loading Skeleton */
              <div className="space-y-4 sm:space-y-6">
                <div className="h-24 sm:h-32 rounded-xl sm:rounded-2xl bg-white/5 animate-pulse" />
                <div className="h-12 sm:h-14 rounded-xl sm:rounded-2xl bg-white/5 animate-pulse" />
              </div>
            ) : multiWallet && multiWallet.availableWallets.length > 0 ? (
              /* Multi-Wallet Payment */
              <div className="space-y-5 sm:space-y-6 lg:space-y-8">
                {/* Wallet Selector */}
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
                  theme="dark"
                />

                {/* Insufficient Balance Warning - show Add Funds if can't cover */}
                {!multiWallet.canPayFull && (
                  <div className="space-y-3 sm:space-y-4">
                    <Link href={`/finance/deposit?type=${session?.walletType?.toLowerCase()}&currency=${session?.currency}`} className="block">
                      <button className="w-full py-3.5 sm:py-4 border border-white/10 text-white text-sm sm:text-base font-medium rounded-xl sm:rounded-2xl hover:bg-white/5 transition-colors flex items-center justify-center gap-2 cursor-pointer">
                        <Zap className="w-4 h-4" /> Add Funds
                      </button>
                    </Link>
                  </div>
                )}

                {/* Pay Button */}
                <button onClick={handleConfirmPayment} disabled={!isPaymentReady || processing}
                  className={`w-full py-4 sm:py-5 text-sm sm:text-base font-medium rounded-xl sm:rounded-2xl transition-all flex items-center justify-center gap-2 sm:gap-3 ${isPaymentReady
                    ? "bg-white text-black hover:bg-white/90 shadow-2xl shadow-white/10 cursor-pointer"
                    : "bg-white/5 text-white/30 cursor-not-allowed"}`}>
                  {processing ? <><Loader2 className="w-4 h-4 sm:w-5 sm:h-5 animate-spin" /> Processing...</>
                    : <><Lock className="w-4 h-4" /> Pay {formatCurrency(session?.amount || 0, session?.currency || "USD")}</>}
                </button>
              </div>
            ) : customerWallet ? (
              /* Single Wallet (fallback) */
              <div className="space-y-5 sm:space-y-6 lg:space-y-8">
                {/* Wallet Balance Card */}
                <div className={`relative overflow-hidden rounded-2xl sm:rounded-3xl p-4 sm:p-6 ${customerWallet.sufficient
                  ? "bg-gradient-to-br from-emerald-900/50 to-emerald-950/50 border border-emerald-500/20"
                  : "bg-gradient-to-br from-red-900/30 to-red-950/30 border border-red-500/20"}`}>
                  <div className={`absolute -top-16 -right-16 sm:-top-20 sm:-right-20 w-32 h-32 sm:w-40 sm:h-40 rounded-full blur-3xl ${customerWallet.sufficient ? "bg-emerald-500/20" : "bg-red-500/10"}`} />
                  <div className="relative space-y-3 sm:space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2.5 sm:gap-3">
                        <div className={`w-9 h-9 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl flex items-center justify-center shrink-0 ${customerWallet.sufficient ? "bg-emerald-500/20" : "bg-red-500/20"}`}>
                          <Wallet className={`w-4 h-4 sm:w-5 sm:h-5 ${customerWallet.sufficient ? "text-emerald-400" : "text-red-400"}`} />
                        </div>
                        <div className="min-w-0">
                          <p className="text-white/50 text-[10px] sm:text-xs uppercase tracking-wider">{customerWallet.type} Wallet</p>
                          <p className="text-lg sm:text-xl font-light">{formatCurrency(customerWallet.balance, customerWallet.currency)}</p>
                        </div>
                      </div>
                      {customerWallet.sufficient ? (
                        <div className="flex items-center gap-1.5 sm:gap-2 text-emerald-400 text-xs sm:text-sm shrink-0"><CheckCircle className="w-3.5 h-3.5 sm:w-4 sm:h-4" /><span>Ready</span></div>
                      ) : (
                        <div className="flex items-center gap-1.5 sm:gap-2 text-red-400 text-xs sm:text-sm shrink-0"><AlertTriangle className="w-3.5 h-3.5 sm:w-4 sm:h-4" /><span>Low</span></div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Insufficient Balance Warning */}
                {!customerWallet.sufficient && (
                  <div className="space-y-3 sm:space-y-4">
                    <p className="text-white/50 text-xs sm:text-sm text-center">
                      Need <span className="text-white">{formatCurrency(session!.amount - customerWallet.balance, session!.currency)}</span> more
                    </p>
                    <Link href={`/finance/deposit?type=${session?.walletType?.toLowerCase()}&currency=${session?.currency}`} className="block">
                      <button className="w-full py-3.5 sm:py-4 border border-white/10 text-white text-sm sm:text-base font-medium rounded-xl sm:rounded-2xl hover:bg-white/5 transition-colors flex items-center justify-center gap-2 cursor-pointer">
                        <Zap className="w-4 h-4" /> Add Funds
                      </button>
                    </Link>
                  </div>
                )}

                {/* Pay Button */}
                <button onClick={handleConfirmPayment} disabled={!customerWallet.sufficient || processing}
                  className={`w-full py-4 sm:py-5 text-sm sm:text-base font-medium rounded-xl sm:rounded-2xl transition-all flex items-center justify-center gap-2 sm:gap-3 ${customerWallet.sufficient
                    ? "bg-white text-black hover:bg-white/90 shadow-2xl shadow-white/10 cursor-pointer"
                    : "bg-white/5 text-white/30 cursor-not-allowed"}`}>
                  {processing ? <><Loader2 className="w-4 h-4 sm:w-5 sm:h-5 animate-spin" /> Processing...</>
                    : <><Lock className="w-4 h-4" /> Pay {formatCurrency(session?.amount || 0, session?.currency || "USD")}</>}
                </button>
              </div>
            ) : (
              /* No Wallet */
              <div className="space-y-5 sm:space-y-6 lg:space-y-8">
                <div className="rounded-2xl sm:rounded-3xl p-4 sm:p-6 bg-white/5 border border-white/10">
                  <div className="flex items-center gap-3 sm:gap-4">
                    <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-lg sm:rounded-xl bg-white/5 flex items-center justify-center shrink-0">
                      <Wallet className="w-5 h-5 sm:w-6 sm:h-6 text-white/30" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-white/50 text-[10px] sm:text-xs uppercase tracking-wider">{session?.walletType} Wallet</p>
                      <p className="text-white/30 text-base sm:text-lg">No wallet found</p>
                    </div>
                  </div>
                </div>
                <p className="text-white/40 text-xs sm:text-sm text-center">
                  Deposit <span className="text-white">{formatCurrency(session?.amount || 0, session?.currency || "USD")}</span> to continue
                </p>
                <Link href={`/finance/deposit?type=${session?.walletType?.toLowerCase()}&currency=${session?.currency}`} className="block">
                  <button className="w-full py-4 sm:py-5 bg-white text-black text-sm sm:text-base font-medium rounded-xl sm:rounded-2xl hover:bg-white/90 transition-colors flex items-center justify-center gap-2 cursor-pointer">
                    <Wallet className="w-4 h-4" /> Deposit {session?.currency}
                  </button>
                </Link>
              </div>
            )}

            {/* Cancel Button */}
            <button onClick={handleCancel} disabled={processing} className="w-full text-center text-white/30 hover:text-white/60 text-xs sm:text-sm transition-colors py-2 cursor-pointer disabled:cursor-not-allowed">
              Cancel payment
            </button>

            {/* Security Footer */}
            <div className="flex items-center justify-center gap-4 sm:gap-6 text-white/20 text-[10px] sm:text-xs pt-3 sm:pt-4 border-t border-white/5">
              <div className="flex items-center gap-1 sm:gap-1.5"><Shield className="w-3 h-3 sm:w-3.5 sm:h-3.5" /><span>SSL</span></div>
              <div className="flex items-center gap-1 sm:gap-1.5"><Lock className="w-3 h-3 sm:w-3.5 sm:h-3.5" /><span>Encrypted</span></div>
              <div className="flex items-center gap-1 sm:gap-1.5"><ShieldCheck className="w-3 h-3 sm:w-3.5 sm:h-3.5" /><span>Secure</span></div>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
