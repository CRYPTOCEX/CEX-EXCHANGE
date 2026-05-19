"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.apiKeyUpdateSchema = exports.apiKeyStoreSchema = exports.apiKeySchema = void 0;
const schema_1 = require("@b/utils/schema");
const id = {
    ...(0, schema_1.baseStringSchema)("ID of the API key"),
    example: "123e4567-e89b-12d3-a456-426614174000",
};
const userId = {
    ...(0, schema_1.baseStringSchema)("User ID associated with the API key"),
    example: "123e4567-e89b-12d3-a456-426614174001",
};
const key = {
    ...(0, schema_1.baseStringSchema)("The API key string"),
    example: "a1b2c3d4e5f6g7h8i9j0",
};
const createdAt = {
    ...(0, schema_1.baseDateTimeSchema)("Creation date of the API key"),
    example: "2025-02-20T10:00:00Z",
};
const updatedAt = {
    ...(0, schema_1.baseDateTimeSchema)("Last update date of the API key", true),
    example: "2025-02-20T10:05:00Z",
};
const deletedAt = {
    ...(0, schema_1.baseDateTimeSchema)("Deletion date of the API key", true),
    example: null,
};
const name = {
    ...(0, schema_1.baseStringSchema)("Name of the API key"),
    example: "A",
};
const type = {
    type: "string",
    enum: ["plugin", "user"],
    description: "Type of the API key (e.g., plugin, user)",
    example: "plugin",
};
const permissions = {
    type: "array",
    items: {
        type: "object",
        properties: {
            id: { type: "string", example: "trade" },
            name: { type: "string", example: "Trade" },
        },
        required: ["id", "name"],
    },
    description: "Permissions associated with the API key",
    example: [{ id: "trade", name: "Trade" }],
};
const ipWhitelist = {
    type: "array",
    items: { type: "string", example: "127.0.0.1" },
    description: "IP addresses whitelisted for the API key",
    example: [],
};
const ipRestriction = {
    type: "boolean",
    description: "Whether IP restriction is enabled for the API key",
    example: false,
};
exports.apiKeySchema = {
    type: "object",
    properties: {
        id: id,
        userId: userId,
        name: name,
        type: type,
        key: key,
        permissions: permissions,
        ipWhitelist: ipWhitelist,
        ipRestriction: ipRestriction,
        createdAt: createdAt,
        updatedAt: updatedAt,
        deletedAt: deletedAt,
    },
    example: {
        id: "123e4567-e89b-12d3-a456-426614174000",
        userId: "123e4567-e89b-12d3-a456-426614174001",
        name: "A",
        type: "plugin",
        key: "a1b2c3d4e5f6g7h8i9j0",
        permissions: [{ id: "trade", name: "Trade" }],
        ipWhitelist: [],
        ipRestriction: false,
        createdAt: "2025-02-20T10:00:00Z",
        updatedAt: "2025-02-20T10:05:00Z",
        deletedAt: null,
    },
};
exports.apiKeyStoreSchema = {
    type: "object",
    properties: {
        userId: userId,
        name: name,
        type: type,
        permissions: permissions,
        ipWhitelist: ipWhitelist,
        ipRestriction: ipRestriction,
    },
    required: ["userId", "name", "type"],
    example: {
        userId: "123e4567-e89b-12d3-a456-426614174001",
        name: "A",
        type: "plugin",
        permissions: [{ id: "trade", name: "Trade" }],
        ipWhitelist: [],
        ipRestriction: false,
    },
};
exports.apiKeyUpdateSchema = {
    type: "object",
    properties: {
        name: name,
        type: type,
        permissions: permissions,
        ipWhitelist: ipWhitelist,
        ipRestriction: ipRestriction,
    },
    required: ["type"],
    example: {
        name: "A",
        type: "plugin",
        permissions: [{ id: "trade", name: "Trade" }],
        ipWhitelist: [],
        ipRestriction: false,
    },
};
