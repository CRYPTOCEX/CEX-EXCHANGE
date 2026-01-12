// Template categories based on their use case
export interface TemplateCategory {
  id: string;
  name: string;
  description: string;
  icon: string;
  patterns: string[]; // Template name patterns to match
}

export const templateCategories: TemplateCategory[] = [
  {
    id: "authentication",
    name: "Authentication",
    description: "Login, registration, password reset, and verification emails",
    icon: "shield",
    patterns: [
      "EmailVerification",
      "PasswordReset",
      "WelcomeEmail",
      "TwoFactorAuth",
      "LoginNotification",
      "PasswordChanged",
      "AccountLocked",
      "NewDeviceLogin",
    ],
  },
  {
    id: "wallet",
    name: "Wallet & Transactions",
    description: "Deposits, withdrawals, transfers, and balance updates",
    icon: "wallet",
    patterns: [
      "WalletBalanceUpdate",
      "TransactionStatusUpdate",
      "SpotWalletWithdrawal",
      "SpotWalletDeposit",
      "OutgoingWalletTransfer",
      "IncomingWalletTransfer",
      "FiatWalletTransaction",
      "WithdrawalConfirmation",
      "DepositConfirmation",
    ],
  },
  {
    id: "trading",
    name: "Trading",
    description: "Trade executions, order confirmations, and trading alerts",
    icon: "chart",
    patterns: [
      "Binary",
      "TradeExecution",
      "OrderFilled",
      "OrderCancelled",
      "StopLoss",
      "TakeProfit",
      "MarginCall",
    ],
  },
  {
    id: "copy-trading",
    name: "Copy Trading",
    description: "Leader applications, follower updates, and profit sharing",
    icon: "users",
    patterns: [
      "CopyTrading",
    ],
  },
  {
    id: "investment",
    name: "Investments",
    description: "Investment plans, AI trading, and returns",
    icon: "trending-up",
    patterns: [
      "Investment",
      "AiInvestment",
    ],
  },
  {
    id: "forex",
    name: "Forex",
    description: "Forex deposits, withdrawals, and account notifications",
    icon: "dollar-sign",
    patterns: [
      "Forex",
    ],
  },
  {
    id: "staking",
    name: "Staking",
    description: "Staking confirmations and reward distributions",
    icon: "layers",
    patterns: [
      "Staking",
    ],
  },
  {
    id: "ico",
    name: "ICO & Token Sales",
    description: "Token contributions and phase updates",
    icon: "coins",
    patterns: [
      "Ico",
    ],
  },
  {
    id: "kyc",
    name: "KYC & Verification",
    description: "Identity verification status and updates",
    icon: "user-check",
    patterns: [
      "Kyc",
    ],
  },
  {
    id: "support",
    name: "Support & Tickets",
    description: "Support ticket updates and chat messages",
    icon: "message-circle",
    patterns: [
      "SupportTicket",
      "ChatMessage",
      "TicketReply",
      "TicketClosed",
    ],
  },
  {
    id: "ecommerce",
    name: "E-commerce",
    description: "Order confirmations and shipping updates",
    icon: "shopping-cart",
    patterns: [
      "Order",
      "Ecommerce",
    ],
  },
  {
    id: "author",
    name: "Author & Content",
    description: "Author applications and content status",
    icon: "pen-tool",
    patterns: [
      "Author",
    ],
  },
  {
    id: "p2p",
    name: "P2P Trading",
    description: "P2P trade offers and completion notifications",
    icon: "repeat",
    patterns: [
      "P2p",
    ],
  },
  {
    id: "system",
    name: "System",
    description: "System announcements and general notifications",
    icon: "settings",
    patterns: [], // Catch-all for templates that don't match other categories
  },
];

// Function to determine template category based on name
export function getTemplateCategory(templateName: string): TemplateCategory {
  for (const category of templateCategories) {
    for (const pattern of category.patterns) {
      if (templateName.includes(pattern)) {
        return category;
      }
    }
  }
  // Default to system category if no match
  return templateCategories.find((c) => c.id === "system")!;
}

// Function to group templates by category
export function groupTemplatesByCategory<T extends { name: string }>(
  templates: T[]
): Record<string, T[]> {
  const grouped: Record<string, T[]> = {};

  // Initialize all categories
  for (const category of templateCategories) {
    grouped[category.id] = [];
  }

  // Group templates
  for (const template of templates) {
    const category = getTemplateCategory(template.name);
    grouped[category.id].push(template);
  }

  // Remove empty categories
  for (const key of Object.keys(grouped)) {
    if (grouped[key].length === 0) {
      delete grouped[key];
    }
  }

  return grouped;
}
