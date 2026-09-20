"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const db_1 = require("@b/db");
const error_1 = require("@b/utils/error");
const query_1 = require("@b/utils/query");
const registry_1 = require("@b/utils/deposit-gateway/registry");
const probe_1 = require("@b/utils/deposit-gateway/probe");
exports.metadata = {
    summary: "Tests deposit gateway credentials against the vendor",
    operationId: "testDepositGatewayCredentials",
    tags: ["Admin", "Deposit Gateways"],
    description: "Checks a gateway's credentials against the vendor with a read-only call, before anything is written to .env and the process restarted. Candidate values supplied in the body overlay the configured environment for the duration of one request and are then discarded — nothing is persisted, no payment is created, and no credential is written to the log.",
    parameters: [
        {
            index: 0,
            name: "id",
            in: "path",
            required: true,
            description: "ID of the deposit gateway",
            schema: { type: "string" },
        },
    ],
    requestBody: {
        required: false,
        content: {
            "application/json": {
                schema: {
                    type: "object",
                    properties: {
                        credentials: {
                            type: "object",
                            additionalProperties: { type: "string" },
                            description: "Candidate values keyed by environment variable name. Any omitted key falls back to what is configured.",
                        },
                    },
                },
            },
        },
    },
    responses: {
        200: {
            description: "Credential test result",
            content: {
                "application/json": {
                    schema: {
                        type: "object",
                        properties: {
                            status: {
                                type: "string",
                                enum: ["valid", "invalid", "unknown", "unsupported"],
                            },
                            message: { type: "string" },
                            environment: { type: "string", enum: ["test", "live"] },
                        },
                    },
                },
            },
        },
        401: query_1.unauthorizedResponse,
        404: (0, query_1.notFoundMetadataResponse)("Deposit Gateway"),
        500: query_1.serverErrorResponse,
    },
    requiresAuth: true,
    permission: "edit.deposit.gateway",
    logModule: "ADMIN_FIN",
    logTitle: "Test deposit gateway credentials",
    audit: false,
};
exports.default = async (data) => {
    var _a, _b;
    const { params, body, ctx } = data;
    const row = await db_1.models.depositGateway.findByPk(params.id);
    if (!row) {
        throw (0, error_1.createError)({ statusCode: 404, message: "Deposit gateway not found" });
    }
    const plain = row.get({ plain: true });
    const alias = (0, registry_1.gatewayProfileKey)(plain);
    if (!alias) {
        throw (0, error_1.createError)({
            statusCode: 400,
            message: `No integration is bundled for "${plain.alias || plain.name || plain.id}", so its credentials cannot be tested.`,
        });
    }
    const allowed = new Set(registry_1.GATEWAY_PROFILES[alias].credentials.map((credential) => credential.key));
    const raw = body === null || body === void 0 ? void 0 : body.credentials;
    const credentials = {};
    if (raw && typeof raw === "object" && !Array.isArray(raw)) {
        for (const [key, value] of Object.entries(raw)) {
            if (!allowed.has(key))
                continue;
            if (typeof value === "string" && value.trim()) {
                credentials[key] = value.trim();
            }
        }
    }
    const supplied = Object.keys(credentials);
    (_a = ctx === null || ctx === void 0 ? void 0 : ctx.step) === null || _a === void 0 ? void 0 : _a.call(ctx, supplied.length
        ? `Testing candidate ${alias} credentials (${supplied.join(", ")})`
        : `Testing configured ${alias} credentials`);
    const result = await (0, probe_1.probeGatewayCredentials)(alias, credentials);
    (_b = ctx === null || ctx === void 0 ? void 0 : ctx[result.status === "valid" ? "success" : "step"]) === null || _b === void 0 ? void 0 : _b.call(ctx, `${alias} credential test: ${result.status}`);
    return result;
};
