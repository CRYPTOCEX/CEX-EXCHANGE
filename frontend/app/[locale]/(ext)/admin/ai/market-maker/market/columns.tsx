import { ChartLine, Activity, Wallet, Bot, DollarSign, Percent, TrendingUp } from "lucide-react";
import { StatusBadge } from "../components/StatusBadge";

export const columns: ColumnDefinition[] = [
  {
    key: "market",
    title: "Market",
    type: "compound",
    icon: ChartLine,
    sortable: true,
    searchable: true,
    filterable: true,
    description: "Trading market symbol",
    priority: 1,
    render: {
      type: "compound",
      config: {
        primary: {
          key: "symbol",
          title: "Symbol",
          description: "Market symbol",
        },
        secondary: {
          key: "pair",
          title: "Pair",
          description: "Trading pair",
          render: (value: string, row: any) => {
            const market = row.market;
            return market ? `${market.currency}/${market.pair}` : "-";
          },
        },
      },
    },
  },
  {
    key: "status",
    title: "Status",
    type: "select",
    icon: Activity,
    sortable: true,
    searchable: true,
    filterable: true,
    description: "Market maker status",
    render: {
      type: "custom",
      render: (value: string) => <StatusBadge status={value} />,
    },
    options: [
      { value: "ACTIVE", label: "Active" },
      { value: "PAUSED", label: "Paused" },
      { value: "STOPPED", label: "Stopped" },
      { value: "INITIALIZING", label: "Initializing" },
    ],
  },
  {
    key: "targetPrice",
    title: "Target Price",
    type: "number",
    icon: DollarSign,
    sortable: true,
    searchable: false,
    filterable: false,
    description: "Target price for the market maker",
    render: {
      type: "custom",
      render: (value: string, row: any) => `${Number(value).toFixed(6)} ${row.market?.pair || ""}`,
    },
  },
  {
    key: "pool.totalValueLocked",
    title: "TVL",
    type: "number",
    icon: Wallet,
    sortable: true,
    searchable: false,
    filterable: false,
    description: "Total Value Locked in the pool",
    render: {
      type: "custom",
      render: (value: string, row: any) => {
        const tvl = row.pool?.totalValueLocked || 0;
        return `${Number(tvl).toLocaleString()} ${row.market?.pair || ""}`;
      },
    },
  },
  {
    key: "currentDailyVolume",
    title: "24h Volume",
    type: "number",
    icon: TrendingUp,
    sortable: true,
    searchable: false,
    filterable: false,
    description: "Current daily trading volume",
    render: {
      type: "custom",
      render: (value: string, row: any) => `${Number(value || 0).toLocaleString()} ${row.market?.pair || ""}`,
    },
  },
  {
    key: "activeBots",
    title: "Active Bots",
    type: "number",
    icon: Bot,
    sortable: true,
    searchable: false,
    filterable: false,
    description: "Number of active trading bots",
    expandedOnly: true,
  },
  {
    key: "realLiquidityPercent",
    title: "Real Liquidity",
    type: "number",
    icon: Percent,
    sortable: true,
    searchable: false,
    filterable: false,
    description: "Percentage of real liquidity",
    render: {
      type: "custom",
      render: (value: number) => `${value || 0}%`,
    },
    expandedOnly: true,
  },
  {
    key: "pnl",
    title: "P&L",
    type: "number",
    icon: DollarSign,
    sortable: false,
    searchable: false,
    filterable: false,
    description: "Total Profit & Loss",
    render: {
      type: "custom",
      render: (value: any, row: any) => {
        const pnl = Number(row.pool?.realizedPnL || 0) + Number(row.pool?.unrealizedPnL || 0);
        const isPositive = pnl >= 0;
        return (
          <span className={isPositive ? "text-green-500" : "text-red-500"}>
            {isPositive ? "+" : ""}{pnl.toFixed(2)} {row.market?.pair || ""}
          </span>
        );
      },
    },
  },
  {
    key: "createdAt",
    title: "Created",
    type: "date",
    sortable: true,
    searchable: false,
    filterable: false,
    description: "Creation date",
    render: {
      type: "date",
      format: "PPP",
    },
    priority: 3,
    expandedOnly: true,
  },
];
