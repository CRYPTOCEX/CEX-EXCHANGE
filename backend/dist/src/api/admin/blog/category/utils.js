"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.categoryStoreSchema = exports.categoryUpdateSchema = exports.baseCategorySchema = exports.categorySchema = void 0;
const schema_1 = require("@b/utils/schema");
const id = (0, schema_1.baseStringSchema)("ID of the category");
const name = (0, schema_1.baseStringSchema)("Name of the category");
const slug = (0, schema_1.baseStringSchema)("URL-friendly identifier (slug) for the category", 255);
const image = (0, schema_1.baseStringSchema)("Image URL of the category", 1000, 0, true);
const description = (0, schema_1.baseStringSchema)("Description of the category", 1000, 0, true);
const createdAt = (0, schema_1.baseDateTimeSchema)("Creation date of the category", true);
const updatedAt = (0, schema_1.baseDateTimeSchema)("Last update date of the category", true);
const deletedAt = (0, schema_1.baseDateTimeSchema)("Deletion date of the category", true);
exports.categorySchema = {
    id,
    name,
    slug,
    image,
    description,
    createdAt,
    updatedAt,
    deletedAt,
};
exports.baseCategorySchema = {
    id,
    name,
    slug,
    image,
    description,
};
exports.categoryUpdateSchema = {
    type: "object",
    properties: {
        name,
        slug,
        image,
        description,
    },
    required: ["name", "slug"],
};
exports.categoryStoreSchema = {
    description: `Category created or updated successfully`,
    content: {
        "application/json": {
            schema: {
                type: "object",
                properties: exports.categorySchema,
            },
        },
    },
};
