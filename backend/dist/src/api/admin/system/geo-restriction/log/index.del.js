"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const sequelize_1 = require("sequelize");
const db_1 = require("@b/db");
const error_1 = require("@b/utils/error");
const geo_1 = require("@b/utils/geo");
const query_1 = require("@b/utils/query");
exports.metadata = {
    summary: "Purges geographic access log entries past their retention window",
    operationId: "purgeGeoAccessLog",
    tags: ["Admin", "Geo Restrictions"],
    parameters: [
        {
            name: "olderThan",
            in: "query",
            description: "Delete entries recorded before this ISO date. Omit to apply the configured retention window.",
            required: false,
            schema: { type: "string" },
        },
    ],
    responses: {
        200: {
            description: "Purge result",
            content: {
                "application/json": {
                    schema: {
                        type: "object",
                        properties: {
                            message: { type: "string" },
                            deleted: { type: "integer" },
                        },
                    },
                },
            },
        },
        401: query_1.unauthorizedResponse,
        500: query_1.serverErrorResponse,
    },
    requiresAuth: true,
    permission: "delete.geo.restriction.log",
    logModule: "GEO",
    logTitle: "Purge geo access log",
};
const MIN_AGE_DAYS = 7;
exports.default = async (data) => {
    const { query, ctx } = data;
    if (query === null || query === void 0 ? void 0 : query.olderThan) {
        const cutoff = new Date(String(query.olderThan));
        if (Number.isNaN(cutoff.getTime())) {
            throw (0, error_1.createError)({ statusCode: 400, message: "Invalid date" });
        }
        const floor = new Date(Date.now() - MIN_AGE_DAYS * 24 * 60 * 60 * 1000);
        if (cutoff > floor) {
            throw (0, error_1.createError)({
                statusCode: 400,
                message: `Entries from the last ${MIN_AGE_DAYS} days cannot be purged`,
            });
        }
        ctx === null || ctx === void 0 ? void 0 : ctx.step(`Purging entries before ${cutoff.toISOString()}`);
        const deleted = await db_1.models.geoAccessLog.destroy({
            where: { createdAt: { [sequelize_1.Op.lt]: cutoff } },
        });
        ctx === null || ctx === void 0 ? void 0 : ctx.success(`${deleted} entries purged`);
        return { message: `${deleted} log entries purged`, deleted };
    }
    const policy = (0, geo_1.getPolicy)();
    if (!policy.logRetentionDays) {
        throw (0, error_1.createError)({
            statusCode: 400,
            message: "Retention is set to keep entries indefinitely. Set a retention period in the policy, or pass an explicit olderThan date.",
        });
    }
    ctx === null || ctx === void 0 ? void 0 : ctx.step(`Applying the ${policy.logRetentionDays}-day retention window`);
    const deleted = await (0, geo_1.purgeExpiredAuditRows)(policy);
    ctx === null || ctx === void 0 ? void 0 : ctx.success(`${deleted} entries purged`);
    return { message: `${deleted} log entries purged`, deleted };
};
