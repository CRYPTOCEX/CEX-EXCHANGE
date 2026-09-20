"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const db_1 = require("@b/db");
const error_1 = require("@b/utils/error");
exports.metadata = {
    summary: "Fetch ICO Launch Plans",
    description: "Retrieves all available ICO launch plans.",
    operationId: "getIcoLaunchPlans",
    tags: ["ICO", "Launch Plans"],
    logModule: "ICO",
    logTitle: "Get ICO Plans",
    responses: {
        200: {
            description: "ICO launch plans fetched successfully.",
            content: {
                "application/json": {
                    schema: {
                        type: "array",
                        items: {
                            type: "object",
                            properties: {
                                id: { type: "string" },
                                name: { type: "string" },
                                description: { type: "string" },
                                price: { type: "number" },
                                currency: { type: "string" },
                                walletType: { type: "string" },
                                features: { type: "object" },
                                recommended: { type: "boolean" },
                                status: { type: "boolean" },
                                sortOrder: { type: "number" },
                                createdAt: { type: "string", format: "date-time" },
                                updatedAt: { type: "string", format: "date-time" },
                            },
                        },
                    },
                },
            },
        },
        500: { description: "Internal Server Error" },
    },
};
exports.default = async (data) => {
    try {
        const { ctx } = data;
        ctx === null || ctx === void 0 ? void 0 : ctx.step("Fetching get ico plans");
        const plans = await db_1.models.icoLaunchPlan.findAll({
            where: { status: true },
        });
        return plans;
    }
    catch (err) {
        throw (0, error_1.createError)({ statusCode: 500, message: err.message });
    }
};
