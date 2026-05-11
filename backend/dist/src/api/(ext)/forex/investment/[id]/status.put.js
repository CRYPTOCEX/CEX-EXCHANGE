"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const db_1 = require("@b/db");
const error_1 = require("@b/utils/error");
const query_1 = require("@b/utils/query");
const utils_1 = require("../utils");
exports.metadata = {
    summary: "Retrieves specific Forex investment status",
    description: "Fetches details of a specific Forex investment for the logged-in user.",
    operationId: "getForexInvestmentStatus",
    tags: ["Forex", "Investments"],
    logModule: "FOREX",
    logTitle: "Get investment status",
    parameters: [
        {
            name: "id",
            in: "path",
            required: true,
            schema: { type: "string", description: "Forex investment ID" },
        },
    ],
    responses: {
        200: {
            description: "Forex investment details retrieved successfully",
            content: {
                "application/json": {
                    schema: {
                        type: "object",
                        properties: utils_1.baseForexInvestmentSchema,
                    },
                },
            },
        },
        401: query_1.unauthorizedResponse,
        404: (0, query_1.notFoundMetadataResponse)("Forex Investment"),
        500: query_1.serverErrorResponse,
    },
    requiresAuth: true,
};
exports.default = async (data) => {
    const { user, params, ctx } = data;
    if (!(user === null || user === void 0 ? void 0 : user.id)) {
        throw (0, error_1.createError)({ statusCode: 401, message: "Unauthorized" });
    }
    try {
        ctx === null || ctx === void 0 ? void 0 : ctx.step("Retrieving forex investment details");
        const investment = await db_1.models.forexInvestment.findOne({
            where: {
                id: params.id,
                userId: user.id,
            },
            include: [
                {
                    model: db_1.models.forexPlan,
                    as: "plan",
                    attributes: [
                        "id",
                        "name",
                        "title",
                        "description",
                        "profitPercentage",
                        "image",
                    ],
                },
                {
                    model: db_1.models.user,
                    as: "user",
                    attributes: ["id", "avatar", "firstName", "lastName"],
                },
                {
                    model: db_1.models.forexDuration,
                    as: "duration",
                    attributes: ["id", "duration", "timeframe"],
                },
            ],
        });
        if (!investment) {
            throw (0, error_1.createError)({
                statusCode: 404,
                message: "Forex investment not found",
            });
        }
        ctx === null || ctx === void 0 ? void 0 : ctx.success(`Retrieved investment ${params.id} status: ${investment.status}`);
        return investment;
    }
    catch (error) {
        ctx === null || ctx === void 0 ? void 0 : ctx.fail(error.message || "Failed to retrieve forex investment status");
        throw error;
    }
};
