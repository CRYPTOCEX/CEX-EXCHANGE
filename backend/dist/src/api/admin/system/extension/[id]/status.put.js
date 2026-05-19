"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const db_1 = require("@b/db");
const query_1 = require("@b/utils/query");
const cache_1 = require("@b/utils/cache");
const console_1 = require("@b/utils/console");
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
    const { body, params, ctx } = data;
    const { id } = params;
    const { status } = body;
    try {
        ctx === null || ctx === void 0 ? void 0 : ctx.step(`Updating extension ${id} status to ${status ? "active" : "inactive"}`);
        await db_1.models.extension.update({ status }, { where: { productId: id } });
        ctx === null || ctx === void 0 ? void 0 : ctx.step("Clearing cache");
        const cacheManager = cache_1.CacheManager.getInstance();
        await cacheManager.clearCache();
        ctx === null || ctx === void 0 ? void 0 : ctx.success("Extension status updated successfully");
        return { message: "Extension status updated successfully" };
    }
    catch (error) {
        console_1.logger.error("EXTENSION", "Error updating extension status", error);
        ctx === null || ctx === void 0 ? void 0 : ctx.fail(`Failed to update extension status: ${error.message}`);
        return { message: "Failed to update extension status", error };
    }
};
