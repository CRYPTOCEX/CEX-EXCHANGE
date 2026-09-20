"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const db_1 = require("@b/db");
const utils_1 = require("./utils");
exports.metadata = {
    summary: "Checks whether a page slug is available",
    description: "Returns whether a slug can be used for a CMS page, and if not, why: it is " +
        "reserved by a platform route, or already held by another page (possibly a " +
        "soft-deleted one).",
    operationId: "checkPageSlugAvailability",
    tags: ["Admin", "Content", "Page"],
    parameters: [
        {
            name: "slug",
            in: "query",
            required: true,
            description: "The slug to test. Path-style slugs are tested on their first segment.",
            schema: { type: "string" },
        },
        {
            name: "excludeId",
            in: "query",
            required: false,
            description: "Page id to ignore — so editing a page does not collide with itself.",
            schema: { type: "string" },
        },
    ],
    responses: {
        200: {
            description: "Availability result",
            content: {
                "application/json": {
                    schema: {
                        type: "object",
                        properties: {
                            available: { type: "boolean" },
                            reason: {
                                type: "string",
                                nullable: true,
                                enum: ["RESERVED", "TAKEN", "TAKEN_SOFT_DELETED", "INVALID"],
                            },
                            message: { type: "string", nullable: true },
                            slug: { type: "string" },
                        },
                    },
                },
            },
        },
    },
    requiresAuth: true,
    permission: "edit.page",
};
function firstSegment(value) {
    if (typeof value !== "string")
        return "";
    return value.trim().replace(/^\/+/, "").split("/")[0].toLowerCase();
}
exports.default = async (data) => {
    const { query } = data;
    const raw = typeof (query === null || query === void 0 ? void 0 : query.slug) === "string" ? query.slug : "";
    const head = firstSegment(raw);
    if (!head) {
        return {
            available: false,
            reason: "INVALID",
            message: "Enter a slug.",
            slug: raw,
        };
    }
    if (!/^[a-z0-9\-_/]+$/.test(raw.trim().replace(/^\/+/, ""))) {
        return {
            available: false,
            reason: "INVALID",
            message: "Use lowercase letters, numbers, hyphens, underscores and slashes only.",
            slug: raw,
        };
    }
    if (utils_1.RESERVED_SLUGS.includes(head)) {
        return {
            available: false,
            reason: "RESERVED",
            message: `"${head}" is a page the platform already serves. A page here would never open.`,
            slug: raw,
        };
    }
    const where = { slug: raw.trim().replace(/^\/+/, "") };
    const existing = await db_1.models.page.findOne({
        where,
        paranoid: false,
        attributes: ["id", "title", "deletedAt"],
    });
    if (existing && existing.id !== (query === null || query === void 0 ? void 0 : query.excludeId)) {
        const soft = existing.deletedAt !== null && existing.deletedAt !== undefined;
        return {
            available: false,
            reason: soft ? "TAKEN_SOFT_DELETED" : "TAKEN",
            message: soft
                ? `"${raw}" belongs to a deleted page ("${existing.title}") that still holds the slug. Restore it, or choose another.`
                : `"${raw}" is already used by "${existing.title}".`,
            slug: raw,
        };
    }
    return { available: true, reason: null, message: null, slug: raw };
};
