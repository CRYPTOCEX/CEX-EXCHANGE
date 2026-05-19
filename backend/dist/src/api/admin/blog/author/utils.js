"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.authorStoreSchema = exports.authorUpdateSchema = exports.authorCreateSchema = exports.baseAuthorSchema = void 0;
const schema_1 = require("@b/utils/schema");
const id = (0, schema_1.baseStringSchema)("ID of the author");
const userId = (0, schema_1.baseStringSchema)("User ID associated with the author");
const status = (0, schema_1.baseEnumSchema)("Current status of the author", [
    "PENDING",
    "APPROVED",
    "REJECTED",
]);
const createdAt = (0, schema_1.baseDateTimeSchema)("Creation date of the author", true);
const deletedAt = (0, schema_1.baseDateTimeSchema)("Deletion date of the author", true);
const updatedAt = (0, schema_1.baseDateTimeSchema)("Last update date of the author", true);
exports.baseAuthorSchema = {
    id,
    userId,
    status,
    createdAt,
    deletedAt,
    updatedAt,
};
exports.authorCreateSchema = {
    type: "object",
    properties: {
        userId,
        status,
    },
    required: ["userId", "status"],
};
exports.authorUpdateSchema = {
    type: "object",
    properties: {
        status,
    },
    required: ["status"],
};
exports.authorStoreSchema = {
    description: `Author created or updated successfully`,
    content: {
        "application/json": {
            schema: {
                type: "object",
                properties: exports.baseAuthorSchema,
            },
        },
    },
};
