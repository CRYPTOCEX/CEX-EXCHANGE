"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const db_1 = require("@b/db");
const error_1 = require("@b/utils/error");
const query_1 = require("@b/utils/query");
exports.metadata = { summary: "Get durations for a specific Forex plan",
    description: "Retrieves all available durations for a specific forex investment plan",
    operationId: "getForexPlanDurations",
    tags: ["Forex", "Plan", "Duration"],
    requiresAuth: true,
    logModule: "FOREX",
    logTitle: "Get Plan Durations",
    parameters: [
        { index: 0,
            name: "id",
            in: "path",
            required: true,
            description: "ID of the forex plan",
            schema: { type: "string" },
        },
    ],
    responses: { 200: { description: "Plan durations retrieved successfully",
            content: { "application/json": { schema: { type: "array",
                        items: { type: "object",
                            properties: { id: { type: "string" },
                                duration: { type: "number" },
                                timeframe: { type: "string" },
                            },
                        },
                    },
                },
            },
        },
        401: query_1.unauthorizedResponse,
        404: (0, query_1.notFoundMetadataResponse)("Forex Plan"),
        500: query_1.serverErrorResponse,
    },
};
exports.default = async (data) => {
    const { user, params, ctx } = data;
    if (!(user === null || user === void 0 ? void 0 : user.id)) {
        throw (0, error_1.createError)({ statusCode: 401, message: "Unauthorized" });
    }
    const { id } = params;
    try {
        const plan = await db_1.models.forexPlan.findOne({ where: { id, status: true },
        });
        if (!plan) {
            throw (0, error_1.createError)({ statusCode: 404, message: "Forex Plan not found" });
        }
        const durations = await db_1.models.forexDuration.findAll({ include: [
                { model: db_1.models.forexPlan,
                    as: "plans",
                    where: { id },
                    through: { attributes: [] },
                    required: true,
                },
            ],
            attributes: ["id", "duration", "timeframe"],
            order: [
                ["timeframe", "ASC"],
                ["duration", "ASC"],
            ],
        });
        ctx === null || ctx === void 0 ? void 0 : ctx.success("Request completed successfully");
        return durations;
    }
    catch (error) {
        if (error.statusCode) {
            throw error;
        }
        console.error("Error fetching plan durations:", error);
        throw (0, error_1.createError)({ statusCode: 500, message: "Internal Server Error" });
    }
};
