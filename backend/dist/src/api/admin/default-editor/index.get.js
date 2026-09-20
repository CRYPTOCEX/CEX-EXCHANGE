"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const sequelize_1 = require("sequelize");
const db_1 = require("@b/db");
const utils_1 = require("@b/api/content/default-page/utils");
exports.metadata = {
    summary: "List default editor pages",
    operationId: "listDefaultEditorPages",
    tags: ["Admin", "Default Editor"],
    responses: {
        200: {
            description: "List of default editor pages",
            content: {
                "application/json": {
                    schema: {
                        type: "array",
                        items: {
                            type: "object",
                            properties: {
                                id: { type: "string", enum: [...utils_1.DEFAULT_PAGE_IDS] },
                                name: { type: "string" },
                                description: { type: "string" },
                                path: { type: "string" },
                                status: { type: "string", enum: ["active", "draft"] },
                                lastModified: {
                                    type: "string",
                                    format: "date-time",
                                    nullable: true,
                                    description: "The stored row's `updatedAt`, or null when the page has no row yet — i.e. nobody has ever edited it. Render null as \"Never edited\"; do NOT substitute a time.",
                                },
                                pageSource: { type: "string", enum: ["default"] },
                                type: { type: "string", enum: ["page"] },
                            },
                        },
                    },
                },
            },
        },
    },
    requiresAuth: true,
    permission: "view.page",
    logModule: "ADMIN_CONTENT",
    logTitle: "List Default Editor Pages"
};
const DEFAULT_PAGE_CATALOGUE = [
    {
        id: "home",
        name: "Default Home Page",
        description: "Main landing page with hero section, features, and market overview (Default Layout)",
        path: "/home.tsx",
    },
    {
        id: "about",
        name: "About Page",
        description: "Company information and team details",
        path: "/about/page.tsx",
    },
    {
        id: "privacy",
        name: "Privacy Policy",
        description: "Privacy policy and data protection information",
        path: "/privacy/page.tsx",
    },
    {
        id: "terms",
        name: "Terms of Service",
        description: "Terms and conditions for platform usage",
        path: "/terms/page.tsx",
    },
    {
        id: "contact",
        name: "Contact Page",
        description: "Contact form and support information",
        path: "/contact/page.tsx",
    },
];
exports.default = async (data) => {
    const { ctx } = data;
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Fetching default editor pages");
    const rows = await db_1.models.defaultPage.findAll({
        where: {
            pageSource: "default",
            pageId: { [sequelize_1.Op.in]: DEFAULT_PAGE_CATALOGUE.map((page) => page.id) },
        },
        attributes: ["pageId", "status", "updatedAt"],
    });
    const rowByPageId = new Map(rows.map((row) => [row.pageId, row]));
    const defaultPages = DEFAULT_PAGE_CATALOGUE.map((page) => {
        var _a;
        const row = rowByPageId.get(page.id);
        const updatedAt = (row === null || row === void 0 ? void 0 : row.updatedAt) ? new Date(row.updatedAt) : null;
        return {
            ...page,
            status: (_a = row === null || row === void 0 ? void 0 : row.status) !== null && _a !== void 0 ? _a : "active",
            lastModified: updatedAt && Number.isFinite(updatedAt.getTime())
                ? updatedAt.toISOString()
                : null,
            type: "page",
            pageSource: "default",
        };
    });
    ctx === null || ctx === void 0 ? void 0 : ctx.success("Default editor pages retrieved successfully");
    return defaultPages;
};
