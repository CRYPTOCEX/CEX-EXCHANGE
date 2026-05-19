"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.commentUpdateSchema = exports.baseCommentSchema = exports.commentSchema = void 0;
const schema_1 = require("@b/utils/schema");
const id = (0, schema_1.baseStringSchema)("ID of the comment");
const content = (0, schema_1.baseStringSchema)("Content of the comment", 1000);
const userId = (0, schema_1.baseStringSchema)("User ID associated with the comment");
const postId = (0, schema_1.baseStringSchema)("Post ID associated with the comment");
const createdAt = (0, schema_1.baseDateTimeSchema)("Creation date of the comment", true);
const updatedAt = (0, schema_1.baseDateTimeSchema)("Last update date of the comment", true);
const deletedAt = (0, schema_1.baseDateTimeSchema)("Deletion date of the comment", true);
exports.commentSchema = {
    id,
    content,
    userId,
    postId,
    createdAt,
    updatedAt,
    deletedAt,
};
exports.baseCommentSchema = {
    id,
    content,
    userId,
    postId,
    createdAt,
    deletedAt,
    updatedAt,
};
exports.commentUpdateSchema = {
    type: "object",
    properties: {
        content,
        userId,
        postId,
    },
    required: ["content"],
};
