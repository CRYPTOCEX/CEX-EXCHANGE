"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const cache_1 = require("@b/utils/cache");
const db_1 = require("@b/db");
const error_1 = require("@b/utils/error");
const query_1 = require("@b/utils/query");
const kyc_1 = require("@b/utils/kyc");
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
    await (0, kyc_1.assertKycFeature)(user.id, kyc_1.KYC_FEATURES.AUTHOR_BLOG, "apply as an author");
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Checking author application settings");
    const cacheManager = cache_1.CacheManager.getInstance();
    const applicationsOpen = await cacheManager.getSettingBool("enableAuthorApplications", true);
    if (!applicationsOpen) {
        ctx === null || ctx === void 0 ? void 0 : ctx.fail("Author applications are closed");
        throw (0, error_1.createError)({
            statusCode: 403,
            message: "Author applications are not being accepted at the moment.",
        });
    }
    const autoApproveAuthors = await cacheManager.getSettingBool("autoApproveAuthors");
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
