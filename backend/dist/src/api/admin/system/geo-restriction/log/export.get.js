"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const sequelize_1 = require("sequelize");
const sync_1 = require("csv-stringify/sync");
const db_1 = require("@b/db");
const error_1 = require("@b/utils/error");
const geo_1 = require("@b/utils/geo");
exports.metadata = {
    summary: "Exports geographic access decisions as CSV",
    operationId: "exportGeoAccessLog",
    tags: ["Admin", "Geo Restrictions"],
    parameters: [
        {
            name: "from",
            in: "query",
            description: "Start of the period (ISO date). Defaults to 30 days ago.",
            required: false,
            schema: { type: "string" },
        },
        {
            name: "to",
            in: "query",
            description: "End of the period (ISO date). Defaults to now.",
            required: false,
            schema: { type: "string" },
        },
        {
            name: "decision",
            in: "query",
            description: "Restrict to one decision type",
            required: false,
            schema: { type: "string", enum: ["BLOCKED", "ALLOWED", "BYPASSED"] },
        },
        {
            name: "countryCode",
            in: "query",
            description: "Restrict to one country (ISO alpha-2)",
            required: false,
            schema: { type: "string" },
        },
    ],
    responses: {
        200: {
            description: "CSV file of geographic access decisions",
            content: { "text/csv": { schema: { type: "string" } } },
        },
        401: { description: "Unauthorized access" },
    },
    requiresAuth: true,
    permission: "access.geo.restriction.log",
    responseType: "binary",
    logModule: "GEO",
    logTitle: "Export geo access log",
};
const MAX_ROWS = 100000;
exports.default = async (data) => {
    const { query, ctx } = data;
    const to = (query === null || query === void 0 ? void 0 : query.to) ? new Date(String(query.to)) : new Date();
    const from = (query === null || query === void 0 ? void 0 : query.from)
        ? new Date(String(query.from))
        : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime())) {
        throw (0, error_1.createError)({ statusCode: 400, message: "Invalid date range" });
    }
    if (to <= from) {
        throw (0, error_1.createError)({
            statusCode: 400,
            message: "The end of the period must be later than the start",
        });
    }
    const where = { createdAt: { [sequelize_1.Op.between]: [from, to] } };
    if (query === null || query === void 0 ? void 0 : query.decision)
        where.decision = String(query.decision).toUpperCase();
    if (query === null || query === void 0 ? void 0 : query.countryCode) {
        const code = (0, geo_1.toAlpha2)(query.countryCode);
        if (!code) {
            throw (0, error_1.createError)({
                statusCode: 400,
                message: `"${query.countryCode}" is not a recognised country code`,
            });
        }
        where.countryCode = code;
    }
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Flushing buffered hit counts");
    await (0, geo_1.flushAuditCounters)();
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Loading access decisions");
    const rows = await db_1.models.geoAccessLog.findAll({
        where,
        order: [["createdAt", "DESC"]],
        limit: MAX_ROWS,
        raw: true,
    });
    if (rows.length === MAX_ROWS) {
        ctx === null || ctx === void 0 ? void 0 : ctx.warn(`Export truncated at ${MAX_ROWS} rows — narrow the date range for a complete record`);
    }
    const csv = (0, sync_1.stringify)(rows.map((row) => ({
        timestamp: row.createdAt ? new Date(row.createdAt).toISOString() : "",
        decision: row.decision,
        reasonCode: row.reasonCode,
        countryCode: row.countryCode || "",
        countryName: row.countryName || "",
        region: row.region || "",
        city: row.city || "",
        source: row.source,
        ip: row.ip,
        isProxy: row.isProxy === null ? "" : String(row.isProxy),
        isHosting: row.isHosting === null ? "" : String(row.isHosting),
        isTor: row.isTor === null ? "" : String(row.isTor),
        method: row.method,
        path: row.path,
        action: row.action || "",
        userId: row.userId || "",
        hitCount: row.hitCount,
        restrictionId: row.restrictionId || "",
        detail: row.reasonDetail || "",
    })), {
        header: true,
        columns: [
            "timestamp",
            "decision",
            "reasonCode",
            "countryCode",
            "countryName",
            "region",
            "city",
            "source",
            "ip",
            "isProxy",
            "isHosting",
            "isTor",
            "method",
            "path",
            "action",
            "userId",
            "hitCount",
            "restrictionId",
            "detail",
        ],
    });
    const stamp = `${from.toISOString().split("T")[0]}_${to.toISOString().split("T")[0]}`;
    ctx === null || ctx === void 0 ? void 0 : ctx.success(`Exported ${rows.length} decisions`);
    return {
        data: csv,
        headers: {
            "Content-Type": "text/csv; charset=utf-8",
            "Content-Disposition": `attachment; filename="geo-access-log_${stamp}.csv"`,
            "Cache-Control": "no-store",
        },
    };
};
