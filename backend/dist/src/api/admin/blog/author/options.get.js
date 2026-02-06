"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const query_1 = require("@b/utils/query");
const error_1 = require("@b/utils/error");
const db_1 = require("@b/db");
exports.metadata = {
    summary: "Retrieves a list of authors",
    description: "This endpoint retrieves a list of authors with their associated user names. Optionally, you can filter by status.",
    operationId: "getAuthors",
    tags: ["Author"],
    requiresAuth: true,
    parameters: [
        {
            index: 0,
            name: "status",
            in: "query",
            required: false,
            schema: {
                type: "string",
                enum: ["PENDING", "APPROVED", "REJECTED"],
            },
        },
    ],
    responses: {
        200: {
            description: "Authors retrieved successfully",
            content: {
                "application/json": {
                    schema: {
                        type: "array",
                        items: {
                            type: "object",
                            properties: {
                                id: { type: "string" },
                                name: { type: "string" },
                            },
                        },
                    },
                },
            },
        },
        401: query_1.unauthorizedResponse,
        404: (0, query_1.notFoundMetadataResponse)("Author"),
        500: query_1.serverErrorResponse,
    },
    logModule: "ADMIN_BLOG",
    logTitle: "Get author options",
};
exports.default = async (data) => {
    const { user, ctx } = data;
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Validating user authorization");
    if (!(user === null || user === void 0 ? void 0 : user.id))
        throw (0, error_1.createError)(401, "Unauthorized");
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Fetching approved authors");
    const authors = await db_1.models.author.findAll({
        where: { status: "APPROVED" },
        include: [
            {
                model: db_1.models.user,
                as: "user",
                attributes: ["id", "firstName", "lastName", "email"],
            },
        ],
    });
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Formatting author options");
    const formatted = authors.map((author) => {
        var _a, _b;
        return ({
            id: author.id,
            name: `${((_a = author.user) === null || _a === void 0 ? void 0 : _a.firstName) || ''} ${((_b = author.user) === null || _b === void 0 ? void 0 : _b.lastName) || ''}`.trim(),
        });
    });
    ctx === null || ctx === void 0 ? void 0 : ctx.success(`${formatted.length} author options retrieved`);
    return formatted;
};
