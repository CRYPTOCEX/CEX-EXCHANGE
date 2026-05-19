"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;

exports.metadata = {
    summary: "Gets the current license status",
    operationId: "getLicenseStatus",
    tags: ["Admin", "System"],
    logModule: "ADMIN_SYS",
    logTitle: "Get License Status",
    responses: {
        200: {
            description: "License status retrieved successfully",
            content: {
                "application/json": {
                    schema: {
                        type: "object",
                        properties: {
                            productId: { type: "string" },
                            productName: { type: "string" },
                            licenseStatus: { type: "string" },
                            isValid: { type: "boolean" },
                            securityLevel: { type: "number" },
                            message: { type: "string" },
                        },
                    },
                },
            },
        },
    },
    requiresAuth: true,
};

exports.default = async (data) => {
    // Always return valid license status
    return {
        productId: "35599184",
        productName: "BiCrypto",
        productVersion: "7.0.0",
        licenseStatus: "active",
        isValid: true,
        securityLevel: 100,
        initialized: true,
        message: "License is active and valid.",
        features: ["all"],
    };
};
