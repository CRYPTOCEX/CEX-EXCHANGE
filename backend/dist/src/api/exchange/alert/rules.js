"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.InvalidAlertError = exports.PRICE_NOISE_FRACTION = exports.REARM_COOLDOWN_MS = exports.MAX_ALERTS_PER_USER = exports.ALERT_MARKET_TYPES = exports.ALERT_CONDITIONS = void 0;
exports.toMillis = toMillis;
exports.parseTargetPrice = parseTargetPrice;
exports.parseCondition = parseCondition;
exports.parseMarketType = parseMarketType;
exports.parseSymbol = parseSymbol;
exports.parseExpiresAt = parseExpiresAt;
exports.nextBaseline = nextBaseline;
exports.crossed = crossed;
exports.evaluateAlert = evaluateAlert;
exports.isExpiredAt = isExpiredAt;
exports.describeChange = describeChange;
exports.formatAlertPrice = formatAlertPrice;
exports.ALERT_CONDITIONS = [
    "CROSSES_ABOVE",
    "CROSSES_BELOW",
    "CROSSES",
];
exports.ALERT_MARKET_TYPES = [
    "SPOT",
    "ECO",
    "FUTURES",
];
exports.MAX_ALERTS_PER_USER = 50;
exports.REARM_COOLDOWN_MS = 60000;
exports.PRICE_NOISE_FRACTION = 1e-9;
class InvalidAlertError extends Error {
    constructor(message) {
        super(message);
        this.name = "InvalidAlertError";
    }
}
exports.InvalidAlertError = InvalidAlertError;
function toMillis(value) {
    if (value === null || value === undefined || value === "")
        return null;
    if (value instanceof Date) {
        const t = value.getTime();
        return Number.isFinite(t) ? t : null;
    }
    if (typeof value === "number")
        return Number.isFinite(value) ? value : null;
    const t = Date.parse(value);
    return Number.isFinite(t) ? t : null;
}
function parseTargetPrice(value, label = "targetPrice") {
    if (value === null || value === undefined || value === "") {
        throw new InvalidAlertError(`${label} is required.`);
    }
    const n = typeof value === "number" ? value : Number(value);
    if (!Number.isFinite(n) || n <= 0) {
        throw new InvalidAlertError(`${label} must be a positive number.`);
    }
    return n;
}
function parseCondition(value) {
    const raw = String(value !== null && value !== void 0 ? value : "").toUpperCase();
    const match = exports.ALERT_CONDITIONS.find((c) => c === raw);
    if (!match) {
        throw new InvalidAlertError(`condition must be one of ${exports.ALERT_CONDITIONS.join(", ")}.`);
    }
    return match;
}
function parseMarketType(value) {
    if (value === null || value === undefined || value === "")
        return "SPOT";
    const raw = String(value).toUpperCase();
    const match = exports.ALERT_MARKET_TYPES.find((t) => t === raw);
    if (!match) {
        throw new InvalidAlertError(`type must be one of ${exports.ALERT_MARKET_TYPES.join(", ")}.`);
    }
    return match;
}
function parseSymbol(value) {
    const raw = String(value !== null && value !== void 0 ? value : "").trim().toUpperCase();
    if (!/^[A-Z0-9._-]{1,20}\/[A-Z0-9._-]{1,20}$/.test(raw)) {
        throw new InvalidAlertError("symbol must look like BASE/QUOTE, e.g. BTC/USDT.");
    }
    return raw;
}
function parseExpiresAt(value, now) {
    if (value === null || value === undefined || value === "")
        return null;
    const ms = toMillis(value);
    if (ms === null) {
        throw new InvalidAlertError("expiresAt must be a date or epoch milliseconds.");
    }
    if (ms <= now) {
        throw new InvalidAlertError("expiresAt must be in the future.");
    }
    return new Date(ms);
}
function nextBaseline(previous, current) {
    if (!Number.isFinite(current) || current <= 0) {
        return { baseline: previous, evaluate: false };
    }
    if (previous === null || !Number.isFinite(previous) || previous <= 0) {
        return { baseline: current, evaluate: false };
    }
    const move = Math.abs(current - previous);
    const scale = Math.max(Math.abs(current), Math.abs(previous));
    if (move === 0 || (scale > 0 && move < scale * exports.PRICE_NOISE_FRACTION)) {
        return { baseline: previous, evaluate: false };
    }
    return { baseline: current, evaluate: true };
}
function crossed(condition, previous, current, target) {
    switch (condition) {
        case "CROSSES_ABOVE":
            return previous < target && current >= target;
        case "CROSSES_BELOW":
            return previous > target && current <= target;
        case "CROSSES":
            return ((previous < target && current >= target) ||
                (previous > target && current <= target));
    }
}
function evaluateAlert(alert, previous, current, now) {
    if (alert.status !== "ACTIVE")
        return { kind: "idle" };
    const expiresAt = toMillis(alert.expiresAt);
    if (expiresAt !== null && now > expiresAt)
        return { kind: "expired" };
    if (!Number.isFinite(alert.targetPrice) || alert.targetPrice <= 0) {
        return { kind: "idle" };
    }
    const low = Math.min(previous, current);
    const high = Math.max(previous, current);
    if (alert.targetPrice < low || alert.targetPrice > high) {
        return { kind: "idle" };
    }
    if (!crossed(alert.condition, previous, current, alert.targetPrice)) {
        return { kind: "idle" };
    }
    if (alert.isRepeating) {
        const triggeredAt = toMillis(alert.triggeredAt);
        if (triggeredAt !== null && now - triggeredAt < exports.REARM_COOLDOWN_MS) {
            return { kind: "cooling" };
        }
        return { kind: "triggered", nextStatus: "ACTIVE" };
    }
    return { kind: "triggered", nextStatus: "TRIGGERED" };
}
function isExpiredAt(alert, now) {
    if (alert.status !== "ACTIVE")
        return false;
    const expiresAt = toMillis(alert.expiresAt);
    return expiresAt !== null && now > expiresAt;
}
function describeChange(previous, current) {
    if (!Number.isFinite(previous) || previous <= 0)
        return "";
    const pct = ((current - previous) / previous) * 100;
    const sign = pct >= 0 ? "+" : "";
    return `${sign}${pct.toFixed(2)}%`;
}
function formatAlertPrice(price) {
    if (!Number.isFinite(price))
        return "";
    const abs = Math.abs(price);
    if (abs >= 1000)
        return price.toFixed(2);
    if (abs >= 1)
        return price.toFixed(4);
    if (abs >= 0.01)
        return price.toFixed(6);
    return price.toFixed(10);
}
