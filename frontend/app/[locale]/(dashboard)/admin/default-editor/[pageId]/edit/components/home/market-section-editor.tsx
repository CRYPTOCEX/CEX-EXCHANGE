"use client";

import React, { useCallback } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { EditorProps } from "./types";

export const MarketSectionEditor = React.memo(function MarketSectionEditor({
  variables,
  getValue,
  updateVariable
}: EditorProps) {
  const handleTitleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    updateVariable('marketSection.title', e.target.value);
  }, [updateVariable]);

  const handlePriceTitleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    updateVariable('marketSection.priceTitle', e.target.value);
  }, [updateVariable]);

  const handleCapTitleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    updateVariable('marketSection.capTitle', e.target.value);
  }, [updateVariable]);

  const handleChangeTitleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    updateVariable('marketSection.changeTitle', e.target.value);
  }, [updateVariable]);

  const handleViewAllTextChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    updateVariable('marketSection.viewAllText', e.target.value);
  }, [updateVariable]);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 border rounded-lg">
        <h3 className="text-lg font-semibold mb-4 col-span-full">Market Section Labels</h3>

        <div>
          <Label htmlFor="market-title">Section Title</Label>
          <Input
            id="market-title"
            value={getValue('marketSection.title') || ''}
            onChange={handleTitleChange}
            placeholder="e.g., Live Markets"
          />
        </div>

        <div>
          <Label htmlFor="market-price-title">Price Column Label</Label>
          <Input
            id="market-price-title"
            value={getValue('marketSection.priceTitle') || ''}
            onChange={handlePriceTitleChange}
            placeholder="e.g., Price"
          />
        </div>

        <div>
          <Label htmlFor="market-cap-title">Market Cap Column Label</Label>
          <Input
            id="market-cap-title"
            value={getValue('marketSection.capTitle') || ''}
            onChange={handleCapTitleChange}
            placeholder="e.g., Cap"
          />
        </div>

        <div>
          <Label htmlFor="market-change-title">24h Change Column Label</Label>
          <Input
            id="market-change-title"
            value={getValue('marketSection.changeTitle') || ''}
            onChange={handleChangeTitleChange}
            placeholder="e.g., 24h"
          />
        </div>

        <div className="md:col-span-2">
          <Label htmlFor="market-view-all">View All Button Text</Label>
          <Input
            id="market-view-all"
            value={getValue('marketSection.viewAllText') || ''}
            onChange={handleViewAllTextChange}
            placeholder="e.g., View all markets"
          />
        </div>
      </div>

      {/* Preview */}
      <div className="p-4 border rounded-lg bg-gradient-to-br from-zinc-900/50 to-zinc-800/50">
        <h4 className="text-sm font-medium mb-4 text-muted-foreground">Market Panel Preview</h4>

        <div className="backdrop-blur-xl rounded-xl p-4 border border-white/10 bg-white/5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-semibold">{getValue('marketSection.title') || 'Live Markets'}</h3>
              <p className="text-xs text-muted-foreground">Top performing assets</p>
            </div>
            <div className="flex items-center gap-2">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              <span className="text-xs text-emerald-400 font-medium">Live</span>
            </div>
          </div>

          {/* Sample market rows */}
          <div className="space-y-2">
            {['BTC', 'ETH', 'SOL'].map((symbol, i) => (
              <div key={symbol} className="flex items-center justify-between p-2 rounded-lg bg-white/5">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-zinc-700 flex items-center justify-center text-xs font-bold">
                    {symbol[0]}
                  </div>
                  <div>
                    <div className="font-medium text-sm">{symbol}</div>
                    <div className="text-xs text-muted-foreground">{symbol}USDT</div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-mono text-sm">${(Math.random() * 50000).toFixed(2)}</div>
                  <div className="text-xs text-emerald-400">+{(Math.random() * 10).toFixed(2)}%</div>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-4 text-center">
            <span className="text-sm text-blue-400 font-medium">
              {getValue('marketSection.viewAllText') || 'View all markets'} →
            </span>
          </div>
        </div>
      </div>
    </div>
  );
});
