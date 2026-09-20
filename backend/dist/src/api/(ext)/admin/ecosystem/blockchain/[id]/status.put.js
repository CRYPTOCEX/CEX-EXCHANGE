"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const db_1 = require("@b/db");
const errors_1 = require("@b/utils/schema/errors");
const fs_1 = require("fs");
const path_1 = __importDefault(require("path"));
const error_1 = require("@b/utils/error");
exports.metadata = {
    summary: "Update ecosystem blockchain status",
    description: "Updates the active status of an ecosystem blockchain. This allows administrators to enable or disable specific blockchain integrations within the ecosystem.",
    operationId: "updateEcosystemBlockchainStatus",
    tags: ["Admin", "Ecosystem", "Blockchain"],
    parameters: [
        {
            index: 0,
            name: "id",
            in: "path",
            required: true,
            description: "Product ID of the blockchain to update",
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
                            description: "New status to apply to the blockchain (true for active, false for inactive)",
                        },
                    },
                    required: ["status"],
                },
            },
        },
    },
    responses: {
        200: (0, errors_1.successMessageResponse)("Blockchain status updated successfully"),
        400: errors_1.badRequestResponse,
        401: errors_1.unauthorizedResponse,
        404: (0, errors_1.notFoundResponse)("Blockchain"),
        500: errors_1.serverErrorResponse,
    },
    requiresAuth: true,
    permission: "edit.ecosystem.blockchain",
    logModule: "ADMIN_ECO",
    logTitle: "Update blockchain status",
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
    if (status === true) {
        ctx === null || ctx === void 0 ? void 0 : ctx.step("Checking blockchain license");
        const hasLicense = await checkLicenseFileExists(id);
        if (!hasLicense) {
            throw (0, error_1.createError)({
                statusCode: 403,
                message: "Cannot enable blockchain: License not activated. Please activate your license first."
            });
        }
    }
    ctx === null || ctx === void 0 ? void 0 : ctx.step(`Updating blockchain status to ${status}`);
    await db_1.models.ecosystemBlockchain.update({ status }, { where: { productId: id } });
    ctx === null || ctx === void 0 ? void 0 : ctx.success("Blockchain status updated successfully");
    return { message: "Blockchain status updated successfully" };
};
