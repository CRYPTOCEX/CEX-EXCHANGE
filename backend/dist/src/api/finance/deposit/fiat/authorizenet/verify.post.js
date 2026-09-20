"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const query_1 = require("@b/utils/query");
const error_1 = require("@b/utils/error");
const console_1 = require("@b/utils/console");
const emails_1 = require("@b/utils/emails");
const db_1 = require("@b/db");
const utils_1 = require("./utils");
const wallet_1 = require("@b/services/wallet");
const utils_2 = require("@b/api/finance/utils");
const credit_contract_1 = require("../credit-contract");
exports.metadata = {
    summary: "Verifies an Authorize.Net transaction",
    description: "Confirms the validity of an Authorize.Net transaction by its reference ID, ensuring the transaction is authenticated and processing the deposit.",
    operationId: "verifyAuthorizeNetTransaction",
    tags: ["Finance", "Deposit"],
    requiresAuth: true,
    logModule: "AUTHORIZENET_DEPOSIT",
    logTitle: "Verify Authorize.Net transaction",
    requestBody: {
        required: true,
        content: {
            "application/json": {
                schema: {
                    type: "object",
                    properties: {
                        referenceId: {
                            type: "string",
                            description: "The transaction reference ID",
                        },
                    },
                    required: ["referenceId"],
                },
            },
        },
    },
    responses: {
        200: {
            description: "Transaction verified successfully. Returns the transaction details and updated wallet balance.",
            content: {
                "application/json": {
                    schema: {
                        type: "object",
                        properties: {
                            status: {
                                type: "boolean",
                                description: "Indicates if the request was successful",
                            },
                            statusCode: {
                                type: "number",
                                description: "HTTP status code",
                                example: 200,
                            },
                            data: {
                                type: "object",
                                properties: {
                                    transactionId: {
                                        type: "string",
                                        description: "Transaction ID",
                                    },
                                    status: {
                                        type: "string",
                                        description: "Transaction status",
                                    },
                                    amount: {
                                        type: "number",
                                        description: "Transaction amount",
                                    },
                                    currency: {
                                        type: "string",
                                        description: "Currency code",
                                    },
                                },
                            },
                        },
                    },
                },
            },
        },
        401: query_1.unauthorizedResponse,
        404: (0, query_1.notFoundMetadataResponse)("Authorize.Net"),
        500: query_1.serverErrorResponse,
    },
};
exports.default = async (data) => {
    var _a, _b;
    const { user, body, ctx } = data;
    if (!(user === null || user === void 0 ? void 0 : user.id))
        throw (0, error_1.createError)({ statusCode: 401, message: "User not authenticated" });
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Fetching user account");
    const userPk = await db_1.models.user.findByPk(user.id);
    if (!userPk)
        throw (0, error_1.createError)({ statusCode: 404, message: "User not found" });
    const { referenceId } = body;
    if (!referenceId) {
        throw (0, error_1.createError)({ statusCode: 400, message: "Reference ID is required" });
    }
    const transaction = await db_1.models.transaction.findOne({
        where: { referenceId: referenceId, userId: user.id },
    });
    if (!transaction) {
        throw (0, error_1.createError)({ statusCode: 404, message: "Transaction not found" });
    }
    if (transaction.status === "COMPLETED") {
        return {
            status: true,
            statusCode: 200,
            data: {
                transactionId: transaction.id,
                status: transaction.status,
                amount: transaction.amount,
                currency: JSON.parse(transaction.metadata || "{}").currency,
                message: "Transaction already completed",
            },
        };
    }
    if (transaction.status !== "PENDING") {
        throw (0, error_1.createError)({ statusCode: 400, message: `Transaction is in ${transaction.status} state and cannot be verified` });
    }
    try {
        const config = (0, utils_1.getAuthorizeNetConfig)();
        const metadata = JSON.parse(transaction.metadata || "{}");
        const currency = metadata.currency;
        const anetTransId = referenceId;
        const detailsRequest = {
            getTransactionDetailsRequest: {
                merchantAuthentication: {
                    name: config.apiLoginId,
                    transactionKey: config.transactionKey,
                },
                transId: anetTransId,
            },
        };
        const detailsResponse = await (0, utils_1.makeAuthorizeNetRequest)(detailsRequest, config);
        if (detailsResponse.messages.resultCode !== "Ok") {
            const msg = ((_b = (_a = detailsResponse.messages.message) === null || _a === void 0 ? void 0 : _a[0]) === null || _b === void 0 ? void 0 : _b.text) || "Unknown error";
            throw (0, error_1.createError)({
                statusCode: 400,
                message: `Authorize.Net verification failed: ${msg}`,
            });
        }
        const txDetails = detailsResponse.transaction;
        if (!txDetails) {
            throw (0, error_1.createError)({
                statusCode: 400,
                message: "Authorize.Net returned no transaction details",
            });
        }
        if (txDetails.responseCode !== 1) {
            throw (0, error_1.createError)({
                statusCode: 400,
                message: `Authorize.Net transaction not approved (responseCode: ${txDetails.responseCode}, status: ${txDetails.transactionStatus})`,
            });
        }
        const authorizeNetGateway = await db_1.models.depositGateway.findOne({
            where: { alias: "authorizenet" },
        });
        if (!authorizeNetGateway) {
            throw (0, error_1.createError)({ statusCode: 404, message: "Authorize.Net gateway not found" });
        }
        ctx === null || ctx === void 0 ? void 0 : ctx.step("Finding or creating wallet");
        const walletResult = await wallet_1.walletCreationService.getOrCreateWallet(user.id, "FIAT", currency);
        const wallet = walletResult.wallet;
        const depositAmount = transaction.amount;
        const feeAmount = transaction.fee || 0;
        ctx === null || ctx === void 0 ? void 0 : ctx.step("Processing deposit via wallet service");
        const depositResult = await db_1.sequelize.transaction(async (t) => {
            const res = await (0, utils_2.processFiatDeposit)({
                userId: user.id,
                currency,
                amount: depositAmount,
                fee: feeAmount,
                referenceId: (0, credit_contract_1.creditReferenceId)(transaction, referenceId),
                method: "AUTHORIZENET",
                description: `Authorize.Net deposit - ${depositAmount} ${currency}`,
                idempotencyKey: `authorizenet_deposit_${referenceId}`,
                ctx,
                transaction: t,
            });
            await db_1.models.transaction.update({
                status: "COMPLETED",
                description: `Deposit of ${depositAmount} ${currency} to ${userPk.firstName} ${userPk.lastName} wallet by Authorize.Net.`,
            }, {
                where: { id: transaction.id },
                transaction: t,
            });
            return res;
        });
        try {
            ctx === null || ctx === void 0 ? void 0 : ctx.step("Sending notification email");
            await (0, emails_1.sendFiatTransactionEmail)(userPk, {
                ...transaction.toJSON(),
                status: "COMPLETED",
            }, currency, depositResult.newBalance);
        }
        catch (emailError) {
            console_1.logger.error("AUTHORIZENET", "Failed to send transaction email", emailError);
        }
        return {
            status: true,
            statusCode: 200,
            data: {
                confirmed: true,
                transactionId: transaction.id,
                status: "COMPLETED",
                amount: depositAmount,
                currency: currency,
                fee: feeAmount,
                newBalance: depositResult.newBalance,
                referenceId: referenceId,
            },
        };
    }
    catch (error) {
        console_1.logger.error("AUTHORIZENET", "Transaction verification error", error);
        await db_1.models.transaction.update({
            status: "FAILED",
            description: `Failed Authorize.Net deposit: ${error instanceof Error ? error.message : "Unknown error"}`,
        }, {
            where: { id: transaction.id },
        });
        throw (0, error_1.createError)({ statusCode: 500, message: error instanceof Error ? error.message : "Failed to verify Authorize.Net transaction" });
    }
};
