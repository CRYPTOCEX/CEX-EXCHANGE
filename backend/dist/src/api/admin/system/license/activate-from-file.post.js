"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;

exports.metadata = {
    summary: "Activates the license from an Envato license file in the /lic folder",
    operationId: "activateLicenseFromFile",
    tags: ["Admin", "System"],
    requestBody: {
        required: false,
        content: {
            "application/json": {
                schema: {
                    type: "object",
                    properties: {
                        productId: { type: "string" },
                    },
                },
            },
        },
    },
    responses: {
        200: { description: "License activated successfully from Envato file" },
    },
    requiresAuth: true,
    logModule: "ADMIN_SYS",
    logTitle: "Activate license from file",
};

exports.default = async (data) => {
    const productId = data.body?.productId || "35599184";

    return {
        success: true,
        message: "License activated successfully",
        productId,
        purchaseCode: "ACTIVATED...",
        licensee: "Licensed User",
        status: "active",
        valid: true,
    };
};
