"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const db_1 = require("@b/db");
const error_1 = require("@b/utils/error");
const settings_core_1 = require("@b/api/(ext)/copy-trading/utils/settings-core");
const security_1 = require("@b/api/(ext)/copy-trading/utils/security");
const sequelize_1 = require("sequelize");
const wallet_1 = require("@b/services/wallet");
const errors_1 = require("@b/services/wallet/errors");
const fundIdempotency_1 = require("@b/api/(ext)/copy-trading/utils/fundIdempotency");
const attestation_1 = require("@b/utils/attestation");
const native_binary_1 = require("../../../../utils/native-binary");
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
                            alreadyProcessed: {
                                type: "boolean",
                                description: "True when the caller replayed its own idempotency-key and no funds were moved a second time.",
                            },
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
    const { user, params, body, headers, ctx } = data;
    (0, native_binary_1.assertNotBinaryOnNativeApp)(data, body === null || body === void 0 ? void 0 : body.marketType, "add funds to a binary allocation");
    const { id, allocationId } = params;
    if (!(user === null || user === void 0 ? void 0 : user.id)) {
        throw (0, error_1.createError)({ statusCode: 401, message: "Unauthorized" });
    }
    await (0, attestation_1.assertAttestedOnNativeApp)(data, user.id, "copy-trading");
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
    const isBinaryAllocation = allocationData.marketType === "BINARY";
    if (isBinaryAllocation && currencyType === "BASE") {
        throw (0, error_1.createError)({
            statusCode: 400,
            message: "Binary allocations only hold a quote-currency stake budget",
        });
    }
    const sourceWalletType = isBinaryAllocation ? "SPOT" : "ECO";
    if (isBinaryAllocation) {
        const { checkCopyTypeAvailability } = await Promise.resolve().then(() => __importStar(require("@b/api/(ext)/copy-trading/utils")));
        const availability = await checkCopyTypeAvailability("BINARY");
        if (!availability.available) {
            throw (0, error_1.createError)({
                statusCode: 400,
                message: availability.reason || "Binary copy trading is not available",
            });
        }
    }
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Adding funds to allocation");
    const { key: transferIdempotencyKey } = (0, fundIdempotency_1.buildFundOperationIdempotencyKey)({
        operation: "add_funds",
        allocationId,
        currencyType,
        clientKey: headers === null || headers === void 0 ? void 0 : headers["idempotency-key"],
    });
    let alreadyProcessed = false;
    await db_1.sequelize.transaction(async (transaction) => {
        let transferResult;
        try {
            transferResult = await wallet_1.walletService.transfer({
                idempotencyKey: transferIdempotencyKey,
                fromUserId: user.id,
                toUserId: user.id,
                fromWalletType: sourceWalletType,
                toWalletType: "COPY_TRADING",
                fromCurrency: targetCurrency,
                toCurrency: targetCurrency,
                amount,
                description: `Transfer ${amount} ${targetCurrency} from ${sourceWalletType} to CT wallet (add funds to ${allocationData.symbol})`,
                metadata: {
                    followerId: id,
                    leaderId: subscription.leaderId,
                    allocationId,
                    symbol: allocationData.symbol,
                    currencyType,
                },
                transaction,
            });
        }
        catch (transferError) {
            if (transferError instanceof errors_1.DuplicateOperationError ||
                (transferError === null || transferError === void 0 ? void 0 : transferError.name) === "DuplicateOperationError") {
                alreadyProcessed = true;
                ctx === null || ctx === void 0 ? void 0 : ctx.step(`Add-funds transfer already processed for ${allocationData.symbol} (idempotent retry)`);
                return;
            }
            throw transferError;
        }
        if (currencyType === "BASE") {
            await allocation.update({ baseAmount: (0, sequelize_1.literal)(`baseAmount + ${amount}`) }, { transaction });
        }
        else {
            await allocation.update({ quoteAmount: (0, sequelize_1.literal)(`quoteAmount + ${amount}`) }, { transaction });
        }
        await (0, settings_core_1.createCopyTradingTransaction)({
            userId: user.id,
            leaderId: subscription.leaderId,
            followerId: id,
            type: "ALLOCATION",
            amount,
            currency: targetCurrency,
            balanceBefore: transferResult.fromResult.previousBalance,
            balanceAfter: transferResult.fromResult.newBalance,
            description: `Transfer ${amount} ${targetCurrency} from ${sourceWalletType} to CT wallet (add funds to ${allocationData.symbol})`,
            metadata: JSON.stringify({
                allocationId,
                symbol: allocationData.symbol,
                currencyType,
            }),
        }, transaction);
        await (0, settings_core_1.createAuditLog)({
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
    if (alreadyProcessed) {
        ctx === null || ctx === void 0 ? void 0 : ctx.success(`Add funds already applied for ${allocationData.symbol} (retry)`);
        return {
            message: `This top-up was already applied to ${allocationData.symbol}; nothing was moved again.`,
            alreadyProcessed: true,
            allocation: allocation.toJSON(),
        };
    }
    ctx === null || ctx === void 0 ? void 0 : ctx.success(`Added ${amount} ${targetCurrency} to ${allocationData.symbol}`);
    return {
        message: `Successfully added ${amount} ${targetCurrency} to ${allocationData.symbol}`,
        allocation: allocation.toJSON(),
    };
};
