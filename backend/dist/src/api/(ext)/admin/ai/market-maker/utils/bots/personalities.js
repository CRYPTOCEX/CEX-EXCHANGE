"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PERSONALITY_PROFILES = void 0;
exports.profileFor = profileFor;
exports.PERSONALITY_PROFILES = {
    SCALPER: { buyAffinity: 0.5, sizeScale: 0.6, minIntervalMs: 1000 },
    SWING: { buyAffinity: 0.45, sizeScale: 1.4, minIntervalMs: 12000 },
    ACCUMULATOR: { buyAffinity: 0.7, sizeScale: 1.0, minIntervalMs: 6000 },
    DISTRIBUTOR: { buyAffinity: 0.3, sizeScale: 1.0, minIntervalMs: 6000 },
    MARKET_MAKER: { buyAffinity: 0.5, sizeScale: 0.8, minIntervalMs: 2000 },
};
function profileFor(personality) {
    var _a;
    return ((_a = exports.PERSONALITY_PROFILES[personality]) !== null && _a !== void 0 ? _a : {
        buyAffinity: 0.5,
        sizeScale: 1.0,
        minIntervalMs: 10000,
    });
}
