"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const query_1 = require("@b/utils/query");
const error_1 = require("@b/utils/error");
const db_1 = require("@b/db");
exports.metadata = {
    summary: "Gets Forex duration options",
    description: "Retrieves all available Forex durations formatted as selectable options with ID and display name (e.g., '1 HOUR', '7 DAY'). Useful for dropdown selections in forms.",
    operationId: "getForexDurationOptions",
    tags: ["Admin", "Forex", "Duration"],
    requiresAuth: true,
    logModule: "ADMIN_FOREX",
    logTitle: "Get Forex Duration Options",
    responses: {
        200: {
            description: "Forex durations retrieved successfully",
            content: {
                "application/json": {
                    schema: {
                        type: "array",
                        items: {
                            type: "object",
                            properties: {
                                id: { type: "string" },
                                name: { type: "string" },
                            },
                        },
                    },
                },
            },
        },
        401: query_1.unauthorizedResponse,
        404: (0, query_1.notFoundMetadataResponse)("ForexDuration"),
        500: query_1.serverErrorResponse,
    },
};
exports.default = async (data) => {
    const { user, ctx } = data;
    if (!(user === null || user === void 0 ? void 0 : user.id))
        throw (0, error_1.createError)(401, "Unauthorized");
    try {
        const durations = await db_1.models.forexDuration.findAll();
        const formatted = durations.map((duration) => ({
            id: duration.id,
            name: `${duration.duration} ${duration.timeframe}`,
        }));
        return formatted;
    }
    catch (error) {
        throw (0, error_1.createError)(500, "An error occurred while fetching forex durations");
    }
};
