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
    summary: 'Creates a PayU payment session',
    description: 'Initiates a PayU payment transaction with comprehensive payment method support',
    operationId: 'createPayUPayment',
    tags: ['Finance', 'Deposit', 'PayU'],
    requiresAuth: true,
    logModule: "PAYU_DEPOSIT",
    logTitle: "Create PayU payment session",
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
                            description: 'Payment currency (INR, USD, EUR, GBP, PLN, CZK, RON, HUF, UAH, TRY, BRL, COP, PEN, ARS, CLP, MXN, ZAR)',
                            enum: ['INR', 'USD', 'EUR', 'GBP', 'PLN', 'CZK', 'RON', 'HUF', 'UAH', 'TRY', 'BRL', 'COP', 'PEN', 'ARS', 'CLP', 'MXN', 'ZAR'],
                        },
                        paymentMethod: {
                            type: 'string',
                            description: 'Preferred payment method (card, upi, netbanking, wallet, emi, cash, bank_transfer, boleto, pix)',
                            enum: ['card', 'upi', 'netbanking', 'wallet', 'emi', 'cash', 'bank_transfer', 'boleto', 'pix'],
                        },
                        customerInfo: {
                            type: 'object',
                            properties: {
                                firstName: { type: 'string' },
                                lastName: { type: 'string' },
                                email: { type: 'string' },
                                phone: { type: 'string' },
                                address: {
                                    type: 'object',
                                    properties: {
                                        street: { type: 'string' },
                                        city: { type: 'string' },
                                        state: { type: 'string' },
                                        country: { type: 'string' },
                                        zipCode: { type: 'string' },
                                    },
                                },
                            },
                            required: ['firstName', 'email'],
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
                                    transaction_id: { type: 'string' },
                                    payment_url: { type: 'string' },
                                    payment_form_data: { type: 'object' },
                                    amount: { type: 'number' },
                                    fee: { type: 'number' },
                                    total_amount: { type: 'number' },
                                    currency: { type: 'string' },
                                    gateway: { type: 'string' },
                                    expires_at: { type: 'string' },
                                    supported_methods: { type: 'array', items: { type: 'string' } },
                                },
                            },
                        },
                    },
                },
            },
        },
        400: {
            description: 'Bad request - Invalid input data',
        },
        401: {
            description: 'Unauthorized - User not authenticated',
        },
        500: {
            description: 'Internal server error',
        },
    },
};
exports.default = async (data) => {
    var _a, _b, _c, _d, _e, _f;
    const { user, body } = data;
    const { amount, currency, paymentMethod, customerInfo } = body;
    if (!(user === null || user === void 0 ? void 0 : user.id)) {
        throw (0, error_1.createError)({
            statusCode: 401,
            message: 'User not authenticated',
        });
    }
    if (!amount || amount <= 0) {
        throw (0, error_1.createError)({
            statusCode: 400,
            message: 'Valid amount is required',
        });
    }
    if (!currency) {
        throw (0, error_1.createError)({
            statusCode: 400,
            message: 'Currency is required',
        });
    }
    try {
        const gateway = await db_1.models.depositGateway.findOne({
            where: { alias: 'payu', status: true },
        });
        if (!gateway) {
            throw (0, error_1.createError)({
                statusCode: 404,
                message: 'PayU gateway not found or disabled',
            });
        }
        (0, utils_1.validatePayUConfig)();
        if (!(0, utils_1.validatePayUCurrency)(currency)) {
            throw (0, error_1.createError)({
                statusCode: 400,
                message: `Unsupported currency: ${currency}`,
            });
        }
        if (!((_a = gateway.currencies) === null || _a === void 0 ? void 0 : _a.includes(currency))) {
            throw (0, error_1.createError)({
                statusCode: 400,
                message: `Currency ${currency} is not supported by PayU gateway`,
            });
        }
        const fixedFee = gateway.getFixedFee(currency);
        const percentageFee = gateway.getPercentageFee(currency);
        const minAmount = gateway.getMinAmount(currency);
        const maxAmount = gateway.getMaxAmount(currency);
        if (amount < minAmount) {
            throw (0, error_1.createError)({
                statusCode: 400,
                message: `Amount must be at least ${minAmount} ${currency}`,
            });
        }
        if (maxAmount && amount > maxAmount) {
            throw (0, error_1.createError)({
                statusCode: 400,
                message: `Amount cannot exceed ${maxAmount} ${currency}`,
            });
        }
        const feeAmount = (amount * percentageFee) / 100 + fixedFee;
        const totalAmount = amount + feeAmount;
        const availableMethods = (0, utils_1.getPayUPaymentMethods)(currency);
        if (paymentMethod && !(0, utils_1.validatePaymentMethod)(currency, paymentMethod)) {
            throw (0, error_1.createError)({
                statusCode: 400,
                message: `Payment method ${paymentMethod} not supported for ${currency}`,
            });
        }
        const transactionId = (0, utils_1.generatePayUTransactionId)();
        const formattedAmount = (0, utils_1.formatPayUAmount)(totalAmount);
        const customer = {
            firstName: (customerInfo === null || customerInfo === void 0 ? void 0 : customerInfo.firstName) || user.firstName || 'Customer',
            lastName: (customerInfo === null || customerInfo === void 0 ? void 0 : customerInfo.lastName) || user.lastName || '',
            email: (customerInfo === null || customerInfo === void 0 ? void 0 : customerInfo.email) || user.email,
            phone: (customerInfo === null || customerInfo === void 0 ? void 0 : customerInfo.phone) || user.phone || '',
            address: {
                street: ((_b = customerInfo === null || customerInfo === void 0 ? void 0 : customerInfo.address) === null || _b === void 0 ? void 0 : _b.street) || '',
                city: ((_c = customerInfo === null || customerInfo === void 0 ? void 0 : customerInfo.address) === null || _c === void 0 ? void 0 : _c.city) || '',
                state: ((_d = customerInfo === null || customerInfo === void 0 ? void 0 : customerInfo.address) === null || _d === void 0 ? void 0 : _d.state) || '',
                country: ((_e = customerInfo === null || customerInfo === void 0 ? void 0 : customerInfo.address) === null || _e === void 0 ? void 0 : _e.country) || '',
                zipCode: ((_f = customerInfo === null || customerInfo === void 0 ? void 0 : customerInfo.address) === null || _f === void 0 ? void 0 : _f.zipCode) || '',
            },
        };
        if (!customer.email) {
            throw (0, error_1.createError)({
                statusCode: 400,
                message: 'Customer email is required',
            });
        }
        const { walletCreationService } = await Promise.resolve().then(() => __importStar(require('@b/services/wallet')));
        const walletResult = await walletCreationService.getOrCreateWallet(user.id, 'FIAT', currency);
        const wallet = walletResult.wallet;
        const transaction = await db_1.models.transaction.create({
            userId: user.id,
            walletId: wallet.id,
            type: 'DEPOSIT',
            status: 'PENDING',
            amount: amount,
            fee: feeAmount,
            description: `PayU deposit of ${amount} ${currency} (Fee: ${feeAmount} ${currency})`,
            referenceId: transactionId,
            metadata: JSON.stringify({
                gateway: 'payu',
                currency: currency,
                paymentMethod: paymentMethod || 'card',
                customer: customer,
                fees: {
                    fixed: fixedFee,
                    percentage: percentageFee,
                    total: feeAmount,
                },
                amounts: {
                    base: amount,
                    fee: feeAmount,
                    total: totalAmount,
                },
                createdAt: new Date().toISOString(),
                expiresAt: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
            }),
        });
        const payuRequest = {
            key: utils_1.PAYU_CONFIG.MERCHANT_KEY,
            txnid: transactionId,
            amount: formattedAmount,
            productinfo: `Wallet deposit - ${currency}`,
            firstname: customer.firstName,
            email: customer.email,
            phone: customer.phone,
            surl: `${process.env.FRONTEND_URL}${utils_1.PAYU_CONFIG.SUCCESS_URL}`,
            furl: `${process.env.FRONTEND_URL}${utils_1.PAYU_CONFIG.FAILURE_URL}`,
            hash: '',
        };
        if (customer.lastName) {
            payuRequest.udf1 = customer.lastName;
        }
        if (customer.address.city) {
            payuRequest.udf2 = customer.address.city;
        }
        if (customer.address.state) {
            payuRequest.udf3 = customer.address.state;
        }
        if (customer.address.country) {
            payuRequest.udf4 = customer.address.country;
        }
        if (paymentMethod) {
            payuRequest.udf5 = paymentMethod;
        }
        if (paymentMethod) {
            switch (paymentMethod) {
                case 'upi':
                    payuRequest.pg = 'UPI';
                    break;
                case 'netbanking':
                    payuRequest.pg = 'NB';
                    break;
                case 'wallet':
                    payuRequest.pg = 'WALLET';
                    break;
                case 'emi':
                    payuRequest.pg = 'EMI';
                    break;
                case 'card':
                default:
                    payuRequest.pg = 'CC';
                    break;
            }
        }
        payuRequest.hash = (0, utils_1.generatePayUHash)(payuRequest, utils_1.PAYU_CONFIG.MERCHANT_SALT);
        await transaction.update({
            referenceId: transactionId,
            metadata: JSON.stringify({
                ...JSON.parse(transaction.metadata || '{}'),
                payuRequest: payuRequest,
                paymentUrl: `${utils_1.PAYU_CONFIG.API_BASE_URL}/_payment`,
                callbackUrl: `${process.env.FRONTEND_URL}${utils_1.PAYU_CONFIG.CALLBACK_URL}`,
                successUrl: payuRequest.surl,
                failureUrl: payuRequest.furl,
                cancelUrl: `${process.env.FRONTEND_URL}${utils_1.PAYU_CONFIG.CANCEL_URL}`,
            }),
        });
        return {
            success: true,
            data: {
                transaction_id: transactionId,
                payment_url: `${utils_1.PAYU_CONFIG.API_BASE_URL}/_payment`,
                payment_form_data: payuRequest,
                amount: amount,
                fee: feeAmount,
                total_amount: totalAmount,
                currency: currency,
                gateway: 'payu',
                expires_at: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
                supported_methods: availableMethods,
                customer_info: {
                    name: `${customer.firstName} ${customer.lastName}`.trim(),
                    email: customer.email,
                    phone: customer.phone,
                },
                callback_url: `${process.env.FRONTEND_URL}${utils_1.PAYU_CONFIG.CALLBACK_URL}`,
                success_url: payuRequest.surl,
                failure_url: payuRequest.furl,
                cancel_url: `${process.env.FRONTEND_URL}${utils_1.PAYU_CONFIG.CANCEL_URL}`,
                limits: {
                    min: minAmount,
                    max: maxAmount,
                },
                fees: {
                    fixed: fixedFee,
                    percentage: percentageFee,
                    total: feeAmount,
                },
            },
        };
    }
    catch (error) {
        throw (0, error_1.createError)({
            statusCode: 500,
            message: error instanceof Error ? error.message : 'Failed to create PayU payment',
        });
    }
};
