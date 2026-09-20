"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.rollbackIfActive = rollbackIfActive;
async function rollbackIfActive(transaction) {
    if (!transaction || transaction.finished)
        return;
    await transaction.rollback();
}
