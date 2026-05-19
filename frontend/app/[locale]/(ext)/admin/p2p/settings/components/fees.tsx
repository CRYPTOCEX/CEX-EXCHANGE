"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Plus, Trash2 } from "lucide-react";

interface P2PFeesSettingsSectionProps {
  settings?: {
    MakerFee?: number;
    TakerFee?: number;
    DisputeFeePercent?: number;
    EscrowReleaseTime?: string;
    MinimumTradeAmounts?: { [currency: string]: number };
    AutoReleaseEscrow?: boolean;
  };
  onUpdate: (key: string, value: any) => void;
}

export default function P2PFeesSettingsSection({
  settings = {},
  onUpdate,
}: P2PFeesSettingsSectionProps) {
  const t = useTranslations("ext_admin");
  const tCommon = useTranslations("common");
  const safeSettings = {
    MakerFee: settings.MakerFee ?? 0.1,
    TakerFee: settings.TakerFee ?? 0.2,
    DisputeFeePercent: settings.DisputeFeePercent ?? 1,
    EscrowReleaseTime: settings.EscrowReleaseTime ?? "00:00",
    MinimumTradeAmounts: settings.MinimumTradeAmounts ?? {
      BTC: 0.00005,
      ETH: 0.001,
      LTC: 0.01,
      BCH: 0.001,
      DOGE: 10,
    },
    AutoReleaseEscrow: settings.AutoReleaseEscrow ?? true,
  };

  // State for adding new currency minimums
  const [newCurrency, setNewCurrency] = useState("");
  const [newMinimum, setNewMinimum] = useState("");

  const handleAddCurrency = () => {
    if (newCurrency && newMinimum && parseFloat(newMinimum) > 0) {
      const updated = {
        ...safeSettings.MinimumTradeAmounts,
        [newCurrency.toUpperCase()]: parseFloat(newMinimum),
      };
      onUpdate("MinimumTradeAmounts", updated);
      setNewCurrency("");
      setNewMinimum("");
    }
  };

  const handleRemoveCurrency = (currency: string) => {
    const updated = { ...safeSettings.MinimumTradeAmounts };
    delete updated[currency];
    onUpdate("MinimumTradeAmounts", updated);
  };

  const handleUpdateCurrencyMinimum = (currency: string, value: number) => {
    const updated = {
      ...safeSettings.MinimumTradeAmounts,
      [currency]: value,
    };
    onUpdate("MinimumTradeAmounts", updated);
  };

  return (
    <Card>
      <CardContent className="space-y-6 pt-6">
        {/* Row for Fee Settings */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <Label htmlFor="makerFee">{`${tCommon("maker_fee")} (%)`}</Label>
            <Input
              id="makerFee"
              type="number"
              value={safeSettings.MakerFee}
              onChange={(e) => onUpdate("MakerFee", Number(e.target.value))}
              placeholder="Enter maker fee percentage"
              min="0"
              max="100"
              step="0.01"
            />
            <p className="text-xs text-muted-foreground">
              {t("fee_charged_to_users_who_create_offers_makers")} (makers).
            </p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="takerFee">{`${tCommon("taker_fee")} (%)`}</Label>
            <Input
              id="takerFee"
              type="number"
              value={safeSettings.TakerFee}
              onChange={(e) => onUpdate("TakerFee", Number(e.target.value))}
              placeholder="Enter taker fee percentage"
              min="0"
              max="100"
              step="0.01"
            />
            <p className="text-xs text-muted-foreground">
              {t("fee_charged_to_users_who_accept_offers_takers")} (takers).
            </p>
          </div>
        </div>

        {/* Row for Additional Fee Settings */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <Label htmlFor="disputeFeePercent">{`${t("dispute_fee")} (%)`}</Label>
            <Input
              id="disputeFeePercent"
              type="number"
              value={safeSettings.DisputeFeePercent}
              onChange={(e) =>
                onUpdate("DisputeFeePercent", Number(e.target.value))
              }
              placeholder="Enter dispute fee percentage"
              min="0"
              max="100"
              step="0.01"
            />
            <p className="text-xs text-muted-foreground">
              {t("fee_charged_when_a_user_loses_a_dispute_case")}.
            </p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="escrowReleaseTime">
              {t("escrow_release_time")}
            </Label>
            <Input
              id="escrowReleaseTime"
              type="time"
              value={safeSettings.EscrowReleaseTime}
              onChange={(e) => onUpdate("EscrowReleaseTime", e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              {t("the_time_when_processed_daily")}.
            </p>
          </div>
        </div>

        {/* Auto-Release Escrow Toggle */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="autoReleaseEscrow">
                {t("automatic_escrow_release")}
              </Label>
              <p className="text-xs text-muted-foreground">
                Automatically release escrow funds after the payment window expires. When disabled, funds must be manually released by seller or admin.
              </p>
            </div>
            <Switch
              id="autoReleaseEscrow"
              checked={safeSettings.AutoReleaseEscrow}
              onCheckedChange={(checked) =>
                onUpdate("AutoReleaseEscrow", checked)
              }
            />
          </div>
        </div>

        {/* Minimum Trade Amounts Section */}
        <div className="space-y-4 border-t pt-6">
          <div className="space-y-2">
            <Label>Minimum Trade Amounts per Currency</Label>
            <p className="text-xs text-muted-foreground">
              Set minimum trade amounts to prevent crypto dust issues (like BTC UTXO consolidation problems). These minimums ensure trades are large enough to be economically viable.
            </p>
          </div>

          {/* Existing Currency Minimums */}
          <div className="space-y-3">
            {Object.entries(safeSettings.MinimumTradeAmounts).map(
              ([currency, minimum]) => (
                <div
                  key={currency}
                  className="flex items-center gap-3 p-3 rounded-lg border bg-muted/50"
                >
                  <div className="flex-1 grid grid-cols-2 gap-3">
                    <div>
                      <Label className="text-xs text-muted-foreground">
                        Currency
                      </Label>
                      <p className="font-medium">{currency}</p>
                    </div>
                    <div>
                      <Label
                        htmlFor={`min-${currency}`}
                        className="text-xs text-muted-foreground"
                      >
                        Minimum Amount
                      </Label>
                      <Input
                        id={`min-${currency}`}
                        type="number"
                        value={minimum}
                        onChange={(e) =>
                          handleUpdateCurrencyMinimum(
                            currency,
                            parseFloat(e.target.value) || 0
                          )
                        }
                        min="0"
                        step="0.00000001"
                        className="mt-1"
                      />
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleRemoveCurrency(currency)}
                    className="text-destructive hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              )
            )}
          </div>

          {/* Add New Currency Minimum */}
          <div className="flex items-end gap-3 p-3 rounded-lg border bg-muted/30">
            <div className="flex-1 grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="newCurrency" className="text-xs">
                  Currency Code
                </Label>
                <Input
                  id="newCurrency"
                  type="text"
                  value={newCurrency}
                  onChange={(e) => setNewCurrency(e.target.value.toUpperCase())}
                  placeholder="e.g., BTC, ETH"
                  maxLength={10}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="newMinimum" className="text-xs">
                  Minimum Amount
                </Label>
                <Input
                  id="newMinimum"
                  type="number"
                  value={newMinimum}
                  onChange={(e) => setNewMinimum(e.target.value)}
                  placeholder="0.00005"
                  min="0"
                  step="0.00000001"
                />
              </div>
            </div>
            <Button
              variant="default"
              size="icon"
              onClick={handleAddCurrency}
              disabled={!newCurrency || !newMinimum}
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
