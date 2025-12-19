"use client";

import React, { useCallback } from "react";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { TrendingUp, Activity } from "lucide-react";
import { EditorProps } from "./types";

export const TickerSectionEditor = React.memo(function TickerSectionEditor({
  variables,
  getValue,
  updateVariable
}: EditorProps) {
  const handleEnabledChange = useCallback((checked: boolean) => {
    updateVariable('ticker.enabled', checked);
  }, [updateVariable]);

  const isEnabled = getValue('ticker.enabled') !== false;

  return (
    <div className="space-y-6">
      <div className="p-4 border rounded-lg">
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <TrendingUp className="w-5 h-5" />
          Live Ticker Settings
        </h3>

        <div className="flex items-center justify-between">
          <div>
            <Label htmlFor="ticker-enabled" className="text-base font-medium">
              Show Live Ticker
            </Label>
            <p className="text-sm text-muted-foreground mt-1">
              Display scrolling live market prices below the hero section
            </p>
          </div>
          <Switch
            id="ticker-enabled"
            checked={isEnabled}
            onCheckedChange={handleEnabledChange}
          />
        </div>
      </div>

      {/* Preview */}
      <div className="p-4 border rounded-lg bg-gradient-to-br from-zinc-900/50 to-zinc-800/50">
        <h4 className="text-sm font-medium mb-4 text-muted-foreground">Ticker Preview</h4>

        {isEnabled ? (
          <div className="relative overflow-hidden rounded-xl py-4 bg-black/30">
            <div className="flex gap-6 animate-pulse">
              {['BTC', 'ETH', 'SOL', 'XRP'].map((symbol) => (
                <div key={symbol} className="flex items-center gap-3 px-4 py-2 rounded-xl bg-white/5 border border-white/10 shrink-0">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-orange-400 to-orange-600 flex items-center justify-center text-white text-xs font-bold">
                    {symbol[0]}
                  </div>
                  <div>
                    <div className="font-semibold text-sm">{symbol}</div>
                    <div className="text-xs text-muted-foreground font-mono">$0.00</div>
                  </div>
                  <span className="text-xs font-semibold px-2 py-0.5 rounded-full text-emerald-400 bg-emerald-500/15">
                    +0.00%
                  </span>
                </div>
              ))}
            </div>
            <div className="absolute left-0 top-0 bottom-0 w-16 bg-gradient-to-r from-zinc-900/80 to-transparent" />
            <div className="absolute right-0 top-0 bottom-0 w-16 bg-gradient-to-l from-zinc-900/80 to-transparent" />
          </div>
        ) : (
          <div className="flex items-center justify-center h-20 rounded-xl bg-black/30 border border-dashed border-white/10">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Activity className="w-5 h-5" />
              <span>Ticker is disabled</span>
            </div>
          </div>
        )}

        <p className="text-xs text-muted-foreground mt-3 text-center">
          {isEnabled
            ? "The ticker shows real-time market data from enabled exchanges"
            : "Enable the ticker to show live market prices"
          }
        </p>
      </div>
    </div>
  );
});
