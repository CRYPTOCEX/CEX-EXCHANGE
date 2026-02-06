"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const db_1 = require("@b/db");
const error_1 = require("@b/utils/error");
const errors_1 = require("@b/utils/schema/errors");
exports.metadata = {
    summary: "Update ICO Investment Limits",
    description: "Updates the ICO investment limit settings with validation. Ensures min/max relationships are valid and soft cap percentage is within 0-100 range. Changes are logged in audit trail.",
    operationId: "updateIcoInvestmentLimits",
    tags: ["Admin", "ICO", "Settings"],
    requiresAuth: true,
    requiresAdmin: true,
    requestBody: {
        required: true,
        content: {
            "application/json": {
                schema: {
                    type: "object",
                    properties: {
                        minInvestment: { type: "number", minimum: 0, description: "Minimum investment amount" },
                        maxInvestment: { type: "number", minimum: 0, description: "Maximum investment amount" },
                        maxPerUser: { type: "number", minimum: 0, description: "Maximum investment per user" },
                        softCapPercentage: { type: "number", minimum: 0, maximum: 100, description: "Soft cap percentage" },
                        refundGracePeriod: { type: "number", minimum: 0, description: "Refund grace period in days" },
                        vestingEnabled: { type: "boolean", description: "Enable token vesting" },
                        defaultVestingMonths: { type: "number", minimum: 0, description: "Default vesting period in months" },
                    },
                },
            },
        },
    },
    responses: {
        200: {
            description: "ICO limits updated successfully",
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
        403: errors_1.forbiddenResponse,
        500: errors_1.serverErrorResponse,
    },
    logModule: "ADMIN_ICO",
    logTitle: "Update ICO limits",
};
exports.default = async (data) => {
    var _a, _b;
    const { user, body, ctx } = data;
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
    const { minInvestment, maxInvestment, maxPerUser, softCapPercentage, refundGracePeriod, vestingEnabled, defaultVestingMonths, } = body;
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Validating limit values");
    if (minInvestment !== undefined && minInvestment < 0) {
        ctx === null || ctx === void 0 ? void 0 : ctx.fail("Invalid minimum investment");
        throw (0, error_1.createError)({
            statusCode: 400,
            message: "Minimum investment cannot be negative"
        });
    }
    if (maxInvestment !== undefined && minInvestment !== undefined && maxInvestment < minInvestment) {
        ctx === null || ctx === void 0 ? void 0 : ctx.fail("Invalid max/min investment relationship");
        throw (0, error_1.createError)({
            statusCode: 400,
            message: "Maximum investment must be greater than minimum investment"
        });
    }
    if (softCapPercentage !== undefined && (softCapPercentage < 0 || softCapPercentage > 100)) {
        ctx === null || ctx === void 0 ? void 0 : ctx.fail("Invalid soft cap percentage");
        throw (0, error_1.createError)({
            statusCode: 400,
            message: "Soft cap percentage must be between 0 and 100"
        });
    }
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Starting database transaction");
    const transaction = await db_1.sequelize.transaction();
    try {
        ctx === null || ctx === void 0 ? void 0 : ctx.step("Updating limit settings");
        const updates = [
            { key: 'icoMinInvestment', value: minInvestment === null || minInvestment === void 0 ? void 0 : minInvestment.toString() },
            { key: 'icoMaxInvestment', value: maxInvestment === null || maxInvestment === void 0 ? void 0 : maxInvestment.toString() },
            { key: 'icoMaxPerUser', value: maxPerUser === null || maxPerUser === void 0 ? void 0 : maxPerUser.toString() },
            { key: 'icoSoftCapPercentage', value: softCapPercentage === null || softCapPercentage === void 0 ? void 0 : softCapPercentage.toString() },
            { key: 'icoRefundGracePeriod', value: refundGracePeriod === null || refundGracePeriod === void 0 ? void 0 : refundGracePeriod.toString() },
            { key: 'icoVestingEnabled', value: vestingEnabled === null || vestingEnabled === void 0 ? void 0 : vestingEnabled.toString() },
            { key: 'icoDefaultVestingMonths', value: defaultVestingMonths === null || defaultVestingMonths === void 0 ? void 0 : defaultVestingMonths.toString() },
        ].filter(update => update.value !== undefined);
        for (const update of updates) {
            await db_1.models.settings.upsert({
                key: update.key,
                value: update.value,
            }, { transaction });
        }
        ctx === null || ctx === void 0 ? void 0 : ctx.step("Creating audit log");
        await db_1.models.icoAdminActivity.create({
            type: "SETTINGS_UPDATED",
            offeringId: "00000000-0000-0000-0000-000000000000",
            offeringName: "ICO Limits",
            adminId: user.id,
            details: JSON.stringify({
                updates: updates.reduce((acc, u) => {
                    acc[u.key] = u.value;
                    return acc;
                }, {}),
            }),
        }, { transaction });
        await transaction.commit();
        ctx === null || ctx === void 0 ? void 0 : ctx.success("ICO limits updated successfully");
        return {
            message: "ICO limits updated successfully",
        };
    }
    catch (err) {
        await transaction.rollback();
        ctx === null || ctx === void 0 ? void 0 : ctx.fail("Transaction failed");
        throw err;
    }
};
