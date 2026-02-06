"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const query_1 = require("@b/utils/query");
const utils_1 = require("./utils");
exports.metadata = {
    summary: "Stores a new Blog Post",
    operationId: "storePost",
    tags: ["Admin", "Content", "Posts"],
    requestBody: {
        required: true,
        content: {
            "application/json": {
                schema: utils_1.postUpdateSchema,
            },
        },
    },
    responses: (0, query_1.storeRecordResponses)(utils_1.postStoreSchema, "Blog Post"),
    requiresAuth: true,
    permission: "create.blog.post",
    logModule: "ADMIN_BLOG",
    logTitle: "Create blog post",
};
exports.default = async (data) => {
    const { body, ctx } = data;
    const { title, content, categoryId, authorId, slug, description, status, image, } = body;
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Validating blog post data");
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Creating blog post");
    const result = await (0, query_1.storeRecord)({
        model: "post",
        data: {
            title,
            content,
            categoryId,
            authorId,
            slug,
            description,
            status,
            image,
        },
    });
    ctx === null || ctx === void 0 ? void 0 : ctx.success("Blog post created successfully");
    return result;
};
