"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.INVENTORY_DUST = void 0;
exports.reducesSide = reducesSide;
exports.opensSide = opensSide;
exports.reducibleAmount = reducibleAmount;
exports.openingMargin = openingMargin;
exports.planQuote = planQuote;
exports.planMargin = planMargin;
exports.grossExposure = grossExposure;
exports.withinExposureBudget = withinExposureBudget;
exports.exitsOnly = exitsOnly;
function reducesSide(side) {
    return side === "BUY" ? "SELL" : "BUY";
}
function opensSide(side) {
    return side === "BUY" ? "BUY" : "SELL";
}
exports.INVENTORY_DUST = 1e-12;
function reducibleAmount(side, inventory) {
    const position = side === "SELL" ? Number(inventory === null || inventory === void 0 ? void 0 : inventory.longAmount) : Number(inventory === null || inventory === void 0 ? void 0 : inventory.shortAmount);
    const resting = side === "SELL"
        ? Number(inventory === null || inventory === void 0 ? void 0 : inventory.restingSellExits)
        : Number(inventory === null || inventory === void 0 ? void 0 : inventory.restingBuyExits);
    const held = Number.isFinite(position) && position > 0 ? position : 0;
    const working = Number.isFinite(resting) && resting > 0 ? resting : 0;
    const free = held - working;
    return free > exports.INVENTORY_DUST ? free : 0;
}
function openingMargin(amount, price, leverage) {
    const notional = Math.max(0, Number(amount) || 0) * Math.max(0, Number(price) || 0);
    const lev = Number(leverage);
    const safeLev = Number.isFinite(lev) && lev >= 1 ? lev : 1;
    return notional / safeLev;
}
function planQuote(input) {
    const side = input === null || input === void 0 ? void 0 : input.side;
    const price = Number(input === null || input === void 0 ? void 0 : input.price);
    const amount = Number(input === null || input === void 0 ? void 0 : input.amount);
    const minAmount = Math.max(0, Number(input === null || input === void 0 ? void 0 : input.minAmount) || 0);
    if (side !== "BUY" && side !== "SELL")
        return [];
    if (!Number.isFinite(price) || price <= 0)
        return [];
    if (!Number.isFinite(amount) || amount <= exports.INVENTORY_DUST)
        return [];
    const reducible = reducibleAmount(side, input.inventory);
    const exitAmount = Math.min(amount, reducible);
    const openAmount = amount - exitAmount;
    const legs = [];
    if (exitAmount > exports.INVENTORY_DUST) {
        legs.push({
            side,
            price,
            amount: exitAmount,
            reduceOnly: true,
            margin: 0,
            notional: exitAmount * price,
        });
    }
    if (openAmount > exports.INVENTORY_DUST && openAmount >= minAmount) {
        legs.push({
            side,
            price,
            amount: openAmount,
            reduceOnly: false,
            margin: openingMargin(openAmount, price, input.leverage),
            notional: openAmount * price,
        });
    }
    return legs;
}
function planMargin(legs) {
    let total = 0;
    for (const leg of legs || [])
        total += Number(leg === null || leg === void 0 ? void 0 : leg.margin) || 0;
    return total;
}
function grossExposure(inventory, markPrice) {
    const mark = Number(markPrice);
    if (!Number.isFinite(mark) || mark <= 0)
        return 0;
    const long = Math.max(0, Number(inventory === null || inventory === void 0 ? void 0 : inventory.longAmount) || 0);
    const short = Math.max(0, Number(inventory === null || inventory === void 0 ? void 0 : inventory.shortAmount) || 0);
    return (long + short) * mark;
}
function withinExposureBudget(params) {
    const allocation = Number(params === null || params === void 0 ? void 0 : params.allocation);
    if (!Number.isFinite(allocation) || allocation <= 0)
        return true;
    const current = grossExposure(params.inventory, params.markPrice);
    const pending = Math.max(0, Number(params === null || params === void 0 ? void 0 : params.pendingNotional) || 0);
    const added = Math.max(0, Number(params === null || params === void 0 ? void 0 : params.addedNotional) || 0);
    return current + pending + added <= allocation;
}
function exitsOnly(legs) {
    return (legs || []).filter((leg) => (leg === null || leg === void 0 ? void 0 : leg.reduceOnly) === true);
}
