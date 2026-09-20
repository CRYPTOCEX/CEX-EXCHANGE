"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const db_1 = require("@b/db");
const console_1 = require("@b/utils/console");
const utils_1 = require("@b/api/content/default-page/utils");
exports.metadata = {
    summary: "Get default page content",
    operationId: "getDefaultPageContent",
    tags: ["Admin", "Default Editor"],
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
    responses: {
        200: {
            description: "Page content retrieved successfully",
            content: {
                "application/json": {
                    schema: {
                        type: "object",
                        properties: {
                            id: { type: "string" },
                            pageId: { type: "string" },
                            type: { type: "string", enum: ["variables", "content"] },
                            title: { type: "string" },
                            variables: { type: "object" },
                            content: { type: "string" },
                            meta: { type: "object" },
                            status: { type: "string" },
                            lastModified: { type: "string" },
                        },
                    },
                },
            },
        },
        404: {
            description: "Page not found",
        },
    },
    requiresAuth: true,
    permission: "view.page",
    logModule: "ADMIN_CONTENT",
    logTitle: "Get Default Page Content"
};
exports.default = async (data) => {
    const { params, query, ctx } = data;
    const { pageId } = params;
    const { pageSource = 'default' } = query;
    if (!(0, utils_1.isDefaultPageId)(pageId)) {
        return {
            error: `Invalid page ID. Expected one of: ${utils_1.DEFAULT_PAGE_IDS.join(", ")}`,
            status: 400
        };
    }
    if (!(0, utils_1.isDefaultPageSource)(pageSource)) {
        return {
            error: `Invalid page source. Expected one of: ${utils_1.DEFAULT_PAGE_SOURCES.join(", ")}`,
            status: 400
        };
    }
    try {
        ctx === null || ctx === void 0 ? void 0 : ctx.step("Fetching page content");
        let page = await db_1.models.defaultPage.findOne({
            where: { pageId, pageSource }
        });
        if (!page) {
            const isHomePage = pageId === 'home';
            const title = (0, utils_1.defaultPageTitle)(pageId, pageSource);
            try {
                page = await db_1.models.defaultPage.create({
                    pageId,
                    pageSource,
                    type: (0, utils_1.defaultPageType)(pageId),
                    title,
                    variables: isHomePage ? structuredClone(utils_1.DEFAULT_HOME_VARIABLES) : {},
                    content: (0, utils_1.defaultLegalContent)(pageId),
                    meta: (0, utils_1.seedPageMeta)(pageId, pageSource),
                    status: 'active'
                });
            }
            catch (createError) {
                console_1.logger.error("EDITOR", "Error creating default page", createError);
                return {
                    id: 'runtime-default',
                    isFallback: true,
                    fallbackReason: 'Default page could not be created in the database.',
                    pageId,
                    pageSource,
                    type: (0, utils_1.defaultPageType)(pageId),
                    title,
                    variables: isHomePage ? utils_1.DEFAULT_HOME_VARIABLES : {},
                    content: (0, utils_1.defaultLegalContent)(pageId),
                    meta: (0, utils_1.seedPageMeta)(pageId, pageSource),
                    status: 'active',
                    lastModified: new Date().toISOString()
                };
            }
        }
        let variables = page.variables;
        if (typeof variables === 'string') {
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
        ctx === null || ctx === void 0 ? void 0 : ctx.success("Page content retrieved successfully");
        return {
            id: page.id,
            pageId: page.pageId,
            pageSource: page.pageSource,
            type: page.type,
            title: page.title,
            variables: variables || {},
            content: page.content || "",
            meta: (0, utils_1.resolvePageMeta)({
                pageId: page.pageId,
                pageSource: page.pageSource,
                meta: page.meta,
                variables,
            }),
            status: page.status,
            lastModified: page.updatedAt ? page.updatedAt.toISOString() : new Date().toISOString()
        };
    }
    catch (error) {
        console_1.logger.error("EDITOR", "Error retrieving page content", error);
        const isHomePage = pageId === 'home';
        const title = (0, utils_1.defaultPageTitle)(pageId, pageSource);
        return {
            id: 'emergency-fallback',
            isFallback: true,
            fallbackReason: 'Page content could not be read from the database.',
            pageId,
            pageSource,
            type: (0, utils_1.defaultPageType)(pageId),
            title,
            variables: isHomePage ? utils_1.DEFAULT_HOME_VARIABLES : {},
            content: (0, utils_1.defaultLegalContent)(pageId),
            meta: (0, utils_1.seedPageMeta)(pageId, pageSource),
            status: 'active',
            lastModified: new Date().toISOString()
        };
    }
};
