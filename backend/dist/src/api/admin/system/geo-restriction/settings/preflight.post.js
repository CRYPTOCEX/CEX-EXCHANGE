"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const geo_1 = require("@b/utils/geo");
const query_1 = require("@b/utils/query");
const settings_validate_1 = require("../settings-validate");
exports.metadata = {
    summary: "Previews the effect of a geographic restriction policy change",
    description: "Runs the lockout analysis against the policy that WOULD be in force and " +
        "returns the findings. Nothing is saved.",
    operationId: "preflightGeoRestrictionSettings",
    tags: ["Admin", "Geo Restrictions"],
    requestBody: {
        required: true,
        content: {
            "application/json": {
                schema: {
                    type: "object",
                    description: "The same key/value pairs you would send to the PUT",
                },
            },
        },
    },
    responses: {
        200: {
            description: "Analysis of the proposed policy",
            content: {
                "application/json": {
                    schema: {
                        type: "object",
                        properties: {
                            safe: {
                                type: "boolean",
                                description: "True when the change can be saved as-is",
                            },
                            blocked: {
                                type: "boolean",
                                description: "True when the save would be refused",
                            },
                            forceable: {
                                type: "boolean",
                                description: "True when an explicit force flag would allow it through",
                            },
                            findings: { type: "array", items: { type: "object" } },
                            warnings: { type: "array", items: { type: "object" } },
                            detection: { type: "object" },
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
exports.default = async (data) => {
    const { body } = data;
    const before = (0, geo_1.getPolicy)();
    const { updates, force } = (0, settings_validate_1.validateGeoSettingsBody)(body);
    if (!Object.keys(updates).length) {
        return {
            safe: true,
            blocked: false,
            forceable: false,
            findings: [],
            warnings: [],
            detection: (0, geo_1.getDetectionHealth)(),
        };
    }
    const { preflight } = await (0, settings_validate_1.projectGeoPolicy)(before, updates, data);
    const wouldBlock = force ? preflight.hardLockouts : preflight.lockouts;
    return {
        safe: preflight.safe,
        blocked: wouldBlock.length > 0,
        forceable: wouldBlock.length > 0 && preflight.hardLockouts.length === 0,
        findings: preflight.lockouts,
        warnings: preflight.warnings,
        detection: (0, geo_1.getDetectionHealth)(),
    };
};
