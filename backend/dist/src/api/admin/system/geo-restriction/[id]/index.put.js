"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const db_1 = require("@b/db");
const error_1 = require("@b/utils/error");
const query_1 = require("@b/utils/query");
const geo_1 = require("@b/utils/geo");
const utils_1 = require("../utils");
exports.metadata = {
    summary: "Updates a geographic access restriction",
    operationId: "updateGeoRestriction",
    tags: ["Admin", "Geo Restrictions"],
    parameters: [
        {
            index: 0,
            name: "id",
            in: "path",
            description: "ID of the geographic restriction to update",
            required: true,
            schema: { type: "string" },
        },
    ],
    requestBody: {
        description: "New data for the geographic restriction",
        content: {
            "application/json": { schema: utils_1.geoRestrictionUpdateSchema },
        },
    },
    responses: (0, query_1.updateRecordResponses)("Geo Restriction"),
    requiresAuth: true,
    permission: "edit.geo.restriction",
    logModule: "GEO",
    logTitle: "Update geo restriction",
};
exports.default = async (data) => {
    const { body, params, user, ctx } = data;
    const { id } = params;
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Loading existing rule");
    const record = await db_1.models.geoRestriction.findByPk(id);
    if (!record) {
        throw (0, error_1.createError)({ statusCode: 404, message: "Geographic restriction not found" });
    }
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Validating country and rule shape");
    const values = (0, utils_1.normalizeRestrictionInput)(body, user === null || user === void 0 ? void 0 : user.id);
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Checking for a conflicting rule");
    await (0, utils_1.assertNoDuplicateRule)(values.countryCode, values.type, id);
    ctx === null || ctx === void 0 ? void 0 : ctx.step(`Updating rule for ${values.countryName}`);
    await record.update(values);
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Reloading enforcement rules");
    await (0, geo_1.reloadGeoRestrictions)();
    ctx === null || ctx === void 0 ? void 0 : ctx.success(`Rule for ${values.countryName} updated`);
    return { message: "Geographic restriction updated successfully" };
};
