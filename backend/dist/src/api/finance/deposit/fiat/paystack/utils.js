"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PaystackError = exports.PAYSTACK_WEBHOOK_EVENTS = exports.PAYSTACK_STATUS_MAPPING = exports.PAYSTACK_CURRENCY_DECIMALS = exports.PAYSTACK_CURRENCY_REGIONS = exports.PAYSTACK_CONFIG = void 0;
exports.validatePaystackConfig = validatePaystackConfig;
exports.isCurrencySupported = isCurrencySupported;
exports.getCurrencyInfo = getCurrencyInfo;
exports.getAvailablePaymentMethods = getAvailablePaymentMethods;
exports.formatPaystackAmount = formatPaystackAmount;
exports.parsePaystackAmount = parsePaystackAmount;
exports.mapPaystackStatus = mapPaystackStatus;
exports.generatePaystackReference = generatePaystackReference;
exports.makePaystackRequest = makePaystackRequest;
exports.buildWebhookUrl = buildWebhookUrl;
exports.buildReturnUrl = buildReturnUrl;
exports.buildCancelUrl = buildCancelUrl;
exports.isTestMode = isTestMode;
exports.getPaymentMethodDisplayName = getPaymentMethodDisplayName;
exports.validateWebhookSignature = validateWebhookSignature;
exports.calculatePaystackFees = calculatePaystackFees;
exports.getRegionFromCurrency = getRegionFromCurrency;
exports.getCountryFromCurrency = getCountryFromCurrency;
exports.getSupportedChannels = getSupportedChannels;
const crypto_1 = __importDefault(require("crypto"));
exports.PAYSTACK_CONFIG = {
    API_BASE_URL: process.env.APP_PAYSTACK_SANDBOX === 'true'
        ? 'https://api.paystack.co'
        : 'https://api.paystack.co',
    SECRET_KEY: process.env.APP_PAYSTACK_SECRET_KEY || '',
    PUBLIC_KEY: process.env.APP_PAYSTACK_PUBLIC_KEY || '',
    SANDBOX: process.env.APP_PAYSTACK_SANDBOX === 'true',
    WEBHOOK_ENDPOINT: process.env.APP_PAYSTACK_WEBHOOK_ENDPOINT || '/api/finance/deposit/fiat/paystack/webhook',
    RETURN_URL: process.env.APP_PAYSTACK_RETURN_URL || '/user/wallet/deposit/paystack/verify',
    TIMEOUT: 30000,
    VERSION: 'v1',
};
exports.PAYSTACK_CURRENCY_REGIONS = {
    'NGN': {
        region: 'Nigeria',
        country: 'NG',
        methods: ['card', 'bank', 'ussd', 'qr', 'mobile_money', 'bank_transfer'],
        fees: {
            local: { percentage: 1.5, fixed: 100, cap: 2000 },
            international: { percentage: 3.9, fixed: 100 },
            usd: { percentage: 3.9, fixed: 0 },
        },
    },
    'GHS': {
        region: 'Ghana',
        country: 'GH',
        methods: ['card', 'mobile_money'],
        fees: {
            local: { percentage: 1.95, fixed: 0 },
            international: { percentage: 1.95, fixed: 0 },
        },
    },
    'ZAR': {
        region: 'South Africa',
        country: 'ZA',
        methods: ['card', 'eft'],
        fees: {
            local: { percentage: 2.9, fixed: 100 },
            international: { percentage: 3.1, fixed: 100 },
        },
    },
    'KES': {
        region: 'Kenya',
        country: 'KE',
        methods: ['card', 'mpesa'],
        fees: {
            local: { percentage: 2.9, fixed: 0 },
            international: { percentage: 3.8, fixed: 0 },
            usd: { percentage: 3.8, fixed: 0 },
        },
    },
    'XOF': {
        region: 'Côte d\'Ivoire',
        country: 'CI',
        methods: ['card', 'mobile_money'],
        fees: {
            local: { percentage: 3.2, fixed: 0 },
            international: { percentage: 3.8, fixed: 0 },
        },
    },
    'EGP': {
        region: 'Egypt',
        country: 'EG',
        methods: ['card'],
        fees: {
            local: { percentage: 2.7, fixed: 250 },
            international: { percentage: 3.5, fixed: 250 },
        },
    },
    'USD': {
        region: 'International',
        country: 'US',
        methods: ['card'],
        fees: {
            local: { percentage: 3.9, fixed: 0 },
            international: { percentage: 3.9, fixed: 0 },
        },
    },
};
exports.PAYSTACK_CURRENCY_DECIMALS = {
    'NGN': 2,
    'GHS': 2,
    'ZAR': 2,
    'KES': 2,
    'XOF': 0,
    'EGP': 2,
    'USD': 2,
};
exports.PAYSTACK_STATUS_MAPPING = {
    'success': 'COMPLETED',
    'failed': 'FAILED',
    'abandoned': 'CANCELLED',
    'pending': 'PENDING',
    'processing': 'PENDING',
    'reversed': 'REFUNDED',
    'ongoing': 'PENDING',
};
exports.PAYSTACK_WEBHOOK_EVENTS = {
    CHARGE_SUCCESS: 'charge.success',
    CHARGE_DISPUTE_CREATE: 'charge.dispute.create',
    CHARGE_DISPUTE_REMIND: 'charge.dispute.remind',
    CHARGE_DISPUTE_RESOLVE: 'charge.dispute.resolve',
    INVOICE_CREATE: 'invoice.create',
    INVOICE_PAYMENT_FAILED: 'invoice.payment_failed',
    INVOICE_UPDATE: 'invoice.update',
    SUBSCRIPTION_CREATE: 'subscription.create',
    SUBSCRIPTION_DISABLE: 'subscription.disable',
    SUBSCRIPTION_EXPIRING_CARDS: 'subscription.expiring_cards',
    SUBSCRIPTION_NOT_RENEW: 'subscription.not_renew',
    TRANSFER_SUCCESS: 'transfer.success',
    TRANSFER_FAILED: 'transfer.failed',
    TRANSFER_REVERSED: 'transfer.reversed',
};
class PaystackError extends Error {
    constructor(message, code = 'PAYSTACK_ERROR', status = 500, details) {
        super(message);
        this.name = 'PaystackError';
        this.code = code;
        this.status = status;
        this.details = details;
    }
}
exports.PaystackError = PaystackError;
function validatePaystackConfig() {
    if (!exports.PAYSTACK_CONFIG.SECRET_KEY) {
        throw new PaystackError('Paystack secret key is not configured', 'CONFIG_ERROR', 500);
    }
    if (!exports.PAYSTACK_CONFIG.PUBLIC_KEY) {
        throw new PaystackError('Paystack public key is not configured', 'CONFIG_ERROR', 500);
    }
}
function isCurrencySupported(currency) {
    return Object.keys(exports.PAYSTACK_CURRENCY_REGIONS).includes(currency.toUpperCase());
}
function getCurrencyInfo(currency) {
    const currencyCode = currency.toUpperCase();
    return exports.PAYSTACK_CURRENCY_REGIONS[currencyCode] || null;
}
function getAvailablePaymentMethods(currency) {
    const currencyInfo = getCurrencyInfo(currency);
    return (currencyInfo === null || currencyInfo === void 0 ? void 0 : currencyInfo.methods) || [];
}
function formatPaystackAmount(amount, currency) {
    const decimals = exports.PAYSTACK_CURRENCY_DECIMALS[currency.toUpperCase()] || 2;
    return Math.round(amount * Math.pow(10, decimals));
}
function parsePaystackAmount(amount, currency) {
    const decimals = exports.PAYSTACK_CURRENCY_DECIMALS[currency.toUpperCase()] || 2;
    return amount / Math.pow(10, decimals);
}
function mapPaystackStatus(paystackStatus) {
    return exports.PAYSTACK_STATUS_MAPPING[paystackStatus.toLowerCase()] || 'PENDING';
}
function generatePaystackReference() {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 8);
    return `PS_${timestamp}_${random}`.toUpperCase();
}
async function makePaystackRequest(endpoint, options = {}) {
    const { method = 'GET', body, headers = {} } = options;
    try {
        validatePaystackConfig();
        const url = `${exports.PAYSTACK_CONFIG.API_BASE_URL}${endpoint}`;
        const requestHeaders = {
            'Authorization': `Bearer ${exports.PAYSTACK_CONFIG.SECRET_KEY}`,
            'Content-Type': 'application/json',
            'User-Agent': 'Paystack-Integration/1.0',
            ...headers,
        };
        const requestOptions = {
            method,
            headers: requestHeaders,
            signal: AbortSignal.timeout(exports.PAYSTACK_CONFIG.TIMEOUT),
        };
        if (body && (method === 'POST' || method === 'PUT' || method === 'PATCH')) {
            requestOptions.body = JSON.stringify(body);
        }
        const response = await fetch(url, requestOptions);
        const responseData = await response.json();
        if (!response.ok) {
            const errorMessage = responseData.message || `HTTP ${response.status}: ${response.statusText}`;
            throw new PaystackError(errorMessage, 'API_ERROR', response.status, responseData);
        }
        return responseData;
    }
    catch (error) {
        if (error instanceof PaystackError) {
            throw error;
        }
        if (error instanceof Error) {
            if (error.name === 'AbortError') {
                throw new PaystackError('Request timeout', 'TIMEOUT_ERROR', 408);
            }
            throw new PaystackError(error.message, 'NETWORK_ERROR', 500);
        }
        throw new PaystackError('Unknown error occurred', 'UNKNOWN_ERROR', 500);
    }
}
function buildWebhookUrl() {
    const baseUrl = process.env.APP_PUBLIC_URL || 'http://localhost:3000';
    return `${baseUrl}${exports.PAYSTACK_CONFIG.WEBHOOK_ENDPOINT}`;
}
function buildReturnUrl() {
    const baseUrl = process.env.APP_PUBLIC_URL || 'http://localhost:3000';
    return `${baseUrl}${exports.PAYSTACK_CONFIG.RETURN_URL}`;
}
function buildCancelUrl() {
    const baseUrl = process.env.APP_PUBLIC_URL || 'http://localhost:3000';
    return `${baseUrl}/user/wallet/deposit/paystack/cancel`;
}
function isTestMode() {
    return exports.PAYSTACK_CONFIG.SANDBOX;
}
function getPaymentMethodDisplayName(method) {
    const methodNames = {
        'card': 'Credit/Debit Card',
        'bank': 'Bank Transfer',
        'ussd': 'USSD',
        'qr': 'QR Code',
        'mobile_money': 'Mobile Money',
        'bank_transfer': 'Direct Bank Transfer',
        'mpesa': 'M-PESA',
        'eft': 'Electronic Funds Transfer',
    };
    return methodNames[method] || method.toUpperCase();
}
function validateWebhookSignature(body, signature) {
    try {
        const hash = crypto_1.default
            .createHmac('sha512', exports.PAYSTACK_CONFIG.SECRET_KEY)
            .update(body)
            .digest('hex');
        return hash === signature;
    }
    catch (error) {
        return false;
    }
}
function calculatePaystackFees(amount, currency) {
    const currencyInfo = getCurrencyInfo(currency);
    if (!currencyInfo) {
        return { fees: 0, netAmount: amount, grossAmount: amount };
    }
    const { percentage, fixed, cap } = currencyInfo.fees.local;
    let fees = (amount * percentage / 100) + fixed;
    if (cap && fees > cap) {
        fees = cap;
    }
    if (currency === 'NGN' && amount < 2500) {
        fees = amount * percentage / 100;
    }
    return {
        fees: Math.round(fees * 100) / 100,
        netAmount: Math.round((amount - fees) * 100) / 100,
        grossAmount: amount,
    };
}
function getRegionFromCurrency(currency) {
    const currencyInfo = getCurrencyInfo(currency);
    return (currencyInfo === null || currencyInfo === void 0 ? void 0 : currencyInfo.region) || 'Unknown';
}
function getCountryFromCurrency(currency) {
    const currencyInfo = getCurrencyInfo(currency);
    return (currencyInfo === null || currencyInfo === void 0 ? void 0 : currencyInfo.country) || 'XX';
}
function getSupportedChannels(currency) {
    const methods = getAvailablePaymentMethods(currency);
    const channelMapping = {
        'card': 'card',
        'bank': 'bank',
        'ussd': 'ussd',
        'qr': 'qr',
        'mobile_money': 'mobile_money',
        'bank_transfer': 'bank_transfer',
        'mpesa': 'mobile_money',
        'eft': 'bank',
    };
    return methods.map(method => channelMapping[method] || method).filter(Boolean);
}
