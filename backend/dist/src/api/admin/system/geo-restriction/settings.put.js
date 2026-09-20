"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const db_1 = require("@b/db");
const cache_1 = require("@b/utils/cache");
const error_1 = require("@b/utils/error");
const console_1 = require("@b/utils/console");
const geo_1 = require("@b/utils/geo");
const query_1 = require("@b/utils/query");
const settings_validate_1 = require("./settings-validate");
exports.metadata = {
    summary: "Updates the geographic restriction policy",
    operationId: "updateGeoRestrictionSettings",
    tags: ["Admin", "Geo Restrictions"],
    requestBody: {
        required: true,
        content: {
            "application/json": {
                schema: {
                    type: "object",
                    description: "Geo policy key/value pairs to update. Pass force: true to " +
                        "acknowledge overridable lockout warnings.",
                },
            },
        },
    },
    responses: {
        200: {
            description: "Policy updated successfully",
            content: {
                "application/json": {
                    schema: {
                        type: "object",
                        properties: {
                            message: { type: "string" },
                            warnings: { type: "array", items: { type: "object" } },
                        },
                    },
                },
            },
        },
        401: query_1.unauthorizedResponse,
        500: query_1.serverErrorResponse,
    },
    requiresAuth: true,
    permission: "edit.geo.restriction",
    logModule: "GEO",
    logTitle: "Update geo restriction policy",
};
exports.default = async (data) => {
    var _a;
    const { body, user, ctx } = data;
    const before = (0, geo_1.getPolicy)();
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Validating policy values");
    const { updates, force } = (0, settings_validate_1.validateGeoSettingsBody)(body);
    if (!Object.keys(updates).length) {
        return { message: "No changes to apply" };
    }
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Checking the change for lockouts");
    const { preflight } = await (0, settings_validate_1.projectGeoPolicy)(before, updates, data);
    const blocking = (0, geo_1.preflightBlocksSave)(preflight, force);
    if (blocking.length) {
        const overridable = blocking.every((f) => f.forceable);
        ctx === null || ctx === void 0 ? void 0 : ctx.fail(blocking[0].title);
        console_1.logger.warn("GEO", "Refused a policy save that would have locked the platform out: " +
            blocking.map((f) => f.code).join(", "));
        throw (0, error_1.createError)({
            statusCode: 400,
            message: (0, geo_1.formatPreflightRefusal)(blocking, overridable),
        });
    }
    if (force && preflight.lockouts.length) {
        console_1.logger.warn("GEO", `Administrator ${user === null || user === void 0 ? void 0 : user.id} overrode geo lockout warnings: ` +
            preflight.lockouts.map((f) => f.code).join(", "));
        ctx === null || ctx === void 0 ? void 0 : ctx.step(`Overriding ${preflight.lockouts.length} lockout warning(s) on explicit confirmation`, "warn");
    }
    const disabling = updates[geo_1.GEO_SETTING_KEYS.enabled] === "false" && before.enabled === true;
    if (disabling) {
        ctx === null || ctx === void 0 ? void 0 : ctx.step("Verifying Super Admin privileges to disable enforcement");
        const actor = await db_1.models.user.findByPk(user === null || user === void 0 ? void 0 : user.id, {
            include: [{ model: db_1.models.role, as: "role" }],
        });
        if (!(actor === null || actor === void 0 ? void 0 : actor.role) || actor.role.name !== "Super Admin") {
            ctx === null || ctx === void 0 ? void 0 : ctx.fail("Only a Super Admin can disable geographic restrictions");
            throw (0, error_1.createError)({
                statusCode: 403,
                message: "Only a Super Admin can switch off geographic restrictions. Retire the individual country rules instead if you need a narrower change.",
            });
        }
    }
    ctx === null || ctx === void 0 ? void 0 : ctx.step(`Saving ${Object.keys(updates).length} policy settings`);
    await Promise.all(Object.entries(updates).map(([key, value]) => db_1.models.settings.upsert({ key, value })));
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Clearing settings cache");
    await cache_1.CacheManager.getInstance().clearCache();
    const overrides = (0, geo_1.getEmergencyOverrides)();
    if (overrides.active) {
        ctx === null || ctx === void 0 ? void 0 : ctx.step(`Releasing the automatic safety override (${(_a = overrides.reason) !== null && _a !== void 0 ? _a : "unknown reason"})`, "warn");
        (0, geo_1.clearEmergencyOverrides)();
    }
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Reloading enforcement policy");
    await (0, geo_1.reloadGeoRestrictions)();
    const after = (0, geo_1.getPolicy)();
    if (before.enabled !== after.enabled) {
        ctx === null || ctx === void 0 ? void 0 : ctx.step(`Geographic restrictions ${after.enabled ? "ENABLED" : "DISABLED"}`, after.enabled ? "success" : "warn");
    }
    ctx === null || ctx === void 0 ? void 0 : ctx.success("Geographic restriction policy updated");
    return {
        message: "Geographic restriction policy updated successfully",
        warnings: preflight.warnings,
        detection: (0, geo_1.getDetectionHealth)().evidence,
    };
};
