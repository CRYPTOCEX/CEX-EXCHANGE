import { models } from "@b/db";

interface FraudCheckResult {
  isValid: boolean;
  reason?: string;
  riskScore: number;
}

export class ForexFraudDetector {
  static async checkDeposit(
    userId: string, 
    amount: number, 
    currency: string
  ): Promise<FraudCheckResult> {
    try {
      // Check recent deposit history
      const recentDeposits = await models.forexLog.count({
        where: {
          userId,
          action: 'DEPOSIT',
          createdAt: {
            $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) // Last 24 hours
          }
        }
      });

      // Check if too many deposits in short time
      if (recentDeposits > 10) {
        return {
          isValid: false,
          reason: "Too many deposits in 24 hours",
          riskScore: 0.8
        };
      }

      // Check deposit amount limits
      if (amount > 10000) {
        return {
          isValid: false,
          reason: "Deposit amount exceeds maximum limit",
          riskScore: 0.9
        };
      }

      return {
        isValid: true,
        riskScore: 0.1
      };
    } catch (error) {
      console.error("Fraud detection error:", error);
      return {
        isValid: true, // Default to allow if check fails
        riskScore: 0.5
      };
    }
  }

  static async checkWithdrawal(
    userId: string,
    amount: number,
    currency: string
  ): Promise<FraudCheckResult> {
    try {
      // Check recent withdrawal history
      const recentWithdrawals = await models.forexLog.count({
        where: {
          userId,
          action: 'WITHDRAWAL',
          createdAt: {
            $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) // Last 24 hours
          }
        }
      });

      // Check if too many withdrawals
      if (recentWithdrawals > 5) {
        return {
          isValid: false,
          reason: "Too many withdrawal attempts in 24 hours",
          riskScore: 0.9
        };
      }

      return {
        isValid: true,
        riskScore: 0.2
      };
    } catch (error) {
      console.error("Fraud detection error:", error);
      return {
        isValid: true,
        riskScore: 0.5
      };
    }
  }

  static async checkInvestment(
    userId: string,
    amount: number,
    planId: string
  ): Promise<FraudCheckResult> {
    try {
      // Check if user has too many active investments
      const activeInvestments = await models.forexInvestment.count({
        where: {
          userId,
          status: 'ACTIVE'
        }
      });

      if (activeInvestments > 10) {
        return {
          isValid: false,
          reason: "Too many active investments",
          riskScore: 0.7
        };
      }

      // Check investment amount
      if (amount > 50000) {
        return {
          isValid: false,
          reason: "Investment amount exceeds maximum limit",
          riskScore: 0.8
        };
      }

      return {
        isValid: true,
        riskScore: 0.1
      };
    } catch (error) {
      console.error("Fraud detection error:", error);
      return {
        isValid: true,
        riskScore: 0.5
      };
    }
  }
}