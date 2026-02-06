"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ecosystemCustodialWalletStoreSchema = exports.ecosystemCustodialWalletUpdateSchema = exports.baseEcosystemCustodialWalletSchema = exports.ecosystemCustodialWalletSchema = void 0;
const schema_1 = require("@b/utils/schema");
const id = (0, schema_1.baseStringSchema)("ID of the ecosystem custodial wallet");
const masterWalletId = (0, schema_1.baseStringSchema)("Master wallet ID associated with the custodial wallet");
const address = (0, schema_1.baseStringSchema)("Address of the custodial wallet", 255);
const chain = (0, schema_1.baseStringSchema)("Blockchain chain associated with the custodial wallet", 255);
const network = (0, schema_1.baseStringSchema)("Network associated with the custodial wallet", 255);
const status = (0, schema_1.baseEnumSchema)("Status of the custodial wallet", [
    "ACTIVE",
    "INACTIVE",
    "SUSPENDED",
]);
exports.ecosystemCustodialWalletSchema = {
    id,
    masterWalletId,
    address,
    chain,
    network,
    status,
};
exports.baseEcosystemCustodialWalletSchema = {
    masterWalletId,
};
exports.ecosystemCustodialWalletUpdateSchema = {
    type: "object",
    properties: {
        status,
    },
    required: ["status"],
};
exports.ecosystemCustodialWalletStoreSchema = {
    description: `Ecosystem custodial wallet created or updated successfully`,
    content: {
        "application/json": {
            schema: {
                type: "object",
                properties: exports.baseEcosystemCustodialWalletSchema,
            },
        },
    },
};
