"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.REQUOTE_INTERVAL_MS = exports.REQUOTE_MAX_PER_PASS = exports.REQUOTE_MAX_PER_SIDE = exports.REQUOTE_TARGET_PER_SIDE = void 0;
exports.requoteFloorPerSide = requoteFloorPerSide;
exports.realQuoteSize = realQuoteSize;
exports.planRequote = planRequote;
exports.REQUOTE_TARGET_PER_SIDE = 3;
exports.REQUOTE_MAX_PER_SIDE = 20;
function requoteFloorPerSide(config) {
    const raw = config.requoteFloorPerSide;
    if (raw === null || raw === undefined)
        return exports.REQUOTE_TARGET_PER_SIDE;
    const configured = Number(raw);
    if (!Number.isFinite(configured) || configured < 0)
        return exports.REQUOTE_TARGET_PER_SIDE;
    return Math.min(Math.floor(configured), exports.REQUOTE_MAX_PER_SIDE);
}
exports.REQUOTE_MAX_PER_PASS = 2;
exports.REQUOTE_INTERVAL_MS = 30000;
function realQuoteSize(input) {
    const minSize = Number(input.minSize);
    if (!Number.isFinite(minSize) || minSize <= 0)
        return 0;
    const nominalRaw = Number(input.nominal);
    const nominal = Number.isFinite(nominalRaw) && nominalRaw > 0 ? nominalRaw : minSize;
    const percent = Number(input.realLiquidityPercent);
    if (!Number.isFinite(percent) || percent <= 0)
        return 0;
    const whole = input.clamp(nominal, { minSize, maxSize: input.ceiling });
    if (!(whole > 0))
        return 0;
    const real = (whole * Math.min(100, percent)) / 100;
    if (!Number.isFinite(real))
        return 0;
    return real >= minSize ? real : 0;
}
function count(value) {
    if (!Number.isFinite(value) || value <= 0)
        return 0;
    return Math.floor(value);
}
function planRequote(input) {
    const none = { buys: 0, sells: 0 };
    const ceiling = count(input.ceiling);
    const target = count(input.targetPerSide);
    const perPass = count(input.maxPerPass);
    if (ceiling <= 0 || target <= 0 || perPass <= 0)
        return none;
    const headroom = Math.max(0, ceiling - count(input.trackedTotal));
    if (headroom <= 0)
        return none;
    let wantBuys = input.canBuy ? Math.max(0, target - count(input.restingBuys)) : 0;
    let wantSells = input.canSell ? Math.max(0, target - count(input.restingSells)) : 0;
    if (wantBuys <= 0 && wantSells <= 0)
        return none;
    let budget = Math.min(perPass, headroom);
    const plan = { buys: 0, sells: 0 };
    while (budget > 0) {
        const shortBuys = wantBuys - plan.buys;
        const shortSells = wantSells - plan.sells;
        if (shortBuys <= 0 && shortSells <= 0)
            break;
        const takeBuy = shortBuys > shortSells ||
            (shortBuys === shortSells && shortBuys > 0 && plan.buys <= plan.sells);
        if (takeBuy)
            plan.buys++;
        else
            plan.sells++;
        budget--;
    }
    return plan;
}
