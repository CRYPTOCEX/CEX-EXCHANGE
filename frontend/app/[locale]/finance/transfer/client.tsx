"use client";

import { useEffect, useCallback, useState } from "react";
import { useTransferStore } from "@/store/finance/transfer-store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Loader } from "@/components/ui/loader";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowRight,
  Wallet,
  Users,
  ArrowLeftRight,
  CheckCircle,
  AlertCircle,
  TrendingUp,
  DollarSign,
  Banknote,
  Coins,
  ChevronRight,
  PartyPopper,
  Copy,
} from "lucide-react";
import { useTranslations } from "next-intl";

const fadeInUp = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -20 },
  transition: { duration: 0.3 },
};

const scaleIn = {
  initial: { opacity: 0, scale: 0.95 },
  animate: { opacity: 1, scale: 1 },
  exit: { opacity: 0, scale: 0.95 },
  transition: { duration: 0.2 },
};

export function TransferForm() {
  const t = useTranslations("finance/transfer/client");
  const {
    transferType,
    setTransferType,
    availableWalletTypes,
    fromWalletType,
    setFromWalletType,
    fromCurrencies,
    fromCurrency,
    setFromCurrency,
    availableToWalletTypes,
    toWalletType,
    setToWalletType,
    toCurrencies,
    toCurrency,
    setToCurrency,
    recipientUuid,
    setRecipientUuid,
    recipientExists,
    recipientValidating,
    amount,
    setAmount,
    availableBalance,
    estimatedReceiveAmount,
    transferFee,
    exchangeRate,
    loading,
    error,
    setError,
    transferSuccess,
    setTransferSuccess,
    fetchWalletTypes,
    fetchFromCurrencies,
    fetchToWalletTypes,
    fetchToCurrencies,
    fetchBalance,
    checkRecipient,
    submitTransfer,
    reset,
  } = useTransferStore();

  // Initialize store
  useEffect(() => {
    fetchWalletTypes();
  }, []);

  // Handle recipient UUID changes with debounce
  useEffect(() => {
    if (!recipientUuid.trim()) return;

    const timeoutId = setTimeout(() => {
      checkRecipient(recipientUuid);
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [recipientUuid]);

  // Handle from wallet type selection
  const handleFromWalletSelect = useCallback(
    async (walletId: string) => {
      setFromWalletType(walletId);
      await fetchFromCurrencies(walletId);
      if (transferType === "wallet") {
        await fetchToWalletTypes(walletId);
      }
    },
    [transferType]
  );

  // Handle from currency selection
  const handleFromCurrencySelect = useCallback(
    async (currency: string) => {
      setFromCurrency(currency);
      if (fromWalletType) {
        await fetchBalance(fromWalletType, currency);
      }
    },
    [fromWalletType]
  );

  // Handle to wallet type selection
  const handleToWalletSelect = useCallback(
    async (walletId: string) => {
      setToWalletType(walletId);
      if (fromWalletType) {
        await fetchToCurrencies(fromWalletType, walletId);
      }
    },
    [fromWalletType]
  );

  // Handle transfer submission
  const handleSubmit = useCallback(async () => {
    try {
      await submitTransfer();
      // Success is handled in the store, no need for toast here
    } catch (error) {
      toast.error("Transfer failed. Please try again.");
    }
  }, [submitTransfer]);

  const getWalletIcon = (walletType: string) => {
    switch (walletType) {
      case "FIAT":
        return <DollarSign className="h-5 w-5" />;
      case "SPOT":
        return <Coins className="h-5 w-5" />;
      case "ECO":
        return <TrendingUp className="h-5 w-5" />;
      case "FUTURES":
        return <Banknote className="h-5 w-5" />;
      default:
        return <Wallet className="h-5 w-5" />;
    }
  };

  const isFormValid = () => {
    // Check for loading states that should prevent submission
    if (loading || recipientValidating) {
      return false;
    }

    // Basic validation for all transfer types
    const basicValid = (
      fromWalletType &&
      fromCurrency &&
      amount > 0 &&
      amount <= availableBalance &&
      !isNaN(amount) &&
      amount !== null &&
      amount !== undefined
    );

    if (!basicValid) {
      return false;
    }

    if (transferType === "wallet") {
      return (
        toWalletType &&
        toCurrency &&
        toWalletType !== fromWalletType // Prevent same wallet type transfers
      );
    } else if (transferType === "client") {
      return (
        recipientUuid &&
        recipientUuid.trim().length > 0 &&
        recipientExists === true && // Explicitly check for true
        !recipientValidating
      );
    }
    return false;
  };

  // Handle copy to clipboard
  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("Copied to clipboard!");
  };

  // Show success screen if transfer was successful
  if (transferSuccess) {
    const {
      fromTransfer,
      toTransfer,
      fromType,
      toType,
      fromCurrency,
      toCurrency,
      message,
    } = transferSuccess;

    return (
      <div className="max-w-2xl mx-auto space-y-8">
        <motion.div {...fadeInUp} className="text-center space-y-4">
          <div className="mx-auto w-16 h-16 bg-green-100 dark:bg-green-900/20 rounded-full flex items-center justify-center">
            <CheckCircle className="h-8 w-8 text-green-600 dark:text-green-400" />
          </div>
          <h1 className="text-3xl font-bold text-zinc-900 dark:text-zinc-100">
            {t("transfer_successful")}
          </h1>
          <p className="text-zinc-600 dark:text-zinc-400">
            {message || "Your transfer has been completed successfully"}
          </p>
        </motion.div>

        <motion.div {...scaleIn}>
          <Card className="border-zinc-200 dark:border-zinc-800">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-zinc-900 dark:text-zinc-100">
                <PartyPopper className="h-5 w-5" />
                {t("transfer_details")}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* From Transfer */}
                <div className="space-y-4">
                  <h3 className="font-semibold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                    <ArrowRight className="h-4 w-4 rotate-180" />
                    {t("From")} {fromType} {t("Wallet")}
                  </h3>
                  <div className="bg-zinc-50 dark:bg-zinc-900/50 rounded-lg p-4 space-y-3">
                    <div className="flex justify-between text-sm">
                      <span className="text-zinc-600 dark:text-zinc-400">
                        {t("amount")}
                      </span>
                      <span className="font-medium">
                        {fromTransfer.amount} {fromCurrency}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-zinc-600 dark:text-zinc-400">
                        {t("status")}
                      </span>
                      <Badge
                        variant={
                          fromTransfer.status === "COMPLETED"
                            ? "default"
                            : "secondary"
                        }
                        className="text-xs"
                      >
                        {fromTransfer.status}
                      </Badge>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-zinc-600 dark:text-zinc-400">
                        {t("transfer_id")}
                      </span>
                      <div className="flex items-center gap-1">
                        <code className="text-xs bg-zinc-100 dark:bg-zinc-800 px-1 rounded">
                          {fromTransfer.id.slice(0, 8)}
                        </code>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => copyToClipboard(fromTransfer.id)}
                          className="h-6 w-6 p-0"
                        >
                          <Copy className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>

                {/* To Transfer */}
                <div className="space-y-4">
                  <h3 className="font-semibold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                    <ArrowRight className="h-4 w-4" />
                    {t("To")} {toType} {t("Wallet")}
                  </h3>
                  <div className="bg-zinc-50 dark:bg-zinc-900/50 rounded-lg p-4 space-y-3">
                    <div className="flex justify-between text-sm">
                      <span className="text-zinc-600 dark:text-zinc-400">
                        {t("amount")}
                      </span>
                      <span className="font-medium text-green-600 dark:text-green-400">
                        {toTransfer.amount} {toCurrency}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-zinc-600 dark:text-zinc-400">
                        {t("status")}
                      </span>
                      <Badge
                        variant={
                          toTransfer.status === "COMPLETED"
                            ? "default"
                            : "secondary"
                        }
                        className="text-xs"
                      >
                        {toTransfer.status}
                      </Badge>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-zinc-600 dark:text-zinc-400">
                        {t("transfer_id")}
                      </span>
                      <div className="flex items-center gap-1">
                        <code className="text-xs bg-zinc-100 dark:bg-zinc-800 px-1 rounded">
                          {toTransfer.id.slice(0, 8)}
                        </code>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => copyToClipboard(toTransfer.id)}
                          className="h-6 w-6 p-0"
                        >
                          <Copy className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Summary */}
              <div className="border-t border-zinc-200 dark:border-zinc-700 pt-4">
                <Alert className="border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-950/20">
                  <CheckCircle className="h-4 w-4 text-green-600 dark:text-green-400" />
                  <AlertDescription className="text-green-700 dark:text-green-300">
                    {t("successfully_transferred")}
                    {fromTransfer.amount} {fromCurrency}
                    {t("from_your")}
                    {fromType}
                    {t("wallet")}
                    {fromCurrency !== toCurrency
                      ? ` and received ${toTransfer.amount} ${toCurrency}`
                      : ""}
                    {t("in_your")}
                    {toType}
                    {t("wallet")}
                  </AlertDescription>
                </Alert>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row gap-3">
                <Button
                  onClick={() => {
                    setTransferSuccess(null);
                    reset();
                  }}
                  className="flex-1"
                >
                  {t("make_another_transfer")}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => (window.location.href = "/finance/wallet")}
                  className="flex-1"
                >
                  {t("view_wallets")}
                </Button>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {/* Header */}
      <div className="text-center space-y-4">
        <h1 className="text-3xl font-bold text-zinc-900 dark:text-zinc-100">
          {t("transfer_funds")}
        </h1>
        <p className="text-zinc-600 dark:text-zinc-400">
          {t("move_funds_between_another_user")}
        </p>
      </div>

      {/* Error Alert */}
      <AnimatePresence>
        {error && (
          <motion.div {...fadeInUp}>
            <Alert className="border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-950/20">
              <AlertCircle className="h-4 w-4 text-red-600 dark:text-red-400" />
              <AlertTitle className="text-red-800 dark:text-red-300">
                Error
              </AlertTitle>
              <AlertDescription className="text-red-700 dark:text-red-400">
                {error}
              </AlertDescription>
            </Alert>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Transfer Type Selection */}
      <motion.div {...fadeInUp}>
        <Card className="border-zinc-200 dark:border-zinc-800">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-zinc-900 dark:text-zinc-100">
              <ArrowLeftRight className="h-5 w-5" />
              {t("choose_transfer_type")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={async () => await setTransferType("wallet")}
                className={`p-6 rounded-xl border-2 transition-all ${
                  transferType === "wallet"
                    ? "border-blue-500 bg-blue-50 dark:bg-blue-950/20"
                    : "border-zinc-200 dark:border-zinc-700 hover:border-blue-400/50"
                }`}
              >
                <div className="flex items-center space-x-4">
                  <div
                    className={`p-3 rounded-full ${
                      transferType === "wallet"
                        ? "bg-blue-500 text-white"
                        : "bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400"
                    }`}
                  >
                    <Wallet className="h-6 w-6" />
                  </div>
                  <div className="text-left">
                    <h3 className="font-semibold text-zinc-900 dark:text-zinc-100">
                      {t("between_wallets")}
                    </h3>
                    <p className="text-sm text-zinc-600 dark:text-zinc-400">
                      {t("move_funds_between_your_different_wallet_types")}
                    </p>
                  </div>
                </div>
              </motion.button>

              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={async () => await setTransferType("client")}
                className={`p-6 rounded-xl border-2 transition-all ${
                  transferType === "client"
                    ? "border-blue-500 bg-blue-50 dark:bg-blue-950/20"
                    : "border-zinc-200 dark:border-zinc-700 hover:border-blue-400/50"
                }`}
              >
                <div className="flex items-center space-x-4">
                  <div
                    className={`p-3 rounded-full ${
                      transferType === "client"
                        ? "bg-blue-500 text-white"
                        : "bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400"
                    }`}
                  >
                    <Users className="h-6 w-6" />
                  </div>
                  <div className="text-left">
                    <h3 className="font-semibold text-zinc-900 dark:text-zinc-100">
                      {t("to_another_user")}
                    </h3>
                    <p className="text-sm text-zinc-600 dark:text-zinc-400">
                      {t("send_funds_to_another_users_account")}
                    </p>
                  </div>
                </div>
              </motion.button>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* From Wallet Selection */}
      <AnimatePresence>
        {transferType && (
          <motion.div {...fadeInUp}>
            <Card className="border-zinc-200 dark:border-zinc-800">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-zinc-900 dark:text-zinc-100">
                  <span className="flex items-center justify-center w-6 h-6 rounded-full bg-blue-500 text-white text-sm font-semibold">
                    1
                  </span>
                  {t("select_source_wallet")}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  {availableWalletTypes.map((wallet) => (
                    <motion.button
                      key={wallet.id}
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => handleFromWalletSelect(wallet.id)}
                      className={`p-4 rounded-xl border-2 transition-all ${
                        fromWalletType === wallet.id
                          ? "border-blue-500 bg-blue-50 dark:bg-blue-950/20"
                          : "border-zinc-200 dark:border-zinc-700 hover:border-blue-400/50"
                      }`}
                    >
                      <div className="flex flex-col items-center space-y-2">
                        <div
                          className={`p-3 rounded-full ${
                            fromWalletType === wallet.id
                              ? "bg-blue-500 text-white"
                              : "bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400"
                          }`}
                        >
                          {getWalletIcon(wallet.id)}
                        </div>
                        <span className="font-medium text-zinc-900 dark:text-zinc-100">
                          {wallet.name}
                        </span>
                      </div>
                    </motion.button>
                  ))}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {/* From Currency Selection */}
      <AnimatePresence>
        {fromWalletType && fromCurrencies.length > 0 && (
          <motion.div {...fadeInUp}>
            <Card className="border-zinc-200 dark:border-zinc-800">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-zinc-900 dark:text-zinc-100">
                  <span className="flex items-center justify-center w-6 h-6 rounded-full bg-blue-500 text-white text-sm font-semibold">
                    2
                  </span>
                  {t("select_currency")}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {fromCurrencies.map((currency) => (
                    <motion.button
                      key={currency.value}
                      whileHover={{ scale: 1.03 }}
                      whileTap={{ scale: 0.97 }}
                      onClick={() => handleFromCurrencySelect(currency.value)}
                      className={`p-4 rounded-xl border-2 transition-all ${
                        fromCurrency === currency.value
                          ? "border-blue-500 bg-blue-50 dark:bg-blue-950/20"
                          : "border-zinc-200 dark:border-zinc-700 hover:border-blue-400/50"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <div
                            className={`w-8 h-8 rounded-full flex items-center justify-center ${
                              fromCurrency === currency.value
                                ? "bg-blue-500 text-white"
                                : "bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400"
                            }`}
                          >
                            <span className="text-xs font-bold">
                              {currency.value.slice(0, 2)}
                            </span>
                          </div>
                          <div className="text-left">
                            <div className="font-semibold text-zinc-900 dark:text-zinc-100">
                              {currency.value}
                            </div>
                            <div className="text-sm text-zinc-600 dark:text-zinc-400">
                              {currency.label.split("-")[1] || currency.label}
                            </div>
                          </div>
                        </div>
                        {fromCurrency === currency.value && (
                          <CheckCircle className="h-5 w-5 text-blue-500" />
                        )}
                      </div>
                    </motion.button>
                  ))}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Recipient UUID (for client transfers) */}
      <AnimatePresence>
        {transferType === "client" && fromCurrency && (
          <motion.div {...fadeInUp}>
            <Card className="border-zinc-200 dark:border-zinc-800">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-zinc-900 dark:text-zinc-100">
                  <span className="flex items-center justify-center w-6 h-6 rounded-full bg-blue-500 text-white text-sm font-semibold">
                    3
                  </span>
                  {t("recipient_details")}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="relative">
                  <Input
                    placeholder="Enter recipient UUID"
                    value={recipientUuid}
                    onChange={(e) => setRecipientUuid(e.target.value)}
                    className={`pr-10 ${
                      recipientExists === true
                        ? "border-green-500 focus:border-green-500"
                        : recipientExists === false
                          ? "border-red-500 focus:border-red-500"
                          : ""
                    }`}
                  />
                  <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                    {recipientValidating && <Loader size="sm" />}
                    {recipientExists === true && (
                      <CheckCircle className="h-5 w-5 text-green-500" />
                    )}
                    {recipientExists === false && !recipientValidating && (
                      <AlertCircle className="h-5 w-5 text-red-500" />
                    )}
                  </div>
                </div>
                {recipientExists === true && (
                  <p className="text-sm text-green-600 dark:text-green-400">
                    {t("✓_recipient_found_and_verified")}
                  </p>
                )}
                {recipientExists === false && (
                  <p className="text-sm text-red-600 dark:text-red-400">
                    {t("✗_recipient_not_found")}
                  </p>
                )}
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {/* To Wallet Selection (for wallet transfers) */}
      <AnimatePresence>
        {transferType === "wallet" &&
          fromCurrency &&
          availableToWalletTypes.length > 0 && (
            <motion.div {...fadeInUp}>
              <Card className="border-zinc-200 dark:border-zinc-800">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-zinc-900 dark:text-zinc-100">
                    <span className="flex items-center justify-center w-6 h-6 rounded-full bg-blue-500 text-white text-sm font-semibold">
                      3
                    </span>
                    {t("select_destination_wallet")}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    {availableToWalletTypes.map((wallet) => (
                      <motion.button
                        key={wallet.id}
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => handleToWalletSelect(wallet.id)}
                        className={`p-4 rounded-xl border-2 transition-all ${
                          toWalletType === wallet.id
                            ? "border-blue-500 bg-blue-50 dark:bg-blue-950/20"
                            : "border-zinc-200 dark:border-zinc-700 hover:border-blue-400/50"
                        }`}
                      >
                        <div className="flex flex-col items-center space-y-2">
                          <div
                            className={`p-3 rounded-full ${
                              toWalletType === wallet.id
                                ? "bg-blue-500 text-white"
                                : "bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400"
                            }`}
                          >
                            {getWalletIcon(wallet.id)}
                          </div>
                          <span className="font-medium text-zinc-900 dark:text-zinc-100">
                            {wallet.name}
                          </span>
                        </div>
                      </motion.button>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}
      </AnimatePresence>

      {/* To Currency Selection (for wallet transfers) */}
      <AnimatePresence>
        {transferType === "wallet" &&
          toWalletType &&
          toCurrencies.length > 0 && (
            <motion.div {...fadeInUp}>
              <Card className="border-zinc-200 dark:border-zinc-800">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-zinc-900 dark:text-zinc-100">
                    <span className="flex items-center justify-center w-6 h-6 rounded-full bg-blue-500 text-white text-sm font-semibold">
                      4
                    </span>
                    {t("select_target_currency")}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {toCurrencies.map((currency) => (
                      <motion.button
                        key={currency.value}
                        whileHover={{ scale: 1.03 }}
                        whileTap={{ scale: 0.97 }}
                        onClick={() => setToCurrency(currency.value)}
                        className={`p-4 rounded-xl border-2 transition-all ${
                          toCurrency === currency.value
                            ? "border-blue-500 bg-blue-50 dark:bg-blue-950/20"
                            : "border-zinc-200 dark:border-zinc-700 hover:border-blue-400/50"
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-3">
                            <div
                              className={`w-8 h-8 rounded-full flex items-center justify-center ${
                                toCurrency === currency.value
                                  ? "bg-blue-500 text-white"
                                  : "bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400"
                              }`}
                            >
                              <span className="text-xs font-bold">
                                {currency.value.slice(0, 2)}
                              </span>
                            </div>
                            <div className="text-left">
                              <div className="font-semibold text-zinc-900 dark:text-zinc-100">
                                {currency.value}
                              </div>
                              <div className="text-sm text-zinc-600 dark:text-zinc-400">
                                {currency.label.split("-")[1] ||
                                  currency.label}
                              </div>
                            </div>
                          </div>
                          {toCurrency === currency.value && (
                            <CheckCircle className="h-5 w-5 text-blue-500" />
                          )}
                        </div>
                      </motion.button>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}
      </AnimatePresence>

      {/* Amount and Transfer Details */}
      <AnimatePresence>
        {((transferType === "wallet" && toCurrency) ||
          (transferType === "client" && recipientExists)) && (
          <motion.div {...fadeInUp}>
            <Card className="border-zinc-200 dark:border-zinc-800">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-zinc-900 dark:text-zinc-100">
                  <span className="flex items-center justify-center w-6 h-6 rounded-full bg-blue-500 text-white text-sm font-semibold">
                    {transferType === "wallet" ? "5" : "4"}
                  </span>
                  {t("transfer_details")}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Amount Input */}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                    {t("Amount")}
                  </label>
                  <div className="relative">
                    <Input
                      type="number"
                      placeholder="0.00"
                      value={amount || ""}
                      onChange={(e) => {
                        const value = e.target.value;
                        // Validate decimal precision and prevent invalid input
                        if (value === "" || value === "0") {
                          setAmount(0);
                          return;
                        }
                        
                        const numValue = parseFloat(value);
                        if (isNaN(numValue) || numValue < 0) {
                          return; // Don't update for invalid values
                        }
                        
                        // Check decimal places (max 8 for crypto, 2 for fiat)
                        const decimalPlaces = (value.split('.')[1] || '').length;
                        const maxDecimals = fromWalletType === 'FIAT' ? 2 : 8;
                        
                        if (decimalPlaces <= maxDecimals) {
                          setAmount(numValue);
                        }
                      }}
                      min="0"
                      step={fromWalletType === 'FIAT' ? "0.01" : "0.00000001"}
                      className="text-lg pr-16"
                    />
                    <div className="absolute right-3 top-1/2 transform -translate-y-1/2 text-sm font-medium text-zinc-500 dark:text-zinc-400">
                      {fromCurrency}
                    </div>
                  </div>
                  {availableBalance > 0 && (
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-zinc-600 dark:text-zinc-400">
                        {t("available")}
                        {availableBalance} {fromCurrency}
                      </span>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setAmount(availableBalance)}
                        className="h-auto p-1 text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300"
                      >
                        {t("Max")}
                      </Button>
                    </div>
                  )}
                </div>

                {/* Transfer Summary */}
                {amount > 0 && (
                  <motion.div {...scaleIn} className="space-y-4">
                    <div className="p-4 bg-zinc-50 dark:bg-zinc-900/50 rounded-lg space-y-3">
                      <h4 className="font-semibold text-zinc-900 dark:text-zinc-100">
                        {t("transfer_summary")}
                      </h4>

                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-zinc-600 dark:text-zinc-400">
                            {t("amount")}
                          </span>
                          <span className="font-medium">
                            {amount} {fromCurrency}
                          </span>
                        </div>

                        {transferFee > 0 && (
                          <div className="flex justify-between">
                            <span className="text-zinc-600 dark:text-zinc-400">
                              {t("transfer_fee")}
                            </span>
                            <span className="font-medium">
                              {transferFee.toFixed(8)} {fromCurrency}
                            </span>
                          </div>
                        )}

                        <div className="flex justify-between border-t border-zinc-200 dark:border-zinc-700 pt-2">
                          <span className="text-zinc-900 dark:text-zinc-100 font-semibold">
                            {t("recipient_receives")}
                          </span>
                          <span className="font-semibold text-green-600 dark:text-green-400">
                            {estimatedReceiveAmount.toFixed(8)}{" "}
                            {transferType === "wallet"
                              ? toCurrency
                              : fromCurrency}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Transfer Description */}
                    <Alert className="border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-950/20">
                      <ArrowLeftRight className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                      <AlertDescription className="text-blue-700 dark:text-blue-300">
                        {transferType === "wallet" ? (
                          <>
                            {t("Transfer")}
                            {amount} {fromCurrency}
                            {t("from_your")}{" "}
                            <Badge variant="secondary" className="mx-1">
                              {
                                availableWalletTypes.find(
                                  (w) => w.id === fromWalletType
                                )?.name
                              }
                            </Badge>
                            {t("wallet_to_your")}{" "}
                            <Badge variant="secondary" className="mx-1">
                              {
                                availableToWalletTypes.find(
                                  (w) => w.id === toWalletType
                                )?.name
                              }
                            </Badge>
                            {t("wallet")}
                          </>
                        ) : (
                          <>
                            {t("Send")}
                            {amount} {fromCurrency}
                            {t("from_your")}{" "}
                            <Badge variant="secondary" className="mx-1">
                              {
                                availableWalletTypes.find(
                                  (w) => w.id === fromWalletType
                                )?.name
                              }
                            </Badge>
                            {t("wallet_to_user")}{" "}
                            <Badge variant="secondary" className="mx-1">
                              {recipientUuid}
                            </Badge>
                          </>
                        )}
                      </AlertDescription>
                    </Alert>
                  </motion.div>
                )}

                {/* Submit Button */}
                <Button
                  onClick={handleSubmit}
                  disabled={!isFormValid() || loading}
                  className="w-full h-12 text-lg font-semibold"
                  size="lg"
                >
                  {loading ? (
                    <>
                      <Loader size="sm" className="mr-2" />
                      {t("processing_transfer")}
                    </>
                  ) : (
                    <>
                      {t("complete_transfer")}
                      <ChevronRight className="ml-2 h-5 w-5" />
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Reset Button */}
      {transferType && (
        <div className="flex justify-center">
          <Button
            variant="ghost"
            onClick={reset}
            className="text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100"
          >
            {t("start_over")}
          </Button>
        </div>
      )}
    </div>
  );
}
