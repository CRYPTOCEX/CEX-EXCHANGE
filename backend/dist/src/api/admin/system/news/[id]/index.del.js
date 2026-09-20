"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const db_1 = require("@b/db");
const error_1 = require("@b/utils/error");
const errors_1 = require("@b/utils/schema/errors");
exports.metadata = {
    summary: "Deletes a market news item",
    operationId: "deleteMarketNews",
    tags: ["Admin", "Market News"],
    description: "Deletes a news item. A deleted PROVIDER story can be re-inserted by a later sync — prefer status=false to suppress it permanently.",
    parameters: [
        { name: "id", in: "path", required: true, schema: { type: "string" } },
    ],
    responses: {
        200: {
            description: "Market news item deleted",
            content: {
                "application/json": {
                    schema: { type: "object", properties: { message: { type: "string" } } },
                },
            },
        },
        401: errors_1.unauthorizedResponse,
        404: (0, errors_1.notFoundResponse)("Market News"),
        500: errors_1.serverErrorResponse,
    },
    requiresAuth: true,
    permission: "delete.market.news",
    logModule: "ADMIN_NEWS",
    logTitle: "Delete market news",
};
exports.default = async (data) => {
    const { params, ctx } = data;
    const item = await db_1.models.marketNews.findByPk(params.id);
    if (!item) {
        throw (0, error_1.createError)({ statusCode: 404, message: "Market news item not found" });
    }
    ctx === null || ctx === void 0 ? void 0 : ctx.step(`Deleting market news item ${item.id}`);
    await item.destroy();
    ctx === null || ctx === void 0 ? void 0 : ctx.success(`Deleted market news item ${item.id}`);
    return { message: "Market news item deleted" };
};
