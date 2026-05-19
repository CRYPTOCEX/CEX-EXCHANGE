"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const query_1 = require("@b/utils/query");
const error_1 = require("@b/utils/error");
const console_1 = require("@b/utils/console");
const utils_1 = require("./utils");
const db_1 = require("@b/db");
const wallet_1 = require("@b/services/wallet");
const publicUrl = process.env.NEXT_PUBLIC_SITE_URL;
const isProduction = process.env.NODE_ENV === "production";
exports.metadata = {
    summary: "Creates an Adyen payment session",
    description: "Initiates an Adyen payment process by creating a payment session using Adyen's Sessions flow. This endpoint supports web checkout with multiple payment methods including cards, digital wallets, and local payment methods.",
    operationId: "createAdyenPayment",
    tags: ["Finance", "Deposit"],
    logModule: "ADYEN_DEPOSIT",
    logTitle: "Create Adyen payment session",
    requestBody: {
        description: "Payment information for Adyen session creation",
        content: {
            "application/json": {
                schema: {
                    type: "object",
                    properties: {
                        amount: {
                            type: "number",
                            description: "Payment amount in base currency units",
                        },
                        currency: {
                            type: "string",
                            description: "Currency code (e.g., USD, EUR)",
                        },
                        countryCode: {
                            type: "string",
                            description: "Country code for payment method localization",
                            nullable: true,
                        },
                    },
                    required: ["amount", "currency"],
                },
            },
        },
    },
    responses: {
        200: {
            description: "Adyen payment session created successfully. Returns session data for Adyen Web Drop-in integration.",
            content: {
                "application/json": {
                    schema: {
                        type: "object",
                        properties: {
                            sessionId: {
                                type: "string",
                                description: "Adyen session ID",
                            },
                            sessionData: {
                                type: "string",
                                description: "Adyen session data for client-side integration",
                            },
                            amount: {
                                type: "object",
                                properties: {
                                    value: {
                                        type: "number",
                                        description: "Payment amount in minor units",
                                    },
                                    currency: {
                                        type: "string",
                                        description: "Currency code",
                                    },
                                },
                            },
                            reference: {
                                type: "string",
                                description: "Payment reference",
                            },
                            returnUrl: {
                                type: "string",
                                description: "Return URL after payment completion",
                            },
                        },
                    },
                },
            },
        },
        401: query_1.unauthorizedResponse,
        404: (0, query_1.notFoundMetadataResponse)("Adyen"),
        500: query_1.serverErrorResponse,
    },
    requiresAuth: true,
};
exports.default = async (data) => {
    var _a;
    const { user, body, query, ctx } = data;
    if (!user)
        throw (0, error_1.createError)({ statusCode: 401, message: "User not authenticated" });
    const { amount, currency, countryCode = "US" } = body;
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Fetching payment gateway configuration");
    const gateway = await db_1.models.depositGateway.findOne({
        where: { alias: "adyen", status: true },
    });
    if (!gateway)
        throw (0, error_1.createError)({ statusCode: 404, message: "Adyen gateway not found or disabled" });
    if (!((_a = gateway.currencies) === null || _a === void 0 ? void 0 : _a.includes(currency))) {
        throw (0, error_1.createError)({ statusCode: 400, message: `Currency ${currency} is not supported by Adyen` });
    }
    const { fixedFee, percentageFee } = gateway;
    const percentageFeeNum = typeof percentageFee === 'number' ? percentageFee : 0;
    const fixedFeeNum = typeof fixedFee === 'number' ? fixedFee : 0;
    const feeAmount = (amount * percentageFeeNum) / 100 + fixedFeeNum;
    const totalAmount = amount + feeAmount;
    try {
        const config = (0, utils_1.getAdyenConfig)();
        const amountInMinorUnits = (0, utils_1.convertToMinorUnits)(totalAmount, currency);
        const reference = `DEP-${user.id}-${Date.now()}`;
        const sessionRequest = {
            amount: {
                value: amountInMinorUnits,
                currency: currency.toUpperCase(),
            },
            reference,
            merchantAccount: config.merchantAccount,
            returnUrl: `${publicUrl}${isProduction ? "" : ":3000"}/finance/deposit?gateway=adyen&status=success&reference=${reference}`,
            countryCode: countryCode.toUpperCase(),
            shopperEmail: user.email,
            shopperReference: user.id.toString(),
            channel: "Web",
        };
        const sessionResponse = await (0, utils_1.makeAdyenApiRequest)("/sessions", sessionRequest, config);
        ctx === null || ctx === void 0 ? void 0 : ctx.step("Getting or creating wallet");
        const walletResult = await wallet_1.walletCreationService.getOrCreateWallet(user.id, "FIAT", currency);
        const wallet = walletResult.wallet;
        ctx === null || ctx === void 0 ? void 0 : ctx.step("Creating transaction record");
        const transaction = await db_1.models.transaction.create({
            referenceId: reference,
            userId: user.id,
            walletId: wallet.id,
            type: "DEPOSIT",
            status: "PENDING",
            amount: totalAmount,
            fee: feeAmount,
            description: `Adyen deposit of ${totalAmount} ${currency}`,
            metadata: JSON.stringify({
                gateway: "adyen",
                sessionId: sessionResponse.id,
                pspReference: null,
                currency,
                originalAmount: amount,
                feeAmount,
                countryCode,
            }),
        });
        ctx === null || ctx === void 0 ? void 0 : ctx.success("Adyen deposit completed successfully");
        return {
            sessionId: sessionResponse.id,
            sessionData: sessionResponse.sessionData,
            amount: sessionResponse.amount,
            reference: sessionResponse.reference,
            returnUrl: sessionResponse.returnUrl,
            transactionId: transaction.id,
        };
    }
    catch (error) {
        console_1.logger.error("ADYEN", "Payment session creation error", error);
        throw (0, error_1.createError)({
            statusCode: 500,
            message: `Failed to create Adyen payment session: ${(error === null || error === void 0 ? void 0 : error.message) || String(error)}`
        });
    }
};
