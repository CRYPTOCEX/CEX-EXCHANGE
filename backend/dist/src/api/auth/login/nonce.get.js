"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const crypto_1 = require("crypto");
exports.metadata = {
    summary: "Generates a nonce for client use",
    operationId: "generateNonce",
    tags: ["Auth"],
    description: "Generates a nonce for client use",
    requiresAuth: false,
    responses: {
        200: {
            description: "Nonce generated successfully",
            content: {
                "application/json": {
                    schema: {
                        type: "object",
                        properties: {
                            nonce: { type: "string", description: "The generated nonce" },
                        },
                        required: ["nonce"],
                    },
                },
            },
        },
        500: {
            description: "Internal server error",
        },
    },
};
exports.default = () => {
    const nonce = (0, crypto_1.randomBytes)(16).toString("hex");
    return nonce;
};
