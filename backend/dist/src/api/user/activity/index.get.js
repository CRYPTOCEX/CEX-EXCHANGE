"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const db_1 = require("@b/db");
const error_1 = require("@b/utils/error");
const query_1 = require("@b/utils/query");
exports.metadata = {
    summary: "List the current user's recent account activity",
    description: "Returns the most recent entries from the user's activity log (sign-ins, 2FA changes, API key lifecycle, KYC submissions, etc.) ordered newest-first.",
    operationId: "listUserActivity",
    tags: ["User", "Activity"],
    requiresAuth: true,
    parameters: [
        {
            name: "limit",
            in: "query",
            required: false,
            description: "Maximum number of entries to return (1-100, default 20).",
            schema: { type: "integer", minimum: 1, maximum: 100, default: 20 },
        },
    ],
    responses: {
        200: {
            description: "Recent activity entries",
            content: {
                "application/json": {
                    schema: {
                        type: "object",
                        properties: {
                            activities: {
                                type: "array",
                                items: {
                                    type: "object",
                                    properties: {
                                        id: { type: "string" },
                                        type: { type: "string" },
                                        title: { type: "string" },
                                        description: { type: "string", nullable: true },
                                        severity: {
                                            type: "string",
                                            enum: ["success", "warning", "info"],
                                        },
                                        ip: { type: "string", nullable: true },
                                        userAgent: { type: "string", nullable: true },
                                        metadata: { type: "object", nullable: true },
                                        createdAt: { type: "string", format: "date-time" },
                                    },
                                },
                            },
                        },
                    },
                },
            },
        },
        401: query_1.unauthorizedResponse,
        404: (0, query_1.notFoundMetadataResponse)("User"),
        500: query_1.serverErrorResponse,
    },
};
exports.default = async (data) => {
    const { user, query } = data;
    if (!(user === null || user === void 0 ? void 0 : user.id)) {
        throw (0, error_1.createError)({ statusCode: 401, message: "Unauthorized" });
    }
    const rawLimit = Number(query === null || query === void 0 ? void 0 : query.limit);
    const limit = Number.isFinite(rawLimit) && rawLimit > 0
        ? Math.min(Math.floor(rawLimit), 100)
        : 20;
    const rows = await db_1.models.userActivity.findAll({
        where: { userId: user.id },
        order: [["createdAt", "DESC"]],
        limit,
    });
    return {
        activities: rows.map((row) => {
            var _a, _b, _c, _d;
            const plain = row.get({ plain: true });
            return {
                id: plain.id,
                type: plain.type,
                title: plain.title,
                description: (_a = plain.description) !== null && _a !== void 0 ? _a : null,
                severity: plain.severity,
                ip: (_b = plain.ip) !== null && _b !== void 0 ? _b : null,
                userAgent: (_c = plain.userAgent) !== null && _c !== void 0 ? _c : null,
                metadata: (_d = plain.metadata) !== null && _d !== void 0 ? _d : null,
                createdAt: plain.createdAt,
            };
        }),
    };
};
