"use client";
import { AnalyticsConfig } from "@/components/blocks/data-table/types/analytics";
import { useTranslations } from "next-intl";

export function useAnalytics() {
  const tCommon = useTranslations("common");

  return [
    // ─────────────────────────────────────────────────────────────
    // Group 1: Transaction Status Overview – KPI Grid & Pie Chart
    // ─────────────────────────────────────────────────────────────
    [
      {
        type: "kpi",
        layout: { cols: 5, rows: 2 },
        responsive: {
          mobile: { cols: 1, rows: 10, span: 1 },
          tablet: { cols: 2, rows: 5, span: 2 },
          desktop: { cols: 5, rows: 2, span: 2 },
        },
        items: [
          {
            id: "total_transactions",
            title: tCommon("total_transactions"),
            metric: "total",
            model: "transaction",
            icon: "mdi:receipt",
          },
          {
            id: "pending_transactions",
            title: tCommon("pending"),
            metric: "PENDING",
            model: "transaction",
            aggregation: { field: "status", value: "PENDING" },
            icon: "mdi:clock-outline",
          },
          {
            id: "processing_transactions",
            title: tCommon("processing"),
            metric: "PROCESSING",
            model: "transaction",
            aggregation: { field: "status", value: "PROCESSING" },
            icon: "mdi:sync",
          },
          {
            id: "completed_transactions",
            title: tCommon("completed"),
            metric: "COMPLETED",
            model: "transaction",
            aggregation: { field: "status", value: "COMPLETED" },
            icon: "mdi:check-circle",
          },
          {
            id: "failed_transactions",
            title: tCommon("failed"),
            metric: "FAILED",
            model: "transaction",
            aggregation: { field: "status", value: "FAILED" },
            icon: "mdi:alert-circle",
          },
          {
            id: "cancelled_transactions",
            title: tCommon("cancelled"),
            metric: "CANCELLED",
            model: "transaction",
            aggregation: { field: "status", value: "CANCELLED" },
            icon: "mdi:cancel",
          },
          {
            id: "rejected_transactions",
            title: tCommon("rejected"),
            metric: "REJECTED",
            model: "transaction",
            aggregation: { field: "status", value: "REJECTED" },
            icon: "mdi:close-circle",
          },
          {
            id: "expired_transactions",
            title: tCommon("expired"),
            metric: "EXPIRED",
            model: "transaction",
            aggregation: { field: "status", value: "EXPIRED" },
            icon: "mdi:clock-alert",
          },
          {
            id: "refunded_transactions",
            title: tCommon("refunded"),
            metric: "REFUNDED",
            model: "transaction",
            aggregation: { field: "status", value: "REFUNDED" },
            icon: "mdi:cash-refund",
          },
          {
            id: "frozen_transactions",
            title: tCommon("frozen"),
            metric: "FROZEN",
            model: "transaction",
            aggregation: { field: "status", value: "FROZEN" },
            icon: "mdi:snowflake",
          },
        ],
      },
      {
        type: "chart",
        responsive: {
          mobile: { cols: 1, rows: 1, span: 1 },
          tablet: { cols: 1, rows: 1, span: 1 },
          desktop: { cols: 1, rows: 1, span: 1 },
        },
        items: [
          {
            id: "transactionStatusDistribution",
            title: tCommon("status_distribution"),
            type: "pie",
            model: "transaction",
            metrics: [
              "PENDING",
              "PROCESSING",
              "COMPLETED",
              "FAILED",
              "CANCELLED",
              "REJECTED",
              "EXPIRED",
              "REFUNDED",
              "FROZEN",
              "TIMEOUT",
            ],
            config: {
              field: "status",
              status: [
                {
                  value: "PENDING",
                  label: tCommon("pending"),
                  color: "orange",
                  icon: "mdi:clock-outline",
                },
                {
                  value: "PROCESSING",
                  label: tCommon("processing"),
                  color: "blue",
                  icon: "mdi:sync",
                },
                {
                  value: "COMPLETED",
                  label: tCommon("completed"),
                  color: "green",
                  icon: "mdi:check-circle",
                },
                {
                  value: "FAILED",
                  label: tCommon("failed"),
                  color: "red",
                  icon: "mdi:alert-circle",
                },
                {
                  value: "CANCELLED",
                  label: tCommon("cancelled"),
                  color: "gray",
                  icon: "mdi:cancel",
                },
                {
                  value: "REJECTED",
                  label: tCommon("rejected"),
                  color: "pink",
                  icon: "mdi:close-circle",
                },
                {
                  value: "EXPIRED",
                  label: tCommon("expired"),
                  color: "yellow",
                  icon: "mdi:clock-alert",
                },
                {
                  value: "REFUNDED",
                  label: tCommon("refunded"),
                  color: "purple",
                  icon: "mdi:cash-refund",
                },
                {
                  value: "FROZEN",
                  label: tCommon("frozen"),
                  color: "cyan",
                  icon: "mdi:snowflake",
                },
                {
                  value: "TIMEOUT",
                  label: tCommon("timeout"),
                  color: "amber",
                  icon: "mdi:timer-off",
                },
              ],
            },
          },
        ],
      },
    ],

    // ─────────────────────────────────────────────────────────────
    // Group 2: Core Transaction Types – KPI Grid & Pie Chart
    // ─────────────────────────────────────────────────────────────
    [
      {
        type: "kpi",
        layout: { cols: 4, rows: 2 },
        responsive: {
          mobile: { cols: 1, rows: 8, span: 1 },
          tablet: { cols: 2, rows: 4, span: 2 },
          desktop: { cols: 4, rows: 2, span: 2 },
        },
        items: [
          {
            id: "deposit_transactions",
            title: tCommon("deposits"),
            metric: "DEPOSIT",
            model: "transaction",
            aggregation: { field: "type", value: "DEPOSIT" },
            icon: "mdi:bank-transfer-in",
          },
          {
            id: "withdraw_transactions",
            title: tCommon("withdrawals"),
            metric: "WITHDRAW",
            model: "transaction",
            aggregation: { field: "type", value: "WITHDRAW" },
            icon: "mdi:bank-transfer-out",
          },
          {
            id: "incoming_transfer_transactions",
            title: "Incoming Transfers",
            metric: "INCOMING_TRANSFER",
            model: "transaction",
            aggregation: { field: "type", value: "INCOMING_TRANSFER" },
            icon: "mdi:arrow-down-bold",
          },
          {
            id: "outgoing_transfer_transactions",
            title: "Outgoing Transfers",
            metric: "OUTGOING_TRANSFER",
            model: "transaction",
            aggregation: { field: "type", value: "OUTGOING_TRANSFER" },
            icon: "mdi:arrow-up-bold",
          },
          {
            id: "payment_transactions",
            title: tCommon("payments"),
            metric: "PAYMENT",
            model: "transaction",
            aggregation: { field: "type", value: "PAYMENT" },
            icon: "mdi:cash-fast",
          },
          {
            id: "refund_transactions",
            title: tCommon("refunds"),
            metric: "REFUND",
            model: "transaction",
            aggregation: { field: "type", value: "REFUND" },
            icon: "mdi:cash-refund",
          },
          {
            id: "invoice_transactions",
            title: "Invoices",
            metric: "INVOICE",
            model: "transaction",
            aggregation: { field: "type", value: "INVOICE" },
            icon: "mdi:file-document",
          },
          {
            id: "failed_type_transactions",
            title: "Failed Types",
            metric: "FAILED",
            model: "transaction",
            aggregation: { field: "type", value: "FAILED" },
            icon: "mdi:alert-octagon",
          },
        ],
      },
      {
        type: "chart",
        responsive: {
          mobile: { cols: 1, rows: 1, span: 1 },
          tablet: { cols: 1, rows: 1, span: 1 },
          desktop: { cols: 1, rows: 1, span: 1 },
        },
        items: [
          {
            id: "coreTransactionTypeDistribution",
            title: "Core Transaction Types",
            type: "pie",
            model: "transaction",
            metrics: [
              "DEPOSIT",
              "WITHDRAW",
              "INCOMING_TRANSFER",
              "OUTGOING_TRANSFER",
              "PAYMENT",
              "REFUND",
              "INVOICE",
              "FAILED",
            ],
            config: {
              field: "type",
              status: [
                {
                  value: "DEPOSIT",
                  label: tCommon("deposit"),
                  color: "green",
                  icon: "mdi:bank-transfer-in",
                },
                {
                  value: "WITHDRAW",
                  label: tCommon("withdraw"),
                  color: "red",
                  icon: "mdi:bank-transfer-out",
                },
                {
                  value: "INCOMING_TRANSFER",
                  label: "Incoming Transfer",
                  color: "emerald",
                  icon: "mdi:arrow-down-bold",
                },
                {
                  value: "OUTGOING_TRANSFER",
                  label: "Outgoing Transfer",
                  color: "rose",
                  icon: "mdi:arrow-up-bold",
                },
                {
                  value: "PAYMENT",
                  label: tCommon("payment"),
                  color: "blue",
                  icon: "mdi:cash-fast",
                },
                {
                  value: "REFUND",
                  label: tCommon("refund"),
                  color: "purple",
                  icon: "mdi:cash-refund",
                },
                {
                  value: "INVOICE",
                  label: "Invoice",
                  color: "indigo",
                  icon: "mdi:file-document",
                },
                {
                  value: "FAILED",
                  label: "Failed",
                  color: "gray",
                  icon: "mdi:alert-octagon",
                },
              ],
            },
          },
        ],
      },
    ],

    // ─────────────────────────────────────────────────────────────
    // Group 3: Trading & Investment Types – KPI Grid & Pie Chart
    // ─────────────────────────────────────────────────────────────
    [
      {
        type: "kpi",
        layout: { cols: 4, rows: 2 },
        responsive: {
          mobile: { cols: 1, rows: 8, span: 1 },
          tablet: { cols: 2, rows: 4, span: 2 },
          desktop: { cols: 4, rows: 2, span: 2 },
        },
        items: [
          {
            id: "binary_order_transactions",
            title: "Binary Orders",
            metric: "BINARY_ORDER",
            model: "transaction",
            aggregation: { field: "type", value: "BINARY_ORDER" },
            icon: "mdi:chart-line",
          },
          {
            id: "exchange_order_transactions",
            title: "Exchange Orders",
            metric: "EXCHANGE_ORDER",
            model: "transaction",
            aggregation: { field: "type", value: "EXCHANGE_ORDER" },
            icon: "mdi:swap-horizontal",
          },
          {
            id: "investment_transactions",
            title: "Investments",
            metric: "INVESTMENT",
            model: "transaction",
            aggregation: { field: "type", value: "INVESTMENT" },
            icon: "mdi:trending-up",
          },
          {
            id: "investment_roi_transactions",
            title: "Investment ROI",
            metric: "INVESTMENT_ROI",
            model: "transaction",
            aggregation: { field: "type", value: "INVESTMENT_ROI" },
            icon: "mdi:cash-multiple",
          },
          {
            id: "ai_investment_transactions",
            title: "AI Investments",
            metric: "AI_INVESTMENT",
            model: "transaction",
            aggregation: { field: "type", value: "AI_INVESTMENT" },
            icon: "mdi:robot",
          },
          {
            id: "ai_investment_roi_transactions",
            title: "AI Investment ROI",
            metric: "AI_INVESTMENT_ROI",
            model: "transaction",
            aggregation: { field: "type", value: "AI_INVESTMENT_ROI" },
            icon: "mdi:robot-happy",
          },
          {
            id: "forex_investment_transactions",
            title: "Forex Investments",
            metric: "FOREX_INVESTMENT",
            model: "transaction",
            aggregation: { field: "type", value: "FOREX_INVESTMENT" },
            icon: "mdi:currency-usd",
          },
          {
            id: "forex_investment_roi_transactions",
            title: "Forex Investment ROI",
            metric: "FOREX_INVESTMENT_ROI",
            model: "transaction",
            aggregation: { field: "type", value: "FOREX_INVESTMENT_ROI" },
            icon: "mdi:cash-check",
          },
        ],
      },
      {
        type: "chart",
        responsive: {
          mobile: { cols: 1, rows: 1, span: 1 },
          tablet: { cols: 1, rows: 1, span: 1 },
          desktop: { cols: 1, rows: 1, span: 1 },
        },
        items: [
          {
            id: "tradingInvestmentTypeDistribution",
            title: "Trading & Investment Distribution",
            type: "pie",
            model: "transaction",
            metrics: [
              "BINARY_ORDER",
              "EXCHANGE_ORDER",
              "INVESTMENT",
              "INVESTMENT_ROI",
              "AI_INVESTMENT",
              "AI_INVESTMENT_ROI",
              "FOREX_INVESTMENT",
              "FOREX_INVESTMENT_ROI",
            ],
            config: {
              field: "type",
              status: [
                {
                  value: "BINARY_ORDER",
                  label: "Binary Order",
                  color: "violet",
                  icon: "mdi:chart-line",
                },
                {
                  value: "EXCHANGE_ORDER",
                  label: "Exchange Order",
                  color: "blue",
                  icon: "mdi:swap-horizontal",
                },
                {
                  value: "INVESTMENT",
                  label: "Investment",
                  color: "green",
                  icon: "mdi:trending-up",
                },
                {
                  value: "INVESTMENT_ROI",
                  label: "Investment ROI",
                  color: "emerald",
                  icon: "mdi:cash-multiple",
                },
                {
                  value: "AI_INVESTMENT",
                  label: "AI Investment",
                  color: "purple",
                  icon: "mdi:robot",
                },
                {
                  value: "AI_INVESTMENT_ROI",
                  label: "AI ROI",
                  color: "fuchsia",
                  icon: "mdi:robot-happy",
                },
                {
                  value: "FOREX_INVESTMENT",
                  label: "Forex Investment",
                  color: "amber",
                  icon: "mdi:currency-usd",
                },
                {
                  value: "FOREX_INVESTMENT_ROI",
                  label: "Forex ROI",
                  color: "yellow",
                  icon: "mdi:cash-check",
                },
              ],
            },
          },
        ],
      },
    ],

    // ─────────────────────────────────────────────────────────────
    // Group 4: Blockchain & NFT Types – KPI Grid & Pie Chart
    // ─────────────────────────────────────────────────────────────
    [
      {
        type: "kpi",
        layout: { cols: 4, rows: 2 },
        responsive: {
          mobile: { cols: 1, rows: 8, span: 1 },
          tablet: { cols: 2, rows: 4, span: 2 },
          desktop: { cols: 4, rows: 2, span: 2 },
        },
        items: [
          {
            id: "ico_contribution_transactions",
            title: "ICO Contributions",
            metric: "ICO_CONTRIBUTION",
            model: "transaction",
            aggregation: { field: "type", value: "ICO_CONTRIBUTION" },
            icon: "mdi:coin",
          },
          {
            id: "nft_purchase_transactions",
            title: "NFT Purchases",
            metric: "NFT_PURCHASE",
            model: "transaction",
            aggregation: { field: "type", value: "NFT_PURCHASE" },
            icon: "mdi:image-frame",
          },
          {
            id: "nft_sale_transactions",
            title: "NFT Sales",
            metric: "NFT_SALE",
            model: "transaction",
            aggregation: { field: "type", value: "NFT_SALE" },
            icon: "mdi:tag",
          },
          {
            id: "nft_mint_transactions",
            title: "NFT Mints",
            metric: "NFT_MINT",
            model: "transaction",
            aggregation: { field: "type", value: "NFT_MINT" },
            icon: "mdi:sparkles",
          },
          {
            id: "nft_burn_transactions",
            title: "NFT Burns",
            metric: "NFT_BURN",
            model: "transaction",
            aggregation: { field: "type", value: "NFT_BURN" },
            icon: "mdi:fire",
          },
          {
            id: "nft_transfer_transactions",
            title: "NFT Transfers",
            metric: "NFT_TRANSFER",
            model: "transaction",
            aggregation: { field: "type", value: "NFT_TRANSFER" },
            icon: "mdi:transfer",
          },
          {
            id: "nft_auction_bid_transactions",
            title: "NFT Auction Bids",
            metric: "NFT_AUCTION_BID",
            model: "transaction",
            aggregation: { field: "type", value: "NFT_AUCTION_BID" },
            icon: "mdi:gavel",
          },
          {
            id: "nft_auction_settle_transactions",
            title: "NFT Auction Settlements",
            metric: "NFT_AUCTION_SETTLE",
            model: "transaction",
            aggregation: { field: "type", value: "NFT_AUCTION_SETTLE" },
            icon: "mdi:check-decagram",
          },
        ],
      },
      {
        type: "chart",
        responsive: {
          mobile: { cols: 1, rows: 1, span: 1 },
          tablet: { cols: 1, rows: 1, span: 1 },
          desktop: { cols: 1, rows: 1, span: 1 },
        },
        items: [
          {
            id: "blockchainNftTypeDistribution",
            title: "Blockchain & NFT Distribution",
            type: "pie",
            model: "transaction",
            metrics: [
              "ICO_CONTRIBUTION",
              "NFT_PURCHASE",
              "NFT_SALE",
              "NFT_MINT",
              "NFT_BURN",
              "NFT_TRANSFER",
              "NFT_AUCTION_BID",
              "NFT_AUCTION_SETTLE",
              "NFT_OFFER",
            ],
            config: {
              field: "type",
              status: [
                {
                  value: "ICO_CONTRIBUTION",
                  label: "ICO",
                  color: "orange",
                  icon: "mdi:coin",
                },
                {
                  value: "NFT_PURCHASE",
                  label: "NFT Purchase",
                  color: "blue",
                  icon: "mdi:image-frame",
                },
                {
                  value: "NFT_SALE",
                  label: "NFT Sale",
                  color: "green",
                  icon: "mdi:tag",
                },
                {
                  value: "NFT_MINT",
                  label: "NFT Mint",
                  color: "purple",
                  icon: "mdi:sparkles",
                },
                {
                  value: "NFT_BURN",
                  label: "NFT Burn",
                  color: "red",
                  icon: "mdi:fire",
                },
                {
                  value: "NFT_TRANSFER",
                  label: "NFT Transfer",
                  color: "cyan",
                  icon: "mdi:transfer",
                },
                {
                  value: "NFT_AUCTION_BID",
                  label: "Auction Bid",
                  color: "indigo",
                  icon: "mdi:gavel",
                },
                {
                  value: "NFT_AUCTION_SETTLE",
                  label: "Auction Settlement",
                  color: "teal",
                  icon: "mdi:check-decagram",
                },
                {
                  value: "NFT_OFFER",
                  label: "NFT Offer",
                  color: "pink",
                  icon: "mdi:handshake",
                },
              ],
            },
          },
        ],
      },
    ],

    // ─────────────────────────────────────────────────────────────
    // Group 5: Other Platform Types – KPI Grid & Pie Chart
    // ─────────────────────────────────────────────────────────────
    [
      {
        type: "kpi",
        layout: { cols: 2, rows: 2 },
        responsive: {
          mobile: { cols: 1, rows: 4, span: 1 },
          tablet: { cols: 2, rows: 2, span: 2 },
          desktop: { cols: 2, rows: 2, span: 2 },
        },
        items: [
          {
            id: "staking_transactions",
            title: "Staking",
            metric: "STAKING",
            model: "transaction",
            aggregation: { field: "type", value: "STAKING" },
            icon: "mdi:lock",
          },
          {
            id: "staking_reward_transactions",
            title: "Staking Rewards",
            metric: "STAKING_REWARD",
            model: "transaction",
            aggregation: { field: "type", value: "STAKING_REWARD" },
            icon: "mdi:gift",
          },
          {
            id: "p2p_trade_transactions",
            title: "P2P Trades",
            metric: "P2P_TRADE",
            model: "transaction",
            aggregation: { field: "type", value: "P2P_TRADE" },
            icon: "mdi:handshake",
          },
          {
            id: "referral_reward_transactions",
            title: "Referral Rewards",
            metric: "REFERRAL_REWARD",
            model: "transaction",
            aggregation: { field: "type", value: "REFERRAL_REWARD" },
            icon: "mdi:account-group",
          },
        ],
      },
      {
        type: "chart",
        responsive: {
          mobile: { cols: 1, rows: 1, span: 1 },
          tablet: { cols: 1, rows: 1, span: 1 },
          desktop: { cols: 1, rows: 1, span: 1 },
        },
        items: [
          {
            id: "platformTypeDistribution",
            title: "Platform Features Distribution",
            type: "pie",
            model: "transaction",
            metrics: [
              "STAKING",
              "STAKING_REWARD",
              "P2P_TRADE",
              "P2P_OFFER_TRANSFER",
              "REFERRAL_REWARD",
              "FOREX_DEPOSIT",
              "FOREX_WITHDRAW",
            ],
            config: {
              field: "type",
              status: [
                {
                  value: "STAKING",
                  label: "Staking",
                  color: "blue",
                  icon: "mdi:lock",
                },
                {
                  value: "STAKING_REWARD",
                  label: "Staking Reward",
                  color: "green",
                  icon: "mdi:gift",
                },
                {
                  value: "P2P_TRADE",
                  label: "P2P Trade",
                  color: "purple",
                  icon: "mdi:handshake",
                },
                {
                  value: "P2P_OFFER_TRANSFER",
                  label: "P2P Transfer",
                  color: "violet",
                  icon: "mdi:swap-horizontal",
                },
                {
                  value: "REFERRAL_REWARD",
                  label: "Referral Reward",
                  color: "orange",
                  icon: "mdi:account-group",
                },
                {
                  value: "FOREX_DEPOSIT",
                  label: "Forex Deposit",
                  color: "emerald",
                  icon: "mdi:bank-plus",
                },
                {
                  value: "FOREX_WITHDRAW",
                  label: "Forex Withdraw",
                  color: "rose",
                  icon: "mdi:bank-minus",
                },
              ],
            },
          },
        ],
      },
    ],

    // ─────────────────────────────────────────────────────────────
    // Group 6: Financial Metrics – KPI Grid
    // ─────────────────────────────────────────────────────────────
    {
      type: "kpi",
      layout: { cols: 3, rows: 1 },
      responsive: {
        mobile: { cols: 1, rows: 3, span: 1 },
          tablet: { cols: 3, rows: 1, span: 2 },
          desktop: { cols: 3, rows: 1, span: 2 },
      },
      items: [
        {
          id: "total_transaction_volume",
          title: "Total Transaction Volume",
          metric: "amount",
          model: "transaction",
          icon: "mdi:cash-multiple",
        },
        {
          id: "total_fees_collected",
          title: "Total Fees Collected",
          metric: "fee",
          model: "transaction",
          icon: "mdi:cash",
        },
        {
          id: "average_transaction_amount",
          title: "Average Transaction Amount",
          metric: "average",
          model: "transaction",
          icon: "mdi:calculator",
        },
      ],
    },

    // ─────────────────────────────────────────────────────────────
    // Group 7: Transaction Trends Over Time – Full-Width Line Chart
    // ─────────────────────────────────────────────────────────────
    {
      type: "chart",
      responsive: {
        mobile: { cols: 1, rows: 1, span: 1 },
        tablet: { cols: 1, rows: 1, span: 1 },
        desktop: { cols: 1, rows: 1, span: 1 },
      },
      items: [
        {
          id: "transactionsOverTime",
          title: "Transaction Trends Over Time",
          type: "line",
          model: "transaction",
          metrics: ["total", "COMPLETED", "FAILED", "PENDING", "PROCESSING"],
          timeframes: ["24h", "7d", "30d", "3m", "6m", "y"],
          labels: {
            total: "Total Transactions",
            COMPLETED: "Completed",
            FAILED: "Failed",
            PENDING: "Pending",
            PROCESSING: "Processing",
          },
        },
      ],
    },
  ] as AnalyticsConfig;
}
