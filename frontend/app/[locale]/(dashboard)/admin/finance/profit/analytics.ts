import { AnalyticsConfig } from "@/components/blocks/data-table/types/analytics";

export const adminProfitAnalytics: AnalyticsConfig = [
  // Row 1: KPI Cards for overall and selected transaction types
  [
    {
      type: "kpi",
      // Adjust layout as needed; here we use 4 items in a 2x2 grid.
      layout: { cols: 2, rows: 2 },
      items: [
        {
          id: "total_transactions",
          title: "Total Transactions",
          metric: "total", // Automatically computed as COUNT(*)
          model: "adminProfit",
          icon: "Cash",
        },
        {
          id: "deposit_transactions",
          title: "Deposits",
          metric: "DEPOSIT",
          model: "adminProfit",
          aggregation: { field: "type", value: "DEPOSIT" },
          icon: "mdi:bank-transfer-in",
        },
        {
          id: "withdraw_transactions",
          title: "Withdrawals",
          metric: "WITHDRAW",
          model: "adminProfit",
          aggregation: { field: "type", value: "WITHDRAW" },
          icon: "mdi:bank-transfer-out",
        },
        {
          id: "investment_transactions",
          title: "Investments",
          metric: "INVESTMENT",
          model: "adminProfit",
          aggregation: { field: "type", value: "INVESTMENT" },
          icon: "mdi:chart-line",
        },
      ],
    },
    {
      type: "chart",
      items: [
        {
          id: "transactionTypeDistribution",
          title: "Transaction Type Distribution",
          type: "pie",
          model: "adminProfit",
          // List all transaction type metrics so that the aggregator
          // computes the count for each.
          metrics: [
            "DEPOSIT",
            "WITHDRAW",
            "TRANSFER",
            "BINARY_ORDER",
            "EXCHANGE_ORDER",
            "INVESTMENT",
            "AI_INVESTMENT",
            "FOREX_DEPOSIT",
            "FOREX_WITHDRAW",
            "FOREX_INVESTMENT",
            "ICO_CONTRIBUTION",
            "STAKING",
            "P2P_TRADE",
          ],
          config: {
            // Use the "type" column for grouping.
            field: "type",
            status: [
              {
                value: "DEPOSIT",
                label: "Deposits",
                color: "green",
                icon: "mdi:bank-transfer-in",
              },
              {
                value: "WITHDRAW",
                label: "Withdrawals",
                color: "red",
                icon: "mdi:bank-transfer-out",
              },
              {
                value: "TRANSFER",
                label: "Transfers",
                color: "blue",
                icon: "mdi:transfer",
              },
              {
                value: "BINARY_ORDER",
                label: "Binary Orders",
                color: "purple",
                icon: "mdi:chart-bell-curve-cumulative",
              },
              {
                value: "EXCHANGE_ORDER",
                label: "Exchange Orders",
                color: "teal",
                icon: "mdi:chart-bar",
              },
              {
                value: "INVESTMENT",
                label: "Investments",
                color: "amber",
                icon: "mdi:chart-line",
              },
              {
                value: "AI_INVESTMENT",
                label: "AI Investments",
                color: "orange",
                icon: "mdi:robot",
              },
              {
                value: "FOREX_DEPOSIT",
                label: "Forex Deposits",
                color: "indigo",
                icon: "mdi:currency-usd",
              },
              {
                value: "FOREX_WITHDRAW",
                label: "Forex Withdrawals",
                color: "pink",
                icon: "mdi:currency-usd-off",
              },
              {
                value: "FOREX_INVESTMENT",
                label: "Forex Investments",
                color: "cyan",
                icon: "mdi:finance",
              },
              {
                value: "ICO_CONTRIBUTION",
                label: "ICO Contributions",
                color: "brown",
                icon: "mdi:currency-eur",
              },
              {
                value: "STAKING",
                label: "Staking",
                color: "lime",
                icon: "mdi:wallet",
              },
              {
                value: "P2P_TRADE",
                label: "P2P Trades",
                color: "grey",
                icon: "mdi:swap-horizontal",
              },
            ],
          },
        },
      ],
    },
  ],
  // Row 2: Pie Chart for full transaction type distribution

  // Row 3: Line Chart for transactions over time (trend analysis)
  [
    {
      type: "chart",
      items: [
        {
          id: "transactionsOverTime",
          title: "Transactions Over Time",
          type: "line",
          model: "adminProfit",
          // Display total transactions plus all individual types.
          metrics: [
            "total",
            "DEPOSIT",
            "WITHDRAW",
            "TRANSFER",
            "BINARY_ORDER",
            "EXCHANGE_ORDER",
            "INVESTMENT",
            "AI_INVESTMENT",
            "FOREX_DEPOSIT",
            "FOREX_WITHDRAW",
            "FOREX_INVESTMENT",
            "ICO_CONTRIBUTION",
            "STAKING",
            "P2P_TRADE",
          ],
          timeframes: ["24h", "7d", "30d", "3m", "6m", "y"],
          labels: {
            total: "Total",
            DEPOSIT: "Deposits",
            WITHDRAW: "Withdrawals",
            TRANSFER: "Transfers",
            BINARY_ORDER: "Binary Orders",
            EXCHANGE_ORDER: "Exchange Orders",
            INVESTMENT: "Investments",
            AI_INVESTMENT: "AI Investments",
            FOREX_DEPOSIT: "Forex Deposits",
            FOREX_WITHDRAW: "Forex Withdrawals",
            FOREX_INVESTMENT: "Forex Investments",
            ICO_CONTRIBUTION: "ICO Contributions",
            STAKING: "Staking",
            P2P_TRADE: "P2P Trades",
          },
        },
      ],
    },
  ],
];
