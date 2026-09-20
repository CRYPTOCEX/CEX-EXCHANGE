"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const query_1 = require("@b/utils/query");
const attestation_1 = require("@b/utils/attestation");
const utils_1 = require("@b/api/user/modules/utils");
exports.metadata = {
    summary: "Country lists derived from the operator's attestations",
    description: "The runtime residence allowlist per module, plus the Apple storefront and Google Play targeting lists. All three come from operator_attestations so they cannot drift apart.",
    operationId: "getAttestationCountryLists",
    tags: ["Admin", "System", "Attestation"],
    responses: {
        200: {
            description: "The three lists",
            content: {
                "application/json": {
                    schema: {
                        type: "object",
                        properties: {
                            runtime: {
                                type: "object",
                                description: "Module id -> ISO-2 countries it may be served in.",
                            },
                            appleStorefronts: { type: "array", items: { type: "string" } },
                            playTargeting: { type: "array", items: { type: "string" } },
                            unattestedModules: {
                                type: "array",
                                items: { type: "string" },
                                description: "Regulated modules with no live attestation anywhere. These are served to nobody.",
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
    logModule: "ADMIN_SYSTEM",
    logTitle: "Read attestation country lists",
};
exports.default = async (data) => {
    const { ctx } = data;
    const regulated = utils_1.MOBILE_MODULES.filter((m) => m.requiresAttestation).map((m) => m.id);
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Deriving country lists from attestations");
    const lists = await (0, attestation_1.emitCountryLists)(regulated);
    const unattestedModules = regulated.filter((id) => { var _a; return ((_a = lists.runtime[id]) !== null && _a !== void 0 ? _a : []).length === 0; });
    ctx === null || ctx === void 0 ? void 0 : ctx.success(`${lists.appleStorefronts.length} attested countries, ` +
        `${unattestedModules.length} module(s) reaching nobody`);
    return { ...lists, unattestedModules };
};
