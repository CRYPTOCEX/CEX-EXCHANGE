"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TimingGenerator = void 0;
class TimingGenerator {
    constructor(baseDelayMs = 1000, maxDelayMs = 10000) {
        this.lastActionTime = 0;
        this.actionsInBurst = 0;
        this.burstStartTime = 0;
        this.sessionStartTime = Date.now();
        this.burstThreshold = 5;
        this.burstCooldownMs = 30000;
        this.fatigueOnsetMs = 3600000;
        this.baseDelayMs = baseDelayMs;
        this.maxDelayMs = maxDelayMs;
        this.sessionStartTime = Date.now();
    }
    getNextDelay() {
        const now = Date.now();
        let delay = this.generateGaussianDelay();
        delay *= this.getTimeOfDayModifier();
        delay *= this.getBurstModifier(now);
        delay *= this.getFatigueModifier();
        delay *= 0.8 + Math.random() * 0.4;
        delay = Math.max(this.baseDelayMs, Math.min(this.maxDelayMs, delay));
        this.lastActionTime = now;
        this.updateBurstState(now);
        return Math.floor(delay);
    }
    getDelayForAction(actionType) {
        const baseDelay = this.getNextDelay();
        const actionMultipliers = {
            PLACE_ORDER: 1.0,
            CANCEL_ORDER: 0.5,
            CHECK_MARKET: 0.3,
            MODIFY_ORDER: 1.2,
        };
        return Math.floor(baseDelay * (actionMultipliers[actionType] || 1));
    }
    isGoodTimeToTrade() {
        const hourModifier = this.getTimeOfDayModifier();
        if (hourModifier < 0.3) {
            return Math.random() < 0.1;
        }
        if (this.actionsInBurst >= this.burstThreshold) {
            const timeSinceBurstStart = Date.now() - this.burstStartTime;
            if (timeSinceBurstStart < this.burstCooldownMs) {
                return Math.random() < 0.2;
            }
        }
        return true;
    }
    getActionProbability() {
        const timeSinceLastAction = Date.now() - this.lastActionTime;
        const halfLife = this.baseDelayMs * 2;
        const probability = 1 / (1 + Math.exp(-(timeSinceLastAction - halfLife) / halfLife));
        return probability * this.getTimeOfDayModifier() * (1 / this.getFatigueModifier());
    }
    getThinkingTime(complexity) {
        const baseThinking = {
            SIMPLE: 500,
            NORMAL: 2000,
            COMPLEX: 5000,
        };
        const base = baseThinking[complexity];
        const variation = base * (0.5 + Math.random());
        const distraction = Math.random() < 0.1 ? Math.random() * 3000 : 0;
        return Math.floor(variation + distraction);
    }
    resetSession() {
        this.sessionStartTime = Date.now();
        this.actionsInBurst = 0;
        this.burstStartTime = 0;
    }
    generateGaussianDelay() {
        const u1 = Math.random();
        const u2 = Math.random();
        const z = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
        const mean = this.baseDelayMs * 2;
        const std = this.baseDelayMs;
        return Math.abs(mean + z * std);
    }
    getTimeOfDayModifier() {
        const hour = new Date().getUTCHours();
        const activityPattern = {
            0: 0.3,
            1: 0.2,
            2: 0.2,
            3: 0.2,
            4: 0.3,
            5: 0.4,
            6: 0.5,
            7: 0.6,
            8: 0.7,
            9: 0.8,
            10: 0.9,
            11: 0.9,
            12: 0.8,
            13: 1.0,
            14: 1.0,
            15: 1.0,
            16: 0.9,
            17: 0.8,
            18: 0.7,
            19: 0.6,
            20: 0.5,
            21: 0.4,
            22: 0.4,
            23: 0.3,
        };
        return activityPattern[hour] || 0.5;
    }
    getBurstModifier(now) {
        if (this.actionsInBurst >= this.burstThreshold) {
            const timeSinceBurstStart = now - this.burstStartTime;
            if (timeSinceBurstStart < this.burstCooldownMs) {
                return 3.0 + Math.random() * 2;
            }
            this.actionsInBurst = 0;
        }
        return 1.0;
    }
    updateBurstState(now) {
        const timeSinceLast = now - this.lastActionTime;
        if (timeSinceLast < this.baseDelayMs * 3) {
            if (this.actionsInBurst === 0) {
                this.burstStartTime = now;
            }
            this.actionsInBurst++;
        }
        else {
            this.actionsInBurst = 1;
            this.burstStartTime = now;
        }
    }
    getFatigueModifier() {
        const sessionDuration = Date.now() - this.sessionStartTime;
        if (sessionDuration < this.fatigueOnsetMs) {
            return 1.0;
        }
        const fatigueHours = (sessionDuration - this.fatigueOnsetMs) / 3600000;
        return 1.0 + Math.min(1.0, fatigueHours * 0.33);
    }
    getStats() {
        return {
            sessionDurationMs: Date.now() - this.sessionStartTime,
            actionsInBurst: this.actionsInBurst,
            lastActionAgo: Date.now() - this.lastActionTime,
            currentModifier: this.getTimeOfDayModifier() *
                this.getBurstModifier(Date.now()) *
                this.getFatigueModifier(),
        };
    }
}
exports.TimingGenerator = TimingGenerator;
exports.default = TimingGenerator;
