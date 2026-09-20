"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PROVIDER_TIME_IN_FORCE = exports.InvalidTimeInForceError = exports.TIME_IN_FORCE_VALUES = void 0;
exports.timeInForceForProvider = timeInForceForProvider;
exports.parseTimeInForce = parseTimeInForce;
exports.resolveTimeInForce = resolveTimeInForce;
exports.recordedTimeInForce = recordedTimeInForce;
exports.recordedOrderType = recordedOrderType;
exports.restsOnTheBook = restsOnTheBook;
exports.TIME_IN_FORCE_VALUES = [
    "GTC",
    "IOC",
    "FOK",
    "PO",
];
class InvalidTimeInForceError extends Error {
    constructor(value) {
        super(`timeInForce must be one of ${exports.TIME_IN_FORCE_VALUES.join(", ")} (received ${String(value)}).`);
        this.name = "InvalidTimeInForceError";
    }
}
exports.InvalidTimeInForceError = InvalidTimeInForceError;
exports.PROVIDER_TIME_IN_FORCE = {
    binance: { limit: ["GTC", "IOC", "FOK", "PO"], withheld: {} },
    kucoin: { limit: ["GTC", "IOC", "FOK", "PO"], withheld: {} },
    xt: {
        limit: ["GTC", "IOC"],
        withheld: {
            FOK: "XT's spot symbol payload lists GTC and IOC only (xt.js:1030, :1155). " +
                "ccxt does send FOK to XT, but only as its hard-coded default for spot " +
                "MARKET orders (xt.js:2495) — which says nothing about a LIMIT order, " +
                "and this path offers no time in force on market orders at all.",
            PO: "XT's post-only token is GTX, and it appears only in the CONTRACT symbol " +
                "payload (xt.js:1091, :1220) — not the spot one. `createSpotOrder` calls " +
                "neither isPostOnly nor handlePostOnly (xt.js:2479-2543), so ccxt has no " +
                "code that could turn a post-only request into anything XT spot " +
                "understands: a 'PO' token would be forwarded raw. Offering it would mean " +
                "guessing, and the guess is paid for with a real order.",
        },
    },
};
function timeInForceForProvider(provider) {
    var _a;
    var _b;
    const key = String(provider !== null && provider !== void 0 ? provider : "").trim().toLowerCase();
    return (_b = (_a = exports.PROVIDER_TIME_IN_FORCE[key]) === null || _a === void 0 ? void 0 : _a.limit) !== null && _b !== void 0 ? _b : ["GTC"];
}
function parseTimeInForce(value) {
    if (value === undefined || value === null || value === "")
        return "GTC";
    const raw = String(value).trim().toUpperCase();
    const match = exports.TIME_IN_FORCE_VALUES.find((v) => v === raw);
    if (!match)
        throw new InvalidTimeInForceError(value);
    return match;
}
function resolveTimeInForce(input) {
    var _a, _b;
    var _c, _d;
    const type = String((_c = input.type) !== null && _c !== void 0 ? _c : "").trim().toLowerCase();
    const tif = input.timeInForce;
    if (type !== "limit") {
        if (tif === "GTC" || tif === "IOC")
            return { ok: true, params: {} };
        return {
            ok: false,
            message: tif === "PO"
                ? "A market order always takes liquidity, so it cannot be post-only."
                : "Fill-or-kill is not supported on market orders; use a limit order with FOK.",
        };
    }
    if (tif === "GTC")
        return { ok: true, params: {} };
    const provider = String((_d = input.provider) !== null && _d !== void 0 ? _d : "").trim().toLowerCase();
    if (!timeInForceForProvider(provider).includes(tif)) {
        const reason = (_b = (_a = exports.PROVIDER_TIME_IN_FORCE[provider]) === null || _a === void 0 ? void 0 : _a.withheld) === null || _b === void 0 ? void 0 : _b[tif];
        return {
            ok: false,
            message: `${tif} orders are not available on ${provider || "this venue"}.${reason ? ` ${reason}` : ""}`,
        };
    }
    return { ok: true, params: { timeInForce: tif } };
}
function recordedTimeInForce(venueOrder, requested) {
    var _a;
    if ((venueOrder === null || venueOrder === void 0 ? void 0 : venueOrder.postOnly) === true)
        return "PO";
    const raw = String((_a = venueOrder === null || venueOrder === void 0 ? void 0 : venueOrder.timeInForce) !== null && _a !== void 0 ? _a : "").trim().toUpperCase();
    if (raw === "GTX")
        return "PO";
    const match = exports.TIME_IN_FORCE_VALUES.find((v) => v === raw);
    return match !== null && match !== void 0 ? match : requested;
}
function recordedOrderType(venueType, requestedType) {
    const raw = String(venueType !== null && venueType !== void 0 ? venueType : "").trim().toUpperCase();
    if (raw === "LIMIT" || raw === "MARKET")
        return raw;
    if (raw.endsWith("LIMIT") || raw === "LIMIT_MAKER")
        return "LIMIT";
    return String(requestedType !== null && requestedType !== void 0 ? requestedType : "").trim().toUpperCase() === "MARKET"
        ? "MARKET"
        : "LIMIT";
}
function restsOnTheBook(status) {
    const normalised = String(status !== null && status !== void 0 ? status : "").trim().toLowerCase();
    if (normalised === "closed" || normalised === "filled")
        return false;
    return !["canceled", "cancelled", "expired", "rejected"].includes(normalised);
}
