"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const query_1 = require("@b/utils/query");
const utils_1 = require("./utils");
exports.metadata = {
    summary: "Creates a new Forex signal",
    description: "Creates a new Forex trading signal configuration with title, image, and active status. Users can subscribe to active signals.",
    operationId: "createForexSignal",
    tags: ["Admin", "Forex", "Signal"],
    requestBody: {
        required: true,
        content: {
            "application/json": {
                schema: utils_1.forexSignalUpdateSchema,
            },
        },
    },
    responses: (0, query_1.storeRecordResponses)(utils_1.forexSignalSchema, "Forex Signal"),
    requiresAuth: true,
    permission: "create.forex.signal",
    logModule: "ADMIN_FOREX",
    logTitle: "Create forex signal",
};
exports.default = async (data) => {
    const { body, ctx } = data;
    const { title, image, status } = body;
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Validating forex signal data");
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Creating forex signal");
    const result = await (0, query_1.storeRecord)({
        model: "forexSignal",
        data: {
            title,
            image,
            status,
        },
    });
    ctx === null || ctx === void 0 ? void 0 : ctx.success("Forex signal created successfully");
    return result;
};
