"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const db_1 = require("@b/db");
const error_1 = require("@b/utils/error");
exports.metadata = {
    summary: "Update NFT review (Admin)",
    operationId: "updateAdminNftReview",
    tags: ["Admin", "NFT", "Review"],
    logModule: "ADMIN_NFT",
    logTitle: "Update NFT review",
    requestBody: {
        required: true,
        content: {
            "application/json": {
                schema: {
                    type: "object",
                    properties: {
                        id: { type: "string" },
                        status: {
                            type: "string",
                            enum: ["PENDING", "APPROVED", "REJECTED", "HIDDEN"]
                        },
                        isVerified: { type: "boolean" },
                    },
                    required: ["id"],
                },
            },
        },
    },
    responses: {
        200: { description: "Review updated successfully" },
        400: { description: "Bad Request" },
        401: { description: "Unauthorized" },
        404: { description: "Review not found" },
        500: { description: "Internal Server Error" },
    },
    requiresAuth: true,
    permission: "edit.nft",
};
exports.default = async (data) => {
    const { user, body, ctx } = data;
    const { id, ...updateData } = body;
    if (!(user === null || user === void 0 ? void 0 : user.id)) {
        throw (0, error_1.createError)({ statusCode: 401, message: "Unauthorized" });
    }
    try {
        ctx === null || ctx === void 0 ? void 0 : ctx.step("Fetching review");
        const review = await db_1.models.nftReview.findByPk(id);
        if (!review) {
            ctx === null || ctx === void 0 ? void 0 : ctx.fail("Review not found");
            throw (0, error_1.createError)({ statusCode: 404, message: "Review not found" });
        }
        ctx === null || ctx === void 0 ? void 0 : ctx.step("Updating review");
        const updatedReview = await review.update(updateData);
        ctx === null || ctx === void 0 ? void 0 : ctx.success(`Review updated successfully (status: ${updatedReview.status})`);
        return {
            message: "Review updated successfully",
            data: updatedReview
        };
    }
    catch (error) {
        if (error.statusCode)
            throw error;
        ctx === null || ctx === void 0 ? void 0 : ctx.fail(error.message || "Failed to update review");
        throw (0, error_1.createError)({
            statusCode: 500,
            message: error.message || "Failed to update review",
        });
    }
};
