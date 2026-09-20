"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "@/i18n/routing";
import $fetch from "@/lib/api";
import { useUserStore } from "@/store/user";
import { formatMoney } from "@/utils/currency";
import type {
  CheckoutSession,
  CustomerWallet,
  CheckoutState,
  CheckoutActions,
  WalletOption,
  PaymentAllocation,
  MultiWalletState,
} from "./types";

export function useCheckout(paymentIntentId: string): {
  state: CheckoutState;
  actions: CheckoutActions;
} {
  const router = useRouter();
  const { user } = useUserStore();
  const isAuthenticated = !!user;

  /**
   * Has the question "is this customer signed in?" been ANSWERED yet?
   * ==========================================================================
   *
   * This used to be a local `useState` plus a one-shot `/api/user/profile`
   * fetch, because at the time `useUserStore` had no boot-time resolution at
   * all: it held `user: null` until something explicitly called `setUser`, and
   * nothing did that until an effect fired after hydration. So on a cold load
   * of this URL `!!user` was false for an authenticated customer for exactly
   * the same reason it was false for a guest — and the wallet effect below
   * reads `isAuthenticated && session`, so a signed-in customer arriving from
   * an email link or a merchant redirect (the normal way this page is reached)
   * never triggered the balance fetch at all and was shown "sign in to pay"
   * over a funded account.
   *
   * The comment that used to sit here said resolving it in the store "would
   * change what every page in the app believes about the current user, which is
   * an auth-architecture decision and not this page's to make". That decision
   * has since been made, and made in the right place: the server already knows
   * who this is on every request, and `store/user.ts` now seeds `authResolved`
   * from it before the first render. So this page drops its private mechanism
   * and reads the shared one. Two mechanisms answering the same question is how
   * they end up disagreeing.
   *
   * Consequence worth stating plainly: there is no longer a client-side retry
   * here. If the server's profile fetch fails, this page renders signed-out —
   * but so does the header, the dashboard and everything else, so checkout is
   * no longer a special case that could contradict the rest of the app.
   */
  const authResolved = useUserStore((state) => state.authResolved);

  const [session, setSession] = useState<CheckoutSession | null>(null);
  const [customerWallet, setCustomerWallet] = useState<CustomerWallet | null>(null);
  const [walletLoading, setWalletLoading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);
  const [success, setSuccess] = useState(false);
  const [redirectUrl, setRedirectUrl] = useState<string | null>(null);
  const [timeLeft, setTimeLeft] = useState<number>(0);

  // Multi-wallet state
  const [multiWallet, setMultiWallet] = useState<MultiWalletState | null>(null);

  const fetchSession = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const { data, error: fetchError } = await $fetch({
        url: `/api/gateway/checkout/${paymentIntentId}`,
        silent: true,
      });

      if (fetchError) {
        setError(String(fetchError));
        return;
      }

      setSession(data);
    } catch (err: any) {
      setError(err.message || "Failed to load checkout session");
    } finally {
      setLoading(false);
    }
  }, [paymentIntentId]);

  // Fetch available wallets for multi-wallet payment
  const fetchAvailableWallets = useCallback(async () => {
    if (!session) return;

    try {
      setWalletLoading(true);
      const { data, error: walletError } = await $fetch({
        url: `/api/gateway/checkout/${paymentIntentId}/wallets`,
        silent: true,
      });

      if (walletError || !data) {
        // Fallback to single wallet fetch for backwards compatibility
        const { data: singleWallet } = await $fetch({
          url: `/api/finance/wallet/${session.walletType}/${session.currency}`,
          silent: true,
        });

        if (singleWallet) {
          setCustomerWallet({
            id: singleWallet.id,
            balance: parseFloat(singleWallet.balance),
            currency: singleWallet.currency,
            type: singleWallet.type,
            sufficient: parseFloat(singleWallet.balance) >= session.amount,
          });
        } else {
          setCustomerWallet(null);
        }
        setMultiWallet(null);
        return;
      }

      // Auto-allocate wallets for convenience
      // If one wallet can cover full, use it. Otherwise, use all wallets to try to cover.
      const wallets = data.wallets as WalletOption[];
      let autoAllocations: PaymentAllocation[] = [];
      let remaining = session.amount;

      // Sort: wallets that can cover full first, then same currency as payment, then by equivalent amount
      const sortedWallets = [...wallets].sort((a, b) => {
        if (a.canCoverFull && !b.canCoverFull) return -1;
        if (!a.canCoverFull && b.canCoverFull) return 1;
        const aExact = a.type === session.walletType && a.currency === session.currency;
        const bExact = b.type === session.walletType && b.currency === session.currency;
        if (aExact && !bExact) return -1;
        if (!aExact && bExact) return 1;
        return b.equivalentAmount - a.equivalentAmount;
      });

      // If one wallet can cover full payment, just use that one
      const fullCoverWallet = sortedWallets.find(w => w.canCoverFull);
      if (fullCoverWallet) {
        const neededAmount = session.amount / fullCoverWallet.exchangeRate;
        autoAllocations = [{
          walletId: fullCoverWallet.id,
          walletType: fullCoverWallet.type,
          currency: fullCoverWallet.currency,
          amount: neededAmount,
          equivalentInPaymentCurrency: session.amount,
        }];
        remaining = 0;
      } else {
        // Auto-allocate across all wallets to try to cover
        for (const wallet of sortedWallets) {
          if (remaining <= 0) break;
          const neededInWalletCurrency = remaining / wallet.exchangeRate;
          const allocAmount = Math.min(neededInWalletCurrency, wallet.balance);
          const equivalentAmount = allocAmount * wallet.exchangeRate;

          if (allocAmount > 0) {
            autoAllocations.push({
              walletId: wallet.id,
              walletType: wallet.type,
              currency: wallet.currency,
              amount: allocAmount,
              equivalentInPaymentCurrency: equivalentAmount,
            });
            remaining -= equivalentAmount;
          }
        }
      }

      // Set multi-wallet state with auto-allocations
      setMultiWallet({
        availableWallets: data.wallets,
        selectedAllocations: autoAllocations,
        canPayFull: data.canPayFull,
        totalEquivalent: data.totalEquivalent,
        shortfall: data.shortfall,
        remainingAmount: Math.max(0, remaining),
      });

      // Set legacy customerWallet for backwards compatibility
      // Use the first wallet that can cover full payment or the one with highest equivalent
      const primaryWallet = data.wallets.find((w: WalletOption) => w.canCoverFull) || data.wallets[0];
      if (primaryWallet) {
        setCustomerWallet({
          id: primaryWallet.id,
          balance: primaryWallet.balance,
          currency: primaryWallet.currency,
          type: primaryWallet.type,
          sufficient: primaryWallet.canCoverFull,
        });
      } else {
        setCustomerWallet(null);
      }
    } catch {
      setCustomerWallet(null);
      setMultiWallet(null);
    } finally {
      setWalletLoading(false);
    }
  }, [session, paymentIntentId]);

  useEffect(() => {
    fetchSession();
  }, [fetchSession]);

  useEffect(() => {
    if (isAuthenticated && session) {
      fetchAvailableWallets();
    } else if (authResolved) {
      /* Only CLEAR once we actually know there is no signed-in customer.
         Clearing unconditionally meant this ran on the first render of every
         visit — while the answer was still unknown — and the wallet panel
         settled into its "no wallet" branch before the profile arrived. */
      setCustomerWallet(null);
      setMultiWallet(null);
    }
  }, [isAuthenticated, session, authResolved, fetchAvailableWallets]);

  useEffect(() => {
    if (session?.expiresAt) {
      const interval = setInterval(() => {
        const remaining = Math.max(
          0,
          Math.floor((new Date(session.expiresAt).getTime() - Date.now()) / 1000)
        );
        setTimeLeft(remaining);

        if (remaining === 0) {
          setError("Payment session has expired");
          clearInterval(interval);
        }
      }, 1000);

      return () => clearInterval(interval);
    }
  }, [session?.expiresAt]);

  // Multi-wallet allocation functions
  const addWalletAllocation = useCallback((wallet: WalletOption, amount?: number) => {
    if (!multiWallet || !session) return;

    // Check if wallet already allocated
    if (multiWallet.selectedAllocations.some(a => a.walletId === wallet.id)) {
      return;
    }

    // Calculate how much to allocate
    const remaining = multiWallet.remainingAmount;
    let allocAmount: number;
    let equivalentAmount: number;

    if (amount !== undefined) {
      // Specific amount requested (in wallet's currency)
      allocAmount = Math.min(amount, wallet.balance);
      equivalentAmount = allocAmount * wallet.exchangeRate;
    } else {
      // Auto-calculate: either cover remaining or use full wallet balance
      const neededInWalletCurrency = remaining / wallet.exchangeRate;
      allocAmount = Math.min(neededInWalletCurrency, wallet.balance);
      equivalentAmount = allocAmount * wallet.exchangeRate;
    }

    if (allocAmount <= 0) return;

    const newAllocation: PaymentAllocation = {
      walletId: wallet.id,
      walletType: wallet.type,
      currency: wallet.currency,
      amount: allocAmount,
      equivalentInPaymentCurrency: equivalentAmount,
    };

    const newAllocations = [...multiWallet.selectedAllocations, newAllocation];
    const totalAllocated = newAllocations.reduce((sum, a) => sum + a.equivalentInPaymentCurrency, 0);

    setMultiWallet({
      ...multiWallet,
      selectedAllocations: newAllocations,
      remainingAmount: Math.max(0, session.amount - totalAllocated),
    });
  }, [multiWallet, session]);

  const removeWalletAllocation = useCallback((walletId: string) => {
    if (!multiWallet || !session) return;

    const newAllocations = multiWallet.selectedAllocations.filter(a => a.walletId !== walletId);
    const totalAllocated = newAllocations.reduce((sum, a) => sum + a.equivalentInPaymentCurrency, 0);

    setMultiWallet({
      ...multiWallet,
      selectedAllocations: newAllocations,
      remainingAmount: Math.max(0, session.amount - totalAllocated),
    });
  }, [multiWallet, session]);

  const updateWalletAllocation = useCallback((walletId: string, amount: number) => {
    if (!multiWallet || !session) return;

    const wallet = multiWallet.availableWallets.find(w => w.id === walletId);
    if (!wallet) return;

    const allocAmount = Math.min(Math.max(0, amount), wallet.balance);
    const equivalentAmount = allocAmount * wallet.exchangeRate;

    const newAllocations = multiWallet.selectedAllocations.map(a => {
      if (a.walletId === walletId) {
        return {
          ...a,
          amount: allocAmount,
          equivalentInPaymentCurrency: equivalentAmount,
        };
      }
      return a;
    });

    const totalAllocated = newAllocations.reduce((sum, a) => sum + a.equivalentInPaymentCurrency, 0);

    setMultiWallet({
      ...multiWallet,
      selectedAllocations: newAllocations,
      remainingAmount: Math.max(0, session.amount - totalAllocated),
    });
  }, [multiWallet, session]);

  const autoAllocateWallets = useCallback(() => {
    if (!multiWallet || !session) return;

    // Clear existing allocations
    let remaining = session.amount;
    const newAllocations: PaymentAllocation[] = [];

    // Sort wallets by: same currency first, then by equivalent amount descending
    const sortedWallets = [...multiWallet.availableWallets].sort((a, b) => {
      const aExact = a.type === session.walletType && a.currency === session.currency;
      const bExact = b.type === session.walletType && b.currency === session.currency;
      if (aExact && !bExact) return -1;
      if (!aExact && bExact) return 1;
      return b.equivalentAmount - a.equivalentAmount;
    });

    for (const wallet of sortedWallets) {
      if (remaining <= 0) break;

      const neededInWalletCurrency = remaining / wallet.exchangeRate;
      const allocAmount = Math.min(neededInWalletCurrency, wallet.balance);
      const equivalentAmount = allocAmount * wallet.exchangeRate;

      if (allocAmount > 0) {
        newAllocations.push({
          walletId: wallet.id,
          walletType: wallet.type,
          currency: wallet.currency,
          amount: allocAmount,
          equivalentInPaymentCurrency: equivalentAmount,
        });
        remaining -= equivalentAmount;
      }
    }

    const totalAllocated = newAllocations.reduce((sum, a) => sum + a.equivalentInPaymentCurrency, 0);

    setMultiWallet({
      ...multiWallet,
      selectedAllocations: newAllocations,
      remainingAmount: Math.max(0, session.amount - totalAllocated),
    });
  }, [multiWallet, session]);

  const clearAllocations = useCallback(() => {
    if (!multiWallet || !session) return;

    setMultiWallet({
      ...multiWallet,
      selectedAllocations: [],
      remainingAmount: session.amount,
    });
  }, [multiWallet, session]);

  const handleConfirmPayment = useCallback(async () => {
    if (!session) return;

    try {
      setProcessing(true);
      setError(null);

      // Prepare allocations - must have at least one
      if (!multiWallet || multiWallet.selectedAllocations.length === 0) {
        setError("Please select at least one wallet for payment");
        setProcessing(false);
        return;
      }

      // Round amounts to 8 decimal places before sending
      const allocations = multiWallet.selectedAllocations.map(a => ({
        ...a,
        amount: Math.round(a.amount * 1e8) / 1e8,
      }));

      const { data, error: confirmError } = await $fetch({
        url: `/api/gateway/checkout/${paymentIntentId}/confirm`,
        method: "POST",
        body: allocations, // Send array directly
      });

      if (confirmError) {
        setError(String(confirmError));
        return;
      }

      setSuccess(true);
      setRedirectUrl(data.redirectUrl);

      setTimeout(() => {
        window.location.href = data.redirectUrl;
      }, 3000);
    } catch (err: any) {
      setError(err.message || "Payment failed");
    } finally {
      setProcessing(false);
    }
  }, [session, paymentIntentId, multiWallet]);

  const handleCancel = useCallback(async () => {
    try {
      setProcessing(true);
      const { data } = await $fetch({
        url: `/api/gateway/checkout/${paymentIntentId}/cancel`,
        method: "POST",
        silent: true,
      });

      if (data?.redirectUrl) {
        window.location.href = data.redirectUrl;
      } else if (session?.cancelUrl) {
        const url = new URL(session.cancelUrl);
        url.searchParams.set("payment_id", paymentIntentId);
        url.searchParams.set("status", "cancelled");
        window.location.href = url.toString();
      } else if (session?.returnUrl) {
        const url = new URL(session.returnUrl);
        url.searchParams.set("payment_id", paymentIntentId);
        url.searchParams.set("status", "cancelled");
        window.location.href = url.toString();
      } else {
        router.back();
      }
    } catch (err) {
      if (session?.cancelUrl) {
        const url = new URL(session.cancelUrl);
        url.searchParams.set("payment_id", paymentIntentId);
        url.searchParams.set("status", "cancelled");
        window.location.href = url.toString();
      } else if (session?.returnUrl) {
        const url = new URL(session.returnUrl);
        url.searchParams.set("payment_id", paymentIntentId);
        url.searchParams.set("status", "cancelled");
        window.location.href = url.toString();
      } else {
        router.back();
      }
    }
  }, [paymentIntentId, router, session]);

  const formatTime = useCallback((seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  }, []);

  // A payment intent is denominated in whatever the merchant charges in, and
  // this gateway settles in crypto as well as fiat — so the code reaching here
  // is regularly USDT. `style: "currency"` throws a RangeError on a four-letter
  // code, which on a checkout means the customer sees an error boundary instead
  // of the amount they are about to pay.
  const formatCurrency = useCallback(
    (amount: number, currency: string) =>
      formatMoney(amount, currency, { minimumFractionDigits: 2 }),
    []
  );

  return {
    state: {
      session,
      customerWallet,
      walletLoading,
      loading,
      error,
      processing,
      success,
      redirectUrl,
      timeLeft,
      isAuthenticated,
      authResolved,
      multiWallet,
    },
    actions: {
      handleConfirmPayment,
      handleCancel,
      formatTime,
      formatCurrency,
      addWalletAllocation,
      removeWalletAllocation,
      updateWalletAllocation,
      autoAllocateWallets,
      clearAllocations,
    },
  };
}

