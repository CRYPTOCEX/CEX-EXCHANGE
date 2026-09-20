"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const db_1 = require("@b/db");
const error_1 = require("@b/utils/error");
const errors_1 = require("@b/utils/schema/errors");
const utils_1 = require("../utils");
exports.metadata = {
    summary: "Updates a market news item",
    operationId: "updateMarketNews",
    tags: ["Admin", "Market News"],
    description: "Updates a news item. Set status=false to pull a story from the client feed — the sync never writes status, so a suppressed provider story stays suppressed.",
    parameters: [
        { name: "id", in: "path", required: true, schema: { type: "string" } },
    ],
    requestBody: {
        required: true,
        content: {
            "application/json": {
                schema: { type: "object", properties: utils_1.marketNewsBodySchema },
            },
        },
    },
    responses: {
        200: {
            description: "Market news item updated",
            content: {
                "application/json": {
                    schema: { type: "object", properties: { message: { type: "string" } } },
                },
            },
        },
        400: errors_1.badRequestResponse,
        401: errors_1.unauthorizedResponse,
        404: (0, errors_1.notFoundResponse)("Market News"),
        500: errors_1.serverErrorResponse,
    },
    requiresAuth: true,
    permission: "edit.market.news",
    logModule: "ADMIN_NEWS",
    logTitle: "Update market news",
};
exports.default = async (data) => {
    const { params, body, ctx } = data;
    const item = await db_1.models.marketNews.findByPk(params.id);
    if (!item) {
        throw (0, error_1.createError)({ statusCode: 404, message: "Market news item not found" });
    }
    const values = (0, utils_1.validateMarketNewsBody)(body, false);
    if (Object.keys(values).length === 0) {
        throw (0, error_1.createError)({ statusCode: 400, message: "No updatable fields supplied" });
    }
    ctx === null || ctx === void 0 ? void 0 : ctx.step(`Updating market news item ${item.id}`);
    await item.update(values);
    ctx === null || ctx === void 0 ? void 0 : ctx.success(`Updated market news item ${item.id}`);
    return { message: "Market news item updated" };
};
