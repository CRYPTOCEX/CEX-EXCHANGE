"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const query_1 = require("@b/utils/query");
const utils_1 = require("../utils");
exports.metadata = {
    summary: "Updates a Binary Market",
    operationId: "updateBinaryMarket",
    tags: ["Admin", "Binary Markets"],
    parameters: [
        {
            index: 0,
            name: "id",
            in: "path",
            required: true,
            description: "ID of the binary market to update",
            schema: { type: "string" },
        },
    ],
    requestBody: {
        required: true,
        content: {
            "application/json": {
                schema: utils_1.BinaryMarketUpdateSchema,
            },
        },
    },
    responses: (0, query_1.updateRecordResponses)("Binary Market"),
    requiresAuth: true,
    permission: "update.binary.market",
    logModule: "ADMIN_BINARY",
    logTitle: "Update binary market",
};
exports.default = async (data) => {
    const { body, params, ctx } = data;
    const { id } = params;
    const { currency, pair, minAmount, maxAmount, isTrending, isHot, status } = body;
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Fetching binary market record");
    const updateData = {
        currency,
        pair,
    };
    if (minAmount !== undefined)
        updateData.minAmount = minAmount;
    if (maxAmount !== undefined)
        updateData.maxAmount = maxAmount;
    if (isTrending !== undefined)
        updateData.isTrending = isTrending;
    if (isHot !== undefined)
        updateData.isHot = isHot;
    if (status !== undefined)
        updateData.status = status;
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Updating binary market");
    const result = await (0, query_1.updateRecord)("binaryMarket", id, updateData, true);
    ctx === null || ctx === void 0 ? void 0 : ctx.success("Binary market updated successfully");
    return result;
};
