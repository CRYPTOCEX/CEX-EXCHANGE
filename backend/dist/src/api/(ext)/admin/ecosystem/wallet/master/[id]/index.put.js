"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const query_1 = require("@b/utils/query");
const utils_1 = require("../utils");
exports.metadata = {
    summary: "Update master wallet",
    description: "Updates the configuration of a specific ecosystem master wallet. Allows modification of chain, currency, address, balance, encrypted data, status, and last index values.",
    operationId: "updateEcosystemMasterWallet",
    tags: ["Admin", "Ecosystem", "Wallet"],
    parameters: [
        {
            index: 0,
            name: "id",
            in: "path",
            description: "ID of the master wallet to update",
            required: true,
            schema: {
                type: "string",
            },
        },
    ],
    requestBody: {
        description: "New data for the master wallet",
        content: {
            "application/json": {
                schema: utils_1.ecosystemMasterWalletUpdateSchema,
            },
        },
    },
    responses: (0, query_1.updateRecordResponses)("Master Wallet"),
    requiresAuth: true,
    permission: "edit.ecosystem.master.wallet",
    logModule: "ADMIN_ECO",
    logTitle: "Update Master Wallet",
};
exports.default = async (data) => {
    const { body, params, ctx } = data;
    const { id } = params;
    const { chain, currency, address, balance, data: walletData, status, lastIndex, } = body;
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Updating Master Wallet");
    const result = await (0, query_1.updateRecord)("ecosystemMasterWallet", id, {
        chain,
        currency,
        address,
        balance,
        data: walletData,
        status,
        lastIndex,
    });
    ctx === null || ctx === void 0 ? void 0 : ctx.success(`Master wallet ${id} updated successfully`);
    return result;
};
