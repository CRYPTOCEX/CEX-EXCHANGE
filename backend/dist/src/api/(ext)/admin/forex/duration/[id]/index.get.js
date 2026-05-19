"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const query_1 = require("@b/utils/query");
const utils_1 = require("../utils");
exports.metadata = {
    summary: "Gets a specific Forex duration",
    description: "Retrieves detailed information about a specific Forex duration configuration by its ID.",
    operationId: "getForexDuration",
    tags: ["Admin", "Forex", "Duration"],
    parameters: [
        {
            index: 0,
            name: "id",
            in: "path",
            required: true,
            description: "ID of the forex duration to retrieve",
            schema: { type: "string" },
        },
    ],
    responses: {
        200: {
            description: "Forex duration details",
            content: {
                "application/json": {
                    schema: {
                        type: "object",
                        properties: utils_1.baseForexDurationSchema,
                    },
                },
            },
        },
        401: query_1.unauthorizedResponse,
        404: (0, query_1.notFoundMetadataResponse)("Forex Duration"),
        500: query_1.serverErrorResponse,
    },
    permission: "view.forex.duration",
    requiresAuth: true,
    logModule: "ADMIN_FOREX",
    logTitle: "Get Forex Duration",
};
exports.default = async (data) => {
    const { params, ctx } = data;
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Fetching forex duration record");
    const result = await (0, query_1.getRecord)("forexDuration", params.id);
    ctx === null || ctx === void 0 ? void 0 : ctx.success("Retrieved forex duration");
    return result;
};
