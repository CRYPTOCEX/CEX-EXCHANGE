"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const db_1 = require("@b/db");
const query_1 = require("@b/utils/query");
const error_1 = require("@b/utils/error");
const utils_1 = require("@b/api/content/chrome/utils");
exports.metadata = {
    summary: "Updates the site chrome selection",
    operationId: "updateSiteChrome",
    tags: ["Admin", "Content", "Chrome"],
    requestBody: {
        required: true,
        description: "Chrome settings to apply. Every field is optional; an omitted field is left exactly as stored.",
        content: {
            "application/json": {
                schema: {
                    type: "object",
                    properties: {
                        navbarVariant: {
                            type: "string",
                            description: "Id of the navbar layout variant",
                            enum: [...utils_1.NAVBAR_VARIANT_IDS],
                        },
                        footerVariant: {
                            type: "string",
                            description: "Id of the footer layout variant",
                            enum: [...utils_1.FOOTER_VARIANT_IDS],
                        },
                        menuOverrides: {
                            type: "object",
                            additionalProperties: true,
                            description: "Menu override patches keyed by scope. Replaces the stored document wholesale. Any `permission` key inside is stripped before storage.",
                        },
                        footerContent: {
                            type: "object",
                            additionalProperties: true,
                            description: "Footer brand text, link override patch and social links. Replaces the stored document wholesale.",
                        },
                        updatedAt: {
                            type: "string",
                            nullable: true,
                            description: "Optional optimistic-concurrency precondition: the `updatedAt` the client last read. When present and it does not match the stored row, the save is refused with 409 instead of overwriting someone else's edit. Omit it (or send null) to keep the previous last-write-wins behaviour.",
                        },
                    },
                },
            },
        },
    },
    responses: {
        200: {
            description: "Site chrome selection updated successfully",
            content: {
                "application/json": {
                    schema: {
                        type: "object",
                        properties: {
                            id: { type: "string" },
                            navbarVariant: { type: "string" },
                            footerVariant: { type: "string" },
                            menuOverrides: { type: "object", additionalProperties: true },
                            footerContent: { type: "object", additionalProperties: true },
                            createdAt: { type: "string", format: "date-time" },
                            updatedAt: { type: "string", format: "date-time" },
                        },
                    },
                },
            },
        },
        400: query_1.invalidRequestResponse,
        401: query_1.unauthorizedResponse,
        409: {
            description: "The stored row changed after the client read it — the supplied `updatedAt` precondition no longer matches. Nothing was written.",
            content: {
                "application/json": {
                    schema: {
                        type: "object",
                        properties: {
                            message: { type: "string", description: "Error message" },
                        },
                    },
                },
            },
        },
        500: query_1.serverErrorResponse,
    },
    requiresAuth: true,
    permission: "access.design",
    logModule: "ADMIN_CMS",
    logTitle: "Update site chrome",
};
function prepareDocument(field, value, ctx) {
    if (!(0, utils_1.isPlainObject)(value)) {
        ctx === null || ctx === void 0 ? void 0 : ctx.fail(`${field} is not an object`);
        throw (0, error_1.createError)({
            statusCode: 400,
            message: `${field}: must be a JSON object. Send {} to clear it.`,
        });
    }
    (0, utils_1.stripPermissionKeys)(value);
    const bytes = (0, utils_1.measureDocumentBytes)(value);
    if (bytes === null) {
        ctx === null || ctx === void 0 ? void 0 : ctx.fail(`${field} could not be serialised`);
        throw (0, error_1.createError)({
            statusCode: 400,
            message: `${field}: could not be serialised as JSON.`,
        });
    }
    if (bytes > utils_1.CHROME_DOCUMENT_MAX_BYTES) {
        ctx === null || ctx === void 0 ? void 0 : ctx.fail(`${field} is ${bytes} bytes, over the cap`);
        throw (0, error_1.createError)({
            statusCode: 400,
            message: `${field}: document is ${bytes} bytes, which is over the ${utils_1.CHROME_DOCUMENT_MAX_LABEL} limit. This document is read on every page render, so it is capped.`,
        });
    }
    return value;
}
function readRawJsonBody(data) {
    const raw = data.rawBodyString;
    if (typeof raw !== "string")
        return null;
    const trimmed = raw.trim();
    if (!trimmed)
        return null;
    try {
        const parsed = JSON.parse(trimmed);
        return (0, utils_1.isPlainObject)(parsed) ? parsed : null;
    }
    catch (_a) {
        return null;
    }
}
function parsePrecondition(value, ctx) {
    if (value === undefined || value === null)
        return null;
    if (typeof value !== "string") {
        ctx === null || ctx === void 0 ? void 0 : ctx.fail("updatedAt precondition is not a string");
        throw (0, error_1.createError)({
            statusCode: 400,
            message: "updatedAt: must be the ISO timestamp you last read, or omitted entirely.",
        });
    }
    const trimmed = value.trim();
    if (!trimmed)
        return null;
    const ms = new Date(trimmed).getTime();
    if (!Number.isFinite(ms)) {
        ctx === null || ctx === void 0 ? void 0 : ctx.fail("updatedAt precondition is not a timestamp");
        throw (0, error_1.createError)({
            statusCode: 400,
            message: `updatedAt: "${trimmed}" is not a valid ISO timestamp.`,
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
exports.default = async (data) => {
    var _a, _b, _c;
    const { body, ctx } = data;
    const validated = (0, utils_1.isPlainObject)(body) ? body : {};
    const documents = (_a = readRawJsonBody(data)) !== null && _a !== void 0 ? _a : validated;
    const navbarVariant = validated.navbarVariant;
    const footerVariant = validated.footerVariant;
    const menuOverrides = documents.menuOverrides;
    const footerContent = documents.footerContent;
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Validating chrome payload");
    if (navbarVariant === undefined &&
        footerVariant === undefined &&
        menuOverrides === undefined &&
        footerContent === undefined) {
        ctx === null || ctx === void 0 ? void 0 : ctx.fail("No chrome fields supplied");
        throw (0, error_1.createError)({
            statusCode: 400,
            message: "Supply at least one of navbarVariant, footerVariant, menuOverrides or footerContent.",
        });
    }
    if (navbarVariant !== undefined && !(0, utils_1.isKnownNavbarVariant)(navbarVariant)) {
        ctx === null || ctx === void 0 ? void 0 : ctx.fail("Unknown navbar variant");
        throw (0, error_1.createError)({
            statusCode: 400,
            message: `navbarVariant: Unknown navbar variant. Allowed: ${utils_1.NAVBAR_VARIANT_IDS.join(", ")}`,
        });
    }
    if (footerVariant !== undefined && !(0, utils_1.isKnownFooterVariant)(footerVariant)) {
        ctx === null || ctx === void 0 ? void 0 : ctx.fail("Unknown footer variant");
        throw (0, error_1.createError)({
            statusCode: 400,
            message: `footerVariant: Unknown footer variant. Allowed: ${utils_1.FOOTER_VARIANT_IDS.join(", ")}`,
        });
    }
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Validating chrome documents");
    const nextMenuOverrides = menuOverrides !== undefined
        ? prepareDocument("menuOverrides", menuOverrides, ctx)
        : undefined;
    const nextFooterContent = footerContent !== undefined
        ? prepareDocument("footerContent", footerContent, ctx)
        : undefined;
    const precondition = parsePrecondition(validated.updatedAt, ctx);
    const existing = await (0, utils_1.readSiteChromeRowStrict)();
    const current = existing ? (0, utils_1.normalizeChrome)(existing) : { ...utils_1.DEFAULT_CHROME };
    if (precondition !== null) {
        const storedMs = toEpochMs(existing === null || existing === void 0 ? void 0 : existing.updatedAt);
        if (storedMs === null || storedMs !== precondition) {
            ctx === null || ctx === void 0 ? void 0 : ctx.fail("Chrome row changed since the client read it");
            throw (0, error_1.createError)({
                statusCode: 409,
                message: "These settings were changed by someone else since you loaded them. Reload the page to get the current values, then apply your changes again.",
            });
        }
    }
    const next = {
        navbarVariant: navbarVariant !== undefined
            ? navbarVariant
            : current.navbarVariant,
        footerVariant: footerVariant !== undefined
            ? footerVariant
            : current.footerVariant,
        menuOverrides: nextMenuOverrides !== undefined ? nextMenuOverrides : current.menuOverrides,
        footerContent: nextFooterContent !== undefined ? nextFooterContent : current.footerContent,
    };
    ctx === null || ctx === void 0 ? void 0 : ctx.step(`Saving chrome: navbar=${next.navbarVariant}, footer=${next.footerVariant}`);
    let saved;
    if (existing) {
        saved = await existing.update(next);
    }
    else {
        const [row, created] = await db_1.models.siteChrome.findOrCreate({
            where: { id: utils_1.SITE_CHROME_SINGLETON_ID },
            defaults: { id: utils_1.SITE_CHROME_SINGLETON_ID, ...next },
        });
        saved = created ? row : await row.update(next);
    }
    try {
        await saved.reload();
    }
    catch (_d) {
        ctx === null || ctx === void 0 ? void 0 : ctx.warn("Saved, but could not re-read the row to echo it");
    }
    ctx === null || ctx === void 0 ? void 0 : ctx.success("Site chrome updated");
    const savedConfig = (0, utils_1.normalizeChrome)(saved);
    return {
        id: saved.id,
        navbarVariant: savedConfig.navbarVariant,
        footerVariant: savedConfig.footerVariant,
        menuOverrides: savedConfig.menuOverrides,
        footerContent: savedConfig.footerContent,
        createdAt: (_b = saved.createdAt) !== null && _b !== void 0 ? _b : null,
        updatedAt: (_c = saved.updatedAt) !== null && _c !== void 0 ? _c : null,
    };
};
