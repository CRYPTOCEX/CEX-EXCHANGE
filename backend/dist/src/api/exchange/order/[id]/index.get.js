"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
exports.getOrder = getOrder;
const db_1 = require("@b/db");
const error_1 = require("@b/utils/error");
const query_1 = require("@b/utils/query");
const utils_1 = require("../utils");
exports.metadata = {
    summary: "Show Order Details",
    operationId: "showOrder",
    tags: ["Exchange", "Orders"],
    description: "Retrieves details of a specific order by ID for the authenticated user.",
    logModule: "EXCHANGE",
    logTitle: "Get Order Details",
    parameters: [
        {
            name: "id",
            in: "path",
            required: true,
            description: "ID of the order to retrieve.",
            schema: { type: "string" },
        },
    ],
    responses: {
        200: {
            description: "Order details",
            content: {
                "application/json": {
                    schema: {
                        type: "object",
                        properties: utils_1.baseOrderSchema,
                    },
                },
            },
        },
        401: query_1.unauthorizedResponse,
        404: (0, query_1.notFoundMetadataResponse)("Order"),
        500: query_1.serverErrorResponse,
    },
    requiresAuth: true,
};
exports.default = async (data) => {
    var _a;
    if (!((_a = data.user) === null || _a === void 0 ? void 0 : _a.id))
        throw (0, error_1.createError)({ statusCode: 401, message: "Unauthorized" });
    const { ctx, params, user } = data;
    ctx === null || ctx === void 0 ? void 0 : ctx.step(`Fetching order ${params.id}`);
    const order = await getOrder(params.id);
    if (!order || order.userId !== user.id) {
        throw (0, error_1.createError)({ statusCode: 404, message: "Order not found or access denied" });
    }
    ctx === null || ctx === void 0 ? void 0 : ctx.success("Order retrieved successfully");
    return order;
};
async function getOrder(id) {
    const response = await db_1.models.exchangeOrder.findOne({
        where: {
            id,
        },
    });
    if (!response) {
        throw (0, error_1.createError)({ statusCode: 404, message: "Order not found" });
    }
    return response.get({ plain: true });
}
