"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const query_1 = require("@b/utils/query");
const utils_1 = require("../utils");
const db_1 = require("@b/db");
const error_1 = require("@b/utils/error");
exports.metadata = {
    summary: "Retrieves detailed information of a specific forex investment by ID",
    operationId: "getForexInvestmentById",
    tags: ["Forex", "Investments"],
    logModule: "FOREX",
    logTitle: "Get Forex Investment",
    parameters: [
        {
            index: 0,
            name: "id",
            in: "path",
            required: true,
            description: "ID of the forex investment to retrieve",
            schema: { type: "string" },
        },
    ],
    responses: {
        200: {
            description: "Forex investment details",
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
    const { params, user, ctx } = data;
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Fetching Forex Investment");
    if (!(user === null || user === void 0 ? void 0 : user.id)) {
        throw (0, error_1.createError)({ statusCode: 401, message: "Unauthorized" });
    }
    try {
        const investment = await db_1.models.forexInvestment.findOne({
            where: {
                id: params.id,
                userId: user.id,
            },
            include: [
                {
                    model: db_1.models.user,
                    as: "user",
                    attributes: ["id", "firstName", "lastName", "email", "avatar"],
                },
                {
                    model: db_1.models.forexPlan,
                    as: "plan",
                    attributes: ["id", "name", "title", "description", "profitPercentage", "image", "currency"],
                },
                {
                    model: db_1.models.forexDuration,
                    as: "duration",
                    attributes: ["id", "duration", "timeframe"],
                },
            ],
        });
        if (!investment) {
            throw (0, error_1.createError)({ statusCode: 404, message: "Forex investment not found" });
        }
        ctx === null || ctx === void 0 ? void 0 : ctx.success("Get Forex Investment fetched successfully");
        return investment;
    }
    catch (error) {
        if (error.statusCode) {
            throw error;
        }
        console.error("Error fetching forex investment:", error);
        throw (0, error_1.createError)({ statusCode: 500, message: "Internal Server Error" });
    }
};
