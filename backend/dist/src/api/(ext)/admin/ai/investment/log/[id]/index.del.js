"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const db_1 = require("@b/db");
const query_1 = require("@b/utils/query");
const wallet_1 = require("@b/services/wallet");
exports.metadata = {
    summary: "Deletes a specific AI Investment",
    operationId: "deleteAIInvestment",
    tags: ["Admin", "AI Investment"],
    parameters: (0, query_1.deleteRecordParams)("AI Investment"),
    responses: (0, query_1.deleteRecordResponses)("AI Investment"),
    permission: "delete.ai.investment",
    requiresAuth: true,
    logModule: "ADMIN_AI",
    logTitle: "Delete AI investment",
};
exports.default = async (data) => {
    const { params, query, ctx } = data;
    const externalData = {};
    const preDelete = async () => {
        ctx === null || ctx === void 0 ? void 0 : ctx.step("Processing wallet refund");
        const transaction = await db_1.models.transaction.findOne({
            where: { referenceId: params.id },
            include: [{ model: db_1.models.wallet, as: "wallet" }],
        });
        if (!transaction) {
            ctx === null || ctx === void 0 ? void 0 : ctx.warn(`Transaction not found for id: ${params.id}`);
            return;
        }
        if (!transaction.wallet) {
            ctx === null || ctx === void 0 ? void 0 : ctx.warn(`Wallet not found for transaction: ${transaction.id}`);
            return;
        }
        await wallet_1.walletService.credit({
            idempotencyKey: `admin_ai_investment_delete_refund_${params.id}`,
            userId: transaction.wallet.userId,
            walletId: transaction.wallet.id,
            walletType: transaction.wallet.type,
            currency: transaction.wallet.currency,
            amount: transaction.amount,
            operationType: "REFUND",
            description: `Refund for deleted AI Investment ${params.id}`,
        });
        externalData.transactionId = transaction.id;
        ctx === null || ctx === void 0 ? void 0 : ctx.step("Wallet refunded");
    };
    const postDelete = async () => {
        if (externalData.transactionId) {
            ctx === null || ctx === void 0 ? void 0 : ctx.step("Cleaning up transaction record");
            await db_1.models.transaction.destroy({
                where: { id: externalData.transactionId },
            });
        }
    };
    ctx === null || ctx === void 0 ? void 0 : ctx.step(`Deleting investment ${params.id}`);
    const result = await (0, query_1.handleSingleDelete)({
        model: "aiInvestment",
        id: params.id,
        query: { ...query, force: "true", restore: undefined },
        preDelete,
        postDelete,
    });
    ctx === null || ctx === void 0 ? void 0 : ctx.success("Investment deleted successfully");
    return result;
};
