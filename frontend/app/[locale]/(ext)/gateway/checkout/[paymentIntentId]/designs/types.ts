// Shared types for checkout designs

export interface CheckoutSession {
  id: string;
  merchant: {
    name: string;
    logo?: string;
    website?: string;
  };
  amount: number;
  currency: string;
  walletType: string;
  description?: string;
  lineItems?: Array<{
    name: string;
    description?: string;
    quantity: number;
    unitPrice: number;
    image?: string;
  }>;
  expiresAt: string;
  status: string;
  testMode: boolean;
  cancelUrl?: string;
  returnUrl?: string;
}

export interface CustomerWallet {
  id: string;
  balance: number;
  currency: string;
  type: string;
  sufficient: boolean;
}

// Multi-wallet payment types
export interface WalletOption {
  id: string;
  type: string;
  currency: string;
  balance: number;
  priceInUSD: number;
  exchangeRate: number; // 1 unit of this currency = X units of payment currency
  equivalentAmount: number; // How much of payment amount this wallet can cover
  canCoverFull: boolean;
  icon?: string;
}

export interface PaymentAllocation {
  walletId: string;
  walletType: string;
  currency: string;
  amount: number; // Amount in wallet's currency
  equivalentInPaymentCurrency: number; // Amount in payment currency
}

export interface MultiWalletState {
  availableWallets: WalletOption[];
  selectedAllocations: PaymentAllocation[];
  canPayFull: boolean;
  totalEquivalent: number;
  shortfall: number;
  remainingAmount: number; // Amount still needed to complete payment
}

export interface CheckoutState {
  session: CheckoutSession | null;
  customerWallet: CustomerWallet | null;
  walletLoading: boolean;
  loading: boolean;
  error: string | null;
  processing: boolean;
  success: boolean;
  redirectUrl: string | null;
  timeLeft: number;
  isAuthenticated: boolean;
  // Multi-wallet payment state
  multiWallet: MultiWalletState | null;
}

export interface CheckoutActions {
  handleConfirmPayment: () => Promise<void>;
  handleCancel: () => Promise<void>;
  formatTime: (seconds: number) => string;
  formatCurrency: (amount: number, currency: string) => string;
  // Multi-wallet actions
  addWalletAllocation: (wallet: WalletOption, amount?: number) => void;
  removeWalletAllocation: (walletId: string) => void;
  updateWalletAllocation: (walletId: string, amount: number) => void;
  autoAllocateWallets: () => void;
  clearAllocations: () => void;
}

export interface CheckoutDesignProps {
  state: CheckoutState;
  actions: CheckoutActions;
  paymentIntentId: string;
}

export type CheckoutDesignVariant = "v1" | "v2" | "v3" | "v4" | "v5";

export const DESIGN_NAMES: Record<CheckoutDesignVariant, string> = {
  v1: "Classic Gradient",
  v2: "Dark Premium",
  v3: "Purple Glass",
  v4: "Luxury Gold",
  v5: "Cyber Tech",
};

export const DESIGN_DESCRIPTIONS: Record<CheckoutDesignVariant, string> = {
  v1: "Two-column layout with gradient backgrounds and modern cards",
  v2: "Sleek dark theme with split-screen layout and minimal design",
  v3: "Glassmorphism style with purple gradients and blur effects",
  v4: "Premium gold/amber theme with animated mesh backgrounds",
  v5: "Futuristic cyber theme with neon accents and grid patterns",
};
