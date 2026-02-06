"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
exports.updateWalletBalance = updateWalletBalance;
const emails_1 = require("@b/utils/emails");
const db_1 = require("@b/db");
const query_1 = require("@b/utils/query");
const wallet_1 = require("@b/services/wallet");
const error_1 = require("@b/utils/error");
exports.metadata = {
    summary: "Updates the balance of a wallet",
    operationId: "updateWalletBalance",
    tags: ["Admin", "Wallets"],
    parameters: [
        {
            index: 0,
            name: "id",
            in: "path",
            required: true,
            description: "ID of the wallet to update",
            schema: { type: "string" },
        },
    ],
    requestBody: {
        required: true,
        description: "Data needed to update the wallet balance",
        content: {
            "application/json": {
                schema: {
                    type: "object",
                    properties: {
                        type: {
                            type: "string",
                            description: "Type of balance update (ADD or SUBTRACT)",
                            enum: ["ADD", "SUBTRACT"],
                        },
                        amount: {
                            type: "number",
                            description: "Amount by which to update the wallet balance",
                        },
                    },
                    required: ["id", "type", "amount"],
                },
            },
        },
    },
    responses: (0, query_1.updateRecordResponses)("Wallet"),
    requiresAuth: true,
    permission: "edit.wallet",
    logModule: "ADMIN_FIN",
    logTitle: "Update Wallet Balance",
};
exports.default = async (data) => {
    const { id } = data.params;
    const { type, amount } = data.body;
    const { ctx } = data;
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Updating wallet balance");
    await updateWalletBalance(id, type, amount);
    ctx === null || ctx === void 0 ? void 0 : ctx.success("Wallet balance updated successfully");
    return {
        message: "Wallet balance updated successfully",
    };
};
async function updateWalletBalance(id, type, amount) {
    const wallet = await db_1.models.wallet.findOne({
        where: { id },
    });
    if (!wallet)
        throw (0, error_1.createError)({ statusCode: 404, message: "Wallet not found" });
    const user = await db_1.models.user.findOne({
        where: { id: wallet.userId },
    });
    if (!user)
        throw (0, error_1.createError)({ statusCode: 404, message: "User not found" });
    if (type === "SUBTRACT" && wallet.balance < amount) {
        throw (0, error_1.createError)({ statusCode: 400, message: "Insufficient funds in wallet" });
    }
    const idempotencyKey = `admin_balance_${id}_${type}_${amount}`;
    let result;
    if (type === "ADD") {
        result = await wallet_1.walletService.credit({
            idempotencyKey,
            userId: wallet.userId,
            walletId: wallet.id,
            walletType: wallet.type,
            currency: wallet.currency,
            amount,
            operationType: "ADMIN_ADJUSTMENT",
            description: `Admin added ${amount} ${wallet.currency} to wallet`,
            metadata: {
                method: "ADMIN",
                adjustmentType: "ADD",
            },
        });
    }
    else {
        result = await wallet_1.walletService.debit({
            idempotencyKey,
            userId: wallet.userId,
            walletId: wallet.id,
            walletType: wallet.type,
            currency: wallet.currency,
            amount,
            operationType: "ADMIN_ADJUSTMENT",
            description: `Admin subtracted ${amount} ${wallet.currency} from wallet`,
            metadata: {
                method: "ADMIN",
                adjustmentType: "SUBTRACT",
            },
        });
    }
    const updatedWallet = await db_1.models.wallet.findOne({
        where: { id },
    });
    if (!updatedWallet)
        throw (0, error_1.createError)({ statusCode: 404, message: "Wallet not found" });
    await (0, emails_1.sendWalletBalanceUpdateEmail)(user, updatedWallet, type === "ADD" ? "added" : "subtracted", amount, result.newBalance);
}
