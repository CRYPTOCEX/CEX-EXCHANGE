"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const db_1 = require("@b/db");
const errors_1 = require("@b/utils/schema/errors");
const utils_1 = require("./utils");
exports.metadata = {
    summary: "Creates a market news item",
    operationId: "createMarketNews",
    tags: ["Admin", "Market News"],
    description: "Publishes operator-authored desk commentary to the terminal news feed. Always created as source=MANUAL, which permanently exempts it from the provider sync and tags it 'Desk' in the client UI.",
    requestBody: {
        required: true,
        content: {
            "application/json": {
                schema: {
                    type: "object",
                    properties: utils_1.marketNewsBodySchema,
                    required: ["headline"],
                },
            },
        },
    },
    responses: {
        200: {
            description: "Market news item created",
            content: {
                "application/json": {
                    schema: {
                        type: "object",
                        properties: { message: { type: "string" }, id: { type: "string" } },
                    },
                },
            },
        },
        400: errors_1.badRequestResponse,
        401: errors_1.unauthorizedResponse,
        500: errors_1.serverErrorResponse,
    },
    requiresAuth: true,
    permission: "create.market.news",
    logModule: "ADMIN_NEWS",
    logTitle: "Create market news",
};
exports.default = async (data) => {
    var _a;
    const { body, ctx } = data;
    const values = (0, utils_1.validateMarketNewsBody)(body, true);
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Creating market news item");
    const item = await db_1.models.marketNews.create({
        ...values,
        source: "MANUAL",
        externalId: null,
        provider: null,
        status: (_a = values.status) !== null && _a !== void 0 ? _a : true,
    });
    ctx === null || ctx === void 0 ? void 0 : ctx.success(`Created market news item ${item.id}`);
    return { message: "Market news item created", id: item.id };
};
