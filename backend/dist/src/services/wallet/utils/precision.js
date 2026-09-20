"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.roundToPrecision = roundToPrecision;
exports.truncateToPrecision = truncateToPrecision;
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
function shiftDecimalExponent(value, exp) {
    if (value === 0 || !Number.isFinite(value))
        return value;
    const [mantissa, rawExponent] = value.toExponential().split("e");
    return Number(`${mantissa}e${Number(rawExponent) + exp}`);
}
function roundToPrecision(value, currency) {
    if (!Number.isFinite(value))
        return value;
    const precision = (0, constants_1.getPrecision)(currency);
    const shifted = shiftDecimalExponent(value, precision);
    const rounded = shifted < 0 ? -Math.round(-shifted) : Math.round(shifted);
    return shiftDecimalExponent(rounded, -precision);
}
function truncateToPrecision(value, currency) {
    if (!Number.isFinite(value))
        return value;
    const precision = (0, constants_1.getPrecision)(currency);
    const shifted = shiftDecimalExponent(value, precision);
    const truncated = Math.trunc(shifted);
    const result = shiftDecimalExponent(truncated, -precision);
    if (Math.abs(result) <= Math.abs(value))
        return result;
    const towardZero = truncated - Math.sign(truncated || 1);
    const corrected = shiftDecimalExponent(towardZero, -precision);
    return Math.abs(corrected) <= Math.abs(value) ? corrected : value;
}
function validatePrecision(value, currency) {
    if (!Number.isFinite(value))
        return false;
    return roundToPrecision(value, currency) === value;
}
function safeAdd(a, b, currency) {
    return roundToPrecision(a + b, currency);
}
function safeSubtract(a, b, currency) {
    return roundToPrecision(a - b, currency);
}
function safeMultiply(a, b, currency) {
    return roundToPrecision(a * b, currency);
}
function safeDivide(a, b, currency) {
    if (b === 0) {
        throw (0, error_1.createError)({ statusCode: 400, message: "Division by zero" });
    }
    return roundToPrecision(a / b, currency);
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
    const shifted = shiftDecimalExponent(amount, precision);
    if (!Number.isFinite(shifted)) {
        throw (0, error_1.createError)({
            statusCode: 400,
            message: `Cannot convert ${amount} ${currency} to its smallest unit`,
        });
    }
    return BigInt(Math.round(shifted));
}
function fromSmallestUnit(amount, currency) {
    const precision = (0, constants_1.getPrecision)(currency);
    return shiftDecimalExponent(Number(amount), -precision);
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
