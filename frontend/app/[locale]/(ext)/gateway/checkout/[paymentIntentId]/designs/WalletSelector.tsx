"use client";

import { useState } from "react";
import { Wallet, Plus, X, Check, AlertTriangle, RefreshCw, ChevronDown, ChevronUp } from "lucide-react";
import type { WalletOption, PaymentAllocation, MultiWalletState, CheckoutSession } from "./types";

interface WalletSelectorProps {
  multiWallet: MultiWalletState | null;
  // Support both explicit amount/currency and session object
  paymentAmount?: number;
  paymentCurrency?: string;
  session?: CheckoutSession;
  // Support both naming conventions for callbacks
  onAddWallet?: (wallet: WalletOption, amount?: number) => void;
  addWalletAllocation?: (wallet: WalletOption, amount?: number) => void;
  onRemoveWallet?: (walletId: string) => void;
  removeWalletAllocation?: (walletId: string) => void;
  onUpdateAmount?: (walletId: string, amount: number) => void;
  updateWalletAllocation?: (walletId: string, amount: number) => void;
  onAutoAllocate?: () => void;
  autoAllocateWallets?: () => void;
  onClear?: () => void;
  clearAllocations?: () => void;
  formatCurrency: (amount: number, currency: string) => string;
  disabled?: boolean;
  theme?: "light" | "dark" | "glass";
}

