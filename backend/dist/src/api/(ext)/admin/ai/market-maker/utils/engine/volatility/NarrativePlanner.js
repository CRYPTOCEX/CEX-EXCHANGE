"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.NarrativePlanner = exports.PLAN_EPOCH_MS = void 0;
exports.driftBudgetForEdge = driftBudgetForEdge;
exports.intradayVolShape = intradayVolShape;
const DeterministicRandom_1 = require("./DeterministicRandom");
const MINUTE_MS = 60000;
const HOUR_MS = 3600000;
const DAY_MS = 86400000;
exports.PLAN_EPOCH_MS = Date.UTC(2024, 0, 1, 0, 0, 0, 0);
const MAX_CHAPTERS_PER_CAMPAIGN = 24;
const MAX_SWINGS_PER_CHAPTER = 32;
const MAX_SESSIONS_PER_SWING = 48;
const CHAPTER_STRIDE = 64;
const SWING_STRIDE = 64;
const SESSION_STRIDE = 64;
const CAMPAIGN_TEMPLATES = {
    BULL_CYCLE: [
        { phase: "ACCUMULATION", durationWeight: 1.4, driftShare: 0.05, volMultiplier: 0.65, jumpMultiplier: 0.5, jumpSkew: 0.0 },
        { phase: "MARKUP", durationWeight: 1.6, driftShare: 0.45, volMultiplier: 1.15, jumpMultiplier: 1.0, jumpSkew: 0.25 },
        { phase: "ACCUMULATION", durationWeight: 0.7, driftShare: -0.08, volMultiplier: 0.8, jumpMultiplier: 0.7, jumpSkew: -0.1 },
        { phase: "MARKUP", durationWeight: 1.2, driftShare: 0.42, volMultiplier: 1.35, jumpMultiplier: 1.2, jumpSkew: 0.2 },
        { phase: "DISTRIBUTION", durationWeight: 1.0, driftShare: 0.16, volMultiplier: 1.1, jumpMultiplier: 1.1, jumpSkew: -0.2 },
    ],
    BEAR_CYCLE: [
        { phase: "DISTRIBUTION", durationWeight: 1.1, driftShare: -0.06, volMultiplier: 0.95, jumpMultiplier: 0.9, jumpSkew: -0.2 },
        { phase: "MARKDOWN", durationWeight: 1.5, driftShare: -0.44, volMultiplier: 1.5, jumpMultiplier: 1.5, jumpSkew: -0.45 },
        { phase: "DISTRIBUTION", durationWeight: 0.6, driftShare: 0.1, volMultiplier: 1.25, jumpMultiplier: 1.1, jumpSkew: 0.2 },
        { phase: "MARKDOWN", durationWeight: 1.3, driftShare: -0.48, volMultiplier: 1.7, jumpMultiplier: 1.7, jumpSkew: -0.5 },
        { phase: "ACCUMULATION", durationWeight: 1.2, driftShare: -0.02, volMultiplier: 0.9, jumpMultiplier: 0.7, jumpSkew: 0.05 },
    ],
    RANGE_BOUND: [
        { phase: "ACCUMULATION", durationWeight: 1.2, driftShare: 0.14, volMultiplier: 0.75, jumpMultiplier: 0.6, jumpSkew: 0.0 },
        { phase: "MARKUP", durationWeight: 0.9, driftShare: 0.32, volMultiplier: 1.05, jumpMultiplier: 0.9, jumpSkew: 0.1 },
        { phase: "DISTRIBUTION", durationWeight: 1.1, driftShare: -0.12, volMultiplier: 1.0, jumpMultiplier: 0.9, jumpSkew: -0.1 },
        { phase: "MARKDOWN", durationWeight: 0.9, driftShare: -0.34, volMultiplier: 1.2, jumpMultiplier: 1.1, jumpSkew: -0.2 },
    ],
    RECOVERY: [
        { phase: "MARKDOWN", durationWeight: 0.7, driftShare: -0.5, volMultiplier: 1.8, jumpMultiplier: 2.0, jumpSkew: -0.55 },
        { phase: "ACCUMULATION", durationWeight: 1.8, driftShare: 0.06, volMultiplier: 0.7, jumpMultiplier: 0.5, jumpSkew: 0.05 },
        { phase: "MARKUP", durationWeight: 1.5, driftShare: 0.62, volMultiplier: 1.2, jumpMultiplier: 1.0, jumpSkew: 0.25 },
    ],
    BLOW_OFF: [
        { phase: "MARKUP", durationWeight: 1.3, driftShare: 0.35, volMultiplier: 1.1, jumpMultiplier: 0.9, jumpSkew: 0.2 },
        { phase: "MARKUP", durationWeight: 0.8, driftShare: 0.55, volMultiplier: 1.9, jumpMultiplier: 1.8, jumpSkew: 0.4 },
        { phase: "DISTRIBUTION", durationWeight: 0.5, driftShare: -0.08, volMultiplier: 2.0, jumpMultiplier: 1.9, jumpSkew: -0.35 },
        { phase: "MARKDOWN", durationWeight: 1.1, driftShare: -0.52, volMultiplier: 1.75, jumpMultiplier: 1.7, jumpSkew: -0.5 },
    ],
    GRIND: [
        { phase: "ACCUMULATION", durationWeight: 1.6, driftShare: 0.1, volMultiplier: 0.55, jumpMultiplier: 0.35, jumpSkew: 0.0 },
        { phase: "MARKUP", durationWeight: 1.4, driftShare: 0.28, volMultiplier: 0.75, jumpMultiplier: 0.6, jumpSkew: 0.1 },
        { phase: "ACCUMULATION", durationWeight: 1.5, driftShare: -0.06, volMultiplier: 0.6, jumpMultiplier: 0.4, jumpSkew: -0.05 },
        { phase: "DISTRIBUTION", durationWeight: 1.2, driftShare: 0.04, volMultiplier: 0.8, jumpMultiplier: 0.7, jumpSkew: -0.1 },
    ],
};
const NEUTRAL_ARCHETYPE_WEIGHTS = {
    BULL_CYCLE: 0.2,
    BEAR_CYCLE: 0.16,
    RANGE_BOUND: 0.28,
    RECOVERY: 0.12,
    BLOW_OFF: 0.08,
    GRIND: 0.16,
};
const ARCHETYPE_DIRECTION = {
    BULL_CYCLE: 1,
    BEAR_CYCLE: -1,
    RANGE_BOUND: 0,
    RECOVERY: 1,
    BLOW_OFF: 0,
    GRIND: 0.3,
};
const ARCHETYPES = Object.keys(CAMPAIGN_TEMPLATES);
function logUniformRms(a) {
    if (a <= 0)
        return 1;
    return Math.sqrt(Math.sinh(2 * a) / (2 * a));
}
const CAMPAIGN_JITTER = 0.275;
const CHAPTER_JITTER = 0.175;
const SWING_JITTER = 0.225;
const SESSION_JITTER = 0.25;
const CAMPAIGN_JITTER_RMS = logUniformRms(CAMPAIGN_JITTER);
const CHAPTER_JITTER_RMS = logUniformRms(CHAPTER_JITTER);
const SWING_JITTER_RMS = logUniformRms(SWING_JITTER);
const SESSION_JITTER_RMS = logUniformRms(SESSION_JITTER);
const ARCHETYPE_VOL_RMS = {};
const ARCHETYPE_JUMP_MEAN = {};
for (const archetype of ARCHETYPES) {
    const templates = CAMPAIGN_TEMPLATES[archetype];
    let weight = 0;
    let volSquared = 0;
    let jumpSum = 0;
    for (const t of templates) {
        weight += t.durationWeight;
        volSquared += t.durationWeight * t.volMultiplier * t.volMultiplier;
        jumpSum += t.durationWeight * t.jumpMultiplier;
    }
    ARCHETYPE_VOL_RMS[archetype] = Math.sqrt(volSquared / weight);
    ARCHETYPE_JUMP_MEAN[archetype] = jumpSum / weight;
}
const MIN_PLAN_VOL_MULTIPLIER = 0.3;
const MAX_PLAN_VOL_MULTIPLIER = 3.2;
function driftBudgetForEdge(sigmaPerSqrtSecond, maxEdge, coherenceSeconds) {
    if (!(sigmaPerSqrtSecond > 0) || !(coherenceSeconds > 0))
        return 0;
    const PHI_DENSITY_AT_ZERO = 0.3989422804014327;
    return (maxEdge * sigmaPerSqrtSecond) / (PHI_DENSITY_AT_ZERO * Math.sqrt(coherenceSeconds));
}
function intradayVolShape(tMs, phaseOffset) {
    const dayFraction = ((tMs % DAY_MS) + DAY_MS) % DAY_MS / DAY_MS;
    const theta = 2 * Math.PI * dayFraction + phaseOffset;
    const shape = 1.0 + 0.34 * Math.sin(theta - 1.15) + 0.16 * Math.sin(2 * theta - 0.4);
    const weekFraction = ((tMs % (7 * DAY_MS)) + 7 * DAY_MS) % (7 * DAY_MS) / (7 * DAY_MS);
    const weekly = 1.0 + 0.12 * Math.sin(2 * Math.PI * weekFraction + phaseOffset * 0.7);
    return Math.max(0.35, shape * weekly);
}
const INTRADAY_SHAPE_RMS = (() => {
    let sumSquares = 0;
    const samples = 7 * 24 * 60;
    for (let i = 0; i < samples; i++) {
        const v = intradayVolShape(i * MINUTE_MS, 0);
        sumSquares += v * v;
    }
    return Math.sqrt(sumSquares / samples);
})();
class NarrativePlanner {
    constructor(seedHi, seedLo, config) {
        this.campaignStarts = [exports.PLAN_EPOCH_MS];
        this.materialised = new Map();
        this.campaignKey = (0, DeterministicRandom_1.makeStreamKey)(seedHi, seedLo, DeterministicRandom_1.RandomStream.PLAN_CAMPAIGN);
        this.chapterKey = (0, DeterministicRandom_1.makeStreamKey)(seedHi, seedLo, DeterministicRandom_1.RandomStream.PLAN_CHAPTER);
        this.swingKey = (0, DeterministicRandom_1.makeStreamKey)(seedHi, seedLo, DeterministicRandom_1.RandomStream.PLAN_SWING);
        this.sessionKey = (0, DeterministicRandom_1.makeStreamKey)(seedHi, seedLo, DeterministicRandom_1.RandomStream.PLAN_SESSION);
        this.config = config;
        this.phaseOffset = (0, DeterministicRandom_1.uniform)(this.campaignKey, 0) * 2 * Math.PI;
    }
    setConfig(config) {
        const archetypeInputsChanged = config.bias !== this.config.bias || config.biasStrength !== this.config.biasStrength;
        this.config = config;
        if (archetypeInputsChanged) {
            this.materialised.clear();
        }
    }
    getPhaseOffset() {
        return this.phaseOffset;
    }
    campaignDuration(index) {
        const days = (0, DeterministicRandom_1.logNormal)(this.campaignKey, index * 8 + 1, 62, 0.42);
        return Math.min(150 * DAY_MS, Math.max(30 * DAY_MS, days * DAY_MS));
    }
    locateCampaignIndex(tMs) {
        if (tMs <= exports.PLAN_EPOCH_MS)
            return 0;
        while (this.campaignStarts[this.campaignStarts.length - 1] <= tMs) {
            const index = this.campaignStarts.length - 1;
            const next = this.campaignStarts[index] + this.campaignDuration(index);
            this.campaignStarts.push(next);
            if (this.campaignStarts.length > 20000)
                break;
        }
        for (let i = this.campaignStarts.length - 2; i >= 0; i--) {
            if (this.campaignStarts[i] <= tMs)
                return i;
        }
        return 0;
    }
    chooseArchetype(index) {
        const strength = Math.max(0, Math.min(100, this.config.biasStrength)) / 100;
        const direction = this.config.bias === "BULLISH" ? 1 : this.config.bias === "BEARISH" ? -1 : 0;
        const weights = ARCHETYPES.map((a) => {
            const base = NEUTRAL_ARCHETYPE_WEIGHTS[a];
            if (direction === 0 || strength === 0)
                return base;
            const alignment = ARCHETYPE_DIRECTION[a] * direction;
            return base * (1 + alignment * strength * 1.5);
        });
        return ARCHETYPES[(0, DeterministicRandom_1.weightedChoice)(this.campaignKey, index * 8 + 2, weights)];
    }
    materialise(index) {
        var _a;
        const cached = this.materialised.get(index);
        if (cached)
            return cached;
        const startMs = (_a = this.campaignStarts[index]) !== null && _a !== void 0 ? _a : exports.PLAN_EPOCH_MS;
        const durationMs = this.campaignDuration(index);
        const endMs = startMs + durationMs;
        const archetype = this.chooseArchetype(index);
        const template = CAMPAIGN_TEMPLATES[archetype];
        const volScale = Math.exp(((0, DeterministicRandom_1.uniform)(this.campaignKey, index * 8 + 3) - 0.5) * 2 * CAMPAIGN_JITTER) /
            CAMPAIGN_JITTER_RMS;
        const strength = Math.max(0, Math.min(100, this.config.biasStrength)) / 100;
        const biasDirection = this.config.bias === "BULLISH" ? 1 : this.config.bias === "BEARISH" ? -1 : 0;
        const rawBudget = (0, DeterministicRandom_1.uniformRange)(this.campaignKey, index * 8 + 4, -1, 1);
        const driftBudget = Math.max(-1, Math.min(1, rawBudget * (1 - 0.5 * strength) + biasDirection * strength * 0.5));
        const chapterCount = Math.min(template.length, MAX_CHAPTERS_PER_CAMPAIGN);
        const weightTotal = template
            .slice(0, chapterCount)
            .reduce((sum, t) => sum + t.durationWeight, 0);
        const chapters = [];
        let cursor = startMs;
        for (let c = 0; c < chapterCount; c++) {
            const tpl = template[c];
            const counterBase = (index * CHAPTER_STRIDE + c) * 8;
            const jitter = Math.exp(((0, DeterministicRandom_1.uniform)(this.chapterKey, counterBase + 1) - 0.5) * 0.5);
            let chapterMs = (durationMs * tpl.durationWeight * jitter) / weightTotal;
            chapterMs = Math.max(2 * DAY_MS, chapterMs);
            const isLast = c === chapterCount - 1;
            const chapterStart = cursor;
            const chapterEnd = isLast ? endMs : Math.min(endMs, chapterStart + chapterMs);
            if (chapterEnd <= chapterStart)
                continue;
            const chapterVol = (tpl.volMultiplier / ARCHETYPE_VOL_RMS[archetype]) *
                (Math.exp(((0, DeterministicRandom_1.uniform)(this.chapterKey, counterBase + 2) - 0.5) * 2 * CHAPTER_JITTER) /
                    CHAPTER_JITTER_RMS);
            const chapter = {
                startMs: chapterStart,
                endMs: chapterEnd,
                phase: tpl.phase,
                volMultiplier: chapterVol,
                jumpMultiplier: tpl.jumpMultiplier / ARCHETYPE_JUMP_MEAN[archetype],
                jumpSkew: tpl.jumpSkew,
                driftShare: tpl.driftShare * driftBudget,
                swings: this.buildSwings(index, c, chapterStart, chapterEnd, tpl),
            };
            chapters.push(chapter);
            cursor = chapterEnd;
            if (cursor >= endMs)
                break;
        }
        const node = {
            index,
            startMs,
            endMs,
            archetype,
            volScale,
            driftBudget,
            chapters,
        };
        if (this.materialised.size >= NarrativePlanner.MATERIALISED_LIMIT) {
            const oldest = this.materialised.keys().next().value;
            if (oldest !== undefined)
                this.materialised.delete(oldest);
        }
        this.materialised.set(index, node);
        return node;
    }
    buildSwings(campaignIndex, chapterIndex, startMs, endMs, tpl) {
        const swings = [];
        const chapterDuration = endMs - startMs;
        if (chapterDuration <= 0)
            return swings;
        const baseCounter = (campaignIndex * CHAPTER_STRIDE + chapterIndex) * SWING_STRIDE;
        const chapterDirection = Math.sign(tpl.driftShare) || 1;
        let cursor = startMs;
        let s = 0;
        let alternator = 1;
        while (cursor < endMs && s < MAX_SWINGS_PER_CHAPTER) {
            const counter = (baseCounter + s) * 8;
            let swingMs = (0, DeterministicRandom_1.logNormal)(this.swingKey, counter + 1, 2.0, 0.55) * DAY_MS;
            swingMs = Math.min(6 * DAY_MS, Math.max(6 * HOUR_MS, swingMs));
            const swingStart = cursor;
            let swingEnd = swingStart + swingMs;
            if (swingEnd > endMs - 6 * HOUR_MS)
                swingEnd = endMs;
            const withTrend = alternator > 0;
            const magnitude = withTrend
                ? (0, DeterministicRandom_1.uniformRange)(this.swingKey, counter + 2, 0.6, 1.0)
                : (0, DeterministicRandom_1.uniformRange)(this.swingKey, counter + 3, 0.2, 0.55);
            const direction = withTrend ? chapterDirection : -chapterDirection;
            const volMultiplier = Math.exp(((0, DeterministicRandom_1.uniform)(this.swingKey, counter + 4) - 0.5) * 2 * SWING_JITTER) /
                SWING_JITTER_RMS;
            swings.push({
                startMs: swingStart,
                endMs: swingEnd,
                volMultiplier,
                driftShare: direction * magnitude,
                sessions: this.buildSessions(baseCounter + s, swingStart, swingEnd, direction),
            });
            cursor = swingEnd;
            s++;
            alternator = (0, DeterministicRandom_1.uniform)(this.swingKey, counter + 5) < 0.62 ? 1 : -1;
        }
        return swings;
    }
    buildSessions(swingCounterBase, startMs, endMs, swingDirection) {
        const sessions = [];
        if (endMs <= startMs)
            return sessions;
        const baseCounter = swingCounterBase * SESSION_STRIDE;
        let cursor = startMs;
        let m = 0;
        while (cursor < endMs && m < MAX_SESSIONS_PER_SWING) {
            const counter = (baseCounter + m) * 8;
            let sessionMs = (0, DeterministicRandom_1.logNormal)(this.sessionKey, counter + 1, 3.5, 0.5) * HOUR_MS;
            sessionMs = Math.min(10 * HOUR_MS, Math.max(1 * HOUR_MS, sessionMs));
            const sessionStart = cursor;
            let sessionEnd = sessionStart + sessionMs;
            if (sessionEnd > endMs - 45 * MINUTE_MS)
                sessionEnd = endMs;
            const withSwing = (0, DeterministicRandom_1.uniform)(this.sessionKey, counter + 2) < 0.6;
            const magnitude = (0, DeterministicRandom_1.uniformRange)(this.sessionKey, counter + 3, 0.3, 1.0);
            const volMultiplier = Math.exp(((0, DeterministicRandom_1.uniform)(this.sessionKey, counter + 4) - 0.5) * 2 * SESSION_JITTER) /
                SESSION_JITTER_RMS;
            sessions.push({
                startMs: sessionStart,
                endMs: sessionEnd,
                volMultiplier,
                driftShare: (withSwing ? swingDirection : -swingDirection) * magnitude,
            });
            cursor = sessionEnd;
            m++;
        }
        return sessions;
    }
    getStateAt(tMs) {
        var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m, _o, _p, _q, _r, _s, _t, _u, _v, _w;
        const campaignIndex = this.locateCampaignIndex(tMs);
        const campaign = this.materialise(campaignIndex);
        const chapter = (_b = (_a = campaign.chapters.find((c) => tMs >= c.startMs && tMs < c.endMs)) !== null && _a !== void 0 ? _a : campaign.chapters[campaign.chapters.length - 1]) !== null && _b !== void 0 ? _b : null;
        const swing = (_d = (_c = chapter === null || chapter === void 0 ? void 0 : chapter.swings.find((s) => tMs >= s.startMs && tMs < s.endMs)) !== null && _c !== void 0 ? _c : chapter === null || chapter === void 0 ? void 0 : chapter.swings[chapter.swings.length - 1]) !== null && _d !== void 0 ? _d : null;
        const session = (_f = (_e = swing === null || swing === void 0 ? void 0 : swing.sessions.find((s) => tMs >= s.startMs && tMs < s.endMs)) !== null && _e !== void 0 ? _e : swing === null || swing === void 0 ? void 0 : swing.sessions[swing.sessions.length - 1]) !== null && _f !== void 0 ? _f : null;
        const rawVolMultiplier = campaign.volScale *
            ((_g = chapter === null || chapter === void 0 ? void 0 : chapter.volMultiplier) !== null && _g !== void 0 ? _g : 1) *
            ((_h = swing === null || swing === void 0 ? void 0 : swing.volMultiplier) !== null && _h !== void 0 ? _h : 1) *
            ((_j = session === null || session === void 0 ? void 0 : session.volMultiplier) !== null && _j !== void 0 ? _j : 1) *
            (intradayVolShape(tMs, this.phaseOffset) / INTRADAY_SHAPE_RMS);
        const volMultiplier = Math.min(MAX_PLAN_VOL_MULTIPLIER, Math.max(MIN_PLAN_VOL_MULTIPLIER, rawVolMultiplier));
        const rawDriftShare = ((_k = chapter === null || chapter === void 0 ? void 0 : chapter.driftShare) !== null && _k !== void 0 ? _k : 0) * 0.5 +
            ((_l = swing === null || swing === void 0 ? void 0 : swing.driftShare) !== null && _l !== void 0 ? _l : 0) * 0.3 +
            ((_m = session === null || session === void 0 ? void 0 : session.driftShare) !== null && _m !== void 0 ? _m : 0) * 0.2;
        const forced = this.config.forcedPhase;
        const driftShare = forced ? 0 : Math.max(-1, Math.min(1, rawDriftShare));
        return {
            phase: (_o = forced !== null && forced !== void 0 ? forced : chapter === null || chapter === void 0 ? void 0 : chapter.phase) !== null && _o !== void 0 ? _o : "ACCUMULATION",
            archetype: campaign.archetype,
            volMultiplier,
            jumpMultiplier: (_p = chapter === null || chapter === void 0 ? void 0 : chapter.jumpMultiplier) !== null && _p !== void 0 ? _p : 1,
            jumpSkew: (_q = chapter === null || chapter === void 0 ? void 0 : chapter.jumpSkew) !== null && _q !== void 0 ? _q : 0,
            driftShare,
            campaignStartMs: campaign.startMs,
            campaignEndMs: campaign.endMs,
            chapterStartMs: (_r = chapter === null || chapter === void 0 ? void 0 : chapter.startMs) !== null && _r !== void 0 ? _r : campaign.startMs,
            chapterEndMs: (_s = chapter === null || chapter === void 0 ? void 0 : chapter.endMs) !== null && _s !== void 0 ? _s : campaign.endMs,
            swingStartMs: (_t = swing === null || swing === void 0 ? void 0 : swing.startMs) !== null && _t !== void 0 ? _t : campaign.startMs,
            swingEndMs: (_u = swing === null || swing === void 0 ? void 0 : swing.endMs) !== null && _u !== void 0 ? _u : campaign.endMs,
            sessionStartMs: (_v = session === null || session === void 0 ? void 0 : session.startMs) !== null && _v !== void 0 ? _v : campaign.startMs,
            sessionEndMs: (_w = session === null || session === void 0 ? void 0 : session.endMs) !== null && _w !== void 0 ? _w : campaign.endMs,
        };
    }
    getPlannedPhaseAt(tMs) {
        var _a, _b;
        const campaign = this.materialise(this.locateCampaignIndex(tMs));
        const chapter = (_a = campaign.chapters.find((c) => tMs >= c.startMs && tMs < c.endMs)) !== null && _a !== void 0 ? _a : campaign.chapters[campaign.chapters.length - 1];
        return (_b = chapter === null || chapter === void 0 ? void 0 : chapter.phase) !== null && _b !== void 0 ? _b : "ACCUMULATION";
    }
    getCampaignAt(tMs) {
        return this.materialise(this.locateCampaignIndex(tMs));
    }
    getDriftCoherenceSeconds() {
        return (2 * DAY_MS) / 1000;
    }
}
exports.NarrativePlanner = NarrativePlanner;
NarrativePlanner.MATERIALISED_LIMIT = 4;
exports.default = NarrativePlanner;
