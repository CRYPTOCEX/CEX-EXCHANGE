"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const db_1 = require("@b/db");
const constants_1 = require("@b/utils/constants");
const query_1 = require("@b/utils/query");
const utils_1 = require("./utils");
exports.metadata = {
    summary: "Lists all Forex signals",
    description: "Retrieves a paginated list of all Forex trading signals with filtering and sorting options. Signals can be subscribed to by users with Forex accounts.",
    operationId: "listForexSignals",
    tags: ["Admin", "Forex", "Signal"],
    parameters: constants_1.crudParameters,
    logModule: "ADMIN_FOREX",
    logTitle: "Get Forex Signals",
    responses: {
        200: {
            description: "List of Forex Signals with pagination information",
            content: {
                "application/json": {
                    schema: {
                        type: "object",
                        properties: {
                            data: {
                                type: "array",
                                items: {
                                    type: "object",
                                    properties: utils_1.forexSignalSchema,
                                },
                            },
                            pagination: constants_1.paginationSchema,
                        },
                    },
                },
            },
        },
        401: query_1.unauthorizedResponse,
        404: (0, query_1.notFoundMetadataResponse)("Forex Signals"),
        500: query_1.serverErrorResponse,
    },
    requiresAuth: true,
    permission: "view.forex.signal",
};
exports.default = async (data) => {
    const { query, ctx } = data;
    return (0, query_1.getFiltered)({
        model: db_1.models.forexSignal,
        query,
        sortField: query.sortField || "createdAt",
    });
};
