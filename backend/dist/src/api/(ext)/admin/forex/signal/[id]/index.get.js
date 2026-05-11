"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const query_1 = require("@b/utils/query");
const utils_1 = require("../utils");
exports.metadata = {
    summary: "Gets a specific Forex signal",
    description: "Retrieves detailed information about a specific Forex trading signal by its ID, including title, image, and status.",
    operationId: "getForexSignal",
    tags: ["Admin", "Forex", "Signal"],
    parameters: [
        {
            index: 0,
            name: "id",
            in: "path",
            required: true,
            description: "ID of the forex signal to retrieve",
            schema: { type: "string" },
        },
    ],
    responses: {
        200: {
            description: "Forex signal details",
            content: {
                "application/json": {
                    schema: {
                        type: "object",
                        properties: utils_1.baseForexSignalSchema,
                    },
                },
            },
        },
        401: query_1.unauthorizedResponse,
        404: (0, query_1.notFoundMetadataResponse)("Forex Signal"),
        500: query_1.serverErrorResponse,
    },
    permission: "view.forex.signal",
    requiresAuth: true,
    logModule: "ADMIN_FOREX",
    logTitle: "Get Forex Signal",
};
exports.default = async (data) => {
    const { params, ctx } = data;
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Fetching forex signal record");
    const result = await (0, query_1.getRecord)("forexSignal", params.id);
    ctx === null || ctx === void 0 ? void 0 : ctx.success("Retrieved forex signal");
    return result;
};
