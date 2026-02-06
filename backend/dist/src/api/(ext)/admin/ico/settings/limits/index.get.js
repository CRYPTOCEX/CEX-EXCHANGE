"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const db_1 = require("@b/db");
const error_1 = require("@b/utils/error");
const errors_1 = require("@b/utils/schema/errors");
exports.metadata = {
    summary: "Get ICO Investment Limits",
    description: "Retrieves the current ICO investment limit settings including min/max investment amounts, soft cap percentage, vesting configuration, and refund grace period.",
    operationId: "getIcoInvestmentLimits",
    tags: ["Admin", "ICO", "Settings"],
    requiresAuth: true,
    requiresAdmin: true,
    responses: {
        200: {
            description: "ICO limits retrieved successfully",
            content: {
                "application/json": {
                    schema: {
                        type: "object",
                        properties: {
                            minInvestment: { type: "number", description: "Minimum investment amount" },
                            maxInvestment: { type: "number", description: "Maximum investment amount" },
                            maxPerUser: { type: "number", description: "Maximum investment per user" },
                            softCapPercentage: { type: "number", description: "Soft cap percentage threshold" },
                            refundGracePeriod: { type: "number", description: "Refund grace period in days" },
                            vestingEnabled: { type: "boolean", description: "Whether token vesting is enabled" },
                            defaultVestingMonths: { type: "number", description: "Default vesting period in months" },
                        },
                    },
                },
            },
        },
        401: errors_1.unauthorizedResponse,
        403: errors_1.forbiddenResponse,
        500: errors_1.serverErrorResponse,
    },
    logModule: "ADMIN_ICO",
    logTitle: "Get ICO limits",
};
exports.default = async (data) => {
    var _a, _b;
    const { user, ctx } = data;
    if (!(user === null || user === void 0 ? void 0 : user.id)) {
        ctx === null || ctx === void 0 ? void 0 : ctx.fail("Authentication required");
        throw (0, error_1.createError)({
            statusCode: 401,
            message: "Authentication required"
        });
    }
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Checking admin privileges");
    const fullUser = await db_1.models.user.findByPk(user.id, {
        include: [{ model: db_1.models.role, as: "role" }]
    });
    if (!fullUser || (((_a = fullUser.role) === null || _a === void 0 ? void 0 : _a.name) !== 'admin' && ((_b = fullUser.role) === null || _b === void 0 ? void 0 : _b.name) !== 'super_admin')) {
        ctx === null || ctx === void 0 ? void 0 : ctx.fail("Admin privileges required");
        throw (0, error_1.createError)({
            statusCode: 403,
            message: "Admin privileges required"
        });
    }
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Fetching ICO limit settings");
    const settingKeys = [
        'icoMinInvestment',
        'icoMaxInvestment',
        'icoMaxPerUser',
        'icoSoftCapPercentage',
        'icoRefundGracePeriod',
        'icoVestingEnabled',
        'icoDefaultVestingMonths',
    ];
    const settings = await db_1.models.settings.findAll({
        where: { key: settingKeys },
    });
    const settingsMap = settings.reduce((acc, setting) => {
        acc[setting.key] = setting.value;
        return acc;
    }, {});
    ctx === null || ctx === void 0 ? void 0 : ctx.success("ICO limits retrieved successfully");
    return {
        minInvestment: parseFloat(settingsMap.icoMinInvestment || '10'),
        maxInvestment: parseFloat(settingsMap.icoMaxInvestment || '100000'),
        maxPerUser: parseFloat(settingsMap.icoMaxPerUser || '50000'),
        softCapPercentage: parseFloat(settingsMap.icoSoftCapPercentage || '30'),
        refundGracePeriod: parseInt(settingsMap.icoRefundGracePeriod || '7'),
        vestingEnabled: settingsMap.icoVestingEnabled === 'true',
        defaultVestingMonths: parseInt(settingsMap.icoDefaultVestingMonths || '12'),
    };
};
