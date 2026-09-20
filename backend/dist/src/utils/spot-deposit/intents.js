"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ACTIVE_INTENT_STATUSES = exports.INTENT_STREAM_PATH = exports.NUDGE_MAX_DECIMALS = exports.NUDGE_MAX_ATTEMPTS = exports.HASH_SUBMISSION_WINDOW_MS = exports.MAX_HASH_SUBMISSIONS_PER_HOUR = exports.MAX_OPEN_INTENTS_PER_USER = exports.INTENT_CLOCK_SLACK_MS = exports.INTENT_MATCH_WINDOW_MS = exports.INTENT_SEND_BY_MS = exports.INTENT_OPEN_WINDOW_MS = void 0;
exports.parseAmount = parseAmount;
exports.amountDecimals = amountDecimals;
exports.nudgedAmount = nudgedAmount;
exports.activeAmountKeyFor = activeAmountKeyFor;
exports.reservedExpectedAmounts = reservedExpectedAmounts;
exports.normaliseCurrency = normaliseCurrency;
exports.networkAliases = networkAliases;
exports.parseIntentMetadata = parseIntentMetadata;
exports.stageOf = stageOf;
exports.serialiseIntent = serialiseIntent;
exports.broadcastIntent = broadcastIntent;
exports.findOpenIntentFor = findOpenIntentFor;
exports.findOpenIntentsForNetwork = findOpenIntentsForNetwork;
exports.listActiveIntents = listActiveIntents;
exports.countOpenIntents = countOpenIntents;
exports.assertOpenIntentCapacity = assertOpenIntentCapacity;
exports.decideMode = decideMode;
exports.createIntent = createIntent;
exports.transitionIntent = transitionIntent;
exports.markMatched = markMatched;
exports.markSweeping = markSweeping;
exports.markCredited = markCredited;
exports.markReview = markReview;
exports.markFailed = markFailed;
exports.markExpired = markExpired;
exports.markCancelled = markCancelled;
exports.expireOpenIntents = expireOpenIntents;
exports.countHashSubmissions = countHashSubmissions;
exports.assertHashSubmissionAllowed = assertHashSubmissionAllowed;
exports.recordHashSubmission = recordHashSubmission;
const sequelize_1 = require("sequelize");
const db_1 = require("@b/db");
const error_1 = require("@b/utils/error");
const console_1 = require("@b/utils/console");
const deposit_address_1 = require("@b/api/finance/currency/deposit-address");
const settings_1 = require("./settings");
const networks_1 = require("./networks");
exports.INTENT_OPEN_WINDOW_MS = 60 * 60 * 1000;
exports.INTENT_SEND_BY_MS = 30 * 60 * 1000;
exports.INTENT_MATCH_WINDOW_MS = 7 * 24 * 60 * 60 * 1000;
exports.INTENT_CLOCK_SLACK_MS = 120 * 1000;
exports.MAX_OPEN_INTENTS_PER_USER = 3;
exports.MAX_HASH_SUBMISSIONS_PER_HOUR = 10;
exports.HASH_SUBMISSION_WINDOW_MS = 60 * 60 * 1000;
exports.NUDGE_MAX_ATTEMPTS = 50;
exports.NUDGE_MAX_DECIMALS = 8;
exports.INTENT_STREAM_PATH = "/api/finance/deposit/spot/intent";
exports.ACTIVE_INTENT_STATUSES = Object.freeze(["OPEN", "MATCHED", "SWEEPING"]);
function toPlainString(n) {
    const s = String(n);
    if (!/e/i.test(s))
        return s;
    const [mantissa, expPart] = s.split(/e/i);
    const exp = Number(expPart);
    const negative = mantissa.startsWith("-");
    const magnitude = negative ? mantissa.slice(1) : mantissa;
    const [intPart, fracPart = ""] = magnitude.split(".");
    const digits = intPart + fracPart;
    const pointAt = intPart.length + exp;
    let out;
    if (pointAt <= 0)
        out = `0.${"0".repeat(-pointAt)}${digits}`;
    else if (pointAt >= digits.length)
        out = digits + "0".repeat(pointAt - digits.length);
    else
        out = `${digits.slice(0, pointAt)}.${digits.slice(pointAt)}`;
    return (negative ? "-" : "") + out;
}
function parseAmount(raw) {
    if (raw === null || raw === undefined || raw === "")
        return null;
    let s;
    if (typeof raw === "number") {
        if (!Number.isFinite(raw))
            return null;
        s = toPlainString(raw);
    }
    else {
        s = String(raw).trim();
    }
    if (!/^\d+(\.\d+)?$/.test(s))
        return null;
    let [intPart, fracPart = ""] = s.split(".");
    intPart = intPart.replace(/^0+(?=\d)/, "");
    fracPart = fracPart.replace(/0+$/, "");
    if (/^0*$/.test(intPart) && fracPart === "")
        return null;
    return fracPart ? `${intPart}.${fracPart}` : intPart;
}
function amountDecimals(amount) {
    const at = amount.indexOf(".");
    return at === -1 ? 0 : amount.length - at - 1;
}
function toUnits(amount, decimals) {
    const [intPart, fracPart = ""] = amount.split(".");
    if (fracPart.length > decimals) {
        throw (0, error_1.createError)({ statusCode: 400, message: `Amount carries more than ${decimals} decimal places` });
    }
    return BigInt(intPart + fracPart.padEnd(decimals, "0"));
}
function formatUnits(units, decimals) {
    const s = units.toString().padStart(decimals + 1, "0");
    if (decimals === 0)
        return s;
    return `${s.slice(0, s.length - decimals)}.${s.slice(s.length - decimals)}`;
}
function nudgedAmount(declared, decimals, k) {
    return formatUnits(toUnits(declared, decimals) + BigInt(k), decimals);
}
function activeAmountKeyFor(currency, network, expectedAmount) {
    var _a;
    void network;
    const canonical = (_a = parseAmount(expectedAmount)) !== null && _a !== void 0 ? _a : String(expectedAmount !== null && expectedAmount !== void 0 ? expectedAmount : "").trim();
    return `${normaliseCurrency(currency)}|${canonical}`;
}
const AMOUNT_RESERVED_STATUSES = Object.freeze([
    "OPEN",
    "EXPIRED",
    "CANCELLED",
]);
async function reservedExpectedAmounts(currency, now = new Date()) {
    const rows = (await db_1.models.spotDepositIntent.findAll({
        where: {
            currency: normaliseCurrency(currency),
            mode: "amount_match",
            status: [...AMOUNT_RESERVED_STATUSES],
            createdAt: { [sequelize_1.Op.gte]: new Date(now.getTime() - exports.INTENT_MATCH_WINDOW_MS) },
        },
        attributes: ["id", "expectedAmount"],
    }));
    const reserved = new Set();
    for (const row of rows) {
        const canonical = parseAmount(row === null || row === void 0 ? void 0 : row.expectedAmount);
        if (canonical)
            reserved.add(canonical);
    }
    return reserved;
}
function finiteOrNull(value) {
    if (value === null || value === undefined || value === "")
        return null;
    const n = Number(value);
    return Number.isFinite(n) ? n : null;
}
function normaliseCurrency(currency) {
    return String(currency !== null && currency !== void 0 ? currency : "").trim().toUpperCase();
}
function networkAliases(network) {
    const n = (0, networks_1.normaliseNetwork)(network);
    if (!n)
        return [];
    return Array.from(new Set([n, (0, networks_1.normaliseNetwork)((0, deposit_address_1.handleNetworkMapping)(n)), (0, networks_1.normaliseNetwork)((0, deposit_address_1.handleNetworkMappingReverse)(n))].filter(Boolean)));
}
function isUniqueViolation(error) {
    var _a, _b;
    var _c;
    if (!error)
        return false;
    if (error.name === "SequelizeUniqueConstraintError")
        return true;
    const code = (_c = (_a = error === null || error === void 0 ? void 0 : error.parent) === null || _a === void 0 ? void 0 : _a.code) !== null && _c !== void 0 ? _c : (_b = error === null || error === void 0 ? void 0 : error.original) === null || _b === void 0 ? void 0 : _b.code;
    return code === "ER_DUP_ENTRY";
}
function parseIntentMetadata(raw) {
    if (raw === null || raw === undefined)
        return {};
    if (typeof raw === "string") {
        try {
            const parsed = JSON.parse(raw);
            return parsed && typeof parsed === "object" ? parsed : {};
        }
        catch (_a) {
            return {};
        }
    }
    return typeof raw === "object" ? raw : {};
}
function toPlain(row) {
    if (!row)
        return row;
    return typeof row.get === "function" ? row.get({ plain: true }) : { ...row };
}
function stageOf(intent) {
    switch (String(intent.status)) {
        case "OPEN":
            return "waiting";
        case "MATCHED":
            return "received";
        case "SWEEPING":
            return parseIntentMetadata(intent.metadata).sweepTxid ? "on_exchange" : "moving";
        case "CREDITED":
            return "credited";
        case "REVIEW":
            return "review";
        case "FAILED":
            return "failed";
        case "EXPIRED":
        case "CANCELLED":
        default:
            return "expired";
    }
}
function serialiseIntent(row) {
    const plain = toPlain(row);
    const createdAt = plain.createdAt ? new Date(plain.createdAt) : null;
    return {
        ...plain,
        metadata: parseIntentMetadata(plain.metadata),
        stage: stageOf(plain),
        sendBy: createdAt ? new Date(createdAt.getTime() + exports.INTENT_SEND_BY_MS).toISOString() : null,
    };
}
function broadcastIntent(intent, extra = {}) {
    var _a, _b, _c;
    try {
        const plain = serialiseIntent(intent);
        const { messageBroker } = require("@b/handler/Websocket");
        messageBroker.broadcastToSubscribedClients(exports.INTENT_STREAM_PATH, { intentId: String(plain.id) }, {
            stream: "intent",
            data: {
                intentId: String(plain.id),
                status: plain.status,
                stage: plain.stage,
                mode: plain.mode,
                txid: (_a = plain.claimedTxid) !== null && _a !== void 0 ? _a : undefined,
                amount: (_c = (_b = plain.expectedAmount) !== null && _b !== void 0 ? _b : plain.declaredAmount) !== null && _c !== void 0 ? _c : undefined,
                ...extra,
            },
        });
    }
    catch (error) {
        console_1.logger.debug("SPOT_DEPOSIT", `Intent stream not reachable from this process: ${(error === null || error === void 0 ? void 0 : error.message) || error}`);
    }
}
async function findOpenIntentFor(userId, currency, network) {
    const aliases = networkAliases(network);
    if (!userId || !aliases.length)
        return null;
    return db_1.models.spotDepositIntent.findOne({
        where: { userId, currency: normaliseCurrency(currency), network: aliases, status: "OPEN" },
    });
}
async function findOpenIntentsForNetwork(currency, network) {
    const aliases = networkAliases(network);
    if (!aliases.length)
        return [];
    return db_1.models.spotDepositIntent.findAll({
        where: { currency: normaliseCurrency(currency), network: aliases, status: "OPEN" },
    });
}
async function listActiveIntents(userId) {
    if (!userId)
        return [];
    return db_1.models.spotDepositIntent.findAll({
        where: { userId, status: [...exports.ACTIVE_INTENT_STATUSES] },
        order: [["createdAt", "DESC"]],
    });
}
async function countOpenIntents(userId) {
    return db_1.models.spotDepositIntent.count({ where: { userId, status: "OPEN" } });
}
async function assertOpenIntentCapacity(userId) {
    const open = await countOpenIntents(userId);
    if (open >= exports.MAX_OPEN_INTENTS_PER_USER) {
        throw (0, error_1.createError)({
            statusCode: 409,
            message: `You already have ${open} deposits waiting. Cancel one, or wait for it to complete or expire, before starting another.`,
        });
    }
}
function decideMode(setting, custodyEligible) {
    if (setting === "ecosystem_custody")
        return custodyEligible ? "ecosystem_custody" : "amount_match";
    return setting;
}
async function createIntent(input) {
    var _a, _b, _c, _d;
    var _e, _f, _g, _h, _j, _k, _l, _m, _o;
    const userId = String((_e = input.userId) !== null && _e !== void 0 ? _e : "").trim();
    const currency = normaliseCurrency(input.currency);
    const network = (0, networks_1.normaliseNetwork)(input.network);
    if (!userId)
        throw (0, error_1.createError)({ statusCode: 401, message: "Unauthorized" });
    if (!currency)
        throw (0, error_1.createError)({ statusCode: 400, message: "currency is required" });
    if (!network)
        throw (0, error_1.createError)({ statusCode: 400, message: "network is required" });
    const now = (_f = input.now) !== null && _f !== void 0 ? _f : new Date();
    const existing = await findOpenIntentFor(userId, currency, network);
    if (existing)
        return { intent: existing, created: false, mode: existing.mode };
    await assertOpenIntentCapacity(userId);
    const setting = (_g = input.preferredMode) !== null && _g !== void 0 ? _g : (await (0, settings_1.getSpotDepositMode)());
    const custodyEligible = ((_a = input.custody) === null || _a === void 0 ? void 0 : _a.eligible) === true && !!((_b = input.custody) === null || _b === void 0 ? void 0 : _b.chain);
    const mode = decideMode(setting, custodyEligible);
    const networkDecimals = (0, networks_1.precisionDecimals)(input.precision, 8);
    const depositMin = finiteOrNull(input.depositMin);
    const declared = parseAmount(input.amount);
    if (mode !== "ecosystem_custody") {
        if (!declared) {
            throw (0, error_1.createError)({ statusCode: 400, message: "amount is required and must be a positive number" });
        }
        if (amountDecimals(declared) > networkDecimals) {
            throw (0, error_1.createError)({
                statusCode: 400,
                message: `${currency} on ${network} accepts at most ${networkDecimals} decimal places`,
            });
        }
        if (depositMin !== null && Number(declared) < depositMin) {
            throw (0, error_1.createError)({
                statusCode: 400,
                message: `The minimum deposit for ${currency} on ${network} is ${depositMin} ${currency}`,
            });
        }
    }
    else if (input.amount !== undefined && input.amount !== null && input.amount !== "" && !declared) {
        throw (0, error_1.createError)({ statusCode: 400, message: "amount must be a positive number when given" });
    }
    const metadata = {
        ...((_h = input.metadata) !== null && _h !== void 0 ? _h : {}),
        setting,
        networkDecimals,
        depositMin,
        minUnknown: depositMin === null,
    };
    if (setting === "ecosystem_custody" && mode !== "ecosystem_custody") {
        metadata.custodyReason = (_j = (_c = input.custody) === null || _c === void 0 ? void 0 : _c.reason) !== null && _j !== void 0 ? _j : "ineligible";
    }
    const base = {
        userId,
        walletId: (_k = input.walletId) !== null && _k !== void 0 ? _k : null,
        currency,
        network,
        chain: mode === "ecosystem_custody" ? (0, networks_1.normaliseNetwork)((_d = input.custody) === null || _d === void 0 ? void 0 : _d.chain) : null,
        mode,
        declaredAmount: declared,
        expectedAmount: mode === "hash_claim" ? declared : null,
        address: (_l = input.address) !== null && _l !== void 0 ? _l : null,
        tag: (_m = input.tag) !== null && _m !== void 0 ? _m : null,
        status: "OPEN",
        activeAmountKey: null,
        metadata,
        expiresAt: new Date(now.getTime() + exports.INTENT_OPEN_WINDOW_MS),
    };
    if (mode !== "amount_match") {
        const row = await db_1.models.spotDepositIntent.create(base);
        console_1.logger.info("SPOT_DEPOSIT", `Intent ${row.id} created for ${userId}: ${currency}/${network} in ${mode}`);
        return { intent: row, created: true, mode };
    }
    const nudgeDecimals = Math.min(networkDecimals, Math.max(exports.NUDGE_MAX_DECIMALS, amountDecimals(declared)));
    let reserved = new Set();
    try {
        reserved = await reservedExpectedAmounts(currency, now);
    }
    catch (error) {
        console_1.logger.warn("SPOT_DEPOSIT", `Could not read the reserved ${currency} amounts; relying on the index alone: ${(error === null || error === void 0 ? void 0 : error.message) || error}`);
    }
    for (let k = 1; k <= exports.NUDGE_MAX_ATTEMPTS; k++) {
        const expectedAmount = nudgedAmount(declared, nudgeDecimals, k);
        if (reserved.has((_o = parseAmount(expectedAmount)) !== null && _o !== void 0 ? _o : expectedAmount))
            continue;
        const activeAmountKey = activeAmountKeyFor(currency, network, expectedAmount);
        try {
            const row = await db_1.models.spotDepositIntent.create({
                ...base,
                expectedAmount,
                activeAmountKey,
                metadata: { ...metadata, nudge: k, nudgeDecimals },
            });
            console_1.logger.info("SPOT_DEPOSIT", `Intent ${row.id} created for ${userId}: ${currency}/${network} in amount_match, expecting ${expectedAmount} (nudge ${k})`);
            return { intent: row, created: true, mode };
        }
        catch (error) {
            if (isUniqueViolation(error))
                continue;
            throw error;
        }
    }
    throw (0, error_1.createError)({
        statusCode: 409,
        message: `Every amount near ${declared} ${currency} on ${network} is taken by another waiting deposit right now. Please try again in a moment.`,
    });
}
const ALLOWED_FROM = {
    MATCHED: ["OPEN", "EXPIRED"],
    SWEEPING: ["MATCHED", "FAILED"],
    CREDITED: ["OPEN", "MATCHED", "SWEEPING", "REVIEW", "EXPIRED"],
    REVIEW: ["OPEN", "MATCHED", "SWEEPING", "EXPIRED"],
    FAILED: ["MATCHED", "SWEEPING", "REVIEW"],
    EXPIRED: ["OPEN"],
    CANCELLED: ["OPEN"],
};
async function transitionIntent(intentId, to, patch = {}) {
    var _a, _b;
    const row = await db_1.models.spotDepositIntent.findOne({ where: { id: intentId } });
    if (!row) {
        console_1.logger.warn("SPOT_DEPOSIT", `Intent ${intentId} not found; ${to} not applied`);
        return null;
    }
    const from = String(row.status);
    if (from === to)
        return row;
    if (!ALLOWED_FROM[to].includes(from)) {
        console_1.logger.debug("SPOT_DEPOSIT", `Intent ${intentId} is ${from}; ${to} not applicable`);
        return null;
    }
    const metadata = { ...parseIntentMetadata(row.metadata) };
    for (const [key, value] of Object.entries((_a = patch.metadata) !== null && _a !== void 0 ? _a : {})) {
        if (value !== undefined)
            metadata[key] = value;
    }
    const values = { status: to, activeAmountKey: null, metadata };
    for (const key of ["claimedTxid", "matchedDepositId", "sweepTransactionId", "spotTransactionId"]) {
        if (patch[key] === undefined)
            continue;
        if (key === "matchedDepositId" && row.matchedDepositId && patch[key])
            continue;
        values[key] = patch[key];
    }
    const [count] = await db_1.models.spotDepositIntent.update(values, { where: { id: intentId, status: from } });
    if (!count) {
        console_1.logger.debug("SPOT_DEPOSIT", `Intent ${intentId} left ${from} before ${to} could be applied`);
        return null;
    }
    const fresh = await db_1.models.spotDepositIntent.findOne({ where: { id: intentId } });
    console_1.logger.info("SPOT_DEPOSIT", `Intent ${intentId}: ${from} -> ${to}`);
    if (fresh)
        broadcastIntent(fresh, (_b = patch.broadcast) !== null && _b !== void 0 ? _b : {});
    return fresh;
}
function markMatched(intentId, patch = {}) {
    return transitionIntent(intentId, "MATCHED", patch);
}
function markSweeping(intentId, patch) {
    return transitionIntent(intentId, "SWEEPING", patch);
}
function markCredited(intentId, patch = {}) {
    return transitionIntent(intentId, "CREDITED", patch);
}
function markReview(intentId, patch) {
    var _a, _b;
    const { reason, ...rest } = patch;
    return transitionIntent(intentId, "REVIEW", {
        ...rest,
        metadata: { ...((_a = rest.metadata) !== null && _a !== void 0 ? _a : {}), review: reason },
        broadcast: { message: reason, ...((_b = rest.broadcast) !== null && _b !== void 0 ? _b : {}) },
    });
}
function markFailed(intentId, patch) {
    var _a, _b;
    const { reason, ...rest } = patch;
    return transitionIntent(intentId, "FAILED", {
        ...rest,
        metadata: { ...((_a = rest.metadata) !== null && _a !== void 0 ? _a : {}), failure: reason },
        broadcast: { message: reason, ...((_b = rest.broadcast) !== null && _b !== void 0 ? _b : {}) },
    });
}
function markExpired(intentId, patch = {}) {
    return transitionIntent(intentId, "EXPIRED", patch);
}
function markCancelled(intentId, patch = {}) {
    return transitionIntent(intentId, "CANCELLED", patch);
}
async function expireOpenIntents(now = new Date()) {
    const due = await db_1.models.spotDepositIntent.findAll({
        where: { status: "OPEN", expiresAt: { [sequelize_1.Op.lte]: now } },
    });
    let expired = 0;
    for (const row of due) {
        const result = await markExpired(String(row.id), { broadcast: { message: "This deposit request has expired" } });
        if (result && String(result.status) === "EXPIRED")
            expired += 1;
    }
    if (expired)
        console_1.logger.info("SPOT_DEPOSIT", `Expired ${expired} open intent(s)`);
    return expired;
}
async function countHashSubmissions(userId, options = {}) {
    var _a, _b;
    if (!userId)
        return 0;
    const now = (_a = options.now) !== null && _a !== void 0 ? _a : new Date();
    const since = (_b = options.since) !== null && _b !== void 0 ? _b : new Date(now.getTime() - exports.HASH_SUBMISSION_WINDOW_MS);
    const wallets = (await db_1.models.wallet.findAll({
        where: { userId, type: "SPOT" },
        attributes: ["id"],
    }));
    const walletIds = wallets.map((w) => String(w.id));
    if (!walletIds.length)
        return 0;
    return db_1.models.transaction.count({
        where: { walletId: walletIds, type: "DEPOSIT", createdAt: { [sequelize_1.Op.gte]: since } },
    });
}
async function assertHashSubmissionAllowed(userId) {
    const count = await countHashSubmissions(userId);
    if (count >= exports.MAX_HASH_SUBMISSIONS_PER_HOUR) {
        throw (0, error_1.createError)({
            statusCode: 429,
            message: `You have submitted ${count} transaction hashes in the last hour. Please wait before submitting another.`,
        });
    }
}
async function recordHashSubmission(intentId, txid, now = new Date()) {
    const row = await db_1.models.spotDepositIntent.findOne({ where: { id: intentId } });
    if (!row)
        return;
    const metadata = { ...parseIntentMetadata(row.metadata) };
    const list = Array.isArray(metadata.hashSubmissions) ? metadata.hashSubmissions : [];
    list.push({ txid: String(txid), at: now.toISOString() });
    metadata.hashSubmissions = list.slice(-20);
    await db_1.models.spotDepositIntent.update({ metadata }, { where: { id: intentId } });
}
