"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.resolveUnsettledFill = resolveUnsettledFill;
exports.readFilledAtCreate = readFilledAtCreate;
exports.resolveSettlementModel = resolveSettlementModel;
function resolveUnsettledFill(params) {
    const orderAmount = toFinite(params.orderAmount);
    const venueFilled = Math.min(Math.max(toFinite(params.venueFilled), 0), orderAmount);
    const settledAtCreate = Math.min(Math.max(toFinite(params.settledAtCreate), 0), orderAmount);
    const newlyFilled = Math.max(venueFilled - settledAtCreate, 0);
    const ratioOfOrder = orderAmount > 0 ? Math.min(newlyFilled / orderAmount, 1) : 0;
    const remaining = Math.max(orderAmount - venueFilled, 0);
    return { newlyFilled, ratioOfOrder, remaining };
}
function readFilledAtCreate(metadata) {
    let meta = metadata;
    if (typeof meta === "string") {
        try {
            meta = JSON.parse(meta);
        }
        catch (_a) {
            return 0;
        }
    }
    if (!meta || typeof meta !== "object")
        return 0;
    if (!meta.partiallyFilledAtCreate)
        return 0;
    const filled = Number(meta.filledAtCreate);
    return Number.isFinite(filled) && filled > 0 ? filled : 0;
}
function toFinite(value) {
    const n = Number(value !== null && value !== void 0 ? value : 0);
    return Number.isFinite(n) ? n : 0;
}
const VENUE_KILL_STATUSES = new Set(["EXPIRED", "REJECTED"]);
function resolveSettlementModel(params) {
    var _a;
    let meta = params.metadata;
    let readable = true;
    if (typeof meta === "string") {
        try {
            meta = JSON.parse(meta);
        }
        catch (_b) {
            readable = false;
        }
    }
    const flag = readable && meta && typeof meta === "object" && typeof meta.holdMode === "boolean"
        ? meta.holdMode
        : null;
    if (flag !== null)
        return flag ? "HOLD" : "NOTHING_RESERVED";
    if (VENUE_KILL_STATUSES.has(String((_a = params.venueStatus) !== null && _a !== void 0 ? _a : "").toUpperCase())) {
        return "NOTHING_RESERVED";
    }
    return toFinite(params.inputInOrder) >= toFinite(params.requiredOnInput) - 1e-12
        ? "HOLD"
        : "LEGACY_DEBIT";
}
