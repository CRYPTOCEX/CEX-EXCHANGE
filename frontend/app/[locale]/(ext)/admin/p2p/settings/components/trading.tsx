"use client";

import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { useTranslations } from "next-intl";

interface P2PTradingSettingsSectionProps {
  settings?: {
    DefaultEscrowTime?: number;
    DefaultPaymentWindow?: number;
    AutoCancelUnpaidTrades?: boolean;
    MaximumTradeAmount?: number;
    MinimumTradeAmount?: number;
  };
  onUpdate: (key: string, value: any) => void;
}

export default function P2PTradingSettingsSection({
  settings = {},
  onUpdate,
}: P2PTradingSettingsSectionProps) {
  const t = useTranslations("ext");
  const safeSettings = {
    DefaultEscrowTime: settings.DefaultEscrowTime ?? 30,
    DefaultPaymentWindow: settings.DefaultPaymentWindow ?? 15,
    AutoCancelUnpaidTrades: settings.AutoCancelUnpaidTrades ?? true,
    MaximumTradeAmount: settings.MaximumTradeAmount ?? 100000,
    MinimumTradeAmount: settings.MinimumTradeAmount ?? 10,
  };

  return (
    <Card>
      <CardContent className="space-y-6 pt-6">
        {/* Row for Time Settings */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <Label htmlFor="defaultEscrowTime">
              {t("default_escrow_time_(minutes)")}
            </Label>
            <Input
              id="defaultEscrowTime"
              type="number"
              value={safeSettings.DefaultEscrowTime}
              onChange={(e) =>
                onUpdate("DefaultEscrowTime", Number(e.target.value))
              }
              placeholder="Enter default escrow time"
              min="1"
              max="1440"
            />
            <p className="text-xs text-muted-foreground">
              {t("the_default_time_a_trade")}.
            </p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="defaultPaymentWindow">
              {t("default_payment_window_(minutes)")}
            </Label>
            <Input
              id="defaultPaymentWindow"
              type="number"
              value={safeSettings.DefaultPaymentWindow}
              onChange={(e) =>
                onUpdate("DefaultPaymentWindow", Number(e.target.value))
              }
              placeholder="Enter payment window time"
              min="1"
              max="1440"
            />
            <p className="text-xs text-muted-foreground">
              {t("the_time_buyers_automatically_cancelled")}.
            </p>
          </div>
        </div>

        {/* Row for Amount Settings */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <Label htmlFor="minimumTradeAmount">
              {t("minimum_trade_amount_($)")}
            </Label>
            <Input
              id="minimumTradeAmount"
              type="number"
              value={safeSettings.MinimumTradeAmount}
              onChange={(e) =>
                onUpdate("MinimumTradeAmount", Number(e.target.value))
              }
              placeholder="Enter minimum trade amount"
              min="0"
              step="0.01"
            />
            <p className="text-xs text-muted-foreground">
              {t("the_minimum_amount_allowed_for_a_p2p_trade")}.
            </p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="maximumTradeAmount">
              {t("maximum_trade_amount_($)")}
            </Label>
            <Input
              id="maximumTradeAmount"
              type="number"
              value={safeSettings.MaximumTradeAmount}
              onChange={(e) =>
                onUpdate("MaximumTradeAmount", Number(e.target.value))
              }
              placeholder="Enter maximum trade amount"
              min="0"
              step="0.01"
            />
            <p className="text-xs text-muted-foreground">
              {t("the_maximum_amount_allowed_for_a_p2p_trade")}.
            </p>
          </div>
        </div>

        {/* Switches for Trading Settings */}
        <div className="space-y-4">
          <div className="flex items-center justify-between border p-4 rounded-lg">
            <div className="space-y-0.5">
              <span className="text-sm font-medium">
                {t("auto-cancel_unpaid_trades")}
              </span>
              <p className="text-xs text-muted-foreground">
                {t("automatically_cancel_trades_payment_window")}.
              </p>
            </div>
            <Switch
              id="autoCancelUnpaidTrades"
              checked={safeSettings.AutoCancelUnpaidTrades}
              onCheckedChange={(checked) =>
                onUpdate("AutoCancelUnpaidTrades", checked)
              }
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
