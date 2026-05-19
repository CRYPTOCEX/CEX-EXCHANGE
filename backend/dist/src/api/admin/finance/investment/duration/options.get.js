"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const query_1 = require("@b/utils/query");
const error_1 = require("@b/utils/error");
const db_1 = require("@b/db");
exports.metadata = {
    summary: "Retrieves a list of investment durations",
    description: "This endpoint retrieves all available investment durations for selection.",
    operationId: "getInvestmentDurations",
    tags: ["Investment", "Duration"],
    requiresAuth: true,
    responses: {
        200: {
            description: "Investment durations retrieved successfully",
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
        404: (0, query_1.notFoundMetadataResponse)("InvestmentDuration"),
        500: query_1.serverErrorResponse,
    },
};
exports.default = async (data) => {
    const { user } = data;
    if (!(user === null || user === void 0 ? void 0 : user.id))
        throw (0, error_1.createError)(401, "Unauthorized");
    try {
        const durations = await db_1.models.investmentDuration.findAll();
        const formatted = durations.map((duration) => ({
            id: duration.id,
            name: `${duration.duration} ${duration.timeframe}`,
        }));
        return formatted;
    }
    catch (error) {
        throw (0, error_1.createError)(500, "An error occurred while fetching investment durations");
    }
};
