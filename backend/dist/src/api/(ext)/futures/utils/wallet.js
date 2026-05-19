"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getUserWalletByCurrency = getUserWalletByCurrency;
const console_1 = require("@b/utils/console");
const db_1 = require("@b/db");
const error_1 = require("@b/utils/error");
async function getUserWalletByCurrency(userId, currency) {
    try {
        const wallet = await db_1.models.wallet.findOne({
            where: {
                userId,
                currency,
                type: "FUTURES",
            },
        });
        if (!wallet) {
            throw (0, error_1.createError)({
                statusCode: 404,
                message: `Wallet not found for user ${userId} and currency ${currency}`
            });
        }
        return wallet;
    }
    catch (error) {
        console_1.logger.error("FUTURES", "Failed to get user wallet", error);
        throw error;
    }
}
