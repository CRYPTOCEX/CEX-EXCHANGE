"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const db_1 = require("@b/db");
const error_1 = require("@b/utils/error");
const query_1 = require("@b/utils/query");
const Middleware_1 = require("@b/handler/Middleware");
exports.metadata = {
    summary: "Creates or updates a review for a product",
    description: "Allows a user to submit a review for a product they have purchased. Users can only review products once, but they can update their review.",
    operationId: "createEcommerceReview",
    tags: ["Ecommerce", "Reviews"],
    logModule: "ECOM",
    logTitle: "Create or update review",
    parameters: [
        {
            index: 0,
            name: "productId",
            in: "path",
            required: true,
            schema: { type: "string", description: "Product ID for the review" },
        },
    ],
    requestBody: {
        required: true,
        content: {
            "application/json": {
                schema: {
                    type: "object",
                    properties: {
                        rating: {
                            type: "number",
                            description: "Rating given to the product",
                        },
                        comment: {
                            type: "string",
                            description: "Comment about the product",
                            nullable: true,
                        },
                    },
                    required: ["rating"],
                },
            },
        },
    },
    responses: (0, query_1.createRecordResponses)("Review"),
    requiresAuth: true,
};
exports.default = async (data) => {
    await Middleware_1.rateLimiters.moderate(data);
    const { user, params, body, ctx } = data;
    if (!(user === null || user === void 0 ? void 0 : user.id)) {
        throw (0, error_1.createError)({ statusCode: 401, message: "Unauthorized" });
    }
    const { productId } = params;
    const { rating, comment } = body;
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Verifying product purchase");
    const userHasPurchased = await db_1.models.ecommerceOrder.findOne({
        where: {
            userId: user.id,
            status: "COMPLETED",
        },
        include: [
            {
                model: db_1.models.ecommerceProduct,
                as: "products",
                through: {
                    attributes: [],
                },
                where: {
                    id: productId,
                },
            },
        ],
    });
    if (!userHasPurchased) {
        ctx === null || ctx === void 0 ? void 0 : ctx.fail("User has not purchased this product");
        throw (0, error_1.createError)({
            statusCode: 400,
            message: "You have not purchased this product",
        });
    }
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Creating or updating review");
    const result = await db_1.sequelize.transaction(async (transaction) => {
        const [review, created] = await db_1.models.ecommerceReview.upsert({
            productId: productId,
            userId: user.id,
            rating,
            comment,
            status: true,
        }, {
            returning: true,
            transaction,
        });
        return {
            review,
            created,
        };
    });
    ctx === null || ctx === void 0 ? void 0 : ctx.success(`Review ${result.created ? "created" : "updated"} with rating ${rating}`);
    return {
        message: `Review successfully ${result.created ? "created" : "updated"}.`,
    };
};
