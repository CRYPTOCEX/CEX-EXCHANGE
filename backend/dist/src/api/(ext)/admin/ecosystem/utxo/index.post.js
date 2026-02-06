"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const query_1 = require("@b/utils/query");
const utils_1 = require("./utils");
exports.metadata = {
    summary: "Create ecosystem UTXO",
    operationId: "createEcosystemUtxo",
    tags: ["Admin", "Ecosystem", "UTXO"],
    description: "Creates a new ecosystem Unspent Transaction Output (UTXO) record. A UTXO represents an unspent output from a blockchain transaction that can be used as input for new transactions. Requires wallet ID, transaction ID, output index, amount, script, and operational status.",
    logModule: "ADMIN_ECO",
    logTitle: "Create UTXO",
    requestBody: {
        required: true,
        description: "UTXO data including wallet ID, transaction ID, index, amount, script, and status",
        content: {
            "application/json": {
                schema: utils_1.ecosystemUtxoUpdateSchema,
            },
        },
    },
    responses: (0, query_1.storeRecordResponses)(utils_1.ecosystemUtxoStoreSchema, "Ecosystem UTXO"),
    requiresAuth: true,
    permission: "create.ecosystem.utxo",
};
exports.default = async (data) => {
    const { body, ctx } = data;
    const { walletId, transactionId, index, amount, script, status } = body;
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Creating UTXO record");
    const result = await (0, query_1.storeRecord)({
        model: "ecosystemUtxo",
        data: {
            walletId,
            transactionId,
            index,
            amount,
            script,
            status,
        },
    });
    ctx === null || ctx === void 0 ? void 0 : ctx.success("UTXO created successfully");
    return result;
};
