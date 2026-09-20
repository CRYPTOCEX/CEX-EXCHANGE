"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.quotePremium = quotePremium;
function quotePremium(input) {
    const move = Number(input.observedMovePercent);
    const window = Number(input.observationWindowMs);
    const lifetime = Number(input.quoteLifetimeMs);
    const cap = Number(input.maxPremiumFraction);
    const maxFraction = Number.isFinite(cap) && cap > 0 ? cap : 0;
    const none = {
        premiumFraction: 0,
        capBound: false,
        honestFraction: 0,
    };
    if (!Number.isFinite(move) || move <= 0)
        return none;
    if (!Number.isFinite(window) || window <= 0)
        return none;
    if (!Number.isFinite(lifetime) || lifetime <= 0)
        return none;
    const horizonRatio = Math.max(1, lifetime / window);
    const honestFraction = (move / 100) * Math.sqrt(horizonRatio);
    if (!Number.isFinite(honestFraction) || honestFraction <= 0)
        return none;
    return {
        premiumFraction: Math.min(honestFraction, maxFraction),
        capBound: honestFraction > maxFraction,
        honestFraction,
    };
}
