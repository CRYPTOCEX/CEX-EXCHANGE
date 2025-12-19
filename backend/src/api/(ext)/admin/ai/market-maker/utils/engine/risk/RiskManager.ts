import { logger } from "@b/utils/console";
import type { MarketMakerEngine } from "../MarketMakerEngine";
import { VolatilityMonitor } from "./VolatilityMonitor";
import { LossProtection } from "./LossProtection";
import { CircuitBreaker } from "./CircuitBreaker";
import { CacheManager } from "@b/utils/cache";

// Risk check result
export interface RiskCheckResult {
  canTrade: boolean;
  reason?: string;
  riskLevel: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  restrictions?: string[];
}

// Risk assessment for a specific trade
export interface TradeRiskAssessment {
  approved: boolean;
  reason?: string;
  adjustedAmount?: bigint;
  adjustedPrice?: bigint;
}

/**
 * RiskManager - Central risk management for AI market maker
 *
 * Coordinates:
 * - VolatilityMonitor: Tracks market volatility
 * - LossProtection: Monitors losses and stops trading
 * - CircuitBreaker: Emergency controls
 */
export class RiskManager {
  private engine: MarketMakerEngine;

  // Sub-components
  private volatilityMonitor: VolatilityMonitor;
  private lossProtection: LossProtection;
  private circuitBreaker: CircuitBreaker;

  // Global settings cache
  private globalSettings: {
    maxDailyLossPercent: number;
    defaultVolatilityThreshold: number;
    tradingEnabled: boolean;
    maintenanceMode: boolean;
    globalPauseEnabled: boolean;
    stopLossEnabled: boolean;
  } | null = null;

  private lastSettingsLoad: Date | null = null;
  private settingsRefreshIntervalMs = 60000; // 1 minute

  constructor(engine: MarketMakerEngine) {
    this.engine = engine;
    this.volatilityMonitor = new VolatilityMonitor();
    this.lossProtection = new LossProtection();
    this.circuitBreaker = new CircuitBreaker();
  }

  /**
   * Check global risk conditions
   * Called on each engine tick
   */
  public async checkGlobalRisk(): Promise<RiskCheckResult> {
    try {
      // Refresh settings if needed
      await this.refreshSettings();

      // Check if trading is enabled
      if (this.globalSettings && !this.globalSettings.tradingEnabled) {
        return {
          canTrade: false,
          reason: "Trading is disabled globally",
          riskLevel: "CRITICAL",
        };
      }

      // Check maintenance mode
      if (this.globalSettings?.maintenanceMode) {
        return {
          canTrade: false,
          reason: "System is in maintenance mode",
          riskLevel: "CRITICAL",
        };
      }

      // Check global pause
      if (this.globalSettings?.globalPauseEnabled) {
        return {
          canTrade: false,
          reason: "Global pause is enabled",
          riskLevel: "HIGH",
        };
      }

      // Check circuit breaker
      if (this.circuitBreaker.isTripped()) {
        return {
          canTrade: false,
          reason: this.circuitBreaker.getTripReason(),
          riskLevel: "CRITICAL",
        };
      }

      // Check global loss limits (only if stop loss is enabled)
      if (this.globalSettings?.stopLossEnabled !== false) {
        const lossCheck = await this.lossProtection.checkGlobalLoss(
          this.globalSettings?.maxDailyLossPercent || 10
        );
        if (!lossCheck.canTrade) {
          return {
            canTrade: false,
            reason: lossCheck.reason,
            riskLevel: "HIGH",
          };
        }
      }

      // All checks passed
      return {
        canTrade: true,
        riskLevel: this.calculateOverallRiskLevel(),
      };
    } catch (error) {
      logger.error("RISK_MANAGER", "Risk check failed", error);

      // On error, be conservative
      return {
        canTrade: false,
        reason: "Risk check failed",
        riskLevel: "HIGH",
      };
    }
  }

  /**
   * Assess risk for a specific trade
   */
  public async assessTradeRisk(
    marketId: string,
    side: "BUY" | "SELL",
    amount: bigint,
    price: bigint
  ): Promise<TradeRiskAssessment> {
    try {
      // Check volatility for this market
      const volatility = await this.volatilityMonitor.getVolatility(marketId);
      const threshold = this.globalSettings?.defaultVolatilityThreshold || 5;

      if (volatility > threshold * 2) {
        return {
          approved: false,
          reason: `Extreme volatility: ${volatility.toFixed(2)}%`,
        };
      }

      // If volatility is high but not extreme, reduce order size
      if (volatility > threshold) {
        const reductionFactor = Math.max(0.5, 1 - (volatility - threshold) / threshold);
        return {
          approved: true,
          adjustedAmount: BigInt(Math.floor(Number(amount) * reductionFactor)),
          reason: `Reduced size due to volatility: ${volatility.toFixed(2)}%`,
        };
      }

      // Check market-specific loss limits
      const marketLoss = await this.lossProtection.getMarketLoss(marketId);
      if (marketLoss > 5) {
        // More than 5% loss on this market
        return {
          approved: false,
          reason: `Market loss limit exceeded: ${marketLoss.toFixed(2)}%`,
        };
      }

      return { approved: true };
    } catch (error) {
      logger.error("RISK_MANAGER", "Trade assessment failed", error);
      return {
        approved: false,
        reason: "Trade assessment failed",
      };
    }
  }

