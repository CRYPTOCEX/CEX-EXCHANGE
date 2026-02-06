"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const error_1 = require("@b/utils/error");
const console_1 = require("@b/utils/console");
async function checkSumSubEnv() {
    const requiredVars = {
        SUMSUB_API_KEY: process.env.SUMSUB_API_KEY,
        SUMSUB_API_SECRET: process.env.SUMSUB_API_SECRET,
    };
    const missingEnvVars = Object.entries(requiredVars)
        .filter(([_, value]) => !value)
        .map(([key]) => key);
    if (missingEnvVars.length > 0) {
        return {
            success: false,
            missingEnvVars,
        };
    }
    return {
        success: true,
        missingEnvVars: [],
    };
}
async function checkGeminiEnv() {
    const requiredVars = {
        GEMINI_API_KEY: process.env.GEMINI_API_KEY,
    };
    const missingEnvVars = Object.entries(requiredVars)
        .filter(([_, value]) => !value)
        .map(([key]) => key);
    if (missingEnvVars.length > 0) {
        return {
            success: false,
            missingEnvVars,
        };
    }
    return {
        success: true,
        missingEnvVars: [],
    };
}
async function checkDeepSeekEnv() {
    const requiredVars = {
        DEEPSEEK_API_KEY: process.env.DEEPSEEK_API_KEY,
    };
    const missingEnvVars = Object.entries(requiredVars)
        .filter(([_, value]) => !value)
        .map(([key]) => key);
    if (missingEnvVars.length > 0) {
        return {
            success: false,
            missingEnvVars,
        };
    }
    return {
        success: true,
        missingEnvVars: [],
    };
}
exports.metadata = {
    summary: "Check Verification Service Environment Variables",
    description: "Checks if the required environment variables for a verification service are configured.",
    operationId: "checkVerificationServiceEnv",
    tags: ["KYC", "Verification Services"],
    logModule: "ADMIN_CRM",
    logTitle: "Check verification service env",
    parameters: [
        {
            index: 0,
            name: "id",
            in: "path",
            description: "Verification service ID",
            required: true,
            schema: { type: "string" },
        },
    ],
    responses: {
        200: {
            description: "Environment variable check completed.",
            content: {
                "application/json": {
                    schema: {
                        type: "object",
                        properties: {
                            success: {
                                type: "boolean",
                                description: "Whether all required environment variables are present",
                            },
                            missingEnvVars: {
                                type: "array",
                                items: { type: "string" },
                                description: "List of missing environment variables",
                            },
                        },
                    },
                },
            },
        },
        404: { description: "Verification service not found." },
        500: { description: "Internal Server Error." },
    },
};
exports.default = async (data) => {
    const { params, ctx } = data;
    try {
        const { id } = params;
        ctx === null || ctx === void 0 ? void 0 : ctx.step(`Checking environment variables for ${id}`);
        let result;
        if (id.startsWith("sumsub")) {
            result = await checkSumSubEnv();
        }
        else if (id.startsWith("gemini")) {
            result = await checkGeminiEnv();
        }
        else if (id.startsWith("deepseek")) {
            result = await checkDeepSeekEnv();
        }
        else {
            throw (0, error_1.createError)({
                statusCode: 404,
                message: "Verification service not found",
            });
        }
        if (result.success) {
            ctx === null || ctx === void 0 ? void 0 : ctx.success("Environment variables configured correctly");
        }
        else {
            ctx === null || ctx === void 0 ? void 0 : ctx.warn(`Missing environment variables: ${result.missingEnvVars.join(", ")}`);
        }
        return result;
    }
    catch (error) {
        ctx === null || ctx === void 0 ? void 0 : ctx.fail("Failed to check environment variables");
        console_1.logger.error("KYC", "Error in checkVerificationServiceEnv", error);
        throw (0, error_1.createError)({
            statusCode: error.statusCode || 500,
            message: error.message ||
                "Failed to check environment variables for verification service",
        });
    }
};
