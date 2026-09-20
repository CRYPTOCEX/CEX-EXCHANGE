"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const query_1 = require("@b/utils/query");
const utils_1 = require("../utils");
const db_1 = require("@b/db");
exports.metadata = {
    summary: "Get ecosystem UTXO by ID",
    operationId: "getEcosystemUtxoById",
    tags: ["Admin", "Ecosystem", "UTXO"],
    description: "Retrieves detailed information of a specific ecosystem Unspent Transaction Output (UTXO) by its unique identifier. Returns the UTXO with all details including transaction ID, index, amount, script, status, and associated wallet currency information.",
    logModule: "ADMIN_ECO",
    logTitle: "Get UTXO details",
    parameters: [
        {
            index: 0,
            name: "id",
            in: "path",
            required: true,
            description: "Unique identifier of the ecosystem UTXO to retrieve",
            schema: { type: "string" },
        },
    ],
    responses: {
        200: {
            description: "Successfully retrieved ecosystem UTXO with wallet currency information",
            content: {
                "application/json": {
                    schema: {
                        type: "object",
                        properties: utils_1.baseEcosystemUtxoSchema,
                    },
                },
            },
        },
        401: query_1.unauthorizedResponse,
        404: (0, query_1.notFoundMetadataResponse)("Ecosystem UTXO"),
        500: query_1.serverErrorResponse,
    },
    permission: "view.ecosystem.utxo",
    requiresAuth: true,
    demoMask: ["transactionId", "script"],
};
exports.default = async (data) => {
    const { params, ctx } = data;
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Retrieving UTXO details");
    const utxo = await (0, query_1.getRecord)("ecosystemUtxo", params.id, [
        {
            model: db_1.models.wallet,
            as: "wallet",
            attributes: ["currency"],
        },
    ]);
    ctx === null || ctx === void 0 ? void 0 : ctx.success("UTXO details retrieved");
    return utxo;
};
