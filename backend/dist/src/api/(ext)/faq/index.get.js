"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const db_1 = require("@b/db");
const error_1 = require("@b/utils/error");
const sequelize_1 = require("sequelize");
exports.metadata = {
    summary: "Get Public FAQs",
    description: "Retrieves active FAQ entries with optional search, category filters and pagination.",
    operationId: "getPublicFAQs",
    tags: ["FAQ"],
    logModule: "FAQ",
    logTitle: "Get Public FAQs",
    parameters: [
        {
            index: 0,
            name: "page",
            in: "query",
            required: false,
            schema: { type: "number" },
            description: "Page number for pagination",
        },
        {
            index: 1,
            name: "limit",
            in: "query",
            required: false,
            schema: { type: "number" },
            description: "Number of items per page",
        },
        {
            index: 2,
            name: "search",
            in: "query",
            required: false,
            schema: { type: "string" },
            description: "Search query for FAQ question or answer",
        },
        {
            index: 3,
            name: "category",
            in: "query",
            required: false,
            schema: { type: "string" },
            description: "Filter by FAQ category",
        },
    ],
    responses: {
        200: {
            description: "FAQs retrieved successfully",
            content: {
                "application/json": {
                    schema: {
                        type: "object",
                        properties: {
                            items: { type: "array", items: { type: "object" } },
                            pagination: {
                                type: "object",
                                properties: {
                                    currentPage: { type: "number" },
                                    totalPages: { type: "number" },
                                    totalItems: { type: "number" },
                                    perPage: { type: "number" },
                                },
                            },
                        },
                    },
                },
            },
        },
        500: { description: "Internal Server Error" },
    },
};
exports.default = async (data) => {
    const { query, ctx } = data;
    const where = {};
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Building query filters");
    where.status = true;
    if (query.search) {
        const search = query.search.toLowerCase().replace(/[%_\\]/g, '\\$&');
        where[sequelize_1.Op.or] = [
            { question: { [sequelize_1.Op.like]: `%${search}%` } },
            { answer: { [sequelize_1.Op.like]: `%${search}%` } },
        ];
    }
    if (query.category) {
        where.category = query.category;
    }
    try {
        const page = parseInt(query.page, 10) || 1;
        const perPage = Math.min(parseInt(query.limit, 10) || 10, 100);
        const offset = (page - 1) * perPage;
        if (query.page || query.limit) {
            ctx === null || ctx === void 0 ? void 0 : ctx.step(`Fetching FAQs with pagination (page ${page}, limit ${perPage})`);
            const { count, rows } = await db_1.models.faq.findAndCountAll({
                where,
                order: [["order", "ASC"]],
                offset,
                limit: perPage,
            });
            ctx === null || ctx === void 0 ? void 0 : ctx.success(`Retrieved ${rows.length} FAQs (total: ${count})`);
            return {
                items: rows,
                pagination: {
                    currentPage: page,
                    totalPages: Math.ceil(count / perPage),
                    totalItems: count,
                    perPage,
                },
            };
        }
        else {
            ctx === null || ctx === void 0 ? void 0 : ctx.step("Fetching all FAQs (no pagination)");
            const faqs = await db_1.models.faq.findAll({
                where,
                order: [["order", "ASC"]],
            });
            ctx === null || ctx === void 0 ? void 0 : ctx.success(`Retrieved ${faqs.length} FAQs`);
            return faqs;
        }
    }
    catch (error) {
        ctx === null || ctx === void 0 ? void 0 : ctx.fail("Failed to fetch FAQs");
        throw (0, error_1.createError)({ statusCode: 500, message: "Failed to fetch FAQs" });
    }
};
