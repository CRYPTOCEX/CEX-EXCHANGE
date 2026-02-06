"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const query_1 = require("@b/utils/query");
const utils_1 = require("./utils");
exports.metadata = {
    summary: "Stores a new withdrawal method",
    operationId: "storeWithdrawMethod",
    tags: ["Admin", "Withdraw Methods"],
    requestBody: {
        required: true,
        content: {
            "application/json": {
                schema: {
                    type: "object",
                    properties: utils_1.baseWithdrawMethodSchema,
                    required: [
                        "title",
                        "processingTime",
                        "instructions",
                        "fixedFee",
                        "percentageFee",
                        "minAmount",
                        "maxAmount",
                        "status",
                    ],
                },
            },
        },
    },
    responses: (0, query_1.storeRecordResponses)(utils_1.withdrawalMethodStoreSchema, "Withdraw Method"),
    requiresAuth: true,
    permission: "create.withdraw.method",
    logModule: "ADMIN_FIN",
    logTitle: "Create Withdraw Method",
};
exports.default = async (data) => {
    const { body, ctx } = data;
    const { title, processingTime, instructions, image, fixedFee, percentageFee, minAmount, maxAmount, customFields, status, } = body;
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Creating withdraw method");
    const result = await (0, query_1.storeRecord)({
        model: "withdrawMethod",
        data: {
            title,
            processingTime,
            instructions,
            image,
            fixedFee,
            percentageFee,
            minAmount,
            maxAmount,
            customFields,
            status,
        },
    });
    ctx === null || ctx === void 0 ? void 0 : ctx.success("Withdraw method created successfully");
    return result;
};
