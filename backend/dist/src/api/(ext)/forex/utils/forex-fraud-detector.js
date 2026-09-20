"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ForexFraudDetector = void 0;
const db_1 = require("@b/db");
const sequelize_1 = require("sequelize");
const console_1 = require("@b/utils/console");
const money_1 = require("./money");
const DEPOSIT_CEILING_USD = 10000;
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
            const depositValue = await (0, money_1.toReportingValue)(amount, currency, "FOREX_FRAUD");
            if (depositValue > DEPOSIT_CEILING_USD) {
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
        var _a, _b, _c, _d, _e, _f;
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
            if (recentWithdrawals >= 3) {
                (_d = ctx === null || ctx === void 0 ? void 0 : ctx.step) === null || _d === void 0 ? void 0 : _d.call(ctx, `${recentWithdrawals} withdrawals in the last 24 hours — flagging for review`);
                return {
                    isValid: true,
                    reason: "Unusual withdrawal frequency",
                    riskScore: 0.8
                };
            }
            (_e = ctx === null || ctx === void 0 ? void 0 : ctx.success) === null || _e === void 0 ? void 0 : _e.call(ctx, "Withdrawal fraud check passed");
            return {
                isValid: true,
                riskScore: 0.2
            };
        }
        catch (error) {
            console_1.logger.error("FOREX_FRAUD", "Fraud detection error", error);
            (_f = ctx === null || ctx === void 0 ? void 0 : ctx.fail) === null || _f === void 0 ? void 0 : _f.call(ctx, "Fraud detection check failed");
            return {
                isValid: true,
                riskScore: 0.5
            };
        }
    }
    static async checkInvestment(userId, amount, planId, ctx) {
        var _a, _b, _c, _d, _e, _f, _g;
        var _h;
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
            (_d = ctx === null || ctx === void 0 ? void 0 : ctx.step) === null || _d === void 0 ? void 0 : _d.call(ctx, "Validating investment amount against the plan's limit");
            const plan = await db_1.models.forexPlan.findByPk(planId, {
                attributes: ["maxAmount"],
            });
            const planMax = Number((_h = plan === null || plan === void 0 ? void 0 : plan.maxAmount) !== null && _h !== void 0 ? _h : 0);
            if (planMax > 0 && Number(amount) > planMax) {
                (_e = ctx === null || ctx === void 0 ? void 0 : ctx.fail) === null || _e === void 0 ? void 0 : _e.call(ctx, "Investment amount exceeds the plan's maximum");
                return {
                    isValid: false,
                    reason: `Investment amount exceeds this plan's maximum of ${planMax}`,
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
