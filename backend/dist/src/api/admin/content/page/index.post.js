"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const query_1 = require("@b/utils/query");
const utils_1 = require("./utils");
const db_1 = require("@b/db");
const error_1 = require("@b/utils/error");
exports.metadata = {
    summary: "Stores or updates a CMS page",
    operationId: "storePage",
    tags: ["Admin", "Content", "Page"],
    requestBody: {
        required: true,
        content: {
            "application/json": {
                schema: {
                    type: "object",
                    properties: utils_1.basePageSchema,
                    required: ["title", "content", "slug", "status"],
                },
            },
        },
    },
    responses: (0, query_1.storeRecordResponses)(utils_1.pageStoreSchema, "Page"),
    requiresAuth: true,
    permission: "create.page",
    logModule: "ADMIN_CMS",
    logTitle: "Create page",
};
exports.default = async (data) => {
    const { body, user, ctx } = data;
    const { title, content, description, image, slug, status, order, isHome, isBuilderPage, template, category, seoTitle, seoDescription, seoKeywords, ogImage, ogTitle, ogDescription, settings, customCss, customJs, } = body;
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Validating page data");
    if (settings) {
        try {
            JSON.parse(settings);
        }
        catch (err) {
            ctx === null || ctx === void 0 ? void 0 : ctx.fail("Invalid settings JSON");
            throw (0, error_1.createError)({ statusCode: 400, message: "settings: Must be valid JSON" });
        }
    }
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Creating page");
    const page = await db_1.models.page.create({
        title,
        content,
        description,
        image,
        slug,
        status,
        order,
        isHome,
        isBuilderPage,
        template,
        category,
        seoTitle,
        seoDescription,
        seoKeywords,
        ogImage,
        ogTitle,
        ogDescription,
        settings,
        customCss,
        customJs,
        lastModifiedBy: (user === null || user === void 0 ? void 0 : user.id) || null,
    });
    ctx === null || ctx === void 0 ? void 0 : ctx.success(`Page "${title}" created successfully`);
    return page;
};
