"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const db_1 = require("@b/db");
const query_1 = require("@b/utils/query");
const wallet_1 = require("@b/services/wallet");
exports.metadata = {
    summary: "Bulk deletes AI Investments by IDs",
    operationId: "bulkDeleteAIInvestments",
    tags: ["Admin", "AI Investment"],
    parameters: (0, query_1.commonBulkDeleteParams)("AI Investments"),
    requestBody: {
        required: true,
        content: {
            "application/json": {
                schema: {
                    type: "object",
                    properties: {
                        ids: {
                            type: "array",
                            items: { type: "string" },
                            description: "Array of AI Investment IDs to delete",
                        },
                    },
                    required: ["ids"],
                },
            },
        },
    },
    responses: (0, query_1.commonBulkDeleteResponses)("AI Investments"),
    requiresAuth: true,
    permission: "delete.ai.investment",
    logModule: "ADMIN_AI",
    logTitle: "Bulk delete AI investments",
};
exports.default = async (data) => {
    const { body, query, ctx } = data;
    const { ids } = body;
    const preDelete = async () => {
        ctx === null || ctx === void 0 ? void 0 : ctx.step(`Processing ${ids.length} investment(s) for deletion`);
        for (const id of ids) {
            const transaction = await db_1.models.transaction.findOne({
                where: { referenceId: id },
                include: [{ model: db_1.models.wallet, as: "wallet" }],
            });
            if (!transaction) {
                ctx === null || ctx === void 0 ? void 0 : ctx.warn(`Transaction not found for id: ${id}`);
                continue;
            }
            if (!transaction.wallet) {
                ctx === null || ctx === void 0 ? void 0 : ctx.warn(`Wallet not found for transaction: ${transaction.id}`);
                continue;
            }
            await wallet_1.walletService.credit({
                idempotencyKey: `admin_ai_investment_bulk_delete_refund_${id}`,
                userId: transaction.wallet.userId,
                walletId: transaction.wallet.id,
                walletType: transaction.wallet.type,
                currency: transaction.wallet.currency,
                amount: transaction.amount,
                operationType: "REFUND",
                description: `Refund for deleted AI Investment ${id}`,
            });
        }
        ctx === null || ctx === void 0 ? void 0 : ctx.step("Wallet balances updated");
    };
    const postDelete = async () => {
        ctx === null || ctx === void 0 ? void 0 : ctx.step("Cleaning up transaction records");
        for (const id of ids) {
            await db_1.models.transaction.destroy({
                where: { referenceId: id },
            });
        }
    };
    const result = await (0, query_1.handleBulkDelete)({
        model: "aiInvestment",
        ids,
        query: { ...query, force: true, restore: undefined },
        preDelete,
        postDelete,
    });
    ctx === null || ctx === void 0 ? void 0 : ctx.success(`Deleted ${ids.length} investment(s)`);
    return result;
};