// Preview hook with fake data for admin settings
export function useCheckoutPreview(): {
  state: CheckoutState;
  actions: CheckoutActions;
} {
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  // Same guard as the live hook — the preview renders the same components, so
  // an admin previewing a USDT checkout would hit the same RangeError.
  const formatCurrency = (amount: number, currency: string) =>
    formatMoney(amount, currency, { minimumFractionDigits: 2 });

  const mockMultiWallet: MultiWalletState = {
    availableWallets: [
      {
        id: "wallet_1",
        type: "FIAT",
        currency: "USD",
        balance: 250.00,
        priceInUSD: 1.0,
        exchangeRate: 1.0,
        equivalentAmount: 250.00,
        canCoverFull: true,
      },
      {
        id: "wallet_2",
        type: "FIAT",
        currency: "EUR",
        balance: 100.00,
        priceInUSD: 1.05,
        exchangeRate: 1.05,
        equivalentAmount: 105.00,
        canCoverFull: true,
      },
      {
        id: "wallet_3",
        type: "SPOT",
        currency: "BTC",
        balance: 0.002,
        priceInUSD: 50000,
        exchangeRate: 50000,
        equivalentAmount: 100.00,
        canCoverFull: true,
      },
    ],
    selectedAllocations: [],
    canPayFull: true,
    totalEquivalent: 455.00,
    shortfall: 0,
    remainingAmount: 99.99,
  };

  return {
    state: {
      session: {
        id: "pi_demo_preview_123",
        merchant: {
          name: "Demo Store",
          logo: undefined,
          website: "https://demo-store.com",
        },
        amount: 99.99,
        currency: "USD",
        walletType: "FIAT",
        description: "Premium Subscription - Annual Plan",
        lineItems: [
          { name: "Premium Plan", description: "Annual subscription with all features", quantity: 1, unitPrice: 99.99, image: undefined },
        ],
        cancelUrl: "https://demo-store.com/checkout/cancel",
        returnUrl: "https://demo-store.com/order/complete",
        expiresAt: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
        status: "PENDING",
        testMode: true,
      },
      customerWallet: {
        id: "wallet_demo",
        balance: 250.00,
        currency: "USD",
        type: "FIAT",
        sufficient: true,
      },
      walletLoading: false,
      loading: false,
      error: null,
      processing: false,
      success: false,
      redirectUrl: null,
      timeLeft: 1800,
      isAuthenticated: true,
      /* The preview renders a fully-settled checkout, so auth is answered by
         construction — otherwise the design gallery would show every layout
         in its pending state. */
      authResolved: true,
      multiWallet: mockMultiWallet,
    },
    actions: {
      handleConfirmPayment: async () => {},
      handleCancel: async () => {},
      formatTime,
      formatCurrency,
      addWalletAllocation: () => {},
      removeWalletAllocation: () => {},
      updateWalletAllocation: () => {},
      autoAllocateWallets: () => {},
      clearAllocations: () => {},
    },
  };
}
