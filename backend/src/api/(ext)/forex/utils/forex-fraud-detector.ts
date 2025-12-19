import { models } from "@b/db";
import { Op } from "sequelize";
import { logger } from "@b/utils/console";

interface LogContext {
  step?: (message: string) => void;
  success?: (message: string) => void;
  fail?: (message: string) => void;
}

interface FraudCheckResult {
  isValid: boolean;
  reason?: string;
  riskScore: number;
}

export class ForexFraudDetector {
  static async checkDeposit(
    userId: string,
    amount: number,
    currency: string,
    ctx?: LogContext
  ): Promise<FraudCheckResult> {
    try {
      ctx?.step?.(`Running fraud detection for deposit: ${amount} ${currency}`);

      // Check recent deposit history
      ctx?.step?.("Checking recent deposit history");
      const recentDeposits = await models.transaction.count({
        where: {
          userId,
          type: 'FOREX_DEPOSIT',
          createdAt: {
            [Op.gte]: new Date(Date.now() - 24 * 60 * 60 * 1000) // Last 24 hours
          }
        }
      });

      // Check if too many deposits in short time
      if (recentDeposits > 10) {
        ctx?.fail?.("Too many deposits in 24 hours");
        return {
          isValid: false,
          reason: "Too many deposits in 24 hours",
          riskScore: 0.8
        };
      }

      // Check deposit amount limits
      ctx?.step?.("Validating deposit amount limits");
      if (amount > 10000) {
        ctx?.fail?.("Deposit amount exceeds maximum limit");
        return {
          isValid: false,
          reason: "Deposit amount exceeds maximum limit",
          riskScore: 0.9
        };
      }

      ctx?.success?.("Deposit fraud check passed");
      return {
        isValid: true,
        riskScore: 0.1
      };
    } catch (error) {
      logger.error("FOREX_FRAUD", "Fraud detection error", error);
      ctx?.fail?.("Fraud detection check failed");
      return {
        isValid: true, // Default to allow if check fails
        riskScore: 0.5
      };
    }
  }

  static async checkWithdrawal(
    userId: string,
    amount: number,
    currency: string,
    ctx?: LogContext
  ): Promise<FraudCheckResult> {
    try {
      ctx?.step?.(`Running fraud detection for withdrawal: ${amount} ${currency}`);

      // Check recent withdrawal history
      ctx?.step?.("Checking recent withdrawal history");
      const recentWithdrawals = await models.transaction.count({
        where: {
          userId,
          type: 'FOREX_WITHDRAW',
          createdAt: {
            [Op.gte]: new Date(Date.now() - 24 * 60 * 60 * 1000) // Last 24 hours
          }
        }
      });

      // Check if too many withdrawals
      if (recentWithdrawals > 5) {
        ctx?.fail?.("Too many withdrawal attempts in 24 hours");
        return {
          isValid: false,
          reason: "Too many withdrawal attempts in 24 hours",
          riskScore: 0.9
        };
      }

      ctx?.success?.("Withdrawal fraud check passed");
      return {
        isValid: true,
        riskScore: 0.2
      };
    } catch (error) {
      logger.error("FOREX_FRAUD", "Fraud detection error", error);
      ctx?.fail?.("Fraud detection check failed");
      return {
        isValid: true,
        riskScore: 0.5
      };
    }
  }

  static async checkInvestment(
    userId: string,
    amount: number,
    planId: string,
    ctx?: LogContext
  ): Promise<FraudCheckResult> {
    try {
      ctx?.step?.(`Running fraud detection for investment: ${amount} in plan ${planId}`);

      // Check if user has too many active investments
      ctx?.step?.("Checking active investments count");
      const activeInvestments = await models.forexInvestment.count({
        where: {
          userId,
          status: 'ACTIVE'
        }
      });

      if (activeInvestments > 10) {
        ctx?.fail?.("Too many active investments");
        return {
          isValid: false,
          reason: "Too many active investments",
          riskScore: 0.7
        };
      }

      // Check investment amount
      ctx?.step?.("Validating investment amount limits");
      if (amount > 50000) {
        ctx?.fail?.("Investment amount exceeds maximum limit");
        return {
          isValid: false,
          reason: "Investment amount exceeds maximum limit",
          riskScore: 0.8
        };
      }

      ctx?.success?.("Investment fraud check passed");
      return {
        isValid: true,
        riskScore: 0.1
      };
    } catch (error) {
      logger.error("FOREX_FRAUD", "Fraud detection error", error);
      ctx?.fail?.("Fraud detection check failed");
      return {
        isValid: true,
        riskScore: 0.5
      };
    }
  }
}