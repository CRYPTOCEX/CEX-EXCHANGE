"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const db_1 = require("@b/db");
const error_1 = require("@b/utils/error");
const geo_1 = require("@b/utils/geo");
const query_1 = require("@b/utils/query");
const geoRestriction_1 = require("@db/system/geoRestriction");
exports.metadata = {
    summary: "Bulk-creates geographic restrictions from a list of countries",
    operationId: "importGeoRestrictions",
    tags: ["Admin", "Geo Restrictions"],
    requestBody: {
        required: true,
        content: {
            "application/json": {
                schema: {
                    type: "object",
                    properties: {
                        countries: {
                            type: "array",
                            items: { type: "string" },
                            description: "Country codes or names (alpha-2, alpha-3 or English name)",
                        },
                        type: {
                            type: "string",
                            enum: geoRestriction_1.GEO_RESTRICTION_TYPES,
                            description: "BLOCK (default) or ALLOW",
                        },
                        reason: {
                            type: "string",
                            enum: geoRestriction_1.GEO_RESTRICTION_REASONS,
                            description: "Legal basis recorded on every imported rule",
                        },
                        legalReference: { type: "string", nullable: true },
                        notes: { type: "string", nullable: true },
                        status: {
                            type: "boolean",
                            description: "Enforce immediately (true) or stage the rules inactive (false)",
                        },
                    },
                    required: ["countries"],
                },
            },
        },
    },
    responses: {
        200: {
            description: "Import result",
            content: {
                "application/json": {
                    schema: {
                        type: "object",
                        properties: {
                            message: { type: "string" },
                            created: { type: "array", items: { type: "string" } },
                            skipped: { type: "array", items: { type: "object" } },
                            invalid: { type: "array", items: { type: "string" } },
                        },
                    },
                },
            },
        },
        401: query_1.unauthorizedResponse,
        500: query_1.serverErrorResponse,
    },
    requiresAuth: true,
    permission: "create.geo.restriction",
    logModule: "GEO",
    logTitle: "Import geo restrictions",
};
const MAX_IMPORT = 300;
exports.default = async (data) => {
    const { body, user, ctx } = data;
    const raw = Array.isArray(body === null || body === void 0 ? void 0 : body.countries)
        ? body.countries
        : typeof (body === null || body === void 0 ? void 0 : body.countries) === "string"
            ? String(body.countries).split(/[\s,;\n]+/)
            : [];
    if (!raw.length) {
        throw (0, error_1.createError)({
            statusCode: 400,
            message: "Provide at least one country to import",
        });
    }
    if (raw.length > MAX_IMPORT) {
        throw (0, error_1.createError)({
            statusCode: 400,
            message: `Import is limited to ${MAX_IMPORT} countries at a time`,
        });
    }
    const type = geoRestriction_1.GEO_RESTRICTION_TYPES.includes(body === null || body === void 0 ? void 0 : body.type) ? body.type : "BLOCK";
    const reason = geoRestriction_1.GEO_RESTRICTION_REASONS.includes(body === null || body === void 0 ? void 0 : body.reason)
        ? body.reason
        : "SANCTIONS";
    const status = (body === null || body === void 0 ? void 0 : body.status) === undefined ? true : Boolean(body.status);
    const legalReference = (body === null || body === void 0 ? void 0 : body.legalReference)
        ? String(body.legalReference).slice(0, 255)
        : null;
    const notes = (body === null || body === void 0 ? void 0 : body.notes) ? String(body.notes).slice(0, 5000) : null;
    ctx === null || ctx === void 0 ? void 0 : ctx.step(`Parsing ${raw.length} entries`);
    const invalid = [];
    const wanted = new Map();
    for (const entry of raw) {
        const value = String(entry).trim();
        if (!value)
            continue;
        const code = (0, geo_1.toAlpha2)(value);
        if (!code) {
            invalid.push(value);
            continue;
        }
        wanted.set(code, (0, geo_1.getCountryName)(code) || code);
    }
    if (!wanted.size) {
        throw (0, error_1.createError)({
            statusCode: 400,
            message: `None of the supplied values are recognised countries: ${invalid.slice(0, 10).join(", ")}`,
        });
    }
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Checking for existing rules");
    const existing = await db_1.models.geoRestriction.findAll({
        where: { countryCode: Array.from(wanted.keys()), type },
        attributes: ["countryCode"],
    });
    const already = new Set(existing.map((r) => r.countryCode));
    const toCreate = Array.from(wanted.entries()).filter(([code]) => !already.has(code));
    const skipped = Array.from(already).map((code) => ({
        countryCode: code,
        reason: `A ${type} rule already exists`,
    }));
    if (toCreate.length) {
        ctx === null || ctx === void 0 ? void 0 : ctx.step(`Creating ${toCreate.length} rules`);
        await db_1.models.geoRestriction.bulkCreate(toCreate.map(([countryCode, countryName]) => ({
            countryCode,
            countryName,
            type,
            scope: "FULL",
            restrictedActions: null,
            reason,
            legalReference,
            notes,
            status,
            effectiveFrom: null,
            effectiveTo: null,
            createdBy: (user === null || user === void 0 ? void 0 : user.id) || null,
            updatedBy: (user === null || user === void 0 ? void 0 : user.id) || null,
        })));
        ctx === null || ctx === void 0 ? void 0 : ctx.step("Reloading enforcement rules");
        await (0, geo_1.reloadGeoRestrictions)();
    }
    const created = toCreate.map(([code]) => code);
    ctx === null || ctx === void 0 ? void 0 : ctx.success(`Imported ${created.length} countries (${skipped.length} already present, ${invalid.length} unrecognised)`);
    return {
        message: `Imported ${created.length} of ${wanted.size} countries`,
        created,
        skipped,
        invalid,
    };
};
