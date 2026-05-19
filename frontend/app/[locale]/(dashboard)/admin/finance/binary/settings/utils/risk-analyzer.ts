/**
 * Risk Analyzer for Binary Settings
 *
 * Analyzes binary trading settings and generates warnings for risky configurations.
 * This helps admins avoid configurations that could lead to platform losses or abuse.
 */

import type { BinarySettings, Warning, BinaryOrderType } from "../types";

/**
 * Analyze binary settings and generate warnings
 */
export function analyzeSettings(settings: BinarySettings): Warning[] {
  const warnings: Warning[] = [];

  // Global settings checks
  checkGlobalSettings(settings, warnings);

  // Order type checks
  checkOrderTypes(settings, warnings);

  // Barrier level checks
  checkBarrierLevels(settings, warnings);

  // Duration checks
  checkDurations(settings, warnings);

  // Risk management checks
  checkRiskManagement(settings, warnings);

  // Cross-setting consistency checks
  checkConsistency(settings, warnings);

  return warnings.sort((a, b) => {
    const levelOrder = { danger: 0, warning: 1, info: 2 };
    return levelOrder[a.level] - levelOrder[b.level];
  });
}

function checkGlobalSettings(settings: BinarySettings, warnings: Warning[]): void {
  const { global } = settings;

  // Check if binary trading is disabled
  if (!global.enabled) {
    warnings.push({
      level: "info",
      category: "Global",
      message: "Binary trading is currently disabled",
      suggestion: "Enable binary trading in Global Settings to allow users to trade",
      field: "global.enabled",
    });
  }

  // Check concurrent orders limit
  if (global.maxConcurrentOrders > 20) {
    warnings.push({
      level: "warning",
      category: "Global",
      message: `High concurrent order limit (${global.maxConcurrentOrders}) per user`,
      suggestion: "High concurrent orders increase platform exposure. Consider limiting to 10 or less",
      field: "global.maxConcurrentOrders",
    });
  }

  // Check cooldown
  if (global.cooldownSeconds < 3) {
    warnings.push({
      level: "warning",
      category: "Global",
      message: "Very short cooldown between orders",
      suggestion: "Short cooldown may enable rapid-fire trading abuse. Consider 5+ seconds",
      field: "global.cooldownSeconds",
    });
  }
}

function checkOrderTypes(settings: BinarySettings, warnings: Warning[]): void {
  const { orderTypes } = settings;
  const enabledTypes = Object.entries(orderTypes).filter(([_, cfg]) => cfg.enabled);

  // No order types enabled
  if (enabledTypes.length === 0) {
    warnings.push({
      level: "danger",
      category: "Order Types",
      message: "No order types are enabled",
      suggestion: "Enable at least one order type for trading to function",
    });
    return;
  }

  // Check each enabled order type
  for (const [type, config] of enabledTypes) {
    // Check profit percentage
    if (config.profitPercentage > 95) {
      warnings.push({
        level: "warning",
        category: `${type}`,
        message: `High base profit (${config.profitPercentage}%) for ${type}`,
        suggestion: "Profit over 95% may not be sustainable. Consider using barrier-based profit tiers",
        field: `orderTypes.${type}.profitPercentage`,
      });
    }

    if (config.profitPercentage > 120) {
      warnings.push({
        level: "danger",
        category: `${type}`,
        message: `Extremely high profit (${config.profitPercentage}%) for ${type}`,
        suggestion: "Profit over 120% will likely cause platform losses",
        field: `orderTypes.${type}.profitPercentage`,
      });
    }

    // Type-specific checks
    if (type === "TURBO") {
      const turboConfig = config as any;
      if (turboConfig.maxDuration && turboConfig.maxDuration > 10) {
        warnings.push({
          level: "warning",
          category: "TURBO",
          message: "TURBO max duration exceeds 10 minutes",
          suggestion: "TURBO is designed for short-term trades. Consider limiting to 5 minutes or less",
          field: "orderTypes.TURBO.maxDuration",
        });
      }
    }

    if (type === "TOUCH_NO_TOUCH") {
      const touchConfig = config as any;
      if (touchConfig.touchProfitMultiplier && touchConfig.touchProfitMultiplier > 2) {
        warnings.push({
          level: "warning",
          category: "TOUCH_NO_TOUCH",
          message: "TOUCH profit multiplier is very high",
          suggestion: "High TOUCH multiplier combined with close barriers could guarantee profits",
          field: "orderTypes.TOUCH_NO_TOUCH.touchProfitMultiplier",
        });
      }
    }
  }
}

