"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const query_1 = require("@b/utils/query");
const db_1 = require("@b/db");
const utils_1 = require("@b/api/finance/transaction/utils");
const error_1 = require("@b/utils/error");
exports.metadata = {
    summary: "Updates an existing transaction",
    operationId: "updateTransaction",
    tags: ["Admin", "Wallets", "Transactions"],
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
    permission: "edit.transaction",
    logModule: "ADMIN_FIN",
    logTitle: "Update Transaction",
};
const SETTLEMENT_OWNED_BY_ANOTHER_ROUTE = {
    DEPOSIT: "/admin/finance/deposit/log",
    WITHDRAW: "/admin/finance/withdraw/log",
};
function moneyHasMoved(transaction) {
    if (transaction.type === "WITHDRAW")
        return true;
    if (transaction.type === "DEPOSIT")
        return transaction.status !== "PENDING";
    return false;
}
function differs(sent, stored) {
    return sent !== undefined && Number(sent) !== Number(stored !== null && stored !== void 0 ? stored : 0);
}
exports.default = async (data) => {
    const { body, params, ctx } = data;
    const { id } = params;
    const { status, amount, fee, description, referenceId } = body;
    const transaction = await db_1.models.transaction.findOne({
        where: { id },
    });
    if (!transaction)
        throw (0, error_1.createError)({ statusCode: 404, message: "Transaction not found" });
    if (transaction.status !== "PENDING") {
        throw (0, error_1.createError)({ statusCode: 400, message: "Only pending transactions can be updated" });
    }
    const settlementRoute = SETTLEMENT_OWNED_BY_ANOTHER_ROUTE[transaction.type];
    if (settlementRoute && status && status !== "PENDING") {
        ctx === null || ctx === void 0 ? void 0 : ctx.fail(`Refused to settle a ${transaction.type} from the generic transaction route`);
        throw (0, error_1.createError)({
            statusCode: 400,
            message: `A ${transaction.type.toLowerCase()} cannot be approved or rejected here — this screen edits ` +
                `the record but moves no money, and settling it would mark the transaction final while ` +
                `leaving the wallet untouched. Use ${settlementRoute} instead.`,
        });
    }
    if (moneyHasMoved(transaction) && (differs(amount, transaction.amount) || differs(fee, transaction.fee))) {
        ctx === null || ctx === void 0 ? void 0 : ctx.fail(`Refused to edit the amount/fee of a ${transaction.type} whose money has already moved`);
        throw (0, error_1.createError)({
            statusCode: 400,
            message: `The amount and fee of this ${transaction.type.toLowerCase()} cannot be edited: ` +
                (transaction.type === "WITHDRAW"
                    ? `a withdrawal's debit is taken when it is requested, and its rejection refunds the ` +
                        `amount and fee on the row — so changing them here would refund money that was never ` +
                        `debited. `
                    : `its money has already moved, so the row is a record, not an intent. `) +
                `Description and reference can still be edited.`,
        });
    }
    if (amount !== undefined)
        transaction.amount = amount;
    if (fee !== undefined)
        transaction.fee = fee;
    if (description !== undefined)
        transaction.description = description;
    if (referenceId !== undefined)
        transaction.referenceId = referenceId;
    return await db_1.sequelize.transaction(async (t) => {
        if (status !== undefined)
            transaction.status = status;
        await transaction.save({ transaction: t });
        ctx === null || ctx === void 0 ? void 0 : ctx.success("Transaction updated successfully");
        return { message: "Transaction updated successfully" };
    });
};
