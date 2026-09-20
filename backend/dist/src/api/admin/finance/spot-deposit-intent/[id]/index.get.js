"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const db_1 = require("@b/db");
const error_1 = require("@b/utils/error");
const query_1 = require("@b/utils/query");
const intents_1 = require("@b/utils/spot-deposit/intents");
const evidence_1 = require("@b/utils/pool-backing/evidence");
const utils_1 = require("@b/api/finance/deposit/spot/utils");
exports.metadata = {
    summary: "Reads one spot deposit intent with its rows and the exchange's evidence",
    description: "The intent, the SPOT claim row it produced, the ECO sweep row (mode C), and what the exchange says about the hash — everything the approve and reject doors decide on.",
    operationId: "getSpotDepositIntent",
    tags: ["Admin", "Finance", "Spot Deposit Intents"],
    parameters: [
        { index: 0, name: "id", in: "path", required: true, schema: { type: "string" }, description: "Intent id" },
    ],
    requiresAuth: true,
    permission: "view.spot.deposit.intent",
    demoMask: ["intent.user.email"],
    responses: {
        200: {
            description: "The intent, its transactions and the exchange evidence",
            content: {
                "application/json": {
                    schema: {
                        type: "object",
                        properties: {
                            intent: { type: "object" },
                            spotTransaction: { type: "object", nullable: true },
                            sweepTransaction: { type: "object", nullable: true },
                            evidence: { type: "object", nullable: true },
                        },
                    },
                },
            },
        },
        401: query_1.unauthorizedResponse,
        404: (0, query_1.notFoundMetadataResponse)("Spot deposit intent"),
        500: query_1.serverErrorResponse,
    },
};
function plainTransaction(row) {
    if (!row)
        return null;
    const plain = typeof row.get === "function" ? row.get({ plain: true }) : { ...row };
    return { ...plain, metadata: (0, utils_1.parseTransactionMetadata)(plain.metadata) };
}
exports.default = async (data) => {
    const { user, params } = data;
    if (!(user === null || user === void 0 ? void 0 : user.id))
        throw (0, error_1.createError)({ statusCode: 401, message: "Unauthorized" });
    const id = String((params === null || params === void 0 ? void 0 : params.id) || "");
    const intent = await db_1.models.spotDepositIntent.findOne({
        where: { id },
        include: [
            { model: db_1.models.user, as: "user", attributes: ["id", "firstName", "lastName", "email", "avatar"] },
            { model: db_1.models.wallet, as: "wallet", attributes: ["id", "currency", "type"] },
        ],
    });
    if (!intent)
        throw (0, error_1.createError)({ statusCode: 404, message: "Spot deposit intent not found" });
    const serialised = (0, intents_1.serialiseIntent)(intent);
    let spotTransaction = null;
    if (serialised.spotTransactionId) {
        spotTransaction = await db_1.models.transaction.findOne({
            where: { id: String(serialised.spotTransactionId) },
            paranoid: false,
        });
    }
    if (!spotTransaction && serialised.claimedTxid) {
        spotTransaction = await db_1.models.transaction.findOne({
            where: { referenceId: String(serialised.claimedTxid), type: "DEPOSIT" },
            paranoid: false,
        });
    }
    const sweepTransaction = serialised.sweepTransactionId
        ? await db_1.models.transaction.findOne({ where: { id: String(serialised.sweepTransactionId) }, paranoid: false })
        : null;
    const txid = serialised.claimedTxid ||
        serialised.matchedDepositId ||
        (spotTransaction ? spotTransaction.referenceId : null);
    const evidence = txid
        ? await (0, evidence_1.gatherSpotDepositEvidence)({ currency: String(serialised.currency), referenceId: String(txid) })
        : null;
    return {
        intent: serialised,
        spotTransaction: plainTransaction(spotTransaction),
        sweepTransaction: plainTransaction(sweepTransaction),
        evidence,
    };
};
