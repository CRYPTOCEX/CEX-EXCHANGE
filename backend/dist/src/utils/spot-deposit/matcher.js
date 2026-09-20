"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MAX_POLL_LOOKBACK_MS = exports.DEFAULT_AMOUNT_TOLERANCE = void 0;
exports.toleranceFor = toleranceFor;
exports.decimalToNumber = decimalToNumber;
exports.amountMatchesExpected = amountMatchesExpected;
exports.timestampWithinIntentWindow = timestampWithinIntentWindow;
exports.networkMatchesIntent = networkMatchesIntent;
exports.referenceForDeposit = referenceForDeposit;
exports.gateDepositAgainstIntent = gateDepositAgainstIntent;
exports.applyIntentHold = applyIntentHold;
exports.notifyUnderReview = notifyUnderReview;
exports.resetMatcherState = resetMatcherState;
exports.pollDepositsOnce = pollDepositsOnce;
exports.openAmountMatchIntents = openAmountMatchIntents;
exports.matchOpenIntents = matchOpenIntents;
exports.matchAllOpenIntents = matchAllOpenIntents;
const sequelize_1 = require("sequelize");
const db_1 = require("@b/db");
const console_1 = require("@b/utils/console");
const evidence_1 = require("@b/utils/pool-backing/evidence");
const intents_1 = require("./intents");
const networks_1 = require("./networks");
exports.DEFAULT_AMOUNT_TOLERANCE = 1e-8;
exports.MAX_POLL_LOOKBACK_MS = 24 * 60 * 60 * 1000;
function toleranceFor(decimals) {
    const raw = Number(decimals);
    const places = Number.isFinite(raw) ? Math.max(0, Math.min(18, Math.floor(raw))) : 8;
    const step = Math.pow(10, -places);
    return Math.min(exports.DEFAULT_AMOUNT_TOLERANCE, step / 2);
}
function decimalToNumber(raw) {
    if (raw === null || raw === undefined || raw === "")
        return null;
    const n = Number(raw);
    return Number.isFinite(n) ? n : null;
}
function amountMatchesExpected(expected, deposit, tolerance) {
    var _a;
    const amount = Number(deposit === null || deposit === void 0 ? void 0 : deposit.amount);
    if (!Number.isFinite(amount))
        return false;
    if (Math.abs(amount - expected) <= tolerance)
        return true;
    const fee = Number((_a = deposit === null || deposit === void 0 ? void 0 : deposit.fee) === null || _a === void 0 ? void 0 : _a.cost);
    if (Number.isFinite(fee) && fee > 0 && Math.abs(amount + fee - expected) <= tolerance)
        return true;
    return false;
}
function timestampWithinIntentWindow(depositTimestampMs, intentCreatedAt) {
    const at = Number(depositTimestampMs);
    if (!Number.isFinite(at) || at <= 0)
        return { known: false, ok: true };
    const created = new Date(intentCreatedAt).getTime();
    if (!Number.isFinite(created))
        return { known: true, ok: true };
    const ok = at >= created - intents_1.INTENT_CLOCK_SLACK_MS && at <= created + intents_1.INTENT_MATCH_WINDOW_MS;
    return { known: true, ok };
}
function networkMatchesIntent(depositNetwork, intent) {
    const reported = (0, networks_1.normaliseNetwork)(typeof depositNetwork === "string" ? depositNetwork : "");
    if (!reported)
        return true;
    const metadata = (0, intents_1.parseIntentMetadata)(intent.metadata);
    const spellings = new Set();
    for (const candidate of [intent.network, metadata.exchangeNetworkId, metadata.exchangeNetworkName]) {
        for (const alias of (0, intents_1.networkAliases)(typeof candidate === "string" ? candidate : ""))
            spellings.add(alias);
    }
    if (!spellings.size)
        return true;
    return spellings.has(reported);
}
function referenceForDeposit(txid) {
    const raw = String(txid !== null && txid !== void 0 ? txid : "").trim();
    if (!raw)
        return null;
    return (0, evidence_1.parseOffChainTxid)(raw) || raw;
}
function referenceSpellings(txid) {
    const raw = String(txid !== null && txid !== void 0 ? txid : "").trim();
    if (!raw)
        return [];
    return Array.from(new Set([raw, (0, evidence_1.parseOffChainTxid)(raw)].filter(Boolean)));
}
async function gateDepositAgainstIntent(params) {
    var _a, _b, _c, _d, _e, _f, _g;
    const metadata = (_a = params.metadata) !== null && _a !== void 0 ? _a : {};
    const deposit = (_b = params.deposit) !== null && _b !== void 0 ? _b : {};
    const intentId = metadata.spotDepositIntentId ? String(metadata.spotDepositIntentId) : null;
    const alreadyReviewed = String((_c = metadata.review) !== null && _c !== void 0 ? _c : "");
    if (alreadyReviewed === "no_intent") {
        return {
            action: "hold",
            intentId,
            review: "no_intent_confirmed",
            message: "This deposit was submitted without a deposit request, so it is being reviewed by our team before it is credited.",
        };
    }
    if (alreadyReviewed) {
        return { action: "hold", intentId, review: alreadyReviewed, message: "" };
    }
    if (!intentId)
        return { action: "credit", intentId: null };
    let intent = null;
    try {
        intent = await db_1.models.spotDepositIntent.findOne({ where: { id: intentId } });
    }
    catch (error) {
        console_1.logger.error("SPOT_DEPOSIT", `Intent ${intentId} could not be read; not crediting: ${(error === null || error === void 0 ? void 0 : error.message) || error}`);
        return { action: "hold", intentId, review: "intent_missing", message: "Your deposit is being reviewed by our team." };
    }
    if (!intent) {
        return {
            action: "hold",
            intentId,
            review: "intent_missing",
            message: "The deposit request this transaction was submitted against no longer exists, so it is being reviewed.",
        };
    }
    const status = String(intent.status);
    if (status === "CREDITED")
        return { action: "credit", intentId };
    if (status === "REVIEW") {
        return { action: "hold", intentId, review: (_d = metadata.review) !== null && _d !== void 0 ? _d : "intent_not_open", message: "" };
    }
    if (status === "EXPIRED" || status === "CANCELLED" || status === "FAILED") {
        return {
            action: "hold",
            intentId,
            review: "intent_not_open",
            message: `This deposit arrived after its deposit request ${status === "CANCELLED" ? "was cancelled" : "expired"}, so it is being reviewed by our team.`,
        };
    }
    if (String(intent.mode) === "ecosystem_custody") {
        const custodyMeta = (0, intents_1.parseIntentMetadata)(intent.metadata);
        const swept = decimalToNumber(custodyMeta.sweepAmount);
        const listed = Number(deposit.amount);
        if (swept !== null && swept > 0 && Number.isFinite(listed)) {
            const slack = Math.max(toleranceFor(custodyMeta.networkDecimals), Math.abs(swept) * 1e-9);
            if (listed - swept > slack) {
                return {
                    action: "hold",
                    intentId,
                    review: "amount_mismatch",
                    message: `The exchange shows ${listed} ${(_e = intent.currency) !== null && _e !== void 0 ? _e : ""} under this transfer's hash but only ${swept} was sent for this deposit, so it is being reviewed by our team.`.replace(/\s+/g, " ").trim(),
                };
            }
        }
        return { action: "credit", intentId };
    }
    const window = timestampWithinIntentWindow(deposit.timestamp, (_f = intent.createdAt) !== null && _f !== void 0 ? _f : new Date(0));
    if (window.known && !window.ok) {
        return {
            action: "hold",
            intentId,
            review: "deposit_predates_intent",
            message: "This transaction was made before the deposit request it was submitted against, so it is being reviewed by our team.",
        };
    }
    const intentMetadata = (0, intents_1.parseIntentMetadata)(intent.metadata);
    const declared = decimalToNumber(intent.declaredAmount);
    const expected = decimalToNumber(intent.expectedAmount);
    if (declared !== null || expected !== null) {
        const tolerance = toleranceFor((_g = intentMetadata.nudgeDecimals) !== null && _g !== void 0 ? _g : intentMetadata.networkDecimals);
        const matched = [declared, expected].some((candidate) => candidate !== null && amountMatchesExpected(candidate, deposit, tolerance));
        if (!matched) {
            const reference = declared !== null && declared !== void 0 ? declared : expected;
            return {
                action: "hold",
                intentId,
                review: "amount_mismatch",
                message: `The amount that arrived (${deposit.amount}) does not match the ${reference} you declared, so your deposit is being reviewed by our team.`,
            };
        }
    }
    return { action: "credit", intentId };
}
async function applyIntentHold(params) {
    var _a;
    var _b, _c, _d, _e, _f;
    const { transactionId, outcome } = params;
    const review = (_b = outcome.review) !== null && _b !== void 0 ? _b : "intent_missing";
    const metadata = { ...((_c = params.metadata) !== null && _c !== void 0 ? _c : {}) };
    if (String((_d = metadata.review) !== null && _d !== void 0 ? _d : "") === review)
        return false;
    metadata.review = review;
    if (outcome.message)
        metadata.reviewMessage = outcome.message;
    metadata.reviewAt = new Date().toISOString();
    if (params.deposit) {
        metadata.exchangeAmount = (_e = params.deposit.amount) !== null && _e !== void 0 ? _e : null;
        metadata.exchangeTimestamp = (_f = params.deposit.timestamp) !== null && _f !== void 0 ? _f : null;
    }
    const [updated] = await db_1.models.transaction.update({ metadata: JSON.stringify(metadata) }, { where: { id: transactionId, status: "PENDING" } });
    if (!updated) {
        console_1.logger.debug("SPOT_DEPOSIT", `Deposit ${transactionId} left PENDING before the review marker could be written`);
        return false;
    }
    if (outcome.intentId) {
        try {
            await (0, intents_1.markReview)(outcome.intentId, {
                reason: review,
                spotTransactionId: transactionId,
                matchedDepositId: ((_a = params.deposit) === null || _a === void 0 ? void 0 : _a.id) != null ? String(params.deposit.id) : undefined,
                broadcast: { message: outcome.message },
            });
        }
        catch (error) {
            console_1.logger.error("SPOT_DEPOSIT", `Intent ${outcome.intentId} could not be moved to REVIEW: ${(error === null || error === void 0 ? void 0 : error.message) || error}`);
        }
    }
    await notifyUnderReview({
        userId: params.userId,
        transactionId,
        message: outcome.message,
        currency: params.currency,
    });
    console_1.logger.warn("SPOT_DEPOSIT", `Deposit ${transactionId} held for review (${review})`);
    return true;
}
async function notifyUnderReview(params) {
    var _a;
    if (!params.userId)
        return;
    const transactionId = params.transactionId ? String(params.transactionId) : null;
    const link = transactionId ? `/finance/wallet/deposit/${transactionId}` : "/finance/wallet";
    try {
        const { createNotification } = require("@b/utils/notifications");
        await createNotification({
            userId: params.userId,
            relatedId: transactionId !== null && transactionId !== void 0 ? transactionId : undefined,
            type: "system",
            title: "Deposit under review",
            message: params.message ||
                `Your ${(_a = params.currency) !== null && _a !== void 0 ? _a : ""} deposit is being reviewed by our team and will be credited once it is confirmed.`.replace(/\s+/g, " ").trim(),
            link,
            actions: [{ label: "View Deposit", link, primary: true }],
        });
    }
    catch (error) {
        console_1.logger.error("SPOT_DEPOSIT", `Under-review notification failed for ${transactionId !== null && transactionId !== void 0 ? transactionId : "an intent"}: ${(error === null || error === void 0 ? void 0 : error.message) || error}`);
    }
}
const inFlightPolls = new Map();
function resetMatcherState() {
    inFlightPolls.clear();
}
async function pollDepositsOnce(currency, loader) {
    const key = (0, intents_1.normaliseCurrency)(currency);
    const running = inFlightPolls.get(key);
    if (running)
        return running;
    const poll = (async () => {
        var _a;
        try {
            return (_a = (await loader())) !== null && _a !== void 0 ? _a : [];
        }
        finally {
            inFlightPolls.delete(key);
        }
    })();
    inFlightPolls.set(key, poll);
    return poll;
}
function emptyOutcome(currency, skipped) {
    return { currency, intents: 0, deposits: 0, matched: 0, credited: 0, review: 0, skipped };
}
async function openAmountMatchIntents(currency, now = new Date()) {
    return db_1.models.spotDepositIntent.findAll({
        where: {
            currency: (0, intents_1.normaliseCurrency)(currency),
            mode: "amount_match",
            status: ["OPEN", "EXPIRED"],
            createdAt: { [sequelize_1.Op.gte]: new Date(now.getTime() - intents_1.INTENT_MATCH_WINDOW_MS) },
        },
        order: [["createdAt", "ASC"]],
    });
}
async function matchOpenIntents(options) {
    var _a;
    var _b, _c, _d, _e, _f, _g, _h;
    const currency = (0, intents_1.normaliseCurrency)(options.currency);
    if (!currency)
        return emptyOutcome(currency, "no currency");
    const now = (_b = options.now) !== null && _b !== void 0 ? _b : new Date();
    let intents = [];
    try {
        intents = await openAmountMatchIntents(currency, now);
    }
    catch (error) {
        console_1.logger.error("SPOT_DEPOSIT", `Could not read open ${currency} intents: ${(error === null || error === void 0 ? void 0 : error.message) || error}`);
        return emptyOutcome(currency, "intents unreadable");
    }
    if (!intents.length)
        return emptyOutcome(currency, "no open intents");
    const exchange = (_c = options.exchange) !== null && _c !== void 0 ? _c : (await startExchangeLazily());
    if (!exchange)
        return { ...emptyOutcome(currency, "exchange unavailable"), intents: intents.length };
    if (!((_a = exchange.has) === null || _a === void 0 ? void 0 : _a["fetchDeposits"])) {
        return { ...emptyOutcome(currency, "exchange cannot list deposits"), intents: intents.length };
    }
    const oldest = intents.reduce((min, row) => {
        var _a;
        const at = new Date((_a = row.createdAt) !== null && _a !== void 0 ? _a : now.getTime()).getTime();
        return Number.isFinite(at) ? Math.min(min, at) : min;
    }, now.getTime());
    const since = options.since === null || options.since === undefined
        ? Math.max(oldest - intents_1.INTENT_CLOCK_SLACK_MS, now.getTime() - exports.MAX_POLL_LOOKBACK_MS)
        : options.since instanceof Date
            ? options.since.getTime()
            : Number(options.since);
    let deposits = [];
    try {
        deposits = await pollDepositsOnce(currency, async () => { var _a; return (_a = (await exchange.fetchDeposits(currency, since))) !== null && _a !== void 0 ? _a : []; });
    }
    catch (error) {
        console_1.logger.error("SPOT_DEPOSIT", `fetchDeposits(${currency}) failed during matching: ${(error === null || error === void 0 ? void 0 : error.message) || error}`);
        return { ...emptyOutcome(currency, "fetch failed"), intents: intents.length };
    }
    const outcome = {
        currency,
        intents: intents.length,
        deposits: deposits.length,
        matched: 0,
        credited: 0,
        review: 0,
    };
    const acceptedBy = new Map();
    const acceptable = new Map();
    for (const intent of intents) {
        const expected = decimalToNumber(intent.expectedAmount);
        if (expected === null)
            continue;
        const metadata = (0, intents_1.parseIntentMetadata)(intent.metadata);
        const tolerance = toleranceFor((_d = metadata.nudgeDecimals) !== null && _d !== void 0 ? _d : metadata.networkDecimals);
        const accepted = deposits.filter((deposit) => {
            var _a;
            if (!deposit || String(deposit.status) !== "ok")
                return false;
            if (!referenceForDeposit(deposit.txid))
                return false;
            if (!networkMatchesIntent(deposit.network, intent))
                return false;
            if (!timestampWithinIntentWindow(deposit.timestamp, (_a = intent.createdAt) !== null && _a !== void 0 ? _a : new Date(0)).ok)
                return false;
            return amountMatchesExpected(expected, deposit, tolerance);
        });
        acceptable.set(String(intent.id), accepted);
        for (const deposit of accepted) {
            const reference = referenceForDeposit(deposit.txid);
            const list = (_e = acceptedBy.get(reference)) !== null && _e !== void 0 ? _e : [];
            list.push(intent);
            acceptedBy.set(reference, list);
        }
    }
    const taken = new Set();
    const reviewed = new Set();
    for (const intent of intents) {
        const expected = decimalToNumber(intent.expectedAmount);
        if (expected === null)
            continue;
        const candidates = ((_f = acceptable.get(String(intent.id))) !== null && _f !== void 0 ? _f : []).filter((deposit) => {
            const reference = referenceForDeposit(deposit.txid);
            return !!reference && !taken.has(reference);
        });
        if (!candidates.length)
            continue;
        if (candidates.length > 1) {
            taken.add(referenceForDeposit(candidates[0].txid));
            outcome.review += 1;
            reviewed.add(String(intent.id));
            await reviewIntent(intent, "ambiguous_match", `Two deposits of ${expected} ${currency} arrived; a human must decide which is yours.`);
            continue;
        }
        const deposit = candidates[0];
        const reference = referenceForDeposit(deposit.txid);
        const rivals = ((_g = acceptedBy.get(reference)) !== null && _g !== void 0 ? _g : []).filter((other) => String(other.id) !== String(intent.id));
        if (rivals.length) {
            taken.add(reference);
            const named = [intent, ...rivals];
            const message = `A deposit of ${deposit.amount} ${currency} matches more than one waiting request, so a human is deciding whose it is.`;
            for (const row of named) {
                if (reviewed.has(String(row.id)))
                    continue;
                reviewed.add(String(row.id));
                outcome.review += 1;
                await reviewIntent(row, "ambiguous_match", message, {
                    txid: reference,
                    competingIntentIds: named.filter((r) => String(r.id) !== String(row.id)).map((r) => String(r.id)),
                });
            }
            console_1.logger.warn("SPOT_DEPOSIT", `Deposit ${reference} matches ${named.length} ${currency} intents (${named.map((r) => r.id).join(", ")}); none credited`);
            continue;
        }
        taken.add(reference);
        try {
            const result = await settleMatchedDeposit({ intent, deposit, reference, currency, exchange, provider: (_h = options.provider) !== null && _h !== void 0 ? _h : null });
            outcome.matched += 1;
            if (result === "credited")
                outcome.credited += 1;
            if (result === "review")
                outcome.review += 1;
        }
        catch (error) {
            console_1.logger.error("SPOT_DEPOSIT", `Matching ${reference} to intent ${intent.id} failed: ${(error === null || error === void 0 ? void 0 : error.message) || error}`);
        }
    }
    if (outcome.matched || outcome.review) {
        console_1.logger.info("SPOT_DEPOSIT", `${currency}: ${outcome.matched} of ${outcome.intents} waiting deposit(s) matched, ${outcome.credited} credited, ${outcome.review} in review`);
    }
    return outcome;
}
async function matchAllOpenIntents(now = new Date()) {
    let rows = [];
    try {
        rows = (await db_1.models.spotDepositIntent.findAll({
            where: {
                mode: "amount_match",
                status: ["OPEN", "EXPIRED"],
                createdAt: { [sequelize_1.Op.gte]: new Date(now.getTime() - intents_1.INTENT_MATCH_WINDOW_MS) },
            },
            attributes: ["id", "currency"],
        }));
    }
    catch (error) {
        console_1.logger.error("SPOT_DEPOSIT", `Could not list currencies with open intents: ${(error === null || error === void 0 ? void 0 : error.message) || error}`);
        return [];
    }
    const currencies = Array.from(new Set(rows.map((r) => (0, intents_1.normaliseCurrency)(r.currency)).filter(Boolean)));
    const outcomes = [];
    for (const currency of currencies) {
        try {
            outcomes.push(await matchOpenIntents({ currency, now }));
        }
        catch (error) {
            console_1.logger.error("SPOT_DEPOSIT", `Matching ${currency} failed: ${(error === null || error === void 0 ? void 0 : error.message) || error}`);
        }
    }
    return outcomes;
}
async function startExchangeLazily() {
    try {
        const ExchangeManager = require("@b/utils/exchange").default;
        return await ExchangeManager.startExchange();
    }
    catch (error) {
        console_1.logger.error("SPOT_DEPOSIT", `Exchange unavailable for matching: ${(error === null || error === void 0 ? void 0 : error.message) || error}`);
        return null;
    }
}
async function reviewIntent(intent, reason, message, patch = {}) {
    var _a;
    try {
        await (0, intents_1.markReview)(String(intent.id), { reason, metadata: patch, broadcast: { message } });
    }
    catch (error) {
        console_1.logger.error("SPOT_DEPOSIT", `Intent ${intent === null || intent === void 0 ? void 0 : intent.id} could not be moved to REVIEW: ${(error === null || error === void 0 ? void 0 : error.message) || error}`);
    }
    await notifyUnderReview({
        userId: (intent === null || intent === void 0 ? void 0 : intent.userId) ? String(intent.userId) : null,
        transactionId: (intent === null || intent === void 0 ? void 0 : intent.spotTransactionId) ? String(intent.spotTransactionId) : null,
        message,
        currency: String((_a = intent === null || intent === void 0 ? void 0 : intent.currency) !== null && _a !== void 0 ? _a : ""),
    });
}
async function settleMatchedDeposit(params) {
    var _a, _b, _c;
    var _d, _e, _f, _g, _h, _j;
    const { intent, deposit, reference, currency, exchange } = params;
    const userId = String(intent.userId);
    const existing = await db_1.models.transaction.findOne({ where: { referenceId: referenceSpellings(reference) } });
    if (existing) {
        const sameOwner = String(existing.userId) === userId;
        if (!sameOwner) {
            await reviewIntent(intent, "txid_already_claimed", "The deposit that matched your request was already claimed by another transaction; a human is checking it.", { claimedBy: String(existing.id), txid: reference });
            return "review";
        }
        console_1.logger.debug("SPOT_DEPOSIT", `Deposit ${reference} already has row ${existing.id} for the same customer`);
        return "skipped";
    }
    const { refuseIfSettlement } = require("@b/utils/pool-backing/guard");
    const refusal = await refuseIfSettlement({
        txid: String((_d = deposit.txid) !== null && _d !== void 0 ? _d : reference),
        addressFrom: (_e = deposit.addressFrom) !== null && _e !== void 0 ? _e : null,
        claimantUserId: userId,
    });
    if (refusal) {
        await reviewIntent(intent, "settlement_guard", refusal, { txid: reference });
        return "review";
    }
    const walletId = await resolveSpotWalletId(intent, currency);
    if (!walletId) {
        await reviewIntent(intent, "wallet_missing", "Your Spot wallet could not be opened for this deposit; a human is checking it.");
        return "review";
    }
    const amount = Number(deposit.amount) || 0;
    const rawFee = Number((_a = deposit.fee) === null || _a === void 0 ? void 0 : _a.cost) || 0;
    const fee = Math.min(Math.max(rawFee, 0), amount);
    if (!(amount > 0) || !(amount - fee > 0)) {
        await reviewIntent(intent, "nets_nothing", `The deposit of ${amount} ${currency} nets nothing after the ${rawFee} fee the exchange charged.`, { txid: reference });
        return "review";
    }
    const metadata = {
        currency,
        chain: String((_f = intent.network) !== null && _f !== void 0 ? _f : ""),
        trx: reference,
        spotDepositIntentId: String(intent.id),
        matchedBy: "amount_match",
        expectedAmount: intent.expectedAmount != null ? String(intent.expectedAmount) : null,
    };
    let row;
    try {
        row = await db_1.models.transaction.create({
            userId,
            walletId,
            type: "DEPOSIT",
            amount: 0,
            status: "PENDING",
            description: `${currency} deposit matched by amount`,
            metadata: JSON.stringify(metadata),
            referenceId: reference,
        });
    }
    catch (error) {
        const duplicate = (error === null || error === void 0 ? void 0 : error.name) === "SequelizeUniqueConstraintError" ||
            ((_b = error === null || error === void 0 ? void 0 : error.parent) === null || _b === void 0 ? void 0 : _b.code) === "ER_DUP_ENTRY" ||
            ((_c = error === null || error === void 0 ? void 0 : error.original) === null || _c === void 0 ? void 0 : _c.code) === "ER_DUP_ENTRY";
        if (!duplicate)
            throw error;
        await reviewIntent(intent, "txid_already_claimed", "The deposit that matched your request was already claimed by another transaction; a human is checking it.", { txid: reference });
        return "review";
    }
    const transactionId = String(row.id);
    await (0, intents_1.markMatched)(String(intent.id), {
        claimedTxid: reference,
        matchedDepositId: deposit.id != null ? String(deposit.id) : reference,
        spotTransactionId: transactionId,
        metadata: { matchedAmount: amount, matchedFee: fee, matchedAt: new Date().toISOString() },
        broadcast: { message: `We found your deposit of ${amount} ${currency}` },
    });
    const { creditSpotDepositRow } = require("@b/api/finance/deposit/spot/index.ws");
    const credit = await creditSpotDepositRow({
        transactionId,
        userId,
        currency,
        amount,
        fee,
        chain: String((_g = intent.network) !== null && _g !== void 0 ? _g : ""),
        exchange,
        provider: params.provider,
        depositAmount: Number(deposit.amount) || amount,
    });
    if (!credit.credited) {
        console_1.logger.warn("SPOT_DEPOSIT", `Matched deposit ${reference} was not credited (row ${(_h = credit.lockedStatus) !== null && _h !== void 0 ? _h : "unknown"})`);
        return "skipped";
    }
    await (0, intents_1.markCredited)(String(intent.id), {
        spotTransactionId: transactionId,
        broadcast: { message: `Your deposit of ${amount} ${currency} has been credited`, transaction: (_j = credit.transaction) !== null && _j !== void 0 ? _j : undefined },
    });
    return "credited";
}
async function resolveSpotWalletId(intent, currency) {
    var _a;
    if (intent.walletId)
        return String(intent.walletId);
    try {
        const { walletCreationService } = require("@b/services/wallet");
        const created = await walletCreationService.getOrCreateWallet(String(intent.userId), "SPOT", currency);
        return ((_a = created === null || created === void 0 ? void 0 : created.wallet) === null || _a === void 0 ? void 0 : _a.id) ? String(created.wallet.id) : null;
    }
    catch (error) {
        console_1.logger.error("SPOT_DEPOSIT", `Could not open a SPOT wallet for ${intent === null || intent === void 0 ? void 0 : intent.userId}: ${(error === null || error === void 0 ? void 0 : error.message) || error}`);
        return null;
    }
}
