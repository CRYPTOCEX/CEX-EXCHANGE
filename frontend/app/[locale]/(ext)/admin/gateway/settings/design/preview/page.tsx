"use client";

import { useSearchParams } from "next/navigation";
import { useMemo } from "react";
import {
  DesignV1,
  DesignV2,
  DesignV3,
  DesignV4,
  DesignV5,
  type CheckoutDesignVariant,
  type CheckoutState,
  type CheckoutActions,
  type MultiWalletState,
} from "@/app/[locale]/(ext)/gateway/checkout/[paymentIntentId]/designs";
import { formatCurrencyAuto } from "@/utils/currency";

const DESIGN_COMPONENTS = {
  v1: DesignV1,
  v2: DesignV2,
  v3: DesignV3,
  v4: DesignV4,
  v5: DesignV5,
} as const;

type PreviewState = "loading" | "not_authenticated" | "wallet_loading" | "sufficient_balance" | "insufficient_balance" | "no_wallet" | "processing" | "success" | "error" | "multi_wallet";

// Mock multi-wallet data
const mockMultiWallet: MultiWalletState = {
  availableWallets: [
    {
      id: "wallet_1",
      type: "FIAT",
      currency: "USD",
      balance: 150.00,
      priceInUSD: 1.0,
      exchangeRate: 1.0,
      equivalentAmount: 150.00,
      canCoverFull: true,
    },
    {
      id: "wallet_2",
      type: "FIAT",
      currency: "EUR",
      balance: 80.00,
      priceInUSD: 1.08,
      exchangeRate: 1.08,
      equivalentAmount: 86.40,
      canCoverFull: false,
    },
    {
      id: "wallet_3",
      type: "SPOT",
      currency: "BTC",
      balance: 0.0025,
      priceInUSD: 98000,
      exchangeRate: 98000,
      equivalentAmount: 245.00,
      canCoverFull: true,
    },
    {
      id: "wallet_4",
      type: "SPOT",
      currency: "ETH",
      balance: 0.05,
      priceInUSD: 3500,
      exchangeRate: 3500,
      equivalentAmount: 175.00,
      canCoverFull: true,
    },
  ],
  selectedAllocations: [],
  canPayFull: true,
  totalEquivalent: 656.40,
  shortfall: 0,
  remainingAmount: 99.99,
};

