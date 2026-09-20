"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const db_1 = require("@b/db");
const error_1 = require("@b/utils/error");
const errors_1 = require("@b/utils/schema/errors");
exports.metadata = {
    summary: "Update NFT creator profile and verification status",
    operationId: "updateNftCreator",
    tags: ["Admin", "NFT", "Creator"],
    description: "Update an NFT creator's profile information, verification status, and tier. Setting a verification tier automatically enables verification. Returns the updated creator data.",
    logModule: "ADMIN_NFT",
    logTitle: "Update NFT creator",
    requestBody: {
        required: true,
        content: {
            "application/json": {
                schema: {
                    type: "object",
                    properties: {
                        id: {
                            type: "string",
                            format: "uuid",
                            description: "Creator ID to update",
                        },
                        isVerified: {
                            type: "boolean",
                            description: "Verification status",
                        },
                        verificationTier: {
                            type: "string",
                            enum: ["BRONZE", "SILVER", "GOLD", "PLATINUM"],
                            description: "Verification tier (automatically sets isVerified to true)",
                        },
                        displayName: {
                            type: "string",
                            description: "Creator display name",
                        },
                        bio: {
                            type: "string",
                            description: "Creator biography",
                        },
                        avatar: {
                            type: "string",
                            description: "Avatar image URL",
                        },
                        banner: {
                            type: "string",
                            description: "Banner image URL",
                        },
                        website: {
                            type: "string",
                            description: "Website URL",
                        },
                        twitter: {
                            type: "string",
                            description: "Twitter profile URL",
                        },
                        discord: {
                            type: "string",
                            description: "Discord server URL",
                        },
                        instagram: {
                            type: "string",
                            description: "Instagram profile URL",
                        },
                    },
                    required: ["id"],
                },
            },
        },
    },
    responses: {
        200: {
            description: "Creator updated successfully",
            content: {
                "application/json": {
                    schema: {
                        type: "object",
                        properties: {
                            message: { type: "string" },
                            data: {
                                type: "object",
                                properties: {
                                    id: { type: "string", format: "uuid" },
                                    userId: { type: "string", format: "uuid" },
                                    displayName: { type: "string", nullable: true },
                                    bio: { type: "string", nullable: true },
                                    banner: { type: "string", nullable: true },
                                    isVerified: { type: "boolean" },
                                    verificationTier: {
                                        type: "string",
                                        enum: ["BRONZE", "SILVER", "GOLD", "PLATINUM"],
                                        nullable: true,
                                    },
                                    totalSales: { type: "integer" },
                                    totalVolume: { type: "number" },
                                    totalItems: { type: "integer" },
                                    floorPrice: { type: "number", nullable: true },
                                    profilePublic: { type: "boolean" },
                                    createdAt: { type: "string", format: "date-time" },
                                    updatedAt: { type: "string", format: "date-time" },
                                },
                            },
                        },
                    },
                },
            },
        },
        400: errors_1.badRequestResponse,
        401: errors_1.unauthorizedResponse,
        404: (0, errors_1.notFoundResponse)("Creator"),
        500: errors_1.serverErrorResponse,
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
        ctx === null || ctx === void 0 ? void 0 : ctx.step("Fetching creator");
        const creator = await db_1.models.nftCreator.findByPk(id);
        if (!creator) {
            ctx === null || ctx === void 0 ? void 0 : ctx.fail("Creator not found");
            throw (0, error_1.createError)({ statusCode: 404, message: "Creator not found" });
        }
        if (updateData.verificationTier && !updateData.isVerified) {
            ctx === null || ctx === void 0 ? void 0 : ctx.step("Auto-enabling verification with tier");
            updateData.isVerified = true;
        }
        ctx === null || ctx === void 0 ? void 0 : ctx.step("Updating creator");
        const updatedCreator = await creator.update(updateData);
        ctx === null || ctx === void 0 ? void 0 : ctx.success(`Creator '${updatedCreator.displayName}' updated successfully`);
        return {
            message: "Creator updated successfully",
            data: updatedCreator
        };
    }
    catch (error) {
        if (error.statusCode)
            throw error;
        ctx === null || ctx === void 0 ? void 0 : ctx.fail(error.message || "Failed to update creator");
        throw (0, error_1.createError)({
            statusCode: 500,
            message: error.message || "Failed to update creator",
        });
    }
};
