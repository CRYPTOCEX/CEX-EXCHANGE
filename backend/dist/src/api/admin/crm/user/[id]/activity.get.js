"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const db_1 = require("@b/db");
const error_1 = require("@b/utils/error");
const utils_1 = require("../utils");
const query_1 = require("@b/utils/query");
exports.metadata = {
    summary: "List a user's recent account activity (IPs & devices)",
    description: "Returns the target user's most recent activity-log entries — sign-ins, 2FA changes, API-key lifecycle, KYC, etc. — including the IP address and User-Agent recorded for each, so admins can spot logins from unfamiliar IPs/devices.",
    operationId: "adminListUserActivity",
    tags: ["Admin", "CRM", "User"],
    logModule: "ADMIN_CRM",
    logTitle: "List user activity",
    parameters: [
        {
            index: 0,
            name: "id",
            in: "path",
            required: true,
            description: "ID of the user whose activity to list",
            schema: { type: "string" },
        },
        {
            name: "limit",
            in: "query",
            required: false,
            description: "Maximum number of entries to return (1-100, default 25).",
            schema: { type: "integer", minimum: 1, maximum: 100, default: 25 },
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
                                        severity: { type: "string" },
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
    requiresAuth: true,
    permission: "view.user",
};
exports.default = async (data) => {
    const { params, query, user } = data;
    if (!(user === null || user === void 0 ? void 0 : user.id)) {
        throw (0, error_1.createError)({ statusCode: 401, message: "Unauthorized" });
    }
    const { id } = params;
    await (0, utils_1.assertCanAccessUser)(user === null || user === void 0 ? void 0 : user.id, id);
    const rawLimit = Number(query === null || query === void 0 ? void 0 : query.limit);
    const limit = Number.isFinite(rawLimit) && rawLimit > 0
        ? Math.min(Math.floor(rawLimit), 100)
        : 25;
    const rows = await db_1.models.userActivity.findAll({
        where: { userId: id },
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
