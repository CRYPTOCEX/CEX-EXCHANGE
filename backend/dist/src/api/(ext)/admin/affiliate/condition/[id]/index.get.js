"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const query_1 = require("@b/utils/query");
const errors_1 = require("@b/utils/schema/errors");
const utils_1 = require("../utils");
exports.metadata = {
    summary: "Retrieves a specific affiliate condition by ID",
    description: "Fetches detailed information about a specific affiliate condition including its type, reward configuration, wallet settings, and current status. Returns complete condition details including creation and update timestamps.",
    operationId: "getAffiliateConditionById",
    tags: ["Admin", "Affiliate", "Condition"],
    parameters: [
        {
            index: 0,
            name: "id",
            in: "path",
            required: true,
            description: "ID of the affiliate condition to retrieve",
            schema: { type: "string" },
        },
    ],
    responses: {
        200: {
            description: "Affiliate condition retrieved successfully",
            content: {
                "application/json": {
                    schema: {
                        type: "object",
                        properties: utils_1.baseMlmReferralConditionSchema,
                    },
                },
            },
        },
        401: errors_1.unauthorizedResponse,
        404: (0, errors_1.notFoundResponse)("Affiliate Condition"),
        500: errors_1.serverErrorResponse,
    },
    permission: "view.affiliate.condition",
    requiresAuth: true,
    logModule: "ADMIN_AFFILIATE",
    logTitle: "Get affiliate condition details",
};
exports.default = async (data) => {
    const { params, ctx } = data;
    ctx === null || ctx === void 0 ? void 0 : ctx.step(`Fetching condition with ID: ${params.id}`);
    const result = await (0, query_1.getRecord)("mlmReferralCondition", params.id);
    ctx === null || ctx === void 0 ? void 0 : ctx.success("Condition details retrieved successfully");
    return result;
};
