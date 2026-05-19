"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const cache_1 = require("@b/utils/cache");
const db_1 = require("@b/db");
const error_1 = require("@b/utils/error");
const query_1 = require("@b/utils/query");
exports.metadata = {
    summary: "Creates a new author",
    description: "This endpoint creates a new author.",
    operationId: "createAuthor",
    tags: ["Content", "Author"],
    logModule: "BLOG",
    logTitle: "Apply as author",
    requiresAuth: true,
    responses: (0, query_1.createRecordResponses)("Author"),
};
exports.default = async (data) => {
    const { user, ctx } = data;
    if (!(user === null || user === void 0 ? void 0 : user.id))
        throw (0, error_1.createError)({ statusCode: 401, message: "Unauthorized" });
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Checking author application settings");
    const cacheManager = cache_1.CacheManager.getInstance();
    const settings = await cacheManager.getSettings();
    const autoApproveAuthorsRaw = settings.has("autoApproveAuthors")
        ? settings.get("autoApproveAuthors")
        : null;
    const autoApproveAuthors = typeof autoApproveAuthorsRaw === "boolean"
        ? autoApproveAuthorsRaw
        : Boolean(autoApproveAuthorsRaw);
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Checking for existing author profile");
    const author = await db_1.models.author.findOne({
        where: {
            userId: user.id,
        },
    });
    if (author)
        throw (0, error_1.createError)({
            statusCode: 400,
            message: "Author profile already exists",
        });
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Creating author profile");
    await db_1.models.author.create({
        userId: user.id,
        status: autoApproveAuthors ? "APPROVED" : "PENDING",
    });
    ctx === null || ctx === void 0 ? void 0 : ctx.success(`Author profile created for user ${user.id} - ${autoApproveAuthors ? "auto-approved" : "pending approval"}`);
    return {
        message: "Author created successfully",
    };
};
