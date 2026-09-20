"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const query_1 = require("@b/utils/query");
const utils_1 = require("./utils");
exports.metadata = {
    summary: "Stores a new Investment Duration",
    operationId: "storeInvestmentDuration",
    tags: ["Admin", "Investment Durations"],
    requestBody: {
        required: true,
        content: {
            "application/json": {
                schema: utils_1.investmentDurationUpdateSchema,
            },
        },
    },
    responses: (0, query_1.storeRecordResponses)(utils_1.investmentDurationStoreSchema, "Investment Duration"),
    requiresAuth: true,
    permission: "create.investment.duration",
    logModule: "ADMIN_FIN",
    logTitle: "Create Investment Duration",
};
exports.default = async (data) => {
    const { body, ctx } = data;
    const { duration, timeframe } = body;
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Validating investment duration data");
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Creating investment duration record");
    const result = await (0, query_1.storeRecord)({
        model: "investmentDuration",
        data: {
            duration,
            timeframe,
        },
    });
    ctx === null || ctx === void 0 ? void 0 : ctx.success("Investment duration created successfully");
    return result;
};
