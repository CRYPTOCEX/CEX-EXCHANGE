"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const db_1 = require("@b/db");
const geo_1 = require("@b/utils/geo");
const query_1 = require("@b/utils/query");
exports.metadata = {
    summary: "Lists ISO countries with their current restriction state",
    operationId: "listGeoRestrictionCountries",
    tags: ["Admin", "Geo Restrictions"],
    responses: {
        200: {
            description: "Countries with restriction state",
            content: {
                "application/json": {
                    schema: {
                        type: "array",
                        items: {
                            type: "object",
                            properties: {
                                value: { type: "string", description: "ISO alpha-2 code" },
                                label: { type: "string" },
                                alpha2: { type: "string" },
                                alpha3: { type: "string" },
                                name: { type: "string" },
                                ruleId: { type: "string", nullable: true },
                                ruleType: { type: "string", nullable: true },
                                ruleStatus: { type: "boolean", nullable: true },
                            },
                        },
                    },
                },
            },
        },
        401: query_1.unauthorizedResponse,
        500: query_1.serverErrorResponse,
    },
    requiresAuth: true,
    permission: "view.geo.restriction",
};
exports.default = async (_data) => {
    const existing = await db_1.models.geoRestriction.findAll({
        attributes: ["id", "countryCode", "type", "status"],
    });
    const byCode = new Map();
    for (const row of existing) {
        if (!byCode.has(row.countryCode))
            byCode.set(row.countryCode, row);
    }
    return geo_1.ALL_COUNTRIES.map((country) => {
        const rule = byCode.get(country.alpha2);
        const suffix = rule
            ? ` — already ${rule.type === "ALLOW" ? "permitted" : "restricted"}`
            : "";
        return {
            value: country.alpha2,
            label: `${country.name} (${country.alpha2})${suffix}`,
            alpha2: country.alpha2,
            alpha3: country.alpha3,
            name: country.name,
            ruleId: rule ? String(rule.id) : null,
            ruleType: rule ? rule.type : null,
            ruleStatus: rule ? Boolean(rule.status) : null,
        };
    });
};
