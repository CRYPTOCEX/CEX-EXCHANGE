"use client";

import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CustomComponentProps } from "@/components/admin/settings";
import { Network, Percent, Users } from "lucide-react";

export default function MlmLevelsField({
  formValues,
  handleChange,
}: CustomComponentProps) {
  // Get MLM system type
  const mlmSystem = formValues.affiliateMlmSystem || "DIRECT";

  // Get levels count
  const binaryLevels = parseInt(formValues.affiliateBinaryLevels) || 2;
  const unilevelLevels = parseInt(formValues.affiliateUnilevelLevels) || 2;

  // Parse level percentages from form values
  const getBinaryPercentages = (): Record<string, number> => {
    const percentages: Record<string, number> = {};
    for (let i = 1; i <= 7; i++) {
      const key = `affiliateBinaryLevel${i}`;
      percentages[key] = parseFloat(formValues[key]) || 0;
    }
    return percentages;
  };

  const getUnilevelPercentages = (): Record<string, number> => {
    const percentages: Record<string, number> = {};
    for (let i = 1; i <= 7; i++) {
      const key = `affiliateUnilevelLevel${i}`;
      percentages[key] = parseFloat(formValues[key]) || 0;
    }
    return percentages;
  };

  const [binaryPercentages, setBinaryPercentages] = useState(getBinaryPercentages);
  const [unilevelPercentages, setUnilevelPercentages] = useState(getUnilevelPercentages);

  // Update local state when form values change
  useEffect(() => {
    setBinaryPercentages(getBinaryPercentages());
    setUnilevelPercentages(getUnilevelPercentages());
  }, [formValues]);

  const handleMlmSystemChange = (value: string) => {
    handleChange("affiliateMlmSystem", value);
  };

  const handleBinaryLevelsChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseInt(e.target.value);
    if (value >= 2 && value <= 7) {
      handleChange("affiliateBinaryLevels", String(value));
    }
  };

  const handleUnilevelLevelsChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseInt(e.target.value);
    if (value >= 2 && value <= 7) {
      handleChange("affiliateUnilevelLevels", String(value));
    }
  };

  const handleBinaryPercentageChange = (level: number, value: string) => {
    const key = `affiliateBinaryLevel${level}`;
    const numValue = parseFloat(value) || 0;
    setBinaryPercentages(prev => ({ ...prev, [key]: numValue }));
    handleChange(key, String(numValue));
  };

  const handleUnilevelPercentageChange = (level: number, value: string) => {
    const key = `affiliateUnilevelLevel${level}`;
    const numValue = parseFloat(value) || 0;
    setUnilevelPercentages(prev => ({ ...prev, [key]: numValue }));
    handleChange(key, String(numValue));
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-2 mb-4">
        <div className="p-1.5 rounded-md bg-purple-500/10">
          <Network className="w-4 h-4 text-purple-500" />
        </div>
        <div>
          <Label className="text-sm font-medium">MLM System Configuration</Label>
          <p className="text-xs text-muted-foreground">
            Configure your multi-level marketing structure and commission percentages.
          </p>
        </div>
      </div>

      {/* MLM System Selection */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <Label htmlFor="mlmSystem" className="block text-sm font-medium mb-1.5">
            MLM System Type
          </Label>
          <Select value={mlmSystem} onValueChange={handleMlmSystemChange}>
            <SelectTrigger id="mlmSystem" className="w-full">
              <SelectValue placeholder="Select MLM system" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="DIRECT">Direct Referral</SelectItem>
              <SelectItem value="BINARY">Binary</SelectItem>
              <SelectItem value="UNILEVEL">Unilevel</SelectItem>
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground mt-1">
            Select the type of affiliate program structure.
          </p>
        </div>

        {/* Binary Levels Count */}
        {mlmSystem === "BINARY" && (
          <div>
            <Label htmlFor="binaryLevels" className="block text-sm font-medium mb-1.5">
              Binary Levels
            </Label>
            <Input
              id="binaryLevels"
              type="number"
              min={2}
              max={7}
              step={1}
              value={binaryLevels}
              onChange={handleBinaryLevelsChange}
            />
            <p className="text-xs text-muted-foreground mt-1">
              Number of levels in the binary structure (2-7).
            </p>
          </div>
        )}

        {/* Unilevel Levels Count */}
        {mlmSystem === "UNILEVEL" && (
          <div>
            <Label htmlFor="unilevelLevels" className="block text-sm font-medium mb-1.5">
              Unilevel Levels
            </Label>
            <Input
              id="unilevelLevels"
              type="number"
              min={2}
              max={7}
              step={1}
              value={unilevelLevels}
              onChange={handleUnilevelLevelsChange}
            />
            <p className="text-xs text-muted-foreground mt-1">
              Number of levels in the unilevel structure (2-7).
            </p>
          </div>
        )}
      </div>

      {/* Binary Level Percentages */}
      {mlmSystem === "BINARY" && binaryLevels > 0 && (
        <div className="mt-6 p-4 rounded-lg border bg-muted/30">
          <div className="flex items-center gap-2 mb-4">
            <Percent className="w-4 h-4 text-purple-500" />
            <h4 className="text-sm font-medium">Binary Level Percentages</h4>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {Array.from({ length: binaryLevels }, (_, i) => {
              const level = i + 1;
              const key = `affiliateBinaryLevel${level}`;
              return (
                <div key={`binary-level-${level}`}>
                  <Label htmlFor={key} className="block text-xs font-medium mb-1.5">
                    Level {level} (%)
                  </Label>
                  <Input
                    id={key}
                    type="number"
                    min={0}
                    max={100}
                    step={0.1}
                    value={binaryPercentages[key] || ""}
                    onChange={(e) => handleBinaryPercentageChange(level, e.target.value)}
                  />
                </div>
              );
            })}
          </div>
          <p className="text-xs text-muted-foreground mt-3">
            Set the commission percentage for each level in the binary structure.
          </p>
        </div>
      )}

      {/* Unilevel Level Percentages */}
      {mlmSystem === "UNILEVEL" && unilevelLevels > 0 && (
        <div className="mt-6 p-4 rounded-lg border bg-muted/30">
          <div className="flex items-center gap-2 mb-4">
            <Percent className="w-4 h-4 text-purple-500" />
            <h4 className="text-sm font-medium">Unilevel Level Percentages</h4>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {Array.from({ length: unilevelLevels }, (_, i) => {
              const level = i + 1;
              const key = `affiliateUnilevelLevel${level}`;
              return (
                <div key={`unilevel-level-${level}`}>
                  <Label htmlFor={key} className="block text-xs font-medium mb-1.5">
                    Level {level} (%)
                  </Label>
                  <Input
                    id={key}
                    type="number"
                    min={0}
                    max={100}
                    step={0.1}
                    value={unilevelPercentages[key] || ""}
                    onChange={(e) => handleUnilevelPercentageChange(level, e.target.value)}
                  />
                </div>
              );
            })}
          </div>
          <p className="text-xs text-muted-foreground mt-3">
            Set the commission percentage for each level in the unilevel structure.
          </p>
        </div>
      )}

      {/* Direct Referral Info */}
      {mlmSystem === "DIRECT" && (
        <div className="mt-6 p-4 rounded-lg border bg-muted/30">
          <div className="flex items-center gap-2 mb-2">
            <Users className="w-4 h-4 text-blue-500" />
            <h4 className="text-sm font-medium">Direct Referral System</h4>
          </div>
          <p className="text-xs text-muted-foreground">
            Direct referral system pays commissions only for direct referrals.
            Configure the commission rate in the Commission tab.
          </p>
        </div>
      )}
    </div>
  );
}
