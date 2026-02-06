"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const db_1 = require("@b/db");
const error_1 = require("@b/utils/error");
const query_1 = require("@b/utils/query");
const utils_1 = require("../../../utils");
exports.metadata = {
    summary: "Checks if user purchased a specific product",
    description: "Fetches an order containing the given productId for the authenticated user, to verify purchase.",
    operationId: "getEcommerceOrderByProductId",
    tags: ["Ecommerce", "Orders"],
    logModule: "ECOM",
    logTitle: "Get Product Orders",
    requiresAuth: true,
    parameters: [
        {
            index: 0,
            name: "productId",
            in: "path",
            required: true,
            schema: { type: "string", description: "Product ID" },
        },
    ],
    responses: {
        200: {
            description: "Order containing the product retrieved successfully",
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
        404: (0, query_1.notFoundMetadataResponse)("Ecommerce Order for Product"),
        500: query_1.serverErrorResponse,
    },
};
exports.default = async (data) => {
    const { user, params, ctx } = data;
    if (!(user === null || user === void 0 ? void 0 : user.id))
        throw (0, error_1.createError)({ statusCode: 401, message: "Unauthorized" });
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Fetching Product Orders");
    const order = (await db_1.models.ecommerceOrder.findOne({
        where: { userId: user.id },
        include: [
            {
                model: db_1.models.ecommerceProduct,
                as: "products",
                where: { id: params.productId },
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
        throw (0, error_1.createError)({
            statusCode: 404,
            message: "Order not found for this product",
        });
    }
    ctx === null || ctx === void 0 ? void 0 : ctx.success("Get Product Orders fetched successfully");
    return order.get({ plain: true });
};
