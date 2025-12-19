"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Plus, Trash2, Coins } from "lucide-react";
import { CustomComponentProps } from "@/components/admin/settings";

// Default minimum trade amounts
const DEFAULT_MINIMUMS: Record<string, number> = {
  BTC: 0.00005,
  ETH: 0.001,
  LTC: 0.01,
  BCH: 0.001,
  DOGE: 10,
};

export default function MinimumTradeAmountsField({
  formValues,
  handleChange,
}: CustomComponentProps) {
  // Parse the minimum trade amounts from formValues
  const getMinimumAmounts = (): Record<string, number> => {
    const value = formValues.p2pMinimumTradeAmounts;
    if (typeof value === "string") {
      try {
        return JSON.parse(value);
      } catch {
        return DEFAULT_MINIMUMS;
      }
    }
    if (typeof value === "object" && value !== null) {
      return value;
    }
    return DEFAULT_MINIMUMS;
  };

  const minimumAmounts = getMinimumAmounts();
  const [newCurrency, setNewCurrency] = useState("");
  const [newMinimum, setNewMinimum] = useState("");

  const handleAddCurrency = () => {
    if (newCurrency && newMinimum && parseFloat(newMinimum) > 0) {
      const updated = {
        ...minimumAmounts,
        [newCurrency.toUpperCase()]: parseFloat(newMinimum),
      };
      handleChange("p2pMinimumTradeAmounts", JSON.stringify(updated));
      setNewCurrency("");
      setNewMinimum("");
    }
  };

  const handleRemoveCurrency = (currency: string) => {
    const updated = { ...minimumAmounts };
    delete updated[currency];
    handleChange("p2pMinimumTradeAmounts", JSON.stringify(updated));
  };

  const handleUpdateCurrencyMinimum = (currency: string, value: number) => {
    const updated = {
      ...minimumAmounts,
      [currency]: value,
    };
    handleChange("p2pMinimumTradeAmounts", JSON.stringify(updated));
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-4">
        <div className="p-1.5 rounded-md bg-amber-500/10">
          <Coins className="w-4 h-4 text-amber-500" />
        </div>
        <div>
          <Label className="text-sm font-medium">
            Minimum Trade Amounts per Currency
          </Label>
          <p className="text-xs text-muted-foreground">
            Set minimum trade amounts to prevent crypto dust issues. These
            minimums ensure trades are economically viable.
          </p>
        </div>
      </div>

      {/* Existing Currency Minimums */}
      <div className="space-y-3">
        {Object.entries(minimumAmounts).map(([currency, minimum]) => (
          <div
            key={currency}
            className="flex items-center gap-3 p-3 rounded-lg border bg-muted/50"
          >
            <div className="flex-1 grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs text-muted-foreground">Currency</Label>
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
        ))}
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
  );
}
