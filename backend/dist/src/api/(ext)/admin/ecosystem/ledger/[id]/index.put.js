"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const query_1 = require("@b/utils/query");
const utils_1 = require("../utils");
exports.metadata = {
    summary: "Update ecosystem private ledger entry",
    operationId: "updateEcosystemPrivateLedger",
    tags: ["Admin", "Ecosystem", "Ledger"],
    description: "Updates a specific ecosystem private ledger entry. Allows modification of the ledger index, currency, blockchain chain, network, and offchain balance difference. The ledger tracks discrepancies between onchain and offchain wallet balances.",
    logModule: "ADMIN_ECO",
    logTitle: "Update private ledger",
    parameters: [
        {
            index: 0,
            name: "id",
            in: "path",
            description: "Unique identifier of the private ledger entry to update",
            required: true,
            schema: {
                type: "string",
            },
        },
    ],
    requestBody: {
        description: "Updated ledger data including index, currency, chain, network, and offchain difference",
        content: {
            "application/json": {
                schema: utils_1.privateLedgerUpdateSchema,
            },
        },
    },
    responses: (0, query_1.updateRecordResponses)("Ecosystem Private Ledger"),
    requiresAuth: true,
    permission: "edit.ecosystem.private.ledger",
};
exports.default = async (data) => {
    const { body, params, ctx } = data;
    const { id } = params;
    const { index, currency, chain, network, offchainDifference } = body;
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Updating private ledger entry");
    const result = await (0, query_1.updateRecord)("ecosystemPrivateLedger", id, {
        index,
        currency,
        chain,
        network,
        offchainDifference,
    });
    ctx === null || ctx === void 0 ? void 0 : ctx.success("Private ledger updated successfully");
    return result;
};
