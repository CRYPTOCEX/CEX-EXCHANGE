"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.OrderFlow = void 0;
const DeterministicRandom_1 = require("../engine/volatility/DeterministicRandom");
const TimingGenerator_1 = require("./behavior/TimingGenerator");
const SizeGenerator_1 = require("./behavior/SizeGenerator");
const personalities_1 = require("./personalities");
class OrderFlow {
    constructor(seedHi, seedLo) {
        this.cadenceKeys = [];
        this.sizeKeys = [];
        this.timing = new Map();
        this.indexOf = new Map();
        this.seedHi = seedHi;
        this.seedLo = seedLo;
        this.selectionKey = (0, DeterministicRandom_1.makeStreamKey)(seedHi, seedLo, DeterministicRandom_1.RandomStream.BOT_SELECTION);
    }
    setBots(bots, nowMs) {
        for (const bot of bots) {
            if (!this.indexOf.has(bot.id)) {
                const index = this.indexOf.size % DeterministicRandom_1.MAX_BOT_STREAMS;
                this.indexOf.set(bot.id, index);
                this.cadenceKeys[index] = (0, DeterministicRandom_1.makeStreamKey)(this.seedHi, this.seedLo, DeterministicRandom_1.RandomStream.BOT_CADENCE + index);
                this.sizeKeys[index] = (0, DeterministicRandom_1.makeStreamKey)(this.seedHi, this.seedLo, DeterministicRandom_1.RandomStream.BOT_SIZE + index);
            }
            if (!this.timing.has(bot.id)) {
                this.timing.set(bot.id, (0, TimingGenerator_1.newTimingState)(nowMs));
            }
        }
        const live = new Set(bots.map((b) => b.id));
        for (const id of [...this.timing.keys()]) {
            if (!live.has(id))
                this.timing.delete(id);
        }
    }
    decide(bots, ctx) {
        var _a, _b, _c, _d;
        const { nowMs, tickMs } = ctx;
        const eligible = bots.filter((bot) => this.isEligible(bot, nowMs));
        if (eligible.length < 2)
            return null;
        const counter = Math.floor(nowMs / Math.max(1, tickMs));
        let initiator = null;
        for (const bot of eligible) {
            const index = (_a = this.indexOf.get(bot.id)) !== null && _a !== void 0 ? _a : 0;
            const state = (_b = this.timing.get(bot.id)) !== null && _b !== void 0 ? _b : (0, TimingGenerator_1.newTimingState)(nowMs);
            const probability = (0, TimingGenerator_1.cadenceProbability)({
                maxDailyTrades: bot.maxDailyTrades / 2,
                dailyTradeCount: bot.dailyTradeCount / 2,
                tradeFrequency: bot.tradeFrequency,
                aggression: ctx.aggression,
                tickMs,
                nowMs,
            }) * (0, TimingGenerator_1.behaviourMultiplier)(state, nowMs);
            if (probability <= 0)
                continue;
            if ((0, DeterministicRandom_1.uniform)(this.cadenceKeys[index], counter) < probability) {
                initiator = bot;
                break;
            }
        }
        if (!initiator)
            return null;
        const counterparty = this.selectCounterparty(initiator, eligible, counter);
        if (!counterparty)
            return null;
        const [buyBot, sellBot] = this.assignSides(initiator, counterparty, ctx.direction, counter);
        const index = (_c = this.indexOf.get(initiator.id)) !== null && _c !== void 0 ? _c : 0;
        const sizeKey = this.sizeKeys[index];
        const [gaussianDraw] = (0, DeterministicRandom_1.gaussianPair)(sizeKey, counter * 4);
        const keepDraw = (0, DeterministicRandom_1.uniform)(sizeKey, counter * 4 + 1);
        const tailDraw = (0, DeterministicRandom_1.uniform)(sizeKey, counter * 4 + 2);
        const profile = (0, personalities_1.profileFor)(initiator.personality);
        const risk = Number(initiator.riskTolerance);
        const riskScale = Number.isFinite(risk) && risk > 0 && risk <= 1 ? 0.5 + risk : 1;
        const raw = (0, SizeGenerator_1.generateOrderSize)({
            avgOrderSize: initiator.avgOrderSize * profile.sizeScale * riskScale,
            orderSizeVariance: initiator.orderSizeVariance,
            gaussianDraw,
            keepDraw,
            tailDraw,
        });
        const size = (0, SizeGenerator_1.clampOrderSize)(raw, {
            minSize: ctx.minSize,
            maxSize: (_d = ctx.maxSize) !== null && _d !== void 0 ? _d : null,
        });
        if (!(size > 0))
            return null;
        return { buyBot, sellBot, size, initiator };
    }
    onTraded(decision, nowMs) {
        for (const bot of [decision.buyBot, decision.sellBot]) {
            const state = this.timing.get(bot.id);
            if (state)
                this.timing.set(bot.id, (0, TimingGenerator_1.recordTrade)(state, nowMs));
        }
    }
    resetSessions(nowMs) {
        for (const [id, state] of this.timing) {
            this.timing.set(id, { ...state, sessionStartMs: nowMs, burstCount: 0 });
        }
    }
    getTimingState(botId) {
        return this.timing.get(botId);
    }
    isEligible(bot, nowMs) {
        if (bot.status !== "ACTIVE")
            return false;
        if (!(bot.maxDailyTrades > 0))
            return false;
        if (bot.dailyTradeCount >= bot.maxDailyTrades)
            return false;
        if (!(bot.avgOrderSize > 0))
            return false;
        const profile = (0, personalities_1.profileFor)(bot.personality);
        const last = bot.lastTradeAt ? new Date(bot.lastTradeAt).getTime() : 0;
        if (last > 0 && nowMs - last < profile.minIntervalMs)
            return false;
        return true;
    }
    selectCounterparty(initiator, eligible, counter) {
        var _a;
        const others = eligible.filter((b) => b.id !== initiator.id);
        if (others.length === 0)
            return null;
        const pick = (0, DeterministicRandom_1.weightedChoice)(this.selectionKey, counter, others.map(() => 1));
        return (_a = others[pick]) !== null && _a !== void 0 ? _a : null;
    }
    assignSides(a, b, direction, counter) {
        const affinityA = (0, personalities_1.profileFor)(a.personality).buyAffinity;
        const affinityB = (0, personalities_1.profileFor)(b.personality).buyAffinity;
        const total = affinityA + (1 - affinityB);
        const pAbuys = total > 0 ? affinityA / total : 0.5;
        const aBuys = (0, DeterministicRandom_1.uniform)(this.selectionKey, counter * 2 + 1) < pAbuys;
        void direction;
        return aBuys ? [a, b] : [b, a];
    }
}
exports.OrderFlow = OrderFlow;
exports.default = OrderFlow;
