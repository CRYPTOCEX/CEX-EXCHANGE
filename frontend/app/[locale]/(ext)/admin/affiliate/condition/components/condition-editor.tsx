"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  FileText,
  DollarSign,
  Percent,
  Wallet,
  Target,
  Info,
  HelpCircle,
} from "lucide-react";
import { Condition, CONDITION_TYPES, TypeConfig } from "./types";
import { cn } from "@/lib/utils";

const DEFAULT_TYPE_CONFIG: TypeConfig = {
  icon: HelpCircle,
  color: "gray",
  bgGradient: "from-gray-500/20 to-gray-600/10",
  borderColor: "border-gray-500/30",
  textColor: "text-gray-600 dark:text-gray-400",
  label: "Unknown",
};

interface ConditionEditorProps {
  condition: Condition;
  onChange: (field: keyof Condition, value: any) => void;
}

export function ConditionEditor({ condition, onChange }: ConditionEditorProps) {
  const typeConfig = CONDITION_TYPES[condition.type] || DEFAULT_TYPE_CONFIG;
  const TypeIcon = typeConfig.icon;

  return (
    <div className="p-3 sm:p-4 md:p-6 max-w-4xl mx-auto space-y-4 sm:space-y-6">
      {/* Condition Type Banner */}
      <div
        className={cn(
          "p-3 sm:p-4 rounded-xl border flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4",
          typeConfig.borderColor,
          `bg-gradient-to-r ${typeConfig.bgGradient}`
        )}
      >
        <div className="flex items-center gap-3 flex-1">
          <div className={cn("p-2 sm:p-3 rounded-lg bg-background/80 backdrop-blur shrink-0")}>
            <TypeIcon className={cn("h-5 w-5 sm:h-6 sm:w-6", typeConfig.textColor)} />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <Badge variant="outline" className="text-xs font-medium">
                {typeConfig.label}
              </Badge>
              <Badge
                variant={condition.status ? "default" : "secondary"}
                className={cn(
                  "text-xs",
                  condition.status && "bg-emerald-500/10 text-emerald-500 border-emerald-500/20"
                )}
              >
                {condition.status ? "Active" : "Inactive"}
              </Badge>
            </div>
            <p className="text-xs sm:text-sm text-muted-foreground mt-1 truncate">
              System name: <code className="text-xs bg-muted px-1.5 py-0.5 rounded">{condition.name}</code>
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 self-end sm:self-center">
          <Label htmlFor="status-toggle" className="text-sm font-medium">
            Status
          </Label>
          <Switch
            id="status-toggle"
            checked={condition.status}
            onCheckedChange={(checked) => onChange("status", checked)}
            className="data-[state=checked]:bg-emerald-500"
          />
        </div>
      </div>

      <div className="grid gap-4 sm:gap-6 lg:grid-cols-2">
        {/* Basic Information */}
        <Card>
          <CardHeader className="p-4 sm:p-6">
            <CardTitle className="flex items-center gap-2 text-sm sm:text-base">
              <FileText className="h-4 w-4 text-primary" />
              Basic Information
            </CardTitle>
            <CardDescription className="text-xs sm:text-sm">
              Display name and description
            </CardDescription>
          </CardHeader>
          <CardContent className="p-4 pt-0 sm:p-6 sm:pt-0 space-y-4">
            <div className="space-y-2">
              <Label htmlFor="title" className="text-sm">Title</Label>
              <Input
                id="title"
                value={condition.title}
                onChange={(e) => onChange("title", e.target.value)}
                placeholder="Enter display title"
                className="w-full"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description" className="text-sm">Description</Label>
              <Textarea
                id="description"
                value={condition.description}
                onChange={(e) => onChange("description", e.target.value)}
                placeholder="Enter description"
                rows={3}
                className="w-full resize-none"
              />
            </div>
          </CardContent>
        </Card>

        {/* Reward Configuration */}
        <Card>
          <CardHeader className="p-4 sm:p-6">
            <CardTitle className="flex items-center gap-2 text-sm sm:text-base">
              <DollarSign className="h-4 w-4 text-primary" />
              Reward Configuration
            </CardTitle>
            <CardDescription className="text-xs sm:text-sm">
              Define reward amount and type
            </CardDescription>
          </CardHeader>
          <CardContent className="p-4 pt-0 sm:p-6 sm:pt-0 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="reward" className="text-sm">Reward Amount</Label>
                <div className="relative">
                  <Input
                    id="reward"
                    type="number"
                    value={condition.reward}
                    onChange={(e) => onChange("reward", parseFloat(e.target.value) || 0)}
                    className="w-full pr-8"
                  />
                  {condition.rewardType === "PERCENTAGE" ? (
                    <Percent className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  ) : (
                    <DollarSign className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  )}
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="rewardType" className="text-sm">Reward Type</Label>
                <Select
                  value={condition.rewardType}
                  onValueChange={(value) => onChange("rewardType", value)}
                >
                  <SelectTrigger id="rewardType" className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="PERCENTAGE">Percentage (%)</SelectItem>
                    <SelectItem value="FIXED">Fixed Amount</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="minAmount" className="flex items-center gap-2 text-sm">
                <Target className="h-3.5 w-3.5" />
                Minimum Amount Threshold
              </Label>
              <Input
                id="minAmount"
                type="number"
                value={condition.minAmount}
                onChange={(e) => onChange("minAmount", parseFloat(e.target.value) || 0)}
                placeholder="0 = no minimum"
                className="w-full"
              />
              <p className="text-xs text-muted-foreground">
                Transaction must exceed this amount to trigger reward
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Wallet Configuration */}
        <Card className="lg:col-span-2">
          <CardHeader className="p-4 sm:p-6">
            <CardTitle className="flex items-center gap-2 text-sm sm:text-base">
              <Wallet className="h-4 w-4 text-primary" />
              Wallet Configuration
            </CardTitle>
            <CardDescription className="text-xs sm:text-sm">
              Configure where and how rewards are distributed
            </CardDescription>
          </CardHeader>
          <CardContent className="p-4 pt-0 sm:p-6 sm:pt-0">
            <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
              <div className="space-y-2">
                <Label htmlFor="rewardWalletType" className="text-sm">Wallet Type</Label>
                <Select
                  value={condition.rewardWalletType}
                  onValueChange={(value) => onChange("rewardWalletType", value)}
                >
                  <SelectTrigger id="rewardWalletType" className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="FIAT">FIAT Wallet</SelectItem>
                    <SelectItem value="SPOT">SPOT Wallet</SelectItem>
                    <SelectItem value="ECO">ECO Wallet</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="rewardCurrency" className="text-sm">Currency</Label>
                <Input
                  id="rewardCurrency"
                  value={condition.rewardCurrency}
                  onChange={(e) => onChange("rewardCurrency", e.target.value.toUpperCase())}
                  placeholder="USD, BTC, ETH..."
                  className="w-full"
                />
              </div>

              {condition.rewardWalletType === "ECO" && (
                <div className="space-y-2">
                  <Label htmlFor="rewardChain" className="text-sm">Chain (ECO only)</Label>
                  <Input
                    id="rewardChain"
                    value={condition.rewardChain || ""}
                    onChange={(e) => onChange("rewardChain", e.target.value)}
                    placeholder="ETH, BSC, SOL..."
                    className="w-full"
                  />
                </div>
              )}
            </div>

            {/* Info Box */}
            <div className="mt-4 p-3 rounded-lg bg-muted/50 flex items-start gap-3">
              <Info className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
              <div className="text-xs sm:text-sm text-muted-foreground">
                <p className="font-medium text-foreground mb-1">Reward Distribution</p>
                <p>
                  When a user completes a <strong>{typeConfig.label}</strong> action
                  {condition.minAmount > 0 && (
                    <> with amount exceeding <strong>{condition.minAmount}</strong></>
                  )}
                  , their referrer will receive{" "}
                  <strong>
                    {condition.rewardType === "PERCENTAGE"
                      ? `${condition.reward}%`
                      : `${condition.reward} ${condition.rewardCurrency}`}
                  </strong>{" "}
                  in their <strong>{condition.rewardWalletType}</strong> wallet.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
