"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const query_1 = require("@b/utils/query");
const utils_1 = require("./utils");
exports.metadata = {
    summary: "Stores a new Category",
    operationId: "storeCategory",
    tags: ["Admin", "Content", "Category"],
    requestBody: {
        required: true,
        content: {
            "application/json": {
                schema: utils_1.categoryUpdateSchema,
            },
        },
    },
    responses: (0, query_1.storeRecordResponses)(utils_1.categoryStoreSchema, "Category"),
    requiresAuth: true,
    permission: "create.blog.category",
    logModule: "ADMIN_BLOG",
    logTitle: "Create category",
};
exports.default = async (data) => {
    const { body, ctx } = data;
    const { name, slug, image, description } = body;
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Validating category data");
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Creating category");
    const result = await (0, query_1.storeRecord)({
        model: "category",
        data: {
            name,
            slug,
            image,
            description,
        },
    });
    ctx === null || ctx === void 0 ? void 0 : ctx.success("Category created successfully");
    return result;
};
