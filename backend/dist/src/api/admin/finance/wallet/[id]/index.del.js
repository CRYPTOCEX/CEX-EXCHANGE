"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const query_1 = require("@b/utils/query");
const db_1 = require("@b/db");
const error_1 = require("@b/utils/error");
exports.metadata = {
    summary: "Deletes a wallet",
    operationId: "deleteWallet",
    tags: ["Admin", "Wallet"],
    parameters: (0, query_1.deleteRecordParams)("wallet"),
    responses: (0, query_1.deleteRecordResponses)("Wallet"),
    requiresAuth: true,
    permission: "delete.wallet",
    logModule: "ADMIN_FIN",
    logTitle: "Delete Wallet",
};
exports.default = async (data) => {
    const { params, query, ctx } = data;
    // pass2 #20 FIX: refuse to delete a wallet that still holds funds. A soft/hard delete here
    // orphans the balance with no reversal. Require the balance to be zeroed first via the
    // audited POST /api/admin/finance/wallet/:id/balance adjustment. (Disabling a wallet is left
    // unguarded on purpose — it is a reversible freeze, not a destructive operation.)
    const existingWallet = await db_1.models.wallet.findByPk(params.id);
    if (existingWallet) {
        const bal = Number(existingWallet.balance) || 0;
        const inOrder = Number(existingWallet.inOrder) || 0;
        if (bal > 0 || inOrder > 0) {
            ctx === null || ctx === void 0 ? void 0 : ctx.fail(`Wallet ${params.id} still holds funds (balance=${bal}, inOrder=${inOrder})`);
            throw (0, error_1.createError)({ statusCode: 400, message: `Cannot delete a wallet with a non-zero balance (balance: ${bal}, inOrder: ${inOrder}). Zero the balance via an audited adjustment first.` });
        }
    }
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Deleting wallet");
    const result = await (0, query_1.handleSingleDelete)({
        model: "wallet",
        id: params.id,
        query,
    });
    ctx === null || ctx === void 0 ? void 0 : ctx.success("Wallet deleted successfully");
    return result;
};