function checkBarrierLevels(settings: BinarySettings, warnings: Warning[]): void {
  const barrierTypes: BinaryOrderType[] = ["HIGHER_LOWER", "TOUCH_NO_TOUCH", "TURBO"];

  for (const type of barrierTypes) {
    const config = settings.orderTypes[type] as any;
    if (!config?.enabled) continue;

    const barrierLevels = config.barrierLevels;
    if (!barrierLevels || barrierLevels.length === 0) {
      warnings.push({
        level: "danger",
        category: type,
        message: `No barrier levels defined for ${type}`,
        suggestion: "Users cannot place orders without barrier levels. Define at least one level",
        field: `orderTypes.${type}.barrierLevels`,
      });
      continue;
    }

    const enabledLevels = barrierLevels.filter((l: any) => l.enabled);
    if (enabledLevels.length === 0) {
      warnings.push({
        level: "danger",
        category: type,
        message: `All barrier levels are disabled for ${type}`,
        suggestion: "Enable at least one barrier level for trading to function",
        field: `orderTypes.${type}.barrierLevels`,
      });
      continue;
    }

    // Check for risky barrier configurations
    for (const level of enabledLevels) {
      // Far barrier with high profit = guaranteed win
      if (level.distancePercent > 3 && level.profitPercent > 80) {
        warnings.push({
          level: "danger",
          category: type,
          message: `Barrier "${level.label}" has risky config: ${level.distancePercent}% distance with ${level.profitPercent}% profit`,
          suggestion: "Far barriers (>3%) with high profit (>80%) can lead to guaranteed wins. Reduce profit for far barriers",
          field: `orderTypes.${type}.barrierLevels`,
        });
      }

      // Very far barriers
      if (level.distancePercent > 5) {
        warnings.push({
          level: "warning",
          category: type,
          message: `Barrier "${level.label}" distance (${level.distancePercent}%) is very far from price`,
          suggestion: "Consider if such far barriers serve a legitimate trading purpose",
          field: `orderTypes.${type}.barrierLevels`,
        });
      }

      // Inverted profit curve detection
      const sortedByDistance = [...enabledLevels].sort((a: any, b: any) => a.distancePercent - b.distancePercent);
      for (let i = 0; i < sortedByDistance.length - 1; i++) {
        const current = sortedByDistance[i];
        const next = sortedByDistance[i + 1];
        if (next.profitPercent > current.profitPercent && next.distancePercent > current.distancePercent) {
          warnings.push({
            level: "danger",
            category: type,
            message: "Inverted profit curve detected: farther barriers have higher profit",
            suggestion: "Profit should decrease as barrier distance increases (more safety = less profit)",
            field: `orderTypes.${type}.barrierLevels`,
          });
          break;
        }
      }
    }
  }

  // Check CALL_PUT strike levels
  const callPutConfig = settings.orderTypes.CALL_PUT as any;
  if (callPutConfig?.enabled) {
    const strikeLevels = callPutConfig.strikeLevels;
    if (!strikeLevels || strikeLevels.length === 0) {
      warnings.push({
        level: "danger",
        category: "CALL_PUT",
        message: "No strike levels defined for CALL_PUT",
        suggestion: "Users cannot place CALL/PUT orders without strike levels",
        field: "orderTypes.CALL_PUT.strikeLevels",
      });
    }
  }
}

function checkDurations(settings: BinarySettings, warnings: Warning[]): void {
  const { durations } = settings;

  if (!durations || durations.length === 0) {
    warnings.push({
      level: "danger",
      category: "Durations",
      message: "No trading durations configured",
      suggestion: "Add at least one duration for trading to function",
    });
    return;
  }

  const enabledDurations = durations.filter((d) => d.enabled);
  if (enabledDurations.length === 0) {
    warnings.push({
      level: "danger",
      category: "Durations",
      message: "All durations are disabled",
      suggestion: "Enable at least one duration for trading to function",
    });
    return;
  }

  // Check for very short durations
  const veryShortDurations = enabledDurations.filter((d) => d.minutes < 1);
  if (veryShortDurations.length > 0) {
    warnings.push({
      level: "warning",
      category: "Durations",
      message: `${veryShortDurations.length} duration(s) under 1 minute`,
      suggestion: "Very short durations may be exploitable with fast internet connections",
    });
  }

  // Check for gaps in duration coverage
  const sortedMinutes = enabledDurations.map((d) => d.minutes).sort((a, b) => a - b);
  if (sortedMinutes.length > 1) {
    const minDuration = sortedMinutes[0];
    const maxDuration = sortedMinutes[sortedMinutes.length - 1];

    // Large gap detection
    for (let i = 0; i < sortedMinutes.length - 1; i++) {
      const gap = sortedMinutes[i + 1] / sortedMinutes[i];
      if (gap > 5) {
        warnings.push({
          level: "info",
          category: "Durations",
          message: `Large gap between ${sortedMinutes[i]} and ${sortedMinutes[i + 1]} minute durations`,
          suggestion: "Consider adding intermediate durations for better user experience",
        });
      }
    }
  }

  // Check per-type overrides
  for (const duration of enabledDurations) {
    if (duration.orderTypeOverrides) {
      const profitAdjustments = Object.values(duration.orderTypeOverrides)
        .map((o: any) => o.profitAdjustment || 0)
        .filter((a) => a !== 0);

      const highAdjustments = profitAdjustments.filter((a) => Math.abs(a) > 15);
      if (highAdjustments.length > 0) {
        warnings.push({
          level: "info",
          category: "Durations",
          message: `Duration ${duration.minutes}min has large profit adjustments`,
          suggestion: "Large per-duration profit adjustments may cause unexpected profit levels",
        });
      }
    }
  }
}

