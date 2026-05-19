"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const db_1 = require("@b/db");
const wallet_1 = require("@b/api/(ext)/ecosystem/utils/wallet");
const error_1 = require("@b/utils/error");
const wallet_2 = require("@b/services/wallet");
const query_1 = require("@b/utils/query");
exports.metadata = {
    summary: "Transfers funds between user wallets",
    description: "Allows a user to transfer funds to another user's wallet.",
    operationId: "transferFunds",
    tags: ["Wallet", "Transfer"],
    logModule: "ECO_TRANSFER",
    logTitle: "Transfer funds between wallets",
    parameters: [
        {
            name: "id",
            in: "path",
            required: true,
            schema: {
                type: "string",
                description: "UUID of the recipient's wallet or user",
            },
        },
    ],
    requestBody: {
        required: true,
        content: {
            "application/json": {
                schema: {
                    type: "object",
                    properties: {
                        amount: { type: "number", description: "Amount to transfer" },
                        currency: {
                            type: "string",
                            description: "Currency for the transfer",
                        },
                    },
                    required: ["amount", "currency"],
                },
            },
        },
    },
    responses: {
        200: {
            description: "Transfer completed successfully",
            content: {
                "application/json": {
                    schema: {
                        type: "object",
                        properties: {
                            message: {
                                type: "string",
                                description: "Success message indicating the transfer has been processed.",
                            },
                        },
                    },
                },
            },
        },
        401: query_1.unauthorizedResponse,
        404: (0, query_1.notFoundMetadataResponse)("Wallet"),
        500: query_1.serverErrorResponse,
    },
    requiresAuth: true,
};
exports.default = async (data) => {
    const { params, body, user, ctx } = data;
    if (!(user === null || user === void 0 ? void 0 : user.id)) {
        throw (0, error_1.createError)({ statusCode: 401, message: "Unauthorized" });
    }
    try {
        const { id } = params;
        const { currency, amount } = body;
        ctx === null || ctx === void 0 ? void 0 : ctx.step("Validating transfer request");
        if (!id || !currency || !amount) {
            throw (0, error_1.createError)({
                statusCode: 400,
                message: "Missing required parameters",
            });
        }
        ctx === null || ctx === void 0 ? void 0 : ctx.step("Retrieving sender wallet");
        const senderWallet = await (0, wallet_1.getWalletByUserIdAndCurrency)(user.id, currency);
        if (!senderWallet) {
            ctx === null || ctx === void 0 ? void 0 : ctx.fail(`Sender wallet not found for currency ${currency}`);
            throw (0, error_1.createError)({ statusCode: 404, message: "User wallet not found" });
        }
        ctx === null || ctx === void 0 ? void 0 : ctx.step("Verifying recipient user");
        const recipientAccount = await db_1.models.user.findOne({
            where: { id },
        });
        if (!recipientAccount) {
            ctx === null || ctx === void 0 ? void 0 : ctx.fail("Recipient user not found");
            throw (0, error_1.createError)({
                statusCode: 404,
                message: "Recipient user not found",
            });
        }
        ctx === null || ctx === void 0 ? void 0 : ctx.step("Retrieving or creating recipient wallet");
        let recipientWallet = (await (0, wallet_1.getWalletByUserIdAndCurrency)(recipientAccount.id, currency));
        if (!recipientWallet) {
            recipientWallet = await (0, wallet_1.storeWallet)(recipientAccount, currency);
        }
        ctx === null || ctx === void 0 ? void 0 : ctx.step("Verifying sender balance");
        if (senderWallet.balance < amount) {
            ctx === null || ctx === void 0 ? void 0 : ctx.fail(`Insufficient funds: ${senderWallet.balance} < ${amount}`);
            throw (0, error_1.createError)({ statusCode: 400, message: "Insufficient funds" });
        }
        ctx === null || ctx === void 0 ? void 0 : ctx.step("Processing transfer transaction");
        const idempotencyKey = `eco_transfer_${user.id}_${id}_${currency}_${amount}`;
        await wallet_2.walletService.transfer({
            idempotencyKey,
            fromUserId: user.id,
            toUserId: recipientAccount.id,
            fromWalletType: "ECO",
            toWalletType: "ECO",
            fromCurrency: currency,
            toCurrency: currency,
            amount,
            description: `Transfer ${amount} ${currency} to user ${id}`,
            metadata: {
                recipientId: recipientAccount.id,
                senderId: user.id,
            },
        });
        ctx === null || ctx === void 0 ? void 0 : ctx.success(`Transferred ${amount} ${currency} to user ${id}`);
        return { message: "Transfer successful" };
    }
    catch (error) {
        console.log(`Failed to transfer: ${error.message}`);
        ctx === null || ctx === void 0 ? void 0 : ctx.fail(`Transfer failed: ${error.message}`);
        throw (0, error_1.createError)({
            statusCode: 500,
            message: `Failed to transfer: ${error.message}`,
        });
    }
};
