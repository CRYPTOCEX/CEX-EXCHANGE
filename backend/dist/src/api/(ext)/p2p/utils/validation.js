"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateTradeAmount = validateTradeAmount;
exports.validateTradeStatusTransition = validateTradeStatusTransition;
exports.validateOfferStatusTransition = validateOfferStatusTransition;
exports.sanitizeInput = sanitizeInput;
exports.validateMessage = validateMessage;
exports.validatePaymentMethod = validatePaymentMethod;
exports.validateTradeTerms = validateTradeTerms;
exports.validateDisputeReason = validateDisputeReason;
exports.validateEvidenceFile = validateEvidenceFile;
exports.validateLocationSettings = validateLocationSettings;
exports.validateUserRequirements = validateUserRequirements;
exports.validatePriceConfig = validatePriceConfig;
const validator_1 = __importDefault(require("validator"));
const error_1 = require("@b/utils/error");
const TRADE_STATUS_TRANSITIONS = {
    PENDING: ["PAYMENT_SENT", "CANCELLED", "EXPIRED"],
    PAYMENT_SENT: ["COMPLETED", "DISPUTED"],
    COMPLETED: ["DISPUTED"],
    DISPUTED: ["COMPLETED", "CANCELLED"],
    CANCELLED: [],
    EXPIRED: [],
};
const OFFER_STATUS_TRANSITIONS = {
    DRAFT: ["PENDING_APPROVAL", "CANCELLED"],
    PENDING_APPROVAL: ["ACTIVE", "REJECTED"],
    ACTIVE: ["PAUSED", "COMPLETED", "CANCELLED"],
    PAUSED: ["ACTIVE", "CANCELLED"],
    COMPLETED: [],
    CANCELLED: [],
    REJECTED: [],
    EXPIRED: [],
};
function validateTradeAmount(amount) {
    if (typeof amount !== "number" || isNaN(amount)) {
        return false;
    }
    const MIN_TRADE_AMOUNT = 0.0001;
    const MAX_TRADE_AMOUNT = 1000000;
    return amount >= MIN_TRADE_AMOUNT && amount <= MAX_TRADE_AMOUNT;
}
function validateTradeStatusTransition(currentStatus, newStatus) {
    const allowedTransitions = TRADE_STATUS_TRANSITIONS[currentStatus];
    if (!allowedTransitions) {
        return false;
    }
    return allowedTransitions.includes(newStatus);
}
function validateOfferStatusTransition(currentStatus, newStatus) {
    const allowedTransitions = OFFER_STATUS_TRANSITIONS[currentStatus];
    if (!allowedTransitions) {
        return false;
    }
    return allowedTransitions.includes(newStatus);
}
function sanitizeInput(input) {
    if (!input || typeof input !== "string") {
        return "";
    }
    return validator_1.default.escape(validator_1.default.stripLow(input.trim()));
}
function validateMessage(message) {
    if (!message || typeof message !== "string") {
        throw (0, error_1.createError)({
            statusCode: 400,
            message: "Message must be a non-empty string"
        });
    }
    const sanitized = sanitizeInput(message);
    const MAX_MESSAGE_LENGTH = 1000;
    if (sanitized.length === 0) {
        throw (0, error_1.createError)({
            statusCode: 400,
            message: "Message cannot be empty"
        });
    }
    if (sanitized.length > MAX_MESSAGE_LENGTH) {
        throw (0, error_1.createError)({
            statusCode: 400,
            message: `Message cannot exceed ${MAX_MESSAGE_LENGTH} characters`
        });
    }
    return sanitized;
}
function validatePaymentMethod(data) {
    if (!data || typeof data !== "object") {
        throw (0, error_1.createError)({
            statusCode: 400,
            message: "Invalid payment method data"
        });
    }
    if (!data.name || typeof data.name !== "string") {
        throw (0, error_1.createError)({
            statusCode: 400,
            message: "Payment method name is required"
        });
    }
    const name = sanitizeInput(data.name);
    if (name.length < 2 || name.length > 50) {
        throw (0, error_1.createError)({
            statusCode: 400,
            message: "Payment method name must be between 2-50 characters"
        });
    }
    const allowedIcons = [
        "credit-card", "bank", "wallet", "cash", "bitcoin",
        "ethereum", "paypal", "venmo", "zelle", "wire-transfer"
    ];
    const icon = data.icon && allowedIcons.includes(data.icon)
        ? data.icon
        : "credit-card";
    const result = { name, icon };
    if (data.description) {
        result.description = sanitizeInput(data.description).substring(0, 200);
    }
    if (data.instructions) {
        result.instructions = sanitizeInput(data.instructions).substring(0, 500);
    }
    if (data.processingTime) {
        result.processingTime = sanitizeInput(data.processingTime).substring(0, 50);
    }
    return result;
}
function validateTradeTerms(terms) {
    if (!terms || typeof terms !== "string") {
        throw (0, error_1.createError)({
            statusCode: 400,
            message: "Trade terms are required"
        });
    }
    const sanitized = sanitizeInput(terms);
    if (sanitized.length < 10) {
        throw (0, error_1.createError)({
            statusCode: 400,
            message: "Trade terms must be at least 10 characters"
        });
    }
    if (sanitized.length > 1000) {
        throw (0, error_1.createError)({
            statusCode: 400,
            message: "Trade terms cannot exceed 1000 characters"
        });
    }
    return sanitized;
}
function validateDisputeReason(reason) {
    const validReasons = [
        "PAYMENT_NOT_RECEIVED",
        "PAYMENT_INCORRECT_AMOUNT",
        "CRYPTO_NOT_RELEASED",
        "SELLER_UNRESPONSIVE",
        "BUYER_UNRESPONSIVE",
        "FRAUDULENT_ACTIVITY",
        "TERMS_VIOLATION",
        "OTHER"
    ];
    if (!reason || !validReasons.includes(reason)) {
        throw (0, error_1.createError)({
            statusCode: 400,
            message: "Invalid dispute reason"
        });
    }
    return reason;
}
function validateEvidenceFile(file) {
    if (!file) {
        return { isValid: false, error: "No file provided" };
    }
    const MAX_FILE_SIZE = 5 * 1024 * 1024;
    if (file.size > MAX_FILE_SIZE) {
        return { isValid: false, error: "File size exceeds 5MB limit" };
    }
    const allowedTypes = [
        "image/jpeg",
        "image/png",
        "image/gif",
        "application/pdf",
        "text/plain"
    ];
    if (!allowedTypes.includes(file.mimetype)) {
        return {
            isValid: false,
            error: "Invalid file type. Allowed: JPEG, PNG, GIF, PDF, TXT"
        };
    }
    const allowedExtensions = [".jpg", ".jpeg", ".png", ".gif", ".pdf", ".txt"];
    const ext = file.name.toLowerCase().substring(file.name.lastIndexOf("."));
    if (!allowedExtensions.includes(ext)) {
        return { isValid: false, error: "Invalid file extension" };
    }
    return { isValid: true };
}
function validateLocationSettings(data) {
    if (!data || typeof data !== "object") {
        throw (0, error_1.createError)({
            statusCode: 400,
            message: "Location settings are required"
        });
    }
    if (!data.country || typeof data.country !== "string") {
        throw (0, error_1.createError)({
            statusCode: 400,
            message: "Country is required"
        });
    }
    const country = data.country.toUpperCase();
    if (!validator_1.default.isISO31661Alpha2(country)) {
        throw (0, error_1.createError)({
            statusCode: 400,
            message: "Invalid country code"
        });
    }
    const result = { country };
    if (data.region) {
        result.region = sanitizeInput(data.region).substring(0, 100);
    }
    if (data.city) {
        result.city = sanitizeInput(data.city).substring(0, 100);
    }
    if (data.restrictions && Array.isArray(data.restrictions)) {
        result.restrictions = data.restrictions
            .filter((r) => typeof r === "string" && validator_1.default.isISO31661Alpha2(r))
            .slice(0, 50);
    }
    return result;
}
function validateUserRequirements(data) {
    if (!data || typeof data !== "object") {
        return null;
    }
    const result = {};
    if (typeof data.minCompletedTrades === "number") {
        result.minCompletedTrades = Math.max(0, Math.min(1000, Math.floor(data.minCompletedTrades)));
    }
    if (typeof data.minSuccessRate === "number") {
        result.minSuccessRate = Math.max(0, Math.min(100, data.minSuccessRate));
    }
    if (typeof data.minAccountAge === "number") {
        result.minAccountAge = Math.max(0, Math.min(365, Math.floor(data.minAccountAge)));
    }
    if (typeof data.trustedOnly === "boolean") {
        result.trustedOnly = data.trustedOnly;
    }
    return Object.keys(result).length > 0 ? result : null;
}
function validatePriceConfig(data, marketPrice) {
    if (!data || typeof data !== "object") {
        throw (0, error_1.createError)({
            statusCode: 400,
            message: "Price configuration is required"
        });
    }
    if (!["FIXED", "MARGIN"].includes(data.model)) {
        throw (0, error_1.createError)({
            statusCode: 400,
            message: "Price model must be FIXED or MARGIN"
        });
    }
    if (typeof data.value !== "number") {
        throw (0, error_1.createError)({
            statusCode: 400,
            message: "Price value must be a number"
        });
    }
    if (data.model === "FIXED" && data.value <= 0) {
        throw (0, error_1.createError)({
            statusCode: 400,
            message: "Fixed price must be a positive number"
        });
    }
    let finalPrice;
    if (data.model === "FIXED") {
        finalPrice = data.value;
    }
    else {
        if (!marketPrice || marketPrice <= 0) {
            throw (0, error_1.createError)({
                statusCode: 400,
                message: "Market price is required for margin pricing"
            });
        }
        if (data.value < -10 || data.value > 10) {
            throw (0, error_1.createError)({
                statusCode: 400,
                message: "Margin must be between -10% and +10%"
            });
        }
        finalPrice = marketPrice * (1 + data.value / 100);
    }
    return {
        model: data.model,
        value: data.value,
        marketPrice: data.model === "MARGIN" ? marketPrice : undefined,
        finalPrice: parseFloat(finalPrice.toFixed(8)),
    };
}
