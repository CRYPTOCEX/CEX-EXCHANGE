"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.basePageSchema = void 0;
exports.cachePages = cachePages;
const redis_1 = require("@b/utils/redis");
const index_get_1 = require("./index.get");
const redis = redis_1.RedisSingleton.getInstance();
async function cachePages() {
    try {
        const pages = await (0, index_get_1.getPages)();
        await redis.set("pages", JSON.stringify(pages), "EX", 43200);
    }
    catch (error) {
    }
}
cachePages();
const schema_1 = require("@b/utils/schema");
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
