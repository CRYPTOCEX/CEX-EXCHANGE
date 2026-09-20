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
    bg: "bg-chart-1/10",
    text: "text-chart-1",
    border: "border-chart-1/20",
    iconBg: "bg-chart-1",
  },
  wallets: {
    bg: "bg-chart-2/10",
    text: "text-chart-2",
    border: "border-chart-2/20",
    iconBg: "bg-chart-2",
  },
  fees: {
    bg: "bg-chart-3/10",
    text: "text-chart-3",
    border: "border-chart-3/20",
    iconBg: "bg-chart-3",
  },
  security: {
    bg: "bg-chart-4/10",
    text: "text-chart-4",
    border: "border-chart-4/20",
    iconBg: "bg-chart-4",
  },
  webhooks: {
    bg: "bg-chart-5/10",
    text: "text-chart-5",
    border: "border-chart-5/20",
    iconBg: "bg-chart-5",
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
