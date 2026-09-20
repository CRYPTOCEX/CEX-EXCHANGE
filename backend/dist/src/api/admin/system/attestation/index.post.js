"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const query_1 = require("@b/utils/query");
const error_1 = require("@b/utils/error");
const attestation_1 = require("@b/utils/attestation");
const utils_1 = require("@b/api/user/modules/utils");
const attestationSchema = {
    type: "object",
    properties: {
        moduleId: { type: "string", description: "A module id this platform serves." },
        countryCode: { type: "string", description: "ISO 3166-1 alpha-2 or alpha-3." },
        entityName: { type: "string", description: "The legal entity holding the licence." },
        regulator: { type: "string", description: "The issuing authority." },
        licenceNumber: { type: "string", description: "Licence or registration number." },
        expiresAt: { type: "string", format: "date-time" },
        notes: { type: "string" },
    },
    required: [
        "moduleId",
        "countryCode",
        "entityName",
        "regulator",
        "licenceNumber",
        "expiresAt",
    ],
};
exports.metadata = {
    summary: "Records an operator licence attestation",
    operationId: "storeOperatorAttestation",
    tags: ["Admin", "System", "Attestation"],
    requestBody: {
        required: true,
        content: { "application/json": { schema: attestationSchema } },
    },
    responses: (0, query_1.storeRecordResponses)(attestationSchema, "Attestation"),
    requiresAuth: true,
    permission: "create.geo.restriction",
    logModule: "ADMIN_SYSTEM",
    logTitle: "Record operator attestation",
};
const KNOWN_MODULE_IDS = new Set(utils_1.MOBILE_MODULES.map((m) => m.id));
exports.default = async (data) => {
    const { body, ctx } = data;
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Validating the attestation");
    const moduleId = String((body === null || body === void 0 ? void 0 : body.moduleId) || "").trim();
    if (!KNOWN_MODULE_IDS.has(moduleId)) {
        throw (0, error_1.createError)({
            statusCode: 400,
            message: `"${moduleId}" is not a module this platform serves. An attestation for ` +
                `an unknown module would match nothing and change nothing.`,
        });
    }
    const countryCode = (0, attestation_1.toIso2)(body === null || body === void 0 ? void 0 : body.countryCode);
    if (!countryCode) {
        throw (0, error_1.createError)({
            statusCode: 400,
            message: "Country must be an ISO 3166-1 code, for example GB or GBR. A country " +
                "name will not match any resident.",
        });
    }
    const expiresAt = new Date(String((body === null || body === void 0 ? void 0 : body.expiresAt) || ""));
    if (Number.isNaN(expiresAt.getTime())) {
        throw (0, error_1.createError)({ statusCode: 400, message: "Expiry date is not a date." });
    }
    if (expiresAt.getTime() <= Date.now()) {
        throw (0, error_1.createError)({
            statusCode: 400,
            message: "That expiry date has already passed, so this attestation would serve " +
                "nobody. Record the current licence's expiry.",
        });
    }
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Recording the attestation");
    const result = await (0, query_1.storeRecord)({
        model: "operatorAttestation",
        data: {
            moduleId,
            countryCode,
            entityName: String(body.entityName).trim(),
            regulator: String(body.regulator).trim(),
            licenceNumber: String(body.licenceNumber).trim(),
            expiresAt,
            notes: body.notes ? String(body.notes).trim() : null,
        },
    });
    ctx === null || ctx === void 0 ? void 0 : ctx.success(`Attestation recorded for ${moduleId} in ${countryCode}`);
    return result;
};
