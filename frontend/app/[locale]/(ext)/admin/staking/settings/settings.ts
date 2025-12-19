import { Settings, Percent, DollarSign, Clock } from "lucide-react";
import { FieldDefinition, TabDefinition, TabColors } from "@/components/admin/settings";

// Tab definitions for staking settings
export const STAKING_TABS: TabDefinition[] = [
  {
    id: "platform",
    label: "Platform",
    icon: Settings,
    description: "Configure core staking platform settings",
  },
  {
    id: "earnings",
    label: "Earnings",
    icon: DollarSign,
    description: "Configure earnings and distribution settings",
  },
];

// Tab colors for staking settings
export const STAKING_TAB_COLORS: Record<string, TabColors> = {
  platform: {
    bg: "bg-violet-500/10",
    text: "text-violet-500",
    border: "border-violet-500/20",
    gradient: "from-violet-500/20 via-violet-400/10 to-transparent",
    glow: "shadow-violet-500/20",
    iconBg: "bg-gradient-to-br from-violet-500 to-violet-600",
  },
  earnings: {
    bg: "bg-indigo-500/10",
    text: "text-indigo-500",
    border: "border-indigo-500/20",
    gradient: "from-indigo-500/20 via-indigo-400/10 to-transparent",
    glow: "shadow-indigo-500/20",
    iconBg: "bg-gradient-to-br from-indigo-500 to-indigo-600",
  },
};

// Field definitions for staking settings
export const STAKING_FIELD_DEFINITIONS: FieldDefinition[] = [
  // Platform Settings
  {
    key: "stakingDefaultAdminFee",
    label: "Default Admin Fee",
    type: "range",
    description: "The default percentage fee charged on staking rewards",
    category: "platform",
    subcategory: "Fees",
    min: 0,
    max: 20,
    step: 0.5,
    suffix: "%",
  },
  {
    key: "stakingDefaultEarlyWithdrawalFee",
    label: "Early Withdrawal Fee",
    type: "range",
    description: "Fee percentage for early withdrawal before lock period ends",
    category: "platform",
    subcategory: "Fees",
    min: 0,
    max: 50,
    step: 0.5,
    suffix: "%",
  },
  {
    key: "stakingAutoCompoundDefault",
    label: "Auto Compound by Default",
    type: "switch",
    description: "Enable automatic compounding of staking rewards by default",
    category: "platform",
    subcategory: "General",
  },

  // Earnings Settings
  {
    key: "stakingMinimumWithdrawalAmount",
    label: "Minimum Withdrawal Amount",
    type: "number",
    description: "Minimum amount required for withdrawal requests",
    category: "earnings",
    subcategory: "Withdrawals",
    min: 0,
    step: 0.01,
  },
  {
    key: "stakingAutomaticEarningsDistribution",
    label: "Automatic Earnings Distribution",
    type: "switch",
    description: "Automatically distribute earnings to users at scheduled time",
    category: "earnings",
    subcategory: "Distribution",
  },
  {
    key: "stakingRequireWithdrawalApproval",
    label: "Require Withdrawal Approval",
    type: "switch",
    description: "Require admin approval for withdrawal requests",
    category: "earnings",
    subcategory: "Withdrawals",
  },
  {
    key: "stakingDefaultAprCalculationMethod",
    label: "APR Calculation Method",
    type: "select",
    description: "Method used to calculate annual percentage rate",
    category: "earnings",
    subcategory: "Calculation",
    options: [
      { label: "Simple", value: "SIMPLE" },
      { label: "Compound", value: "COMPOUND" },
    ],
  },
  {
    key: "stakingEarningsDistributionTime",
    label: "Earnings Distribution Time",
    type: "text",
    description: "Time of day for automatic earnings distribution (HH:MM format)",
    category: "earnings",
    subcategory: "Distribution",
  },
];

// Default settings values
export const STAKING_DEFAULT_SETTINGS: Record<string, any> = {
  stakingDefaultAdminFee: 0,
  stakingDefaultEarlyWithdrawalFee: 0,
  stakingAutoCompoundDefault: false,
  stakingMinimumWithdrawalAmount: 0,
  stakingAutomaticEarningsDistribution: false,
  stakingRequireWithdrawalApproval: false,
  stakingDefaultAprCalculationMethod: "SIMPLE",
  stakingEarningsDistributionTime: "00:00",
};
