"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const db_1 = require("@b/db");
const error_1 = require("@b/utils/error");
exports.metadata = {
    summary: "Update a KYC Level",
    description: "Updates an existing KYC level with the provided details.",
    operationId: "updateKycLevel",
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
    requestBody: {
        description: "KYC level update data",
        required: true,
        content: {
            "application/json": {
                schema: {
                    type: "object",
                    properties: {
                        name: { type: "string" },
                        description: { type: "string" },
                        level: { type: "number" },
                        fields: { type: "array", items: { type: "object" } },
                        features: { type: "array", items: { type: "string" } },
                        serviceId: {
                            type: "string",
                            description: "Verification service ID",
                        },
                        status: {
                            type: "string",
                            enum: ["ACTIVE", "DRAFT", "INACTIVE"],
                            description: "Level status",
                        },
                    },
                    required: ["name", "description", "level", "status"],
                },
            },
        },
    },
    responses: {
        200: {
            description: "KYC level updated successfully.",
            content: {
                "application/json": {
                    schema: {
                        type: "object",
                        properties: {
                            message: { type: "string" },
                            level: { type: "object" },
                        },
                    },
                },
            },
        },
        400: { description: "Missing required fields." },
        404: { description: "KYC level not found." },
        500: { description: "Internal Server Error." },
    },
    permission: "edit.kyc.level",
    requiresAuth: true,
    logModule: "ADMIN_CRM",
    logTitle: "Update KYC level",
};
exports.default = async (data) => {
    const { params, body, ctx } = data;
    const { id } = params;
    if (!id) {
        throw (0, error_1.createError)({ statusCode: 400, message: "Missing level ID" });
    }
    ctx === null || ctx === void 0 ? void 0 : ctx.step(`Fetching KYC level ${id}`);
    const levelRecord = await db_1.models.kycLevel.findByPk(id);
    if (!levelRecord) {
        throw (0, error_1.createError)({ statusCode: 404, message: "KYC level not found" });
    }
    const { name, description, level, fields, features, serviceId, status } = body;
    let validatedServiceId = null;
    if (serviceId && serviceId.trim() !== '') {
        ctx === null || ctx === void 0 ? void 0 : ctx.step("Validating verification service");
        const service = await db_1.models.kycVerificationService.findByPk(serviceId);
        if (!service) {
            throw (0, error_1.createError)({
                statusCode: 400,
                message: `Invalid serviceId: ${serviceId}. Service does not exist.`
            });
        }
        validatedServiceId = serviceId;
    }
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Updating KYC level");
    await levelRecord.update({
        name,
        description,
        level,
        fields,
        features,
        serviceId: validatedServiceId,
        status,
        updatedAt: new Date(),
    });
    ctx === null || ctx === void 0 ? void 0 : ctx.success("KYC level updated successfully");
    return { message: "KYC level updated successfully." };
};
