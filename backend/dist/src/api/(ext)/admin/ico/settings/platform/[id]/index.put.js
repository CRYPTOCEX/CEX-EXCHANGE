"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const db_1 = require("@b/db");
const error_1 = require("@b/utils/error");
const errors_1 = require("@b/utils/schema/errors");
exports.metadata = {
    summary: "Update ICO Platform Settings",
    description: "Updates ICO platform settings using upsert. Only provided fields will be updated, allowing partial updates of platform configuration.",
    operationId: "updateIcoPlatformSettings",
    tags: ["Admin", "ICO", "Settings"],
    requestBody: {
        required: true,
        content: {
            "application/json": {
                schema: {
                    type: "object",
                    properties: {
                        minInvestmentAmount: { type: "number", description: "Minimum investment amount" },
                        maxInvestmentAmount: { type: "number", description: "Maximum investment amount" },
                        platformFeePercentage: { type: "number", description: "Platform fee percentage" },
                        kycRequired: { type: "boolean", description: "KYC requirement flag" },
                        maintenanceMode: { type: "boolean", description: "Maintenance mode flag" },
                        allowPublicOfferings: { type: "boolean", description: "Allow public offerings flag" },
                        announcementMessage: { type: "string", description: "Announcement message" },
                        announcementActive: { type: "boolean", description: "Announcement active flag" },
                    },
                },
            },
        },
    },
    responses: {
        200: {
            description: "Platform settings updated successfully",
            content: {
                "application/json": {
                    schema: {
                        type: "object",
                        properties: {
                            message: { type: "string" },
                        },
                    },
                },
            },
        },
        400: errors_1.badRequestResponse,
        401: errors_1.unauthorizedResponse,
        500: errors_1.serverErrorResponse,
    },
    requiresAuth: true,
    permission: "edit.ico.settings",
    logModule: "ADMIN_ICO",
    logTitle: "Update platform settings",
};
exports.default = async (data) => {
    const { user, body, ctx } = data;
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Validating user permissions");
    if (!(user === null || user === void 0 ? void 0 : user.id)) {
        ctx === null || ctx === void 0 ? void 0 : ctx.fail("Unauthorized access");
        throw (0, error_1.createError)({ statusCode: 401, message: "Unauthorized" });
    }
    const { minInvestmentAmount, maxInvestmentAmount, platformFeePercentage, kycRequired, maintenanceMode, allowPublicOfferings, announcementMessage, announcementActive, } = body;
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Preparing platform settings updates");
    const updates = [
        { key: 'icoPlatformMinInvestmentAmount', value: minInvestmentAmount === null || minInvestmentAmount === void 0 ? void 0 : minInvestmentAmount.toString() },
        { key: 'icoPlatformMaxInvestmentAmount', value: maxInvestmentAmount === null || maxInvestmentAmount === void 0 ? void 0 : maxInvestmentAmount.toString() },
        { key: 'icoPlatformFeePercentage', value: platformFeePercentage === null || platformFeePercentage === void 0 ? void 0 : platformFeePercentage.toString() },
        { key: 'icoPlatformKycRequired', value: kycRequired === null || kycRequired === void 0 ? void 0 : kycRequired.toString() },
        { key: 'icoPlatformMaintenanceMode', value: maintenanceMode === null || maintenanceMode === void 0 ? void 0 : maintenanceMode.toString() },
        { key: 'icoPlatformAllowPublicOfferings', value: allowPublicOfferings === null || allowPublicOfferings === void 0 ? void 0 : allowPublicOfferings.toString() },
        { key: 'icoPlatformAnnouncementMessage', value: announcementMessage },
        { key: 'icoPlatformAnnouncementActive', value: announcementActive === null || announcementActive === void 0 ? void 0 : announcementActive.toString() },
    ].filter(update => update.value !== undefined);
    ctx === null || ctx === void 0 ? void 0 : ctx.step(`Updating ${updates.length} platform settings`);
    for (const update of updates) {
        await db_1.models.settings.upsert({
            key: update.key,
            value: update.value,
        });
    }
    ctx === null || ctx === void 0 ? void 0 : ctx.success("Platform settings updated successfully");
    return { message: "Platform settings updated successfully" };
};
