"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.roundToPrecision = roundToPrecision;
exports.validatePrecision = validatePrecision;
exports.safeAdd = safeAdd;
exports.safeSubtract = safeSubtract;
exports.safeMultiply = safeMultiply;
exports.safeDivide = safeDivide;
exports.safeEquals = safeEquals;
exports.safeGreaterThan = safeGreaterThan;
exports.safeGreaterThanOrEqual = safeGreaterThanOrEqual;
exports.safeLessThan = safeLessThan;
exports.safeLessThanOrEqual = safeLessThanOrEqual;
exports.toSmallestUnit = toSmallestUnit;
exports.fromSmallestUnit = fromSmallestUnit;
exports.formatWithPrecision = formatWithPrecision;
exports.parseWithPrecision = parseWithPrecision;
exports.calculatePercentage = calculatePercentage;
exports.calculateFee = calculateFee;
exports.calculateAmountAfterFee = calculateAmountAfterFee;
exports.clamp = clamp;
exports.ensureNonNegative = ensureNonNegative;
exports.safeSum = safeSum;
const error_1 = require("@b/utils/error");
const constants_1 = require("../constants");
function roundToPrecision(value, currency) {
    const precision = (0, constants_1.getPrecision)(currency);
    const multiplier = Math.pow(10, precision);
    return Math.round(value * multiplier) / multiplier;
}
function validatePrecision(value, currency) {
    const precision = (0, constants_1.getPrecision)(currency);
    const multiplier = Math.pow(10, precision);
    const rounded = Math.round(value * multiplier);
    return Math.abs(value * multiplier - rounded) < 0.0000001;
}
function safeAdd(a, b, currency) {
    const precision = (0, constants_1.getPrecision)(currency);
    const multiplier = Math.pow(10, precision);
    const aInt = Math.round(a * multiplier);
    const bInt = Math.round(b * multiplier);
    return (aInt + bInt) / multiplier;
}
function safeSubtract(a, b, currency) {
    const precision = (0, constants_1.getPrecision)(currency);
    const multiplier = Math.pow(10, precision);
    const aInt = Math.round(a * multiplier);
    const bInt = Math.round(b * multiplier);
    return (aInt - bInt) / multiplier;
}
function safeMultiply(a, b, currency) {
    const precision = (0, constants_1.getPrecision)(currency);
    const multiplier = Math.pow(10, precision);
    return Math.round(a * b * multiplier) / multiplier;
}
function safeDivide(a, b, currency) {
    if (b === 0) {
        throw (0, error_1.createError)({ statusCode: 400, message: "Division by zero" });
    }
    const precision = (0, constants_1.getPrecision)(currency);
    const multiplier = Math.pow(10, precision);
    return Math.round((a / b) * multiplier) / multiplier;
}
function safeEquals(a, b, tolerance = 0.00000001) {
    return Math.abs(a - b) < tolerance;
}
function safeGreaterThan(a, b, tolerance = 0.00000001) {
    return a - b > tolerance;
}
function safeGreaterThanOrEqual(a, b, tolerance = 0.00000001) {
    return a - b >= -tolerance;
}
function safeLessThan(a, b, tolerance = 0.00000001) {
    return b - a > tolerance;
}
function safeLessThanOrEqual(a, b, tolerance = 0.00000001) {
    return b - a >= -tolerance;
}
function toSmallestUnit(amount, currency) {
    const precision = (0, constants_1.getPrecision)(currency);
    const multiplier = Math.pow(10, precision);
    return BigInt(Math.round(amount * multiplier));
}
function fromSmallestUnit(amount, currency) {
    const precision = (0, constants_1.getPrecision)(currency);
    const multiplier = Math.pow(10, precision);
    return Number(amount) / multiplier;
}
function formatWithPrecision(value, currency) {
    const precision = (0, constants_1.getPrecision)(currency);
    return value.toFixed(precision);
}
function parseWithPrecision(value, currency) {
    const parsed = parseFloat(value);
    if (isNaN(parsed)) {
        throw (0, error_1.createError)({ statusCode: 400, message: `Invalid number: ${value}` });
    }
    return roundToPrecision(parsed, currency);
}
function calculatePercentage(amount, percentage, currency) {
    return safeMultiply(amount, percentage / 100, currency);
}
function calculateFee(amount, feePercentage, currency) {
    return calculatePercentage(amount, feePercentage, currency);
}
function calculateAmountAfterFee(amount, feePercentage, currency) {
    const feeAmount = calculateFee(amount, feePercentage, currency);
    const netAmount = safeSubtract(amount, feeAmount, currency);
    return { netAmount, feeAmount };
}
function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
}
function ensureNonNegative(value) {
    return Math.max(0, value);
}
function safeSum(values, currency) {
    return values.reduce((acc, val) => safeAdd(acc, val, currency), 0);
}
