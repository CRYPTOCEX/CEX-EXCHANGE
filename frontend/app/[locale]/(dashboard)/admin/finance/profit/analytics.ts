"use client";
import { AnalyticsConfig } from "@/components/blocks/data-table/types/analytics";
import { useTranslations } from "next-intl";

export function useAnalytics() {
  const tCommon = useTranslations("common");

  return [
    // ─────────────────────────────────────────────────────────────
    // Group 1: Overview KPIs & Financial Metrics
    // ─────────────────────────────────────────────────────────────
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
          id: "total_profit_transactions",
          title: tCommon("total_transactions"),
          metric: "total",
          model: "adminProfit",
          icon: "mdi:receipt-text",
        },
        {
          id: "total_profit_amount",
          title: "Total Profit Amount",
          metric: "amount",
          model: "adminProfit",
          icon: "mdi:cash-multiple",
        },
        {
          id: "average_profit",
          title: "Average Profit",
          metric: "average",
          model: "adminProfit",
          icon: "mdi:calculator",
        },
        {
          id: "unique_currencies",
          title: "Unique Currencies",
          metric: "currency",
          model: "adminProfit",
          icon: "mdi:currency-usd",
        },
      ],
    },

    // ─────────────────────────────────────────────────────────────
    // Group 2: Core Transaction Types – KPI Grid & Pie Chart
    // ─────────────────────────────────────────────────────────────
    [
      {
        type: "kpi",
        layout: { cols: 3, rows: 2 },
        responsive: {
          mobile: { cols: 1, rows: 6, span: 1 },
          tablet: { cols: 2, rows: 3, span: 2 },
          desktop: { cols: 3, rows: 2, span: 2 },
        },
        items: [
          {
            id: "deposit_profit",
            title: tCommon("deposits"),
            metric: "DEPOSIT",
            model: "adminProfit",
            aggregation: { field: "type", value: "DEPOSIT" },
            icon: "mdi:bank-transfer-in",
          },
          {
            id: "withdraw_profit",
            title: tCommon("withdrawals"),
            metric: "WITHDRAW",
            model: "adminProfit",
            aggregation: { field: "type", value: "WITHDRAW" },
            icon: "mdi:bank-transfer-out",
          },
          {
            id: "transfer_profit",
            title: "Transfers",
            metric: "TRANSFER",
            model: "adminProfit",
            aggregation: { field: "type", value: "TRANSFER" },
            icon: "mdi:transfer",
          },
          {
            id: "binary_order_profit",
            title: "Binary Orders",
            metric: "BINARY_ORDER",
            model: "adminProfit",
            aggregation: { field: "type", value: "BINARY_ORDER" },
            icon: "mdi:chart-timeline-variant",
          },
          {
            id: "exchange_order_profit",
            title: "Exchange Orders",
            metric: "EXCHANGE_ORDER",
            model: "adminProfit",
            aggregation: { field: "type", value: "EXCHANGE_ORDER" },
            icon: "mdi:swap-horizontal",
          },
          {
            id: "investment_profit",
            title: tCommon("investments"),
            metric: "INVESTMENT",
            model: "adminProfit",
            aggregation: { field: "type", value: "INVESTMENT" },
            icon: "mdi:trending-up",
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
            id: "coreTransactionProfitDistribution",
            title: "Core Transaction Profits",
            type: "pie",
            model: "adminProfit",
            metrics: [
              "DEPOSIT",
              "WITHDRAW",
              "TRANSFER",
              "BINARY_ORDER",
              "EXCHANGE_ORDER",
              "INVESTMENT",
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
                  value: "TRANSFER",
                  label: "Transfer",
                  color: "blue",
                  icon: "mdi:transfer",
                },
                {
                  value: "BINARY_ORDER",
                  label: "Binary Order",
                  color: "purple",
                  icon: "mdi:chart-timeline-variant",
                },
                {
                  value: "EXCHANGE_ORDER",
                  label: "Exchange Order",
                  color: "cyan",
                  icon: "mdi:swap-horizontal",
                },
                {
                  value: "INVESTMENT",
                  label: "Investment",
                  color: "amber",
                  icon: "mdi:trending-up",
                },
              ],
            },
          },
        ],
      },
    ],

    // ─────────────────────────────────────────────────────────────
    // Group 3: AI & Forex Profits – KPI Grid & Pie Chart
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
            id: "ai_investment_profit",
            title: "AI Investments",
            metric: "AI_INVESTMENT",
            model: "adminProfit",
            aggregation: { field: "type", value: "AI_INVESTMENT" },
            icon: "mdi:robot",
          },
          {
            id: "forex_deposit_profit",
            title: "Forex Deposits",
            metric: "FOREX_DEPOSIT",
            model: "adminProfit",
            aggregation: { field: "type", value: "FOREX_DEPOSIT" },
            icon: "mdi:bank-plus",
          },
          {
            id: "forex_withdraw_profit",
            title: "Forex Withdrawals",
            metric: "FOREX_WITHDRAW",
            model: "adminProfit",
            aggregation: { field: "type", value: "FOREX_WITHDRAW" },
            icon: "mdi:bank-minus",
          },
          {
            id: "forex_investment_profit",
            title: "Forex Investments",
            metric: "FOREX_INVESTMENT",
            model: "adminProfit",
            aggregation: { field: "type", value: "FOREX_INVESTMENT" },
            icon: "mdi:currency-usd",
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
            id: "aiForexProfitDistribution",
            title: "AI & Forex Profit Distribution",
            type: "pie",
            model: "adminProfit",
            metrics: [
              "AI_INVESTMENT",
              "FOREX_DEPOSIT",
              "FOREX_WITHDRAW",
              "FOREX_INVESTMENT",
            ],
            config: {
              field: "type",
              status: [
                {
                  value: "AI_INVESTMENT",
                  label: "AI Investment",
                  color: "purple",
                  icon: "mdi:robot",
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
                {
                  value: "FOREX_INVESTMENT",
                  label: "Forex Investment",
                  color: "amber",
                  icon: "mdi:currency-usd",
                },
              ],
            },
          },
        ],
      },
    ],

    // ─────────────────────────────────────────────────────────────
    // Group 4: Platform Features Profits – KPI Grid & Pie Chart
    // ─────────────────────────────────────────────────────────────
    [
      {
        type: "kpi",
        layout: { cols: 5, rows: 1 },
        responsive: {
          mobile: { cols: 1, rows: 5, span: 1 },
          tablet: { cols: 2, rows: 3, span: 2 },
          desktop: { cols: 5, rows: 1, span: 2 },
        },
        items: [
          {
            id: "ico_contribution_profit",
            title: "ICO Contributions",
            metric: "ICO_CONTRIBUTION",
            model: "adminProfit",
            aggregation: { field: "type", value: "ICO_CONTRIBUTION" },
            icon: "mdi:coin",
          },
          {
            id: "staking_profit",
            title: tCommon("staking"),
            metric: "STAKING",
            model: "adminProfit",
            aggregation: { field: "type", value: "STAKING" },
            icon: "mdi:lock",
          },
          {
            id: "p2p_trade_profit",
            title: "P2P Trades",
            metric: "P2P_TRADE",
            model: "adminProfit",
            aggregation: { field: "type", value: "P2P_TRADE" },
            icon: "mdi:handshake",
          },
          {
            id: "nft_sale_profit",
            title: "NFT Sales",
            metric: "NFT_SALE",
            model: "adminProfit",
            aggregation: { field: "type", value: "NFT_SALE" },
            icon: "mdi:tag",
          },
          {
            id: "nft_auction_profit",
            title: "NFT Auctions",
            metric: "NFT_AUCTION",
            model: "adminProfit",
            aggregation: { field: "type", value: "NFT_AUCTION" },
            icon: "mdi:gavel",
          },
        ],
      },
      {
        type: "kpi",
        layout: { cols: 2, rows: 1 },
        responsive: {
          mobile: { cols: 1, rows: 2, span: 1 },
          tablet: { cols: 2, rows: 1, span: 2 },
          desktop: { cols: 2, rows: 1, span: 2 },
        },
        items: [
          {
            id: "nft_offer_profit",
            title: "NFT Offers",
            metric: "NFT_OFFER",
            model: "adminProfit",
            aggregation: { field: "type", value: "NFT_OFFER" },
            icon: "mdi:handshake",
          },
          {
            id: "gateway_payment_profit",
            title: "Gateway Payments",
            metric: "GATEWAY_PAYMENT",
            model: "adminProfit",
            aggregation: { field: "type", value: "GATEWAY_PAYMENT" },
            icon: "mdi:credit-card",
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
            id: "platformFeaturesProfitDistribution",
            title: "Platform Features Profit Distribution",
            type: "pie",
            model: "adminProfit",
            metrics: [
              "ICO_CONTRIBUTION",
              "STAKING",
              "P2P_TRADE",
              "NFT_SALE",
              "NFT_AUCTION",
              "NFT_OFFER",
              "GATEWAY_PAYMENT",
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
                  value: "STAKING",
                  label: "Staking",
                  color: "blue",
                  icon: "mdi:lock",
                },
                {
                  value: "P2P_TRADE",
                  label: "P2P Trade",
                  color: "purple",
                  icon: "mdi:handshake",
                },
                {
                  value: "NFT_SALE",
                  label: "NFT Sale",
                  color: "green",
                  icon: "mdi:tag",
                },
                {
                  value: "NFT_AUCTION",
                  label: "NFT Auction",
                  color: "indigo",
                  icon: "mdi:gavel",
                },
                {
                  value: "NFT_OFFER",
                  label: "NFT Offer",
                  color: "pink",
                  icon: "mdi:handshake",
                },
                {
                  value: "GATEWAY_PAYMENT",
                  label: "Gateway Payment",
                  color: "cyan",
                  icon: "mdi:credit-card",
                },
              ],
            },
          },
        ],
      },
    ],

    // ─────────────────────────────────────────────────────────────
    // Group 5: Profit Trends Over Time – Full-Width Line Chart
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
          id: "profitsOverTime",
          title: "Admin Profits Over Time",
          type: "line",
          model: "adminProfit",
          metrics: [
            "total",
            "DEPOSIT",
            "WITHDRAW",
            "BINARY_ORDER",
            "EXCHANGE_ORDER",
            "INVESTMENT",
            "STAKING",
            "P2P_TRADE",
          ],
          timeframes: ["24h", "7d", "30d", "3m", "6m", "y"],
          labels: {
            total: "Total Profits",
            DEPOSIT: "Deposits",
            WITHDRAW: "Withdrawals",
            BINARY_ORDER: "Binary Orders",
            EXCHANGE_ORDER: "Exchange Orders",
            INVESTMENT: "Investments",
            STAKING: "Staking",
            P2P_TRADE: "P2P Trades",
          },
        },
      ],
    },
  ] as AnalyticsConfig;
}
