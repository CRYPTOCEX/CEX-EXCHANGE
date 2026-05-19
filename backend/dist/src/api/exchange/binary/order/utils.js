"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.baseBinaryOrderSchema = void 0;
exports.getBinaryOrder = getBinaryOrder;
exports.getBinaryOrdersByStatus = getBinaryOrdersByStatus;
exports.processBinaryRewards = processBinaryRewards;
exports.validateBinaryProfit = validateBinaryProfit;
exports.ensureNotBanned = ensureNotBanned;
exports.ensureExchange = ensureExchange;
const db_1 = require("@b/db");
const affiliate_1 = require("@b/utils/affiliate");
const exchange_1 = __importDefault(require("@b/utils/exchange"));
const utils_1 = require("@b/api/exchange/utils");
const schema_1 = require("@b/utils/schema");
const error_1 = require("@b/utils/error");
exports.baseBinaryOrderSchema = {
    id: (0, schema_1.baseStringSchema)("ID of the binary order", undefined, undefined, false, undefined, "uuid"),
    userId: (0, schema_1.baseStringSchema)("User ID associated with the order"),
    symbol: (0, schema_1.baseStringSchema)("Trading symbol"),
    price: (0, schema_1.baseNumberSchema)("Entry price of the order"),
    amount: (0, schema_1.baseNumberSchema)("Amount of the order"),
    profit: (0, schema_1.baseNumberSchema)("Profit from the order"),
    side: (0, schema_1.baseStringSchema)("Side of the order (e.g., BUY, SELL)"),
    type: (0, schema_1.baseStringSchema)("Type of order (e.g., LIMIT, MARKET)"),
    barrier: (0, schema_1.baseNumberSchema)("Barrier price of the order", true),
    strikePrice: (0, schema_1.baseNumberSchema)("Strike price of the order", true),
    payoutPerPoint: (0, schema_1.baseNumberSchema)("Payout per point of the order", true),
    status: (0, schema_1.baseStringSchema)("Status of the order (e.g., OPEN, CLOSED)"),
    isDemo: (0, schema_1.baseBooleanSchema)("Whether the order is a demo"),
    closedAt: (0, schema_1.baseDateTimeSchema)("Time when the order was closed", true),
    closePrice: (0, schema_1.baseNumberSchema)("Price at which the order was closed"),
    createdAt: (0, schema_1.baseDateTimeSchema)("Creation date of the order"),
    updatedAt: (0, schema_1.baseDateTimeSchema)("Last update date of the order", true),
};
async function getBinaryOrder(userId, id, ctx) {
    var _a, _b, _c, _d;
    try {
        (_a = ctx === null || ctx === void 0 ? void 0 : ctx.step) === null || _a === void 0 ? void 0 : _a.call(ctx, "Fetching binary order " + id + " for user " + userId);
        const response = await db_1.models.binaryOrder.findOne({
            where: {
                id,
                userId,
            },
        });
        if (!response) {
            const errorMsg = "Binary order with ID " + id + " not found";
            (_b = ctx === null || ctx === void 0 ? void 0 : ctx.fail) === null || _b === void 0 ? void 0 : _b.call(ctx, errorMsg);
            throw (0, error_1.createError)({ statusCode: 404, message: errorMsg });
        }
        (_c = ctx === null || ctx === void 0 ? void 0 : ctx.success) === null || _c === void 0 ? void 0 : _c.call(ctx, "Successfully fetched binary order " + id);
        return response.get({ plain: true });
    }
    catch (error) {
        (_d = ctx === null || ctx === void 0 ? void 0 : ctx.fail) === null || _d === void 0 ? void 0 : _d.call(ctx, error.message);
        throw error;
    }
}
async function getBinaryOrdersByStatus(status, ctx) {
    var _a, _b, _c;
    try {
        (_a = ctx === null || ctx === void 0 ? void 0 : ctx.step) === null || _a === void 0 ? void 0 : _a.call(ctx, "Fetching binary orders with status: " + status);
        const orders = (await db_1.models.binaryOrder.findAll({
            where: { status },
        }));
        (_b = ctx === null || ctx === void 0 ? void 0 : ctx.success) === null || _b === void 0 ? void 0 : _b.call(ctx, "Successfully fetched " + orders.length + " binary orders with status " + status);
        return orders;
    }
    catch (error) {
        (_c = ctx === null || ctx === void 0 ? void 0 : ctx.fail) === null || _c === void 0 ? void 0 : _c.call(ctx, error.message);
        throw error;
    }
}
async function processBinaryRewards(userId, amount, status, currency, ctx, orderId) {
    var _a, _b, _c;
    try {
        (_a = ctx === null || ctx === void 0 ? void 0 : ctx.step) === null || _a === void 0 ? void 0 : _a.call(ctx, "Processing binary rewards for user " + userId + ", status: " + status);
        let rewardType;
        if (status === "WIN") {
            rewardType = "BINARY_WIN";
        }
        else if (status === "LOSS" || status === "DRAW") {
            rewardType = "BINARY_TRADE_VOLUME";
        }
        const sourceId = orderId ? `${rewardType}:binary_order:${orderId}` : undefined;
        await (0, affiliate_1.processRewards)(userId, amount, rewardType, currency, sourceId);
        (_b = ctx === null || ctx === void 0 ? void 0 : ctx.success) === null || _b === void 0 ? void 0 : _b.call(ctx, "Successfully processed binary rewards for user " + userId);
    }
    catch (error) {
        (_c = ctx === null || ctx === void 0 ? void 0 : ctx.fail) === null || _c === void 0 ? void 0 : _c.call(ctx, error.message);
        throw error;
    }
}
function validateBinaryProfit(value) {
    const profit = parseFloat(value || "87");
    if (isNaN(profit) || profit < 0)
        return 87;
    return profit;
}
async function ensureNotBanned(ctx) {
    var _a, _b, _c, _d;
    try {
        (_a = ctx === null || ctx === void 0 ? void 0 : ctx.step) === null || _a === void 0 ? void 0 : _a.call(ctx, "Checking ban status");
        const unblockTime = await (0, utils_1.loadBanStatus)();
        if (await (0, utils_1.handleBanStatus)(unblockTime)) {
            const errorMsg = "Service temporarily unavailable. Please try again later.";
            (_b = ctx === null || ctx === void 0 ? void 0 : ctx.fail) === null || _b === void 0 ? void 0 : _b.call(ctx, errorMsg);
            throw (0, error_1.createError)({
                statusCode: 503,
                message: errorMsg,
            });
        }
        (_c = ctx === null || ctx === void 0 ? void 0 : ctx.success) === null || _c === void 0 ? void 0 : _c.call(ctx, "User is not banned");
    }
    catch (error) {
        (_d = ctx === null || ctx === void 0 ? void 0 : ctx.fail) === null || _d === void 0 ? void 0 : _d.call(ctx, error.message);
        throw error;
    }
}
async function ensureExchange(attempts = 3, delayMs = 500, ctx) {
    var _a, _b, _c, _d, _e;
    try {
        (_a = ctx === null || ctx === void 0 ? void 0 : ctx.step) === null || _a === void 0 ? void 0 : _a.call(ctx, "Starting exchange (max attempts: " + attempts + ")");
        for (let i = 0; i < attempts; i++) {
            (_b = ctx === null || ctx === void 0 ? void 0 : ctx.step) === null || _b === void 0 ? void 0 : _b.call(ctx, "Exchange start attempt " + (i + 1) + "/" + attempts);
            const exchange = await exchange_1.default.startExchange();
            if (exchange) {
                (_c = ctx === null || ctx === void 0 ? void 0 : ctx.success) === null || _c === void 0 ? void 0 : _c.call(ctx, "Exchange started successfully");
                return exchange;
            }
            if (i < attempts - 1)
                await new Promise((resolve) => setTimeout(resolve, delayMs));
        }
        const errorMsg = "Service temporarily unavailable. Please try again later.";
        (_d = ctx === null || ctx === void 0 ? void 0 : ctx.fail) === null || _d === void 0 ? void 0 : _d.call(ctx, errorMsg);
        throw (0, error_1.createError)({
            statusCode: 503,
            message: errorMsg,
        });
    }
    catch (error) {
        (_e = ctx === null || ctx === void 0 ? void 0 : ctx.fail) === null || _e === void 0 ? void 0 : _e.call(ctx, error.message);
        throw error;
    }
}
