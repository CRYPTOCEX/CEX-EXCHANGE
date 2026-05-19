"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const db_1 = require("@b/db");
const console_1 = require("@b/utils/console");
exports.metadata = {
    summary: "Update default page content",
    operationId: "updateDefaultPageContent",
    tags: ["Admin", "Default Editor"],
    logModule: "ADMIN_CMS",
    logTitle: "Update default editor",
    parameters: [
        {
            index: 0,
            name: "pageId",
            in: "path",
            required: true,
            schema: { type: "string" },
            description: "Page identifier (home, about, privacy, terms, contact)",
        },
        {
            name: "pageSource",
            in: "query",
            required: false,
            schema: { type: "string", enum: ["default", "builder"] },
            description: "Page source type - default for regular pages, builder for builder-created pages",
        },
    ],
    requestBody: {
        required: true,
        content: {
            "application/json": {
                schema: {
                    type: "object",
                    properties: {
                        title: { type: "string" },
                        variables: { type: "object" },
                        content: { type: "string" },
                        meta: { type: "object" },
                        status: { type: "string", enum: ["active", "draft"] },
                    },
                },
            },
        },
    },
    responses: {
        200: {
            description: "Page content updated successfully",
            content: {
                "application/json": {
                    schema: {
                        type: "object",
                        properties: {
                            success: { type: "boolean" },
                            lastModified: { type: "string" },
                            message: { type: "string" },
                        },
                    },
                },
            },
        },
        400: {
            description: "Invalid request",
        },
        404: {
            description: "Page not found",
        },
    },
    requiresAuth: true,
    permission: "edit.page"
};
exports.default = async (data) => {
    var _a, _b;
    const { params, query, body, ctx } = data;
    const { pageId } = params;
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Validating page parameters");
    const pageSource = body.pageSource || query.pageSource || 'default';
    const { title, content, meta, status } = body;
    let { variables } = body;
    const validPageIds = ['home', 'about', 'privacy', 'terms', 'contact'];
    const validPageSources = ['default', 'builder'];
    if (!validPageIds.includes(pageId)) {
        return {
            error: "Invalid page ID",
            status: 400
        };
    }
    if (!validPageSources.includes(pageSource)) {
        return {
            error: "Invalid page source",
            status: 400
        };
    }
    try {
        ctx === null || ctx === void 0 ? void 0 : ctx.step("Processing page content update");
        if (variables && typeof variables === 'string') {
            try {
                variables = JSON.parse(variables);
            }
            catch (e) {
                console_1.logger.error("EDITOR", "Failed to parse variables string", e);
                variables = {};
            }
        }
        if (variables && typeof variables === 'object' && !Array.isArray(variables)) {
            const keys = Object.keys(variables);
            const isCharacterIndexed = keys.length > 0 && keys.every(key => !isNaN(parseInt(key)));
            if (isCharacterIndexed) {
                try {
                    const jsonString = keys.sort((a, b) => parseInt(a) - parseInt(b))
                        .map(key => variables[key])
                        .join('');
                    variables = JSON.parse(jsonString);
                }
                catch (e) {
                    console_1.logger.error("EDITOR", "Failed to reconstruct variables from character indices", e);
                    variables = {};
                }
            }
        }
        if (variables && (typeof variables !== 'object' || Array.isArray(variables))) {
            variables = {};
        }
        if (!db_1.models || !db_1.models.defaultPage) {
            return {
                error: "Database connection error",
                status: 500
            };
        }
        ctx === null || ctx === void 0 ? void 0 : ctx.step("Finding existing page");
        const existingPage = await db_1.models.defaultPage.findOne({
            where: { pageId, pageSource }
        });
        if (!existingPage) {
            ctx === null || ctx === void 0 ? void 0 : ctx.step("Creating new page");
            const isHomePage = pageId === 'home';
            const newPage = await db_1.models.defaultPage.create({
                pageId,
                pageSource,
                type: isHomePage ? 'variables' : 'content',
                title: title || pageId.charAt(0).toUpperCase() + pageId.slice(1) + ' Page',
                variables: isHomePage ? (variables || {}) : {},
                content: isHomePage ? "" : (content || ""),
                meta: meta || {},
                status: status || 'active'
            });
            ctx === null || ctx === void 0 ? void 0 : ctx.success(`Page created successfully: ${pageId} (${pageSource})`);
            return {
                success: true,
                lastModified: ((_a = newPage.updatedAt) === null || _a === void 0 ? void 0 : _a.toISOString()) || new Date().toISOString(),
                message: "Page created successfully"
            };
        }
        const isHomePage = pageId === 'home';
        if (isHomePage && existingPage.type === 'variables') {
            if (!variables) {
                return {
                    error: "Variables are required for home page",
                    status: 400
                };
            }
        }
        else if (!isHomePage && existingPage.type === 'content') {
            if (!content) {
                return {
                    error: "Content is required for legal pages",
                    status: 400
                };
            }
        }
        ctx === null || ctx === void 0 ? void 0 : ctx.step("Updating page content");
        const updateData = {};
        if (title)
            updateData.title = title;
        if (meta)
            updateData.meta = meta;
        if (status)
            updateData.status = status;
        if (isHomePage && variables) {
            updateData.variables = variables;
        }
        else if (!isHomePage && content) {
            updateData.content = content;
        }
        updateData.updatedAt = new Date();
        await existingPage.update(updateData);
        ctx === null || ctx === void 0 ? void 0 : ctx.success(`Page updated successfully: ${pageId} (${pageSource})`);
        return {
            success: true,
            lastModified: ((_b = existingPage.updatedAt) === null || _b === void 0 ? void 0 : _b.toISOString()) || new Date().toISOString(),
            message: "Page updated successfully"
        };
    }
    catch (error) {
        console_1.logger.error("EDITOR", "Error updating page content", error);
        ctx === null || ctx === void 0 ? void 0 : ctx.fail("Failed to update page content");
        return {
            error: "Failed to update page content",
            status: 500
        };
    }
};
