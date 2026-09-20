"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.postTagsSchema = void 0;
exports.getMaxTagsPerPost = getMaxTagsPerPost;
exports.resolvePostTags = resolvePostTags;
exports.syncPostTags = syncPostTags;
const db_1 = require("@b/db");
const utils_1 = require("@b/utils");
const error_1 = require("@b/utils/error");
const cache_1 = require("@b/utils/cache");
exports.postTagsSchema = {
    type: "array",
    description: "Tags for the post. Each entry is either an existing tag `{ id }` or a new tag `{ name }`.",
    items: {
        type: "object",
        properties: {
            id: { type: "string", description: "Existing tag id" },
            name: { type: "string", description: "Tag name, created if unknown" },
        },
    },
};
const MAX_TAG_NAME = 255;
async function getMaxTagsPerPost() {
    const raw = await cache_1.CacheManager.getInstance().getSetting("maxTagsPerPost");
    const parsed = Number(raw);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : 5;
}
async function resolvePostTags(tags, transaction) {
    if (!Array.isArray(tags) || tags.length === 0)
        return [];
    const maxTags = await getMaxTagsPerPost();
    if (tags.length > maxTags) {
        throw (0, error_1.createError)({
            statusCode: 400,
            message: `A post may have at most ${maxTags} tags.`,
        });
    }
    const resolved = [];
    for (const entry of tags) {
        if (entry === null || entry === void 0 ? void 0 : entry.id) {
            const existing = await db_1.models.tag.findByPk(entry.id, { transaction });
            if (!existing) {
                throw (0, error_1.createError)({
                    statusCode: 400,
                    message: `Tag with id ${entry.id} not found`,
                });
            }
            if (!resolved.includes(existing.id))
                resolved.push(existing.id);
            continue;
        }
        const name = typeof (entry === null || entry === void 0 ? void 0 : entry.name) === "string" ? entry.name.trim() : "";
        if (!name) {
            throw (0, error_1.createError)({
                statusCode: 400,
                message: "Each tag must have either an id or a name",
            });
        }
        if (name.length > MAX_TAG_NAME) {
            throw (0, error_1.createError)({
                statusCode: 400,
                message: `Tag names must be ${MAX_TAG_NAME} characters or fewer.`,
            });
        }
        const slug = (0, utils_1.slugify)(name);
        if (!slug) {
            throw (0, error_1.createError)({
                statusCode: 400,
                message: `"${name}" cannot be used as a tag name.`,
            });
        }
        let tag = await db_1.models.tag.findOne({ where: { slug }, transaction });
        if (!tag) {
            tag = await db_1.models.tag.create({ name, slug }, { transaction });
        }
        if (!resolved.includes(tag.id))
            resolved.push(tag.id);
    }
    return resolved;
}
async function syncPostTags(postId, tags, transaction) {
    if (tags === undefined)
        return;
    const tagIds = await resolvePostTags(tags, transaction);
    await db_1.models.postTag.destroy({ where: { postId }, transaction });
    if (tagIds.length === 0)
        return;
    await db_1.models.postTag.bulkCreate(tagIds.map((tagId) => ({ postId, tagId })), { transaction });
}
