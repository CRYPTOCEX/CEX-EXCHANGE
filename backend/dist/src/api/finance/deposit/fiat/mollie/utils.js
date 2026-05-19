"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MollieError = exports.MOLLIE_STATUS_MAPPING = exports.MOLLIE_LOCALE_MAP = exports.MOLLIE_CURRENCY_DECIMALS = exports.MOLLIE_CURRENCY_METHODS = exports.MOLLIE_CONFIG = void 0;
exports.validateMollieConfig = validateMollieConfig;
exports.isCurrencySupported = isCurrencySupported;
exports.getAvailablePaymentMethods = getAvailablePaymentMethods;
exports.formatMollieAmount = formatMollieAmount;
exports.parseMollieAmount = parseMollieAmount;
exports.getMollieLocale = getMollieLocale;
exports.mapMollieStatus = mapMollieStatus;
exports.generateMollieReference = generateMollieReference;
exports.makeApiRequest = makeApiRequest;
exports.buildWebhookUrl = buildWebhookUrl;
exports.buildReturnUrl = buildReturnUrl;
exports.isTestMode = isTestMode;
exports.validateWebhookSignature = validateWebhookSignature;
exports.getPaymentMethodDisplayName = getPaymentMethodDisplayName;
const error_1 = require("@b/utils/error");
exports.MOLLIE_CONFIG = {
    API_BASE_URL: 'https://api.mollie.com/v2',
    API_KEY: process.env.APP_MOLLIE_API_KEY || '',
    WEBHOOK_ENDPOINT: process.env.APP_MOLLIE_WEBHOOK_ENDPOINT || '/api/finance/deposit/fiat/mollie/webhook',
    RETURN_URL: process.env.APP_MOLLIE_RETURN_URL || '/user/wallet/deposit/mollie/verify',
    TIMEOUT: 30000,
};
exports.MOLLIE_CURRENCY_METHODS = {
    'EUR': ['creditcard', 'ideal', 'bancontact', 'sofort', 'paypal', 'applepay', 'googlepay', 'sepadirectdebit', 'banktransfer', 'klarna', 'przelewy24', 'eps', 'giropay', 'kbc', 'belfius'],
    'USD': ['creditcard', 'paypal', 'applepay', 'googlepay'],
    'GBP': ['creditcard', 'paypal', 'applepay', 'googlepay'],
    'CHF': ['creditcard', 'paypal', 'applepay', 'googlepay'],
    'SEK': ['creditcard', 'paypal', 'klarna', 'applepay', 'googlepay'],
    'NOK': ['creditcard', 'paypal', 'klarna', 'applepay', 'googlepay'],
    'DKK': ['creditcard', 'paypal', 'klarna', 'applepay', 'googlepay'],
    'PLN': ['creditcard', 'paypal', 'przelewy24', 'applepay', 'googlepay'],
    'CZK': ['creditcard', 'paypal', 'applepay', 'googlepay'],
    'AUD': ['creditcard', 'paypal', 'applepay', 'googlepay'],
    'CAD': ['creditcard', 'paypal', 'applepay', 'googlepay'],
    'JPY': ['creditcard', 'paypal', 'applepay', 'googlepay'],
    'HKD': ['creditcard', 'paypal', 'applepay', 'googlepay'],
    'SGD': ['creditcard', 'paypal', 'applepay', 'googlepay'],
    'NZD': ['creditcard', 'paypal', 'applepay', 'googlepay'],
    'ZAR': ['creditcard', 'applepay', 'googlepay'],
    'BGN': ['creditcard', 'applepay', 'googlepay'],
    'RON': ['creditcard', 'applepay', 'googlepay'],
    'HUF': ['creditcard', 'paypal', 'applepay', 'googlepay'],
    'ISK': ['creditcard', 'applepay', 'googlepay'],
    'ILS': ['creditcard', 'paypal', 'applepay', 'googlepay'],
    'MYR': ['paypal'],
    'PHP': ['creditcard', 'paypal', 'applepay', 'googlepay'],
    'THB': ['paypal'],
    'TWD': ['paypal'],
};
exports.MOLLIE_CURRENCY_DECIMALS = {
    'EUR': 2, 'USD': 2, 'GBP': 2, 'CHF': 2, 'SEK': 2, 'NOK': 2, 'DKK': 2,
    'PLN': 2, 'CZK': 2, 'AUD': 2, 'CAD': 2, 'HKD': 2, 'SGD': 2, 'NZD': 2,
    'ZAR': 2, 'BGN': 2, 'RON': 2, 'HUF': 2, 'ILS': 2, 'MYR': 2, 'PHP': 2,
    'THB': 2, 'TWD': 2, 'JPY': 0, 'ISK': 0
};
exports.MOLLIE_LOCALE_MAP = {
    'en': 'en_US',
    'nl': 'nl_NL',
    'de': 'de_DE',
    'fr': 'fr_FR',
    'es': 'es_ES',
    'it': 'it_IT',
    'pt': 'pt_PT',
    'pl': 'pl_PL',
    'cs': 'cs_CZ',
    'da': 'da_DK',
    'sv': 'sv_SE',
    'no': 'nb_NO',
    'fi': 'fi_FI',
    'hu': 'hu_HU',
    'bg': 'bg_BG',
    'ro': 'ro_RO',
    'sk': 'sk_SK',
    'sl': 'sl_SI',
    'hr': 'hr_HR',
    'et': 'et_EE',
    'lv': 'lv_LV',
    'lt': 'lt_LT',
    'mt': 'mt_MT',
};
exports.MOLLIE_STATUS_MAPPING = {
    'open': 'PENDING',
    'pending': 'PENDING',
    'authorized': 'PENDING',
    'paid': 'COMPLETED',
    'canceled': 'CANCELLED',
    'expired': 'EXPIRED',
    'failed': 'FAILED',
    'refunded': 'REFUNDED',
    'charged_back': 'CHARGEBACK',
};
class MollieError extends Error {
    constructor(message, status = 500, type, field) {
        super(message);
        this.name = 'MollieError';
        this.status = status;
        this.type = type;
        this.field = field;
    }
}
exports.MollieError = MollieError;
function validateMollieConfig() {
    if (!exports.MOLLIE_CONFIG.API_KEY) {
        throw (0, error_1.createError)({
            statusCode: 500,
            message: 'Mollie API key is not configured',
        });
    }
}
function isCurrencySupported(currency) {
    return Object.keys(exports.MOLLIE_CURRENCY_METHODS).includes(currency.toUpperCase());
}
function getAvailablePaymentMethods(currency) {
    const upperCurrency = currency.toUpperCase();
    return exports.MOLLIE_CURRENCY_METHODS[upperCurrency] || [];
}
function formatMollieAmount(amount, currency) {
    const decimals = exports.MOLLIE_CURRENCY_DECIMALS[currency.toUpperCase()] || 2;
    return (amount / Math.pow(10, decimals)).toFixed(decimals);
}
function parseMollieAmount(amountString, currency) {
    const decimals = exports.MOLLIE_CURRENCY_DECIMALS[currency.toUpperCase()] || 2;
    return Math.round(parseFloat(amountString) * Math.pow(10, decimals));
}
function getMollieLocale(locale) {
    const baseLocale = locale.split('-')[0].toLowerCase();
    return exports.MOLLIE_LOCALE_MAP[baseLocale] || 'en_US';
}
function mapMollieStatus(mollieStatus) {
    return exports.MOLLIE_STATUS_MAPPING[mollieStatus] || 'PENDING';
}
function generateMollieReference() {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 8);
    return `MOLLIE_${timestamp}_${random}`.toUpperCase();
}
async function makeApiRequest(endpoint, options = {}) {
    validateMollieConfig();
    const url = `${exports.MOLLIE_CONFIG.API_BASE_URL}${endpoint}`;
    const { method = 'GET', body, headers = {} } = options;
    const requestHeaders = {
        'Authorization': `Bearer ${exports.MOLLIE_CONFIG.API_KEY}`,
        'Content-Type': 'application/json',
        'User-Agent': 'v5-platform/1.0.0',
        ...headers,
    };
    try {
        const response = await fetch(url, {
            method,
            headers: requestHeaders,
            body: body ? JSON.stringify(body) : undefined,
            signal: AbortSignal.timeout(exports.MOLLIE_CONFIG.TIMEOUT),
        });
        const responseData = await response.json();
        if (!response.ok) {
            const error = responseData;
            throw new MollieError(error.detail || error.title || 'Mollie API request failed', error.status || response.status, error.type, error.field);
        }
        return responseData;
    }
    catch (error) {
        if (error instanceof MollieError) {
            throw error;
        }
        if (error.name === 'TimeoutError') {
            throw new MollieError('Mollie API request timed out', 408);
        }
        if (error.name === 'TypeError' && error.message.includes('fetch')) {
            throw new MollieError('Network error connecting to Mollie API', 503);
        }
        throw new MollieError(error.message || 'Unknown error occurred with Mollie API', 500);
    }
}
function buildWebhookUrl() {
    const baseUrl = process.env.APP_PUBLIC_URL || 'https://localhost:3000';
    return `${baseUrl}${exports.MOLLIE_CONFIG.WEBHOOK_ENDPOINT}`;
}
function buildReturnUrl() {
    const baseUrl = process.env.APP_PUBLIC_URL || 'https://localhost:3000';
    return `${baseUrl}${exports.MOLLIE_CONFIG.RETURN_URL}`;
}
function isTestMode() {
    return exports.MOLLIE_CONFIG.API_KEY.startsWith('test_');
}
function validateWebhookSignature(body, signature) {
    return true;
}
function getPaymentMethodDisplayName(method) {
    const methodNames = {
        'creditcard': 'Credit Card',
        'ideal': 'iDEAL',
        'bancontact': 'Bancontact',
        'sofort': 'SOFORT Banking',
        'paypal': 'PayPal',
        'applepay': 'Apple Pay',
        'googlepay': 'Google Pay',
        'sepadirectdebit': 'SEPA Direct Debit',
        'banktransfer': 'Bank Transfer',
        'klarna': 'Klarna',
        'przelewy24': 'Przelewy24',
        'eps': 'EPS',
        'giropay': 'Giropay',
        'kbc': 'KBC Payment Button',
        'belfius': 'Belfius Pay Button',
    };
    return methodNames[method] || method;
}
