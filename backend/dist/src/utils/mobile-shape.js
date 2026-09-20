"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isStrippedField = isStrippedField;
exports.stripMobileFigures = stripMobileFigures;
exports.shapeForClient = shapeForClient;
const session_1 = require("@b/utils/session");
const STRIPPED_FIELDS = new Set([
    "apr",
    "apy",
    "annualPercentageRate",
    "annualPercentageYield",
    "interestRate",
    "rewardRate",
    "estimatedApr",
    "estimatedApy",
    "maxLeverage",
    "leverageMax",
    "maxLeverageAllowed",
    "availableLeverage",
    "projectedEarnings",
    "projectedReturn",
    "projectedProfit",
    "estimatedEarnings",
    "estimatedReturn",
    "estimatedProfit",
    "expectedReturn",
    "expectedProfit",
    "roi",
    "roiPercent",
    "potentialReward",
    "grossReward",
    "totalReturn",
    "estimatedReward",
    "projectedReward",
    "backtestResults",
    "backtest",
    "performanceData",
    "historicalPerformance",
    "performanceHistory",
    "dailyReward",
    "monthlyReward",
    "yearlyReward",
    "trailingRewardRateBps",
    "winRate",
    "avgRating",
    "averageRating",
    "purchaseCount",
].map((k) => k.toLowerCase()));
const RATE_WORDS = new Set(["apr", "apy", "roi"]);
function keyWords(key) {
    return key
        .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
        .replace(/[_-]+/g, " ")
        .toLowerCase()
        .split(/\s+/)
        .filter(Boolean);
}
const RATE_WORD_PAIRS = [["win", "rate"]];
function isStrippedField(key) {
    if (STRIPPED_FIELDS.has(key.toLowerCase().replace(/_/g, "")))
        return true;
    const words = keyWords(key);
    if (words.some((word) => RATE_WORDS.has(word)))
        return true;
    return RATE_WORD_PAIRS.some(([first, second]) => words.some((word, i) => word === first && words[i + 1] === second));
}
function stripMobileFigures(payload, depth = 0) {
    if (depth > 12 || payload === null || payload === undefined)
        return payload;
    if (Array.isArray(payload)) {
        return payload.map((item) => stripMobileFigures(item, depth + 1));
    }
    if (typeof payload !== "object" || payload instanceof Date)
        return payload;
    const out = {};
    for (const [key, value] of Object.entries(payload)) {
        if (isStrippedField(key))
            continue;
        out[key] = stripMobileFigures(value, depth + 1);
    }
    return out;
}
function shapeForClient(payload, req) {
    if (!(0, session_1.isNativeAppRequest)(req))
        return payload;
    return stripMobileFigures(payload);
}
