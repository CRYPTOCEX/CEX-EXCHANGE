"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const db_1 = require("@b/db");
const error_1 = require("@b/utils/error");
const utils_1 = require("@b/api/(ext)/copy-trading/utils");
const security_1 = require("@b/api/(ext)/copy-trading/utils/security");
const sequelize_1 = require("sequelize");
const wallet_1 = require("@b/services/wallet");
exports.metadata = {
    summary: "Add Funds to Market Allocation",
    description: "Adds funds to a specific market allocation within a subscription.",
    operationId: "addFundsToAllocation",
    tags: ["Copy Trading", "Followers", "Allocations"],
    requiresAuth: true,
    logModule: "COPY",
    logTitle: "Add funds to allocation",
    middleware: ["copyTradingFunds"],
    parameters: [
        {
            name: "id",
            in: "path",
            required: true,
            schema: { type: "string", format: "uuid" },
            description: "Subscription (follower) ID",
        },
        {
            name: "allocationId",
            in: "path",
            required: true,
            schema: { type: "string", format: "uuid" },
            description: "Allocation ID",
        },
    ],
    requestBody: {
        required: true,
        content: {
            "application/json": {
                schema: {
                    type: "object",
                    properties: {
                        amount: {
                            type: "number",
                            minimum: 0.00000001,
                            maximum: 10000000,
                            description: "Amount to add",
                        },
                        currency: {
                            type: "string",
                            enum: ["BASE", "QUOTE"],
                            description: "Which currency to add (BASE for selling, QUOTE for buying)",
                        },
                    },
                    required: ["amount", "currency"],
                },
            },
        },
    },
    responses: {
        200: {
            description: "Funds added successfully",
            content: {
                "application/json": {
                    schema: {
                        type: "object",
                        properties: {
                            message: { type: "string" },
                            allocation: { type: "object" },
                        },
                    },
                },
            },
        },
        400: { description: "Bad Request" },
        401: { description: "Unauthorized" },
        403: { description: "Forbidden" },
        404: { description: "Allocation not found" },
        429: { description: "Too Many Requests" },
        500: { description: "Internal Server Error" },
    },
};
exports.default = async (data) => {
    const { user, params, body, ctx } = data;
    const { id, allocationId } = params;
    if (!(user === null || user === void 0 ? void 0 : user.id)) {
        throw (0, error_1.createError)({ statusCode: 401, message: "Unauthorized" });
    }
    if (!(0, security_1.isValidUUID)(id) || !(0, security_1.isValidUUID)(allocationId)) {
        throw (0, error_1.createError)({ statusCode: 400, message: "Invalid ID format" });
    }
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Validating request");
    const validation = (0, security_1.validateFundOperation)(body);
    if (!validation.valid) {
        (0, security_1.throwValidationError)(validation);
    }
    const { amount } = validation.sanitized;
    const currencyType = body.currency;
    if (!currencyType || !["BASE", "QUOTE"].includes(currencyType)) {
        throw (0, error_1.createError)({
            statusCode: 400,
            message: "Currency type must be BASE or QUOTE",
        });
    }
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Fetching subscription");
    const subscription = await db_1.models.copyTradingFollower.findByPk(id);
    if (!subscription) {
        throw (0, error_1.createError)({ statusCode: 404, message: "Subscription not found" });
    }
    if (subscription.userId !== user.id) {
        throw (0, error_1.createError)({ statusCode: 403, message: "Access denied" });
    }
    if (subscription.status === "STOPPED") {
        throw (0, error_1.createError)({
            statusCode: 400,
            message: "Cannot add funds to a stopped subscription",
        });
    }
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Fetching allocation");
    const allocation = await db_1.models.copyTradingFollowerAllocation.findOne({
        where: { id: allocationId, followerId: id },
    });
    if (!allocation) {
        throw (0, error_1.createError)({ statusCode: 404, message: "Allocation not found" });
    }
    const allocationData = allocation;
    const [baseCurrency, quoteCurrency] = allocationData.symbol.split("/");
    const targetCurrency = currencyType === "BASE" ? baseCurrency : quoteCurrency;
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Adding funds to allocation");
    await db_1.sequelize.transaction(async (transaction) => {
        const transferIdempotencyKey = `ct_add_funds_${allocationId}_${currencyType}_${Date.now()}`;
        const transferResult = await wallet_1.walletService.transfer({
            idempotencyKey: transferIdempotencyKey,
            fromUserId: user.id,
            toUserId: user.id,
            fromWalletType: "ECO",
            toWalletType: "COPY_TRADING",
            fromCurrency: targetCurrency,
            toCurrency: targetCurrency,
            amount,
            description: `Transfer ${amount} ${targetCurrency} from ECO to CT wallet (add funds to ${allocationData.symbol})`,
            metadata: {
                followerId: id,
                leaderId: subscription.leaderId,
                allocationId,
                symbol: allocationData.symbol,
                currencyType,
            },
            transaction,
        });
        if (currencyType === "BASE") {
            await allocation.update({ baseAmount: (0, sequelize_1.literal)(`"baseAmount" + ${amount}`) }, { transaction });
        }
        else {
            await allocation.update({ quoteAmount: (0, sequelize_1.literal)(`"quoteAmount" + ${amount}`) }, { transaction });
        }
        await (0, utils_1.createCopyTradingTransaction)({
            userId: user.id,
            leaderId: subscription.leaderId,
            followerId: id,
            type: "ALLOCATION",
            amount,
            currency: targetCurrency,
            balanceBefore: transferResult.fromResult.previousBalance,
            balanceAfter: transferResult.fromResult.newBalance,
            description: `Transfer ${amount} ${targetCurrency} from ECO to CT wallet (add funds to ${allocationData.symbol})`,
            metadata: JSON.stringify({
                allocationId,
                symbol: allocationData.symbol,
                currencyType,
            }),
        }, transaction);
        await (0, utils_1.createAuditLog)({
            entityType: "ALLOCATION",
            entityId: allocationId,
            action: "ALLOCATE",
            oldValue: {
                baseAmount: allocationData.baseAmount,
                quoteAmount: allocationData.quoteAmount,
            },
            newValue: {
                baseAmount: currencyType === "BASE"
                    ? allocationData.baseAmount + amount
                    : allocationData.baseAmount,
                quoteAmount: currencyType === "QUOTE"
                    ? allocationData.quoteAmount + amount
                    : allocationData.quoteAmount,
            },
            userId: user.id,
        }, transaction);
    });
    await allocation.reload();
    ctx === null || ctx === void 0 ? void 0 : ctx.success(`Added ${amount} ${targetCurrency} to ${allocationData.symbol}`);
    return {
        message: `Successfully added ${amount} ${targetCurrency} to ${allocationData.symbol}`,
        allocation: allocation.toJSON(),
    };
};
