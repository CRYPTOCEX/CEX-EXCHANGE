"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const error_1 = require("@b/utils/error");
const query_1 = require("@b/utils/query");
const geo_1 = require("@b/utils/geo");
exports.metadata = {
    summary: "Retires (or restores) a geographic access restriction",
    operationId: "deleteGeoRestriction",
    tags: ["Admin", "Geo Restrictions"],
    parameters: (0, query_1.deleteRecordParams)("geo restriction"),
    responses: (0, query_1.deleteRecordResponses)("Geo Restriction"),
    permission: "delete.geo.restriction",
    requiresAuth: true,
    logModule: "GEO",
    logTitle: "Delete geo restriction",
};
exports.default = async (data) => {
    const { params, query, ctx } = data;
    const { id } = params;
    if (query.force) {
        throw (0, error_1.createError)({
            statusCode: 403,
            message: "Geographic restrictions cannot be permanently deleted — they are a compliance record. Retiring the rule already stops it being enforced.",
        });
    }
    ctx === null || ctx === void 0 ? void 0 : ctx.step(query.restore ? `Restoring rule ${id}` : `Retiring rule ${id}`);
    const message = await (0, query_1.handleSingleDelete)({
        model: "geoRestriction",
        id,
        query,
    });
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Reloading enforcement rules");
    await (0, geo_1.reloadGeoRestrictions)();
    ctx === null || ctx === void 0 ? void 0 : ctx.success(query.restore ? "Restriction restored" : "Restriction retired");
    return message;
};
