"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const query_1 = require("@b/utils/query");
const geo_1 = require("@b/utils/geo");
exports.metadata = {
    summary: "Enables or disables geographic restrictions in bulk",
    operationId: "bulkUpdateGeoRestrictionStatus",
    tags: ["Admin", "Geo Restrictions"],
    requestBody: {
        required: true,
        content: {
            "application/json": {
                schema: {
                    type: "object",
                    properties: {
                        ids: {
                            type: "array",
                            description: "IDs of the restrictions to update",
                            items: { type: "string" },
                        },
                        status: {
                            type: "boolean",
                            description: "true enforces the restrictions, false leaves them staged but inactive",
                        },
                    },
                    required: ["ids", "status"],
                },
            },
        },
    },
    responses: (0, query_1.updateRecordResponses)("Geo Restriction"),
    requiresAuth: true,
    permission: "edit.geo.restriction",
    logModule: "GEO",
    logTitle: "Bulk update geo restriction status",
};
exports.default = async (data) => {
    const { body, ctx } = data;
    const { ids, status } = body;
    ctx === null || ctx === void 0 ? void 0 : ctx.step(`${status ? "Enforcing" : "Suspending"} ${ids.length} geographic restrictions`);
    const message = await (0, query_1.updateStatus)("geoRestriction", ids, status);
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Reloading enforcement rules");
    await (0, geo_1.reloadGeoRestrictions)();
    ctx === null || ctx === void 0 ? void 0 : ctx.success(`${ids.length} restriction statuses updated`);
    return message;
};
