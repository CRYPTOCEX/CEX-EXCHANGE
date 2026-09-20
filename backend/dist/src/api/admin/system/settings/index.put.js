"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = exports.PROTECTED_SETTING_KEYS = void 0;
const db_1 = require("@b/db");
const cache_1 = require("@b/utils/cache");
const error_1 = require("@b/utils/error");
const geo_1 = require("@b/utils/geo");
const protected_settings_1 = require("@b/utils/protected-settings");
Object.defineProperty(exports, "PROTECTED_SETTING_KEYS", { enumerable: true, get: function () { return protected_settings_1.PROTECTED_SETTING_KEYS; } });
const PROTECTED_SETTING_KEYS_LOWER = new Set(protected_settings_1.PROTECTED_SETTING_KEYS.map((key) => key.toLowerCase()));
const RESERVED_SETTING_KEYS = new Map([
    [cache_1.CacheManager.VERSION_KEY.toLowerCase(), "the settings cache version stamp"],
    ["poolbackingenginestate", "the pool-backing engine's last-cycle memo"],
    ["poolbackingattributedthrough", "the pool-backing attribution job's high-water mark"],
    ["poolbackingvenuefeesthrough", "the pool-backing venue-fee job's high-water mark"],
]);
const CONSOLE_OWNED_SETTING_KEYS = new Map([
    ["dexallowlistmode", "Web3 Trading → Settings → Safety"],
    ["dexkycrequired", "Web3 Trading → Settings → Safety"],
    ["investmentgeoblocklist", "Finance → Investment → Compliance"],
    ["investmentriskacknowledgement", "Finance → Investment → Compliance"],
    ["stakingmode", "Staking → Settings"],
    ["stakingdefaultadminfee", "Staking → Settings"],
    ["stakingdefaultearlywithdrawalfee", "Staking → Settings"],
    ["stakingautocompounddefault", "Staking → Settings"],
    ["stakingminimumwithdrawalamount", "Staking → Settings"],
    ["stakingautomaticearningsdistribution", "Staking → Settings"],
    ["stakingrequirewithdrawalapproval", "Staking → Settings"],
    ["stakingautoapprovewithdrawalmaxamount", "Staking → Settings"],
    ["stakingautoapprovewithdrawalafterhours", "Staking → Settings"],
    ["stakingdefaultaprcalculationmethod", "Staking → Settings"],
    ["stakingearningsdistributiontime", "Staking → Settings"],
    ["stakingsyntheticgeoblocklist", "Staking → Settings → Compliance"],
    ["stakingsyntheticriskacknowledgement", "Staking → Settings → Compliance"],
]);
const WITHDRAW_AUTO_APPROVE_KEY = "withdrawAutoApprove";
const WITHDRAW_APPROVAL_LEGACY_KEY = "withdrawApproval";
const VALID_SETTING_KEY = /^[A-Za-z0-9_][A-Za-z0-9_.:-]{0,254}$/;
const MAX_SETTING_VALUE_LENGTH = 1000000;
exports.metadata = {
    summary: "Updates application settings",
    operationId: "updateApplicationSettings",
    tags: ["Admin", "Settings"],
    skipBodyValidation: true,
    requestBody: {
        required: true,
        content: {
            "application/json": {
                schema: {
                    type: "object",
                    properties: {
                        data: {
                            type: "object",
                            description: "Settings data to update",
                        },
                    },
                },
            },
        },
    },
    responses: {
        200: {
            description: "Settings updated successfully",
            content: {
                "application/json": {
                    schema: {
                        type: "object",
                        properties: {
                            message: {
                                type: "string",
                                description: "Confirmation message indicating successful update",
                            },
                        },
                    },
                },
            },
        },
        401: {
            description: "Unauthorized, admin permission required",
        },
        500: {
            description: "Internal server error",
        },
    },
    permission: "edit.settings",
    requiresAuth: true,
    logModule: "SETTINGS",
    logTitle: "Update application settings",
};
exports.default = async (data) => {
    var _a, _b;
    const { body, user, ctx } = data;
    if (!body || typeof body !== "object" || Array.isArray(body)) {
        throw (0, error_1.createError)({
            statusCode: 400,
            message: "Request body must be an object of setting key/value pairs",
        });
    }
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Loading existing settings");
    const existingSettings = await db_1.models.settings.findAll();
    const existingByLowerKey = new Map(existingSettings.map((setting) => [
        setting.key.toLowerCase(),
        { key: setting.key, value: setting.value },
    ]));
    let isSuperAdmin = null;
    const requireSuperAdmin = async (key) => {
        if (isSuperAdmin === null) {
            const userPk = await db_1.models.user.findByPk(user === null || user === void 0 ? void 0 : user.id, {
                include: [{ model: db_1.models.role, as: "role" }],
            });
            isSuperAdmin = !!(userPk === null || userPk === void 0 ? void 0 : userPk.role) && userPk.role.name === "Super Admin";
        }
        if (!isSuperAdmin) {
            ctx === null || ctx === void 0 ? void 0 : ctx.fail(`Protected setting "${key}" requires Super Admin`);
            throw (0, error_1.createError)({
                statusCode: 403,
                message: `Only a Super Admin can change the "${key}" setting`,
            });
        }
    };
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Validating settings data");
    const validUpdates = {};
    let skippedCount = 0;
    let unchangedCount = 0;
    let createdCount = 0;
    for (const [key, value] of Object.entries(body)) {
        if (key === "settings" || key === "extensions") {
            skippedCount++;
            continue;
        }
        let stringValue = "";
        if (value === null || value === "null" || value === undefined) {
            stringValue = "";
        }
        else if (typeof value === "object") {
            stringValue = JSON.stringify(value);
        }
        else {
            stringValue = String(value);
        }
        if (stringValue.length > MAX_SETTING_VALUE_LENGTH) {
            throw (0, error_1.createError)({
                statusCode: 400,
                message: `Setting "${key}" value is too large`,
            });
        }
        const existing = existingByLowerKey.get(key.toLowerCase());
        if (existing && ((_a = existing.value) !== null && _a !== void 0 ? _a : "") === stringValue) {
            unchangedCount++;
            continue;
        }
        if ((0, geo_1.isGeoSettingKey)(key)) {
            throw (0, error_1.createError)({
                statusCode: 403,
                message: `"${key}" is a geographic restriction control and can only be changed from Geo Restrictions → Policy`,
            });
        }
        const consoleOwner = CONSOLE_OWNED_SETTING_KEYS.get(key.toLowerCase());
        if (consoleOwner) {
            throw (0, error_1.createError)({
                statusCode: 403,
                message: `"${key}" is configured in ${consoleOwner}, which validates it. Nothing on this page was saved.`,
            });
        }
        const reservedAs = RESERVED_SETTING_KEYS.get(key.toLowerCase());
        if (reservedAs) {
            throw (0, error_1.createError)({
                statusCode: 400,
                message: `"${key}" is ${reservedAs}, written by the platform for itself; it is not a setting and cannot be set here`,
            });
        }
        if (PROTECTED_SETTING_KEYS_LOWER.has(key.toLowerCase())) {
            await requireSuperAdmin(key);
        }
        if (!existing) {
            if (!VALID_SETTING_KEY.test(key)) {
                throw (0, error_1.createError)({
                    statusCode: 400,
                    message: `Invalid setting key: ${key}`,
                });
            }
            createdCount++;
        }
        validUpdates[existing ? existing.key : key] = stringValue;
    }
    const autoApproveWrite = Object.entries(validUpdates).find(([key]) => key.toLowerCase() === WITHDRAW_AUTO_APPROVE_KEY.toLowerCase());
    if (autoApproveWrite) {
        const legacy = existingByLowerKey.get(WITHDRAW_APPROVAL_LEGACY_KEY.toLowerCase());
        const legacyKey = legacy ? legacy.key : WITHDRAW_APPROVAL_LEGACY_KEY;
        const value = autoApproveWrite[1];
        if (((_b = legacy === null || legacy === void 0 ? void 0 : legacy.value) !== null && _b !== void 0 ? _b : null) !== value) {
            if (!legacy && !(legacyKey in validUpdates))
                createdCount++;
            validUpdates[legacyKey] = value;
            ctx === null || ctx === void 0 ? void 0 : ctx.step(`Mirrored "${WITHDRAW_AUTO_APPROVE_KEY}" into the legacy "${WITHDRAW_APPROVAL_LEGACY_KEY}" row`);
        }
        else {
            delete validUpdates[legacyKey];
        }
    }
    if (skippedCount > 0) {
        ctx === null || ctx === void 0 ? void 0 : ctx.warn(`Skipped ${skippedCount} problematic setting keys`);
    }
    if (unchangedCount > 0) {
        ctx === null || ctx === void 0 ? void 0 : ctx.step(`Ignored ${unchangedCount} unchanged settings`);
    }
    const updateCount = Object.keys(validUpdates).length;
    ctx === null || ctx === void 0 ? void 0 : ctx.step(`Processing ${updateCount} settings`);
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Applying settings updates");
    await Promise.all(Object.entries(validUpdates).map(([key, value]) => db_1.models.settings.upsert({ key, value })));
    if (createdCount > 0) {
        ctx === null || ctx === void 0 ? void 0 : ctx.step(`Created ${createdCount} new settings`, "success");
    }
    if (updateCount - createdCount > 0) {
        ctx === null || ctx === void 0 ? void 0 : ctx.step(`Updated ${updateCount - createdCount} existing settings`, "success");
    }
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Clearing settings cache");
    const cacheManager = cache_1.CacheManager.getInstance();
    await cacheManager.clearCache();
    ctx === null || ctx === void 0 ? void 0 : ctx.success(`${updateCount} settings saved successfully`);
    return {
        message: "Settings updated successfully",
    };
};
