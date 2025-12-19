import {
  Settings,
  DollarSign,
  Network,
} from "lucide-react";
import { FieldDefinition, TabDefinition, TabColors } from "@/components/admin/settings";
import MlmLevelsField from "./components/MlmLevels";

// Tab definitions for Affiliate settings
export const AFFILIATE_TABS: TabDefinition[] = [
  {
    id: "general",
    label: "General",
    icon: Settings,
    description: "Basic affiliate program configuration",
  },
  {
    id: "commission",
    label: "Commission",
    icon: DollarSign,
    description: "Configure commission rates and payouts",
  },
];

// Tab colors for Affiliate settings
export const AFFILIATE_TAB_COLORS: Record<string, TabColors> = {
  general: {
    bg: "bg-purple-500/10",
    text: "text-purple-500",
    border: "border-purple-500/20",
    gradient: "from-purple-500/20 via-purple-400/10 to-transparent",
    glow: "shadow-purple-500/20",
    iconBg: "bg-gradient-to-br from-purple-500 to-purple-600",
  },
  commission: {
    bg: "bg-emerald-500/10",
    text: "text-emerald-500",
    border: "border-emerald-500/20",
    gradient: "from-emerald-500/20 via-emerald-400/10 to-transparent",
    glow: "shadow-emerald-500/20",
    iconBg: "bg-gradient-to-br from-emerald-500 to-emerald-600",
  },
};

// Field definitions for Affiliate settings
export const AFFILIATE_FIELD_DEFINITIONS: FieldDefinition[] = [
  // General Settings - Require Approval
  {
    key: "affiliateRequireApproval",
    label: "Require Approval",
    type: "switch",
    description: "When enabled, new affiliates must be approved by an admin before they can earn commissions",
    category: "general",
    subcategory: "Program Settings",
  },
  // MLM System Configuration (Custom Component)
  {
    key: "affiliateMlmConfig",
    label: "MLM Configuration",
    type: "custom",
    description: "Configure the MLM system type and level percentages",
    category: "general",
    subcategory: "MLM Structure",
    fullWidth: true,
    customRender: MlmLevelsField,
  },

  // Commission Settings
  {
    key: "affiliateDefaultCommissionRate",
    label: "Default Commission Rate",
    type: "range",
    description: "The default commission percentage for new affiliates",
    category: "commission",
    subcategory: "Rates",
    min: 0,
    max: 50,
    step: 0.5,
    suffix: "%",
  },
  {
    key: "affiliateMaxCommissionRate",
    label: "Maximum Commission Rate",
    type: "range",
    description: "The maximum commission percentage allowed",
    category: "commission",
    subcategory: "Rates",
    min: 0,
    max: 100,
    step: 0.5,
    suffix: "%",
  },
  {
    key: "affiliatePayoutThreshold",
    label: "Payout Threshold ($)",
    type: "number",
    description: "Minimum balance required before affiliates can request a payout",
    category: "commission",
    subcategory: "Payouts",
    min: 0,
    step: 1,
  },
];

// Default settings values
export const AFFILIATE_DEFAULT_SETTINGS: Record<string, any> = {
  affiliateRequireApproval: false,
  affiliateMlmSystem: "DIRECT",
  affiliateBinaryLevels: 2,
  affiliateUnilevelLevels: 2,
  affiliateDefaultCommissionRate: 10,
  affiliateMaxCommissionRate: 30,
  affiliatePayoutThreshold: 50,
};
