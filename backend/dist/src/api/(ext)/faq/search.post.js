"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const db_1 = require("@b/db");
const error_1 = require("@b/utils/error");
const sequelize_1 = require("sequelize");
exports.metadata = {
    summary: "Search FAQs and Record Query",
    description: "Searches FAQs based on query and category, and records the search for analytics.",
    operationId: "searchAndRecordFAQ",
    tags: ["FAQ"],
    logModule: "FAQ",
    logTitle: "Search FAQs",
    requestBody: {
        required: true,
        content: {
            "application/json": {
                schema: {
                    type: "object",
                    properties: {
                        query: { type: "string" },
                        category: { type: "string" },
                    },
                    required: ["query"],
                },
            },
        },
    },
    responses: {
        200: {
            description: "Search results returned",
            content: {
                "application/json": {
                    schema: {
                        type: "array",
                        items: { type: "object" }
                    },
                },
            },
        },
        400: { description: "Bad Request" },
        500: { description: "Internal Server Error" },
    },
    requiresAuth: false,
};
function escapeLike(str) {
    return str.replace(/[%_\\]/g, '\\$&');
}
exports.default = async (data) => {
    const { body, user, ctx } = data;
    const { query, category } = body;
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Validating search query");
    if (!query || typeof query !== 'string') {
        ctx === null || ctx === void 0 ? void 0 : ctx.fail("Query is required");
        throw (0, error_1.createError)({ statusCode: 400, message: "Query is required" });
    }
    const searchQuery = query.trim().toLowerCase();
    if (searchQuery.length < 2) {
        ctx === null || ctx === void 0 ? void 0 : ctx.fail("Query must be at least 2 characters");
        throw (0, error_1.createError)({ statusCode: 400, message: "Query must be at least 2 characters" });
    }
    try {
        ctx === null || ctx === void 0 ? void 0 : ctx.step("Building search conditions");
        const where = {
            status: true,
            [sequelize_1.Op.or]: [
                { question: { [sequelize_1.Op.like]: `%${escapeLike(searchQuery)}%` } },
                { answer: { [sequelize_1.Op.like]: `%${escapeLike(searchQuery)}%` } },
            ],
        };
        if (category && category !== "all") {
            where.category = category;
        }
        ctx === null || ctx === void 0 ? void 0 : ctx.step(`Searching FAQs for query: "${searchQuery}"`);
        const faqs = await db_1.models.faq.findAll({
            where,
            order: [["order", "ASC"]],
            limit: 50,
        });
        ctx === null || ctx === void 0 ? void 0 : ctx.step("Recording search for analytics");
        const userId = (user === null || user === void 0 ? void 0 : user.id) || null;
        if (userId && searchQuery.length > 3) {
            db_1.models.faqSearch.create({
                userId,
                query: searchQuery,
                resultCount: faqs.length,
                category,
            }).catch(() => {
            });
        }
        ctx === null || ctx === void 0 ? void 0 : ctx.success(`Found ${faqs.length} FAQs matching query`);
        return faqs;
    }
    catch (error) {
        ctx === null || ctx === void 0 ? void 0 : ctx.fail("Failed to search FAQs");
        throw (0, error_1.createError)({
            statusCode: 500,
            message: "Failed to search FAQs",
        });
    }
};
