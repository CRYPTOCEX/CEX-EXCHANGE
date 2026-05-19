"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const db_1 = require("@b/db");
const error_1 = require("@b/utils/error");
const console_1 = require("@b/utils/console");
const isomorphic_dompurify_1 = __importDefault(require("isomorphic-dompurify"));
exports.metadata = {
    summary: "Update NFT creator profile",
    operationId: "updateNftCreatorProfile",
    tags: ["NFT", "Creator", "Profile"],
    logModule: "NFT",
    logTitle: "Update creator profile",
    requiresAuth: true,
    requestBody: {
        required: true,
        content: {
            "application/json": {
                schema: {
                    type: "object",
                    properties: {
                        displayName: { type: "string", maxLength: 100 },
                        bio: { type: "string", maxLength: 500 },
                        website: { type: "string", format: "uri" },
                        twitter: { type: "string", maxLength: 100 },
                        instagram: { type: "string", maxLength: 100 },
                        discord: { type: "string", maxLength: 100 },
                        bannerImage: { type: "string", format: "uri" }
                    }
                }
            }
        }
    },
    responses: {
        200: { description: "Profile updated successfully" },
        400: { description: "Invalid request" },
        401: { description: "Unauthorized" },
        404: { description: "Creator profile not found" },
        500: { description: "Internal Server Error" }
    }
};
const validateProfileData = (data) => {
    const errors = [];
    if (data.displayName && (typeof data.displayName !== 'string' || data.displayName.length > 100)) {
        errors.push('Display name must be a string with max 100 characters');
    }
    if (data.bio && (typeof data.bio !== 'string' || data.bio.length > 500)) {
        errors.push('Bio must be a string with max 500 characters');
    }
    if (data.website && typeof data.website !== 'string') {
        errors.push('Website must be a valid URL');
    }
    if (data.twitter && (typeof data.twitter !== 'string' || data.twitter.length > 100)) {
        errors.push('Twitter must be a string with max 100 characters');
    }
    if (data.instagram && (typeof data.instagram !== 'string' || data.instagram.length > 100)) {
        errors.push('Instagram must be a string with max 100 characters');
    }
    if (data.discord && (typeof data.discord !== 'string' || data.discord.length > 100)) {
        errors.push('Discord must be a string with max 100 characters');
    }
    if (data.bannerImage && typeof data.bannerImage !== 'string') {
        errors.push('Banner image must be a valid URL');
    }
    return errors;
};
exports.default = async (data) => {
    const { body, user, ctx } = data;
    if (!(user === null || user === void 0 ? void 0 : user.id)) {
        throw (0, error_1.createError)({
            statusCode: 401,
            message: "Authentication required"
        });
    }
    try {
        const validationErrors = validateProfileData(body);
        if (validationErrors.length > 0) {
            throw (0, error_1.createError)({
                statusCode: 400,
                message: `Validation error: ${validationErrors[0]}`
            });
        }
        const value = body;
        const sanitizedData = {};
        if (value.displayName)
            sanitizedData.displayName = isomorphic_dompurify_1.default.sanitize(value.displayName);
        if (value.bio)
            sanitizedData.bio = isomorphic_dompurify_1.default.sanitize(value.bio);
        if (value.website)
            sanitizedData.website = value.website;
        if (value.twitter)
            sanitizedData.twitter = isomorphic_dompurify_1.default.sanitize(value.twitter);
        if (value.instagram)
            sanitizedData.instagram = isomorphic_dompurify_1.default.sanitize(value.instagram);
        if (value.discord)
            sanitizedData.discord = isomorphic_dompurify_1.default.sanitize(value.discord);
        if (value.bannerImage)
            sanitizedData.bannerImage = value.bannerImage;
        ctx === null || ctx === void 0 ? void 0 : ctx.step("Updating creator profile");
        const [creatorProfile, created] = await db_1.models.nftCreator.findOrCreate({
            where: { userId: user.id },
            defaults: {
                userId: user.id,
                displayName: user.firstName + ' ' + user.lastName,
                ...sanitizedData
            }
        });
        if (!created) {
            await creatorProfile.update(sanitizedData);
        }
        const updatedProfile = await db_1.models.nftCreator.findOne({
            where: { userId: user.id },
            include: [{
                    model: db_1.models.user,
                    as: 'user',
                    attributes: ['id', 'firstName', 'lastName', 'avatar', 'email']
                }]
        });
        ctx === null || ctx === void 0 ? void 0 : ctx.success("Creator profile updated successfully");
        return {
            message: "Profile updated successfully",
            data: updatedProfile === null || updatedProfile === void 0 ? void 0 : updatedProfile.toJSON()
        };
    }
    catch (error) {
        ctx === null || ctx === void 0 ? void 0 : ctx.fail(`Failed to update profile: ${error.message}`);
        console_1.logger.error("NFT", "Failed to update creator profile", error);
        if (error.statusCode) {
            throw error;
        }
        throw (0, error_1.createError)({
            statusCode: 500,
            message: "Failed to update creator profile"
        });
    }
};
