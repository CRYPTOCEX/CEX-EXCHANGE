"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UTC_ACTIVITY = void 0;
exports.activityAt = activityAt;
exports.cadenceProbability = cadenceProbability;
exports.newTimingState = newTimingState;
exports.behaviourMultiplier = behaviourMultiplier;
exports.recordTrade = recordTrade;
exports.UTC_ACTIVITY = [
    0.3, 0.2, 0.2, 0.2, 0.3, 0.4,
    0.5, 0.6, 0.7, 0.8, 0.9, 0.9,
    0.8, 1.0, 1.0, 1.0, 0.9, 0.8,
    0.7, 0.6, 0.5, 0.4, 0.4, 0.3,
];
const ACTIVITY_SUM = exports.UTC_ACTIVITY.reduce((a, b) => a + b, 0);
const SECONDS_PER_HOUR = 3600;
const AGGRESSION_UTILISATION = {
    AGGRESSIVE: 1.0,
    MODERATE: 0.6,
    CONSERVATIVE: 0.3,
};
const FREQUENCY_TILT = {
    HIGH: 1.5,
    MEDIUM: 1.0,
    LOW: 0.6,
};
function activityAt(nowMs) {
    var _a;
    const hour = new Date(nowMs).getUTCHours();
    return (_a = exports.UTC_ACTIVITY[hour]) !== null && _a !== void 0 ? _a : 0.5;
}
function cadenceProbability(input) {
    var _a, _b;
    const { maxDailyTrades, dailyTradeCount, tradeFrequency, aggression, tickMs, nowMs, } = input;
    if (!(maxDailyTrades > 0))
        return 0;
    if (dailyTradeCount >= maxDailyTrades)
        return 0;
    if (!(tickMs > 0))
        return 0;
    const utilisation = (_a = AGGRESSION_UTILISATION[aggression]) !== null && _a !== void 0 ? _a : 0.6;
    const tilt = (_b = FREQUENCY_TILT[tradeFrequency]) !== null && _b !== void 0 ? _b : 1.0;
    const dailyTarget = maxDailyTrades * utilisation;
    const perSecond = (dailyTarget * activityAt(nowMs) * tilt) / (SECONDS_PER_HOUR * ACTIVITY_SUM);
    const perTick = perSecond * (tickMs / 1000);
    return Math.max(0, Math.min(1, perTick));
}
function newTimingState(nowMs) {
    return {
        lastTradeMs: 0,
        burstCount: 0,
        burstStartMs: 0,
        sessionStartMs: nowMs,
    };
}
const BURST_THRESHOLD = 5;
const BURST_COOLDOWN_MS = 30000;
const BURST_GAP_MS = 3000;
const FATIGUE_ONSET_MS = 3600000;
function behaviourMultiplier(state, nowMs) {
    let multiplier = 1;
    if (state.burstCount >= BURST_THRESHOLD) {
        const sinceBurst = nowMs - state.burstStartMs;
        if (sinceBurst < BURST_COOLDOWN_MS) {
            multiplier *= 0.25;
        }
    }
    const session = nowMs - state.sessionStartMs;
    if (session > FATIGUE_ONSET_MS) {
        const fatigueHours = (session - FATIGUE_ONSET_MS) / 3600000;
        multiplier *= Math.max(0.5, 1 - Math.min(0.5, fatigueHours * 0.16));
    }
    return multiplier;
}
function recordTrade(state, nowMs) {
    const sinceLast = nowMs - state.lastTradeMs;
    const continuesBurst = state.lastTradeMs > 0 && sinceLast < BURST_GAP_MS;
    const burstExpired = state.burstCount >= BURST_THRESHOLD &&
        nowMs - state.burstStartMs >= BURST_COOLDOWN_MS;
    if (burstExpired || !continuesBurst) {
        return {
            ...state,
            lastTradeMs: nowMs,
            burstCount: 1,
            burstStartMs: nowMs,
        };
    }
    return {
        ...state,
        lastTradeMs: nowMs,
        burstCount: state.burstCount + 1,
        burstStartMs: state.burstCount === 0 ? nowMs : state.burstStartMs,
    };
}
