"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const errors_1 = require("@b/utils/schema/errors");
const utils_1 = require("@b/api/admin/system/utils");
exports.metadata = {
    summary: "Get ecosystem blockchain details",
    description: "Retrieves detailed information about a specific ecosystem blockchain by its product ID. Returns blockchain metadata including ID, product ID, name, chain identifier, description, link, status, version, and image.",
    operationId: "getEcosystemBlockchainDetails",
    tags: ["Admin", "Ecosystem", "Blockchain"],
    parameters: [
        {
            index: 0,
            name: "id",
            in: "path",
            description: "Product ID of the blockchain to retrieve",
            required: true,
            schema: {
                type: "string",
            },
        },
    ],
    permission: "view.ecosystem.blockchain",
    logModule: "ADMIN_ECO",
    logTitle: "Get blockchain details",
    responses: {
        200: {
            description: "Blockchain details retrieved successfully",
            content: {
                "application/json": {
                    schema: {
                        type: "object",
                        properties: {
                            id: {
                                type: "string",
                                format: "uuid",
                                description: "Unique identifier of the blockchain record",
                            },
                            productId: {
                                type: "string",
                                description: "Product ID of the blockchain",
                            },
                            name: {
                                type: "string",
                                description: "Name of the blockchain",
                            },
                            chain: {
                                type: "string",
                                description: "Chain identifier (e.g., SOL, MO)",
                            },
                            description: {
                                type: "string",
                                description: "Blockchain description",
                            },
                            link: {
                                type: "string",
                                format: "uri",
                                description: "External link for the blockchain",
                            },
                            status: {
                                type: "boolean",
                                description: "Whether the blockchain is active",
                            },
                            version: {
                                type: "string",
                                description: "Version of the blockchain integration",
                            },
                            image: {
                                type: "string",
                                description: "Image path for the blockchain",
                            },
                        },
                        required: ["id", "productId", "name", "status"]
                    },
                },
            },
        },
        401: errors_1.unauthorizedResponse,
        404: (0, errors_1.notFoundResponse)("Blockchain"),
        500: errors_1.serverErrorResponse,
    },
    requiresAuth: true,
};
exports.default = async (data) => {
    const { params, ctx } = data;
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Retrieving blockchain details");
    const blockchain = await (0, utils_1.getBlockchain)(params.id);
    ctx === null || ctx === void 0 ? void 0 : ctx.success("Blockchain details retrieved");
    return blockchain;
};
