"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const db_1 = require("@b/db");
const error_1 = require("@b/utils/error");
const query_1 = require("@b/utils/query");
const utils_1 = require("../../utils");
exports.metadata = {
    summary: "Retrieves a specific ecommerce product by slug",
    description: "Fetches a single ecommerce product by its slug, including details such as category and reviews.",
    operationId: "getEcommerceProductBySlug",
    tags: ["Ecommerce", "Products"],
    requiresAuth: false,
    logModule: "ECOM",
    logTitle: "Get Product",
    parameters: [
        {
            index: 0,
            name: "slug",
            in: "path",
            required: true,
            schema: { type: "string", description: "Product slug" },
        },
    ],
    responses: {
        200: {
            description: "Ecommerce product retrieved successfully",
            content: {
                "application/json": {
                    schema: {
                        type: "object",
                        properties: utils_1.baseProductSchema,
                    },
                },
            },
        },
        401: query_1.unauthorizedResponse,
        404: (0, query_1.notFoundMetadataResponse)("Ecommerce Product"),
        500: query_1.serverErrorResponse,
    },
};
exports.default = async (data) => {
    var _a, _b, _c;
    const { user, params, ctx } = data;
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Fetching Product");
    let included = [];
    if (user === null || user === void 0 ? void 0 : user.id) {
        included = [
            {
                model: db_1.models.ecommerceOrder,
                as: "orders",
                where: { userId: user.id },
                attributes: ["status"],
                required: false,
                through: {
                    attributes: ["quantity", "filePath", "key"],
                },
            },
        ];
    }
    const product = await db_1.models.ecommerceProduct.findOne({
        where: { slug: params.slug, status: true },
        include: [
            {
                model: db_1.models.ecommerceCategory,
                as: "category",
                attributes: ["id", "name", "slug"],
            },
            {
                model: db_1.models.ecommerceReview,
                as: "ecommerceReviews",
                required: false,
                include: [
                    {
                        model: db_1.models.user,
                        as: "user",
                        attributes: ["id", "firstName", "lastName", "avatar"],
                    },
                ],
            },
            ...included,
        ],
    });
    if (!product) {
        throw (0, error_1.createError)({ statusCode: 404, message: "Product not found" });
    }
    const productData = product.toJSON();
    try {
        const processedProduct = {
            ...productData,
            rating: ((_a = productData.ecommerceReviews) === null || _a === void 0 ? void 0 : _a.length)
                ? productData.ecommerceReviews.reduce((acc, review) => acc + review.rating, 0) / productData.ecommerceReviews.length
                : 0,
            reviewsCount: (_c = (_b = productData.ecommerceReviews) === null || _b === void 0 ? void 0 : _b.length) !== null && _c !== void 0 ? _c : 0,
        };
        ctx === null || ctx === void 0 ? void 0 : ctx.success("Get Product fetched successfully");
        return JSON.parse(JSON.stringify(processedProduct));
    }
    catch (error) {
        throw (0, error_1.createError)({
            statusCode: 500,
            message: "Error processing product data",
        });
    }
};
