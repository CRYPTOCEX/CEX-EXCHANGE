"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const db_1 = require("@b/db");
const constants_1 = require("@b/utils/constants");
const query_1 = require("@b/utils/query");
const errors_1 = require("@b/utils/schema/errors");
const utils_1 = require("./utils");
exports.metadata = {
    summary: "Lists all ecommerce discounts with pagination and filtering",
    operationId: "listEcommerceDiscounts",
    description: "Retrieves a paginated list of all ecommerce discounts with their associated product information. Supports filtering, sorting, and searching capabilities. Returns discount codes, percentages, validity dates, and linked product details including category information.",
    tags: ["Admin", "Ecommerce", "Discount"],
    parameters: constants_1.crudParameters,
    responses: {
        200: {
            description: "List of ecommerce discounts with product details and pagination metadata",
            content: {
                "application/json": {
                    schema: {
                        type: "object",
                        properties: {
                            data: {
                                type: "array",
                                items: {
                                    type: "object",
                                    properties: utils_1.ecommerceDiscountSchema,
                                },
                            },
                            pagination: constants_1.paginationSchema,
                        },
                    },
                },
            },
        },
        401: errors_1.unauthorizedResponse,
        404: (0, errors_1.notFoundResponse)("Ecommerce Discounts"),
        500: errors_1.serverErrorResponse,
    },
    requiresAuth: true,
    permission: "view.ecommerce.discount",
    logModule: "ADMIN_ECOM",
    logTitle: "List discounts",
};
exports.default = async (data) => {
    var _a;
    const { query, ctx } = data;
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Parsing query parameters");
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Fetching discounts from database");
    const result = await (0, query_1.getFiltered)({
        model: db_1.models.ecommerceDiscount,
        query,
        sortField: query.sortField || "validUntil",
        numericFields: ["percentage"],
        includeModels: [
            {
                model: db_1.models.ecommerceProduct,
                as: "product",
                attributes: ["id", "image", "name"],
                includeModels: [
                    {
                        model: db_1.models.ecommerceCategory,
                        as: "category",
                        attributes: ["name"],
                    },
                ],
            },
        ],
    });
    ctx === null || ctx === void 0 ? void 0 : ctx.success(`Retrieved ${((_a = result.items) === null || _a === void 0 ? void 0 : _a.length) || 0} discounts`);
    return result;
};
