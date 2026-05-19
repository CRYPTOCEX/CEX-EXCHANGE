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
exports.PAYU_WEBHOOK_EVENTS = exports.PAYU_STATUS_MAPPING = exports.PAYU_SUPPORTED_CURRENCIES = exports.PAYU_CONFIG = void 0;
exports.validatePayUConfig = validatePayUConfig;
exports.validatePayUCurrency = validatePayUCurrency;
exports.getPayUCurrencyInfo = getPayUCurrencyInfo;
exports.generatePayUHash = generatePayUHash;
exports.verifyPayUHash = verifyPayUHash;
exports.makePayURequest = makePayURequest;
exports.mapPayUStatus = mapPayUStatus;
exports.parsePayUAmount = parsePayUAmount;
exports.getPayUPaymentMethods = getPayUPaymentMethods;
exports.generatePayUTransactionId = generatePayUTransactionId;
exports.formatPayUAmount = formatPayUAmount;
exports.validatePaymentMethod = validatePaymentMethod;
exports.getPaymentMethodFees = getPaymentMethodFees;
exports.calculatePayUFees = calculatePayUFees;
const error_1 = require("@b/utils/error");
const crypto = __importStar(require("crypto"));
exports.PAYU_CONFIG = {
    API_BASE_URL: process.env.APP_PAYU_SANDBOX === 'true'
        ? 'https://test.payu.in'
        : 'https://secure.payu.in',
    MERCHANT_KEY: process.env.APP_PAYU_MERCHANT_KEY || '',
    MERCHANT_SALT: process.env.APP_PAYU_MERCHANT_SALT || '',
    MERCHANT_ID: process.env.APP_PAYU_MERCHANT_ID || '',
    SANDBOX: process.env.APP_PAYU_SANDBOX === 'true',
    CALLBACK_URL: process.env.APP_PAYU_CALLBACK_URL || '/user/wallet/deposit/payu/verify',
    WEBHOOK_ENDPOINT: process.env.APP_PAYU_WEBHOOK_ENDPOINT || '/api/finance/deposit/fiat/payu/webhook',
    SUCCESS_URL: process.env.APP_PAYU_SUCCESS_URL || '/user/wallet/deposit/payu/success',
    FAILURE_URL: process.env.APP_PAYU_FAILURE_URL || '/user/wallet/deposit/payu/failure',
    CANCEL_URL: process.env.APP_PAYU_CANCEL_URL || '/user/wallet/deposit/payu/cancel',
    VERSION: '1.0',
};
exports.PAYU_SUPPORTED_CURRENCIES = {
    'INR': {
        region: 'India',
        country: 'IN',
        methods: ['card', 'upi', 'netbanking', 'wallet', 'emi', 'cash'],
        fees: {
            upi: { percentage: 0, fixed: 0 },
            debit_cards: { percentage: 0.9, fixed: 0 },
            credit_cards: { percentage: 1.9, fixed: 0 },
            net_banking: { percentage: 1.2, fixed: 0 },
            wallet: { percentage: 1.5, fixed: 0 },
            emi: { percentage: 2.5, fixed: 0 },
            international: { percentage: 3.5, fixed: 0 },
        },
    },
    'USD': {
        region: 'United States',
        country: 'US',
        methods: ['card'],
        fees: {
            upi: { percentage: 0, fixed: 0 },
            debit_cards: { percentage: 3.5, fixed: 0 },
            credit_cards: { percentage: 3.5, fixed: 0 },
            net_banking: { percentage: 0, fixed: 0 },
            wallet: { percentage: 0, fixed: 0 },
            emi: { percentage: 0, fixed: 0 },
            international: { percentage: 3.5, fixed: 0 },
        },
    },
    'EUR': {
        region: 'Europe',
        country: 'EU',
        methods: ['card'],
        fees: {
            upi: { percentage: 0, fixed: 0 },
            debit_cards: { percentage: 2.8, fixed: 0 },
            credit_cards: { percentage: 2.8, fixed: 0 },
            net_banking: { percentage: 0, fixed: 0 },
            wallet: { percentage: 0, fixed: 0 },
            emi: { percentage: 0, fixed: 0 },
            international: { percentage: 2.8, fixed: 0 },
        },
    },
    'GBP': {
        region: 'United Kingdom',
        country: 'GB',
        methods: ['card'],
        fees: {
            upi: { percentage: 0, fixed: 0 },
            debit_cards: { percentage: 2.9, fixed: 0 },
            credit_cards: { percentage: 2.9, fixed: 0 },
            net_banking: { percentage: 0, fixed: 0 },
            wallet: { percentage: 0, fixed: 0 },
            emi: { percentage: 0, fixed: 0 },
            international: { percentage: 2.9, fixed: 0 },
        },
    },
    'PLN': {
        region: 'Poland',
        country: 'PL',
        methods: ['card', 'bank_transfer'],
        fees: {
            upi: { percentage: 0, fixed: 0 },
            debit_cards: { percentage: 2.5, fixed: 0 },
            credit_cards: { percentage: 2.5, fixed: 0 },
            net_banking: { percentage: 2.0, fixed: 0 },
            wallet: { percentage: 0, fixed: 0 },
            emi: { percentage: 0, fixed: 0 },
            international: { percentage: 2.5, fixed: 0 },
        },
    },
    'CZK': {
        region: 'Czech Republic',
        country: 'CZ',
        methods: ['card', 'bank_transfer'],
        fees: {
            upi: { percentage: 0, fixed: 0 },
            debit_cards: { percentage: 2.7, fixed: 0 },
            credit_cards: { percentage: 2.7, fixed: 0 },
            net_banking: { percentage: 2.2, fixed: 0 },
            wallet: { percentage: 0, fixed: 0 },
            emi: { percentage: 0, fixed: 0 },
            international: { percentage: 2.7, fixed: 0 },
        },
    },
    'RON': {
        region: 'Romania',
        country: 'RO',
        methods: ['card', 'bank_transfer'],
        fees: {
            upi: { percentage: 0, fixed: 0 },
            debit_cards: { percentage: 2.6, fixed: 0 },
            credit_cards: { percentage: 2.6, fixed: 0 },
            net_banking: { percentage: 2.1, fixed: 0 },
            wallet: { percentage: 0, fixed: 0 },
            emi: { percentage: 0, fixed: 0 },
            international: { percentage: 2.6, fixed: 0 },
        },
    },
    'HUF': {
        region: 'Hungary',
        country: 'HU',
        methods: ['card', 'bank_transfer'],
        fees: {
            upi: { percentage: 0, fixed: 0 },
            debit_cards: { percentage: 2.8, fixed: 0 },
            credit_cards: { percentage: 2.8, fixed: 0 },
            net_banking: { percentage: 2.3, fixed: 0 },
            wallet: { percentage: 0, fixed: 0 },
            emi: { percentage: 0, fixed: 0 },
            international: { percentage: 2.8, fixed: 0 },
        },
    },
    'UAH': {
        region: 'Ukraine',
        country: 'UA',
        methods: ['card', 'bank_transfer'],
        fees: {
            upi: { percentage: 0, fixed: 0 },
            debit_cards: { percentage: 3.2, fixed: 0 },
            credit_cards: { percentage: 3.2, fixed: 0 },
            net_banking: { percentage: 2.7, fixed: 0 },
            wallet: { percentage: 0, fixed: 0 },
            emi: { percentage: 0, fixed: 0 },
            international: { percentage: 3.2, fixed: 0 },
        },
    },
    'TRY': {
        region: 'Turkey',
        country: 'TR',
        methods: ['card', 'bank_transfer'],
        fees: {
            upi: { percentage: 0, fixed: 0 },
            debit_cards: { percentage: 3.0, fixed: 0 },
            credit_cards: { percentage: 3.0, fixed: 0 },
            net_banking: { percentage: 2.5, fixed: 0 },
            wallet: { percentage: 0, fixed: 0 },
            emi: { percentage: 0, fixed: 0 },
            international: { percentage: 3.0, fixed: 0 },
        },
    },
    'BRL': {
        region: 'Brazil',
        country: 'BR',
        methods: ['card', 'boleto', 'pix'],
        fees: {
            upi: { percentage: 0, fixed: 0 },
            debit_cards: { percentage: 3.8, fixed: 0 },
            credit_cards: { percentage: 3.8, fixed: 0 },
            net_banking: { percentage: 3.3, fixed: 0 },
            wallet: { percentage: 0, fixed: 0 },
            emi: { percentage: 0, fixed: 0 },
            international: { percentage: 3.8, fixed: 0 },
        },
    },
    'COP': {
        region: 'Colombia',
        country: 'CO',
        methods: ['card', 'bank_transfer', 'cash'],
        fees: {
            upi: { percentage: 0, fixed: 0 },
            debit_cards: { percentage: 3.5, fixed: 0 },
            credit_cards: { percentage: 3.5, fixed: 0 },
            net_banking: { percentage: 3.0, fixed: 0 },
            wallet: { percentage: 0, fixed: 0 },
            emi: { percentage: 0, fixed: 0 },
            international: { percentage: 3.5, fixed: 0 },
        },
    },
    'PEN': {
        region: 'Peru',
        country: 'PE',
        methods: ['card', 'bank_transfer', 'cash'],
        fees: {
            upi: { percentage: 0, fixed: 0 },
            debit_cards: { percentage: 3.3, fixed: 0 },
            credit_cards: { percentage: 3.3, fixed: 0 },
            net_banking: { percentage: 2.8, fixed: 0 },
            wallet: { percentage: 0, fixed: 0 },
            emi: { percentage: 0, fixed: 0 },
            international: { percentage: 3.3, fixed: 0 },
        },
    },
    'ARS': {
        region: 'Argentina',
        country: 'AR',
        methods: ['card', 'bank_transfer', 'cash'],
        fees: {
            upi: { percentage: 0, fixed: 0 },
            debit_cards: { percentage: 4.2, fixed: 0 },
            credit_cards: { percentage: 4.2, fixed: 0 },
            net_banking: { percentage: 3.7, fixed: 0 },
            wallet: { percentage: 0, fixed: 0 },
            emi: { percentage: 0, fixed: 0 },
            international: { percentage: 4.2, fixed: 0 },
        },
    },
    'CLP': {
        region: 'Chile',
        country: 'CL',
        methods: ['card', 'bank_transfer'],
        fees: {
            upi: { percentage: 0, fixed: 0 },
            debit_cards: { percentage: 3.7, fixed: 0 },
            credit_cards: { percentage: 3.7, fixed: 0 },
            net_banking: { percentage: 3.2, fixed: 0 },
            wallet: { percentage: 0, fixed: 0 },
            emi: { percentage: 0, fixed: 0 },
            international: { percentage: 3.7, fixed: 0 },
        },
    },
    'MXN': {
        region: 'Mexico',
        country: 'MX',
        methods: ['card', 'bank_transfer', 'cash'],
        fees: {
            upi: { percentage: 0, fixed: 0 },
            debit_cards: { percentage: 3.4, fixed: 0 },
            credit_cards: { percentage: 3.4, fixed: 0 },
            net_banking: { percentage: 2.9, fixed: 0 },
            wallet: { percentage: 0, fixed: 0 },
            emi: { percentage: 0, fixed: 0 },
            international: { percentage: 3.4, fixed: 0 },
        },
    },
    'ZAR': {
        region: 'South Africa',
        country: 'ZA',
        methods: ['card', 'bank_transfer'],
        fees: {
            upi: { percentage: 0, fixed: 0 },
            debit_cards: { percentage: 2.9, fixed: 0 },
            credit_cards: { percentage: 2.9, fixed: 0 },
            net_banking: { percentage: 2.4, fixed: 0 },
            wallet: { percentage: 0, fixed: 0 },
            emi: { percentage: 0, fixed: 0 },
            international: { percentage: 2.9, fixed: 0 },
        },
    },
};
exports.PAYU_STATUS_MAPPING = {
    'success': 'COMPLETED',
    'failure': 'FAILED',
    'pending': 'PENDING',
    'cancel': 'CANCELLED',
    'in_progress': 'PENDING',
    'dropped': 'FAILED',
    'bounced': 'FAILED',
    'timeout': 'FAILED',
    'initiated': 'PENDING',
    'awaited': 'PENDING',
    'auth': 'PENDING',
    'captured': 'COMPLETED',
    'void': 'CANCELLED',
    'refunded': 'REFUNDED',
};
exports.PAYU_WEBHOOK_EVENTS = {
    PAYMENT_SUCCESS: 'payment_success',
    PAYMENT_FAILED: 'payment_failed',
    PAYMENT_PENDING: 'payment_pending',
    REFUND_SUCCESS: 'refund_success',
    REFUND_FAILED: 'refund_failed',
};
function validatePayUConfig() {
    if (!exports.PAYU_CONFIG.MERCHANT_KEY) {
        throw (0, error_1.createError)({
            statusCode: 500,
            message: 'PayU merchant key not configured',
        });
    }
    if (!exports.PAYU_CONFIG.MERCHANT_SALT) {
        throw (0, error_1.createError)({
            statusCode: 500,
            message: 'PayU merchant salt not configured',
        });
    }
    if (!exports.PAYU_CONFIG.MERCHANT_ID) {
        throw (0, error_1.createError)({
            statusCode: 500,
            message: 'PayU merchant ID not configured',
        });
    }
}
function validatePayUCurrency(currency) {
    return currency in exports.PAYU_SUPPORTED_CURRENCIES;
}
function getPayUCurrencyInfo(currency) {
    const currencyInfo = exports.PAYU_SUPPORTED_CURRENCIES[currency];
    if (!currencyInfo) {
        throw (0, error_1.createError)({
            statusCode: 400,
            message: `Unsupported currency: ${currency}`,
        });
    }
    return currencyInfo;
}
function generatePayUHash(params, salt) {
    const hashString = `${params.key}|${params.txnid}|${params.amount}|${params.productinfo}|${params.firstname}|${params.email}|${params.udf1 || ''}|${params.udf2 || ''}|${params.udf3 || ''}|${params.udf4 || ''}|${params.udf5 || ''}||||||${salt}`;
    return crypto.createHash('sha512').update(hashString).digest('hex');
}
function verifyPayUHash(params, hash, salt) {
    const hashString = `${salt}|${params.status}||||||${params.udf5 || ''}|${params.udf4 || ''}|${params.udf3 || ''}|${params.udf2 || ''}|${params.udf1 || ''}|${params.email}|${params.firstname}|${params.productinfo}|${params.amount}|${params.txnid}|${params.key}`;
    const expectedHash = crypto.createHash('sha512').update(hashString).digest('hex');
    return expectedHash === hash;
}
async function makePayURequest(endpoint, options) {
    const url = `${exports.PAYU_CONFIG.API_BASE_URL}${endpoint}`;
    try {
        const response = await fetch(url, {
            method: options.method,
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                'User-Agent': 'PayU-NodeJS-SDK/1.0.0',
                ...options.headers,
            },
            body: options.body ? new URLSearchParams(options.body).toString() : undefined,
        });
        if (!response.ok) {
            throw (0, error_1.createError)({
                statusCode: response.status,
                message: `PayU API error: ${response.statusText}`,
            });
        }
        const data = await response.json();
        return data;
    }
    catch (error) {
        if (error instanceof Error) {
            throw (0, error_1.createError)({
                statusCode: 500,
                message: `PayU API request failed: ${error.message}`,
            });
        }
        throw error;
    }
}
function mapPayUStatus(payuStatus) {
    const status = payuStatus.toLowerCase();
    return exports.PAYU_STATUS_MAPPING[status] || 'PENDING';
}
function parsePayUAmount(amount, currency) {
    const numAmount = parseFloat(amount);
    if (isNaN(numAmount)) {
        throw (0, error_1.createError)({
            statusCode: 400,
            message: 'Invalid amount format',
        });
    }
    return numAmount;
}
function getPayUPaymentMethods(currency) {
    const currencyInfo = getPayUCurrencyInfo(currency);
    return currencyInfo.methods;
}
function generatePayUTransactionId() {
    return `payu_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}
function formatPayUAmount(amount) {
    return amount.toFixed(2);
}
function validatePaymentMethod(currency, paymentMethod) {
    const availableMethods = getPayUPaymentMethods(currency);
    return availableMethods.includes(paymentMethod);
}
function getPaymentMethodFees(currency, paymentMethod) {
    const currencyInfo = getPayUCurrencyInfo(currency);
    const methodKey = paymentMethod.toLowerCase().replace(/[-\s]/g, '_');
    return currencyInfo.fees[methodKey] || currencyInfo.fees.international;
}
function calculatePayUFees(amount, currency, paymentMethod) {
    const fees = getPaymentMethodFees(currency, paymentMethod);
    const percentageFee = (amount * fees.percentage) / 100;
    const totalFee = percentageFee + fees.fixed;
    return {
        amount: amount,
        percentageFee: percentageFee,
        fixedFee: fees.fixed,
        totalFee: totalFee,
        netAmount: amount - totalFee,
    };
}
