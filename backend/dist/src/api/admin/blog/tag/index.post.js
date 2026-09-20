"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const query_1 = require("@b/utils/query");
const utils_1 = require("./utils");
exports.metadata = {
    summary: "Stores a new Tag",
    operationId: "storeTag",
    tags: ["Admin", "Content", "Category"],
    requestBody: {
        required: true,
        content: {
            "application/json": {
                schema: utils_1.tagUpdateSchema,
            },
        },
    },
    responses: (0, query_1.storeRecordResponses)(utils_1.tagStoreSchema, "Tag"),
    requiresAuth: true,
    permission: "create.blog.tag",
    logModule: "ADMIN_BLOG",
    logTitle: "Create tag",
};
exports.default = async (data) => {
    const { body, ctx } = data;
    const { name, slug, image, description } = body;
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Validating tag data");
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Creating tag");
    const result = await (0, query_1.storeRecord)({
        model: "tag",
        data: {
            name,
            slug,
            image,
            description,
        },
    });
    ctx === null || ctx === void 0 ? void 0 : ctx.success("Tag created successfully");
    return result;
};
