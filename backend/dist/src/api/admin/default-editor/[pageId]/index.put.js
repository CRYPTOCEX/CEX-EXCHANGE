"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const db_1 = require("@b/db");
const console_1 = require("@b/utils/console");
const error_1 = require("@b/utils/error");
const utils_1 = require("@b/api/content/default-page/utils");
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
                        expectedLastModified: {
                            type: "string",
                            nullable: true,
                            description: "Optional optimistic-concurrency precondition: the `lastModified` this client last read for this page. When present and it does not match the stored row, the save is refused with 409 and NOTHING is written. Omit it (or send null) to keep the previous last-write-wins behaviour.",
                        },
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
                            lastModified: {
                                type: "string",
                                format: "date-time",
                                description: "The row's `updatedAt` AFTER this write, re-read from the database. Adopt it as the `expectedLastModified` for your next save.",
                            },
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
        409: {
            description: "The stored page changed after this client read it — the supplied `expectedLastModified` no longer matches. Nothing was written.",
            content: {
                "application/json": {
                    schema: {
                        type: "object",
                        properties: {
                            message: { type: "string" },
                            statusCode: { type: "number", enum: [409] },
                        },
                    },
                },
            },
        },
    },
    requiresAuth: true,
    permission: "edit.page"
};
function parsePrecondition(value, ctx) {
    if (value === undefined || value === null)
        return null;
    if (typeof value !== "string") {
        ctx === null || ctx === void 0 ? void 0 : ctx.fail("expectedLastModified precondition is not a string");
        throw (0, error_1.createError)({
            statusCode: 400,
            message: "expectedLastModified: must be the ISO timestamp you last read, or omitted entirely.",
        });
    }
    const trimmed = value.trim();
    if (!trimmed)
        return null;
    const ms = new Date(trimmed).getTime();
    if (!Number.isFinite(ms)) {
        ctx === null || ctx === void 0 ? void 0 : ctx.fail("expectedLastModified precondition is not a timestamp");
        throw (0, error_1.createError)({
            statusCode: 400,
            message: `expectedLastModified: "${trimmed}" is not a valid ISO timestamp.`,
        });
    }
    return ms;
}
function toEpochMs(value) {
    if (value === null || value === undefined)
        return null;
    const ms = value instanceof Date ? value.getTime() : new Date(value).getTime();
    return Number.isFinite(ms) ? ms : null;
}
async function readBackLastModified(row, ctx) {
    var _a;
    try {
        await row.reload();
    }
    catch (_b) {
        ctx === null || ctx === void 0 ? void 0 : ctx.warn("Saved, but could not re-read the row to echo its timestamp");
    }
    return ((_a = row.updatedAt) === null || _a === void 0 ? void 0 : _a.toISOString()) || new Date().toISOString();
}
exports.default = async (data) => {
    const { params, query, body, ctx } = data;
    const { pageId } = params;
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Validating page parameters");
    const pageSource = body.pageSource || query.pageSource || 'default';
    const { title, content, meta, status } = body;
    let { variables } = body;
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
    const precondition = parsePrecondition(body.expectedLastModified, ctx);
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
        if (precondition !== null) {
            const storedMs = toEpochMs(existingPage === null || existingPage === void 0 ? void 0 : existingPage.updatedAt);
            if (storedMs === null || storedMs !== precondition) {
                ctx === null || ctx === void 0 ? void 0 : ctx.fail("Page changed since the client read it");
                throw (0, error_1.createError)({
                    statusCode: 409,
                    message: "This page was changed by someone else since you loaded it. Reload the page to get the current content, then apply your changes again.",
                });
            }
        }
        if (!existingPage) {
            ctx === null || ctx === void 0 ? void 0 : ctx.step("Creating new page");
            const isHomePage = pageId === 'home';
            const newPage = await db_1.models.defaultPage.create({
                pageId,
                pageSource,
                type: (0, utils_1.defaultPageType)(pageId),
                title: title || (0, utils_1.defaultPageTitle)(pageId, pageSource),
                variables: isHomePage ? (variables || {}) : {},
                content: isHomePage ? "" : (content || ""),
                meta: meta || {},
                status: status || 'active'
            });
            ctx === null || ctx === void 0 ? void 0 : ctx.success(`Page created successfully: ${pageId} (${pageSource})`);
            return {
                success: true,
                lastModified: await readBackLastModified(newPage, ctx),
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
            lastModified: await readBackLastModified(existingPage, ctx),
            message: "Page updated successfully"
        };
    }
    catch (error) {
        if (error instanceof error_1.CustomError)
            throw error;
        console_1.logger.error("EDITOR", "Error updating page content", error);
        ctx === null || ctx === void 0 ? void 0 : ctx.fail("Failed to update page content");
        return {
            error: "Failed to update page content",
            status: 500
        };
    }
};
