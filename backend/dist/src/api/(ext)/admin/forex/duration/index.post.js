"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const query_1 = require("@b/utils/query");
const utils_1 = require("./utils");
exports.metadata = {
    summary: "Creates a new Forex duration",
    description: "Creates a new Forex duration configuration with specified time value and timeframe unit (HOUR, DAY, WEEK, or MONTH).",
    operationId: "createForexDuration",
    tags: ["Admin", "Forex", "Duration"],
    requestBody: {
        required: true,
        content: {
            "application/json": {
                schema: utils_1.forexDurationUpdateSchema,
            },
        },
    },
    responses: (0, query_1.storeRecordResponses)(utils_1.forexDurationStoreSchema, "Forex Duration"),
    requiresAuth: true,
    permission: "create.forex.duration",
    logModule: "ADMIN_FOREX",
    logTitle: "Create forex duration",
};
exports.default = async (data) => {
    const { body, ctx } = data;
    const { duration, timeframe } = body;
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Validating forex duration data");
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Creating forex duration");
    const result = await (0, query_1.storeRecord)({
        model: "forexDuration",
        data: {
            duration,
            timeframe,
        },
    });
    ctx === null || ctx === void 0 ? void 0 : ctx.success("Forex duration created successfully");
    return result;
};
