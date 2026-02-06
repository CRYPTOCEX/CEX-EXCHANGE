"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getMinimumTradeAmounts = getMinimumTradeAmounts;
exports.validateMinimumTradeAmount = validateMinimumTradeAmount;
exports.getP2PFeeConfiguration = getP2PFeeConfiguration;
exports.calculateTradeFees = calculateTradeFees;
exports.calculateEscrowFee = calculateEscrowFee;
exports.getUserFeeDiscount = getUserFeeDiscount;
exports.applyFeeDiscount = applyFeeDiscount;
exports.createFeeTransactions = createFeeTransactions;
exports.calculateFeePreview = calculateFeePreview;
const db_1 = require("@b/db");
const sequelize_1 = require("sequelize");
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
async function getP2PFeeConfiguration(ctx) {
    var _a, _b, _c, _d;
    try {
        (_a = ctx === null || ctx === void 0 ? void 0 : ctx.step) === null || _a === void 0 ? void 0 : _a.call(ctx, "Loading P2P fee configuration");
        const settings = await db_1.models.settings.findOne({
            where: { key: "p2pFeeConfiguration" },
        });
        if (settings === null || settings === void 0 ? void 0 : settings.value) {
            (_b = ctx === null || ctx === void 0 ? void 0 : ctx.success) === null || _b === void 0 ? void 0 : _b.call(ctx, "Loaded fee configuration from settings");
            return JSON.parse(settings.value);
        }
    }
    catch (error) {
        (_c = ctx === null || ctx === void 0 ? void 0 : ctx.fail) === null || _c === void 0 ? void 0 : _c.call(ctx, error.message || "Failed to load fee configuration");
        console_1.logger.error("P2P_FEES", "Failed to load P2P fee configuration", error);
    }
    (_d = ctx === null || ctx === void 0 ? void 0 : ctx.step) === null || _d === void 0 ? void 0 : _d.call(ctx, "Using default fee configuration");
    return {
        maker: 0.1,
        taker: 0.2,
        minimum: 0.01,
        maximum: 100,
    };
}
async function calculateTradeFees(amount, currency, offerOwnerId, tradeInitiatorId, buyerId, sellerId, customConfig, ctx) {
    var _a, _b, _c, _d;
    try {
        (_a = ctx === null || ctx === void 0 ? void 0 : ctx.step) === null || _a === void 0 ? void 0 : _a.call(ctx, `Calculating trade fees for ${amount} ${currency}`);
        const config = customConfig || await getP2PFeeConfiguration(ctx);
        (_b = ctx === null || ctx === void 0 ? void 0 : ctx.step) === null || _b === void 0 ? void 0 : _b.call(ctx, ` Using fee config: maker=${config.maker}%, taker=${config.taker}%`);
        const makerFeeAmount = amount * (config.maker / 100);
        const takerFeeAmount = amount * (config.taker / 100);
        const appliedMakerFee = Math.min(Math.max(makerFeeAmount, config.minimum), config.maximum);
        const appliedTakerFee = Math.min(Math.max(takerFeeAmount, config.minimum), config.maximum);
        const buyerIsMaker = buyerId === offerOwnerId;
        const sellerIsMaker = sellerId === offerOwnerId;
        const buyerFee = buyerIsMaker ? appliedMakerFee : appliedTakerFee;
        const sellerFee = sellerIsMaker ? appliedMakerFee : appliedTakerFee;
        const netAmountBuyer = amount - buyerFee;
        const netAmountSeller = amount - sellerFee;
        const fees = {
            buyerFee: parseFloat(buyerFee.toFixed(8)),
            sellerFee: parseFloat(sellerFee.toFixed(8)),
            totalFee: parseFloat((buyerFee + sellerFee).toFixed(8)),
            netAmountBuyer: parseFloat(netAmountBuyer.toFixed(8)),
            netAmountSeller: parseFloat(netAmountSeller.toFixed(8)),
        };
        (_c = ctx === null || ctx === void 0 ? void 0 : ctx.success) === null || _c === void 0 ? void 0 : _c.call(ctx, `Calculated fees: buyer=${fees.buyerFee}, seller=${fees.sellerFee}, total=${fees.totalFee}`);
        return fees;
    }
    catch (error) {
        (_d = ctx === null || ctx === void 0 ? void 0 : ctx.fail) === null || _d === void 0 ? void 0 : _d.call(ctx, error.message || "Failed to calculate trade fees");
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
        return 0;
    }
}
async function getUserFeeDiscount(userId, ctx) {
    var _a, _b, _c, _d;
    try {
        (_a = ctx === null || ctx === void 0 ? void 0 : ctx.step) === null || _a === void 0 ? void 0 : _a.call(ctx, `Calculating fee discount for user ${userId}`);
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        const volumeResult = await db_1.models.p2pTrade.findOne({
            attributes: [
                [(0, sequelize_1.fn)("SUM", (0, sequelize_1.col)("amount")), "volume"],
            ],
            where: {
                [sequelize_1.Op.or]: [
                    { buyerId: userId },
                    { sellerId: userId },
                ],
                status: "COMPLETED",
                createdAt: {
                    [sequelize_1.Op.gte]: thirtyDaysAgo,
                },
            },
            raw: true,
        });
        const volume = parseFloat((volumeResult === null || volumeResult === void 0 ? void 0 : volumeResult.volume) || "0");
        (_b = ctx === null || ctx === void 0 ? void 0 : ctx.step) === null || _b === void 0 ? void 0 : _b.call(ctx, `User 30-day trading volume: $${volume}`);
        const tiers = [
            { minVolume: 100000, discount: 50 },
            { minVolume: 50000, discount: 30 },
            { minVolume: 10000, discount: 20 },
            { minVolume: 5000, discount: 10 },
            { minVolume: 1000, discount: 5 },
        ];
        const applicableTier = tiers.find(tier => volume >= tier.minVolume);
        const discount = (applicableTier === null || applicableTier === void 0 ? void 0 : applicableTier.discount) || 0;
        (_c = ctx === null || ctx === void 0 ? void 0 : ctx.success) === null || _c === void 0 ? void 0 : _c.call(ctx, `User fee discount: ${discount}%`);
        return discount;
    }
    catch (error) {
        (_d = ctx === null || ctx === void 0 ? void 0 : ctx.fail) === null || _d === void 0 ? void 0 : _d.call(ctx, error.message || "Failed to calculate user fee discount");
        console_1.logger.error("P2P_FEES", "Failed to calculate user fee discount", error);
        return 0;
    }
}
async function applyFeeDiscount(fees, userId, ctx) {
    var _a, _b, _c, _d, _e;
    try {
        (_a = ctx === null || ctx === void 0 ? void 0 : ctx.step) === null || _a === void 0 ? void 0 : _a.call(ctx, `Applying fee discount for user ${userId}`);
        const discount = await getUserFeeDiscount(userId, ctx);
        if (discount === 0) {
            (_b = ctx === null || ctx === void 0 ? void 0 : ctx.step) === null || _b === void 0 ? void 0 : _b.call(ctx, "No discount applicable");
            return fees;
        }
        (_c = ctx === null || ctx === void 0 ? void 0 : ctx.step) === null || _c === void 0 ? void 0 : _c.call(ctx, `Applying ${discount}% discount`);
        const discountMultiplier = 1 - (discount / 100);
        const discountedFees = {
            buyerFee: parseFloat((fees.buyerFee * discountMultiplier).toFixed(8)),
            sellerFee: parseFloat((fees.sellerFee * discountMultiplier).toFixed(8)),
            totalFee: parseFloat((fees.totalFee * discountMultiplier).toFixed(8)),
            netAmountBuyer: parseFloat((fees.netAmountBuyer + fees.buyerFee * (discount / 100)).toFixed(8)),
            netAmountSeller: parseFloat((fees.netAmountSeller + fees.sellerFee * (discount / 100)).toFixed(8)),
        };
        (_d = ctx === null || ctx === void 0 ? void 0 : ctx.success) === null || _d === void 0 ? void 0 : _d.call(ctx, `Fee discount applied: ${discount}%`);
        return discountedFees;
    }
    catch (error) {
        (_e = ctx === null || ctx === void 0 ? void 0 : ctx.fail) === null || _e === void 0 ? void 0 : _e.call(ctx, error.message || "Failed to apply fee discount");
        console_1.logger.error("P2P_FEES", "Failed to apply fee discount", error);
        return fees;
    }
}
async function createFeeTransactions(tradeId, buyerId, sellerId, fees, currency, transaction, ctx) {
    var _a, _b, _c, _d, _e;
    try {
        (_a = ctx === null || ctx === void 0 ? void 0 : ctx.step) === null || _a === void 0 ? void 0 : _a.call(ctx, `Creating fee transactions for trade ${tradeId}`);
        const feeTransactions = [];
        if (fees.buyerFee > 0) {
            feeTransactions.push({
                userId: buyerId,
                type: "P2P_FEE",
                status: "COMPLETED",
                amount: -fees.buyerFee,
                fee: 0,
                currency,
                description: `P2P trading fee for trade #${tradeId}`,
                referenceId: tradeId,
            });
        }
        if (fees.sellerFee > 0) {
            feeTransactions.push({
                userId: sellerId,
                type: "P2P_FEE",
                status: "COMPLETED",
                amount: -fees.sellerFee,
                fee: 0,
                currency,
                description: `P2P trading fee for trade #${tradeId}`,
                referenceId: tradeId,
            });
        }
        if (feeTransactions.length > 0) {
            (_b = ctx === null || ctx === void 0 ? void 0 : ctx.step) === null || _b === void 0 ? void 0 : _b.call(ctx, `Creating ${feeTransactions.length} fee transaction records`);
            await db_1.models.transaction.bulkCreate(feeTransactions, { transaction });
            (_c = ctx === null || ctx === void 0 ? void 0 : ctx.success) === null || _c === void 0 ? void 0 : _c.call(ctx, `Created ${feeTransactions.length} fee transactions`);
        }
        else {
            (_d = ctx === null || ctx === void 0 ? void 0 : ctx.step) === null || _d === void 0 ? void 0 : _d.call(ctx, "No fee transactions to create");
        }
    }
    catch (error) {
        (_e = ctx === null || ctx === void 0 ? void 0 : ctx.fail) === null || _e === void 0 ? void 0 : _e.call(ctx, error.message || "Failed to create fee transactions");
        throw error;
    }
}
function calculateFeePreview(amount, feeRate, ismaker = false) {
    const fee = amount * (feeRate / 100);
    const netAmount = amount - fee;
    return {
        fee: parseFloat(fee.toFixed(8)),
        netAmount: parseFloat(netAmount.toFixed(8)),
        feePercentage: `${feeRate}%`,
    };
}
