"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PRE_INTENT_METADATA_PATTERNS = exports.PRE_INTENT_REVIEWS = void 0;
exports.isPreIntentReview = isPreIntentReview;
exports.preIntentClaimWhere = preIntentClaimWhere;
exports.findPreIntentClaim = findPreIntentClaim;
const sequelize_1 = require("sequelize");
const db_1 = require("@b/db");
const error_1 = require("@b/utils/error");
const utils_1 = require("@b/api/finance/deposit/spot/utils");
exports.PRE_INTENT_REVIEWS = new Set(["no_intent", "no_intent_confirmed"]);
function isPreIntentReview(review) {
    return String(review !== null && review !== void 0 ? review : "").startsWith("no_intent");
}
exports.PRE_INTENT_METADATA_PATTERNS = Object.freeze([
    '%"review":"no_intent%',
    '%\\\\"review\\\\":\\\\"no_intent%',
]);
function preIntentClaimWhere() {
    return {
        type: "DEPOSIT",
        status: "PENDING",
        [sequelize_1.Op.or]: exports.PRE_INTENT_METADATA_PATTERNS.map((pattern) => ({ metadata: { [sequelize_1.Op.like]: pattern } })),
    };
}
async function findPreIntentClaim(id) {
    var _a;
    var _b;
    const row = await db_1.models.transaction.findOne({ where: { id, type: "DEPOSIT" } });
    if (!row)
        return null;
    const review = String((_b = (_a = (0, utils_1.parseTransactionMetadata)(row.metadata)) === null || _a === void 0 ? void 0 : _a.review) !== null && _b !== void 0 ? _b : "");
    if (!isPreIntentReview(review)) {
        throw (0, error_1.createError)({
            statusCode: 400,
            message: "That id is a deposit row with no intent and no pre-intent review flag. Approve it from Admin -> Finance -> Deposit Records instead.",
        });
    }
    const wallet = await db_1.models.wallet.findOne({
        where: { id: String(row.walletId) },
        attributes: ["id", "type", "currency"],
    });
    if (!wallet || String(wallet.type) !== "SPOT") {
        throw (0, error_1.createError)({
            statusCode: 400,
            message: "That deposit is not on a SPOT wallet; this console only handles spot deposits.",
        });
    }
    return row;
}
