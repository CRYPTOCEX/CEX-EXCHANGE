"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MAX_BOT_STREAMS = exports.RandomStream = void 0;
exports.fmix32 = fmix32;
exports.makeStreamKey = makeStreamKey;
exports.draw2 = draw2;
exports.uniform = uniform;
exports.gaussianPair = gaussianPair;
exports.gaussian = gaussian;
exports.uniformRange = uniformRange;
exports.uniformInt = uniformInt;
exports.weightedChoice = weightedChoice;
exports.logNormal = logNormal;
exports.paretoMagnitude = paretoMagnitude;
exports.seedFromString = seedFromString;
exports.parseEntropySeed = parseEntropySeed;
exports.ouTransition = ouTransition;
const THREEFRY_ROUNDS = 20;
const ROTATIONS = [13, 15, 26, 6, 17, 29, 16, 24];
const KEY_PARITY = 0x1bd11bda;
const TWO_POW_32 = 4294967296;
function fmix32(h) {
    h = h | 0;
    h ^= h >>> 16;
    h = Math.imul(h, 0x85ebca6b);
    h ^= h >>> 13;
    h = Math.imul(h, 0xc2b2ae35);
    h ^= h >>> 16;
    return h >>> 0;
}
function rotl32(x, n) {
    return ((x << n) | (x >>> (32 - n))) >>> 0;
}
function threefry2x32(k0, k1, c0, c1) {
    const ks0 = k0 >>> 0;
    const ks1 = k1 >>> 0;
    const ks2 = (ks0 ^ ks1 ^ KEY_PARITY) >>> 0;
    const ks = [ks0, ks1, ks2];
    let x0 = (c0 + ks0) >>> 0;
    let x1 = (c1 + ks1) >>> 0;
    for (let i = 0; i < THREEFRY_ROUNDS; i++) {
        x0 = (x0 + x1) >>> 0;
        x1 = rotl32(x1, ROTATIONS[i & 7]);
        x1 = (x1 ^ x0) >>> 0;
        if ((i & 3) === 3) {
            const j = (i >>> 2) + 1;
            x0 = (x0 + ks[j % 3]) >>> 0;
            x1 = (x1 + ks[(j + 1) % 3] + j) >>> 0;
        }
    }
    return [x0 >>> 0, x1 >>> 0];
}
function makeStreamKey(seedHi, seedLo, streamId) {
    return {
        k0: (seedHi ^ fmix32(streamId)) >>> 0,
        k1: (seedLo ^ fmix32((streamId ^ 0x9e3779b9) >>> 0)) >>> 0,
    };
}
var RandomStream;
(function (RandomStream) {
    RandomStream[RandomStream["DIFFUSION"] = 1] = "DIFFUSION";
    RandomStream[RandomStream["VOLATILITY"] = 100] = "VOLATILITY";
    RandomStream[RandomStream["JUMP_ARRIVAL"] = 200] = "JUMP_ARRIVAL";
    RandomStream[RandomStream["JUMP_SIZE"] = 201] = "JUMP_SIZE";
    RandomStream[RandomStream["PLAN_CAMPAIGN"] = 300] = "PLAN_CAMPAIGN";
    RandomStream[RandomStream["PLAN_CHAPTER"] = 301] = "PLAN_CHAPTER";
    RandomStream[RandomStream["PLAN_SWING"] = 302] = "PLAN_SWING";
    RandomStream[RandomStream["PLAN_SESSION"] = 303] = "PLAN_SESSION";
    RandomStream[RandomStream["MICROSTRUCTURE"] = 400] = "MICROSTRUCTURE";
    RandomStream[RandomStream["BOT_CADENCE"] = 500] = "BOT_CADENCE";
    RandomStream[RandomStream["BOT_SIZE"] = 700] = "BOT_SIZE";
    RandomStream[RandomStream["BOT_SELECTION"] = 900] = "BOT_SELECTION";
})(RandomStream || (exports.RandomStream = RandomStream = {}));
exports.MAX_BOT_STREAMS = 200;
function draw2(key, counter) {
    const c0 = counter >>> 0;
    const c1 = Math.floor(counter / TWO_POW_32) >>> 0;
    return threefry2x32(key.k0, key.k1, c0, c1);
}
function uniform(key, counter) {
    const [a] = draw2(key, counter);
    return (a + 0.5) / TWO_POW_32;
}
function gaussianPair(key, counter) {
    const [a, b] = draw2(key, counter);
    const u1 = (a + 0.5) / TWO_POW_32;
    const u2 = (b + 0.5) / TWO_POW_32;
    const radius = Math.sqrt(-2 * Math.log(u1));
    const angle = 2 * Math.PI * u2;
    return [radius * Math.cos(angle), radius * Math.sin(angle)];
}
function gaussian(key, counter) {
    return gaussianPair(key, counter)[0];
}
function uniformRange(key, counter, lo, hi) {
    return lo + uniform(key, counter) * (hi - lo);
}
function uniformInt(key, counter, n) {
    if (n <= 1)
        return 0;
    const v = Math.floor(uniform(key, counter) * n);
    return v >= n ? n - 1 : v;
}
function weightedChoice(key, counter, weights) {
    let total = 0;
    for (let i = 0; i < weights.length; i++) {
        total += Math.max(0, weights[i]);
    }
    if (total <= 0)
        return weights.length - 1;
    const roll = uniform(key, counter) * total;
    let cumulative = 0;
    for (let i = 0; i < weights.length; i++) {
        cumulative += Math.max(0, weights[i]);
        if (roll < cumulative)
            return i;
    }
    return weights.length - 1;
}
function logNormal(key, counter, median, logSigma) {
    return median * Math.exp(gaussian(key, counter) * logSigma);
}
function paretoMagnitude(key, counter, alpha) {
    const u = uniform(key, counter);
    return Math.pow(u, -1 / alpha);
}
function seedFromString(text) {
    let h1 = 0x9e3779b9;
    let h2 = 0x85ebca6b;
    for (let i = 0; i < text.length; i++) {
        const c = text.charCodeAt(i);
        h1 = fmix32((h1 ^ c) >>> 0);
        h2 = fmix32((h2 + Math.imul(c, 0x27d4eb2f)) >>> 0);
    }
    return { hi: h1 >>> 0, lo: h2 >>> 0 };
}
function parseEntropySeed(stored, fallbackText) {
    if (typeof stored === "string" && /^[0-9a-fA-F]{16}$/.test(stored)) {
        return {
            hi: parseInt(stored.slice(0, 8), 16) >>> 0,
            lo: parseInt(stored.slice(8, 16), 16) >>> 0,
        };
    }
    return seedFromString(fallbackText);
}
function ouTransition(current, tauSeconds, stationarySd, elapsedSeconds, noise) {
    if (!(tauSeconds > 0) || !(elapsedSeconds > 0))
        return current;
    const decay = Math.exp(-elapsedSeconds / tauSeconds);
    const diffusionSd = stationarySd * Math.sqrt(Math.max(0, 1 - decay * decay));
    return current * decay + diffusionSd * noise;
}
