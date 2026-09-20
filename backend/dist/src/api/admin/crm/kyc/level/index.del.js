"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const db_1 = require("@b/db");
const error_1 = require("@b/utils/error");
exports.metadata = {
    summary: "Bulk Delete KYC Levels",
    description: "Deletes multiple KYC levels by their IDs.",
    operationId: "bulkDeleteKycLevels",
    tags: ["KYC", "Levels"],
    logModule: "ADMIN_CRM",
    logTitle: "Bulk delete KYC levels",
    requestBody: {
        description: "Array of KYC level IDs to delete",
        required: true,
        content: {
            "application/json": {
                schema: {
                    type: "object",
                    properties: {
                        ids: {
                            type: "array",
                            items: { type: "string" },
                            description: "Array of KYC level IDs to delete",
                        },
                    },
                    required: ["ids"],
                },
            },
        },
    },
    responses: {
        200: {
            description: "KYC levels deleted successfully.",
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
        400: { description: "Missing required fields." },
        404: { description: "No KYC levels found for the provided IDs." },
        500: { description: "Internal Server Error." },
    },
    permission: "delete.kyc.level",
    requiresAuth: true,
};
exports.default = async (data) => {
    const { body, ctx } = data;
    const { ids } = body;
    if (!ids || !Array.isArray(ids) || ids.length === 0) {
        throw (0, error_1.createError)({ statusCode: 400, message: "Missing or invalid ids" });
    }
    ctx === null || ctx === void 0 ? void 0 : ctx.step(`Bulk deleting ${ids.length} KYC levels`);
    const deletedCount = await db_1.models.kycLevel.destroy({
        where: { id: ids },
    });
    if (deletedCount === 0) {
        throw (0, error_1.createError)({
            statusCode: 404,
            message: "No KYC levels found for the provided IDs",
        });
    }
    ctx === null || ctx === void 0 ? void 0 : ctx.success(`${deletedCount} KYC levels deleted successfully`);
    return { message: "KYC levels deleted successfully.", count: deletedCount };
};
