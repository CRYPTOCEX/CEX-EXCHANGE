"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PAYSAFE_PAYMENT_TYPES = exports.PaysafeError = exports.PAYSAFE_STATUS_MAPPING = exports.PAYSAFE_CURRENCY_DECIMALS = exports.PAYSAFE_CURRENCY_METHODS = exports.PAYSAFE_CONFIG = void 0;
exports.validatePaysafeConfig = validatePaysafeConfig;
exports.isCurrencySupported = isCurrencySupported;
exports.getAvailablePaymentMethods = getAvailablePaymentMethods;
exports.formatPaysafeAmount = formatPaysafeAmount;
exports.parsePaysafeAmount = parsePaysafeAmount;
exports.mapPaysafeStatus = mapPaysafeStatus;
exports.generatePaysafeReference = generatePaysafeReference;
exports.makeApiRequest = makeApiRequest;
exports.buildWebhookUrl = buildWebhookUrl;
exports.buildReturnUrl = buildReturnUrl;
exports.buildCancelUrl = buildCancelUrl;
exports.isTestMode = isTestMode;
exports.getPaymentMethodDisplayName = getPaymentMethodDisplayName;
exports.validateWebhookSignature = validateWebhookSignature;
exports.getRegionFromCurrency = getRegionFromCurrency;
const error_1 = require("@b/utils/error");
const crypto_1 = __importDefault(require("crypto"));
exports.PAYSAFE_CONFIG = {
    API_BASE_URL: process.env.APP_PAYSAFE_SANDBOX === 'true'
        ? 'https://api.test.paysafe.com'
        : 'https://api.paysafe.com',
    API_KEY: process.env.APP_PAYSAFE_API_KEY || '',
    API_SECRET: process.env.APP_PAYSAFE_API_SECRET || '',
    ACCOUNT_ID: process.env.APP_PAYSAFE_ACCOUNT_ID || '',
    SANDBOX: process.env.APP_PAYSAFE_SANDBOX === 'true',
    WEBHOOK_ENDPOINT: process.env.APP_PAYSAFE_WEBHOOK_ENDPOINT || '/api/finance/deposit/fiat/paysafe/webhook',
    RETURN_URL: process.env.APP_PAYSAFE_RETURN_URL || '/user/wallet/deposit/paysafe/verify',
    TIMEOUT: 30000,
    VERSION: 'v1',
};
exports.PAYSAFE_CURRENCY_METHODS = {
    'USD': ['creditcard', 'paypal', 'venmo', 'applepay', 'googlepay', 'ach', 'paybybank', 'vippreferred', 'playsightline'],
    'EUR': ['creditcard', 'paypal', 'skrill', 'neteller', 'applepay', 'googlepay', 'sepadirectdebit', 'banktransfer', 'paysafecard', 'paysafecash'],
    'GBP': ['creditcard', 'paypal', 'skrill', 'neteller', 'applepay', 'googlepay', 'banktransfer', 'paysafecard', 'paysafecash'],
    'CAD': ['creditcard', 'paypal', 'skrill', 'neteller', 'applepay', 'googlepay', 'eft', 'banktransfer', 'paysafecard'],
    'CHF': ['creditcard', 'paypal', 'skrill', 'neteller', 'applepay', 'googlepay', 'paysafecard'],
    'SEK': ['creditcard', 'paypal', 'skrill', 'neteller', 'applepay', 'googlepay', 'paysafecard'],
    'NOK': ['creditcard', 'paypal', 'skrill', 'neteller', 'applepay', 'googlepay', 'paysafecard'],
    'DKK': ['creditcard', 'paypal', 'skrill', 'neteller', 'applepay', 'googlepay', 'paysafecard'],
    'PLN': ['creditcard', 'paypal', 'skrill', 'neteller', 'applepay', 'googlepay', 'paysafecard'],
    'CZK': ['creditcard', 'paypal', 'skrill', 'neteller', 'applepay', 'googlepay', 'paysafecard'],
    'HUF': ['creditcard', 'paypal', 'skrill', 'neteller', 'applepay', 'googlepay', 'paysafecard'],
    'BGN': ['creditcard', 'skrill', 'neteller', 'applepay', 'googlepay', 'paysafecard'],
    'RON': ['creditcard', 'skrill', 'neteller', 'applepay', 'googlepay', 'paysafecard'],
    'HRK': ['creditcard', 'skrill', 'neteller', 'applepay', 'googlepay'],
    'ISK': ['creditcard', 'skrill', 'neteller', 'applepay', 'googlepay'],
    'AUD': ['creditcard', 'paypal', 'skrill', 'neteller', 'applepay', 'googlepay', 'paysafecard'],
    'NZD': ['creditcard', 'paypal', 'skrill', 'neteller', 'applepay', 'googlepay'],
    'JPY': ['creditcard', 'paypal', 'skrill', 'neteller', 'applepay', 'googlepay', 'paysafecard'],
    'CNY': ['creditcard', 'skrill', 'neteller', 'applepay', 'googlepay'],
    'HKD': ['creditcard', 'paypal', 'skrill', 'neteller', 'applepay', 'googlepay'],
    'SGD': ['creditcard', 'paypal', 'skrill', 'neteller', 'applepay', 'googlepay'],
    'MYR': ['creditcard', 'paypal', 'skrill', 'neteller', 'applepay', 'googlepay'],
    'THB': ['creditcard', 'paypal', 'skrill', 'neteller', 'applepay', 'googlepay'],
    'PHP': ['creditcard', 'paypal', 'skrill', 'neteller', 'applepay', 'googlepay'],
    'IDR': ['creditcard', 'skrill', 'neteller', 'applepay', 'googlepay'],
    'VND': ['creditcard', 'skrill', 'neteller'],
    'KRW': ['creditcard', 'skrill', 'neteller', 'applepay', 'googlepay'],
    'TWD': ['creditcard', 'paypal', 'skrill', 'neteller'],
    'INR': ['creditcard', 'paypal', 'skrill', 'neteller', 'applepay', 'googlepay'],
    'ILS': ['creditcard', 'paypal', 'skrill', 'neteller', 'applepay', 'googlepay'],
    'TRY': ['creditcard', 'skrill', 'neteller', 'applepay', 'googlepay'],
    'ZAR': ['creditcard', 'skrill', 'neteller', 'applepay', 'googlepay'],
    'BRL': ['creditcard', 'paypal', 'skrill', 'neteller', 'applepay', 'googlepay', 'pix', 'boleto'],
    'MXN': ['creditcard', 'paypal', 'skrill', 'neteller', 'applepay', 'googlepay'],
    'CLP': ['creditcard', 'skrill', 'neteller'],
    'COP': ['creditcard', 'skrill', 'neteller'],
    'PEN': ['creditcard', 'skrill', 'neteller', 'pagoefectivo'],
    'ARS': ['creditcard', 'skrill', 'neteller'],
    'UYU': ['creditcard', 'skrill', 'neteller'],
    'BOB': ['creditcard', 'skrill', 'neteller'],
    'PYG': ['creditcard', 'skrill', 'neteller'],
    'FJD': ['creditcard'],
    'WST': ['creditcard'],
    'TOP': ['creditcard'],
    'VUV': ['creditcard'],
    'SBD': ['creditcard'],
    'PGK': ['creditcard'],
};
exports.PAYSAFE_CURRENCY_DECIMALS = {
    'USD': 2, 'EUR': 2, 'GBP': 2, 'CAD': 2, 'AUD': 2, 'CHF': 2, 'SEK': 2, 'NOK': 2, 'DKK': 2,
    'PLN': 2, 'CZK': 2, 'HUF': 2, 'BGN': 2, 'RON': 2, 'HRK': 2, 'ISK': 2, 'NZD': 2,
    'HKD': 2, 'SGD': 2, 'MYR': 2, 'THB': 2, 'PHP': 2, 'TWD': 2, 'INR': 2, 'ILS': 2, 'TRY': 2,
    'ZAR': 2, 'BRL': 2, 'MXN': 2, 'CLP': 2, 'COP': 2, 'PEN': 2, 'ARS': 2, 'UYU': 2, 'BOB': 2,
    'PYG': 0, 'FJD': 2, 'WST': 2, 'TOP': 2, 'VUV': 0, 'SBD': 2, 'PGK': 2,
    'JPY': 0, 'KRW': 0, 'IDR': 0, 'VND': 0, 'CNY': 2
};
exports.PAYSAFE_STATUS_MAPPING = {
    'INITIATED': 'PENDING',
    'PENDING': 'PENDING',
    'PROCESSING': 'PENDING',
    'PAYABLE': 'PENDING',
    'COMPLETED': 'COMPLETED',
    'FAILED': 'FAILED',
    'CANCELLED': 'CANCELLED',
    'EXPIRED': 'EXPIRED',
    'REFUNDED': 'REFUNDED',
    'CHARGED_BACK': 'CHARGEBACK',
    'DECLINED': 'FAILED',
    'ERROR': 'FAILED',
};
class PaysafeError extends Error {
    constructor(message, code = 'PAYSAFE_ERROR', status = 500, details) {
        super(message);
        this.name = 'PaysafeError';
        this.code = code;
        this.status = status;
        this.details = details;
    }
}
exports.PaysafeError = PaysafeError;
function validatePaysafeConfig() {
    if (!exports.PAYSAFE_CONFIG.API_KEY) {
        throw (0, error_1.createError)({ statusCode: 500, message: 'Paysafe API key is not configured' });
    }
    if (!exports.PAYSAFE_CONFIG.API_SECRET) {
        throw (0, error_1.createError)({ statusCode: 500, message: 'Paysafe API secret is not configured' });
    }
    if (!exports.PAYSAFE_CONFIG.ACCOUNT_ID) {
        throw (0, error_1.createError)({ statusCode: 500, message: 'Paysafe Account ID is not configured' });
    }
}
function isCurrencySupported(currency) {
    return Object.keys(exports.PAYSAFE_CURRENCY_METHODS).includes(currency.toUpperCase());
}
function getAvailablePaymentMethods(currency) {
    return exports.PAYSAFE_CURRENCY_METHODS[currency.toUpperCase()] || ['creditcard'];
}
function formatPaysafeAmount(amount, currency) {
    const decimals = exports.PAYSAFE_CURRENCY_DECIMALS[currency.toUpperCase()] || 2;
    return Math.round(amount * Math.pow(10, decimals));
}
function parsePaysafeAmount(amount, currency) {
    const decimals = exports.PAYSAFE_CURRENCY_DECIMALS[currency.toUpperCase()] || 2;
    return amount / Math.pow(10, decimals);
}
function mapPaysafeStatus(paysafeStatus) {
    return exports.PAYSAFE_STATUS_MAPPING[paysafeStatus.toUpperCase()] || 'PENDING';
}
function generatePaysafeReference() {
    const timestamp = Date.now().toString();
    const random = Math.random().toString(36).substring(2, 8);
    return `PAYSAFE_${timestamp}_${random}`.toUpperCase();
}
async function makeApiRequest(endpoint, options = {}) {
    var _a, _b, _c;
    validatePaysafeConfig();
    const { method = 'GET', body, headers = {} } = options;
    const url = `${exports.PAYSAFE_CONFIG.API_BASE_URL}/paymenthub/${exports.PAYSAFE_CONFIG.VERSION}/${endpoint}`;
    const auth = Buffer.from(`${exports.PAYSAFE_CONFIG.API_KEY}:${exports.PAYSAFE_CONFIG.API_SECRET}`).toString('base64');
    const requestHeaders = {
        'Authorization': `Basic ${auth}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        ...headers,
    };
    const requestOptions = {
        method,
        headers: requestHeaders,
        body: body ? JSON.stringify(body) : undefined,
        signal: AbortSignal.timeout(exports.PAYSAFE_CONFIG.TIMEOUT),
    };
    try {
        const response = await fetch(url, requestOptions);
        const responseData = await response.json();
        if (!response.ok) {
            const errorMessage = ((_a = responseData === null || responseData === void 0 ? void 0 : responseData.error) === null || _a === void 0 ? void 0 : _a.message) || `HTTP ${response.status}: ${response.statusText}`;
            const errorCode = ((_b = responseData === null || responseData === void 0 ? void 0 : responseData.error) === null || _b === void 0 ? void 0 : _b.code) || 'API_ERROR';
            throw new PaysafeError(errorMessage, errorCode, response.status, (_c = responseData === null || responseData === void 0 ? void 0 : responseData.error) === null || _c === void 0 ? void 0 : _c.details);
        }
        return responseData;
    }
    catch (error) {
        if (error instanceof PaysafeError) {
            throw error;
        }
        if (error.name === 'AbortError') {
            throw new PaysafeError('Request timeout', 'TIMEOUT_ERROR', 408);
        }
        throw new PaysafeError(error.message || 'Unknown error occurred', 'NETWORK_ERROR', 500);
    }
}
function buildWebhookUrl() {
    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
    return `${baseUrl}${exports.PAYSAFE_CONFIG.WEBHOOK_ENDPOINT}`;
}
function buildReturnUrl() {
    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
    return `${baseUrl}${exports.PAYSAFE_CONFIG.RETURN_URL}`;
}
function buildCancelUrl() {
    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
    return `${baseUrl}/user/wallet/deposit/paysafe/cancel`;
}
function isTestMode() {
    return exports.PAYSAFE_CONFIG.SANDBOX;
}
function getPaymentMethodDisplayName(method) {
    const displayNames = {
        'creditcard': 'Credit/Debit Cards',
        'paypal': 'PayPal',
        'venmo': 'Venmo',
        'skrill': 'Skrill',
        'neteller': 'NETELLER',
        'applepay': 'Apple Pay',
        'googlepay': 'Google Pay',
        'ach': 'ACH Bank Transfer',
        'eft': 'EFT Bank Transfer',
        'paybybank': 'Pay by Bank',
        'sepadirectdebit': 'SEPA Direct Debit',
        'banktransfer': 'Bank Transfer',
        'paysafecard': 'paysafecard',
        'paysafecash': 'paysafecash',
        'vippreferred': 'VIP Preferred',
        'playsightline': 'Play+ by Sightline',
        'pix': 'PIX',
        'boleto': 'Boleto Bancario',
        'pagoefectivo': 'PagoEfectivo',
    };
    return displayNames[method] || method.charAt(0).toUpperCase() + method.slice(1);
}
function validateWebhookSignature(body, signature) {
    if (!signature || !exports.PAYSAFE_CONFIG.API_SECRET) {
        return false;
    }
    try {
        const expectedSignature = crypto_1.default
            .createHmac('sha256', exports.PAYSAFE_CONFIG.API_SECRET)
            .update(body)
            .digest('hex');
        return crypto_1.default.timingSafeEqual(Buffer.from(signature, 'hex'), Buffer.from(expectedSignature, 'hex'));
    }
    catch (error) {
        return false;
    }
}
function getRegionFromCurrency(currency) {
    const regionMap = {
        'USD': 'US',
        'CAD': 'CA',
        'EUR': 'EU',
        'GBP': 'UK',
        'AUD': 'AU',
        'NZD': 'NZ',
        'JPY': 'JP',
        'CNY': 'CN',
        'HKD': 'HK',
        'SGD': 'SG',
        'MYR': 'MY',
        'THB': 'TH',
        'PHP': 'PH',
        'IDR': 'ID',
        'VND': 'VN',
        'KRW': 'KR',
        'TWD': 'TW',
        'INR': 'IN',
        'BRL': 'BR',
        'MXN': 'MX',
        'ZAR': 'ZA',
    };
    return regionMap[currency.toUpperCase()] || 'GLOBAL';
}
exports.PAYSAFE_PAYMENT_TYPES = {
    CARDS: 'CARD',
    PAYPAL: 'PAYPAL',
    VENMO: 'VENMO',
    SKRILL: 'SKRILL',
    NETELLER: 'NETELLER',
    APPLE_PAY: 'APPLEPAY',
    GOOGLE_PAY: 'GOOGLEPAY',
    ACH: 'ACH',
    EFT: 'EFT',
    PAYSAFECARD: 'PAYSAFECARD',
    PAYSAFECASH: 'PAYSAFECASH',
};
