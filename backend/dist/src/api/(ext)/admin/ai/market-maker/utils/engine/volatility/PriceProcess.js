"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PriceProcess = void 0;
const DeterministicRandom_1 = require("./DeterministicRandom");
const NarrativePlanner_1 = require("./NarrativePlanner");
const SECONDS_PER_DAY = 86400;
const STEP_MS = 1000;
const CATCHUP_SUB_STEP_MS = 60000;
const LONG_GAP_MS = 6 * 3600000;
const MAX_SUB_STEPS = 400;
const OU_TIMESCALES_SECONDS = [
    20 * 60,
    2 * 3600,
    12 * 3600,
    3 * SECONDS_PER_DAY,
    18 * SECONDS_PER_DAY,
    110 * SECONDS_PER_DAY,
    1100 * SECONDS_PER_DAY,
];
const VOL_TIMESCALES_SECONDS = [
    30 * 60,
    4 * 3600,
    2 * SECONDS_PER_DAY,
    12 * SECONDS_PER_DAY,
];
const VOL_FACTOR_SD = [0.25, 0.3, 0.35, 0.3];
const VOL_TOTAL_VARIANCE = VOL_FACTOR_SD.reduce((sum, sd) => sum + sd * sd, 0);
const BASE_JUMPS_PER_DAY = 14;
const JUMP_TAIL_INDEX = 3.4;
const JUMP_VARIANCE_SHARE = 0.14;
const JUMP_SKEW_STRENGTH = 0.35;
const JUMP_CAP_DAILY_VOLS = 0.7;
const CALIBRATION_TRIM = 0.82;
const ACCUMULATOR_TAU_SECONDS = 21 * SECONDS_PER_DAY;
const OFFSET_TAU_SECONDS = 21 * SECONDS_PER_DAY;
const FOLLOW_TAU_AT_FULL_STRENGTH = 1 * SECONDS_PER_DAY;
const FOLLOW_MAX_DAILY_VOLS_PER_DAY = 3;
const LEASH_MAX_DAILY_VOLS_PER_DAY = 6;
const ADEQUATE_RANGE_SIGMAS = 2.5;
class PriceProcess {
    constructor(seedHi, seedLo, config, initialState) {
        var _a, _b;
        var _c, _d, _e, _f, _g, _h, _j;
        this.factorSd = [];
        this.jumpScale = 0;
        this.dailyVolLog = 0;
        this.diffusionKey = (0, DeterministicRandom_1.makeStreamKey)(seedHi, seedLo, DeterministicRandom_1.RandomStream.DIFFUSION);
        this.volKeys = VOL_TIMESCALES_SECONDS.map((_, j) => (0, DeterministicRandom_1.makeStreamKey)(seedHi, seedLo, DeterministicRandom_1.RandomStream.VOLATILITY + j));
        this.jumpArrivalKey = (0, DeterministicRandom_1.makeStreamKey)(seedHi, seedLo, DeterministicRandom_1.RandomStream.JUMP_ARRIVAL);
        this.jumpSizeKey = (0, DeterministicRandom_1.makeStreamKey)(seedHi, seedLo, DeterministicRandom_1.RandomStream.JUMP_SIZE);
        this.config = config;
        this.planner = new NarrativePlanner_1.NarrativePlanner(seedHi, seedLo, {
            bias: config.bias,
            biasStrength: config.biasStrength,
            forcedPhase: (_c = config.forcedPhase) !== null && _c !== void 0 ? _c : null,
        });
        this.calibrate();
        const now = Date.now();
        this.state = {
            factors: ((_a = initialState === null || initialState === void 0 ? void 0 : initialState.factors) === null || _a === void 0 ? void 0 : _a.length) === OU_TIMESCALES_SECONDS.length
                ? [...initialState.factors]
                : new Array(OU_TIMESCALES_SECONDS.length).fill(0),
            offset: (_d = initialState === null || initialState === void 0 ? void 0 : initialState.offset) !== null && _d !== void 0 ? _d : 0,
            accumulator: (_e = initialState === null || initialState === void 0 ? void 0 : initialState.accumulator) !== null && _e !== void 0 ? _e : 0,
            volFactors: ((_b = initialState === null || initialState === void 0 ? void 0 : initialState.volFactors) === null || _b === void 0 ? void 0 : _b.length) === VOL_TIMESCALES_SECONDS.length
                ? [...initialState.volFactors]
                : VOL_FACTOR_SD.map((sd, j) => sd * (0, DeterministicRandom_1.gaussianPair)((0, DeterministicRandom_1.makeStreamKey)(seedHi, seedLo, DeterministicRandom_1.RandomStream.VOLATILITY + j), 0)[1]),
            lastStepMs: (_f = initialState === null || initialState === void 0 ? void 0 : initialState.lastStepMs) !== null && _f !== void 0 ? _f : now,
            steerTargetLog: (_g = initialState === null || initialState === void 0 ? void 0 : initialState.steerTargetLog) !== null && _g !== void 0 ? _g : null,
            steerExpiresAtMs: (_h = initialState === null || initialState === void 0 ? void 0 : initialState.steerExpiresAtMs) !== null && _h !== void 0 ? _h : 0,
            steerHorizonSeconds: (_j = initialState === null || initialState === void 0 ? void 0 : initialState.steerHorizonSeconds) !== null && _j !== void 0 ? _j : 0,
        };
    }
    calibrate() {
        this.dailyVolLog = PriceProcess.dailyVolLogFor(this.config.baseVolatilityPercent, this.config.volatilityMultiplier);
        const dailyVariance = this.dailyVolLog * this.dailyVolLog;
        const diffusionVariance = dailyVariance * (1 - JUMP_VARIANCE_SHARE);
        let shapeSum = 0;
        for (const tau of OU_TIMESCALES_SECONDS) {
            shapeSum += tau * (1 - Math.exp(-SECONDS_PER_DAY / tau));
        }
        const c = diffusionVariance / (2 * shapeSum);
        this.factorSd = OU_TIMESCALES_SECONDS.map((tau) => Math.sqrt(c * tau));
        const secondMoment = JUMP_TAIL_INDEX / (JUMP_TAIL_INDEX - 2);
        this.jumpScale = Math.sqrt(JUMP_VARIANCE_SHARE / (BASE_JUMPS_PER_DAY * secondMoment));
    }
    static dailyVolLogFor(baseVolatilityPercent, volatilityMultiplier) {
        const dailyPercent = Math.max(0.01, baseVolatilityPercent) * Math.max(0.05, volatilityMultiplier);
        return (dailyPercent / 100) * CALIBRATION_TRIM;
    }
    static stationaryLogSdFor(dailyVolLog) {
        const diffusionVariance = dailyVolLog * dailyVolLog * (1 - JUMP_VARIANCE_SHARE);
        let shapeSum = 0;
        let tauSum = 0;
        for (const tau of OU_TIMESCALES_SECONDS) {
            shapeSum += tau * (1 - Math.exp(-SECONDS_PER_DAY / tau));
            tauSum += tau;
        }
        if (!(shapeSum > 0))
            return 0;
        const c = diffusionVariance / (2 * shapeSum);
        return Math.sqrt(c * tauSum);
    }
    static assessRangeAdequacy(params) {
        const { priceRangeLow, priceRangeHigh, anchorPrice } = params;
        const low = priceRangeLow > 0 ? priceRangeLow : anchorPrice * 0.25;
        const high = priceRangeHigh > 0 ? priceRangeHigh : anchorPrice * 4;
        if (!(high > low) || !(low > 0))
            return { sigmas: 0, adequate: false };
        const halfWidth = (Math.log(high) - Math.log(low)) / 2;
        const sd = PriceProcess.stationaryLogSdFor(PriceProcess.dailyVolLogFor(params.baseVolatilityPercent, params.volatilityMultiplier));
        const sigmas = sd > 0 ? halfWidth / sd : Infinity;
        return { sigmas, adequate: sigmas >= ADEQUATE_RANGE_SIGMAS };
    }
    getStationaryLogSd() {
        return PriceProcess.stationaryLogSdFor(this.dailyVolLog);
    }
    setConfig(config) {
        var _a;
        const previousAnchor = this.config.anchorPrice;
        const nextAnchor = config.anchorPrice;
        if (previousAnchor > 0 &&
            nextAnchor > 0 &&
            isFinite(previousAnchor) &&
            isFinite(nextAnchor) &&
            previousAnchor !== nextAnchor) {
            this.state.offset += Math.log(previousAnchor) - Math.log(nextAnchor);
        }
        this.config = config;
        this.calibrate();
        this.planner.setConfig({
            bias: config.bias,
            biasStrength: config.biasStrength,
            forcedPhase: (_a = config.forcedPhase) !== null && _a !== void 0 ? _a : null,
        });
    }
    getConfig() {
        return { ...this.config };
    }
    getState() {
        return {
            factors: [...this.state.factors],
            offset: this.state.offset,
            accumulator: this.state.accumulator,
            volFactors: [...this.state.volFactors],
            lastStepMs: this.state.lastStepMs,
            steerTargetLog: this.state.steerTargetLog,
            steerExpiresAtMs: this.state.steerExpiresAtMs,
            steerHorizonSeconds: this.state.steerHorizonSeconds,
        };
    }
    getPlanner() {
        return this.planner;
    }
    seedAtPrice(price, atMs) {
        if (!(price > 0) || !isFinite(price))
            return;
        const displacement = Math.log(price) - Math.log(this.config.anchorPrice);
        const slowRungs = [3, 4, 5, 6];
        let slowSd = 0;
        for (const k of slowRungs)
            slowSd += this.factorSd[k] * this.factorSd[k];
        slowSd = Math.sqrt(slowSd);
        let absorbed = 0;
        if (slowSd > 0) {
            for (const k of slowRungs) {
                const share = (this.factorSd[k] * this.factorSd[k]) / (slowSd * slowSd);
                const limit = this.factorSd[k] * 3;
                const wanted = displacement * share;
                const applied = Math.max(-limit, Math.min(limit, wanted));
                this.state.factors[k] = applied;
                absorbed += applied;
            }
        }
        this.state.offset = displacement - absorbed - this.state.accumulator;
        this.state.lastStepMs = atMs;
    }
    getLogPrice() {
        return (Math.log(this.config.anchorPrice) +
            this.state.factors.reduce((s, f) => s + f, 0) +
            this.state.offset +
            this.state.accumulator);
    }
    getPrice() {
        return Math.exp(this.getLogPrice());
    }
    instantVol(plan) {
        const logVolSum = this.state.volFactors.reduce((s, v) => s + v, 0);
        const stochastic = Math.exp(logVolSum - VOL_TOTAL_VARIANCE);
        const perSqrtSecond = this.dailyVolLog / Math.sqrt(SECONDS_PER_DAY);
        return perSqrtSecond * stochastic * plan.volMultiplier;
    }
    leashDrift(logPrice) {
        const { priceRangeLow, priceRangeHigh, anchorPrice } = this.config;
        let low = priceRangeLow > 0 ? priceRangeLow : anchorPrice * 0.25;
        let high = priceRangeHigh > 0 ? priceRangeHigh : anchorPrice * 4;
        if (high < low)
            [low, high] = [high, low];
        if (!(high > low) || !isFinite(low) || !isFinite(high)) {
            return { drift: 0, active: false };
        }
        const logLow = Math.log(low);
        const logHigh = Math.log(high);
        const halfWidth = (logHigh - logLow) / 2;
        const centre = (logHigh + logLow) / 2;
        const softEdge = halfWidth * 0.8;
        const excursion = logPrice - centre;
        const overshoot = Math.abs(excursion) - softEdge;
        if (overshoot <= 0)
            return { drift: 0, active: false };
        const normalised = overshoot / Math.max(1e-9, halfWidth * 0.2);
        const strength = Math.min(1, normalised * normalised);
        const maxDrift = (LEASH_MAX_DAILY_VOLS_PER_DAY * this.dailyVolLog) / SECONDS_PER_DAY;
        return { drift: -Math.sign(excursion) * strength * maxDrift, active: true };
    }
    gravityDrift(logPrice) {
        const gravity = this.config.externalGravity;
        if (!gravity)
            return 0;
        const { price, strength } = gravity;
        if (!(price > 0) || !isFinite(price) || !(strength > 0))
            return 0;
        const clampedStrength = Math.min(1, strength);
        const tau = FOLLOW_TAU_AT_FULL_STRENGTH / clampedStrength;
        const divergence = Math.log(price) - logPrice;
        const raw = divergence / tau;
        const cap = (FOLLOW_MAX_DAILY_VOLS_PER_DAY * this.dailyVolLog) / SECONDS_PER_DAY;
        return Math.max(-cap, Math.min(cap, raw));
    }
    getTetherEdgeEstimate(horizonSeconds = 3600) {
        const gravity = this.config.externalGravity;
        if (!gravity || !(gravity.price > 0) || !(gravity.strength > 0))
            return 0;
        const plan = this.planner.getStateAt(this.state.lastStepMs || Date.now());
        const sigma = this.instantVol(plan);
        if (!(sigma > 0))
            return 0;
        const drift = Math.abs(this.gravityDrift(this.getLogPrice()));
        const noise = sigma * Math.sqrt(horizonSeconds);
        if (!(noise > 0))
            return 0;
        const PHI_DENSITY_AT_ZERO = 0.3989422804014327;
        return Math.min(0.5, PHI_DENSITY_AT_ZERO * ((drift * horizonSeconds) / noise));
    }
    getRangeAdequacy() {
        const { priceRangeLow, priceRangeHigh, anchorPrice } = this.config;
        const low = priceRangeLow > 0 ? priceRangeLow : anchorPrice * 0.25;
        const high = priceRangeHigh > 0 ? priceRangeHigh : anchorPrice * 4;
        if (!(high > low))
            return { sigmas: 0, adequate: false };
        const halfWidth = (Math.log(high) - Math.log(low)) / 2;
        const sd = this.getStationaryLogSd();
        const sigmas = sd > 0 ? halfWidth / sd : Infinity;
        return { sigmas, adequate: sigmas >= ADEQUATE_RANGE_SIGMAS };
    }
    setSteering(targetPrice, horizonMs, nowMs = Date.now()) {
        if (!(targetPrice > 0) || !isFinite(targetPrice) || !isFinite(horizonMs)) {
            this.clearSteering();
            return;
        }
        const clamped = Math.max(0, Math.min(horizonMs, 7 * 86400000));
        this.state.steerTargetLog = Math.log(targetPrice);
        if (nowMs >= this.state.steerExpiresAtMs) {
            this.state.steerExpiresAtMs = nowMs + clamped;
            this.state.steerHorizonSeconds = Math.max(60, clamped / 1000);
        }
    }
    clearSteering() {
        this.state.steerTargetLog = null;
        this.state.steerExpiresAtMs = 0;
        this.state.steerHorizonSeconds = 0;
    }
    isSteering(nowMs = Date.now()) {
        return this.state.steerTargetLog !== null && nowMs < this.state.steerExpiresAtMs;
    }
    advanceTo(nowMs) {
        const plan = this.planner.getStateAt(nowMs);
        const startLog = this.getLogPrice();
        let elapsedMs = nowMs - this.state.lastStepMs;
        if (elapsedMs < 0) {
            this.state.lastStepMs = nowMs;
            elapsedMs = 0;
        }
        let jumped = false;
        let jumpSize = 0;
        if (elapsedMs >= STEP_MS) {
            if (elapsedMs > LONG_GAP_MS) {
                this.longGapAdvance(nowMs, elapsedMs / 1000, plan);
            }
            else {
                const result = this.subStepAdvance(nowMs, plan);
                jumped = result.jumped;
                jumpSize = result.jumpSize;
            }
        }
        const endLog = this.getLogPrice();
        return {
            price: Math.exp(endLog),
            logPrice: endLog,
            logReturn: endLog - startLog,
            instantVol: this.instantVol(plan),
            jumped,
            jumpSize,
            plan,
            leashActive: this.leashDrift(endLog).active,
        };
    }
    subStepAdvance(nowMs, plan) {
        let jumped = false;
        let jumpSize = 0;
        let steps = 0;
        while (this.state.lastStepMs + STEP_MS <= nowMs && steps < MAX_SUB_STEPS) {
            const remaining = nowMs - this.state.lastStepMs;
            const stepMs = Math.min(CATCHUP_SUB_STEP_MS, remaining);
            const stepSeconds = stepMs / 1000;
            const stepEndMs = this.state.lastStepMs + stepMs;
            const counter = Math.floor(stepEndMs / STEP_MS);
            const stepPlan = steps === 0 ? plan : this.planner.getStateAt(stepEndMs);
            this.integrateVolatility(counter, stepSeconds);
            const sigma = this.instantVol(stepPlan);
            this.integrateStructure(counter, stepSeconds, sigma, stepPlan, stepEndMs);
            const jump = this.maybeJump(counter, stepSeconds, sigma, stepPlan);
            if (jump !== 0) {
                this.state.offset += jump;
                jumped = true;
                jumpSize += jump;
            }
            this.state.lastStepMs = stepEndMs;
            steps++;
        }
        if (this.state.lastStepMs + STEP_MS <= nowMs) {
            this.state.lastStepMs = nowMs;
        }
        return { jumped, jumpSize };
    }
    integrateVolatility(counter, stepSeconds) {
        for (let j = 0; j < VOL_TIMESCALES_SECONDS.length; j++) {
            const [z] = (0, DeterministicRandom_1.gaussianPair)(this.volKeys[j], counter);
            this.state.volFactors[j] = (0, DeterministicRandom_1.ouTransition)(this.state.volFactors[j], VOL_TIMESCALES_SECONDS[j], VOL_FACTOR_SD[j], stepSeconds, z);
        }
    }
    integrateStructure(counter, stepSeconds, sigma, plan, stepEndMs) {
        const baselineSigma = this.dailyVolLog / Math.sqrt(SECONDS_PER_DAY);
        const volRatio = baselineSigma > 0 ? sigma / baselineSigma : 1;
        for (let k = 0; k < OU_TIMESCALES_SECONDS.length; k++) {
            const pair = (0, DeterministicRandom_1.gaussianPair)(this.diffusionKey, counter * 8 + (k >> 1));
            const z = (k & 1) === 0 ? pair[0] : pair[1];
            this.state.factors[k] = (0, DeterministicRandom_1.ouTransition)(this.state.factors[k], OU_TIMESCALES_SECONDS[k], this.factorSd[k] * volRatio, stepSeconds, z);
        }
        if (this.state.offset !== 0) {
            const budget = (0, NarrativePlanner_1.driftBudgetForEdge)(sigma, this.config.maxDirectionalEdge, this.planner.getDriftCoherenceSeconds());
            const step = Math.min(Math.abs(this.state.offset), budget * stepSeconds);
            this.state.offset -= Math.sign(this.state.offset) * step;
        }
        const coherence = this.planner.getDriftCoherenceSeconds();
        const planBudget = (0, NarrativePlanner_1.driftBudgetForEdge)(sigma, this.config.maxDirectionalEdge, coherence);
        let drift = plan.driftShare * planBudget;
        if (this.state.steerTargetLog !== null) {
            if (stepEndMs < this.state.steerExpiresAtMs) {
                const horizon = Math.max(60, this.state.steerHorizonSeconds);
                const gap = this.state.steerTargetLog - this.getLogPrice();
                const steerBudget = (0, NarrativePlanner_1.driftBudgetForEdge)(sigma, this.config.maxSteeringEdge, horizon);
                const scale = Math.max(1e-12, sigma * Math.sqrt(horizon));
                drift += Math.tanh(gap / scale) * steerBudget;
            }
            else {
                this.clearSteering();
            }
        }
        drift += this.gravityDrift(this.getLogPrice());
        drift += this.leashDrift(this.getLogPrice()).drift;
        this.state.accumulator = (0, DeterministicRandom_1.ouTransition)(this.state.accumulator, ACCUMULATOR_TAU_SECONDS, 0, stepSeconds, 0);
        this.state.accumulator += drift * stepSeconds;
    }
    maybeJump(counter, stepSeconds, sigma, plan) {
        const perDay = BASE_JUMPS_PER_DAY * Math.max(0, plan.jumpMultiplier);
        const probability = (perDay / SECONDS_PER_DAY) * stepSeconds;
        if (probability <= 0)
            return 0;
        if ((0, DeterministicRandom_1.uniform)(this.jumpArrivalKey, counter) >= probability)
            return 0;
        const magnitude = (0, DeterministicRandom_1.paretoMagnitude)(this.jumpSizeKey, counter * 4 + 1, JUMP_TAIL_INDEX);
        const dailyVol = sigma * Math.sqrt(SECONDS_PER_DAY);
        const size = magnitude * dailyVol * this.jumpScale;
        const cap = dailyVol * JUMP_CAP_DAILY_VOLS;
        const skew = Math.max(-1, Math.min(1, plan.jumpSkew)) * JUMP_SKEW_STRENGTH;
        const direction = (0, DeterministicRandom_1.uniform)(this.jumpSizeKey, counter * 4 + 2) < 0.5 ? 1 : -1;
        const upSize = Math.min(size * (1 + skew), cap);
        const downSize = Math.min(size * (1 - skew), cap);
        const value = direction > 0 ? upSize : -downSize;
        const compensation = 0.5 * (upSize - downSize);
        return value - compensation;
    }
    longGapAdvance(nowMs, gapSeconds, plan) {
        const counter = -Math.floor(nowMs / STEP_MS) - 1;
        for (let j = 0; j < VOL_TIMESCALES_SECONDS.length; j++) {
            const [z] = (0, DeterministicRandom_1.gaussianPair)(this.volKeys[j], counter - j);
            this.state.volFactors[j] = (0, DeterministicRandom_1.ouTransition)(this.state.volFactors[j], VOL_TIMESCALES_SECONDS[j], VOL_FACTOR_SD[j], gapSeconds, z);
        }
        const sigma = this.instantVol(plan);
        const baselineSigma = this.dailyVolLog / Math.sqrt(SECONDS_PER_DAY);
        const volRatio = baselineSigma > 0 ? sigma / baselineSigma : 1;
        for (let k = 0; k < OU_TIMESCALES_SECONDS.length; k++) {
            const pair = (0, DeterministicRandom_1.gaussianPair)(this.diffusionKey, counter * 8 - k);
            this.state.factors[k] = (0, DeterministicRandom_1.ouTransition)(this.state.factors[k], OU_TIMESCALES_SECONDS[k], this.factorSd[k] * volRatio, gapSeconds, pair[0]);
        }
        this.state.offset = (0, DeterministicRandom_1.ouTransition)(this.state.offset, OFFSET_TAU_SECONDS, 0, gapSeconds, 0);
        this.state.accumulator = (0, DeterministicRandom_1.ouTransition)(this.state.accumulator, ACCUMULATOR_TAU_SECONDS, 0, gapSeconds, 0);
        this.state.steerTargetLog = null;
        this.state.steerExpiresAtMs = 0;
        this.state.lastStepMs = nowMs;
    }
    getDiagnostics(nowMs = Date.now()) {
        const plan = this.planner.getStateAt(nowMs);
        const sigma = this.instantVol(plan);
        const price = this.getPrice();
        return {
            price,
            anchorPrice: this.config.anchorPrice,
            deviationPercent: (price / this.config.anchorPrice - 1) * 100,
            instantDailyVolPercent: sigma * Math.sqrt(SECONDS_PER_DAY) * 100,
            factors: [...this.state.factors],
            volFactors: [...this.state.volFactors],
            offset: this.state.offset,
            accumulator: this.state.accumulator,
            plan,
            steering: {
                active: this.isSteering(nowMs),
                targetPrice: this.state.steerTargetLog !== null ? Math.exp(this.state.steerTargetLog) : null,
                expiresAtMs: this.state.steerExpiresAtMs,
            },
        };
    }
}
exports.PriceProcess = PriceProcess;
exports.default = PriceProcess;