  /**
   * Report a trade result for tracking
   */
  public async reportTradeResult(
    marketId: string,
    pnl: number,
    isLoss: boolean
  ): Promise<void> {
    await this.lossProtection.recordTrade(marketId, pnl, isLoss);

    // Check if we need to trip circuit breaker
    if (isLoss) {
      const consecutiveLosses = this.lossProtection.getConsecutiveLosses(marketId);
      if (consecutiveLosses >= 5) {
        this.circuitBreaker.trip(
          `5 consecutive losses on market ${marketId}`
        );
      }
    }
  }

  /**
   * Trip the circuit breaker manually
   */
  public tripCircuitBreaker(reason: string): void {
    this.circuitBreaker.trip(reason);
  }

  /**
   * Reset the circuit breaker
   */
  public resetCircuitBreaker(): void {
    this.circuitBreaker.reset();
  }

  /**
   * Get current risk level
   */
  public getRiskLevel(): "LOW" | "MEDIUM" | "HIGH" | "CRITICAL" {
    return this.calculateOverallRiskLevel();
  }

  /**
   * Get risk statistics
   */
  public getStats(): {
    riskLevel: string;
    circuitBreakerStatus: string;
    globalVolatility: number;
    globalLossPercent: number;
  } {
    return {
      riskLevel: this.calculateOverallRiskLevel(),
      circuitBreakerStatus: this.circuitBreaker.isTripped() ? "TRIPPED" : "OK",
      globalVolatility: this.volatilityMonitor.getGlobalVolatility(),
      globalLossPercent: this.lossProtection.getGlobalLossPercent(),
    };
  }

  // ============================================
  // Private Methods
  // ============================================

  /**
   * Refresh global settings from CacheManager (centralized settings)
   */
  private async refreshSettings(): Promise<void> {
    // Only refresh if cache is stale
    if (
      this.lastSettingsLoad &&
      Date.now() - this.lastSettingsLoad.getTime() < this.settingsRefreshIntervalMs
    ) {
      return;
    }

    try {
      const cacheManager = CacheManager.getInstance();

      // Get settings from centralized settings table via CacheManager
      const [
        tradingEnabled,
        globalPauseEnabled,
        maintenanceMode,
        maxDailyLossPercent,
        defaultVolatilityThreshold,
        stopLossEnabled,
      ] = await Promise.all([
        cacheManager.getSetting("aiMarketMakerEnabled"),
        cacheManager.getSetting("aiMarketMakerGlobalPauseEnabled"),
        cacheManager.getSetting("aiMarketMakerMaintenanceMode"),
        cacheManager.getSetting("aiMarketMakerMaxDailyLossPercent"),
        cacheManager.getSetting("aiMarketMakerDefaultVolatilityThreshold"),
        cacheManager.getSetting("aiMarketMakerStopLossEnabled"),
      ]);

      this.globalSettings = {
        maxDailyLossPercent: parseFloat(maxDailyLossPercent) || 5,
        defaultVolatilityThreshold: parseFloat(defaultVolatilityThreshold) || 10,
        tradingEnabled: tradingEnabled !== false,
        maintenanceMode: maintenanceMode === true,
        globalPauseEnabled: globalPauseEnabled === true,
        stopLossEnabled: stopLossEnabled !== false,
      };

      this.lastSettingsLoad = new Date();
    } catch (error) {
      // Use cached settings on error, or defaults if no cache
      if (!this.globalSettings) {
        this.globalSettings = {
          maxDailyLossPercent: 5,
          defaultVolatilityThreshold: 10,
          tradingEnabled: true,
          maintenanceMode: false,
          globalPauseEnabled: false,
          stopLossEnabled: true,
        };
      }
    }
  }

  /**
   * Calculate overall risk level based on all factors
   */
  private calculateOverallRiskLevel(): "LOW" | "MEDIUM" | "HIGH" | "CRITICAL" {
    if (this.circuitBreaker.isTripped()) {
      return "CRITICAL";
    }

    const globalLoss = this.lossProtection.getGlobalLossPercent();
    const globalVol = this.volatilityMonitor.getGlobalVolatility();

    if (globalLoss > 8 || globalVol > 15) {
      return "HIGH";
    }

    if (globalLoss > 4 || globalVol > 8) {
      return "MEDIUM";
    }

    return "LOW";
  }
}

export default RiskManager;
