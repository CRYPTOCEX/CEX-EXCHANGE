"use client";

import React, { useCallback, useMemo } from "react";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import {
  Layers,
  GripVertical,
  CandlestickChart,
  Target,
  Rocket,
  Coins,
  Percent,
  Brain,
  Copy,
  Gift,
  ChevronUp,
  ChevronDown,
  Info
} from "lucide-react";
import { EditorProps } from "./types";

const AVAILABLE_EXTENSIONS = [
  { id: "spot", name: "Spot Trading", icon: CandlestickChart, description: "Exchange-based cryptocurrency trading", color: "from-blue-500 to-cyan-500" },
  { id: "binary", name: "Binary Options", icon: Target, description: "Predict market movements", color: "from-purple-500 to-pink-500" },
  { id: "futures", name: "Futures Trading", icon: Rocket, description: "Leveraged perpetual trading", color: "from-orange-500 to-red-500" },
  { id: "ecosystem", name: "Native Tokens", icon: Coins, description: "Blockchain native token trading", color: "from-emerald-500 to-teal-500" },
  { id: "staking", name: "Staking Pools", icon: Percent, description: "Earn passive income by staking", color: "from-green-500 to-emerald-500" },
  { id: "ico", name: "Token Offerings", icon: Rocket, description: "Participate in token sales", color: "from-amber-500 to-orange-500" },
  { id: "ai", name: "AI Investment", icon: Brain, description: "AI-powered trading strategies", color: "from-violet-500 to-purple-500" },
  { id: "copyTrading", name: "Copy Trading", icon: Copy, description: "Follow successful traders", color: "from-cyan-500 to-blue-500" },
  { id: "affiliate", name: "Affiliate Program", icon: Gift, description: "Earn referral commissions", color: "from-rose-500 to-pink-500" },
];

