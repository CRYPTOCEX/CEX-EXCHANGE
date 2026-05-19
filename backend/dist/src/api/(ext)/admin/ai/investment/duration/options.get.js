"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const query_1 = require("@b/utils/query");
const error_1 = require("@b/utils/error");
const db_1 = require("@b/db");
exports.metadata = {
    summary: "Get AI investment duration options",
    operationId: "getAiInvestmentDurationOptions",
    tags: ["Admin", "AI Investment", "Duration"],
    description: "Retrieves all available AI investment durations formatted as selectable options. Returns simplified data structure with ID and formatted name for dropdown/select use.",
    requiresAuth: true,
    logModule: "ADMIN_AI",
    logTitle: "Get AI Investment Duration Options",
    responses: {
        200: {
            description: "AI investment duration options retrieved successfully",
            content: {
                "application/json": {
                    schema: {
                        type: "array",
                        items: {
                            type: "object",
                            properties: {
                                id: {
                                    type: "string",
                                    format: "uuid",
                                    description: "Unique identifier of the duration",
                                },
                                name: {
                                    type: "string",
                                    description: "Formatted duration name (e.g., '30 DAY', '1 MONTH')",
                                },
                            },
                            required: ["id", "name"],
                        },
                    },
                },
            },
        },
        401: query_1.unauthorizedResponse,
        404: (0, query_1.notFoundMetadataResponse)("AI Investment Duration"),
        500: query_1.serverErrorResponse,
    },
};
exports.default = async (data) => {
    const { user, ctx } = data;
    if (!(user === null || user === void 0 ? void 0 : user.id))
        throw (0, error_1.createError)(401, "Unauthorized");
    try {
        ctx === null || ctx === void 0 ? void 0 : ctx.step("Get AI Investment Duration Options");
        const durations = await db_1.models.aiInvestmentDuration.findAll();
        const formatted = durations.map((duration) => ({
            id: duration.id,
            name: `${duration.duration} ${duration.timeframe}`,
        }));
        ctx === null || ctx === void 0 ? void 0 : ctx.success("Get AI Investment Duration Options retrieved successfully");
        return formatted;
    }
    catch (error) {
        throw (0, error_1.createError)(500, "An error occurred while fetching AI investment durations");
    }
};
