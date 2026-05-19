"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const db_1 = require("@b/db");
const query_1 = require("@b/utils/query");
const utils_1 = require("./utils");
exports.metadata = {
    summary: "Lists all comments with optional inclusion of posts",
    description: "This endpoint retrieves all available comments along with their associated posts.",
    operationId: "getComments",
    tags: ["Blog"],
    requiresAuth: false,
    responses: {
        200: {
            description: "Comments retrieved successfully",
            content: {
                "application/json": {
                    schema: {
                        type: "array",
                        items: {
                            type: "object",
                            properties: {
                                ...utils_1.baseCommentSchema,
                                posts: utils_1.commentPostsSchema,
                            },
                        },
                    },
                },
            },
        },
        401: query_1.unauthorizedResponse,
        404: (0, query_1.notFoundMetadataResponse)("Comments"),
        500: query_1.serverErrorResponse,
    },
};
exports.default = async (data) => {
    var _a, _b;
    // Pagination to prevent DoS via unbounded result sets
    const limit = Math.min(Math.max(parseInt(((_a = data === null || data === void 0 ? void 0 : data.query) === null || _a === void 0 ? void 0 : _a.limit) || "50", 10) || 50, 1), 100);
    const offset = Math.max(parseInt(((_b = data === null || data === void 0 ? void 0 : data.query) === null || _b === void 0 ? void 0 : _b.offset) || "0", 10) || 0, 0);
    const comments = await db_1.models.comment.findAll({
        include: {
            model: db_1.models.user,
            as: "user",
            attributes: ["id", "firstName", "lastName", "email", "avatar"],
        },
        order: [["createdAt", "DESC"]],
        limit,
        offset,
    });
    return comments.map((comment) => comment.get({ plain: true }));
};
