"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.baseAlertSchema = void 0;
exports.toHttpError = toHttpError;
exports.serializeAlert = serializeAlert;
const error_1 = require("@b/utils/error");
const rules_1 = require("./rules");
exports.baseAlertSchema = {
    id: { type: "string", description: "Alert id" },
    symbol: { type: "string", description: "Symbol being watched, e.g. BTC/USDT" },
    type: {
        type: "string",
        enum: ["SPOT", "ECO", "FUTURES"],
        description: "Market family the symbol belongs to",
    },
    condition: {
        type: "string",
        enum: ["CROSSES_ABOVE", "CROSSES_BELOW", "CROSSES"],
        description: "Direction of crossing that fires the alert",
    },
    targetPrice: { type: "number", description: "The price level being watched" },
    status: {
        type: "string",
        enum: ["ACTIVE", "TRIGGERED", "EXPIRED", "DISABLED"],
        description: "Only ACTIVE alerts are evaluated",
    },
    isRepeating: {
        type: "boolean",
        description: "Re-arms after firing instead of retiring",
    },
    note: { type: "string", nullable: true, description: "Optional user note" },
    armedPrice: {
        type: "number",
        nullable: true,
        description: "Market price when the alert was created",
    },
    triggeredPrice: {
        type: "number",
        nullable: true,
        description: "Price that fired the alert",
    },
    triggeredAt: { type: "string", nullable: true, format: "date-time" },
    expiresAt: { type: "string", nullable: true, format: "date-time" },
    createdAt: { type: "string", format: "date-time" },
};
function toHttpError(error) {
    if (error instanceof rules_1.InvalidAlertError) {
        return (0, error_1.createError)({ statusCode: 400, message: error.message });
    }
    return error;
}
function serializeAlert(row) {
    var _a, _b, _c, _d, _e, _f;
    const plain = typeof (row === null || row === void 0 ? void 0 : row.get) === "function" ? row.get({ plain: true }) : row;
    return {
        id: plain.id,
        symbol: plain.symbol,
        type: plain.type,
        condition: plain.condition,
        targetPrice: plain.targetPrice,
        status: plain.status,
        isRepeating: plain.isRepeating,
        note: (_a = plain.note) !== null && _a !== void 0 ? _a : null,
        armedPrice: (_b = plain.armedPrice) !== null && _b !== void 0 ? _b : null,
        triggeredPrice: (_c = plain.triggeredPrice) !== null && _c !== void 0 ? _c : null,
        triggeredAt: (_d = plain.triggeredAt) !== null && _d !== void 0 ? _d : null,
        expiresAt: (_e = plain.expiresAt) !== null && _e !== void 0 ? _e : null,
        createdAt: (_f = plain.createdAt) !== null && _f !== void 0 ? _f : null,
    };
}
