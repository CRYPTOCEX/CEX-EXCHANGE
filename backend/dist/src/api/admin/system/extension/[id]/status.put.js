"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const db_1 = require("@b/db");
const query_1 = require("@b/utils/query");
const cache_1 = require("@b/utils/cache");
const Middleware_1 = require("@b/handler/Middleware");
const console_1 = require("@b/utils/console");
const error_1 = require("@b/utils/error");
const extension_inflight_1 = require("@b/utils/extension-inflight");
const cron_1 = require("@b/cron");
exports.metadata = {
    summary: "Update Status for an Extension",
    operationId: "updateExtensionStatus",
    tags: ["Admin", "Extensions"],
    parameters: [
        {
            index: 0,
            name: "id",
            in: "path",
            required: true,
            description: "ID of the Extension to update",
            schema: { type: "string" },
        },
    ],
    requestBody: {
        required: true,
        content: {
            "application/json": {
                schema: {
                    type: "object",
                    properties: {
                        status: {
                            type: "boolean",
                            description: "New status to apply to the Extension (true for active, false for inactive)",
                        },
                        acknowledgeInFlight: {
                            type: "boolean",
                            description: "Proceed with disabling even though this extension still has customer money in flight. The first attempt refuses and reports what is outstanding; sending this repeats the request and accepts the consequence.",
                        },
                        stopEverything: {
                            type: "boolean",
                            description: "Also stop the scheduled jobs that settle money customers are already owed, which normally keep running while an extension is disabled. For the case where the extension's own settlement code is the fault. Cleared automatically when the extension is enabled again.",
                        },
                    },
                    required: ["status"],
                },
            },
        },
    },
    responses: (0, query_1.updateRecordResponses)("Extension"),
    requiresAuth: true,
    permission: "edit.extension",
    logModule: "ADMIN_SYS",
    logTitle: "Update extension status",
};
exports.default = async (data) => {
    var _a, _b, _c, _d;
    const { body, params, ctx } = data;
    const { id } = params;
    const { status, acknowledgeInFlight, stopEverything } = body;
    if (status === false && acknowledgeInFlight !== true) {
        let outstanding = null;
        let title = "";
        try {
            const row = await db_1.models.extension.findOne({
                where: { productId: id },
                attributes: ["name", "title", "status"],
            });
            if (row === null || row === void 0 ? void 0 : row.status) {
                title = String((_b = (_a = row.title) !== null && _a !== void 0 ? _a : row.name) !== null && _b !== void 0 ? _b : "");
                outstanding = await (0, extension_inflight_1.describeExtensionInFlight)(String((_c = row.name) !== null && _c !== void 0 ? _c : ""));
            }
        }
        catch (error) {
            console_1.logger.error("EXTENSION", `Could not check in-flight work before disabling ${id}, allowing the change: ${(_d = error === null || error === void 0 ? void 0 : error.message) !== null && _d !== void 0 ? _d : error}`);
            outstanding = null;
        }
        if (outstanding) {
            throw (0, error_1.createError)({
                statusCode: 409,
                message: `${title} still has ${outstanding.what}. ${outstanding.consequence} ` +
                    "If you have read that and still want to switch it off, repeat the request with acknowledgeInFlight.",
            });
        }
    }
    try {
        ctx === null || ctx === void 0 ? void 0 : ctx.step(`Updating extension ${id} status to ${status ? "active" : "inactive"}`);
        await db_1.models.extension.update({ status }, { where: { productId: id } });
        if (status === false && stopEverything === true) {
            ctx === null || ctx === void 0 ? void 0 : ctx.step("Recording hard stop for settlement jobs");
            await setHardStopped(String(id), true);
        }
        else if (status === true) {
            await setHardStopped(String(id), false);
        }
        ctx === null || ctx === void 0 ? void 0 : ctx.step("Clearing cache");
        const cacheManager = cache_1.CacheManager.getInstance();
        await cacheManager.clearCache();
        await (0, Middleware_1.reloadExtensionProductIds)();
        ctx === null || ctx === void 0 ? void 0 : ctx.success("Extension status updated successfully");
        return { message: "Extension status updated successfully" };
    }
    catch (error) {
        console_1.logger.error("EXTENSION", "Error updating extension status", error);
        ctx === null || ctx === void 0 ? void 0 : ctx.fail(`Failed to update extension status: ${error.message}`);
        throw (0, error_1.createError)({
            statusCode: 500,
            message: `Failed to update extension status: ${error.message}`,
        });
    }
};
async function setHardStopped(productId, stopped) {
    var _a, _b, _c;
    try {
        const row = await db_1.models.extension.findOne({
            where: { productId },
            attributes: ["name"],
        });
        const name = String((_a = row === null || row === void 0 ? void 0 : row.name) !== null && _a !== void 0 ? _a : "").trim();
        if (!name)
            return;
        const existing = await db_1.models.settings.findOne({
            where: { key: cron_1.HARD_STOPPED_SETTING },
        });
        const current = new Set(String((_b = existing === null || existing === void 0 ? void 0 : existing.value) !== null && _b !== void 0 ? _b : "")
            .split(",")
            .map((entry) => entry.trim())
            .filter(Boolean));
        if (stopped)
            current.add(name);
        else
            current.delete(name);
        const value = [...current].join(",");
        if (existing) {
            await db_1.models.settings.update({ value }, { where: { key: cron_1.HARD_STOPPED_SETTING } });
        }
        else if (value) {
            await db_1.models.settings.create({ key: cron_1.HARD_STOPPED_SETTING, value });
        }
    }
    catch (error) {
        console_1.logger.error("EXTENSION", `Could not record the hard-stop list for ${productId}: ${(_c = error === null || error === void 0 ? void 0 : error.message) !== null && _c !== void 0 ? _c : error}`);
    }
}
