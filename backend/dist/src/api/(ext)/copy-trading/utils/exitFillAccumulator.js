"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ExitFillAccumulator = void 0;
const MAX_TRACKED_ORDERS = 5000;
const QUANTITY_EPSILON = 1e-9;
class ExitFillAccumulator {
    constructor() {
        this.states = new Map();
    }
    record(orderId, event, expectedAmount) {
        var _a;
        if (event.status === "CANCELLED") {
            this.states.delete(orderId);
            return null;
        }
        const amount = Number(event.filledAmount) || 0;
        const price = Number(event.filledPrice) || 0;
        const prior = (_a = this.states.get(orderId)) !== null && _a !== void 0 ? _a : {
            amount: 0,
            notional: 0,
            fillCount: 0,
            updatedAt: 0,
        };
        const next = {
            amount: prior.amount + amount,
            notional: prior.notional + amount * price,
            fillCount: prior.fillCount + 1,
            updatedAt: Date.now(),
        };
        const expected = Number(expectedAmount) || 0;
        const fullyExited = expected > 0 && next.amount >= expected * (1 - QUANTITY_EPSILON);
        if (event.status !== "FILLED" && !fullyExited) {
            if (!this.states.has(orderId))
                this.evictIfFull();
            this.states.set(orderId, next);
            return null;
        }
        this.states.delete(orderId);
        if (next.amount <= 0)
            return null;
        return {
            totalAmount: next.amount,
            averagePrice: next.notional / next.amount,
            fillCount: next.fillCount,
        };
    }
    forget(orderId) {
        this.states.delete(orderId);
    }
    get size() {
        return this.states.size;
    }
    evictIfFull() {
        if (this.states.size < MAX_TRACKED_ORDERS)
            return;
        let oldestKey = null;
        let oldestAt = Infinity;
        for (const [key, state] of this.states) {
            if (state.updatedAt < oldestAt) {
                oldestAt = state.updatedAt;
                oldestKey = key;
            }
        }
        if (oldestKey !== null)
            this.states.delete(oldestKey);
    }
}
exports.ExitFillAccumulator = ExitFillAccumulator;
