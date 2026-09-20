"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const query_1 = require("@b/utils/query");
const utils_1 = require("./utils");
const utils_2 = require("@b/api/content/page/utils");
const db_1 = require("@b/db");
const error_1 = require("@b/utils/error");
const sanitize_html_1 = require("@b/utils/sanitize-html");
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
    (0, utils_1.assertSlugNotReserved)(slug, ctx);
    const effectiveCustomJs = customJs;
    if (customJs !== undefined && customJs !== null && customJs !== "") {
        const userPk = await db_1.models.user.findByPk(user === null || user === void 0 ? void 0 : user.id, {
            include: [{ model: db_1.models.role, as: "role" }],
        });
        if (!userPk || !userPk.role || userPk.role.name !== "Super Admin") {
            ctx === null || ctx === void 0 ? void 0 : ctx.fail("customJs is restricted to Super Admins");
            throw (0, error_1.createError)({
                statusCode: 403,
                message: "customJs: Only Super Admins can set custom JavaScript.",
            });
        }
    }
    const sanitizedContent = typeof content === "string" ? (0, sanitize_html_1.sanitizeHTML)(content) : content;
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Creating page");
    const page = await db_1.sequelize.transaction(async (t) => {
        if (isHome === true) {
            const otherHome = await db_1.models.page.findOne({
                where: { isHome: true },
                lock: true,
                transaction: t,
            });
            if (otherHome) {
                ctx === null || ctx === void 0 ? void 0 : ctx.fail("Another page is already set as home page");
                throw (0, error_1.createError)({
                    statusCode: 409,
                    message: "isHome: Only one page can be marked as home page. Please unset home on the other page first.",
                });
            }
        }
        return db_1.models.page.create({
            title,
            content: sanitizedContent,
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
            customJs: effectiveCustomJs,
            lastModifiedBy: (user === null || user === void 0 ? void 0 : user.id) || null,
        }, { transaction: t });
    });
    await (0, utils_2.invalidatePagesCache)();
    ctx === null || ctx === void 0 ? void 0 : ctx.success(`Page "${title}" created successfully`);
    return page;
};
