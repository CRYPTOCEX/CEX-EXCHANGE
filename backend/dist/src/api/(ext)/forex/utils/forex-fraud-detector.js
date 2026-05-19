"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ForexFraudDetector = void 0;
const db_1 = require("@b/db");
const sequelize_1 = require("sequelize");
const console_1 = require("@b/utils/console");
class ForexFraudDetector {
    static async checkDeposit(userId, amount, currency, ctx) {
        var _a, _b, _c, _d, _e, _f, _g;
        try {
            (_a = ctx === null || ctx === void 0 ? void 0 : ctx.step) === null || _a === void 0 ? void 0 : _a.call(ctx, `Running fraud detection for deposit: ${amount} ${currency}`);
            (_b = ctx === null || ctx === void 0 ? void 0 : ctx.step) === null || _b === void 0 ? void 0 : _b.call(ctx, "Checking recent deposit history");
            const recentDeposits = await db_1.models.transaction.count({
                where: {
                    userId,
                    type: 'FOREX_DEPOSIT',
                    createdAt: {
                        [sequelize_1.Op.gte]: new Date(Date.now() - 24 * 60 * 60 * 1000)
                    }
                }
            });
            if (recentDeposits > 10) {
                (_c = ctx === null || ctx === void 0 ? void 0 : ctx.fail) === null || _c === void 0 ? void 0 : _c.call(ctx, "Too many deposits in 24 hours");
                return {
                    isValid: false,
                    reason: "Too many deposits in 24 hours",
                    riskScore: 0.8
                };
            }
            (_d = ctx === null || ctx === void 0 ? void 0 : ctx.step) === null || _d === void 0 ? void 0 : _d.call(ctx, "Validating deposit amount limits");
            if (amount > 10000) {
                (_e = ctx === null || ctx === void 0 ? void 0 : ctx.fail) === null || _e === void 0 ? void 0 : _e.call(ctx, "Deposit amount exceeds maximum limit");
                return {
                    isValid: false,
                    reason: "Deposit amount exceeds maximum limit",
                    riskScore: 0.9
                };
            }
            (_f = ctx === null || ctx === void 0 ? void 0 : ctx.success) === null || _f === void 0 ? void 0 : _f.call(ctx, "Deposit fraud check passed");
            return {
                isValid: true,
                riskScore: 0.1
            };
        }
        catch (error) {
            console_1.logger.error("FOREX_FRAUD", "Fraud detection error", error);
            (_g = ctx === null || ctx === void 0 ? void 0 : ctx.fail) === null || _g === void 0 ? void 0 : _g.call(ctx, "Fraud detection check failed");
            return {
                isValid: true,
                riskScore: 0.5
            };
        }
    }
    static async checkWithdrawal(userId, amount, currency, ctx) {
        var _a, _b, _c, _d, _e;
        try {
            (_a = ctx === null || ctx === void 0 ? void 0 : ctx.step) === null || _a === void 0 ? void 0 : _a.call(ctx, `Running fraud detection for withdrawal: ${amount} ${currency}`);
            (_b = ctx === null || ctx === void 0 ? void 0 : ctx.step) === null || _b === void 0 ? void 0 : _b.call(ctx, "Checking recent withdrawal history");
            const recentWithdrawals = await db_1.models.transaction.count({
                where: {
                    userId,
                    type: 'FOREX_WITHDRAW',
                    createdAt: {
                        [sequelize_1.Op.gte]: new Date(Date.now() - 24 * 60 * 60 * 1000)
                    }
                }
            });
            if (recentWithdrawals > 5) {
                (_c = ctx === null || ctx === void 0 ? void 0 : ctx.fail) === null || _c === void 0 ? void 0 : _c.call(ctx, "Too many withdrawal attempts in 24 hours");
                return {
                    isValid: false,
                    reason: "Too many withdrawal attempts in 24 hours",
                    riskScore: 0.9
                };
            }
            (_d = ctx === null || ctx === void 0 ? void 0 : ctx.success) === null || _d === void 0 ? void 0 : _d.call(ctx, "Withdrawal fraud check passed");
            return {
                isValid: true,
                riskScore: 0.2
            };
        }
        catch (error) {
            console_1.logger.error("FOREX_FRAUD", "Fraud detection error", error);
            (_e = ctx === null || ctx === void 0 ? void 0 : ctx.fail) === null || _e === void 0 ? void 0 : _e.call(ctx, "Fraud detection check failed");
            return {
                isValid: true,
                riskScore: 0.5
            };
        }
    }
    static async checkInvestment(userId, amount, planId, ctx) {
        var _a, _b, _c, _d, _e, _f, _g;
        try {
            (_a = ctx === null || ctx === void 0 ? void 0 : ctx.step) === null || _a === void 0 ? void 0 : _a.call(ctx, `Running fraud detection for investment: ${amount} in plan ${planId}`);
            (_b = ctx === null || ctx === void 0 ? void 0 : ctx.step) === null || _b === void 0 ? void 0 : _b.call(ctx, "Checking active investments count");
            const activeInvestments = await db_1.models.forexInvestment.count({
                where: {
                    userId,
                    status: 'ACTIVE'
                }
            });
            if (activeInvestments > 10) {
                (_c = ctx === null || ctx === void 0 ? void 0 : ctx.fail) === null || _c === void 0 ? void 0 : _c.call(ctx, "Too many active investments");
                return {
                    isValid: false,
                    reason: "Too many active investments",
                    riskScore: 0.7
                };
            }
            (_d = ctx === null || ctx === void 0 ? void 0 : ctx.step) === null || _d === void 0 ? void 0 : _d.call(ctx, "Validating investment amount limits");
            if (amount > 50000) {
                (_e = ctx === null || ctx === void 0 ? void 0 : ctx.fail) === null || _e === void 0 ? void 0 : _e.call(ctx, "Investment amount exceeds maximum limit");
                return {
                    isValid: false,
                    reason: "Investment amount exceeds maximum limit",
                    riskScore: 0.8
                };
            }
            (_f = ctx === null || ctx === void 0 ? void 0 : ctx.success) === null || _f === void 0 ? void 0 : _f.call(ctx, "Investment fraud check passed");
            return {
                isValid: true,
                riskScore: 0.1
            };
        }
        catch (error) {
            console_1.logger.error("FOREX_FRAUD", "Fraud detection error", error);
            (_g = ctx === null || ctx === void 0 ? void 0 : ctx.fail) === null || _g === void 0 ? void 0 : _g.call(ctx, "Fraud detection check failed");
            return {
                isValid: true,
                riskScore: 0.5
            };
        }
    }
}
exports.ForexFraudDetector = ForexFraudDetector;
