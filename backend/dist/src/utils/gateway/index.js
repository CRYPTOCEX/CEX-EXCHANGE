"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.normalizeAmount = normalizeAmount;
exports.parseBalance = parseBalance;
exports.amountsEqual = amountsEqual;
exports.amountGte = amountGte;
exports.generateRandomString = generateRandomString;
exports.generateApiKey = generateApiKey;
exports.generatePaymentIntentId = generatePaymentIntentId;
exports.generateRefundId = generateRefundId;
exports.generatePayoutId = generatePayoutId;
exports.hashApiKey = hashApiKey;
exports.getLastFourChars = getLastFourChars;
exports.signWebhookPayload = signWebhookPayload;
exports.verifyWebhookSignature = verifyWebhookSignature;
exports.calculateFees = calculateFees;
exports.authenticateGatewayApi = authenticateGatewayApi;
exports.checkApiPermission = checkApiPermission;
exports.getOrCreateMerchantBalance = getOrCreateMerchantBalance;
exports.processMultiWalletRefund = processMultiWalletRefund;
exports.processGatewayPayout = processGatewayPayout;
exports.collectGatewayFee = collectGatewayFee;
exports.updateMerchantBalanceForPayment = updateMerchantBalanceForPayment;
exports.sendWebhook = sendWebhook;
exports.attemptWebhookDelivery = attemptWebhookDelivery;
exports.generateCheckoutUrl = generateCheckoutUrl;
exports.validateAmount = validateAmount;
exports.validateCurrency = validateCurrency;
exports.validateWalletType = validateWalletType;
exports.validateUrl = validateUrl;
exports.getGatewaySettings = getGatewaySettings;
exports.validatePaymentAgainstSettings = validatePaymentAgainstSettings;
const crypto_1 = __importDefault(require("crypto"));
const db_1 = require("@b/db");
const error_1 = require("@b/utils/error");
const console_1 = require("@b/utils/console");
const wallet_1 = require("@b/services/wallet");
function normalizeAmount(amount) {
    const num = parseFloat(amount);
    if (!Number.isFinite(num))
        return 0;
    return Math.round(num * 100000000) / 100000000;
}
function parseBalance(value) {
    if (value === null || value === undefined)
        return 0;
    return normalizeAmount(value.toString());
}
function amountsEqual(a, b, tolerance = 0.00000001) {
    return Math.abs(normalizeAmount(a) - normalizeAmount(b)) < tolerance;
}
function amountGte(a, b, tolerance = 0.00000001) {
    return normalizeAmount(a) >= normalizeAmount(b) - tolerance;
}
const CHARSET = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
function generateRandomString(length) {
    let result = "";
    const charsetLength = CHARSET.length;
    for (let i = 0; i < length; i++) {
        result += CHARSET.charAt(Math.floor(Math.random() * charsetLength));
    }
    return result;
}
function generateApiKey(prefix) {
    const randomPart = generateRandomString(48);
    return `${prefix}${randomPart}`;
}
function generatePaymentIntentId() {
    return `pi_${generateRandomString(24)}`;
}
function generateRefundId() {
    return `re_${generateRandomString(24)}`;
}
function generatePayoutId() {
    return `po_${generateRandomString(24)}`;
}
function hashApiKey(key) {
    return crypto_1.default.createHash("sha256").update(key).digest("hex");
}
function getLastFourChars(key) {
    return key.slice(-4);
}
function signWebhookPayload(payload, secret) {
    const timestamp = Math.floor(Date.now() / 1000);
    const payloadString = JSON.stringify(payload);
    const signaturePayload = `${timestamp}.${payloadString}`;
    const signature = crypto_1.default
        .createHmac("sha256", secret)
        .update(signaturePayload)
        .digest("hex");
    return {
        signature: `sha256=${signature}`,
        timestamp,
    };
}
function verifyWebhookSignature(timestamp, payload, signature, secret) {
    const now = Math.floor(Date.now() / 1000);
    const timestampNum = parseInt(timestamp, 10);
    if (Math.abs(now - timestampNum) > 300) {
        return false;
    }
    const expected = "sha256=" +
        crypto_1.default
            .createHmac("sha256", secret)
            .update(`${timestamp}.${payload}`)
            .digest("hex");
    try {
        return crypto_1.default.timingSafeEqual(Buffer.from(expected), Buffer.from(signature));
    }
    catch (_a) {
        return false;
    }
}
function calculateFees(amount, feeType, feePercentage, feeFixed) {
    let feeAmount = 0;
    switch (feeType) {
        case "PERCENTAGE":
            feeAmount = (amount * feePercentage) / 100;
            break;
        case "FIXED":
            feeAmount = feeFixed;
            break;
        case "BOTH":
            feeAmount = (amount * feePercentage) / 100 + feeFixed;
            break;
    }
    feeAmount = Math.round(feeAmount * 100000000) / 100000000;
    const netAmount = Math.round((amount - feeAmount) * 100000000) / 100000000;
    return { feeAmount, netAmount };
}
async function authenticateGatewayApi(apiKeyHeader, clientIp) {
    if (!apiKeyHeader) {
        throw (0, error_1.createError)({ statusCode: 401, message: "API key required" });
    }
    const isSecretKey = apiKeyHeader.startsWith("sk_live_") || apiKeyHeader.startsWith("sk_test_");
    const isPublicKey = apiKeyHeader.startsWith("pk_live_") || apiKeyHeader.startsWith("pk_test_");
    const isTestMode = apiKeyHeader.startsWith("sk_test_") || apiKeyHeader.startsWith("pk_test_");
    if (!isSecretKey && !isPublicKey) {
        throw (0, error_1.createError)({ statusCode: 401, message: "Invalid API key format" });
    }
    const keyHash = hashApiKey(apiKeyHeader);
    const apiKey = await db_1.models.gatewayApiKey.findOne({
        where: {
            keyHash,
            status: true,
        },
        include: [
            {
                model: db_1.models.gatewayMerchant,
                as: "merchant",
            },
        ],
    });
    if (!apiKey) {
        throw (0, error_1.createError)({ statusCode: 401, message: "Invalid API key" });
    }
    if (apiKey.expiresAt && new Date(apiKey.expiresAt) < new Date()) {
        throw (0, error_1.createError)({ statusCode: 401, message: "API key expired" });
    }
    if (!apiKey.merchant || apiKey.merchant.status !== "ACTIVE") {
        throw (0, error_1.createError)({
            statusCode: 403,
            message: "Merchant account is not active",
        });
    }
    if (isSecretKey && apiKey.ipWhitelist && Array.isArray(apiKey.ipWhitelist) && apiKey.ipWhitelist.length > 0) {
        const normalizedIp = (clientIp === null || clientIp === void 0 ? void 0 : clientIp.replace(/^::ffff:/, "")) || "";
        const isWhitelisted = apiKey.ipWhitelist.some((ip) => {
            const normalizedWhitelistIp = ip.replace(/^::ffff:/, "");
            return normalizedWhitelistIp === normalizedIp ||
                normalizedWhitelistIp === "*" ||
                (normalizedWhitelistIp.includes("/") && isIpInCidr(normalizedIp, normalizedWhitelistIp));
        });
        if (!isWhitelisted) {
            throw (0, error_1.createError)({
                statusCode: 403,
                message: "IP address not whitelisted for this API key",
            });
        }
    }
    await apiKey.update({
        lastUsedAt: new Date(),
        lastUsedIp: clientIp || null,
    });
    return {
        merchant: apiKey.merchant,
        apiKey,
        isTestMode,
        isSecretKey,
    };
}
function isIpInCidr(ip, cidr) {
    try {
        const [range, bits] = cidr.split("/");
        const mask = ~(2 ** (32 - parseInt(bits)) - 1);
        const ipToInt = (ipStr) => {
            const parts = ipStr.split(".").map(Number);
            return (parts[0] << 24) | (parts[1] << 16) | (parts[2] << 8) | parts[3];
        };
        return (ipToInt(ip) & mask) === (ipToInt(range) & mask);
    }
    catch (_a) {
        return false;
    }
}
function checkApiPermission(apiKey, requiredPermission) {
    const permissions = apiKey.permissions || [];
    if (!permissions.includes(requiredPermission) && !permissions.includes("*")) {
        throw (0, error_1.createError)({
            statusCode: 403,
            message: `Missing required permission: ${requiredPermission}`,
        });
    }
}
async function getOrCreateMerchantBalance(merchantId, currency, walletType, transaction) {
    const options = transaction ? { transaction } : {};
    let balance = await db_1.models.gatewayMerchantBalance.findOne({
        where: { merchantId, currency, walletType },
        ...options,
    });
    if (!balance) {
        balance = await db_1.models.gatewayMerchantBalance.create({
            merchantId,
            currency,
            walletType,
            available: 0,
            pending: 0,
            reserved: 0,
            totalReceived: 0,
            totalRefunded: 0,
            totalFees: 0,
            totalPaidOut: 0,
        }, options);
    }
    return balance;
}
async function processMultiWalletRefund(params) {
    var _a, _b;
    const { userId, merchantId, allocations, refundAmount, totalPaymentAmount, feeAmount, refundId, paymentId, description, transaction: t, } = params;
    const refundProportion = refundAmount / totalPaymentAmount;
    const feePercentageOfPayment = feeAmount / totalPaymentAmount;
    const userTransactions = [];
    for (let i = 0; i < allocations.length; i++) {
        const allocation = allocations[i];
        const allocationRefundAmount = allocation.amount * refundProportion;
        const allocationFee = allocation.amount * feePercentageOfPayment;
        const netAmountFromMerchant = allocationRefundAmount - allocationFee;
        const merchantBalance = await db_1.models.gatewayMerchantBalance.findOne({
            where: {
                merchantId,
                currency: allocation.currency,
                walletType: allocation.walletType,
            },
            transaction: t,
            lock: t.LOCK.UPDATE,
        });
        if (!merchantBalance) {
            throw (0, error_1.createError)({
                statusCode: 400,
                message: `Merchant gateway balance not found for ${allocation.currency} (${allocation.walletType})`,
            });
        }
        const pendingBalance = parseFloat(((_a = merchantBalance.pending) === null || _a === void 0 ? void 0 : _a.toString()) || "0");
        if (pendingBalance < netAmountFromMerchant) {
            throw (0, error_1.createError)({
                statusCode: 400,
                message: `Insufficient merchant gateway balance for refund in ${allocation.currency}. Available: ${pendingBalance}, Required: ${netAmountFromMerchant}`,
            });
        }
        await merchantBalance.update({
            pending: pendingBalance - netAmountFromMerchant,
            totalRefunded: parseFloat(((_b = merchantBalance.totalRefunded) === null || _b === void 0 ? void 0 : _b.toString()) || "0") + allocationRefundAmount,
        }, { transaction: t });
        const userWalletResult = await wallet_1.walletCreationService.getOrCreateWallet(userId, allocation.walletType, allocation.currency, t);
        const userWallet = userWalletResult.wallet;
        const refundIdempotencyKey = `gateway_refund_${refundId}_${allocation.currency}_${i}`;
        const creditResult = await wallet_1.walletService.credit({
            idempotencyKey: refundIdempotencyKey,
            userId,
            walletId: userWallet.id,
            walletType: allocation.walletType,
            currency: allocation.currency,
            amount: allocationRefundAmount,
            operationType: "REFUND",
            referenceId: `${refundId}_user_${allocation.currency}_${i}`,
            description: description || `Refund for payment ${paymentId}`,
            metadata: {
                paymentId,
                refundId,
                refundAmount: allocationRefundAmount,
                feeReturned: allocationFee,
                equivalentInPaymentCurrency: allocation.equivalentInPaymentCurrency * refundProportion,
                isPartialRefund: allocations.length > 1,
                allocationIndex: i,
            },
            transaction: t,
        });
        const userTx = await db_1.models.transaction.findByPk(creditResult.transactionId, { transaction: t });
        userTransactions.push(userTx);
        if (allocationFee > 0) {
            await returnGatewayFee({
                currency: allocation.currency,
                walletType: allocation.walletType,
                feeAmount: allocationFee,
                merchantId,
                refundId,
                transaction: t,
            });
        }
    }
    return { userTransaction: userTransactions[0] };
}
async function returnGatewayFee(params) {
    const { currency, walletType, feeAmount, merchantId, refundId, transaction: t, } = params;
    const superAdminRole = await db_1.models.role.findOne({
        where: { name: "Super Admin" },
    });
    if (!superAdminRole)
        return;
    const superAdmin = await db_1.models.user.findOne({
        where: { roleId: superAdminRole.id },
        order: [["createdAt", "ASC"]],
    });
    if (!superAdmin)
        return;
    const adminWalletResult = await wallet_1.walletCreationService.getOrCreateWallet(superAdmin.id, walletType, currency, t);
    const adminWallet = adminWalletResult.wallet;
    const adminBalance = parseFloat(String(adminWallet.balance));
    if (adminBalance >= feeAmount) {
        const feeReturnIdempotencyKey = `gateway_fee_return_${refundId}_${currency}`;
        await wallet_1.walletService.debit({
            idempotencyKey: feeReturnIdempotencyKey,
            userId: superAdmin.id,
            walletId: adminWallet.id,
            walletType,
            currency,
            amount: feeAmount,
            operationType: "OUTGOING_TRANSFER",
            referenceId: `${refundId}_fee_return_${currency}`,
            description: `Gateway fee returned for refund`,
            metadata: {
                refundId,
                merchantId,
                type: "GATEWAY_FEE_RETURN",
            },
            transaction: t,
        });
    }
}
async function processGatewayPayout(params) {
    var _a, _b, _c;
    const { merchantUserId, merchantId, currency, walletType, amount, payoutId, transaction: t, } = params;
    const merchantBalanceRecord = await db_1.models.gatewayMerchantBalance.findOne({
        where: { merchantId, currency, walletType },
        transaction: t,
        lock: t.LOCK.UPDATE,
    });
    if (!merchantBalanceRecord) {
        throw (0, error_1.createError)({
            statusCode: 400,
            message: `Merchant gateway balance not found for ${currency} (${walletType})`,
        });
    }
    const pendingBalance = parseFloat(((_a = merchantBalanceRecord.pending) === null || _a === void 0 ? void 0 : _a.toString()) || "0");
    if (pendingBalance < amount) {
        throw (0, error_1.createError)({
            statusCode: 400,
            message: `Insufficient gateway balance for payout. Available: ${pendingBalance}, Requested: ${amount}`,
        });
    }
    const currentAvailable = parseFloat(((_b = merchantBalanceRecord.available) === null || _b === void 0 ? void 0 : _b.toString()) || "0");
    await merchantBalanceRecord.update({
        pending: pendingBalance - amount,
        available: currentAvailable + amount,
        totalPaidOut: parseFloat(((_c = merchantBalanceRecord.totalPaidOut) === null || _c === void 0 ? void 0 : _c.toString()) || "0") + amount,
    }, { transaction: t });
    const merchantWalletResult = await wallet_1.walletCreationService.getOrCreateWallet(merchantUserId, walletType, currency, t);
    const merchantWallet = merchantWalletResult.wallet;
    const payoutIdempotencyKey = `gateway_payout_${payoutId}`;
    await wallet_1.walletService.credit({
        idempotencyKey: payoutIdempotencyKey,
        userId: merchantUserId,
        walletId: merchantWallet.id,
        walletType,
        currency,
        amount,
        operationType: "INCOMING_TRANSFER",
        referenceId: payoutId,
        description: `Gateway payout released`,
        metadata: {
            payoutId,
            merchantId,
            source: "GATEWAY_PAYOUT",
        },
        transaction: t,
    });
}
async function collectGatewayFee(params) {
    const { currency, walletType, feeAmount, merchantId, paymentId, transaction: t } = params;
    const superAdminRole = await db_1.models.role.findOne({
        where: { name: "Super Admin" },
    });
    if (!superAdminRole) {
        console_1.logger.warn("GATEWAY", "No super admin role found for fee collection");
        return;
    }
    const superAdmin = await db_1.models.user.findOne({
        where: { roleId: superAdminRole.id },
        order: [["createdAt", "ASC"]],
    });
    if (!superAdmin) {
        console_1.logger.warn("GATEWAY", "No super admin found for fee collection");
        return;
    }
    const adminWalletResult = await wallet_1.walletCreationService.getOrCreateWallet(superAdmin.id, walletType, currency, t);
    const adminWallet = adminWalletResult.wallet;
    const feeIdempotencyKey = `gateway_fee_${paymentId}`;
    const creditResult = await wallet_1.walletService.credit({
        idempotencyKey: feeIdempotencyKey,
        userId: superAdmin.id,
        walletId: adminWallet.id,
        walletType,
        currency,
        amount: feeAmount,
        operationType: "FEE",
        referenceId: `${paymentId}_fee`,
        description: `Gateway payment fee`,
        metadata: {
            paymentId,
            merchantId,
            type: "GATEWAY_FEE",
        },
        transaction: t,
    });
    await db_1.models.adminProfit.create({
        transactionId: creditResult.transactionId,
        type: "GATEWAY_PAYMENT",
        amount: feeAmount,
        currency,
        description: `Gateway payment fee from merchant ${merchantId}`,
    }, { transaction: t });
}
async function updateMerchantBalanceForPayment(params) {
    return updateMerchantBalanceTracking({
        ...params,
        type: "PAYMENT",
    });
}
async function updateMerchantBalanceTracking(params) {
    const { merchantId, currency, walletType, amount, feeAmount, type, transaction: t } = params;
    let balance = await db_1.models.gatewayMerchantBalance.findOne({
        where: { merchantId, currency, walletType },
        transaction: t,
    });
    if (!balance) {
        balance = await db_1.models.gatewayMerchantBalance.create({
            merchantId,
            currency,
            walletType,
            available: 0,
            pending: 0,
            reserved: 0,
            totalReceived: 0,
            totalRefunded: 0,
            totalFees: 0,
            totalPaidOut: 0,
        }, { transaction: t });
    }
    const netAmount = amount - feeAmount;
    if (type === "PAYMENT") {
        await balance.update({
            pending: parseFloat(balance.pending.toString()) + netAmount,
            totalReceived: parseFloat(balance.totalReceived.toString()) + amount,
            totalFees: parseFloat(balance.totalFees.toString()) + feeAmount,
        }, { transaction: t });
    }
    else if (type === "REFUND") {
        const currentPending = parseFloat(balance.pending.toString());
        const currentAvailable = parseFloat(balance.available.toString());
        let pendingDeduction = Math.min(currentPending, netAmount);
        let availableDeduction = netAmount - pendingDeduction;
        await balance.update({
            pending: currentPending - pendingDeduction,
            available: currentAvailable - availableDeduction,
            totalRefunded: parseFloat(balance.totalRefunded.toString()) + amount,
        }, { transaction: t });
    }
}
async function sendWebhook(merchantId, paymentId, refundId, eventType, url, payload, webhookSecret) {
    const { signature } = signWebhookPayload(payload, webhookSecret);
    const webhook = await db_1.models.gatewayWebhook.create({
        merchantId,
        paymentId,
        refundId,
        eventType,
        url,
        payload,
        signature,
        status: "PENDING",
        attempts: 0,
        maxAttempts: 5,
    });
    await attemptWebhookDelivery(webhook);
}
async function attemptWebhookDelivery(webhook) {
    var _a;
    const startTime = Date.now();
    try {
        const { signature, timestamp } = signWebhookPayload(webhook.payload, ((_a = webhook.merchant) === null || _a === void 0 ? void 0 : _a.webhookSecret) || "");
        const response = await fetch(webhook.url, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "X-Gateway-Signature": signature,
                "X-Gateway-Timestamp": timestamp.toString(),
                "X-Gateway-Event": webhook.eventType,
                "User-Agent": "PaymentGateway-Webhook/1.0",
            },
            body: JSON.stringify(webhook.payload),
            signal: AbortSignal.timeout(30000),
        });
        const responseTime = Date.now() - startTime;
        const responseBody = await response.text().catch(() => "");
        await webhook.update({
            attempts: webhook.attempts + 1,
            lastAttemptAt: new Date(),
            responseStatus: response.status,
            responseBody: responseBody.substring(0, 1000),
            responseTime,
            status: response.ok ? "SENT" : "RETRYING",
            nextRetryAt: response.ok
                ? null
                : new Date(Date.now() + getRetryDelay(webhook.attempts + 1)),
        });
        if (!response.ok && webhook.attempts + 1 >= webhook.maxAttempts) {
            await webhook.update({ status: "FAILED" });
        }
    }
    catch (error) {
        const responseTime = Date.now() - startTime;
        await webhook.update({
            attempts: webhook.attempts + 1,
            lastAttemptAt: new Date(),
            responseTime,
            errorMessage: error.message,
            status: webhook.attempts + 1 >= webhook.maxAttempts ? "FAILED" : "RETRYING",
            nextRetryAt: webhook.attempts + 1 >= webhook.maxAttempts
                ? null
                : new Date(Date.now() + getRetryDelay(webhook.attempts + 1)),
        });
    }
}
function getRetryDelay(attempt) {
    const delays = [60000, 300000, 1800000, 7200000, 86400000];
    return delays[Math.min(attempt - 1, delays.length - 1)];
}
function generateCheckoutUrl(paymentIntentId) {
    const baseUrl = process.env.APP_PUBLIC_URL || "http://localhost:3000";
    const defaultLocale = process.env.APP_DEFAULT_LOCALE || "en";
    return `${baseUrl}/${defaultLocale}/gateway/checkout/${paymentIntentId}`;
}
function validateAmount(amount) {
    const parsed = parseFloat(amount);
    if (isNaN(parsed) || parsed <= 0) {
        throw (0, error_1.createError)({
            statusCode: 400,
            message: "Amount must be a positive number",
        });
    }
    return parsed;
}
function validateCurrency(currency, allowedCurrencies) {
    if (!allowedCurrencies.includes(currency.toUpperCase())) {
        throw (0, error_1.createError)({
            statusCode: 400,
            message: `Currency ${currency} is not supported by this merchant`,
        });
    }
}
function validateWalletType(walletType, allowedWalletTypes) {
    if (!allowedWalletTypes.includes(walletType)) {
        throw (0, error_1.createError)({
            statusCode: 400,
            message: `Wallet type ${walletType} is not supported by this merchant`,
        });
    }
}
function validateUrl(url, fieldName) {
    try {
        new URL(url);
    }
    catch (_a) {
        throw (0, error_1.createError)({
            statusCode: 400,
            message: `${fieldName} must be a valid URL`,
        });
    }
}
const GATEWAY_SETTINGS_KEYS = [
    "gatewayEnabled",
    "gatewayTestMode",
    "gatewayFeePercentage",
    "gatewayFeeFixed",
    "gatewayMinPaymentAmount",
    "gatewayMaxPaymentAmount",
    "gatewayDailyLimit",
    "gatewayMonthlyLimit",
    "gatewayMinPayoutAmount",
    "gatewayPayoutSchedule",
    "gatewayAllowedWalletTypes",
    "gatewayRequireKyc",
    "gatewayAutoApproveVerified",
    "gatewayPaymentExpirationMinutes",
    "gatewayWebhookRetryAttempts",
    "gatewayWebhookRetryDelaySeconds",
];
const defaultGatewaySettings = {
    gatewayEnabled: true,
    gatewayTestMode: false,
    gatewayFeePercentage: 2.9,
    gatewayFeeFixed: 0.3,
    gatewayMinPaymentAmount: 1,
    gatewayMaxPaymentAmount: 10000,
    gatewayDailyLimit: 50000,
    gatewayMonthlyLimit: 500000,
    gatewayMinPayoutAmount: 50,
    gatewayPayoutSchedule: "DAILY",
    gatewayAllowedWalletTypes: {},
    gatewayRequireKyc: false,
    gatewayAutoApproveVerified: false,
    gatewayPaymentExpirationMinutes: 30,
    gatewayWebhookRetryAttempts: 3,
    gatewayWebhookRetryDelaySeconds: 60,
};
async function getGatewaySettings() {
    const settings = await db_1.models.settings.findAll({
        where: {
            key: GATEWAY_SETTINGS_KEYS,
        },
    });
    const settingsMap = {};
    for (const setting of settings) {
        let parsedValue = setting.value;
        if (setting.value) {
            try {
                parsedValue = JSON.parse(setting.value);
            }
            catch (_a) {
            }
        }
        if (parsedValue === "true")
            parsedValue = true;
        if (parsedValue === "false")
            parsedValue = false;
        if (typeof parsedValue === "string" && !isNaN(Number(parsedValue))) {
            parsedValue = Number(parsedValue);
        }
        settingsMap[setting.key] = parsedValue;
    }
    return {
        ...defaultGatewaySettings,
        ...settingsMap,
    };
}
async function validatePaymentAgainstSettings(amount, currency, walletType) {
    const settings = await getGatewaySettings();
    if (!settings.gatewayEnabled) {
        throw (0, error_1.createError)({
            statusCode: 400,
            message: "Payment gateway is currently disabled",
        });
    }
    if (amount < settings.gatewayMinPaymentAmount) {
        throw (0, error_1.createError)({
            statusCode: 400,
            message: `Minimum payment amount is $${settings.gatewayMinPaymentAmount} USD`,
        });
    }
    if (amount > settings.gatewayMaxPaymentAmount) {
        throw (0, error_1.createError)({
            statusCode: 400,
            message: `Maximum payment amount is $${settings.gatewayMaxPaymentAmount} USD`,
        });
    }
    const allowedWalletTypes = settings.gatewayAllowedWalletTypes || {};
    const walletConfig = allowedWalletTypes[walletType];
    if (!walletConfig || !walletConfig.enabled) {
        throw (0, error_1.createError)({
            statusCode: 400,
            message: `Wallet type ${walletType} is not enabled for payments`,
        });
    }
    if (!walletConfig.currencies || !walletConfig.currencies.includes(currency)) {
        throw (0, error_1.createError)({
            statusCode: 400,
            message: `Currency ${currency} is not enabled for ${walletType} wallet payments`,
        });
    }
}
