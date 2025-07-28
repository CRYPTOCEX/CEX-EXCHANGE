"use client";

import { useState, useEffect } from "react";
import { AlertTriangle, Bell, Info } from "lucide-react";
import { useTranslations } from "next-intl";

interface Alert {
  id: string;
  symbol: string;
  condition: "above" | "below";
  price: number;
  createdAt: string;
  triggered: boolean;
}

export default function AlertsPanel() {
  const t = useTranslations("trade/components/alerts/alerts-panel");
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);

  // Mock alerts data
  const mockAlerts: Alert[] = [
    {
      id: "1",
      symbol: "BTC/USDT",
      condition: "above",
      price: 48500,
      createdAt: "2023-05-01T12:00:00Z",
      triggered: false,
    },
    {
      id: "2",
      symbol: "ETH/USDT",
      condition: "below",
      price: 3200,
      createdAt: "2023-05-01T13:30:00Z",
      triggered: true,
    },
    {
      id: "3",
      symbol: "SOL/USDT",
      condition: "above",
      price: 120,
      createdAt: "2023-05-01T14:45:00Z",
      triggered: false,
    },
    {
      id: "4",
      symbol: "XRP/USDT",
      condition: "below",
      price: 0.5,
      createdAt: "2023-05-01T15:15:00Z",
      triggered: false,
    },
  ];

  useEffect(() => {
    // Simulate loading alerts data
    const timer = setTimeout(() => {
      setAlerts(mockAlerts);
      setLoading(false);
    }, 1000);

    return () => clearTimeout(timer);
  }, []);

  const removeAlert = (id: string) => {
    setAlerts((prev) => prev.filter((alert) => alert.id !== id));
  };

  const dismissAlert = (id: string) => {
    setAlerts((prev) =>
      prev.map((alert) =>
        alert.id === id ? { ...alert, triggered: false } : alert
      )
    );
  };

  return (
    <div className="flex flex-col h-full w-full p-4 bg-zinc-950 text-zinc-300">
      <h3 className="text-sm font-medium mb-3">{t("market_alerts")}</h3>
      <div className="flex-1 overflow-y-auto">
        <div className="space-y-3">
          <div className="flex items-start gap-2 p-2 rounded bg-zinc-900">
            <AlertTriangle className="h-4 w-4 text-amber-500 mt-0.5" />
            <div>
              <p className="text-sm font-medium">{t("price_alert")}</p>
              <p className="text-xs text-zinc-400">
                {t("btc_usd_crossed_above_$50000")}
              </p>
            </div>
          </div>
          <div className="flex items-start gap-2 p-2 rounded bg-zinc-900">
            <Info className="h-4 w-4 text-blue-500 mt-0.5" />
            <div>
              <p className="text-sm font-medium">{t("market_update")}</p>
              <p className="text-xs text-zinc-400">
                {t("trading_volume_increased_by_25%")}
              </p>
            </div>
          </div>
          <div className="flex items-start gap-2 p-2 rounded bg-zinc-900">
            <Bell className="h-4 w-4 text-green-500 mt-0.5" />
            <div>
              <p className="text-sm font-medium">{t("position_alert")}</p>
              <p className="text-xs text-zinc-400">
                {t("take_profit_triggered_on_eth_usd")}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
