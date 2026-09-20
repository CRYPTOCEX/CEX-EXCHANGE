"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const query_1 = require("@b/utils/query");
const geo_1 = require("@b/utils/geo");
exports.metadata = {
    summary: "Reports the caller's geographic access status",
    description: "Returns the country resolved for the current request and whether access is restricted, together with the operator's compliance notice.",
    operationId: "getGeoStatus",
    tags: ["Geo"],
    requiresAuth: false,
    parameters: [
        {
            name: "path",
            in: "query",
            description: "The path being evaluated. Defaults to the site root, which reports the platform-wide verdict.",
            required: false,
            schema: { type: "string" },
        },
    ],
    responses: {
        200: {
            description: "Geographic access status",
            content: {
                "application/json": {
                    schema: {
                        type: "object",
                        properties: {
                            enabled: { type: "boolean" },
                            restricted: { type: "boolean" },
                            countryCode: { type: "string", nullable: true },
                            countryName: { type: "string", nullable: true },
                            reasonCode: { type: "string" },
                            title: { type: "string" },
                            message: { type: "string" },
                            contactEmail: { type: "string", nullable: true },
                        },
                    },
                },
            },
        },
        500: query_1.serverErrorResponse,
    },
};
exports.default = async (data) => {
    var _a;
    const policy = (0, geo_1.getPolicy)();
    if (!policy.enabled) {
        return {
            enabled: false,
            restricted: false,
            countryCode: null,
            countryName: null,
            reasonCode: "DISABLED",
            title: "",
            message: "",
            contactEmail: "",
        };
    }
    const ctx = (0, geo_1.contextFromRequest)(data, {
        path: String(((_a = data === null || data === void 0 ? void 0 : data.query) === null || _a === void 0 ? void 0 : _a.path) || "/") || "/",
        method: "GET",
    });
    const decision = await (0, geo_1.evaluateRequest)(ctx, policy);
    return {
        enabled: true,
        restricted: !decision.allowed,
        countryCode: decision.location.countryCode,
        countryName: decision.location.countryName,
        reasonCode: decision.reasonCode,
        title: policy.noticeTitle || "Service not available in your region",
        message: decision.allowed ? "" : decision.message,
        contactEmail: policy.contactEmail || "",
    };
};
