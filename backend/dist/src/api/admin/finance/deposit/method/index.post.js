"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const query_1 = require("@b/utils/query");
const utils_1 = require("./utils");
const error_1 = require("@b/utils/error");
exports.metadata = {
    summary: "Stores a new deposit method",
    operationId: "storeDepositMethod",
    tags: ["Admin", "Deposit Methods"],
    requestBody: {
        required: true,
        content: {
            "application/json": {
                schema: utils_1.depositMethodUpdateSchema,
            },
        },
    },
    responses: (0, query_1.storeRecordResponses)(utils_1.DepositMethodSchema, "Deposit Method"),
    requiresAuth: true,
    permission: "create.deposit.method",
    logModule: "ADMIN_FIN",
    logTitle: "Create deposit method",
};
exports.default = async (data) => {
    const { body, ctx } = data;
    const { title, instructions, image, fixedFee, percentageFee, minAmount, maxAmount, customFields, } = body;
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Validating deposit method data");
    let parsedCustomFields = Array.isArray(customFields) ? customFields : [];
    if (typeof customFields === "string") {
        try {
            const parsed = JSON.parse(customFields);
            parsedCustomFields = Array.isArray(parsed) ? parsed : [];
        }
        catch (error) {
            throw (0, error_1.createError)({ statusCode: 400, message: "Invalid JSON format for customFields" });
        }
    }
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Creating deposit method record");
    const result = await (0, query_1.storeRecord)({
        model: "depositMethod",
        data: {
            title,
            instructions,
            image,
            fixedFee,
            percentageFee,
            minAmount,
            maxAmount,
            customFields: parsedCustomFields,
        },
    });
    ctx === null || ctx === void 0 ? void 0 : ctx.success("Deposit method created successfully");
    return result;
};
