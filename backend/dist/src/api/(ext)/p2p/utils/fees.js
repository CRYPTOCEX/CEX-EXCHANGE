"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getMinimumTradeAmounts = getMinimumTradeAmounts;
exports.validateMinimumTradeAmount = validateMinimumTradeAmount;
exports.calculateEscrowFee = calculateEscrowFee;
const db_1 = require("@b/db");
const console_1 = require("@b/utils/console");
async function getMinimumTradeAmounts(ctx) {
    var _a, _b, _c, _d, _e;
    try {
        (_a = ctx === null || ctx === void 0 ? void 0 : ctx.step) === null || _a === void 0 ? void 0 : _a.call(ctx, "Loading minimum trade amounts");
        const extensionSettings = await db_1.models.settings.findOne({
            where: { key: "p2p" },
        });
        if (extensionSettings === null || extensionSettings === void 0 ? void 0 : extensionSettings.value) {
            const p2pSettings = JSON.parse(extensionSettings.value);
            if (p2pSettings.MinimumTradeAmounts) {
                (_b = ctx === null || ctx === void 0 ? void 0 : ctx.success) === null || _b === void 0 ? void 0 : _b.call(ctx, "Loaded minimum trade amounts from extension settings");
                return p2pSettings.MinimumTradeAmounts;
            }
        }
        const legacySettings = await db_1.models.settings.findOne({
            where: { key: "p2pMinimumTradeAmounts" },
        });
        if (legacySettings === null || legacySettings === void 0 ? void 0 : legacySettings.value) {
            (_c = ctx === null || ctx === void 0 ? void 0 : ctx.success) === null || _c === void 0 ? void 0 : _c.call(ctx, "Loaded minimum trade amounts from legacy settings");
            return JSON.parse(legacySettings.value);
        }
    }
    catch (error) {
        (_d = ctx === null || ctx === void 0 ? void 0 : ctx.fail) === null || _d === void 0 ? void 0 : _d.call(ctx, error.message || "Failed to load minimum trade amounts");
        console_1.logger.error("P2P_FEES", "Failed to load P2P minimum trade amounts", error);
    }
    (_e = ctx === null || ctx === void 0 ? void 0 : ctx.step) === null || _e === void 0 ? void 0 : _e.call(ctx, "Using default minimum trade amounts");
    return {
        BTC: 0.00005,
        ETH: 0.001,
        LTC: 0.01,
        BCH: 0.001,
        DOGE: 10,
        XRP: 5,
        ADA: 5,
        SOL: 0.01,
        MATIC: 1,
    };
}
async function validateMinimumTradeAmount(amount, currency, ctx) {
    var _a, _b, _c, _d;
    try {
        (_a = ctx === null || ctx === void 0 ? void 0 : ctx.step) === null || _a === void 0 ? void 0 : _a.call(ctx, `Validating minimum trade amount for ${amount} ${currency}`);
        const minimums = await getMinimumTradeAmounts(ctx);
        const minimum = minimums[currency.toUpperCase()];
        if (minimum && amount < minimum) {
            (_b = ctx === null || ctx === void 0 ? void 0 : ctx.fail) === null || _b === void 0 ? void 0 : _b.call(ctx, `Amount ${amount} ${currency} is below minimum ${minimum}`);
            return {
                valid: false,
                minimum,
                message: `Minimum trade amount for ${currency} is ${minimum}`,
            };
        }
        (_c = ctx === null || ctx === void 0 ? void 0 : ctx.success) === null || _c === void 0 ? void 0 : _c.call(ctx, `Trade amount validation passed for ${amount} ${currency}`);
        return { valid: true };
    }
    catch (error) {
        (_d = ctx === null || ctx === void 0 ? void 0 : ctx.fail) === null || _d === void 0 ? void 0 : _d.call(ctx, error.message || "Failed to validate minimum trade amount");
        throw error;
    }
}
async function calculateEscrowFee(amount, currency, ctx) {
    var _a, _b, _c, _d, _e;
    try {
        (_a = ctx === null || ctx === void 0 ? void 0 : ctx.step) === null || _a === void 0 ? void 0 : _a.call(ctx, `Calculating escrow fee for ${amount} ${currency}`);
        let escrowFeeRate = 0.2;
        const extensionSettings = await db_1.models.settings.findOne({
            where: { key: "p2p" },
        });
        if (extensionSettings === null || extensionSettings === void 0 ? void 0 : extensionSettings.value) {
            try {
                const p2pSettings = JSON.parse(extensionSettings.value);
                if (p2pSettings.EscrowFeeRate !== undefined) {
                    escrowFeeRate = parseFloat(p2pSettings.EscrowFeeRate);
                }
                else if (p2pSettings.escrowFeeRate !== undefined) {
                    escrowFeeRate = parseFloat(p2pSettings.escrowFeeRate);
                }
            }
            catch (parseError) {
                (_b = ctx === null || ctx === void 0 ? void 0 : ctx.fail) === null || _b === void 0 ? void 0 : _b.call(ctx, "Failed to parse P2P extension settings");
                console_1.logger.error("P2P_FEES", "Failed to parse P2P extension settings", parseError);
            }
        }
        if (escrowFeeRate === 0.2) {
            const legacySettings = await db_1.models.settings.findOne({
                where: { key: "p2pEscrowFeeRate" },
            });
            if (legacySettings === null || legacySettings === void 0 ? void 0 : legacySettings.value) {
                escrowFeeRate = parseFloat(legacySettings.value);
            }
        }
        (_c = ctx === null || ctx === void 0 ? void 0 : ctx.step) === null || _c === void 0 ? void 0 : _c.call(ctx, `Using escrow fee rate: ${escrowFeeRate}%`);
        const escrowFee = amount * (escrowFeeRate / 100);
        const minEscrowFee = 0.0001;
        const finalFee = parseFloat(Math.max(escrowFee, minEscrowFee).toFixed(8));
        (_d = ctx === null || ctx === void 0 ? void 0 : ctx.success) === null || _d === void 0 ? void 0 : _d.call(ctx, `Calculated escrow fee: ${finalFee}`);
        return finalFee;
    }
    catch (error) {
        (_e = ctx === null || ctx === void 0 ? void 0 : ctx.fail) === null || _e === void 0 ? void 0 : _e.call(ctx, error.message || "Failed to calculate escrow fee");
        console_1.logger.error("P2P_FEES", "Failed to calculate escrow fee", error);
        throw error;
    }
}
