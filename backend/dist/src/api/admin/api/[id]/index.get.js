"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const query_1 = require("@b/utils/query");
const db_1 = require("@b/db");
exports.metadata = {
    summary: "Retrieves detailed information of a specific API key by ID",
    operationId: "getApiKeyById",
    tags: ["Admin", "API Keys"],
    parameters: [
        {
            index: 0,
            name: "id",
            in: "path",
            required: true,
            description: "ID of the API key to retrieve",
            schema: { type: "string" },
        },
    ],
    responses: {
        200: {
            description: "API Key details",
            content: {
                "application/json": {
                    schema: {
                        type: "object",
                        properties: {
                            id: { type: "string" },
                            userId: { type: "string" },
                            name: { type: "string" },
                            key: { type: "string" },
                            permissions: {
                                type: "array",
                                items: { type: "string" },
                            },
                            ipWhitelist: {
                                type: "array",
                                items: { type: "string" },
                            },
                            createdAt: { type: "string", format: "date-time" },
                            updatedAt: { type: "string", format: "date-time" },
                            user: {
                                type: "object",
                                properties: {
                                    firstName: { type: "string" },
                                    lastName: { type: "string" },
                                    email: { type: "string" },
                                    avatar: { type: "string" },
                                },
                            },
                        },
                    },
                },
            },
        },
        401: query_1.unauthorizedResponse,
        404: (0, query_1.notFoundMetadataResponse)("API Key"),
        500: query_1.serverErrorResponse,
    },
    requiresAuth: true,
    permission: "view.api.key",
    demoMask: ["user.email", "key"],
};
exports.default = async (data) => {
    const { params } = data;
    return await (0, query_1.getRecord)("apiKey", params.id, [
        {
            model: db_1.models.user,
            as: "user",
            attributes: ["id", "firstName", "lastName", "email", "avatar"],
            required: false,
        },
    ], ["createdAt", "updatedAt"]);
};