export const ExtensionSectionsEditor = React.memo(function ExtensionSectionsEditor({
  variables,
  getValue,
  updateVariable
}: EditorProps) {
  const sectionConfig = getValue('extensionSections') || {};

  const getExtensionConfig = useCallback((extId: string) => {
    return sectionConfig[extId] || { enabled: true, order: AVAILABLE_EXTENSIONS.findIndex(e => e.id === extId) };
  }, [sectionConfig]);

  const handleToggle = useCallback((extId: string, enabled: boolean) => {
    updateVariable('extensionSections', {
      ...sectionConfig,
      [extId]: { ...getExtensionConfig(extId), enabled }
    });
  }, [sectionConfig, getExtensionConfig, updateVariable]);

  const handleMoveUp = useCallback((extId: string) => {
    const sorted = getSortedExtensions();
    const currentIndex = sorted.findIndex(e => e.id === extId);
    if (currentIndex <= 0) return;

    const newConfig = { ...sectionConfig };
    const prevExt = sorted[currentIndex - 1];
    const currentOrder = getExtensionConfig(extId).order;
    const prevOrder = getExtensionConfig(prevExt.id).order;

    newConfig[extId] = { ...getExtensionConfig(extId), order: prevOrder };
    newConfig[prevExt.id] = { ...getExtensionConfig(prevExt.id), order: currentOrder };

    updateVariable('extensionSections', newConfig);
  }, [sectionConfig, getExtensionConfig, updateVariable]);

  const handleMoveDown = useCallback((extId: string) => {
    const sorted = getSortedExtensions();
    const currentIndex = sorted.findIndex(e => e.id === extId);
    if (currentIndex >= sorted.length - 1) return;

    const newConfig = { ...sectionConfig };
    const nextExt = sorted[currentIndex + 1];
    const currentOrder = getExtensionConfig(extId).order;
    const nextOrder = getExtensionConfig(nextExt.id).order;

    newConfig[extId] = { ...getExtensionConfig(extId), order: nextOrder };
    newConfig[nextExt.id] = { ...getExtensionConfig(nextExt.id), order: currentOrder };

    updateVariable('extensionSections', newConfig);
  }, [sectionConfig, getExtensionConfig, updateVariable]);

  const getSortedExtensions = useCallback(() => {
    return [...AVAILABLE_EXTENSIONS].sort((a, b) => {
      const orderA = getExtensionConfig(a.id).order;
      const orderB = getExtensionConfig(b.id).order;
      return orderA - orderB;
    });
  }, [getExtensionConfig]);

  const sortedExtensions = useMemo(() => getSortedExtensions(), [getSortedExtensions]);

  return (
    <div className="space-y-6">
      <div className="p-4 border rounded-lg">
        <h3 className="text-lg font-semibold mb-2 flex items-center gap-2">
          <Layers className="w-5 h-5" />
          Extension Sections
        </h3>
        <p className="text-sm text-muted-foreground mb-4">
          Configure which extension sections appear on the landing page and their display order.
        </p>

        <div className="p-3 rounded-lg bg-blue-500/10 border border-blue-500/20 mb-4">
          <div className="flex items-start gap-2">
            <Info className="w-4 h-4 text-blue-400 mt-0.5 shrink-0" />
            <p className="text-sm text-blue-400">
              Extensions must be enabled in your platform settings to appear on the landing page.
              This configuration only controls visibility for enabled extensions.
            </p>
          </div>
        </div>

        <div className="space-y-2">
          {sortedExtensions.map((ext, index) => {
            const config = getExtensionConfig(ext.id);
            const Icon = ext.icon;
            return (
              <div
                key={ext.id}
                className={`flex items-center gap-3 p-3 rounded-lg border transition-colors ${
                  config.enabled ? 'bg-muted/30' : 'bg-muted/10 opacity-60'
                }`}
              >
                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 w-7 p-0"
                    onClick={() => handleMoveUp(ext.id)}
                    disabled={index === 0}
                  >
                    <ChevronUp className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 w-7 p-0"
                    onClick={() => handleMoveDown(ext.id)}
                    disabled={index === sortedExtensions.length - 1}
                  >
                    <ChevronDown className="w-4 h-4" />
                  </Button>
                </div>

                <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${ext.color} flex items-center justify-center shrink-0`}>
                  <Icon className="w-5 h-5 text-white" />
                </div>

                <div className="flex-1 min-w-0">
                  <div className="font-medium">{ext.name}</div>
                  <div className="text-xs text-muted-foreground truncate">{ext.description}</div>
                </div>

                <Switch
                  checked={config.enabled}
                  onCheckedChange={(checked) => handleToggle(ext.id, checked)}
                />
              </div>
            );
          })}
        </div>
      </div>

      {/* Preview */}
      <div className="p-4 border rounded-lg bg-gradient-to-br from-zinc-900/50 to-zinc-800/50">
        <h4 className="text-sm font-medium mb-4 text-muted-foreground">Section Order Preview</h4>

        <div className="space-y-2">
          {sortedExtensions
            .filter(ext => getExtensionConfig(ext.id).enabled)
            .map((ext, index) => {
              const Icon = ext.icon;
              return (
                <div key={ext.id} className="flex items-center gap-3 p-2 rounded-lg bg-white/5">
                  <div className="w-6 h-6 rounded bg-white/10 flex items-center justify-center text-xs font-bold">
                    {index + 1}
                  </div>
                  <div className={`w-6 h-6 rounded bg-gradient-to-br ${ext.color} flex items-center justify-center`}>
                    <Icon className="w-3 h-3 text-white" />
                  </div>
                  <span className="text-sm font-medium">{ext.name}</span>
                </div>
              );
            })}
          {sortedExtensions.filter(ext => getExtensionConfig(ext.id).enabled).length === 0 && (
            <div className="text-center py-4 text-muted-foreground text-sm">
              No extension sections enabled
            </div>
          )}
        </div>
      </div>
    </div>
  );
});
