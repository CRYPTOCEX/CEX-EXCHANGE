"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const db_1 = require("@b/db");
const error_1 = require("@b/utils/error");
const query_1 = require("@b/utils/query");
const constants_1 = require("@b/utils/constants");
const evidence_1 = require("@b/utils/pool-backing/evidence");
const utils_1 = require("@b/api/finance/deposit/spot/utils");
const utils_2 = require("../utils");
exports.metadata = {
    summary: "Lists pre-intent spot deposit claims waiting for an operator",
    description: "PENDING SPOT deposit rows an app built before intents existed submitted with no intent (metadata.review no_intent / no_intent_confirmed), with the customer, the hash and the exchange's own evidence for it. Approve or reject them by claim id through the intent doors.",
    operationId: "listPreIntentSpotDepositClaims",
    tags: ["Admin", "Finance", "Spot Deposit Intents"],
    parameters: [
        ...constants_1.crudParameters,
        {
            index: constants_1.crudParameters.length,
            name: "evidence",
            in: "query",
            required: false,
            schema: { type: "string", enum: ["0", "1"] },
            description: "Pass 0 to skip the per-row exchange evidence lookup (a count needs none).",
        },
    ],
    requiresAuth: true,
    permission: "view.spot.deposit.intent",
    demoMask: ["items.user.email"],
    responses: {
        200: {
            description: "Paginated list of pre-intent spot deposit claims",
            content: {
                "application/json": {
                    schema: {
                        type: "object",
                        properties: {
                            items: { type: "array", items: { type: "object" } },
                            pagination: constants_1.paginationSchema,
                        },
                    },
                },
            },
        },
        401: query_1.unauthorizedResponse,
        404: (0, query_1.notFoundMetadataResponse)("Pre-intent spot deposit claims"),
        500: query_1.serverErrorResponse,
    },
};
exports.default = async (data) => {
    var _a;
    var _b, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m;
    const { user, query } = data;
    if (!(user === null || user === void 0 ? void 0 : user.id))
        throw (0, error_1.createError)({ statusCode: 401, message: "Unauthorized" });
    const page = await (0, query_1.getFiltered)({
        model: db_1.models.transaction,
        query,
        where: (0, utils_2.preIntentClaimWhere)(),
        sortField: query.sortField || "createdAt",
        numericFields: ["amount", "fee"],
        includeModels: [
            {
                model: db_1.models.user,
                as: "user",
                attributes: ["id", "firstName", "lastName", "email", "avatar"],
            },
            {
                model: db_1.models.wallet,
                as: "wallet",
                attributes: ["id", "currency", "type"],
                where: { type: "SPOT" },
                required: true,
            },
        ],
    });
    const withEvidence = String((_b = query === null || query === void 0 ? void 0 : query.evidence) !== null && _b !== void 0 ? _b : "1") !== "0";
    const items = [];
    for (const raw of page.items) {
        const rowMeta = (_c = (0, utils_1.parseTransactionMetadata)(raw.metadata)) !== null && _c !== void 0 ? _c : {};
        const currency = String((_e = (_d = (_a = raw.wallet) === null || _a === void 0 ? void 0 : _a.currency) !== null && _d !== void 0 ? _d : rowMeta.currency) !== null && _e !== void 0 ? _e : "");
        const referenceId = raw.referenceId ? String(raw.referenceId) : rowMeta.trx ? String(rowMeta.trx) : null;
        const evidence = withEvidence && referenceId && currency ? await (0, evidence_1.gatherSpotDepositEvidence)({ currency, referenceId }) : null;
        items.push({
            ...raw,
            id: String(raw.id),
            userId: String(raw.userId),
            walletId: raw.walletId ? String(raw.walletId) : null,
            currency,
            chain: rowMeta.chain ? String(rowMeta.chain) : null,
            trx: referenceId,
            referenceId: (_f = raw.referenceId) !== null && _f !== void 0 ? _f : null,
            amount: (_g = raw.amount) !== null && _g !== void 0 ? _g : null,
            status: String(raw.status),
            review: String((_h = rowMeta.review) !== null && _h !== void 0 ? _h : ""),
            reviewMessage: rowMeta.reviewMessage ? String(rowMeta.reviewMessage) : null,
            metadata: rowMeta,
            evidence,
            createdAt: (_j = raw.createdAt) !== null && _j !== void 0 ? _j : null,
            updatedAt: (_k = raw.updatedAt) !== null && _k !== void 0 ? _k : null,
            user: (_l = raw.user) !== null && _l !== void 0 ? _l : null,
            wallet: (_m = raw.wallet) !== null && _m !== void 0 ? _m : null,
            preIntent: true,
        });
    }
    return { items, pagination: page.pagination };
};
