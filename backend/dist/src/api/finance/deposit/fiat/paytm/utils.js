"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PaytmError = exports.PAYTM_WEBHOOK_EVENTS = exports.PAYTM_STATUS_MAPPING = exports.PAYTM_CURRENCY_DECIMALS = exports.PAYTM_CURRENCY_REGIONS = exports.PAYTM_CONFIG = void 0;
exports.validatePaytmConfig = validatePaytmConfig;
exports.isCurrencySupported = isCurrencySupported;
exports.getCurrencyInfo = getCurrencyInfo;
exports.getAvailablePaymentMethods = getAvailablePaymentMethods;
exports.formatPaytmAmount = formatPaytmAmount;
exports.parsePaytmAmount = parsePaytmAmount;
exports.mapPaytmStatus = mapPaytmStatus;
exports.generatePaytmOrderId = generatePaytmOrderId;
exports.generateChecksumHash = generateChecksumHash;
exports.verifyChecksumHash = verifyChecksumHash;
exports.makePaytmRequest = makePaytmRequest;
exports.buildCallbackUrl = buildCallbackUrl;
exports.buildWebhookUrl = buildWebhookUrl;
exports.isTestMode = isTestMode;
exports.getPaymentMethodDisplayName = getPaymentMethodDisplayName;
exports.calculatePaytmFees = calculatePaytmFees;
exports.getRegionFromCurrency = getRegionFromCurrency;
exports.getCountryFromCurrency = getCountryFromCurrency;
exports.getSupportedChannels = getSupportedChannels;
const crypto_1 = __importDefault(require("crypto"));
exports.PAYTM_CONFIG = {
    API_BASE_URL: process.env.APP_PAYTM_SANDBOX === 'true'
        ? 'https://securegw-stage.paytm.in'
        : 'https://securegw.paytm.in',
    MID: process.env.APP_PAYTM_MID || '',
    MERCHANT_KEY: process.env.APP_PAYTM_MERCHANT_KEY || '',
    WEBSITE: process.env.APP_PAYTM_WEBSITE || 'WEBSTAGING',
    INDUSTRY_TYPE: process.env.APP_PAYTM_INDUSTRY_TYPE || 'Retail',
    SANDBOX: process.env.APP_PAYTM_SANDBOX === 'true',
    CALLBACK_URL: process.env.APP_PAYTM_CALLBACK_URL || '/user/wallet/deposit/paytm/verify',
    WEBHOOK_ENDPOINT: process.env.APP_PAYTM_WEBHOOK_ENDPOINT || '/api/finance/deposit/fiat/paytm/webhook',
    TIMEOUT: 30000,
    VERSION: 'v1',
};
exports.PAYTM_CURRENCY_REGIONS = {
    'INR': {
        region: 'India',
        country: 'IN',
        methods: ['upi', 'card', 'netbanking', 'wallet', 'emi', 'bank_transfer'],
        fees: {
            upi: { percentage: 0.0, fixed: 0 },
            rupay_debit: { percentage: 0.0, fixed: 0 },
            debit_cards: { percentage: 0.40, fixed: 0 },
            credit_cards: { percentage: 1.40, fixed: 0 },
            net_banking: { percentage: 1.20, fixed: 0 },
            wallet: { percentage: 0.0, fixed: 0 },
            international: { percentage: 3.50, fixed: 0 },
        },
    },
    'USD': {
        region: 'International',
        country: 'US',
        methods: ['card'],
        fees: {
            upi: { percentage: 0, fixed: 0 },
            rupay_debit: { percentage: 0, fixed: 0 },
            debit_cards: { percentage: 3.5, fixed: 0 },
            credit_cards: { percentage: 3.5, fixed: 0 },
            net_banking: { percentage: 0, fixed: 0 },
            wallet: { percentage: 0, fixed: 0 },
            international: { percentage: 3.5, fixed: 0 },
        },
    },
    'EUR': {
        region: 'Europe',
        country: 'EU',
        methods: ['card'],
        fees: {
            upi: { percentage: 0, fixed: 0 },
            rupay_debit: { percentage: 0, fixed: 0 },
            debit_cards: { percentage: 3.5, fixed: 0 },
            credit_cards: { percentage: 3.5, fixed: 0 },
            net_banking: { percentage: 0, fixed: 0 },
            wallet: { percentage: 0, fixed: 0 },
            international: { percentage: 3.5, fixed: 0 },
        },
    },
    'GBP': {
        region: 'United Kingdom',
        country: 'GB',
        methods: ['card'],
        fees: {
            upi: { percentage: 0, fixed: 0 },
            rupay_debit: { percentage: 0, fixed: 0 },
            debit_cards: { percentage: 3.5, fixed: 0 },
            credit_cards: { percentage: 3.5, fixed: 0 },
            net_banking: { percentage: 0, fixed: 0 },
            wallet: { percentage: 0, fixed: 0 },
            international: { percentage: 3.5, fixed: 0 },
        },
    },
    'AUD': {
        region: 'Australia',
        country: 'AU',
        methods: ['card'],
        fees: {
            upi: { percentage: 0, fixed: 0 },
            rupay_debit: { percentage: 0, fixed: 0 },
            debit_cards: { percentage: 3.5, fixed: 0 },
            credit_cards: { percentage: 3.5, fixed: 0 },
            net_banking: { percentage: 0, fixed: 0 },
            wallet: { percentage: 0, fixed: 0 },
            international: { percentage: 3.5, fixed: 0 },
        },
    },
    'CAD': {
        region: 'Canada',
        country: 'CA',
        methods: ['card'],
        fees: {
            upi: { percentage: 0, fixed: 0 },
            rupay_debit: { percentage: 0, fixed: 0 },
            debit_cards: { percentage: 3.5, fixed: 0 },
            credit_cards: { percentage: 3.5, fixed: 0 },
            net_banking: { percentage: 0, fixed: 0 },
            wallet: { percentage: 0, fixed: 0 },
            international: { percentage: 3.5, fixed: 0 },
        },
    },
    'SGD': {
        region: 'Singapore',
        country: 'SG',
        methods: ['card'],
        fees: {
            upi: { percentage: 0, fixed: 0 },
            rupay_debit: { percentage: 0, fixed: 0 },
            debit_cards: { percentage: 3.5, fixed: 0 },
            credit_cards: { percentage: 3.5, fixed: 0 },
            net_banking: { percentage: 0, fixed: 0 },
            wallet: { percentage: 0, fixed: 0 },
            international: { percentage: 3.5, fixed: 0 },
        },
    },
    'AED': {
        region: 'United Arab Emirates',
        country: 'AE',
        methods: ['card'],
        fees: {
            upi: { percentage: 0, fixed: 0 },
            rupay_debit: { percentage: 0, fixed: 0 },
            debit_cards: { percentage: 3.5, fixed: 0 },
            credit_cards: { percentage: 3.5, fixed: 0 },
            net_banking: { percentage: 0, fixed: 0 },
            wallet: { percentage: 0, fixed: 0 },
            international: { percentage: 3.5, fixed: 0 },
        },
    },
    'JPY': {
        region: 'Japan',
        country: 'JP',
        methods: ['card'],
        fees: {
            upi: { percentage: 0, fixed: 0 },
            rupay_debit: { percentage: 0, fixed: 0 },
            debit_cards: { percentage: 3.5, fixed: 0 },
            credit_cards: { percentage: 3.5, fixed: 0 },
            net_banking: { percentage: 0, fixed: 0 },
            wallet: { percentage: 0, fixed: 0 },
            international: { percentage: 3.5, fixed: 0 },
        },
    },
    'CNY': {
        region: 'China',
        country: 'CN',
        methods: ['card'],
        fees: {
            upi: { percentage: 0, fixed: 0 },
            rupay_debit: { percentage: 0, fixed: 0 },
            debit_cards: { percentage: 3.5, fixed: 0 },
            credit_cards: { percentage: 3.5, fixed: 0 },
            net_banking: { percentage: 0, fixed: 0 },
            wallet: { percentage: 0, fixed: 0 },
            international: { percentage: 3.5, fixed: 0 },
        },
    },
    'CHF': {
        region: 'Switzerland',
        country: 'CH',
        methods: ['card'],
        fees: {
            upi: { percentage: 0, fixed: 0 },
            rupay_debit: { percentage: 0, fixed: 0 },
            debit_cards: { percentage: 3.5, fixed: 0 },
            credit_cards: { percentage: 3.5, fixed: 0 },
            net_banking: { percentage: 0, fixed: 0 },
            wallet: { percentage: 0, fixed: 0 },
            international: { percentage: 3.5, fixed: 0 },
        },
    },
    'QAR': {
        region: 'Qatar',
        country: 'QA',
        methods: ['card'],
        fees: {
            upi: { percentage: 0, fixed: 0 },
            rupay_debit: { percentage: 0, fixed: 0 },
            debit_cards: { percentage: 3.5, fixed: 0 },
            credit_cards: { percentage: 3.5, fixed: 0 },
            net_banking: { percentage: 0, fixed: 0 },
            wallet: { percentage: 0, fixed: 0 },
            international: { percentage: 3.5, fixed: 0 },
        },
    },
};
exports.PAYTM_CURRENCY_DECIMALS = {
    'INR': 2,
    'USD': 2,
    'EUR': 2,
    'GBP': 2,
    'AUD': 2,
    'CAD': 2,
    'SGD': 2,
    'AED': 2,
    'JPY': 0,
    'CNY': 2,
    'CHF': 2,
    'QAR': 2,
};
exports.PAYTM_STATUS_MAPPING = {
    'TXN_SUCCESS': 'COMPLETED',
    'TXN_FAILURE': 'FAILED',
    'PENDING': 'PENDING',
    'OPEN': 'PENDING',
    'REFUND': 'REFUNDED',
    'CANCELLED': 'CANCELLED',
};
exports.PAYTM_WEBHOOK_EVENTS = {
    PAYMENT_SUCCESS: 'payment.success',
    PAYMENT_FAILED: 'payment.failed',
    PAYMENT_PENDING: 'payment.pending',
    REFUND_SUCCESS: 'refund.success',
    REFUND_FAILED: 'refund.failed',
};
class PaytmError extends Error {
    constructor(message, code = 'PAYTM_ERROR', status = 500, details) {
        super(message);
        this.name = 'PaytmError';
        this.code = code;
        this.status = status;
        this.details = details;
    }
}
exports.PaytmError = PaytmError;
function validatePaytmConfig() {
    if (!exports.PAYTM_CONFIG.MID) {
        throw new PaytmError('Paytm MID is not configured', 'CONFIG_ERROR', 500);
    }
    if (!exports.PAYTM_CONFIG.MERCHANT_KEY) {
        throw new PaytmError('Paytm Merchant Key is not configured', 'CONFIG_ERROR', 500);
    }
}
function isCurrencySupported(currency) {
    return Object.keys(exports.PAYTM_CURRENCY_REGIONS).includes(currency.toUpperCase());
}
function getCurrencyInfo(currency) {
    const currencyCode = currency.toUpperCase();
    return exports.PAYTM_CURRENCY_REGIONS[currencyCode] || null;
}
function getAvailablePaymentMethods(currency) {
    const info = getCurrencyInfo(currency);
    return info ? info.methods : [];
}
function formatPaytmAmount(amount, currency) {
    const decimals = exports.PAYTM_CURRENCY_DECIMALS[currency.toUpperCase()] || 2;
    return amount.toFixed(decimals);
}
function parsePaytmAmount(amount, currency) {
    return parseFloat(amount);
}
function mapPaytmStatus(paytmStatus) {
    return exports.PAYTM_STATUS_MAPPING[paytmStatus] || 'PENDING';
}
function generatePaytmOrderId() {
    const timestamp = Date.now().toString();
    const random = Math.random().toString(36).substring(2, 8).toUpperCase();
    return `PAYTM_${timestamp}_${random}`;
}
function generateChecksumHash(params, merchantKey) {
    const sortedParams = Object.keys(params).sort().reduce((result, key) => {
        if (params[key] !== null && params[key] !== undefined && params[key] !== '') {
            result[key] = params[key];
        }
        return result;
    }, {});
    const paramStr = Object.keys(sortedParams)
        .map(key => `${key}=${sortedParams[key]}`)
        .join('&');
    const key = crypto_1.default.createHash('md5').update(merchantKey).digest();
    const iv = Buffer.alloc(16);
    const cipher = crypto_1.default.createCipheriv('aes-128-cbc', key, iv);
    let encrypted = cipher.update(paramStr, 'utf8', 'base64');
    encrypted += cipher.final('base64');
    const hash = crypto_1.default.createHash('sha256');
    hash.update(encrypted + merchantKey);
    return hash.digest('hex');
}
function verifyChecksumHash(params, checksumHash, merchantKey) {
    const { checksumhash, ...paramsWithoutChecksum } = params;
    const expectedChecksum = generateChecksumHash(paramsWithoutChecksum, merchantKey);
    return expectedChecksum === checksumHash;
}
async function makePaytmRequest(endpoint, options = {}) {
    var _a, _b;
    const { method = 'POST', body, headers = {} } = options;
    try {
        const url = `${exports.PAYTM_CONFIG.API_BASE_URL}${endpoint}`;
        const requestOptions = {
            method,
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json',
                ...headers,
            },
        };
        if (body && (method === 'POST' || method === 'PUT' || method === 'PATCH')) {
            requestOptions.body = JSON.stringify(body);
        }
        const response = await fetch(url, requestOptions);
        if (!response.ok) {
            const errorText = await response.text();
            throw new PaytmError(`Paytm API request failed: ${response.status} ${response.statusText}`, 'API_ERROR', response.status, { response: errorText, url, method });
        }
        const data = await response.json();
        if (((_b = (_a = data.body) === null || _a === void 0 ? void 0 : _a.resultInfo) === null || _b === void 0 ? void 0 : _b.resultStatus) === 'F') {
            throw new PaytmError(data.body.resultInfo.resultMsg || 'Paytm API error', data.body.resultInfo.resultCode || 'PAYTM_API_ERROR', 400, data);
        }
        return data;
    }
    catch (error) {
        if (error instanceof PaytmError) {
            throw error;
        }
        throw new PaytmError(`Paytm API request failed: ${error.message}`, 'NETWORK_ERROR', 500, { originalError: error, endpoint, method });
    }
}
function buildCallbackUrl() {
    const baseUrl = process.env.APP_PUBLIC_URL || 'http://localhost:3000';
    return `${baseUrl}${exports.PAYTM_CONFIG.CALLBACK_URL}`;
}
function buildWebhookUrl() {
    const baseUrl = process.env.APP_PUBLIC_URL || 'http://localhost:3000';
    return `${baseUrl}${exports.PAYTM_CONFIG.WEBHOOK_ENDPOINT}`;
}
function isTestMode() {
    return exports.PAYTM_CONFIG.SANDBOX;
}
function getPaymentMethodDisplayName(method) {
    const methodNames = {
        'upi': 'UPI',
        'card': 'Credit/Debit Card',
        'netbanking': 'Net Banking',
        'wallet': 'Paytm Wallet',
        'emi': 'EMI',
        'bank_transfer': 'Bank Transfer',
    };
    return methodNames[method] || method.toUpperCase();
}
function calculatePaytmFees(amount, currency, paymentMethod = 'credit_cards') {
    const currencyInfo = getCurrencyInfo(currency);
    if (!currencyInfo) {
        return { fees: 0, netAmount: amount, grossAmount: amount };
    }
    const feeInfo = currencyInfo.fees[paymentMethod] || currencyInfo.fees.credit_cards;
    const fees = (amount * feeInfo.percentage / 100) + feeInfo.fixed;
    return {
        fees: Math.round(fees * 100) / 100,
        netAmount: Math.round((amount - fees) * 100) / 100,
        grossAmount: amount,
    };
}
function getRegionFromCurrency(currency) {
    const info = getCurrencyInfo(currency);
    return info ? info.region : 'Unknown';
}
function getCountryFromCurrency(currency) {
    const info = getCurrencyInfo(currency);
    return info ? info.country : 'Unknown';
}
function getSupportedChannels(currency) {
    const info = getCurrencyInfo(currency);
    return info ? info.methods : [];
}
