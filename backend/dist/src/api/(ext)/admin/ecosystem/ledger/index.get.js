"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const db_1 = require("@b/db");
const constants_1 = require("@b/utils/constants");
const query_1 = require("@b/utils/query");
const utils_1 = require("./utils");
exports.metadata = {
    summary: "List ecosystem private ledger entries",
    operationId: "listEcosystemPrivateLedgers",
    tags: ["Admin", "Ecosystem", "Ledger"],
    description: "Retrieves a paginated list of ecosystem private ledger entries. Each ledger entry tracks the offchain balance difference for a specific wallet, currency, and blockchain network combination. The response includes associated wallet information and user details.",
    parameters: constants_1.crudParameters,
    logModule: "ADMIN_ECO",
    logTitle: "List private ledgers",
    responses: {
        200: {
            description: "Successfully retrieved list of ecosystem private ledger entries with associated wallet and user information",
            content: {
                "application/json": {
                    schema: {
                        type: "object",
                        properties: {
                            items: {
                                type: "array",
                                items: {
                                    type: "object",
                                    properties: utils_1.ecosystemPrivateLedgerSchema,
                                },
                            },
                            pagination: constants_1.paginationSchema,
                        },
                    },
                },
            },
        },
        401: query_1.unauthorizedResponse,
        404: (0, query_1.notFoundMetadataResponse)("Ecosystem Private Ledgers"),
        500: query_1.serverErrorResponse,
    },
    requiresAuth: true,
    permission: "view.ecosystem.private.ledger",
    demoMask: ["items.wallet.user.email"],
};
exports.default = async (data) => {
    const { query, ctx } = data;
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Fetching private ledger entries");
    const ledgers = await (0, query_1.getFiltered)({
        model: db_1.models.ecosystemPrivateLedger,
        query,
        sortField: query.sortField || "createdAt",
        includeModels: [
            {
                model: db_1.models.wallet,
                as: "wallet",
                attributes: ["currency", "address", "balance"],
                includeModels: [
                    {
                        model: db_1.models.user,
                        as: "user",
                        attributes: ["avatar", "firstName", "lastName", "email"],
                    },
                ],
            },
        ],
    });
    const items = ledgers.items;
    const filteredItems = items.filter((ledger) => {
        const envNetworkKey = `${ledger.chain.toUpperCase()}_NETWORK`;
        const configuredNetwork = process.env[envNetworkKey];
        if (configuredNetwork && ledger.network) {
            return ledger.network === configuredNetwork;
        }
        return true;
    });
    ctx === null || ctx === void 0 ? void 0 : ctx.success(`Retrieved ${filteredItems.length} private ledgers`);
    return {
        items: filteredItems,
        pagination: ledgers.pagination
    };
};
