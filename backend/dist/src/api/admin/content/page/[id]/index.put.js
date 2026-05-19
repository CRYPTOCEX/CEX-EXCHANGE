"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const query_1 = require("@b/utils/query");
const utils_1 = require("../utils");
const db_1 = require("@b/db");
const sequelize_1 = require("sequelize");
const error_1 = require("@b/utils/error");
exports.metadata = {
    summary: "Updates an existing page",
    operationId: "updatePage",
    tags: ["Admin", "Content", "Page"],
    parameters: [
        {
            index: 0,
            name: "id",
            in: "path",
            description: "ID of the page to update",
            required: true,
            schema: {
                type: "string",
            },
        },
    ],
    requestBody: {
        required: true,
        description: "Updated data for the page",
        content: {
            "application/json": {
                schema: utils_1.pageUpdateSchema,
            },
        },
    },
    responses: (0, query_1.updateRecordResponses)("Page"),
    requiresAuth: true,
    permission: "edit.page",
    logModule: "ADMIN_CMS",
    logTitle: "Update page",
};
exports.default = async (data) => {
    const { body, params, user, ctx } = data;
    const { id } = params;
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Validating page data");
    if (body.settings) {
        try {
            JSON.parse(body.settings);
        }
        catch (err) {
            ctx === null || ctx === void 0 ? void 0 : ctx.fail("Invalid settings JSON");
            throw (0, error_1.createError)({ statusCode: 400, message: "settings: Must be valid JSON" });
        }
    }
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Preparing update data");
    const updateData = { lastModifiedBy: (user === null || user === void 0 ? void 0 : user.id) || null };
    [
        "title",
        "content",
        "description",
        "image",
        "slug",
        "status",
        "order",
        "isHome",
        "isBuilderPage",
        "template",
        "category",
        "seoTitle",
        "seoDescription",
        "seoKeywords",
        "ogImage",
        "ogTitle",
        "ogDescription",
        "settings",
        "customCss",
        "customJs",
    ].forEach((key) => {
        if (key === "slug" &&
            (body[key] === undefined || body[key] === null || body[key] === "")) {
            ctx === null || ctx === void 0 ? void 0 : ctx.fail("Slug is required");
            throw (0, error_1.createError)({ statusCode: 400, message: "slug: Slug is required." });
        }
        if (body[key] !== undefined) {
            updateData[key] = body[key];
        }
    });
    if (updateData.isHome === true) {
        ctx === null || ctx === void 0 ? void 0 : ctx.step("Validating home page constraints");
        const otherHome = await db_1.models.page.findOne({
            where: {
                isHome: true,
                id: { [sequelize_1.Op.ne]: id },
            },
        });
        if (otherHome) {
            ctx === null || ctx === void 0 ? void 0 : ctx.fail("Another page is already set as home page");
            throw (0, error_1.createError)({
                statusCode: 409,
                message: "isHome: Only one page can be marked as home page. Please unset home on the other page first."
            });
        }
    }
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Updating page in database");
    const result = await (0, query_1.updateRecord)("page", id, updateData);
    ctx === null || ctx === void 0 ? void 0 : ctx.success("Page updated successfully");
    return result;
};
