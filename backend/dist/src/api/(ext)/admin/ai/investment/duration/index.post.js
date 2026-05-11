"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const query_1 = require("@b/utils/query");
const utils_1 = require("./utils");
exports.metadata = {
    summary: "Create a new AI investment duration",
    operationId: "createAiInvestmentDuration",
    tags: ["Admin", "AI Investment", "Duration"],
    description: "Creates a new AI investment duration option. Allows administrators to define new timeframes for AI investment plans.",
    requestBody: {
        required: true,
        content: {
            "application/json": {
                schema: utils_1.aiInvestmentDurationUpdateSchema,
            },
        },
    },
    responses: (0, query_1.storeRecordResponses)(utils_1.aiInvestmentDurationStoreSchema, "AI Investment Duration"),
    requiresAuth: true,
    permission: "create.ai.investment.duration",
    logModule: "ADMIN_AI",
    logTitle: "Create investment duration",
};
exports.default = async (data) => {
    const { body, ctx } = data;
    const { duration, timeframe } = body;
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Validating duration data");
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Creating duration record");
    const result = await (0, query_1.storeRecord)({
        model: "aiInvestmentDuration",
        data: {
            duration,
            timeframe,
        },
    });
    ctx === null || ctx === void 0 ? void 0 : ctx.success("Duration created successfully");
    return result;
};
