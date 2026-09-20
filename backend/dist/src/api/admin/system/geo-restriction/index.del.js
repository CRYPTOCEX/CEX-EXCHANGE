"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const error_1 = require("@b/utils/error");
const query_1 = require("@b/utils/query");
const geo_1 = require("@b/utils/geo");
exports.metadata = {
    summary: "Retires (or restores) multiple geographic restrictions",
    operationId: "bulkDeleteGeoRestrictions",
    tags: ["Admin", "Geo Restrictions"],
    parameters: (0, query_1.commonBulkDeleteParams)("Geo Restrictions"),
    requestBody: {
        required: true,
        content: {
            "application/json": {
                schema: {
                    type: "object",
                    properties: {
                        ids: {
                            type: "array",
                            items: { type: "string" },
                            description: "IDs of the geographic restrictions to retire",
                        },
                    },
                    required: ["ids"],
                },
            },
        },
    },
    responses: (0, query_1.commonBulkDeleteResponses)("Geo Restrictions"),
    requiresAuth: true,
    permission: "delete.geo.restriction",
    logModule: "GEO",
    logTitle: "Bulk delete geo restrictions",
};
exports.default = async (data) => {
    const { body, query, ctx } = data;
    const { ids } = body;
    if (query.force) {
        throw (0, error_1.createError)({
            statusCode: 403,
            message: "Geographic restrictions cannot be permanently deleted — they are a compliance record. Retiring the rules already stops them being enforced.",
        });
    }
    ctx === null || ctx === void 0 ? void 0 : ctx.step(`Retiring ${ids.length} restrictions`);
    const message = await (0, query_1.handleBulkDelete)({
        model: "geoRestriction",
        ids,
        query,
    });
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Reloading enforcement rules");
    await (0, geo_1.reloadGeoRestrictions)();
    ctx === null || ctx === void 0 ? void 0 : ctx.success(`${ids.length} restrictions updated`);
    return message;
};
