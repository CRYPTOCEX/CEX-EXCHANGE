"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.geoRestrictionStoreSchema = exports.geoRestrictionUpdateSchema = exports.geoRestrictionSchema = void 0;
exports.normalizeRestrictionInput = normalizeRestrictionInput;
exports.assertNoDuplicateRule = assertNoDuplicateRule;
const schema_1 = require("@b/utils/schema");
const error_1 = require("@b/utils/error");
const db_1 = require("@b/db");
const sequelize_1 = require("sequelize");
const geo_1 = require("@b/utils/geo");
const geoRestriction_1 = require("@db/system/geoRestriction");
const id = (0, schema_1.baseStringSchema)("ID of the geographic restriction");
const countryCode = (0, schema_1.baseStringSchema)("Country as an ISO 3166-1 alpha-2 code (US), alpha-3 code (USA) or English name. Stored as alpha-2.", 64, 2, false, "^[A-Za-z][A-Za-z .'()-]{1,63}$", "Country code or name");
const storedCountryCode = (0, schema_1.baseStringSchema)("ISO 3166-1 alpha-2 country code (e.g. US)", 2, 2);
const countryName = (0, schema_1.baseStringSchema)("Country name", 128);
const type = (0, schema_1.baseEnumSchema)("BLOCK denies the country, ALLOW permits it (and overrides a BLOCK rule for the same country)", geoRestriction_1.GEO_RESTRICTION_TYPES);
const scope = (0, schema_1.baseEnumSchema)("FULL restricts the whole platform, PARTIAL restricts only the selected activities", geoRestriction_1.GEO_RESTRICTION_SCOPES);
const restrictedActions = {
    type: "array",
    description: "Activities restricted when scope is PARTIAL. Ignored for FULL rules.",
    nullable: true,
    items: { type: "string", enum: geo_1.GEO_ACTIONS },
};
const reason = (0, schema_1.baseEnumSchema)("Legal basis recorded for this restriction", geoRestriction_1.GEO_RESTRICTION_REASONS);
const legalReference = (0, schema_1.baseStringSchema)("Citation for the restriction, e.g. 'OFAC 31 CFR Part 560'", 255, 0, true);
const notes = {
    type: "string",
    description: "Internal notes about this restriction",
    nullable: true,
};
const status = (0, schema_1.baseBooleanSchema)("Whether the rule is currently enforced");
const effectiveFrom = (0, schema_1.baseDateTimeSchema)("Date the restriction starts applying (null = immediately)", true);
const effectiveTo = (0, schema_1.baseDateTimeSchema)("Date the restriction stops applying (null = indefinitely)", true);
const createdBy = (0, schema_1.baseStringSchema)("Admin who created the rule", 36, 0, true);
const updatedBy = (0, schema_1.baseStringSchema)("Admin who last changed the rule", 36, 0, true);
const createdAt = (0, schema_1.baseDateTimeSchema)("Creation date");
const updatedAt = (0, schema_1.baseDateTimeSchema)("Last update date", true);
const deletedAt = (0, schema_1.baseDateTimeSchema)("Deletion date", true);
exports.geoRestrictionSchema = {
    id,
    countryCode: storedCountryCode,
    countryName,
    type,
    scope,
    restrictedActions,
    reason,
    legalReference,
    notes,
    status,
    effectiveFrom,
    effectiveTo,
    createdBy,
    updatedBy,
    createdAt,
    updatedAt,
    deletedAt,
};
exports.geoRestrictionUpdateSchema = {
    type: "object",
    properties: {
        countryCode,
        type,
        scope,
        restrictedActions,
        reason,
        legalReference,
        notes,
        status,
        effectiveFrom,
        effectiveTo,
    },
    required: ["countryCode"],
};
exports.geoRestrictionStoreSchema = {
    description: "Geographic restriction created or updated successfully",
    content: {
        "application/json": {
            schema: {
                type: "object",
                properties: exports.geoRestrictionSchema,
            },
        },
    },
};
function normalizeRestrictionInput(body, actorId) {
    var _a;
    const code = (0, geo_1.toAlpha2)(body === null || body === void 0 ? void 0 : body.countryCode);
    if (!code) {
        throw (0, error_1.createError)({
            statusCode: 400,
            message: `"${(_a = body === null || body === void 0 ? void 0 : body.countryCode) !== null && _a !== void 0 ? _a : ""}" is not a recognised ISO 3166-1 country code`,
        });
    }
    const ruleType = geoRestriction_1.GEO_RESTRICTION_TYPES.includes(body === null || body === void 0 ? void 0 : body.type)
        ? body.type
        : "BLOCK";
    const ruleScope = geoRestriction_1.GEO_RESTRICTION_SCOPES.includes(body === null || body === void 0 ? void 0 : body.scope)
        ? body.scope
        : "FULL";
    const actions = ruleScope === "PARTIAL" ? (0, geo_1.sanitizeActions)(body === null || body === void 0 ? void 0 : body.restrictedActions) : [];
    if (ruleScope === "PARTIAL" && ruleType === "BLOCK" && actions.length === 0) {
        throw (0, error_1.createError)({
            statusCode: 400,
            message: "A partial restriction must list at least one restricted activity, otherwise it blocks nothing",
        });
    }
    const from = (body === null || body === void 0 ? void 0 : body.effectiveFrom) ? new Date(body.effectiveFrom) : null;
    const to = (body === null || body === void 0 ? void 0 : body.effectiveTo) ? new Date(body.effectiveTo) : null;
    if (from && Number.isNaN(from.getTime())) {
        throw (0, error_1.createError)({ statusCode: 400, message: "effectiveFrom is not a valid date" });
    }
    if (to && Number.isNaN(to.getTime())) {
        throw (0, error_1.createError)({ statusCode: 400, message: "effectiveTo is not a valid date" });
    }
    if (from && to && to <= from) {
        throw (0, error_1.createError)({
            statusCode: 400,
            message: "effectiveTo must be later than effectiveFrom",
        });
    }
    return {
        countryCode: code,
        countryName: (0, geo_1.getCountryName)(code) || code,
        type: ruleType,
        scope: ruleScope,
        restrictedActions: ruleScope === "PARTIAL" ? actions : null,
        reason: geoRestriction_1.GEO_RESTRICTION_REASONS.includes(body === null || body === void 0 ? void 0 : body.reason) ? body.reason : "REGULATORY",
        legalReference: (body === null || body === void 0 ? void 0 : body.legalReference) ? String(body.legalReference).slice(0, 255) : null,
        notes: (body === null || body === void 0 ? void 0 : body.notes) ? String(body.notes).slice(0, 5000) : null,
        status: (body === null || body === void 0 ? void 0 : body.status) === undefined ? true : Boolean(body.status),
        effectiveFrom: from,
        effectiveTo: to,
        updatedBy: actorId || null,
    };
}
async function assertNoDuplicateRule(countryCode, type, excludeId) {
    const where = { countryCode, type };
    if (excludeId)
        where.id = { [sequelize_1.Op.ne]: excludeId };
    const existing = await db_1.models.geoRestriction.findOne({ where });
    if (existing) {
        throw (0, error_1.createError)({
            statusCode: 409,
            message: `A ${type === "ALLOW" ? "permit" : "restriction"} rule for ${countryCode} already exists. Edit the existing rule instead of creating a second one.`,
        });
    }
}
