"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const db_1 = require("@b/db");
const error_1 = require("@b/utils/error");
exports.metadata = {
    summary: "Delete a KYC Level",
    description: "Deletes a KYC level by its ID.",
    operationId: "deleteKycLevel",
    tags: ["KYC", "Levels"],
    parameters: [
        {
            index: 0,
            name: "id",
            in: "path",
            description: "KYC level ID",
            required: true,
            schema: { type: "string" },
        },
    ],
    responses: {
        200: {
            description: "KYC level deleted successfully.",
            content: {
                "application/json": {
                    schema: {
                        type: "object",
                        properties: { message: { type: "string" } },
                    },
                },
            },
        },
        404: { description: "KYC level not found." },
        500: { description: "Internal Server Error." },
    },
    permission: "delete.kyc.level",
    requiresAuth: true,
    logModule: "ADMIN_CRM",
    logTitle: "Delete KYC level",
};
exports.default = async (data) => {
    const { params, ctx } = data;
    const { id } = params;
    if (!id) {
        throw (0, error_1.createError)({ statusCode: 400, message: "Missing level ID" });
    }
    ctx === null || ctx === void 0 ? void 0 : ctx.step(`Fetching KYC level ${id}`);
    const levelRecord = await db_1.models.kycLevel.findByPk(id);
    if (!levelRecord) {
        throw (0, error_1.createError)({ statusCode: 404, message: "KYC level not found" });
    }
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Deleting KYC level");
    await levelRecord.destroy();
    ctx === null || ctx === void 0 ? void 0 : ctx.success("KYC level deleted successfully");
    return { message: "KYC level deleted successfully." };
};
