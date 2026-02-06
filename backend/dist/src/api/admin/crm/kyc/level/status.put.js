"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const db_1 = require("@b/db");
const error_1 = require("@b/utils/error");
exports.metadata = {
    summary: "Bulk Update KYC Levels",
    description: "Updates multiple KYC levels by their IDs with a specified status.",
    operationId: "bulkUpdateKycLevelsStatus",
    tags: ["KYC", "Levels"],
    logModule: "ADMIN_CRM",
    logTitle: "Bulk update KYC level status",
    requestBody: {
        description: "Object containing an array of KYC level IDs and the new status",
        required: true,
        content: {
            "application/json": {
                schema: {
                    type: "object",
                    properties: {
                        ids: {
                            type: "array",
                            items: { type: "string" },
                            description: "Array of KYC level IDs to update",
                        },
                        status: {
                            type: "string",
                            description: "The new status to set for the selected KYC levels",
                        },
                    },
                    required: ["ids", "status"],
                },
            },
        },
    },
    responses: {
        200: {
            description: "KYC levels updated successfully.",
            content: {
                "application/json": {
                    schema: {
                        type: "object",
                        properties: {
                            message: { type: "string" },
                            count: { type: "number" },
                        },
                    },
                },
            },
        },
        400: { description: "Missing or invalid required fields." },
        404: { description: "No KYC levels found for the provided IDs." },
        500: { description: "Internal Server Error." },
    },
    permission: "edit.kyc.level",
    requiresAuth: true,
};
exports.default = async (data) => {
    const { body, ctx } = data;
    const { ids, status } = body;
    if (!ids ||
        !Array.isArray(ids) ||
        ids.length === 0 ||
        typeof status !== "string") {
        throw (0, error_1.createError)({
            statusCode: 400,
            message: "Missing or invalid ids or status",
        });
    }
    ctx === null || ctx === void 0 ? void 0 : ctx.step(`Bulk updating ${ids.length} KYC levels to status: ${status}`);
    const [affectedCount] = await db_1.models.kycLevel.update({ status: status, updatedAt: new Date() }, { where: { id: ids } });
    if (affectedCount === 0) {
        throw (0, error_1.createError)({
            statusCode: 404,
            message: "No KYC levels found for the provided IDs",
        });
    }
    ctx === null || ctx === void 0 ? void 0 : ctx.success(`${affectedCount} KYC levels updated to ${status}`);
    return {
        message: "KYC levels updated successfully.",
        count: affectedCount,
    };
};
