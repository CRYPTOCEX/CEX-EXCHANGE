"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const db_1 = require("@b/db");
const error_1 = require("@b/utils/error");
const sequelize_1 = require("sequelize");
const errors_1 = require("@b/utils/schema/errors");
exports.metadata = {
    summary: "Get FAQs with Filters",
    description: "Retrieves FAQs with pagination and filtering options. Supports searching by question/answer text, filtering by category, status, and page path. Returns paginated results sorted by order.",
    operationId: "getAdminFaqs",
    tags: ["Admin", "FAQ", "Pagination"],
    requiresAuth: true,
    parameters: [
        {
            index: 0,
            name: "page",
            in: "query",
            required: false,
            schema: { type: "number" },
            description: "Page number for pagination (default: 1)",
        },
        {
            index: 1,
            name: "limit",
            in: "query",
            required: false,
            schema: { type: "number" },
            description: "Number of items per page (default: 10)",
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
        {
            index: 4,
            name: "status",
            in: "query",
            required: false,
            schema: { type: "string", enum: ["active", "inactive", "all"] },
            description: "Filter by FAQ status: active, inactive, or all",
        },
        {
            index: 5,
            name: "pagePath",
            in: "query",
            required: false,
            schema: { type: "string" },
            description: "Filter by page path",
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
                            items: {
                                type: "array",
                                items: { type: "object" },
                                description: "Array of FAQ items",
                            },
                            pagination: errors_1.paginationSchema,
                        },
                    },
                },
            },
        },
        401: errors_1.unauthorizedResponse,
        500: errors_1.serverErrorResponse,
    },
    permission: "view.faq",
    logModule: "ADMIN_FAQ",
    logTitle: "Get FAQs for admin",
};
exports.default = async (data) => {
    const { user, query, ctx } = data;
    if (!(user === null || user === void 0 ? void 0 : user.id)) {
        throw (0, error_1.createError)({ statusCode: 401, message: "Unauthorized" });
    }
    const where = {};
    if (query.search) {
        const search = query.search.toLowerCase();
        where[sequelize_1.Op.or] = [
            { question: { [sequelize_1.Op.like]: `%${search}%` } },
            { answer: { [sequelize_1.Op.like]: `%${search}%` } },
        ];
    }
    if (query.category) {
        where.category = query.category;
    }
    if (query.status && query.status !== "all") {
        where.status = query.status === "active" ? true : false;
    }
    if (query.pagePath) {
        where.pagePath = query.pagePath;
    }
    const page = parseInt(query.page, 10) || 1;
    const perPage = Math.min(parseInt(query.limit, 10) || 10, 100);
    const offset = (page - 1) * perPage;
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Fetching FAQs with filters");
    const { count, rows } = await db_1.models.faq.findAndCountAll({
        where,
        order: [["order", "ASC"]],
        offset,
        limit: perPage,
    });
    ctx === null || ctx === void 0 ? void 0 : ctx.success("FAQs retrieved successfully");
    return {
        items: rows,
        pagination: {
            currentPage: page,
            totalPages: Math.ceil(count / perPage),
            totalItems: count,
            perPage,
        },
    };
};
