"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SLA_HOURS = void 0;
exports.slaCutoff = slaCutoff;
exports.SLA_HOURS = {
    transaction: 72,
    withdrawal: 24 * 7,
    deposit: 72,
    transfer: 72,
    kyc: 24 * 7,
    support: 24,
    dispute: 24,
    order: 48,
    approval: 72,
};
function slaCutoff(key, now = Date.now()) {
    return new Date(now - exports.SLA_HOURS[key] * 60 * 60 * 1000);
}
