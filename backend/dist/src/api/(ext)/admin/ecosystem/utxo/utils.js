"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ecosystemUtxoStoreSchema = exports.ecosystemUtxoUpdateSchema = exports.baseEcosystemUtxoSchema = exports.ecosystemUtxoSchema = void 0;
const schema_1 = require("@b/utils/schema");
const id = (0, schema_1.baseStringSchema)("ID of the ecosystem UTXO");
const walletId = (0, schema_1.baseStringSchema)("Wallet ID associated with the UTXO");
const transactionId = (0, schema_1.baseStringSchema)("Transaction ID associated with the UTXO");
const index = (0, schema_1.baseNumberSchema)("Index of the UTXO within the transaction");
const amount = (0, schema_1.baseNumberSchema)("Amount of the UTXO");
const script = (0, schema_1.baseStringSchema)("Script associated with the UTXO");
const status = (0, schema_1.baseBooleanSchema)("Operational status of the UTXO");
exports.ecosystemUtxoSchema = {
    id,
    walletId,
    transactionId,
    index,
    amount,
    script,
    status,
};
exports.baseEcosystemUtxoSchema = {
    id,
    walletId,
    transactionId,
    index,
    amount,
    script,
    status,
};
exports.ecosystemUtxoUpdateSchema = {
    type: "object",
    properties: {
        walletId,
        transactionId,
        index,
        amount,
        script,
        status,
    },
    required: ["walletId", "transactionId", "index", "amount", "script"],
};
exports.ecosystemUtxoStoreSchema = {
    description: `UTXO created or updated successfully`,
    content: {
        "application/json": {
            schema: {
                type: "object",
                properties: exports.ecosystemUtxoSchema,
            },
        },
    },
};
