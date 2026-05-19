"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const query_1 = require("@b/utils/query");
const errors_1 = require("@b/utils/schema/errors");
const utils_1 = require("../utils");
const db_1 = require("@b/db");
exports.metadata = {
    summary: "Retrieves a specific ecommerce discount by ID",
    operationId: "getEcommerceDiscountById",
    description: "Fetches detailed information about a specific ecommerce discount including its code, percentage, validity date, status, and associated product details with category information. Use this endpoint to view or edit a single discount record.",
    tags: ["Admin", "Ecommerce", "Discount"],
    parameters: [
        {
            index: 0,
            name: "id",
            in: "path",
            required: true,
            description: "ID of the ecommerce discount to retrieve",
            schema: { type: "string" },
        },
    ],
    responses: {
        200: {
            description: "Ecommerce discount details with product information",
            content: {
                "application/json": {
                    schema: {
                        type: "object",
                        properties: utils_1.baseEcommerceDiscountSchema,
                    },
                },
            },
        },
        401: errors_1.unauthorizedResponse,
        404: (0, errors_1.notFoundResponse)("Ecommerce Discount"),
        500: errors_1.serverErrorResponse,
    },
    permission: "view.ecommerce.discount",
    requiresAuth: true,
    logModule: "ADMIN_ECOM",
    logTitle: "Get discount details",
};
exports.default = async (data) => {
    const { params, ctx } = data;
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Validating discount ID");
    ctx === null || ctx === void 0 ? void 0 : ctx.step(`Fetching discount: ${params.id}`);
    const result = await (0, query_1.getRecord)("ecommerceDiscount", params.id, [
        {
            model: db_1.models.ecommerceProduct,
            as: "product",
            attributes: ["image", "name"],
            includeModels: [
                {
                    model: db_1.models.ecommerceCategory,
                    as: "category",
                    attributes: ["name"],
                },
            ],
        },
    ]);
    ctx === null || ctx === void 0 ? void 0 : ctx.success("Discount details retrieved successfully");
    return result;
};
