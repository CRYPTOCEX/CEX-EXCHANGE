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
const error_1 = require("@b/utils/error");
const db_1 = require("@b/db");
const console_1 = require("@b/utils/console");
const utils_1 = require("./utils");
exports.metadata = {
    summary: 'Creates a Mollie payment session',
    description: 'Initiates a payment with Mollie and returns checkout URL',
    operationId: 'createMolliePayment',
    tags: ['Finance', 'Deposit', 'Mollie'],
    requiresAuth: true,
    logModule: "MOLLIE_DEPOSIT",
    logTitle: "Create Mollie payment session",
    requestBody: {
        required: true,
        content: {
            'application/json': {
                schema: {
                    type: 'object',
                    properties: {
                        amount: {
                            type: 'number',
                            description: 'Payment amount',
                            minimum: 0.01,
                        },
                        currency: {
                            type: 'string',
                            description: 'Payment currency code',
                            example: 'EUR',
                        },
                        method: {
                            type: 'string',
                            description: 'Preferred payment method (optional)',
                            example: 'creditcard',
                        },
                        locale: {
                            type: 'string',
                            description: 'User locale for payment page',
                            example: 'en',
                        },
                    },
                    required: ['amount', 'currency'],
                },
            },
        },
    },
    responses: {
        200: {
            description: 'Payment session created successfully',
            content: {
                'application/json': {
                    schema: {
                        type: 'object',
                        properties: {
                            success: { type: 'boolean' },
                            data: {
                                type: 'object',
                                properties: {
                                    transactionId: { type: 'string' },
                                    paymentId: { type: 'string' },
                                    checkoutUrl: { type: 'string' },
                                    amount: { type: 'number' },
                                    currency: { type: 'string' },
                                    status: { type: 'string' },
                                    expiresAt: { type: 'string' },
                                    availableMethods: {
                                        type: 'array',
                                        items: { type: 'string' },
                                    },
                                },
                            },
                        },
                    },
                },
            },
        },
        400: { description: 'Bad request - invalid parameters' },
        401: { description: 'Unauthorized' },
        500: { description: 'Internal server error' },
    },
};
exports.default = async (data) => {
    var _a, _b;
    const { body, user, ctx } = data;
    if (!(user === null || user === void 0 ? void 0 : user.id)) {
        throw (0, error_1.createError)({
            statusCode: 401,
            message: 'Authentication required',
        });
    }
    if (!body.amount || !body.currency) {
        throw (0, error_1.createError)({
            statusCode: 400,
            message: 'Amount and currency are required',
        });
    }
    (0, utils_1.validateMollieConfig)();
    if (!(0, utils_1.isCurrencySupported)(body.currency)) {
        throw (0, error_1.createError)({
            statusCode: 400,
            message: `Currency ${body.currency} is not supported by Mollie`,
        });
    }
    if (body.amount <= 0) {
        throw (0, error_1.createError)({
            statusCode: 400,
            message: 'Amount must be greater than 0',
        });
    }
    const { amount, currency, method, locale = 'en' } = body;
    try {
        ctx === null || ctx === void 0 ? void 0 : ctx.step("Fetching payment gateway configuration");
        const gateway = await db_1.models.depositGateway.findOne({
            where: { alias: 'mollie' },
        });
        if (!gateway || !gateway.status) {
            throw (0, error_1.createError)({
                statusCode: 400,
                message: 'Mollie payment gateway is not available',
            });
        }
        const rawCurrencies = gateway.currencies || '[]';
        const supportedCurrencies = Array.isArray(rawCurrencies) ? rawCurrencies : JSON.parse(rawCurrencies);
        if (!supportedCurrencies.includes(currency.toUpperCase())) {
            throw (0, error_1.createError)({
                statusCode: 400,
                message: `Currency ${currency} is not supported`,
            });
        }
        const minAmount = gateway.getMinAmount(currency);
        const maxAmount = gateway.getMaxAmount(currency);
        if (amount < minAmount) {
            throw (0, error_1.createError)({
                statusCode: 400,
                message: `Minimum amount is ${minAmount} ${currency}`,
            });
        }
        if (maxAmount !== null && amount > maxAmount) {
            throw (0, error_1.createError)({
                statusCode: 400,
                message: `Maximum amount is ${maxAmount} ${currency}`,
            });
        }
        const reference = (0, utils_1.generateMollieReference)();
        const { walletCreationService } = await Promise.resolve().then(() => __importStar(require('@b/services/wallet')));
        const walletResult = await walletCreationService.getOrCreateWallet(user.id, 'FIAT', currency.toUpperCase());
        const wallet = walletResult.wallet;
        ctx === null || ctx === void 0 ? void 0 : ctx.step("Creating transaction record");
        const transaction = await db_1.models.transaction.create({
            userId: user.id,
            walletId: wallet.id,
            type: 'DEPOSIT',
            status: 'PENDING',
            amount: amount,
            fee: 0,
            description: `Mollie deposit - ${amount} ${currency}`,
            referenceId: reference,
            metadata: JSON.stringify({
                gateway: 'mollie',
                currency: currency,
                method: method || 'auto',
                locale: locale,
            }),
        });
        const availableMethods = (0, utils_1.getAvailablePaymentMethods)(currency);
        if (method && !availableMethods.includes(method)) {
            throw (0, error_1.createError)({
                statusCode: 400,
                message: `Payment method ${method} is not available for ${currency}`,
            });
        }
        const mollieAmount = (0, utils_1.formatMollieAmount)(amount, currency);
        const mollieLocale = (0, utils_1.getMollieLocale)(locale);
        const paymentRequest = {
            amount: {
                currency: currency.toUpperCase(),
                value: mollieAmount,
            },
            description: `Deposit ${amount} ${currency.toUpperCase()}`,
            redirectUrl: `${(0, utils_1.buildReturnUrl)()}?transaction=${transaction.id}`,
            webhookUrl: (0, utils_1.buildWebhookUrl)(),
            metadata: {
                transactionId: transaction.id,
                userId: user.id,
                platform: 'v5',
                type: 'deposit',
            },
            locale: mollieLocale,
        };
        if (method) {
            paymentRequest.method = method;
        }
        if (user.firstName && user.lastName) {
            paymentRequest.consumerName = `${user.firstName} ${user.lastName}`;
        }
        const molliePayment = await (0, utils_1.makeApiRequest)('/payments', {
            method: 'POST',
            body: paymentRequest,
        });
        if (!molliePayment.id || !((_b = (_a = molliePayment._links) === null || _a === void 0 ? void 0 : _a.checkout) === null || _b === void 0 ? void 0 : _b.href)) {
            throw (0, error_1.createError)({
                statusCode: 500,
                message: 'Failed to create Mollie payment session',
            });
        }
        const existingMetadata = typeof transaction.metadata === 'string'
            ? JSON.parse(transaction.metadata || '{}')
            : (transaction.metadata || {});
        await db_1.models.transaction.update({
            referenceId: molliePayment.id,
            metadata: JSON.stringify({
                ...existingMetadata,
                molliePaymentId: molliePayment.id,
                mollieStatus: molliePayment.status,
                expiresAt: molliePayment.expiresAt,
                checkoutUrl: molliePayment._links.checkout.href,
            }),
        }, {
            where: { id: transaction.id },
        });
        return {
            success: true,
            data: {
                transactionId: transaction.id,
                paymentId: molliePayment.id,
                checkoutUrl: molliePayment._links.checkout.href,
                amount: amount,
                currency: currency.toUpperCase(),
                status: molliePayment.status,
                expiresAt: molliePayment.expiresAt,
                availableMethods: availableMethods,
            },
        };
    }
    catch (error) {
        console_1.logger.error("MOLLIE", "Payment creation error", error);
        if (error.statusCode) {
            throw error;
        }
        throw (0, error_1.createError)({
            statusCode: 500,
            message: error.message || 'Failed to create Mollie payment',
        });
    }
};
