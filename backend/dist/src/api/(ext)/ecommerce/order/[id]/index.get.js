"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const db_1 = require("@b/db");
const error_1 = require("@b/utils/error");
const query_1 = require("@b/utils/query");
const utils_1 = require("../../utils");
exports.metadata = {
    summary: "Retrieves a specific order by ID",
    description: "Fetches a single order by its ID, including details of the products in the order.",
    operationId: "getEcommerceOrderById",
    tags: ["Ecommerce", "Orders"],
    logModule: "ECOM",
    logTitle: "Get Order",
    requiresAuth: true,
    parameters: [
        {
            index: 0,
            name: "id",
            in: "path",
            required: true,
            schema: { type: "string", description: "Order ID" },
        },
    ],
    responses: {
        200: {
            description: "Order retrieved successfully",
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
        404: (0, query_1.notFoundMetadataResponse)("Ecommerce Order"),
        500: query_1.serverErrorResponse,
    },
};
exports.default = async (data) => {
    const { user, params, ctx } = data;
    if (!(user === null || user === void 0 ? void 0 : user.id))
        throw (0, error_1.createError)({ statusCode: 401, message: "Unauthorized" });
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Fetching Order");
    const order = (await db_1.models.ecommerceOrder.findOne({
        where: { id: params.id, userId: user.id },
        include: [
            {
                model: db_1.models.ecommerceProduct,
                as: "products",
                through: {
                    attributes: ["quantity", "key", "filePath"],
                },
                attributes: [
                    "name",
                    "price",
                    "status",
                    "type",
                    "image",
                    "currency",
                    "walletType",
                ],
                include: [
                    {
                        model: db_1.models.ecommerceCategory,
                        as: "category",
                        attributes: ["name"],
                    },
                ],
            },
            {
                model: db_1.models.ecommerceShipping,
                as: "shipping",
            },
            {
                model: db_1.models.ecommerceShippingAddress,
                as: "shippingAddress",
            },
        ],
    }));
    if (!order) {
        throw (0, error_1.createError)({ statusCode: 404, message: "Order not found" });
    }
    ctx === null || ctx === void 0 ? void 0 : ctx.success("Get Order fetched successfully");
    return order.get({ plain: true });
};
