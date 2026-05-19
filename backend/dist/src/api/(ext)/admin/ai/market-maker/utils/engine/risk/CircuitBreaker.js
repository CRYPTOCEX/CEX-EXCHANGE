"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CircuitBreaker = void 0;
const console_1 = require("@b/utils/console");
class CircuitBreaker {
    constructor() {
        this.tripped = false;
        this.tripReason = "";
        this.tripTime = null;
        this.cooldownPeriodMs = 30 * 60 * 1000;
        this.tripHistory = [];
    }
    trip(reason) {
        if (this.tripped) {
            return;
        }
        this.tripped = true;
        this.tripReason = reason;
        this.tripTime = new Date();
        this.tripHistory.push({
            reason,
            time: new Date(),
        });
        if (this.tripHistory.length > 10) {
            this.tripHistory = this.tripHistory.slice(-10);
        }
        console_1.logger.error("AI_MM", `Circuit breaker TRIPPED: ${reason}`);
    }
    reset() {
        this.tripped = false;
        this.tripReason = "";
        this.tripTime = null;
        console_1.logger.info("AI_MM", "Circuit breaker reset");
    }
    isTripped() {
        if (this.tripped && this.tripTime) {
            const elapsed = Date.now() - this.tripTime.getTime();
            if (elapsed >= this.cooldownPeriodMs) {
                console_1.logger.info("AI_MM", "Circuit breaker auto-reset after cooldown");
                this.reset();
            }
        }
        return this.tripped;
    }
    getTripReason() {
        return this.tripReason;
    }
    getTripTime() {
        return this.tripTime;
    }
    getRemainingCooldown() {
        if (!this.tripped || !this.tripTime) {
            return 0;
        }
        const elapsed = Date.now() - this.tripTime.getTime();
        const remaining = this.cooldownPeriodMs - elapsed;
        return Math.max(0, remaining);
    }
    setCooldownPeriod(ms) {
        this.cooldownPeriodMs = ms;
    }
    getTripHistory() {
        return [...this.tripHistory];
    }
    getStatus() {
        return {
            tripped: this.tripped,
            reason: this.tripReason,
            tripTime: this.tripTime,
            remainingCooldown: this.getRemainingCooldown(),
        };
    }
}
exports.CircuitBreaker = CircuitBreaker;
exports.default = CircuitBreaker;
