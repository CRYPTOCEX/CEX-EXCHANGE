"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
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
                                id: { type: "string" },
                                name: { type: "string" },
                                description: { type: "string" },
                                path: { type: "string" },
                                status: { type: "string", enum: ["active", "inactive"] },
                                lastModified: { type: "string" },
                                type: { type: "string", enum: ["page", "layout"] }
                            }
                        }
                    }
                }
            }
        }
    },
    requiresAuth: true,
    permission: "view.page",
    logModule: "ADMIN_CONTENT",
    logTitle: "List Default Editor Pages"
};
exports.default = async (data) => {
    const { ctx } = data;
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Fetching default editor pages");
    const defaultPages = [
        {
            id: "home",
            name: "Default Home Page",
            description: "Main landing page with hero section, features, and market overview (Default Layout)",
            path: "/home.tsx",
            status: "active",
            lastModified: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
            type: "page",
            pageSource: "default"
        },
        {
            id: "about",
            name: "About Page",
            description: "Company information and team details",
            path: "/about/page.tsx",
            status: "active",
            lastModified: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
            type: "page",
            pageSource: "default"
        },
        {
            id: "privacy",
            name: "Privacy Policy",
            description: "Privacy policy and data protection information",
            path: "/privacy/page.tsx",
            status: "active",
            lastModified: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
            type: "page",
            pageSource: "default"
        },
        {
            id: "terms",
            name: "Terms of Service",
            description: "Terms and conditions for platform usage",
            path: "/terms/page.tsx",
            status: "active",
            lastModified: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
            type: "page",
            pageSource: "default"
        },
        {
            id: "contact",
            name: "Contact Page",
            description: "Contact form and support information",
            path: "/contact/page.tsx",
            status: "active",
            lastModified: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
            type: "page",
            pageSource: "default"
        },
    ];
    ctx === null || ctx === void 0 ? void 0 : ctx.success("Default editor pages retrieved successfully");
    return defaultPages;
};
