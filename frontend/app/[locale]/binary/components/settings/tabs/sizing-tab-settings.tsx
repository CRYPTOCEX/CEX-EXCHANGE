"use client";

/**
 * Sizing Tab Settings Component
 *
 * Contains Position Sizing Calculator
 */

import { PositionSizingCalculator } from "../../risk-management/position-sizing-calculator";
import type { PositionSizingSettings } from "../../risk-management/risk-management-types";

// ============================================================================
// TYPES
// ============================================================================

export interface SizingTabSettingsProps {
  darkMode: boolean;
  balance: number;
  winRate: number;
  avgProfit: number;
  avgLoss: number;
  positionSizing: PositionSizingSettings;
  updatePositionSizing: (settings: Partial<PositionSizingSettings>) => void;
  onSetAmount: (amount: number) => void;
}

// ============================================================================
// COMPONENT
// ============================================================================

export function SizingTabSettings({
  darkMode,
  balance,
  winRate,
  avgProfit,
  avgLoss,
  positionSizing,
  updatePositionSizing,
  onSetAmount,
}: SizingTabSettingsProps) {
  return (
    <div className="p-5">
      <PositionSizingCalculator
        settings={positionSizing}
        balance={balance}
        winRate={winRate}
        avgProfit={avgProfit}
        avgLoss={avgLoss}
        onChange={updatePositionSizing}
        onApplyAmount={onSetAmount}
        theme={darkMode ? "dark" : "light"}
      />
    </div>
  );
}

export default SizingTabSettings;
