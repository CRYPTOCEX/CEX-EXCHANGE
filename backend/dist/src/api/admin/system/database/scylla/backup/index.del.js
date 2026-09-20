"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const error_1 = require("@b/utils/error");
const fs_1 = require("fs");
const path_1 = __importDefault(require("path"));
const validation_1 = require("@b/utils/validation");
const utils_1 = require("../utils");
exports.metadata = {
    summary: "Deletes a ScyllaDB snapshot",
    description: "Removes a single ScyllaDB snapshot file from disk",
    operationId: "deleteScyllaBackup",
    tags: ["Admin", "Database"],
    requiresAuth: true,
    requestBody: {
        required: true,
        content: {
            "application/json": {
                schema: {
                    type: "object",
                    properties: {
                        filename: { type: "string", description: "Snapshot file to delete" },
                    },
                    required: ["filename"],
                },
            },
        },
    },
    responses: {
        200: {
            description: "Snapshot deleted",
            content: {
                "application/json": {
                    schema: {
                        type: "object",
                        properties: { message: { type: "string" } },
                    },
                },
            },
        },
        400: { description: "Invalid snapshot file name" },
        404: { description: "Snapshot not found" },
        500: { description: "Internal server error" },
    },
    permission: "access.database",
    logModule: "ADMIN_SYS",
    logTitle: "ScyllaDB snapshot delete",
};
exports.default = async (data) => {
    const { body, ctx } = data;
    try {
        const filename = (0, utils_1.assertBackupFilename)(body === null || body === void 0 ? void 0 : body.filename);
        const target = path_1.default.resolve(utils_1.scyllaBackupDir, filename);
        if (!(0, validation_1.validatePathSecurity)(target, utils_1.scyllaBackupDir)) {
            throw (0, error_1.createError)({
                statusCode: 400,
                message: "Path escapes backup directory",
            });
        }
        try {
            await fs_1.promises.access(target);
        }
        catch (_a) {
            throw (0, error_1.createError)({ statusCode: 404, message: "Snapshot not found" });
        }
        await fs_1.promises.unlink(target);
        ctx === null || ctx === void 0 ? void 0 : ctx.success(`ScyllaDB snapshot deleted: ${filename}`);
        return { message: "Snapshot deleted" };
    }
    catch (error) {
        ctx === null || ctx === void 0 ? void 0 : ctx.fail(`ScyllaDB snapshot delete failed: ${error.message}`);
        if (error.statusCode)
            throw error;
        throw (0, error_1.createError)({ statusCode: 500, message: error.message });
    }
};
