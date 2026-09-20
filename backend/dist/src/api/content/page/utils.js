"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.basePageSchema = exports.PAGES_CACHE_KEY = void 0;
exports.getPages = getPages;
exports.cachePages = cachePages;
exports.invalidatePagesCache = invalidatePagesCache;
const db_1 = require("@b/db");
const redis_1 = require("@b/utils/redis");
const schema_1 = require("@b/utils/schema");
const redis = redis_1.RedisSingleton.getInstance();
exports.PAGES_CACHE_KEY = "pages";
async function getPages() {
    return (await db_1.models.page.findAll({
        where: {
            status: "PUBLISHED",
        },
        attributes: {
            exclude: ["content", "customCss", "customJs", "settings"],
        },
    })).map((page) => page.get({ plain: true }));
}
async function cachePages() {
    try {
        const pages = await getPages();
        await redis.set(exports.PAGES_CACHE_KEY, JSON.stringify(pages), "EX", 43200);
    }
    catch (error) {
    }
}
async function invalidatePagesCache() {
    try {
        await redis.del(exports.PAGES_CACHE_KEY);
    }
    catch (error) {
    }
}
exports.basePageSchema = {
    id: (0, schema_1.baseStringSchema)("ID of the page"),
    title: (0, schema_1.baseStringSchema)("Title of the page"),
    content: (0, schema_1.baseStringSchema)("Content of the page"),
    description: (0, schema_1.baseStringSchema)("Description of the page"),
    image: (0, schema_1.baseStringSchema)("Image of the page", 255, 0, true),
    slug: (0, schema_1.baseStringSchema)("Slug of the page"),
    status: (0, schema_1.baseStringSchema)("Status of the page"),
    createdAt: (0, schema_1.baseDateTimeSchema)("Date and time the page was created"),
    updatedAt: (0, schema_1.baseDateTimeSchema)("Date and time the page was last updated", true),
};
cachePages();