function checkRiskManagement(settings: BinarySettings, warnings: Warning[]): void {
  const { riskManagement } = settings;

  // Check if daily loss limit is set
  if (riskManagement.dailyLossLimit === 0) {
    warnings.push({
      level: "info",
      category: "Risk Management",
      message: "No daily loss limit set",
      suggestion: "Set a daily loss limit to protect users and platform",
      field: "riskManagement.dailyLossLimit",
    });
  }

  // Check win rate alert threshold
  if (riskManagement.winRateAlert === 0) {
    warnings.push({
      level: "info",
      category: "Risk Management",
      message: "Win rate alerting is disabled",
      suggestion: "Enable win rate alerts to detect potential abuse patterns",
      field: "riskManagement.winRateAlert",
    });
  }
}

function checkConsistency(settings: BinarySettings, warnings: Warning[]): void {
  // Check if all enabled order types have valid configurations
  const enabledTypes = Object.entries(settings.orderTypes)
    .filter(([_, cfg]) => cfg.enabled)
    .map(([type]) => type as BinaryOrderType);

  const enabledDurations = settings.durations.filter((d) => d.enabled);

  // Check if any type is blocked from all durations
  for (const type of enabledTypes) {
    const hasAvailableDuration = enabledDurations.some((d) => {
      const override = d.orderTypeOverrides?.[type];
      return override?.enabled !== false;
    });

    if (!hasAvailableDuration) {
      warnings.push({
        level: "danger",
        category: type,
        message: `${type} is enabled but blocked from all durations`,
        suggestion: "Enable this order type for at least one duration, or disable the order type",
      });
    }
  }

  // Calculate average profit and warn if too high
  const avgProfit = calculateAverageProfit(settings);
  if (avgProfit > 90) {
    warnings.push({
      level: "warning",
      category: "Profitability",
      message: `Average profit across all configurations is ${avgProfit.toFixed(1)}%`,
      suggestion: "High average profit may not be sustainable. Consider implementing barrier-based profit tiers",
    });
  }
}

function calculateAverageProfit(settings: BinarySettings): number {
  const enabledTypes = Object.entries(settings.orderTypes)
    .filter(([_, cfg]) => cfg.enabled)
    .map(([_, cfg]) => cfg);

  if (enabledTypes.length === 0) return 0;

  let totalProfit = 0;
  let count = 0;

  for (const config of enabledTypes) {
    // Add base profit
    totalProfit += config.profitPercentage;
    count++;

    // Add barrier level profits if applicable
    const barrierLevels = (config as any).barrierLevels;
    if (barrierLevels?.length > 0) {
      const enabledLevels = barrierLevels.filter((l: any) => l.enabled);
      for (const level of enabledLevels) {
        totalProfit += level.profitPercent;
        count++;
      }
    }
  }

  return count > 0 ? totalProfit / count : 0;
}

/**
 * Get risk score for settings (0-100, higher = more risky)
 */
export function calculateRiskScore(settings: BinarySettings): number {
  const warnings = analyzeSettings(settings);

  let score = 0;

  // Count warnings by level
  const dangerCount = warnings.filter((w) => w.level === "danger").length;
  const warningCount = warnings.filter((w) => w.level === "warning").length;
  const infoCount = warnings.filter((w) => w.level === "info").length;

  // Weight danger more heavily
  score += dangerCount * 25;
  score += warningCount * 10;
  score += infoCount * 2;

  // Cap at 100
  return Math.min(100, score);
}

/**
 * Get overall risk level
 */
export function getRiskLevel(settings: BinarySettings): "low" | "medium" | "high" | "critical" {
  const score = calculateRiskScore(settings);

  if (score >= 75) return "critical";
  if (score >= 50) return "high";
  if (score >= 25) return "medium";
  return "low";
}
