"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const db_1 = require("@b/db");
const query_1 = require("@b/utils/query");
const sequelize_1 = require("sequelize");
const fs_1 = require("fs");
const path_1 = __importDefault(require("path"));
exports.metadata = {
    summary: "Updates the status of an Exchange",
    operationId: "updateExchangeStatus",
    tags: ["Admin", "Exchanges"],
    parameters: [
        {
            index: 0,
            name: "id",
            in: "path",
            required: true,
            description: "ID of the exchange to update",
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
                            description: "New status to apply (true for active, false for inactive)",
                        },
                    },
                    required: ["status"],
                },
            },
        },
    },
    responses: (0, query_1.updateRecordResponses)("Exchange"),
    requiresAuth: true,
    permission: "edit.exchange",
    logModule: "ADMIN_FIN",
    logTitle: "Update Exchange Provider Status",
};
async function checkLicenseFileExists(productId) {
    if (!productId)
        return false;
    const cwd = process.cwd();
    const rootPath = cwd.endsWith("backend") || cwd.endsWith("backend/") || cwd.endsWith("backend\\")
        ? path_1.default.dirname(cwd)
        : cwd;
    const licFilePath = path_1.default.join(rootPath, "lic", `${productId}.lic`);
    try {
        await fs_1.promises.access(licFilePath);
        return true;
    }
    catch (_a) {
        return false;
    }
}
exports.default = async (data) => {
    const { body, params, ctx } = data;
    const { id } = params;
    const { status } = body;
    // License check bypassed
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Starting transaction");
    const transaction = await db_1.sequelize.transaction();
    try {
        if (status) {
            ctx === null || ctx === void 0 ? void 0 : ctx.step("Deactivating other exchanges");
            await db_1.models.exchange.update({ status: false }, { where: { id: { [sequelize_1.Op.ne]: id } }, transaction });
        }
        ctx === null || ctx === void 0 ? void 0 : ctx.step("Updating exchange status");
        await db_1.models.exchange.update({ status }, { where: { id }, transaction });
        ctx === null || ctx === void 0 ? void 0 : ctx.step("Committing transaction");
        await transaction.commit();
        ctx === null || ctx === void 0 ? void 0 : ctx.success();
        return {
            statusCode: 200,
            body: {
                message: "Exchange status updated successfully",
            },
        };
    }
    catch (error) {
        await transaction.rollback();
        return {
            statusCode: 500,
            body: {
                message: "Failed to update exchange status",
                error: error.message,
            },
        };
    }
};
