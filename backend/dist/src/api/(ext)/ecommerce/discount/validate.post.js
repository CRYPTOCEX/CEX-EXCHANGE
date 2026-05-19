"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const db_1 = require("@b/db");
const error_1 = require("@b/utils/error");
const query_1 = require("@b/utils/query");
const Middleware_1 = require("@b/handler/Middleware");
exports.metadata = {
    summary: "Validate discount code",
    description: "Validates a discount code and returns discount information if valid. Does NOT consume the discount — that happens during order placement.",
    operationId: "validateDiscountCode",
    tags: ["Ecommerce", "Discounts"],
    requiresAuth: true,
    logModule: "ECOM",
    logTitle: "Validate discount code",
    requestBody: {
        required: true,
        content: {
            "application/json": {
                schema: {
                    type: "object",
                    properties: {
                        code: {
                            type: "string",
                            description: "Discount code to validate",
                        },
                    },
                    required: ["code"],
                },
            },
        },
    },
    responses: {
        200: {
            description: "Discount code validation result",
            content: {
                "application/json": {
                    schema: {
                        type: "object",
                        properties: {
                            id: { type: "string" },
                            code: { type: "string" },
                            type: { type: "string", enum: ["PERCENTAGE", "FIXED", "FREE_SHIPPING"] },
                            value: { type: "number" },
                            productId: { type: "string" },
                            message: { type: "string" },
                            isValid: { type: "boolean" },
                        },
                    },
                },
            },
        },
        400: {
            description: "Invalid or expired discount code",
            content: {
                "application/json": {
                    schema: {
                        type: "object",
                        properties: {
                            error: { type: "string" },
                            isValid: { type: "boolean" },
                        },
                    },
                },
            },
        },
        401: query_1.unauthorizedResponse,
        404: (0, query_1.notFoundMetadataResponse)("Discount"),
        500: query_1.serverErrorResponse,
    },
};
exports.default = async (data) => {
    await Middleware_1.rateLimiters.discountValidation(data);
    const { user, body, ctx } = data;
    if (!(user === null || user === void 0 ? void 0 : user.id)) {
        throw (0, error_1.createError)({ statusCode: 401, message: "Unauthorized" });
    }
    const { code } = body;
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Validating discount code format");
    if (!code || typeof code !== "string") {
        throw (0, error_1.createError)({
            statusCode: 400,
            message: "Discount code is required"
        });
    }
    try {
        return await db_1.sequelize.transaction(async (transaction) => {
            ctx === null || ctx === void 0 ? void 0 : ctx.step("Looking up discount code");
            const discount = await db_1.models.ecommerceDiscount.findOne({
                where: {
                    code: code.toUpperCase().trim(),
                    status: true,
                },
                transaction,
            });
            if (!discount) {
                ctx === null || ctx === void 0 ? void 0 : ctx.fail("Invalid discount code");
                return {
                    error: "Invalid discount code",
                    isValid: false,
                };
            }
            const discountData = discount.get({ plain: true });
            const now = new Date();
            ctx === null || ctx === void 0 ? void 0 : ctx.step("Checking discount validity dates");
            if (discountData.validUntil && new Date(discountData.validUntil) < now) {
                ctx === null || ctx === void 0 ? void 0 : ctx.fail("Discount code has expired");
                return {
                    error: "This discount code has expired",
                    isValid: false,
                };
            }
            if (discountData.validFrom && new Date(discountData.validFrom) > now) {
                ctx === null || ctx === void 0 ? void 0 : ctx.fail("Discount code is not yet active");
                return {
                    error: "This discount code is not yet active",
                    isValid: false,
                };
            }
            ctx === null || ctx === void 0 ? void 0 : ctx.step("Checking user usage history");
            const existingUse = await db_1.models.ecommerceUserDiscount.findOne({
                where: {
                    userId: user.id,
                    discountId: discountData.id,
                    status: true,
                },
                transaction,
            });
            if (existingUse) {
                ctx === null || ctx === void 0 ? void 0 : ctx.fail("User has already used this discount code");
                return {
                    error: "You have already used this discount code",
                    isValid: false,
                };
            }
            ctx === null || ctx === void 0 ? void 0 : ctx.step("Checking usage limits");
            if (discountData.maxUses && discountData.maxUses > 0) {
                const usageCount = await db_1.models.ecommerceUserDiscount.count({
                    where: {
                        discountId: discountData.id,
                        status: true,
                    },
                    transaction,
                });
                if (usageCount >= discountData.maxUses) {
                    ctx === null || ctx === void 0 ? void 0 : ctx.fail("Discount code has reached usage limit");
                    return {
                        error: "This discount code has reached its usage limit",
                        isValid: false,
                    };
                }
            }
            let message = "";
            const discountType = discountData.type || "PERCENTAGE";
            switch (discountType) {
                case "PERCENTAGE":
                    message = `${discountData.percentage}% discount applied!`;
                    break;
                case "FIXED":
                    message = `${discountData.amount} discount applied!`;
                    break;
                case "FREE_SHIPPING":
                    message = "Free shipping applied!";
                    break;
                default:
                    message = "Discount applied successfully!";
            }
            ctx === null || ctx === void 0 ? void 0 : ctx.success(`Discount code "${discountData.code}" validated successfully`);
            return {
                id: discountData.id,
                code: discountData.code,
                type: discountType,
                value: discountType === "PERCENTAGE" ? discountData.percentage : discountData.amount,
                productId: discountData.productId,
                message,
                isValid: true,
            };
        });
    }
    catch (error) {
        if (error.statusCode)
            throw error;
        console.error("Discount validation error:", error);
        throw (0, error_1.createError)({
            statusCode: 500,
            message: "Error validating discount code"
        });
    }
};
