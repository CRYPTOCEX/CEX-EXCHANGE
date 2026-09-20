"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.roundToHumanSize = roundToHumanSize;
exports.generateOrderSize = generateOrderSize;
exports.clampOrderSize = clampOrderSize;
const ROUND_MANTISSAS = [
    1, 1.5, 2, 2.5, 3, 4, 5, 6, 7, 7.5, 8, 9, 10,
];
const KEEP_EXACT_PROBABILITY = 0.2;
function roundToHumanSize(size, keepDraw) {
    if (!Number.isFinite(size) || size <= 0)
        return size;
    if (keepDraw < KEEP_EXACT_PROBABILITY)
        return size;
    const magnitude = Math.floor(Math.log10(size));
    const base = Math.pow(10, magnitude);
    if (!Number.isFinite(base) || base <= 0)
        return size;
    const normalized = size / base;
    let closest = ROUND_MANTISSAS[0];
    let minDiff = Math.abs(normalized - closest);
    for (const target of ROUND_MANTISSAS) {
        const diff = Math.abs(normalized - target);
        if (diff < minDiff) {
            minDiff = diff;
            closest = target;
        }
    }
    return closest * base;
}
const TAIL_PROBABILITY = 0.04;
const TAIL_MIN = 2.5;
const TAIL_MAX = 6;
function generateOrderSize(input) {
    const { avgOrderSize, orderSizeVariance, gaussianDraw, keepDraw, tailDraw } = input;
    if (!Number.isFinite(avgOrderSize) || avgOrderSize <= 0)
        return 0;
    const sigma = Math.max(0, Math.min(0.5, orderSizeVariance || 0));
    let size = avgOrderSize * Math.exp(sigma * gaussianDraw - (sigma * sigma) / 2);
    if (tailDraw < TAIL_PROBABILITY) {
        const scale = TAIL_MIN + (tailDraw / TAIL_PROBABILITY) * (TAIL_MAX - TAIL_MIN);
        size *= scale;
    }
    return roundToHumanSize(size, keepDraw);
}
function clampOrderSize(size, opts) {
    const ceiling = opts.maxSize != null && Number.isFinite(opts.maxSize)
        ? opts.maxSize
        : null;
    if (ceiling !== null && ceiling < opts.minSize)
        return 0;
    if (!Number.isFinite(size) || size <= 0)
        return opts.minSize;
    let out = size;
    if (ceiling !== null && ceiling > 0) {
        out = Math.min(out, ceiling);
    }
    return Math.max(out, opts.minSize);
}
