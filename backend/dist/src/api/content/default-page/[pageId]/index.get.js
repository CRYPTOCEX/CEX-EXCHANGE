"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const db_1 = require("@b/db");
const mobile_html_1 = require("@b/utils/mobile-html");
const utils_1 = require("../utils");
exports.metadata = {
    summary: "Get default page content",
    operationId: "getPublicDefaultPageContent",
    tags: ["Content", "Pages"],
    requiresAuth: false,
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
};
exports.default = async (data) => {
    var _a;
    const { params, query } = data;
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
        const page = await db_1.models.defaultPage.findOne({
            where: { pageId, pageSource }
        });
        if (!page) {
            const isHomePage = pageId === 'home';
            const title = (0, utils_1.defaultPageTitle)(pageId, pageSource);
            return {
                id: 'default',
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
        let variables = page.variables;
        if (typeof variables === 'string') {
            try {
                variables = JSON.parse(variables);
            }
            catch (e) {
                const errorMessage = e instanceof Error ? e.message : "Unknown error";
                console.error("Failed to parse variables string:", errorMessage);
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
                    const errorMessage = e instanceof Error ? e.message : "Unknown error";
                    console.error("Failed to reconstruct variables from character indices:", errorMessage);
                    variables = {};
                }
            }
        }
        const result = {
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
            lastModified: ((_a = page.updatedAt) === null || _a === void 0 ? void 0 : _a.toISOString()) || new Date().toISOString()
        };
        return (0, mobile_html_1.shapeHtmlForClient)(result, data);
    }
    catch (error) {
        const errorMessage = error instanceof Error ? error.message : "Unknown error";
        console.error("Error retrieving page content:", errorMessage);
        const isHomePage = pageId === 'home';
        const title = (0, utils_1.defaultPageTitle)(pageId, pageSource);
        return {
            id: 'fallback',
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