export function WalletSelector({
  multiWallet,
  paymentAmount: explicitAmount,
  paymentCurrency: explicitCurrency,
  session,
  onAddWallet,
  addWalletAllocation,
  onRemoveWallet,
  removeWalletAllocation,
  onUpdateAmount,
  updateWalletAllocation,
  onAutoAllocate,
  autoAllocateWallets,
  onClear,
  clearAllocations,
  formatCurrency,
  disabled = false,
  theme = "dark",
}: WalletSelectorProps) {
  const [expanded, setExpanded] = useState(false);

  // Support both explicit amount/currency and session-based values
  const paymentAmount = explicitAmount ?? session?.amount ?? 0;
  const paymentCurrency = explicitCurrency ?? session?.currency ?? "USD";

  // Support both naming conventions for callbacks
  const handleAddWallet = onAddWallet ?? addWalletAllocation ?? (() => {});
  const handleRemoveWallet = onRemoveWallet ?? removeWalletAllocation ?? (() => {});
  const handleUpdateAmount = onUpdateAmount ?? updateWalletAllocation ?? (() => {});
  const handleAutoAllocate = onAutoAllocate ?? autoAllocateWallets ?? (() => {});
  const handleClear = onClear ?? clearAllocations ?? (() => {});

  if (!multiWallet || multiWallet.availableWallets.length === 0) {
    return null;
  }

  const hasAllocations = multiWallet.selectedAllocations.length > 0;
  const isFullyAllocated = multiWallet.remainingAmount <= 0.01;
  const allocatedWalletIds = new Set(multiWallet.selectedAllocations.map(a => a.walletId));
  const unallocatedWallets = multiWallet.availableWallets.filter(w => !allocatedWalletIds.has(w.id));

  // Theme styles
  const themeStyles = {
    light: {
      container: "bg-white border border-gray-200 rounded-xl",
      header: "text-gray-800",
      subtext: "text-gray-500",
      card: "bg-gray-50 border border-gray-200",
      cardHover: "hover:bg-gray-100",
      button: "bg-blue-600 text-white hover:bg-blue-700",
      buttonSecondary: "bg-gray-200 text-gray-700 hover:bg-gray-300",
      badge: "bg-green-100 text-green-800",
      badgeWarning: "bg-yellow-100 text-yellow-800",
      divider: "border-gray-200",
    },
    dark: {
      container: "bg-zinc-900/50 border border-zinc-700 rounded-xl",
      header: "text-white",
      subtext: "text-zinc-400",
      card: "bg-zinc-800/50 border border-zinc-700",
      cardHover: "hover:bg-zinc-800",
      button: "bg-blue-600 text-white hover:bg-blue-700",
      buttonSecondary: "bg-zinc-700 text-zinc-200 hover:bg-zinc-600",
      badge: "bg-green-900/50 text-green-400 border border-green-800",
      badgeWarning: "bg-yellow-900/50 text-yellow-400 border border-yellow-800",
      divider: "border-zinc-700",
    },
    glass: {
      container: "bg-white/10 backdrop-blur-md border border-white/20 rounded-xl",
      header: "text-white",
      subtext: "text-white/60",
      card: "bg-white/5 border border-white/10",
      cardHover: "hover:bg-white/10",
      button: "bg-white/20 text-white hover:bg-white/30",
      buttonSecondary: "bg-white/10 text-white/80 hover:bg-white/20",
      badge: "bg-green-500/20 text-green-400 border border-green-500/30",
      badgeWarning: "bg-yellow-500/20 text-yellow-400 border border-yellow-500/30",
      divider: "border-white/10",
    },
  };

  const styles = themeStyles[theme];

  return (
    <div className={`${styles.container} p-4`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Wallet className={`w-5 h-5 ${styles.subtext}`} />
          <h3 className={`font-semibold ${styles.header}`}>Payment Sources</h3>
        </div>
        <div className="flex items-center gap-2">
          {hasAllocations && (
            <button
              onClick={handleClear}
              disabled={disabled}
              className={`px-2 py-1 text-xs rounded-lg transition-colors ${styles.buttonSecondary} disabled:opacity-50`}
            >
              Clear
            </button>
          )}
          {!isFullyAllocated && multiWallet.canPayFull && (
            <button
              onClick={handleAutoAllocate}
              disabled={disabled}
              className={`px-2 py-1 text-xs rounded-lg transition-colors flex items-center gap-1 ${styles.button} disabled:opacity-50`}
            >
              <RefreshCw className="w-3 h-3" />
              Auto
            </button>
          )}
        </div>
      </div>

      {/* Payment Progress */}
      <div className="mb-4">
        <div className="flex justify-between text-sm mb-1">
          <span className={styles.subtext}>Payment Progress</span>
          <span className={styles.header}>
            {formatCurrency(paymentAmount - multiWallet.remainingAmount, paymentCurrency)} / {formatCurrency(paymentAmount, paymentCurrency)}
          </span>
        </div>
        <div className={`h-2 rounded-full overflow-hidden ${theme === "light" ? "bg-gray-200" : "bg-zinc-700"}`}>
          <div
            className={`h-full transition-all duration-300 ${isFullyAllocated ? "bg-green-500" : "bg-blue-500"}`}
            style={{ width: `${Math.min(100, ((paymentAmount - multiWallet.remainingAmount) / paymentAmount) * 100)}%` }}
          />
        </div>
        {!isFullyAllocated && (
          <div className="flex items-center gap-1 mt-1">
            <AlertTriangle className="w-3 h-3 text-yellow-500" />
            <span className="text-xs text-yellow-500">
              Remaining: {formatCurrency(multiWallet.remainingAmount, paymentCurrency)}
            </span>
          </div>
        )}
        {isFullyAllocated && (
          <div className="flex items-center gap-1 mt-1">
            <Check className="w-3 h-3 text-green-500" />
            <span className="text-xs text-green-500">Payment fully allocated</span>
          </div>
        )}
      </div>

      {/* Selected Allocations */}
      {hasAllocations && (
        <div className="space-y-2 mb-4">
          <div className={`text-xs ${styles.subtext} uppercase tracking-wide`}>Selected Wallets</div>
          {multiWallet.selectedAllocations.map((allocation) => {
            const wallet = multiWallet.availableWallets.find(w => w.id === allocation.walletId);
            if (!wallet) return null;

            return (
              <div key={allocation.walletId} className={`${styles.card} rounded-lg p-3`}>
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className={`font-medium ${styles.header}`}>{allocation.currency}</span>
                      <span className={`text-xs px-1.5 py-0.5 rounded ${styles.badge}`}>{allocation.walletType}</span>
                    </div>
                    <div className={`text-xs ${styles.subtext} mt-0.5`}>
                      Balance: {wallet.balance.toFixed(wallet.type === "SPOT" ? 8 : 2)} {allocation.currency}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="text-right">
                      <input
                        type="number"
                        value={allocation.amount}
                        onChange={(e) => handleUpdateAmount(allocation.walletId, parseFloat(e.target.value) || 0)}
                        disabled={disabled}
                        className={`w-24 px-2 py-1 text-right text-sm rounded border ${theme === "light" ? "bg-white border-gray-300" : "bg-zinc-900 border-zinc-600"} ${styles.header} disabled:opacity-50`}
                        step={wallet.type === "SPOT" ? 0.00000001 : 0.01}
                        min={0}
                        max={wallet.balance}
                      />
                      <div className={`text-xs ${styles.subtext} mt-0.5`}>
                        = {formatCurrency(allocation.equivalentInPaymentCurrency, paymentCurrency)}
                      </div>
                    </div>
                    <button
                      onClick={() => handleRemoveWallet(allocation.walletId)}
                      disabled={disabled}
                      className={`p-1 rounded-full transition-colors ${styles.buttonSecondary} disabled:opacity-50`}
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Available Wallets (Expandable) */}
      {unallocatedWallets.length > 0 && (
        <div>
          <button
            onClick={() => setExpanded(!expanded)}
            className={`w-full flex items-center justify-between py-2 text-sm ${styles.subtext} hover:${styles.header} transition-colors`}
          >
            <span>
              {expanded ? "Hide" : "Show"} available wallets ({unallocatedWallets.length})
            </span>
            {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>

          {expanded && (
            <div className="space-y-2 mt-2">
              {unallocatedWallets.map((wallet) => (
                <div
                  key={wallet.id}
                  className={`${styles.card} ${styles.cardHover} rounded-lg p-3 cursor-pointer transition-colors`}
                  onClick={() => !disabled && handleAddWallet(wallet)}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className={`font-medium ${styles.header}`}>{wallet.currency}</span>
                        <span className={`text-xs px-1.5 py-0.5 rounded ${styles.badge}`}>{wallet.type}</span>
                        {wallet.canCoverFull && (
                          <span className={`text-xs px-1.5 py-0.5 rounded ${styles.badge}`}>
                            Can cover full
                          </span>
                        )}
                      </div>
                      <div className={`text-xs ${styles.subtext} mt-0.5`}>
                        Balance: {wallet.balance.toFixed(wallet.type === "SPOT" ? 8 : 2)} {wallet.currency}
                        <span className="mx-1">•</span>
                        = {formatCurrency(wallet.equivalentAmount, paymentCurrency)}
                      </div>
                    </div>
                    <button
                      disabled={disabled}
                      className={`p-2 rounded-full transition-colors ${styles.button} disabled:opacity-50`}
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Insufficient Funds Warning */}
      {!multiWallet.canPayFull && (
        <div className={`mt-4 p-3 rounded-lg flex items-start gap-2 ${styles.badgeWarning}`}>
          <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" />
          <div className="text-sm">
            <div className="font-medium">Insufficient funds across all wallets</div>
            <div className="text-xs opacity-80 mt-0.5">
              You need {formatCurrency(multiWallet.shortfall, paymentCurrency)} more to complete this payment.
              Please add funds to one of your wallets.
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Compact version for smaller layouts
export function WalletSelectorCompact({
  multiWallet,
  paymentAmount: explicitAmount,
  paymentCurrency: explicitCurrency,
  session,
  onAddWallet,
  addWalletAllocation,
  onRemoveWallet,
  removeWalletAllocation,
  onAutoAllocate,
  autoAllocateWallets,
  formatCurrency,
  disabled = false,
}: Omit<WalletSelectorProps, "onUpdateAmount" | "onClear" | "theme" | "updateWalletAllocation" | "clearAllocations">) {
  if (!multiWallet || multiWallet.availableWallets.length === 0) {
    return null;
  }

  // Support both explicit amount/currency and session-based values
  const paymentAmount = explicitAmount ?? session?.amount ?? 0;
  const paymentCurrency = explicitCurrency ?? session?.currency ?? "USD";

  // Support both naming conventions for callbacks
  const handleAddWallet = onAddWallet ?? addWalletAllocation;
  const handleRemoveWallet = onRemoveWallet ?? removeWalletAllocation;
  const handleAutoAllocate = onAutoAllocate ?? autoAllocateWallets;

  const hasAllocations = multiWallet.selectedAllocations.length > 0;
  const isFullyAllocated = multiWallet.remainingAmount <= 0.01;

  return (
    <div className="space-y-2">
      {/* Quick wallet selection */}
      <div className="flex flex-wrap gap-2">
        {multiWallet.availableWallets.slice(0, 4).map((wallet) => {
          const isSelected = multiWallet.selectedAllocations.some(a => a.walletId === wallet.id);
          return (
            <button
              key={wallet.id}
              onClick={() => isSelected ? handleRemoveWallet?.(wallet.id) : handleAddWallet?.(wallet)}
              disabled={disabled}
              className={`px-3 py-1.5 text-sm rounded-lg border transition-all ${
                isSelected
                  ? "bg-blue-600 border-blue-600 text-white"
                  : "bg-white/5 border-white/20 text-white/80 hover:bg-white/10"
              } disabled:opacity-50`}
            >
              <span className="font-medium">{wallet.currency}</span>
              <span className="ml-1 opacity-60">({wallet.type})</span>
              {isSelected && <Check className="w-3 h-3 inline ml-1" />}
            </button>
          );
        })}
      </div>

      {/* Progress indicator */}
      {hasAllocations && paymentAmount > 0 && (
        <div className="flex items-center gap-2 text-xs">
          <div className="flex-1 h-1.5 rounded-full bg-white/10 overflow-hidden">
            <div
              className={`h-full transition-all ${isFullyAllocated ? "bg-green-500" : "bg-blue-500"}`}
              style={{ width: `${Math.min(100, ((paymentAmount - multiWallet.remainingAmount) / paymentAmount) * 100)}%` }}
            />
          </div>
          <span className={isFullyAllocated ? "text-green-400" : "text-white/60"}>
            {isFullyAllocated ? "Ready" : formatCurrency(multiWallet.remainingAmount, paymentCurrency) + " left"}
          </span>
        </div>
      )}

      {/* Auto-allocate button */}
      {!isFullyAllocated && multiWallet.canPayFull && (
        <button
          onClick={handleAutoAllocate}
          disabled={disabled}
          className="w-full py-2 text-sm rounded-lg bg-white/10 hover:bg-white/20 text-white/80 transition-colors disabled:opacity-50"
        >
          Auto-select wallets
        </button>
      )}
    </div>
  );
}
