"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const db_1 = require("@b/db");
const error_1 = require("@b/utils/error");
const query_1 = require("@b/utils/query");
const registry_1 = require("@b/utils/deposit-gateway/registry");
const health_1 = require("@b/utils/deposit-gateway/health");
exports.metadata = {
    summary: "Retrieves the setup guide and configuration health of one gateway",
    operationId: "getDepositGatewayConfig",
    tags: ["Admin", "Deposit Gateways"],
    description: "The integration bundled for this gateway: the environment variables it reads and whether each is set, the webhook and return URLs to paste into the vendor's dashboard, the ordered setup steps, the traps specific to that vendor, and whether its credentials can be checked against the vendor before they are saved. Credential VALUES are never returned.",
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
    responses: {
        200: {
            description: "Gateway configuration retrieved successfully",
            content: { "application/json": { schema: { type: "object" } } },
        },
        401: query_1.unauthorizedResponse,
        404: (0, query_1.notFoundMetadataResponse)("Deposit Gateway"),
        500: query_1.serverErrorResponse,
    },
    requiresAuth: true,
    permission: "view.deposit.gateway",
    logModule: "ADMIN_FIN",
    logTitle: "Get deposit gateway configuration",
};
exports.default = async (data) => {
    var _a, _b, _c;
    const { params, ctx } = data;
    (_a = ctx === null || ctx === void 0 ? void 0 : ctx.step) === null || _a === void 0 ? void 0 : _a.call(ctx, "Fetching deposit gateway record");
    const row = await db_1.models.depositGateway.findByPk(params.id);
    if (!row) {
        throw (0, error_1.createError)({ statusCode: 404, message: "Deposit gateway not found" });
    }
    const plain = row.get({ plain: true });
    (_b = ctx === null || ctx === void 0 ? void 0 : ctx.step) === null || _b === void 0 ? void 0 : _b.call(ctx, "Resolving integration configuration");
    const health = (0, health_1.describeGatewayHealth)(plain);
    let profile = (0, registry_1.getGatewayProfile)(plain);
    if ((profile === null || profile === void 0 ? void 0 : profile.alias) === "transfi") {
        profile = { ...profile, gotchas: [...profile.gotchas, await signatureGotcha()] };
    }
    (_c = ctx === null || ctx === void 0 ? void 0 : ctx.success) === null || _c === void 0 ? void 0 : _c.call(ctx, "Deposit gateway configuration retrieved");
    return {
        profile,
        health,
        unsupportedReason: profile
            ? null
            : `No integration is bundled under api/finance/deposit/fiat/${plain.alias || plain.name || plain.id}. This gateway can be edited but cannot take a payment.`,
    };
};
async function signatureGotcha() {
    const { SIGNATURE_VARIANT_OBSERVED_KEY } = await Promise.resolve().then(() => __importStar(require("@b/api/finance/deposit/fiat/transfi/utils")));
    let observed = null;
    try {
        const row = await db_1.models.settings.findOne({
            where: { key: SIGNATURE_VARIANT_OBSERVED_KEY },
        });
        observed = (row === null || row === void 0 ? void 0 : row.value) || null;
    }
    catch (_a) {
        observed = null;
    }
    const pinned = (process.env.APP_TRANSFI_SIGNATURE_VARIANT || "").trim().toLowerCase();
    const want = observed === "raw" ? "raw" : observed ? "python" : null;
    if (!observed) {
        return {
            level: "info",
            title: "After your first real webhook, lock the signature format",
            body: "TransFi's documentation shows three ways of signing a callback and publishes no example to check against, so which one they use can only be learned by receiving one. Until then this platform accepts either form — payments are verified and safe, just more permissively than necessary. Once a real deposit has settled, come back here: this panel will name the format and the exact setting to add.",
        };
    }
    if (pinned === want) {
        return {
            level: "info",
            title: "Webhook signature format is locked",
            body: `Your deliveries use the "${observed}" format and APP_TRANSFI_SIGNATURE_VARIANT matches it. Nothing to do. If this panel ever turns into a warning, TransFi has changed how it signs.`,
        };
    }
    return {
        level: "warning",
        title: "Lock the webhook signature format",
        body: `Your TransFi deliveries use the "${observed}" format. Add APP_TRANSFI_SIGNATURE_VARIANT="${want}" to your configuration and restart, so the platform stops accepting the other one.` +
            (pinned
                ? ` It is currently set to "${pinned}", which does not match what is arriving — check that first.`
                : "") +
            " Note this reflects whatever last verified a callback, so if you have run the bundled test scripts against this database it may be reporting those rather than TransFi.",
    };
}
