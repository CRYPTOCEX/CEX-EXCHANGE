"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const db_1 = require("@b/db");
const error_1 = require("@b/utils/error");
const errors_1 = require("@b/utils/schema/errors");
exports.metadata = {
    summary: "Get ICO Platform Settings",
    description: "Retrieves ICO platform-wide settings including investment limits, fees, KYC requirements, maintenance mode, and announcement configuration.",
    operationId: "getIcoPlatformSettings",
    tags: ["Admin", "ICO", "Settings"],
    requiresAuth: true,
    responses: {
        200: {
            description: "Platform settings retrieved successfully",
            content: {
                "application/json": {
                    schema: {
                        type: "object",
                        properties: {
                            minInvestmentAmount: { type: "number", description: "Minimum platform investment amount" },
                            maxInvestmentAmount: { type: "number", description: "Maximum platform investment amount" },
                            platformFeePercentage: { type: "number", description: "Platform fee percentage" },
                            kycRequired: { type: "boolean", description: "Whether KYC is required" },
                            maintenanceMode: { type: "boolean", description: "Whether platform is in maintenance mode" },
                            allowPublicOfferings: { type: "boolean", description: "Whether public offerings are allowed" },
                            announcementMessage: { type: "string", description: "Platform announcement message" },
                            announcementActive: { type: "boolean", description: "Whether announcement is active" },
                        },
                    },
                },
            },
        },
        401: errors_1.unauthorizedResponse,
        500: errors_1.serverErrorResponse,
    },
    permission: "view.ico.settings",
    logModule: "ADMIN_ICO",
    logTitle: "Get platform settings",
};
exports.default = async (data) => {
    const { user, ctx } = data;
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Validating user permissions");
    if (!(user === null || user === void 0 ? void 0 : user.id)) {
        ctx === null || ctx === void 0 ? void 0 : ctx.fail("Unauthorized access");
        throw (0, error_1.createError)({
            statusCode: 401,
            message: "Unauthorized: Admin privileges required.",
        });
    }
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Fetching platform settings");
    const settingKeys = [
        'icoPlatformMinInvestmentAmount',
        'icoPlatformMaxInvestmentAmount',
        'icoPlatformFeePercentage',
        'icoPlatformKycRequired',
        'icoPlatformMaintenanceMode',
        'icoPlatformAllowPublicOfferings',
        'icoPlatformAnnouncementMessage',
        'icoPlatformAnnouncementActive',
    ];
    const settings = await db_1.models.settings.findAll({
        where: { key: settingKeys },
    });
    const settingsMap = settings.reduce((acc, setting) => {
        acc[setting.key] = setting.value;
        return acc;
    }, {});
    ctx === null || ctx === void 0 ? void 0 : ctx.success("Platform settings retrieved successfully");
    return {
        minInvestmentAmount: parseFloat(settingsMap.icoPlatformMinInvestmentAmount || '0'),
        maxInvestmentAmount: parseFloat(settingsMap.icoPlatformMaxInvestmentAmount || '0'),
        platformFeePercentage: parseFloat(settingsMap.icoPlatformFeePercentage || '0'),
        kycRequired: settingsMap.icoPlatformKycRequired === 'true',
        maintenanceMode: settingsMap.icoPlatformMaintenanceMode === 'true',
        allowPublicOfferings: settingsMap.icoPlatformAllowPublicOfferings === 'true',
        announcementMessage: settingsMap.icoPlatformAnnouncementMessage || '',
        announcementActive: settingsMap.icoPlatformAnnouncementActive === 'true',
    };
};
