"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const query_1 = require("@b/utils/query");
const utils_1 = require("./utils");
exports.metadata = {
    summary: "Stores a new Author",
    operationId: "storeAuthor",
    tags: ["Admin", "Content", "Author"],
    requestBody: {
        required: true,
        content: {
            "application/json": {
                schema: utils_1.authorCreateSchema,
            },
        },
    },
    responses: (0, query_1.storeRecordResponses)(utils_1.authorStoreSchema, "Author"),
    requiresAuth: true,
    permission: "create.blog.author",
    logModule: "ADMIN_BLOG",
    logTitle: "Create author",
};
exports.default = async (data) => {
    const { body, ctx } = data;
    const { userId, status } = body;
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Validating author data");
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Creating author");
    const result = await (0, query_1.storeRecord)({
        model: "author",
        data: {
            userId,
            status,
        },
    });
    ctx === null || ctx === void 0 ? void 0 : ctx.success("Author created successfully");
    return result;
};
