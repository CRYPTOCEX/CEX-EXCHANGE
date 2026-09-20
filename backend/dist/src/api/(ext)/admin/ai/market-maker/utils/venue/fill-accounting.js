"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.applyFill = applyFill;
function finite(value) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
}
function unsigned(value) {
    return value === 0 ? 0 : value;
}
function applyFill(state, fill) {
    const currentPosition = finite(state === null || state === void 0 ? void 0 : state.position);
    const avgEntryPrice = finite(state === null || state === void 0 ? void 0 : state.avgEntryPrice);
    const price = finite(fill === null || fill === void 0 ? void 0 : fill.price);
    const amount = finite(fill === null || fill === void 0 ? void 0 : fill.amount);
    const fee = finite(fill === null || fill === void 0 ? void 0 : fill.fee);
    if (!(amount > 0) || !(price > 0)) {
        return {
            position: unsigned(currentPosition),
            avgEntryPrice: unsigned(avgEntryPrice),
            realizedPnL: unsigned(-fee),
            isProfitable: -fee > 0,
            closedAmount: 0,
        };
    }
    let position = currentPosition;
    let avg = avgEntryPrice;
    let realizedPnL = 0;
    let closedAmount = 0;
    if (fill.side === "BUY") {
        if (currentPosition < 0) {
            closedAmount = Math.min(amount, Math.abs(currentPosition));
            realizedPnL = (avgEntryPrice - price) * closedAmount;
            const opening = amount - closedAmount;
            if (opening > 0) {
                position = opening;
                avg = price;
            }
            else {
                position = currentPosition + amount;
            }
        }
        else {
            const totalCost = currentPosition * avgEntryPrice + amount * price;
            position = currentPosition + amount;
            avg = position > 0 ? totalCost / position : 0;
        }
    }
    else {
        if (currentPosition > 0) {
            closedAmount = Math.min(amount, currentPosition);
            realizedPnL = (price - avgEntryPrice) * closedAmount;
            const opening = amount - closedAmount;
            if (opening > 0) {
                position = -opening;
                avg = price;
            }
            else {
                position = currentPosition - amount;
            }
        }
        else {
            const totalCost = Math.abs(currentPosition) * avgEntryPrice + amount * price;
            position = currentPosition - amount;
            avg = position !== 0 ? totalCost / Math.abs(position) : 0;
        }
    }
    if (position === 0)
        avg = 0;
    realizedPnL -= fee;
    return {
        position: unsigned(position),
        avgEntryPrice: unsigned(avg),
        realizedPnL: unsigned(realizedPnL),
        isProfitable: realizedPnL > 0,
        closedAmount,
    };
}
