"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const utils_1 = require("@b/api/(ext)/admin/ecommerce/order/utils");
const db_1 = require("@b/db");
const constants_1 = require("@b/utils/constants");
const error_1 = require("@b/utils/error");
const query_1 = require("@b/utils/query");
exports.metadata = {
    summary: "Lists all ecommerce orders with pagination and optional filtering",
    operationId: "listEcommerceOrders",
    tags: ["E-commerce", "Orders"],
    logModule: "ECOM",
    logTitle: "Get Orders",
    parameters: constants_1.crudParameters,
    responses: {
        200: {
            description: "List of ecommerce orders with details about order items and the user",
            content: {
                "application/json": {
                    schema: {
                        type: "object",
                        properties: {
                            data: {
                                type: "array",
                                items: {
                                    type: "object",
                                    properties: utils_1.ecommerceOrderSchema,
                                },
                            },
                            pagination: constants_1.paginationSchema,
                        },
                    },
                },
            },
        },
        401: query_1.unauthorizedResponse,
        404: (0, query_1.notFoundMetadataResponse)("E-commerce Orders"),
        500: query_1.serverErrorResponse,
    },
    requiresAuth: true,
};
exports.default = async (data) => {
    const { user, query, ctx } = data;
    if (!(user === null || user === void 0 ? void 0 : user.id))
        throw (0, error_1.createError)({ statusCode: 401, message: "Unauthorized" });
    return (0, query_1.getFiltered)({
        model: db_1.models.ecommerceOrder,
        query,
        where: { userId: user.id },
        sortField: query.sortField || "createdAt",
        includeModels: [
            {
                model: db_1.models.ecommerceProduct,
                as: "products",
                through: {
                    attributes: ["quantity"],
                },
                attributes: ["name", "price", "status"],
            },
        ],
    });
};
