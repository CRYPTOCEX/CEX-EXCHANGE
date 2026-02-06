"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const db_1 = require("@b/db");
const error_1 = require("@b/utils/error");
exports.metadata = {
    summary: "Create a New KYC Level",
    description: "Creates a new KYC level with the provided details.",
    operationId: "createKycLevel",
    tags: ["KYC", "Levels"],
    logModule: "ADMIN_CRM",
    logTitle: "Create KYC level",
    requestBody: {
        required: true,
        content: {
            "application/json": {
                schema: {
                    type: "object",
                    properties: {
                        name: { type: "string", description: "Name of the level" },
                        description: { type: "string", description: "Level description" },
                        level: { type: "number", description: "Numeric level order" },
                        fields: {
                            type: "array",
                            description: "Array of fields",
                            items: { type: "object" },
                        },
                        features: {
                            type: "array",
                            description: "Array of features",
                            items: { type: "string" },
                        },
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
            description: "KYC level created successfully.",
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
        500: { description: "Internal Server Error." },
    },
    permission: "create.kyc.level",
    requiresAuth: true,
};
exports.default = async (data) => {
    const { body, ctx } = data;
    const { name, description, level, fields, features, serviceId, status } = body;
    if (!name || level === undefined || !status) {
        throw (0, error_1.createError)({ statusCode: 400, message: "Missing required fields" });
    }
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
    ctx === null || ctx === void 0 ? void 0 : ctx.step(`Creating KYC level: ${name}`);
    const newLevel = await db_1.models.kycLevel.create({
        name,
        description,
        level,
        fields: fields || [],
        features: features || [],
        serviceId: validatedServiceId,
        status,
    });
    ctx === null || ctx === void 0 ? void 0 : ctx.success("KYC level created successfully");
    return { message: "KYC level created successfully.", item: newLevel };
};