function generateMockState(previewState: PreviewState): CheckoutState {
  const baseSession = {
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
      { name: "Premium Plan", description: "Annual subscription with all features", quantity: 1, unitPrice: 79.99, image: undefined },
      { name: "Priority Support", description: "24/7 dedicated support", quantity: 1, unitPrice: 20.00, image: undefined },
    ],
    expiresAt: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
    status: "PENDING",
    testMode: true,
    cancelUrl: "https://demo-store.com/checkout/cancel",
    returnUrl: "https://demo-store.com/order/complete",
  };

  const sufficientWallet = {
    id: "wallet_demo",
    balance: 250.00,
    currency: "USD",
    type: "FIAT",
    sufficient: true,
  };

  const insufficientWallet = {
    id: "wallet_demo",
    balance: 45.50,
    currency: "USD",
    type: "FIAT",
    sufficient: false,
  };

  switch (previewState) {
    case "loading":
      return {
        session: null,
        customerWallet: null,
        walletLoading: false,
        loading: true,
        error: null,
        processing: false,
        success: false,
        redirectUrl: null,
        timeLeft: 0,
        isAuthenticated: false,
        multiWallet: null,
      };

    case "not_authenticated":
      return {
        session: baseSession,
        customerWallet: null,
        walletLoading: false,
        loading: false,
        error: null,
        processing: false,
        success: false,
        redirectUrl: null,
        timeLeft: 1800,
        isAuthenticated: false,
        multiWallet: null,
      };

    case "wallet_loading":
      return {
        session: baseSession,
        customerWallet: null,
        walletLoading: true,
        loading: false,
        error: null,
        processing: false,
        success: false,
        redirectUrl: null,
        timeLeft: 1800,
        isAuthenticated: true,
        multiWallet: null,
      };

    case "sufficient_balance":
      return {
        session: baseSession,
        customerWallet: sufficientWallet,
        walletLoading: false,
        loading: false,
        error: null,
        processing: false,
        success: false,
        redirectUrl: null,
        timeLeft: 1800,
        isAuthenticated: true,
        multiWallet: mockMultiWallet,
      };

    case "insufficient_balance":
      return {
        session: baseSession,
        customerWallet: insufficientWallet,
        walletLoading: false,
        loading: false,
        error: null,
        processing: false,
        success: false,
        redirectUrl: null,
        timeLeft: 1800,
        isAuthenticated: true,
        multiWallet: {
          ...mockMultiWallet,
          availableWallets: mockMultiWallet.availableWallets.map(w => ({
            ...w,
            balance: w.balance * 0.3,
            equivalentAmount: w.equivalentAmount * 0.3,
            canCoverFull: false,
          })),
          canPayFull: false,
          totalEquivalent: 656.40 * 0.3,
          shortfall: 99.99 - (656.40 * 0.3),
        },
      };

    case "no_wallet":
      return {
        session: baseSession,
        customerWallet: null,
        walletLoading: false,
        loading: false,
        error: null,
        processing: false,
        success: false,
        redirectUrl: null,
        timeLeft: 1800,
        isAuthenticated: true,
        multiWallet: {
          availableWallets: [],
          selectedAllocations: [],
          canPayFull: false,
          totalEquivalent: 0,
          shortfall: 99.99,
          remainingAmount: 99.99,
        },
      };

    case "multi_wallet":
      return {
        session: baseSession,
        customerWallet: sufficientWallet,
        walletLoading: false,
        loading: false,
        error: null,
        processing: false,
        success: false,
        redirectUrl: null,
        timeLeft: 1800,
        isAuthenticated: true,
        multiWallet: {
          ...mockMultiWallet,
          selectedAllocations: [
            {
              walletId: "wallet_1",
              walletType: "FIAT",
              currency: "USD",
              amount: 50.00,
              equivalentInPaymentCurrency: 50.00,
            },
            {
              walletId: "wallet_3",
              walletType: "SPOT",
              currency: "BTC",
              amount: 0.00051,
              equivalentInPaymentCurrency: 49.99,
            },
          ],
          remainingAmount: 0,
        },
      };

    case "processing":
      return {
        session: baseSession,
        customerWallet: sufficientWallet,
        walletLoading: false,
        loading: false,
        error: null,
        processing: true,
        success: false,
        redirectUrl: null,
        timeLeft: 1800,
        isAuthenticated: true,
        multiWallet: mockMultiWallet,
      };

    case "success":
      return {
        session: baseSession,
        customerWallet: sufficientWallet,
        walletLoading: false,
        loading: false,
        error: null,
        processing: false,
        success: true,
        redirectUrl: "https://demo-store.com/order/complete",
        timeLeft: 0,
        isAuthenticated: true,
        multiWallet: mockMultiWallet,
      };

    case "error":
      return {
        session: null,
        customerWallet: null,
        walletLoading: false,
        loading: false,
        error: "Payment session has expired or is invalid",
        processing: false,
        success: false,
        redirectUrl: null,
        timeLeft: 0,
        isAuthenticated: false,
        multiWallet: null,
      };

    default:
      return {
        session: baseSession,
        customerWallet: sufficientWallet,
        walletLoading: false,
        loading: false,
        error: null,
        processing: false,
        success: false,
        redirectUrl: null,
        timeLeft: 1800,
        isAuthenticated: true,
        multiWallet: mockMultiWallet,
      };
  }
}

const mockActions: CheckoutActions = {
  handleConfirmPayment: async () => {},
  handleCancel: async () => {},
  formatTime: (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  },
  formatCurrency: (amount: number, currency: string) => {
    return formatCurrencyAuto(amount, currency);
  },
  addWalletAllocation: () => {},
  removeWalletAllocation: () => {},
  updateWalletAllocation: () => {},
  autoAllocateWallets: () => {},
  clearAllocations: () => {},
};

export default function DesignPreviewPage() {
  const searchParams = useSearchParams();
  const design = (searchParams.get("design") as CheckoutDesignVariant) || "v2";
  const state = (searchParams.get("state") as PreviewState) || "sufficient_balance";

  const DesignComponent = DESIGN_COMPONENTS[design] || DesignV2;
  const mockState = useMemo(() => generateMockState(state), [state]);

  return (
    <DesignComponent
      state={mockState}
      actions={mockActions}
      paymentIntentId="pi_demo_preview"
    />
  );
}
