"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.calculateOptimalPayout = calculateOptimalPayout;
exports.calculateBreakEvenRate = calculateBreakEvenRate;
exports.calculatePlatformEdge = calculatePlatformEdge;
exports.getDurationCategory = getDurationCategory;
exports.optimizeRiseFallPayout = optimizeRiseFallPayout;
exports.optimizeBarrierPayout = optimizeBarrierPayout;
exports.generateOptimizedBarrierLevels = generateOptimizedBarrierLevels;
exports.generateOptimizedDuration = generateOptimizedDuration;
exports.generateOptimizedSettings = generateOptimizedSettings;
exports.calculateExpectedPlatformProfit = calculateExpectedPlatformProfit;
exports.analyzePayoutOptimization = analyzePayoutOptimization;
exports.getPayoutSummaryTable = getPayoutSummaryTable;
const PLATFORM_EDGE_BY_DURATION = {
    ULTRA_SHORT: 8,
    SHORT: 7,
    MEDIUM: 9,
    LONG: 10,
};
const ORDER_TYPE_RISK_MULTIPLIER = {
    RISE_FALL: 1.0,
    HIGHER_LOWER: 0.95,
    TOUCH: 1.15,
    NO_TOUCH: 0.85,
    CALL_PUT: 0.92,
    TURBO: 0.90,
};
const BARRIER_WIN_PROBABILITY = {
    0.03: 0.30,
    0.05: 0.35,
    0.1: 0.42,
    0.15: 0.47,
    0.2: 0.52,
    0.3: 0.58,
    0.5: 0.65,
    1.0: 0.75,
    2.0: 0.85,
    5.0: 0.95,
};
function calculateOptimalPayout(breakEvenRate) {
    if (breakEvenRate <= 0.5) {
        return 100;
    }
    if (breakEvenRate >= 1) {
        return 0;
    }
    const payout = (100 / breakEvenRate) - 100;
    return Math.round(payout * 10) / 10;
}
function calculateBreakEvenRate(payoutPercent) {
    return 100 / (100 + payoutPercent);
}
function calculatePlatformEdge(payoutPercent) {
    const breakEvenRate = calculateBreakEvenRate(payoutPercent);
    return (breakEvenRate - 0.5) * 100;
}
function getDurationCategory(minutes) {
    if (minutes <= 1)
        return "ULTRA_SHORT";
    if (minutes <= 5)
        return "SHORT";
    if (minutes <= 30)
        return "MEDIUM";
    return "LONG";
}
function interpolateWinProbability(distancePercent) {
    const distances = Object.keys(BARRIER_WIN_PROBABILITY)
        .map(Number)
        .sort((a, b) => a - b);
    let lower = distances[0];
    let upper = distances[distances.length - 1];
    for (let i = 0; i < distances.length - 1; i++) {
        if (distancePercent >= distances[i] && distancePercent <= distances[i + 1]) {
            lower = distances[i];
            upper = distances[i + 1];
            break;
        }
    }
    if (distancePercent <= lower) {
        return BARRIER_WIN_PROBABILITY[lower];
    }
    if (distancePercent >= upper) {
        return BARRIER_WIN_PROBABILITY[upper];
    }
    const lowerProb = BARRIER_WIN_PROBABILITY[lower];
    const upperProb = BARRIER_WIN_PROBABILITY[upper];
    const ratio = (distancePercent - lower) / (upper - lower);
    return lowerProb + (upperProb - lowerProb) * ratio;
}
function optimizeRiseFallPayout(durationMinutes) {
    const category = getDurationCategory(durationMinutes);
    const platformEdge = PLATFORM_EDGE_BY_DURATION[category];
    const breakEvenRate = (50 + platformEdge) / 100;
    const basePayout = calculateOptimalPayout(breakEvenRate);
    return Math.round(basePayout * ORDER_TYPE_RISK_MULTIPLIER.RISE_FALL);
}
function optimizeBarrierPayout(distancePercent, durationMinutes, orderType, side) {
    const estimatedWinRate = interpolateWinProbability(distancePercent);
    const category = getDurationCategory(durationMinutes);
    const basePlatformEdge = PLATFORM_EDGE_BY_DURATION[category];
    const adjustedBreakEven = Math.max(0.51, estimatedWinRate + (basePlatformEdge / 100));
    let payout = calculateOptimalPayout(adjustedBreakEven);
    if (orderType === "TOUCH_NO_TOUCH") {
        const multiplier = side === "TOUCH"
            ? ORDER_TYPE_RISK_MULTIPLIER.TOUCH
            : ORDER_TYPE_RISK_MULTIPLIER.NO_TOUCH;
        payout *= multiplier;
    }
    else if (orderType === "HIGHER_LOWER") {
        payout *= ORDER_TYPE_RISK_MULTIPLIER.HIGHER_LOWER;
    }
    else if (orderType === "TURBO") {
        payout *= ORDER_TYPE_RISK_MULTIPLIER.TURBO;
    }
    return Math.max(30, Math.min(200, Math.round(payout)));
}
function generateOptimizedBarrierLevels(orderType, durationMinutes = 5) {
    const levels = [];
    const distances = orderType === "TURBO"
        ? [0.03, 0.05, 0.08, 0.1]
        : orderType === "TOUCH_NO_TOUCH"
            ? [0.1, 0.2, 0.3, 0.5]
            : [0.1, 0.2, 0.3, 0.5, 1.0];
    const labels = {
        0.03: "Tight",
        0.05: "Close",
        0.08: "Near",
        0.1: "Near",
        0.2: "Medium",
        0.3: "Standard",
        0.5: "Far",
        1.0: "Very Far",
    };
    distances.forEach((distance, index) => {
        const payout = optimizeBarrierPayout(distance, durationMinutes, orderType);
        levels.push({
            id: `${orderType.toLowerCase()}_${index}`,
            label: `${labels[distance] || "Level"} (${distance}%)`,
            distancePercent: distance,
            profitPercent: payout,
            enabled: true,
        });
    });
    return levels;
}
function generateOptimizedDuration(minutes) {
    const category = getDurationCategory(minutes);
    const platformEdge = PLATFORM_EDGE_BY_DURATION[category];
    const breakEvenRate = (50 + platformEdge) / 100;
    const basePayout = calculateOptimalPayout(breakEvenRate);
    const adjustments = {};
    adjustments["RISE_FALL"] = 0;
    adjustments["HIGHER_LOWER"] = Math.round((ORDER_TYPE_RISK_MULTIPLIER.HIGHER_LOWER - 1) * 100);
    adjustments["TOUCH_NO_TOUCH"] = 0;
    adjustments["CALL_PUT"] = Math.round((ORDER_TYPE_RISK_MULTIPLIER.CALL_PUT - 1) * 100);
    if (minutes <= 5) {
        adjustments["TURBO"] = Math.round((ORDER_TYPE_RISK_MULTIPLIER.TURBO - 1) * 100);
    }
    return {
        id: `duration_${minutes}m`,
        minutes,
        enabled: true,
        orderTypeOverrides: {
            RISE_FALL: { enabled: true, profitAdjustment: adjustments["RISE_FALL"] },
            HIGHER_LOWER: { enabled: true, profitAdjustment: adjustments["HIGHER_LOWER"] },
            TOUCH_NO_TOUCH: { enabled: true, profitAdjustment: adjustments["TOUCH_NO_TOUCH"] },
            CALL_PUT: { enabled: true, profitAdjustment: adjustments["CALL_PUT"] },
            TURBO: { enabled: minutes <= 5, profitAdjustment: adjustments["TURBO"] || 0 },
        },
    };
}
function generateOptimizedSettings() {
    const durationMinutes = [1, 2, 3, 5, 10, 15, 30, 60];
    const durations = durationMinutes.map(generateOptimizedDuration);
    const referenceDuration = 5;
    const riseFallPayout = optimizeRiseFallPayout(referenceDuration);
    return {
        orderTypes: {
            RISE_FALL: {
                enabled: true,
                profitPercentage: riseFallPayout,
                tradingModes: { demo: true, live: true },
            },
            HIGHER_LOWER: {
                enabled: false,
                profitPercentage: Math.round(riseFallPayout * 0.95),
                barrierLevels: generateOptimizedBarrierLevels("HIGHER_LOWER", referenceDuration),
                tradingModes: { demo: true, live: true },
            },
            TOUCH_NO_TOUCH: {
                enabled: false,
                profitPercentage: Math.round(riseFallPayout * 1.1),
                touchProfitMultiplier: 1.15,
                noTouchProfitMultiplier: 0.85,
                barrierLevels: generateOptimizedBarrierLevels("TOUCH_NO_TOUCH", referenceDuration),
                tradingModes: { demo: true, live: true },
            },
            CALL_PUT: {
                enabled: false,
                profitPercentage: Math.round(riseFallPayout * 0.92),
                strikeLevels: [
                    { id: "cp_atm", label: "At The Money (0.1%)", distancePercent: 0.1, profitPercent: 65, enabled: true },
                    { id: "cp_near", label: "Near (0.2%)", distancePercent: 0.2, profitPercent: 58, enabled: true },
                    { id: "cp_far", label: "Far (0.5%)", distancePercent: 0.5, profitPercent: 48, enabled: true },
                ],
                tradingModes: { demo: true, live: true },
            },
            TURBO: {
                enabled: false,
                profitPercentage: Math.round(riseFallPayout * 0.9),
                barrierLevels: generateOptimizedBarrierLevels("TURBO", 1),
                payoutPerPointRange: { min: 0.1, max: 10 },
                maxDuration: 5,
                allowTicksBased: true,
                tradingModes: { demo: true, live: true },
            },
        },
        durations,
    };
}
function calculateExpectedPlatformProfit(settings) {
    var _a, _b;
    const byDuration = {};
    const byOrderType = {};
    for (const duration of settings.durations.filter(d => d.enabled)) {
        const basePayout = settings.orderTypes.RISE_FALL.profitPercentage;
        const adjustment = ((_b = (_a = duration.orderTypeOverrides) === null || _a === void 0 ? void 0 : _a["RISE_FALL"]) === null || _b === void 0 ? void 0 : _b.profitAdjustment) || 0;
        const effectivePayout = basePayout + (basePayout * adjustment / 100);
        byDuration[duration.minutes] = calculatePlatformEdge(effectivePayout);
    }
    for (const [type, config] of Object.entries(settings.orderTypes)) {
        if (config.enabled) {
            byOrderType[type] = calculatePlatformEdge(config.profitPercentage);
        }
    }
    const edges = Object.values(byOrderType).filter(e => !isNaN(e));
    const overallEdge = edges.length > 0
        ? edges.reduce((sum, e) => sum + e, 0) / edges.length
        : 0;
    return { overallEdge, byDuration, byOrderType };
}
function analyzePayoutOptimization(settings) {
    const analysis = [];
    const warnings = [];
    const recommendations = [];
    const profit = calculateExpectedPlatformProfit(settings);
    if (profit.overallEdge < 5) {
        warnings.push(`Low platform edge (${profit.overallEdge.toFixed(1)}%). Consider lowering payouts.`);
    }
    else if (profit.overallEdge > 15) {
        warnings.push(`High platform edge (${profit.overallEdge.toFixed(1)}%). May discourage traders.`);
    }
    else {
        analysis.push(`Healthy platform edge of ${profit.overallEdge.toFixed(1)}%`);
    }
    for (const [type, config] of Object.entries(settings.orderTypes)) {
        if (!config.enabled)
            continue;
        if ("barrierLevels" in config) {
            const barriers = config.barrierLevels || [];
            for (const barrier of barriers) {
                if (barrier.enabled && barrier.distancePercent > 1 && barrier.profitPercent > 60) {
                    warnings.push(`${type}: Barrier "${barrier.label}" has abuse potential (${barrier.distancePercent}% distance with ${barrier.profitPercent}% profit)`);
                    recommendations.push(`Reduce profit for ${type} barrier "${barrier.label}" to below 50%`);
                }
            }
        }
    }
    for (const duration of settings.durations.filter(d => d.enabled)) {
        const category = getDurationCategory(duration.minutes);
        const expectedEdge = PLATFORM_EDGE_BY_DURATION[category];
        const actualEdge = profit.byDuration[duration.minutes] || 0;
        if (actualEdge < expectedEdge - 2) {
            recommendations.push(`${duration.minutes}min: Consider lowering payout (current edge: ${actualEdge.toFixed(1)}%, recommended: ${expectedEdge}%)`);
        }
    }
    if (warnings.length === 0) {
        analysis.push("Settings appear balanced for platform profitability");
    }
    return { analysis, warnings, recommendations };
}
function getPayoutSummaryTable() {
    const rows = [];
    rows.push("| Duration | Category | Platform Edge | Optimal Payout | Break-Even |");
    rows.push("|----------|----------|---------------|----------------|------------|");
    const durations = [1, 2, 5, 10, 30, 60];
    for (const mins of durations) {
        const category = getDurationCategory(mins);
        const edge = PLATFORM_EDGE_BY_DURATION[category];
        const breakEven = 50 + edge;
        const payout = calculateOptimalPayout(breakEven / 100);
        rows.push(`| ${mins}min | ${category} | ${edge}% | ${payout}% | ${breakEven}% |`);
    }
    return rows.join("\n");
}
