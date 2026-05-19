"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const db_1 = require("@b/db");
const cache_1 = require("@b/utils/cache");
exports.metadata = {
    summary: "Updates application settings",
    operationId: "updateApplicationSettings",
    tags: ["Admin", "Settings"],
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
    const { body, ctx } = data;
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Validating settings data");
    const validUpdates = {};
    let skippedCount = 0;
    Object.entries(body).forEach(([key, value]) => {
        if (key === "settings" || key === "extensions") {
            skippedCount++;
            return;
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
        validUpdates[key] = stringValue;
    });
    if (skippedCount > 0) {
        ctx === null || ctx === void 0 ? void 0 : ctx.warn(`Skipped ${skippedCount} problematic setting keys`);
    }
    const updateCount = Object.keys(validUpdates).length;
    ctx === null || ctx === void 0 ? void 0 : ctx.step(`Processing ${updateCount} settings`);
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Loading existing settings");
    const existingSettings = await db_1.models.settings.findAll();
    const existingKeys = existingSettings.map((setting) => setting.key);
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Applying settings updates");
    let updatedCount = 0;
    let createdCount = 0;
    const updates = Object.entries(validUpdates).map(async ([key, value]) => {
        if (existingKeys.includes(key)) {
            updatedCount++;
            return db_1.models.settings.update({ value }, { where: { key } });
        }
        else {
            createdCount++;
            return db_1.models.settings.create({ key, value });
        }
    });
    await Promise.all(updates);
    if (createdCount > 0) {
        ctx === null || ctx === void 0 ? void 0 : ctx.step(`Created ${createdCount} new settings`, "success");
    }
    if (updatedCount > 0) {
        ctx === null || ctx === void 0 ? void 0 : ctx.step(`Updated ${updatedCount} existing settings`, "success");
    }
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Clearing settings cache");
    const cacheManager = cache_1.CacheManager.getInstance();
    await cacheManager.clearCache();
    ctx === null || ctx === void 0 ? void 0 : ctx.success(`${updateCount} settings saved successfully`);
    return {
        message: "Settings updated successfully",
    };
};
