"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const db_1 = require("@b/db");
const error_1 = require("@b/utils/error");
const query_1 = require("@b/utils/query");
const utils_1 = require("../../utils");
exports.metadata = { summary: "Retrieve specific Forex Investment Plan",
    description: "Fetches details of a specific Forex investment plan for the logged-in user along with available durations, plus the total number of distinct investors and the total invested amount.",
    operationId: "getForexPlanById",
    tags: ["Forex", "Plan"],
    parameters: [
        { index: 0,
            name: "id",
            in: "path",
            required: true,
            schema: { type: "string", description: "Forex investment plan ID" },
        },
    ],
    responses: { 200: { description: "Forex plan retrieved successfully",
            content: { "application/json": { schema: { type: "object",
                        properties: { ...utils_1.baseForexPlanSchema,
                            durations: { type: "array",
                                items: { type: "object",
                                    properties: { id: { type: "string" },
                                        duration: { type: "number" },
                                        timeframe: { type: "string" },
                                    },
                                },
                            },
                            totalInvestors: { type: "number",
                                description: "Total distinct users who invested in this plan",
                            },
                            invested: { type: "number",
                                description: "Total invested amount in this plan",
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
    requiresAuth: true,
    logModule: "FOREX",
    logTitle: "Get Forex Plan",
};
exports.default = async (data) => {
    const { user, params, ctx } = data;
    if (!(user === null || user === void 0 ? void 0 : user.id)) {
        throw (0, error_1.createError)({ statusCode: 401, message: "Unauthorized" });
    }
    const { id } = params;
    try {
        const plan = await db_1.models.forexPlan.findOne({ where: { id, status: true },
            include: [
                { model: db_1.models.forexDuration,
                    as: "durations",
                    attributes: ["id", "duration", "timeframe"],
                    through: { attributes: [] },
                },
            ],
            attributes: [
                "id",
                "title",
                "description",
                "image",
                "minAmount",
                "maxAmount",
                "profitPercentage",
                "currency",
                "walletType",
                "trending",
            ],
        });
        if (!plan) {
            throw (0, error_1.createError)({ statusCode: 404, message: "Forex Plan not found" });
        }
        const totalInvestors = await db_1.models.forexInvestment.count({ where: { planId: id },
            distinct: true,
            col: "userId",
        });
        const invested = await db_1.models.forexInvestment.sum("amount", { where: { planId: id },
        });
        const planJson = plan.toJSON();
        planJson.totalInvestors = totalInvestors || 0;
        planJson.invested = invested || 0;
        ctx === null || ctx === void 0 ? void 0 : ctx.success("Request completed successfully");
        return planJson;
    }
    catch (error) {
        console.error("Error fetching forex plan:", error);
        throw (0, error_1.createError)({ statusCode: 500, message: "Internal Server Error" });
    }
};
