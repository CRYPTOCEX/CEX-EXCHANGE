"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const query_1 = require("@b/utils/query");
const db_1 = require("@b/db");
const utils_1 = require("@b/api/finance/transaction/utils");
const emails_1 = require("@b/utils/emails");
const error_1 = require("@b/utils/error");
const utils_2 = require("../../utils");
exports.metadata = {
    summary: "Updates a Forex deposit",
    operationId: "updateForexDeposit",
    tags: ["Admin", "Forex", "Deposit"],
    parameters: [
        {
            index: 0,
            name: "id",
            in: "path",
            description: "The ID of the transaction to update",
            required: true,
            schema: {
                type: "string",
            },
        },
    ],
    requestBody: {
        required: true,
        description: "Updated data for the transaction",
        content: {
            "application/json": {
                schema: utils_1.transactionUpdateSchema,
            },
        },
    },
    responses: (0, query_1.updateRecordResponses)("Transaction"),
    requiresAuth: true,
    permission: "edit.forex.deposit",
    logModule: "ADMIN_FOREX",
    logTitle: "Update forex deposit",
};
exports.default = async (data) => {
    const { body, params, ctx } = data;
    const { id } = params;
    const { status, amount, fee, description, referenceId, metadata: requestMetadata, } = body;
    ctx === null || ctx === void 0 ? void 0 : ctx.step(`Validating forex deposit ${id}`);
    const transaction = await db_1.models.transaction.findOne({
        where: { id },
    });
    if (!transaction) {
        throw (0, error_1.createError)({
            statusCode: 404,
            message: "Transaction not found",
        });
    }
    if (transaction.status !== "PENDING") {
        throw (0, error_1.createError)({
            statusCode: 400,
            message: "Only pending transactions can be updated",
        });
    }
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Updating transaction fields");
    transaction.amount = amount;
    transaction.fee = fee;
    transaction.description = description;
    transaction.referenceId = referenceId;
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Processing deposit status update");
    return await db_1.sequelize.transaction(async (t) => {
        const metadata = (0, utils_2.parseMetadata)(transaction.metadata);
        const cost = Number(transaction.amount) * Number(metadata.price);
        if (transaction.status === "PENDING") {
            const account = await db_1.models.forexAccount.findOne({
                where: { userId: transaction.userId, type: "LIVE" },
                transaction: t,
            });
            if (!account) {
                throw (0, error_1.createError)({
                    statusCode: 404,
                    message: "Forex account not found",
                });
            }
            const wallet = await db_1.models.wallet.findOne({
                where: { id: transaction.walletId },
                transaction: t,
            });
            if (!wallet) {
                throw (0, error_1.createError)({
                    statusCode: 404,
                    message: "Wallet not found",
                });
            }
            if (status === "REJECTED") {
                ctx === null || ctx === void 0 ? void 0 : ctx.step("Refunding to wallet");
                await (0, utils_2.updateWalletBalance)(wallet, cost, true, t, ctx, transaction.id);
            }
            else if (status === "COMPLETED") {
                ctx === null || ctx === void 0 ? void 0 : ctx.step("Updating forex account balance");
                await (0, utils_2.updateForexAccountBalance)(account, cost, true, t, ctx);
            }
            ctx === null || ctx === void 0 ? void 0 : ctx.step("Sending notification email");
            const user = await db_1.models.user.findOne({
                where: { id: transaction.userId },
            });
            if (user) {
                await (0, emails_1.sendForexTransactionEmail)(user, transaction, account, wallet.currency, transaction.type, ctx);
            }
        }
        if (requestMetadata) {
            metadata.message = requestMetadata.message;
        }
        transaction.metadata = JSON.stringify(metadata);
        transaction.status = status;
        ctx === null || ctx === void 0 ? void 0 : ctx.step("Saving transaction");
        await transaction.save({ transaction: t });
        ctx === null || ctx === void 0 ? void 0 : ctx.success("Forex deposit updated successfully");
        return { message: "Transaction updated successfully" };
    });
};
