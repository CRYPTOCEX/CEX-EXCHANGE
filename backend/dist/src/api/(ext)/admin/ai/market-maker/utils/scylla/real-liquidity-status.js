"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.statusAfterFill = statusAfterFill;
function statusAfterFill(remainingAmount) {
    return remainingAmount <= BigInt(0) ? "FILLED" : null;
}
