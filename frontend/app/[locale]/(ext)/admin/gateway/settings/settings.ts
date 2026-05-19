import {
  Settings,
  DollarSign,
  Shield,
  Clock,
  Wallet,
} from "lucide-react";
import { FieldDefinition, TabDefinition, TabColors } from "@/components/admin/settings";
import WalletTypesField from "./components/WalletTypes";

// Tab definitions for gateway settings
export const GATEWAY_TABS: TabDefinition[] = [
  {
    id: "general",
    label: "General",
    icon: Settings,
    description: "Basic gateway configuration options",
  },
  {
    id: "wallets",
    label: "Wallets",
    icon: Wallet,
    description: "Supported wallet types and currencies",
  },
  {
    id: "fees",
    label: "Fees & Limits",
    icon: DollarSign,
    description: "Configure fees and transaction limits",
  },
  {
    id: "security",
    label: "Security",
    icon: Shield,
    description: "Merchant verification and approval",
  },
  {
    id: "webhooks",
    label: "Webhooks",
    icon: Clock,
    description: "Configure webhook retry behavior",
  },
];

// Tab colors for gateway settings
export const GATEWAY_TAB_COLORS: Record<string, TabColors> = {
  general: {
    bg: "bg-blue-500/10",
    text: "text-blue-500",
    border: "border-blue-500/20",
    gradient: "from-blue-500/20 via-blue-400/10 to-transparent",
    glow: "shadow-blue-500/20",
    iconBg: "bg-gradient-to-br from-blue-500 to-blue-600",
  },
  wallets: {
    bg: "bg-emerald-500/10",
    text: "text-emerald-500",
    border: "border-emerald-500/20",
    gradient: "from-emerald-500/20 via-emerald-400/10 to-transparent",
    glow: "shadow-emerald-500/20",
    iconBg: "bg-gradient-to-br from-emerald-500 to-emerald-600",
  },
  fees: {
    bg: "bg-amber-500/10",
    text: "text-amber-500",
    border: "border-amber-500/20",
    gradient: "from-amber-500/20 via-amber-400/10 to-transparent",
    glow: "shadow-amber-500/20",
    iconBg: "bg-gradient-to-br from-amber-500 to-amber-600",
  },
  security: {
    bg: "bg-red-500/10",
    text: "text-red-500",
    border: "border-red-500/20",
    gradient: "from-red-500/20 via-red-400/10 to-transparent",
    glow: "shadow-red-500/20",
    iconBg: "bg-gradient-to-br from-red-500 to-red-600",
  },
  webhooks: {
    bg: "bg-purple-500/10",
    text: "text-purple-500",
    border: "border-purple-500/20",
    gradient: "from-purple-500/20 via-purple-400/10 to-transparent",
    glow: "shadow-purple-500/20",
    iconBg: "bg-gradient-to-br from-purple-500 to-purple-600",
  },
};

