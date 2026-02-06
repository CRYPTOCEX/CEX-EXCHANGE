"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const db_1 = require("@b/db");
const constants_1 = require("@b/utils/constants");
const query_1 = require("@b/utils/query");
const utils_1 = require("./utils");
exports.metadata = {
    summary: "List ecosystem UTXOs",
    operationId: "listEcosystemUtxos",
    tags: ["Admin", "Ecosystem", "UTXO"],
    description: "Retrieves a paginated list of ecosystem Unspent Transaction Outputs (UTXOs). Each UTXO represents an unspent output from a blockchain transaction that can be used as input for new transactions. The response includes associated wallet information.",
    parameters: constants_1.crudParameters,
    logModule: "ADMIN_ECO",
    logTitle: "List UTXOs",
    responses: {
        200: {
            description: "Successfully retrieved list of ecosystem UTXOs with associated wallet currency information",
            content: {
                "application/json": {
                    schema: {
                        type: "object",
                        properties: {
                            items: {
                                type: "array",
                                items: {
                                    type: "object",
                                    properties: utils_1.ecosystemUtxoSchema,
                                },
                            },
                            pagination: constants_1.paginationSchema,
                        },
                    },
                },
            },
        },
        401: query_1.unauthorizedResponse,
        404: (0, query_1.notFoundMetadataResponse)("Ecosystem UTXOs"),
        500: query_1.serverErrorResponse,
    },
    requiresAuth: true,
    permission: "view.ecosystem.utxo",
    demoMask: ["items.transactionId", "items.script"],
};
exports.default = async (data) => {
    const { query, ctx } = data;
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Fetching ecosystem UTXOs");
    const result = await (0, query_1.getFiltered)({
        model: db_1.models.ecosystemUtxo,
        query,
        sortField: query.sortField || "createdAt",
        includeModels: [
            {
                model: db_1.models.wallet,
                as: "wallet",
                attributes: ["currency"],
            },
        ],
    });
    ctx === null || ctx === void 0 ? void 0 : ctx.success("UTXOs retrieved successfully");
    return result;
};
