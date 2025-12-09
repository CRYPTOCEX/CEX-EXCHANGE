"use client";

import { Link } from "@/i18n/routing";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import {
  CheckCircle, XCircle, Clock, Wallet, ShieldCheck, AlertTriangle, Loader2,
  Lock, CreditCard, User, ArrowRight, Sparkles, RefreshCw, ArrowLeft, Store, Zap,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import type { CheckoutDesignProps } from "./types";
import { WalletSelector } from "./WalletSelector";

export default function DesignV1({ state, actions, paymentIntentId }: CheckoutDesignProps) {
  const { session, customerWallet, walletLoading, loading, error, processing, success, redirectUrl, timeLeft, isAuthenticated, multiWallet } = state;
  const { handleConfirmPayment, handleCancel, formatTime, formatCurrency, addWalletAllocation, removeWalletAllocation, updateWalletAllocation, autoAllocateWallets, clearAllocations } = actions;

  // Check if payment is ready (either single wallet sufficient OR multi-wallet fully allocated)
  const isPaymentReady = customerWallet?.sufficient || (multiWallet && multiWallet.remainingAmount <= 0.01);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20 flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <div className="bg-card border border-border/50 rounded-2xl shadow-2xl overflow-hidden">
            <div className="p-6 sm:p-8 space-y-6">
              <div className="flex items-center justify-center">
                <div className="relative">
                  <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-primary/10 animate-pulse" />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <Loader2 className="w-7 h-7 sm:w-8 sm:h-8 text-primary animate-spin" />
                  </div>
                </div>
              </div>
              <div className="space-y-3">
                <Skeleton className="h-5 sm:h-6 w-3/4 mx-auto" />
                <Skeleton className="h-4 w-1/2 mx-auto" />
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error && !session) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20 flex items-center justify-center p-4">
        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="w-full max-w-md">
          <div className="bg-card border border-border/50 rounded-2xl shadow-2xl overflow-hidden">
            <div className="p-6 sm:p-8 text-center space-y-5 sm:space-y-6">
              <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-destructive/10 flex items-center justify-center mx-auto">
                <XCircle className="w-8 h-8 sm:w-10 sm:h-10 text-destructive" />
              </div>
              <div>
                <h2 className="text-xl sm:text-2xl font-bold text-foreground">Payment Error</h2>
                <p className="text-sm sm:text-base text-muted-foreground mt-2">{error}</p>
              </div>
              <Button variant="outline" onClick={handleCancel} className="w-full h-11 sm:h-12 rounded-xl cursor-pointer">
                <ArrowLeft className="w-4 h-4 mr-2" /> Go Back
              </Button>
            </div>
          </div>
        </motion.div>
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20 flex items-center justify-center p-4">
        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="w-full max-w-md">
          <div className="bg-card border border-border/50 rounded-2xl shadow-2xl overflow-hidden">
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-r from-green-500/20 via-emerald-500/20 to-teal-500/20" />
              <div className="relative p-6 sm:p-8 text-center space-y-5 sm:space-y-6">
                <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring", delay: 0.2 }}
                  className="w-20 h-20 sm:w-24 sm:h-24 rounded-full bg-green-500/20 flex items-center justify-center mx-auto ring-4 ring-green-500/30">
                  <CheckCircle className="w-10 h-10 sm:w-12 sm:h-12 text-green-500" />
                </motion.div>
                <div>
                  <h2 className="text-xl sm:text-2xl font-bold text-foreground">Payment Successful!</h2>
                  <p className="text-sm sm:text-base text-muted-foreground mt-2">
                    {formatCurrency(session?.amount || 0, session?.currency || "USD")} paid to {session?.merchant.name}
                  </p>
                </div>
                <div className="flex items-center justify-center gap-2 text-xs sm:text-sm text-muted-foreground">
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Redirecting you back to the merchant...</span>
                </div>
                {redirectUrl && (
                  <a href={redirectUrl} className="block cursor-pointer">
                    <Button className="w-full h-11 sm:h-12 rounded-xl bg-green-600 hover:bg-green-700 cursor-pointer text-sm sm:text-base">
                      Continue to {session?.merchant.name} <ArrowRight className="w-4 h-4 ml-2" />
                    </Button>
                  </a>
                )}
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20">
      <AnimatePresence>
        {session?.testMode && (
          <motion.div initial={{ opacity: 0, y: -50 }} animate={{ opacity: 1, y: 0 }}
            className="bg-gradient-to-r from-amber-500/90 to-orange-500/90 text-white py-2 px-4">
            <div className="max-w-7xl mx-auto flex items-center justify-center gap-2 text-xs sm:text-sm font-medium">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span className="truncate">Test Mode - No real money will be charged</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex items-center justify-center min-h-[calc(100vh-40px)] p-3 sm:p-4 md:p-8">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-5xl">
          <div className="grid lg:grid-cols-5 gap-4 sm:gap-6">
            {/* Left Panel - Order Summary */}
            <div className="lg:col-span-2 order-2 lg:order-1">
              <div className="bg-card/50 backdrop-blur-sm border border-border/50 rounded-xl sm:rounded-2xl p-4 sm:p-6 space-y-4 sm:space-y-6 lg:sticky lg:top-8">
                {/* Merchant Info */}
                <div className="flex items-center gap-3 sm:gap-4">
                  {session?.merchant.logo ? (
                    <img src={session.merchant.logo} alt={session.merchant.name} className="w-11 h-11 sm:w-14 sm:h-14 rounded-lg sm:rounded-xl object-cover ring-2 ring-border/50" />
                  ) : (
                    <div className="w-11 h-11 sm:w-14 sm:h-14 rounded-lg sm:rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center ring-2 ring-primary/20">
                      <span className="text-xl sm:text-2xl font-bold text-primary">{session?.merchant.name.charAt(0)}</span>
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <h3 className="font-semibold text-base sm:text-lg truncate">{session?.merchant.name}</h3>
                    {session?.merchant.website && <p className="text-xs sm:text-sm text-muted-foreground truncate">{new URL(session.merchant.website).hostname}</p>}
                  </div>
                </div>

                <div className="h-px bg-gradient-to-r from-transparent via-border to-transparent" />

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
                          <p className="text-xs text-muted-foreground">Qty: {item.quantity}</p>
                        </div>
                        <span className="text-sm font-medium shrink-0">{formatCurrency(item.unitPrice * item.quantity, session.currency)}</span>
                      </div>
                    ))}
                  </div>
                )}

                <div className="h-px bg-gradient-to-r from-transparent via-border to-transparent" />

                {/* Total */}
                <div className="space-y-3 sm:space-y-4">
                  <div className="flex justify-between items-end">
                    <span className="text-sm text-muted-foreground">Total</span>
                    <span className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
                      {formatCurrency(session?.amount || 0, session?.currency || "USD")}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-full bg-primary/10 text-primary text-xs font-medium flex items-center gap-1.5">
                      <Wallet className="w-3 h-3" /> {session?.walletType} Wallet
                    </div>
                  </div>
                </div>

                {/* Timer */}
                {timeLeft > 0 && (
                  <div className="bg-muted/50 rounded-lg sm:rounded-xl p-3 sm:p-4">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2 text-xs sm:text-sm">
                        <Clock className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-muted-foreground" />
                        <span className="text-muted-foreground">Expires in</span>
                      </div>
                      <span className="font-mono font-bold text-base sm:text-lg">{formatTime(timeLeft)}</span>
                    </div>
                    <Progress value={(timeLeft / 1800) * 100} className="h-1 sm:h-1.5" />
                  </div>
                )}
              </div>
            </div>

            {/* Right Panel - Payment Form */}
            <div className="lg:col-span-3 order-1 lg:order-2">
              <div className="bg-card border border-border/50 rounded-xl sm:rounded-2xl shadow-2xl overflow-hidden">
                {/* Header */}
                <div className="bg-gradient-to-r from-muted/50 to-muted/30 px-4 sm:px-6 py-4 sm:py-5 border-b border-border/50">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                      <CreditCard className="w-4 h-4 sm:w-5 sm:h-5 text-primary" />
                    </div>
                    <div className="min-w-0">
                      <h2 className="text-lg sm:text-xl font-semibold truncate">Complete Payment</h2>
                      <p className="text-xs sm:text-sm text-muted-foreground truncate">Secure checkout powered by your platform</p>
                    </div>
                  </div>
                </div>

                <div className="p-4 sm:p-6 space-y-4 sm:space-y-6">
                  {/* Error Message */}
                  <AnimatePresence>
                    {error && (
                      <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}
                        className="bg-destructive/10 border border-destructive/20 rounded-lg sm:rounded-xl p-3 sm:p-4 flex items-start gap-2 sm:gap-3">
                        <XCircle className="w-4 h-4 sm:w-5 sm:h-5 text-destructive shrink-0 mt-0.5" />
                        <p className="text-xs sm:text-sm text-destructive">{error}</p>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* Not Authenticated */}
                  {!isAuthenticated ? (
                    <div className="space-y-4 sm:space-y-6">
                      <div className="text-center space-y-2 py-2 sm:py-4">
                        <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-3 sm:mb-4">
                          <User className="w-7 h-7 sm:w-8 sm:h-8 text-primary" />
                        </div>
                        <h3 className="text-base sm:text-lg font-semibold">Sign in to continue</h3>
                        <p className="text-muted-foreground text-xs sm:text-sm">Please log in to your account to complete this payment</p>
                      </div>
                      <Link href={`/login?redirect=/gateway/checkout/${paymentIntentId}`} className="block cursor-pointer">
                        <Button className="w-full h-12 sm:h-14 rounded-xl text-sm sm:text-base font-semibold bg-gradient-to-r from-primary to-primary/90 hover:from-primary/90 hover:to-primary shadow-lg shadow-primary/25 cursor-pointer">
                          <User className="w-4 h-4 sm:w-5 sm:h-5 mr-2" /> Sign In to Pay
                        </Button>
                      </Link>
                      <div className="relative">
                        <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-border/50" /></div>
                        <div className="relative flex justify-center text-xs uppercase"><span className="bg-card px-2 text-muted-foreground">or</span></div>
                      </div>
                      <Link href={`/register?redirect=/gateway/checkout/${paymentIntentId}`} className="block cursor-pointer">
                        <Button variant="outline" className="w-full h-11 sm:h-12 rounded-xl cursor-pointer text-sm"><Sparkles className="w-4 h-4 mr-2" /> Create an Account</Button>
                      </Link>
                    </div>
                  ) : walletLoading ? (
                    /* Wallet Loading Skeleton */
                    <div className="space-y-4 py-2 sm:py-4">
                      <div className="flex items-center gap-3 sm:gap-4">
                        <Skeleton className="w-11 h-11 sm:w-14 sm:h-14 rounded-lg sm:rounded-xl" />
                        <div className="flex-1 space-y-2"><Skeleton className="h-4 sm:h-5 w-24 sm:w-32" /><Skeleton className="h-4 w-16 sm:w-24" /></div>
                      </div>
                      <Skeleton className="h-12 sm:h-14 w-full rounded-xl" />
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
                          <Button variant="outline" className="w-full h-11 sm:h-12 rounded-xl border-primary/50 text-primary hover:bg-primary/5 cursor-pointer text-sm">
                            <Zap className="w-4 h-4 mr-2" /> Add Funds
                          </Button>
                        </Link>
                      )}

                      {/* Pay Button */}
                      <Button onClick={handleConfirmPayment} disabled={!isPaymentReady || processing}
                        className={`w-full h-12 sm:h-14 rounded-xl text-sm sm:text-base font-semibold transition-all duration-300 ${isPaymentReady
                          ? "bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500 shadow-lg shadow-green-500/25 cursor-pointer"
                          : "opacity-50 cursor-not-allowed"}`}>
                        {processing ? <><Loader2 className="w-4 h-4 sm:w-5 sm:h-5 mr-2 animate-spin" /> Processing...</>
                          : <><Lock className="w-4 h-4 sm:w-5 sm:h-5 mr-2" /> Pay {formatCurrency(session?.amount || 0, session?.currency || "USD")}</>}
                      </Button>
                    </div>
                  ) : customerWallet ? (
                    /* Single Wallet (fallback) */
                    <div className="space-y-4 sm:space-y-6">
                      {/* Wallet Balance Card */}
                      <div className={`relative overflow-hidden rounded-xl sm:rounded-2xl p-4 sm:p-5 ${customerWallet.sufficient
                        ? "bg-gradient-to-br from-emerald-500/10 via-green-500/5 to-teal-500/10 border border-green-500/20"
                        : "bg-gradient-to-br from-red-500/10 via-orange-500/5 to-amber-500/10 border border-red-500/20"}`}>
                        <div className="absolute top-0 right-0 w-24 h-24 sm:w-32 sm:h-32 bg-gradient-to-br from-white/5 to-transparent rounded-full -translate-y-1/2 translate-x-1/2" />
                        <div className="flex items-start justify-between relative">
                          <div className="flex items-center gap-3 sm:gap-4">
                            <div className={`w-10 h-10 sm:w-12 sm:h-12 rounded-lg sm:rounded-xl flex items-center justify-center shrink-0 ${customerWallet.sufficient ? "bg-green-500/20" : "bg-red-500/20"}`}>
                              <Wallet className={`w-5 h-5 sm:w-6 sm:h-6 ${customerWallet.sufficient ? "text-green-500" : "text-red-500"}`} />
                            </div>
                            <div className="min-w-0">
                              <p className="font-medium text-xs sm:text-sm text-muted-foreground">{customerWallet.type} Wallet</p>
                              <p className="text-xl sm:text-2xl font-bold">{formatCurrency(customerWallet.balance, customerWallet.currency)}</p>
                            </div>
                          </div>
                          <div className={`w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center shrink-0 ${customerWallet.sufficient ? "bg-green-500/20 text-green-500" : "bg-red-500/20 text-red-500"}`}>
                            {customerWallet.sufficient ? <CheckCircle className="w-4 h-4 sm:w-5 sm:h-5" /> : <XCircle className="w-4 h-4 sm:w-5 sm:h-5" />}
                          </div>
                        </div>
                      </div>

                      {/* Insufficient Balance Warning */}
                      {!customerWallet.sufficient && (
                        <div className="space-y-3 sm:space-y-4">
                          <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg sm:rounded-xl p-3 sm:p-4">
                            <div className="flex items-start gap-2 sm:gap-3">
                              <AlertTriangle className="w-4 h-4 sm:w-5 sm:h-5 text-amber-500 shrink-0 mt-0.5" />
                              <div>
                                <p className="font-medium text-sm text-amber-600 dark:text-amber-400">Insufficient Balance</p>
                                <p className="text-xs sm:text-sm text-muted-foreground mt-1">
                                  You need {formatCurrency(session!.amount - customerWallet.balance, session!.currency)} more to complete this payment.
                                </p>
                              </div>
                            </div>
                          </div>
                          <Link href={`/finance/deposit?type=${session?.walletType?.toLowerCase()}&currency=${session?.currency}`} className="block cursor-pointer">
                            <Button variant="outline" className="w-full h-11 sm:h-12 rounded-xl border-primary/50 text-primary hover:bg-primary/5 cursor-pointer text-sm">
                              <Wallet className="w-4 h-4 mr-2" /> Deposit {session?.currency}
                            </Button>
                          </Link>
                        </div>
                      )}

                      {/* Pay Button */}
                      <Button onClick={handleConfirmPayment} disabled={!customerWallet.sufficient || processing}
                        className={`w-full h-12 sm:h-14 rounded-xl text-sm sm:text-base font-semibold transition-all duration-300 ${customerWallet.sufficient
                          ? "bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500 shadow-lg shadow-green-500/25 cursor-pointer"
                          : "opacity-50 cursor-not-allowed"}`}>
                        {processing ? <><Loader2 className="w-4 h-4 sm:w-5 sm:h-5 mr-2 animate-spin" /> Processing...</>
                          : <><Lock className="w-4 h-4 sm:w-5 sm:h-5 mr-2" /> Pay {formatCurrency(session?.amount || 0, session?.currency || "USD")}</>}
                      </Button>
                    </div>
                  ) : (
                    /* No Wallet */
                    <div className="space-y-4 sm:space-y-6">
                      <div className="relative overflow-hidden rounded-xl sm:rounded-2xl p-4 sm:p-5 bg-gradient-to-br from-slate-500/10 via-gray-500/5 to-zinc-500/10 border border-border/50">
                        <div className="flex items-start justify-between relative">
                          <div className="flex items-center gap-3 sm:gap-4">
                            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-lg sm:rounded-xl bg-muted/50 flex items-center justify-center shrink-0">
                              <Wallet className="w-5 h-5 sm:w-6 sm:h-6 text-muted-foreground" />
                            </div>
                            <div className="min-w-0">
                              <p className="font-medium text-xs sm:text-sm text-muted-foreground">{session?.walletType} Wallet</p>
                              <p className="text-xl sm:text-2xl font-bold text-muted-foreground">{formatCurrency(0, session?.currency || "USD")}</p>
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
                            <p className="font-medium text-sm text-amber-600 dark:text-amber-400">No Wallet Found</p>
                            <p className="text-xs sm:text-sm text-muted-foreground mt-1">
                              You need to deposit {formatCurrency(session?.amount || 0, session?.currency || "USD")} to complete this payment.
                            </p>
                          </div>
                        </div>
                      </div>
                      <Link href={`/finance/deposit?type=${session?.walletType?.toLowerCase()}&currency=${session?.currency}`} className="block cursor-pointer">
                        <Button className="w-full h-12 sm:h-14 rounded-xl text-sm sm:text-base font-semibold bg-gradient-to-r from-primary to-primary/90 hover:from-primary/90 hover:to-primary shadow-lg shadow-primary/25 cursor-pointer">
                          <Wallet className="w-4 h-4 sm:w-5 sm:h-5 mr-2" /> Deposit {session?.currency}
                        </Button>
                      </Link>
                    </div>
                  )}

                  {/* Cancel Button */}
                  <button onClick={handleCancel} disabled={processing} className="w-full text-center text-xs sm:text-sm text-muted-foreground hover:text-foreground transition-colors py-2 cursor-pointer disabled:cursor-not-allowed">
                    Cancel and return to store
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
        </motion.div>
      </div>
    </div>
  );
}
