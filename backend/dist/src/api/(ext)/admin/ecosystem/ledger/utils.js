"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.privateLedgerStoreSchema = exports.privateLedgerUpdateSchema = exports.baseEcosystemPrivateLedgerSchema = exports.ecosystemPrivateLedgerSchema = void 0;
const schema_1 = require("@b/utils/schema");
const id = (0, schema_1.baseStringSchema)("ID of the ecosystem private ledger entry");
const walletId = (0, schema_1.baseStringSchema)("Wallet ID associated with the private ledger entry");
const index = (0, schema_1.baseNumberSchema)("Index of the ledger entry");
const currency = (0, schema_1.baseStringSchema)("Currency of the ledger entry", 50);
const chain = (0, schema_1.baseStringSchema)("Blockchain chain associated with the ledger entry", 50);
const network = (0, schema_1.baseStringSchema)("Network where the ledger operates", 50);
const offchainDifference = (0, schema_1.baseNumberSchema)("Offchain balance difference");
exports.ecosystemPrivateLedgerSchema = {
    id,
    walletId,
    index,
    currency,
    chain,
    network,
    offchainDifference,
};
exports.baseEcosystemPrivateLedgerSchema = {
    id,
    walletId,
    index,
    currency,
    chain,
    network,
    offchainDifference,
};
exports.privateLedgerUpdateSchema = {
    type: "object",
    properties: {
        index,
        currency,
        chain,
        network,
        offchainDifference,
    },
    required: ["index", "currency", "chain", "network"],
};
exports.privateLedgerStoreSchema = {
    description: `Private ledger entry created or updated successfully`,
    content: {
        "application/json": {
            schema: {
                type: "object",
                properties: exports.ecosystemPrivateLedgerSchema,
            },
        },
    },
};
