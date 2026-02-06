"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.postStoreSchema = exports.postUpdateSchema = exports.basePostSchema = void 0;
const schema_1 = require("@b/utils/schema");
const id = (0, schema_1.baseStringSchema)("ID of the Post");
const title = (0, schema_1.baseStringSchema)("Title of the Post");
const content = (0, schema_1.baseStringSchema)("Content of the Post");
const categoryId = (0, schema_1.baseStringSchema)("Category ID linked to the Post");
const authorId = (0, schema_1.baseStringSchema)("Author ID who wrote the Post");
const slug = (0, schema_1.baseStringSchema)("Slug for the Post URL");
const description = (0, schema_1.baseStringSchema)("Description of the Post");
const status = (0, schema_1.baseEnumSchema)("Publication status of the Post", [
    "PUBLISHED",
    "DRAFT",
    "TRASH",
]);
const image = (0, schema_1.baseStringSchema)("Image URL of the Post");
const createdAt = (0, schema_1.baseDateTimeSchema)("Creation date of the Post");
const updatedAt = (0, schema_1.baseDateTimeSchema)("Last update date of the Post");
const deletedAt = (0, schema_1.baseDateTimeSchema)("Deletion date of the Post, if applicable");
exports.basePostSchema = {
    id,
    title,
    content,
    categoryId,
    authorId,
    slug,
    description,
    status,
    image,
    createdAt,
    updatedAt,
    deletedAt,
};
exports.postUpdateSchema = {
    type: "object",
    properties: {
        title,
        content,
        categoryId,
        authorId,
        slug,
        description,
        status,
        image,
    },
    required: ["title", "content", "categoryId", "authorId", "slug", "status"],
};
exports.postStoreSchema = {
    description: `Post created or updated successfully`,
    content: {
        "application/json": {
            schema: {
                type: "object",
                properties: exports.basePostSchema,
            },
        },
    },
};
