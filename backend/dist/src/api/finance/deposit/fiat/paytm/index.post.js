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
const utils_1 = require("./utils");
exports.metadata = {
    summary: 'Creates a Paytm payment session',
    description: 'Initializes a payment with Paytm and returns transaction token for comprehensive payment methods including UPI, cards, net banking, wallets, and EMI across India and international markets',
    operationId: 'createPaytmPayment',
    tags: ['Finance', 'Deposit', 'Paytm'],
    requiresAuth: true,
    logModule: "PAYTM_DEPOSIT",
    logTitle: "Create Paytm payment session",
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
                            minimum: 1,
                        },
                        currency: {
                            type: 'string',
                            description: 'Payment currency code',
                            enum: ['INR', 'USD', 'EUR', 'GBP', 'AUD', 'CAD', 'SGD', 'AED', 'JPY', 'CNY', 'CHF', 'QAR'],
                            example: 'INR',
                        },
                        paymentModes: {
                            type: 'array',
                            items: { type: 'string' },
                            description: 'Preferred payment modes',
                            example: ['upi', 'card', 'netbanking'],
                        },
                        metadata: {
                            type: 'object',
                            description: 'Additional metadata for the transaction',
                            additionalProperties: true,
                        },
                    },
                    required: ['amount', 'currency'],
                },
            },
        },
    },
    responses: {
        200: {
            description: 'Paytm payment session created successfully',
            content: {
                'application/json': {
                    schema: {
                        type: 'object',
                        properties: {
                            success: { type: 'boolean' },
                            data: {
                                type: 'object',
                                properties: {
                                    transaction_id: { type: 'string' },
                                    order_id: { type: 'string' },
                                    txn_token: { type: 'string' },
                                    status: { type: 'string' },
                                    gateway: { type: 'string' },
                                    amount: { type: 'number' },
                                    currency: { type: 'string' },
                                    region: { type: 'string' },
                                    available_methods: {
                                        type: 'object',
                                        additionalProperties: { type: 'string' }
                                    },
                                    supported_channels: {
                                        type: 'array',
                                        items: { type: 'string' }
                                    },
                                    fees_info: {
                                        type: 'object',
                                        properties: {
                                            fees: { type: 'number' },
                                            net_amount: { type: 'number' },
                                            gross_amount: { type: 'number' },
                                        },
                                    },
                                    callback_url: { type: 'string' },
                                },
                            },
                        },
                    },
                },
            },
        },
        400: {
            description: 'Bad request - Invalid parameters',
            content: {
                'application/json': {
                    schema: {
                        type: 'object',
                        properties: {
                            error: { type: 'string' },
                            details: { type: 'object' },
                        },
                    },
                },
            },
        },
        401: {
            description: 'Unauthorized',
        },
        404: {
            description: 'Payment gateway not found',
        },
        500: {
            description: 'Internal server error',
        },
    },
};
exports.default = async (data) => {
    const { user, body } = data;
    const { amount, currency, paymentModes, metadata = {} } = body;
    if (!(user === null || user === void 0 ? void 0 : user.id)) {
        throw (0, error_1.createError)({
            statusCode: 401,
            message: 'User not authenticated',
        });
    }
    if (!amount || amount <= 0) {
        throw (0, error_1.createError)({
            statusCode: 400,
            message: 'Invalid amount provided',
        });
    }
    if (!currency) {
        throw (0, error_1.createError)({
            statusCode: 400,
            message: 'Currency is required',
        });
    }
    const currencyCode = currency.toUpperCase();
    try {
        (0, utils_1.validatePaytmConfig)();
        if (!(0, utils_1.isCurrencySupported)(currencyCode)) {
            throw (0, error_1.createError)({
                statusCode: 400,
                message: `Currency ${currencyCode} is not supported by Paytm. Supported currencies: INR, USD, EUR, GBP, AUD, CAD, SGD, AED, JPY, CNY, CHF, QAR`,
            });
        }
        const gateway = await db_1.models.depositGateway.findOne({
            where: { alias: 'paytm' },
        });
        if (!gateway || !gateway.status) {
            throw (0, error_1.createError)({
                statusCode: 400,
                message: 'Paytm payment gateway is not available',
            });
        }
        const rawCurrencies = gateway.currencies || '[]';
        const supportedCurrencies = Array.isArray(rawCurrencies) ? rawCurrencies : JSON.parse(rawCurrencies);
        if (!supportedCurrencies.includes(currencyCode)) {
            throw (0, error_1.createError)({
                statusCode: 400,
                message: `Currency ${currencyCode} is not supported by this gateway`,
            });
        }
        const rawMinAmounts = gateway.minAmount || '{}';
        const rawMaxAmounts = gateway.maxAmount || '{}';
        const minAmounts = typeof rawMinAmounts === 'string' ? JSON.parse(rawMinAmounts) : rawMinAmounts;
        const maxAmounts = typeof rawMaxAmounts === 'string' ? JSON.parse(rawMaxAmounts) : rawMaxAmounts;
        const minAmount = minAmounts[currencyCode] || 1.00;
        const maxAmount = maxAmounts[currencyCode] || 10000000.00;
        if (amount < minAmount) {
            throw (0, error_1.createError)({
                statusCode: 400,
                message: `Minimum amount is ${minAmount} ${currencyCode}`,
            });
        }
        if (amount > maxAmount) {
            throw (0, error_1.createError)({
                statusCode: 400,
                message: `Maximum amount is ${maxAmount} ${currencyCode}`,
            });
        }
        const orderId = (0, utils_1.generatePaytmOrderId)();
        const formattedAmount = (0, utils_1.formatPaytmAmount)(amount, currencyCode);
        const currencyInfo = (0, utils_1.getCurrencyInfo)(currencyCode);
        const availableMethods = (0, utils_1.getAvailablePaymentMethods)(currencyCode);
        const supportedChannels = (0, utils_1.getSupportedChannels)(currencyCode);
        const feesInfo = (0, utils_1.calculatePaytmFees)(amount, currencyCode);
        const { walletCreationService } = await Promise.resolve().then(() => __importStar(require('@b/services/wallet')));
        const walletResult = await walletCreationService.getOrCreateWallet(user.id, 'FIAT', currencyCode);
        const wallet = walletResult.wallet;
        const transaction = await db_1.models.transaction.create({
            userId: user.id,
            walletId: wallet.id,
            type: 'DEPOSIT',
            status: 'PENDING',
            amount: amount,
            fee: feesInfo.fees,
            description: `Paytm deposit of ${amount} ${currencyCode}`,
            metadata: JSON.stringify({
                gateway: 'paytm',
                currency: currencyCode,
                orderId: orderId,
                region: (currencyInfo === null || currencyInfo === void 0 ? void 0 : currencyInfo.region) || 'Unknown',
                availableMethods: availableMethods,
                ...metadata,
            }),
        });
        const paytmRequest = {
            body: {
                requestType: 'Payment',
                mid: utils_1.PAYTM_CONFIG.MID,
                websiteName: utils_1.PAYTM_CONFIG.WEBSITE,
                orderId: orderId,
                txnAmount: {
                    value: formattedAmount,
                    currency: currencyCode,
                },
                userInfo: {
                    custId: user.id.toString(),
                    email: user.email || '',
                    mobile: user.phone || '',
                },
                callbackUrl: (0, utils_1.buildCallbackUrl)(),
                enablePaymentMode: paymentModes && paymentModes.length > 0 ? paymentModes : availableMethods,
            }
        };
        const checksum = (0, utils_1.generateChecksumHash)(paytmRequest.body, utils_1.PAYTM_CONFIG.MERCHANT_KEY);
        paytmRequest.body['checksumHash'] = checksum;
        const paytmResponse = await (0, utils_1.makePaytmRequest)('/theia/api/v1/initiateTransaction', {
            method: 'POST',
            body: paytmRequest,
            headers: {
                'Content-Type': 'application/json',
            },
        });
        await transaction.update({
            referenceId: paytmResponse.body.txnToken,
            metadata: JSON.stringify({
                ...JSON.parse(transaction.metadata || '{}'),
                txnToken: paytmResponse.body.txnToken,
                paytmResponse: paytmResponse.body,
            }),
        });
        const availableMethodsDisplay = availableMethods.reduce((acc, method) => {
            acc[method] = (0, utils_1.getPaymentMethodDisplayName)(method);
            return acc;
        }, {});
        return {
            success: true,
            data: {
                transaction_id: transaction.id,
                order_id: orderId,
                txn_token: paytmResponse.body.txnToken,
                status: 'PENDING',
                gateway: 'paytm',
                amount: amount,
                currency: currencyCode,
                region: (currencyInfo === null || currencyInfo === void 0 ? void 0 : currencyInfo.region) || 'Unknown',
                available_methods: availableMethodsDisplay,
                supported_channels: supportedChannels,
                fees_info: feesInfo,
                callback_url: (0, utils_1.buildCallbackUrl)(),
                paytm_config: {
                    mid: utils_1.PAYTM_CONFIG.MID,
                    website: utils_1.PAYTM_CONFIG.WEBSITE,
                    industry_type: utils_1.PAYTM_CONFIG.INDUSTRY_TYPE,
                    is_sandbox: utils_1.PAYTM_CONFIG.SANDBOX,
                },
            },
        };
    }
    catch (error) {
        if (error instanceof utils_1.PaytmError) {
            throw (0, error_1.createError)({
                statusCode: error.status,
                message: error.message,
            });
        }
        throw (0, error_1.createError)({
            statusCode: 500,
            message: 'Failed to create Paytm payment session',
        });
    }
};
