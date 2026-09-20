"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const db_1 = require("@b/db");
const error_1 = require("@b/utils/error");
const console_1 = require("@b/utils/console");
const cache_1 = require("@b/utils/cache");
const kyc_1 = require("@b/utils/kyc");
const query_1 = require("@b/utils/query");
const utils_1 = require("./utils");
const user_1 = require("./user");
exports.metadata = {
    summary: "Issues a permanent virtual IBAN for the customer",
    description: "Provisions a TransFi virtual IBAN the customer can pay into at any time, instead of starting a checkout per deposit. Returns the existing one if they already have it.",
    operationId: "createTransfiIban",
    tags: ["Finance", "Deposit", "TransFi"],
    requiresAuth: true,
    logModule: "FIAT_DEPOSIT",
    logTitle: "Provision TransFi IBAN",
    requestBody: {
        required: false,
        content: {
            "application/json": {
                schema: {
                    type: "object",
                    properties: {
                        currency: { type: "string", description: "IBAN currency (EUR today)" },
                        payerDetails: {
                            type: "object",
                            properties: {
                                dateOfBirth: { type: "string" },
                                country: { type: "string" },
                                street: { type: "string" },
                                city: { type: "string" },
                                state: { type: "string" },
                                postalCode: { type: "string" },
                            },
                        },
                    },
                },
            },
        },
    },
    responses: {
        200: { description: "IBAN issued or already held", content: { "application/json": { schema: { type: "object" } } } },
        401: query_1.unauthorizedResponse,
        500: query_1.serverErrorResponse,
    },
};
exports.default = async (data) => {
    var _a, _b;
    const { user, body, ctx } = data;
    if (!(user === null || user === void 0 ? void 0 : user.id))
        throw (0, error_1.createError)({ statusCode: 401, message: "Unauthorized" });
    await (0, kyc_1.assertKycFeature)(user.id, kyc_1.KYC_FEATURES.DEPOSIT_WALLET, "deposit funds");
    (0, utils_1.assertTransfiConfig)();
    let enabled = false;
    try {
        const settings = await cache_1.CacheManager.getInstance().getSettings();
        enabled = ((_a = settings === null || settings === void 0 ? void 0 : settings.get) === null || _a === void 0 ? void 0 : _a.call(settings, "transfiIbanEnabled")) === "true";
    }
    catch (_c) {
        enabled = false;
    }
    if (!enabled) {
        throw (0, error_1.createError)({
            statusCode: 404,
            message: "Virtual IBANs are not enabled. Ask an administrator to turn them on.",
        });
    }
    const currency = String((body === null || body === void 0 ? void 0 : body.currency) || "EUR").toUpperCase();
    const existing = await db_1.models.transfiIban.findOne({ where: { userId: user.id, currency } });
    if (existing) {
        return { success: true, status: "EXISTING", data: present(existing) };
    }
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Resolving TransFi identity");
    const mirror = await (0, user_1.resolveOrCreateTransfiUser)(user.id, ((body === null || body === void 0 ? void 0 : body.payerDetails) || {}));
    if (mirror.kind === "needs_details") {
        return {
            success: false,
            status: "PAYER_DETAILS_REQUIRED",
            message: "TransFi requires a few more details before issuing your account.",
            data: { missing: mirror.missing },
        };
    }
    if (mirror.kind === "screening") {
        return {
            success: false,
            status: "PAYER_SCREENING",
            message: "Your profile is being verified by our payment partner.",
            data: { retryAfterSeconds: mirror.retryAfterSeconds },
        };
    }
    if (mirror.kind === "rejected") {
        return {
            success: false,
            status: "PAYER_REJECTED",
            message: mirror.message || "Our payment partner could not verify your details.",
        };
    }
    const platformUser = await db_1.models.user.findByPk(user.id);
    const profile = safeProfile(platformUser === null || platformUser === void 0 ? void 0 : platformUser.profile);
    const details = ((body === null || body === void 0 ? void 0 : body.payerDetails) || {});
    const street = details.street || profile.street;
    const city = details.city || profile.city;
    const country = (details.country || profile.country || "").toUpperCase();
    if (!street || !city || !country) {
        return {
            success: false,
            status: "PAYER_DETAILS_REQUIRED",
            message: "TransFi requires an address before issuing your account.",
            data: {
                missing: [!street && "street", !city && "city", !country && "country"].filter(Boolean),
            },
        };
    }
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Requesting virtual IBAN");
    let created;
    try {
        const res = await (0, utils_1.transfiRequest)("/v3/iban/create-iban", {
            method: "POST",
            body: {
                customer: {
                    userId: mirror.transfiUserId,
                    beneficiaryType: "individual",
                    email: platformUser === null || platformUser === void 0 ? void 0 : platformUser.email,
                    street,
                    city,
                },
                paymentCode: "virtual_iban",
                country,
                currency,
                webhookUrl: (0, utils_1.transfiWebhookUrl)(),
            },
        });
        created = res === null || res === void 0 ? void 0 : res.data;
    }
    catch (error) {
        console_1.logger.error("TRANSFI", `IBAN provisioning failed for ${user.id}: ${error === null || error === void 0 ? void 0 : error.message}`);
        throw (0, error_1.createError)({
            statusCode: error instanceof utils_1.TransfiError && error.statusCode < 500 ? 400 : 502,
            message: (error === null || error === void 0 ? void 0 : error.message) || "Could not issue a virtual account",
        });
    }
    if (!(created === null || created === void 0 ? void 0 : created.iban) || !(created === null || created === void 0 ? void 0 : created.ibId)) {
        throw (0, error_1.createError)({ statusCode: 502, message: "TransFi returned an incomplete IBAN" });
    }
    const row = await db_1.models.transfiIban.create({
        userId: user.id,
        ibId: created.ibId,
        transfiUserId: mirror.transfiUserId,
        currency: created.currency || currency,
        iban: created.iban,
        bic: created.bic || null,
        accountNumber: created.accountNumber || null,
        bankName: created.bankName || null,
        bankAddress: created.bankAddress || null,
        accountHolderName: created.bankAccountHolderName || ((_b = created.customer) === null || _b === void 0 ? void 0 : _b.name) || null,
        status: created.status || "ACTIVE",
        lastSyncedAt: new Date(),
    });
    ctx === null || ctx === void 0 ? void 0 : ctx.success(`TransFi IBAN issued: ${created.ibId}`);
    return { success: true, status: "CREATED", data: present(row) };
};
function present(row) {
    return {
        ibId: row.ibId,
        currency: row.currency,
        iban: row.iban,
        bic: row.bic,
        accountNumber: row.accountNumber,
        bankName: row.bankName,
        bankAddress: row.bankAddress,
        accountHolderName: row.accountHolderName,
        status: row.status,
    };
}
function safeProfile(raw) {
    let p = raw;
    if (typeof p === "string") {
        try {
            p = JSON.parse(p);
        }
        catch (_a) {
            return {};
        }
    }
    if (!p || typeof p !== "object")
        return {};
    const addr = p.address && typeof p.address === "object" ? p.address : {};
    return {
        street: addr.street || addr.line1 || p.street,
        city: addr.city || p.city,
        country: p.country || addr.country,
    };
}
