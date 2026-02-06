"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const query_1 = require("@b/utils/query");
const utils_1 = require("../utils");
const db_1 = require("@b/db");
exports.metadata = {
    summary: "Get ecosystem private ledger entry by ID",
    operationId: "getEcosystemPrivateLedgerById",
    tags: ["Admin", "Ecosystem", "Ledger"],
    description: "Retrieves detailed information of a specific ecosystem private ledger entry by its unique identifier. Returns the ledger entry with associated wallet information including currency, address, and balance.",
    logModule: "ADMIN_ECO",
    logTitle: "Get private ledger details",
    parameters: [
        {
            index: 0,
            name: "id",
            in: "path",
            required: true,
            description: "Unique identifier of the ecosystem private ledger entry",
            schema: { type: "string" },
        },
    ],
    responses: {
        200: {
            description: "Successfully retrieved ecosystem private ledger entry with wallet details",
            content: {
                "application/json": {
                    schema: {
                        type: "object",
                        properties: utils_1.baseEcosystemPrivateLedgerSchema,
                    },
                },
            },
        },
        401: query_1.unauthorizedResponse,
        404: (0, query_1.notFoundMetadataResponse)("Ecosystem Private Ledger"),
        500: query_1.serverErrorResponse,
    },
    permission: "view.ecosystem.private.ledger",
    requiresAuth: true,
};
exports.default = async (data) => {
    const { params, ctx } = data;
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Retrieving private ledger details");
    const ledger = await (0, query_1.getRecord)("ecosystemPrivateLedger", params.id, [
        {
            model: db_1.models.wallet,
            as: "wallet",
            attributes: ["currency", "address", "balance"],
        },
    ]);
    ctx === null || ctx === void 0 ? void 0 : ctx.success("Private ledger details retrieved");
    return ledger;
};
