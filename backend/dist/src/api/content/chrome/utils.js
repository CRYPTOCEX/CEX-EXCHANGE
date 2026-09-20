"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SITE_CHROME_SINGLETON_ID = exports.CHROME_DOCUMENT_MAX_LABEL = exports.CHROME_DOCUMENT_MAX_BYTES = exports.DEFAULT_CHROME = exports.DEFAULT_FOOTER_CONTENT = exports.EMPTY_MENU_OVERRIDE = exports.EMPTY_MENU_OVERRIDES = exports.DEFAULT_FOOTER_VARIANT = exports.DEFAULT_NAVBAR_VARIANT = exports.FOOTER_VARIANT_IDS = exports.NAVBAR_VARIANT_IDS = void 0;
exports.measureDocumentBytes = measureDocumentBytes;
exports.isKnownNavbarVariant = isKnownNavbarVariant;
exports.isKnownFooterVariant = isKnownFooterVariant;
exports.isPlainObject = isPlainObject;
exports.toStoredJsonObject = toStoredJsonObject;
exports.toMenuOverrides = toMenuOverrides;
exports.toFooterContent = toFooterContent;
exports.stripPermissionKeys = stripPermissionKeys;
exports.normalizeChrome = normalizeChrome;
exports.readSiteChromeRowStrict = readSiteChromeRowStrict;
exports.readSiteChromeRow = readSiteChromeRow;
exports.isPublicMenuScope = isPublicMenuScope;
exports.toPublicMenuOverrides = toPublicMenuOverrides;
exports.toPublicChrome = toPublicChrome;
const db_1 = require("@b/db");
const console_1 = require("@b/utils/console");
exports.NAVBAR_VARIANT_IDS = Object.freeze([
    "classic",
    "centered",
    "stacked",
    "minimal",
]);
exports.FOOTER_VARIANT_IDS = Object.freeze([
    "columns",
    "compact",
    "centered",
]);
exports.DEFAULT_NAVBAR_VARIANT = "classic";
exports.DEFAULT_FOOTER_VARIANT = "columns";
exports.EMPTY_MENU_OVERRIDES = Object.freeze({});
exports.EMPTY_MENU_OVERRIDE = Object.freeze({
    hidden: [],
    labels: {},
    icons: {},
    order: {},
    custom: [],
});
exports.DEFAULT_FOOTER_CONTENT = Object.freeze({
    siteName: null,
    siteDescription: null,
    copyright: null,
    links: exports.EMPTY_MENU_OVERRIDE,
    socials: null,
});
exports.DEFAULT_CHROME = Object.freeze({
    navbarVariant: exports.DEFAULT_NAVBAR_VARIANT,
    footerVariant: exports.DEFAULT_FOOTER_VARIANT,
    menuOverrides: exports.EMPTY_MENU_OVERRIDES,
    footerContent: exports.DEFAULT_FOOTER_CONTENT,
});
exports.CHROME_DOCUMENT_MAX_BYTES = 256 * 1024;
exports.CHROME_DOCUMENT_MAX_LABEL = "256KB";
function measureDocumentBytes(document) {
    var _a;
    try {
        return Buffer.byteLength((_a = JSON.stringify(document)) !== null && _a !== void 0 ? _a : "", "utf8");
    }
    catch (_b) {
        return null;
    }
}
exports.SITE_CHROME_SINGLETON_ID = "00000000-0000-4000-8000-000000000001";
function isKnownNavbarVariant(id) {
    return typeof id === "string" && exports.NAVBAR_VARIANT_IDS.includes(id);
}
function isKnownFooterVariant(id) {
    return typeof id === "string" && exports.FOOTER_VARIANT_IDS.includes(id);
}
function isPlainObject(value) {
    return typeof value === "object" && value !== null && !Array.isArray(value);
}
function toStoredJsonObject(raw, fallback) {
    if (raw === null || raw === undefined)
        return fallback;
    if (typeof raw === "string") {
        const trimmed = raw.trim();
        if (!trimmed)
            return fallback;
        try {
            const parsed = JSON.parse(trimmed);
            return isPlainObject(parsed) ? parsed : fallback;
        }
        catch (_a) {
            return fallback;
        }
    }
    return isPlainObject(raw) ? raw : fallback;
}
function toMenuOverrides(raw) {
    return toStoredJsonObject(raw, exports.EMPTY_MENU_OVERRIDES);
}
function toFooterContent(raw) {
    const stored = toStoredJsonObject(raw, {});
    return { ...exports.DEFAULT_FOOTER_CONTENT, ...stored };
}
function stripPermissionKeys(document) {
    const stack = [document];
    const seen = new Set();
    while (stack.length) {
        const node = stack.pop();
        if (!node || typeof node !== "object")
            continue;
        if (seen.has(node))
            continue;
        seen.add(node);
        if (Array.isArray(node)) {
            for (const item of node)
                stack.push(item);
            continue;
        }
        const obj = node;
        if ("permission" in obj)
            delete obj.permission;
        for (const value of Object.values(obj))
            stack.push(value);
    }
    return document;
}
function normalizeChrome(raw) {
    const input = (raw !== null && raw !== void 0 ? raw : {});
    return {
        navbarVariant: isKnownNavbarVariant(input.navbarVariant)
            ? input.navbarVariant
            : exports.DEFAULT_NAVBAR_VARIANT,
        footerVariant: isKnownFooterVariant(input.footerVariant)
            ? input.footerVariant
            : exports.DEFAULT_FOOTER_VARIANT,
        menuOverrides: toMenuOverrides(input.menuOverrides),
        footerContent: toFooterContent(input.footerContent),
    };
}
async function readSiteChromeRowStrict() {
    const byId = await db_1.models.siteChrome.findByPk(exports.SITE_CHROME_SINGLETON_ID);
    if (byId)
        return byId;
    return await db_1.models.siteChrome.findOne({ order: [["createdAt", "ASC"]] });
}
async function readSiteChromeRow() {
    try {
        return await readSiteChromeRowStrict();
    }
    catch (error) {
        console_1.logger.error("CHROME", "Failed to read site chrome row; falling back to defaults", error);
        return null;
    }
}
function isPublicMenuScope(scope) {
    if (scope === "admin")
        return false;
    if (scope.startsWith("ext_admin_"))
        return false;
    return scope === "user" || scope.startsWith("ext_");
}
function toPublicMenuOverrides(overrides) {
    const visible = {};
    for (const scope of Object.keys(overrides)) {
        if (isPublicMenuScope(scope))
            visible[scope] = overrides[scope];
    }
    return visible;
}
function toPublicChrome(source) {
    const { navbarVariant, footerVariant, menuOverrides, footerContent } = normalizeChrome(source);
    return {
        navbarVariant,
        footerVariant,
        menuOverrides: toPublicMenuOverrides(menuOverrides),
        footerContent,
    };
}
