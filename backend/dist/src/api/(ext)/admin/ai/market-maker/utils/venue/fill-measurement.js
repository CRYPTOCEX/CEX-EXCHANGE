"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.fillsAreMeasured = fillsAreMeasured;
exports.makerFillsAreMeasured = makerFillsAreMeasured;
exports.fillMeasurement = fillMeasurement;
exports.measuredOrNull = measuredOrNull;
const market_resolver_1 = require("./market-resolver");
function fillsAreMeasured(_venue) {
    return true;
}
function makerFillsAreMeasured(maker) {
    return fillsAreMeasured((0, market_resolver_1.normaliseVenue)(maker === null || maker === void 0 ? void 0 : maker.marketType));
}
function fillMeasurement(maker) {
    if (!makerFillsAreMeasured(maker)) {
        return {
            measured: false,
            reason: "This venue does not record per-fill profit and loss, so the figures below are not " +
                "a measurement. The pool's balances, total value locked and unrealised " +
                "mark-to-market are unaffected and remain accurate.",
        };
    }
    return {
        measured: true,
        reason: (0, market_resolver_1.normaliseVenue)(maker === null || maker === void 0 ? void 0 : maker.marketType) === "FUTURES"
            ? "Per-fill profit and loss began being recorded for futures market makers in this " +
                "release. Anything this market traded before then is real but unledgered, so " +
                "figures that predate the ledger's start date are absent rather than zero."
            : null,
    };
}
function measuredOrNull(maker, value) {
    return makerFillsAreMeasured(maker) ? value : null;
}
