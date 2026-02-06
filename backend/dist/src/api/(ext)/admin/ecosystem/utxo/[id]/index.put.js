"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const query_1 = require("@b/utils/query");
const utils_1 = require("../utils");
exports.metadata = {
    summary: "Update ecosystem UTXO",
    operationId: "updateEcosystemUtxo",
    tags: ["Admin", "Ecosystem", "UTXO"],
    description: "Updates a specific ecosystem Unspent Transaction Output (UTXO). Allows modification of wallet association, transaction ID, output index, amount, script, and operational status. Used to maintain accurate UTXO records for blockchain transaction management.",
    logModule: "ADMIN_ECO",
    logTitle: "Update UTXO",
    parameters: [
        {
            index: 0,
            name: "id",
            in: "path",
            description: "Unique identifier of the UTXO to update",
            required: true,
            schema: {
                type: "string",
            },
        },
    ],
    requestBody: {
        description: "Updated UTXO data including wallet ID, transaction ID, index, amount, script, and status",
        content: {
            "application/json": {
                schema: utils_1.ecosystemUtxoUpdateSchema,
            },
        },
    },
    responses: (0, query_1.updateRecordResponses)("Ecosystem UTXO"),
    requiresAuth: true,
    permission: "edit.ecosystem.utxo",
};
exports.default = async (data) => {
    const { body, params, ctx } = data;
    const { id } = params;
    const { walletId, transactionId, index, amount, script, status } = body;
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Updating UTXO record");
    const result = await (0, query_1.updateRecord)("ecosystemUtxo", id, {
        walletId,
        transactionId,
        index,
        amount,
        script,
        status,
    });
    ctx === null || ctx === void 0 ? void 0 : ctx.success("UTXO updated successfully");
    return result;
};
