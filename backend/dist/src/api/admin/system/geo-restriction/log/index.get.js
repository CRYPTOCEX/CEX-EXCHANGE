"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const db_1 = require("@b/db");
const constants_1 = require("@b/utils/constants");
const query_1 = require("@b/utils/query");
const geo_1 = require("@b/utils/geo");
exports.metadata = {
    summary: "Lists geographic access decisions",
    description: "The evidence log of who was refused (or bypassed) on geographic grounds, and why.",
    operationId: "listGeoAccessLog",
    tags: ["Admin", "Geo Restrictions"],
    parameters: constants_1.crudParameters,
    responses: {
        200: {
            description: "Geographic access log entries",
            content: {
                "application/json": {
                    schema: {
                        type: "object",
                        properties: {
                            data: { type: "array", items: { type: "object" } },
                            pagination: constants_1.paginationSchema,
                        },
                    },
                },
            },
        },
        401: query_1.unauthorizedResponse,
        404: (0, query_1.notFoundMetadataResponse)("Geo Access Log"),
        500: query_1.serverErrorResponse,
    },
    requiresAuth: true,
    permission: "access.geo.restriction.log",
};
exports.default = async (data) => {
    const { query } = data;
    await (0, geo_1.flushAuditCounters)();
    return (0, query_1.getFiltered)({
        model: db_1.models.geoAccessLog,
        query,
        sortField: query.sortField || "createdAt",
        timestamps: true,
        paranoid: false,
        numericFields: ["hitCount"],
    });
};