// Field definitions for gateway settings
export const GATEWAY_FIELD_DEFINITIONS: FieldDefinition[] = [
  // Wallets Settings (Custom Component)
  {
    key: "gatewayAllowedWalletTypes",
    label: "Allowed Wallet Types",
    type: "custom",
    description: "Configure which wallet types merchants can accept payments in",
    category: "wallets",
    subcategory: "Wallet Configuration",
    fullWidth: true,
    customRender: WalletTypesField,
  },

  // General Settings
  {
    key: "gatewayEnabled",
    label: "Enable Gateway",
    type: "switch",
    description: "Allow merchants to register and accept payments",
    category: "general",
    subcategory: "Status",
  },
  {
    key: "gatewayTestMode",
    label: "Global Test Mode",
    type: "switch",
    description: "Force all transactions to be in test mode",
    category: "general",
    subcategory: "Mode",
  },
  {
    key: "gatewayPaymentExpirationMinutes",
    label: "Payment Expiration (minutes)",
    type: "number",
    description: "How long before unpaid payment sessions expire",
    category: "general",
    subcategory: "Sessions",
    min: 1,
  },
  {
    key: "gatewayPayoutSchedule",
    label: "Payout Schedule",
    type: "select",
    description: "Default payout schedule for new merchants",
    category: "general",
    subcategory: "Payouts",
    options: [
      { label: "Instant", value: "INSTANT" },
      { label: "Daily", value: "DAILY" },
      { label: "Weekly", value: "WEEKLY" },
      { label: "Bi-weekly", value: "BIWEEKLY" },
      { label: "Monthly", value: "MONTHLY" },
      { label: "Manual Only", value: "MANUAL" },
    ],
  },

  // Fees Settings
  {
    key: "gatewayFeePercentage",
    label: "Fee Percentage",
    type: "range",
    description: "Percentage of transaction amount",
    category: "fees",
    subcategory: "Transaction Fees",
    min: 0,
    max: 10,
    step: 0.1,
    suffix: "%",
  },
  {
    key: "gatewayFeeFixed",
    label: "Fixed Fee (USD)",
    type: "number",
    description: "Fixed amount per transaction (converted to payment currency)",
    category: "fees",
    subcategory: "Transaction Fees",
    min: 0,
    step: 0.01,
  },
  {
    key: "gatewayMinPaymentAmount",
    label: "Minimum Payment (USD)",
    type: "number",
    description: "Minimum payment amount allowed",
    category: "fees",
    subcategory: "Limits",
    min: 0,
    step: 0.01,
  },
  {
    key: "gatewayMaxPaymentAmount",
    label: "Maximum Payment (USD)",
    type: "number",
    description: "Maximum payment amount allowed",
    category: "fees",
    subcategory: "Limits",
    min: 0,
    step: 1,
  },
  {
    key: "gatewayDailyLimit",
    label: "Daily Limit (USD)",
    type: "number",
    description: "Daily limit per merchant",
    category: "fees",
    subcategory: "Limits",
    min: 0,
    step: 1,
  },
  {
    key: "gatewayMonthlyLimit",
    label: "Monthly Limit (USD)",
    type: "number",
    description: "Monthly limit per merchant",
    category: "fees",
    subcategory: "Limits",
    min: 0,
    step: 1,
  },
  {
    key: "gatewayMinPayoutAmount",
    label: "Minimum Payout (USD)",
    type: "number",
    description: "Minimum balance required before payouts are processed",
    category: "fees",
    subcategory: "Payouts",
    min: 0,
    step: 1,
  },

  // Security Settings
  {
    key: "gatewayRequireKyc",
    label: "Require KYC for Merchants",
    type: "switch",
    description: "Merchants must complete KYC verification before accepting payments",
    category: "security",
    subcategory: "Verification",
  },
  {
    key: "gatewayAutoApproveVerified",
    label: "Auto Approve Verified Merchants",
    type: "switch",
    description: "Automatically approve merchants who pass KYC verification",
    category: "security",
    subcategory: "Approval",
  },

  // Webhook Settings
  {
    key: "gatewayWebhookRetryAttempts",
    label: "Retry Attempts",
    type: "number",
    description: "Number of times to retry failed webhook deliveries",
    category: "webhooks",
    subcategory: "Retry",
    min: 0,
    max: 10,
    step: 1,
  },
  {
    key: "gatewayWebhookRetryDelaySeconds",
    label: "Retry Delay (seconds)",
    type: "number",
    description: "Time to wait between retry attempts",
    category: "webhooks",
    subcategory: "Retry",
    min: 1,
    step: 1,
  },
];

// Default settings values
export const GATEWAY_DEFAULT_SETTINGS: Record<string, any> = {
  gatewayEnabled: true,
  gatewayTestMode: false,
  gatewayFeePercentage: 2.9,
  gatewayFeeFixed: 0.3,
  gatewayMinPaymentAmount: 1,
  gatewayMaxPaymentAmount: 10000,
  gatewayDailyLimit: 50000,
  gatewayMonthlyLimit: 500000,
  gatewayMinPayoutAmount: 50,
  gatewayPayoutSchedule: "DAILY",
  gatewayAllowedWalletTypes: {},
  gatewayRequireKyc: true,
  gatewayAutoApproveVerified: false,
  gatewayPaymentExpirationMinutes: 30,
  gatewayWebhookRetryAttempts: 3,
  gatewayWebhookRetryDelaySeconds: 60,
  gatewayCheckoutDesign: "v2",
};
