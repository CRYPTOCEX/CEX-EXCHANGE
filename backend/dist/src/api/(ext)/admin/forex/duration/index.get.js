"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const db_1 = require("@b/db");
const constants_1 = require("@b/utils/constants");
const query_1 = require("@b/utils/query");
const utils_1 = require("./utils");
exports.metadata = {
    summary: "Lists all Forex durations",
    description: "Retrieves a paginated list of all Forex durations with optional filtering and sorting. Durations define the time periods available for Forex investments.",
    operationId: "listForexDurations",
    tags: ["Admin", "Forex", "Duration"],
    parameters: constants_1.crudParameters,
    logModule: "ADMIN_FOREX",
    logTitle: "Get Forex Durations",
    responses: {
        200: {
            description: "List of Forex Durations with pagination information",
            content: {
                "application/json": {
                    schema: {
                        type: "object",
                        properties: {
                            items: {
                                type: "array",
                                items: {
                                    type: "object",
                                    properties: utils_1.forexDurationSchema,
                                },
                            },
                            pagination: constants_1.paginationSchema,
                        },
                    },
                },
            },
        },
        401: query_1.unauthorizedResponse,
        404: (0, query_1.notFoundMetadataResponse)("Forex Durations"),
        500: query_1.serverErrorResponse,
    },
    requiresAuth: true,
    permission: "view.forex.duration",
};
exports.default = async (data) => {
    var _a;
    const { query, ctx } = data;
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Fetching forex durations");
    const result = await (0, query_1.getFiltered)({
        model: db_1.models.forexDuration,
        query,
        sortField: query.sortField || "duration",
        timestamps: false,
        numericFields: ["duration"],
    });
    ctx === null || ctx === void 0 ? void 0 : ctx.success(`Retrieved ${((_a = result.items) === null || _a === void 0 ? void 0 : _a.length) || 0} forex durations`);
    return result;
};
