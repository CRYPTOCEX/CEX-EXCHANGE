"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.maxRestingRealOrders = maxRestingRealOrders;
function maxRestingRealOrders(config) {
    if (Number.isFinite(config.maxRestingRealOrders) && config.maxRestingRealOrders > 0) {
        return config.maxRestingRealOrders;
    }
    const fromEnv = Number(process.env.AI_MM_MAX_RESTING_REAL_ORDERS);
    return Number.isFinite(fromEnv) && fromEnv > 0 ? fromEnv : 500;
}
