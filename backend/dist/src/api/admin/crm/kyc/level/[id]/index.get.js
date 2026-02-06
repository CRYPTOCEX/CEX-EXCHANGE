"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const db_1 = require("@b/db");
const error_1 = require("@b/utils/error");
exports.metadata = {
    summary: "Get a KYC Level by ID",
    description: "Retrieves a specific KYC level by its ID.",
    operationId: "getKycLevelById",
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
        200: { description: "KYC level retrieved successfully." },
        404: { description: "KYC level not found." },
        500: { description: "Internal Server Error." },
    },
    permission: "view.kyc.level",
    requiresAuth: true,
    logModule: "ADMIN_CRM",
    logTitle: "Get KYC level",
};
exports.default = async (data) => {
    const { params, ctx } = data;
    const { id } = params;
    ctx === null || ctx === void 0 ? void 0 : ctx.step(`Fetching KYC level ${id}`);
    const level = await db_1.models.kycLevel.findByPk(id);
    if (!level) {
        throw (0, error_1.createError)({ statusCode: 404, message: "KYC level not found" });
    }
    ctx === null || ctx === void 0 ? void 0 : ctx.success("KYC level retrieved successfully");
    return level;
};
