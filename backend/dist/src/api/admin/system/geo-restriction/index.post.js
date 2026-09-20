"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const db_1 = require("@b/db");
const query_1 = require("@b/utils/query");
const geo_1 = require("@b/utils/geo");
const utils_1 = require("./utils");
exports.metadata = {
    summary: "Creates a geographic access restriction",
    operationId: "storeGeoRestriction",
    tags: ["Admin", "Geo Restrictions"],
    requestBody: {
        required: true,
        content: {
            "application/json": { schema: utils_1.geoRestrictionUpdateSchema },
        },
    },
    responses: (0, query_1.storeRecordResponses)(utils_1.geoRestrictionSchema, "Geo Restriction"),
    requiresAuth: true,
    permission: "create.geo.restriction",
    logModule: "GEO",
    logTitle: "Create geo restriction",
};
exports.default = async (data) => {
    const { body, user, ctx } = data;
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Validating country and rule shape");
    const values = (0, utils_1.normalizeRestrictionInput)(body, user === null || user === void 0 ? void 0 : user.id);
    ctx === null || ctx === void 0 ? void 0 : ctx.step(`Checking for an existing ${values.type} rule for ${values.countryCode}`);
    await (0, utils_1.assertNoDuplicateRule)(values.countryCode, values.type);
    ctx === null || ctx === void 0 ? void 0 : ctx.step(`Creating ${values.type} rule for ${values.countryName}`);
    const record = await db_1.models.geoRestriction.create({
        ...values,
        createdBy: (user === null || user === void 0 ? void 0 : user.id) || null,
    });
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Reloading enforcement rules");
    await (0, geo_1.reloadGeoRestrictions)();
    ctx === null || ctx === void 0 ? void 0 : ctx.success(`${values.countryName} ${values.type === "ALLOW" ? "permitted" : "restricted"}`);
    return {
        message: "Geographic restriction created successfully",
        record: record.get({ plain: true }),
    };
};
