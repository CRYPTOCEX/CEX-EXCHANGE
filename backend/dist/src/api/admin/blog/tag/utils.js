"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.tagStoreSchema = exports.tagUpdateSchema = exports.baseTagSchema = exports.tagSchema = void 0;
const schema_1 = require("@b/utils/schema");
const id = (0, schema_1.baseStringSchema)("ID of the tag");
const name = (0, schema_1.baseStringSchema)("Name of the tag");
const slug = (0, schema_1.baseStringSchema)("URL-friendly identifier (slug) for the tag", 255);
const createdAt = (0, schema_1.baseDateTimeSchema)("Creation date of the tag", true);
const updatedAt = (0, schema_1.baseDateTimeSchema)("Last update date of the tag", true);
const deletedAt = (0, schema_1.baseDateTimeSchema)("Deletion date of the tag", true);
exports.tagSchema = {
    id,
    name,
    slug,
    createdAt,
    updatedAt,
    deletedAt,
};
exports.baseTagSchema = {
    id,
    name,
    slug,
};
exports.tagUpdateSchema = {
    type: "object",
    properties: {
        name,
        slug,
    },
    required: ["name", "slug"],
};
exports.tagStoreSchema = {
    description: `Tag created or updated successfully`,
    content: {
        "application/json": {
            schema: {
                type: "object",
                properties: exports.tagSchema,
            },
        },
    },
};
