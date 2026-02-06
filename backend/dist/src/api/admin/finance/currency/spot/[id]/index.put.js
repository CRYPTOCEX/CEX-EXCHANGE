"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const query_1 = require("@b/utils/query");
const utils_1 = require("../utils");
exports.metadata = {
    summary: "Updates an existing exchange currency",
    operationId: "updateExchangeCurrency",
    tags: ["Admin", "Exchange", "Currencies"],
    parameters: [
        {
            name: "id",
            in: "path",
            required: true,
            description: "The ID of the currency to update.",
            schema: { type: "string" },
        },
    ],
    requestBody: {
        required: true,
        description: "Updated data for the exchange currency",
        content: {
            "application/json": {
                schema: utils_1.exchangeCurrencyUpdateSchema,
            },
        },
    },
    responses: (0, query_1.updateRecordResponses)("Exchange Currency"),
    requiresAuth: true,
    permission: "edit.spot.currency",
    logModule: "ADMIN_FIN",
    logTitle: "Update spot currency",
};
exports.default = async (data) => {
    const { body, params, ctx } = data;
    const { id } = params;
    const { name, chains } = body;
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Fetching spot currency record");
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Updating spot currency");
    const result = await (0, query_1.updateRecord)("exchangeCurrency", id, { name, chains });
    ctx === null || ctx === void 0 ? void 0 : ctx.success("Spot currency updated successfully");
    return result;
};
