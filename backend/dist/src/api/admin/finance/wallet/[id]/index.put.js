"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const query_1 = require("@b/utils/query");
const utils_1 = require("../utils");
exports.metadata = {
    summary: "Updates an existing wallet",
    operationId: "updateWallet",
    tags: ["Admin", "Wallets"],
    parameters: [
        {
            index: 0,
            name: "id",
            in: "path",
            description: "The ID of the wallet to update",
            required: true,
            schema: {
                type: "string",
            },
        },
    ],
    requestBody: {
        required: true,
        description: "Updated data for the wallet",
        content: {
            "application/json": {
                schema: utils_1.walletUpdateSchema,
            },
        },
    },
    responses: (0, query_1.updateRecordResponses)("Wallet"),
    requiresAuth: true,
    permission: "edit.wallet",
    logModule: "ADMIN_FIN",
    logTitle: "Update Wallet",
};
exports.default = async (data) => {
    const { body, params, ctx } = data;
    const { id } = params;
    const { type, currency, balance, inOrder, status } = body;
    const updateData = {};
    if (type !== undefined)
        updateData.type = type;
    if (currency !== undefined)
        updateData.currency = currency;
    if (balance !== undefined)
        updateData.balance = balance;
    if (inOrder !== undefined)
        updateData.inOrder = inOrder;
    if (status !== undefined)
        updateData.status = status;
    const result = await (0, query_1.updateRecord)("wallet", id, updateData);
    ctx === null || ctx === void 0 ? void 0 : ctx.success("Wallet updated successfully");
    return result;
};
