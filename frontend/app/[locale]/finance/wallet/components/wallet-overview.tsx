"use client";

import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import { useWalletStore } from "@/store/finance/wallet-store";
import { formatCurrency } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";
import { useTranslations } from "next-intl";

export function WalletOverview() {
  const t = useTranslations("finance/wallet/components/wallet-overview");
  const {
    fiatWallets = [],
    spotWallets = [],
    ecoWallets = [],
    futuresWallets = [],
    isLoading,
  } = useWalletStore();

  const wallets = [
    ...(Array.isArray(fiatWallets) ? fiatWallets : []),
    ...(Array.isArray(spotWallets) ? spotWallets : []),
    ...(Array.isArray(ecoWallets) ? ecoWallets : []),
    ...(Array.isArray(futuresWallets) ? futuresWallets : []),
  ];

  const walletTypeColors = {
    FIAT: "#22c55e",
    SPOT: "#3b82f6",
    ECO: "#a855f7",
    FUTURES: "#f59e0b",
  };

  if (isLoading) {
    return (
      <div className="space-y-3 sm:space-y-4">
        <div className="h-[180px] sm:h-[200px] flex items-center justify-center">
          <Skeleton className="h-[180px] w-[180px] sm:h-[200px] sm:w-[200px] rounded-full" />
        </div>
        <div className="grid grid-cols-2 gap-2">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="flex items-center p-2 rounded-lg">
              <Skeleton className="w-2 h-2 sm:w-3 sm:h-3 rounded-full mr-2" />
              <div className="flex flex-col flex-1">
                <Skeleton className="h-3 sm:h-4 w-12 sm:w-16 mb-1" />
                <Skeleton className="h-2 sm:h-3 w-16 sm:w-24" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (wallets.length === 0) {
    return (
      <div className="h-[180px] sm:h-[200px] flex items-center justify-center flex-col text-center p-4">
        <p className="text-sm text-muted-foreground mb-2">
          {t("no_wallet_data_available")}
        </p>
        <p className="text-xs sm:text-sm text-muted-foreground">
          {t("add_funds_to_your_wallets_to_see_the_distribution")}
        </p>
      </div>
    );
  }

  const walletsByType = wallets.reduce(
    (acc, wallet) => {
      const type = wallet.type || "UNKNOWN";
      if (!acc[type]) {
        acc[type] = 0;
      }
      acc[type] += typeof wallet.balance === "number" ? wallet.balance : 0;
      return acc;
    },
    {} as Record<string, number>
  );

  if (Object.keys(walletsByType).length === 0) {
    return (
      <div className="h-[180px] sm:h-[200px] flex items-center justify-center flex-col text-center p-4">
        <p className="text-sm text-muted-foreground mb-2">
          {t("no_balance_data_available")}
        </p>
        <p className="text-xs sm:text-sm text-muted-foreground">
          {t("add_funds_to_your_wallets_to_see_the_distribution")}
        </p>
      </div>
    );
  }

  const data = Object.entries(walletsByType).map(([type, balance]) => ({
    name: type,
    value: balance,
    color: walletTypeColors[type as keyof typeof walletTypeColors] || "#9ca3af",
  }));

  const totalBalance = wallets.reduce(
    (sum, wallet) =>
      sum + (typeof wallet.balance === "number" ? wallet.balance : 0),
    0
  );

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0];
      const total = payload[0].payload.value;
      const percentage =
        totalBalance > 0 ? Math.round((total / totalBalance) * 100) : 0;
      return (
        <div className="bg-white dark:bg-gray-800 p-3 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg">
          <p className="text-sm font-medium">{`${data.payload.name}: ${total} (${percentage}%)`}</p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="space-y-3 sm:space-y-4">
      <div className="h-[180px] sm:h-[200px] relative">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={60}
              outerRadius={80}
              paddingAngle={2}
              dataKey="value"
            >
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip content={<CustomTooltip />} />
          </PieChart>
        </ResponsiveContainer>
        <div className="absolute inset-0 flex items-center justify-center flex-col">
          <span className="text-xs sm:text-sm text-muted-foreground">
            {t("Total")}
          </span>
          <span className="text-base sm:text-xl font-bold">{totalBalance}</span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-1 sm:gap-2">
        {Object.entries(walletsByType).map(([type, balance]) => (
          <div key={type} className="flex items-center p-1.5 sm:p-2 rounded-lg">
            <div
              className="w-2 h-2 sm:w-3 sm:h-3 rounded-full mr-1.5 sm:mr-2"
              style={{
                backgroundColor:
                  walletTypeColors[type as keyof typeof walletTypeColors] ||
                  "#9ca3af",
              }}
            ></div>
            <div className="flex flex-col">
              <span className="text-[10px] sm:text-xs font-medium">{type}</span>
              <span className="text-[10px] sm:text-xs text-muted-foreground">
                {String(balance)}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
