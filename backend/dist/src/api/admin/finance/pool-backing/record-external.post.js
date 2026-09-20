"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const db_1 = require("@b/db");
const error_1 = require("@b/utils/error");
const query_1 = require("@b/utils/query");
const ledger_1 = require("@b/utils/pool-backing/ledger");
exports.metadata = {
    summary: "Records a movement between the pools that the operator made outside the platform",
    description: "Creates a RECORDED settlement with the operator's proof and settles the currency's OPEN obligations of the matching direction, oldest first, up to the amount. eco_to_exchange closes positive obligations (the pool was short); exchange_to_eco closes negative ones.",
    operationId: "recordExternalPoolBackingSettlement",
    tags: ["Admin", "Finance", "Pool Backing"],
    requiresAuth: true,
    permission: "edit.pool.backing",
    logModule: "ADMIN_FIN",
    logTitle: "Record external pool-backing settlement",
    requestBody: {
        required: true,
        content: {
            "application/json": {
                schema: {
                    type: "object",
                    properties: {
                        currency: { type: "string" },
                        direction: { type: "string", enum: ["eco_to_exchange", "exchange_to_eco"] },
                        amount: { type: "number", description: "What arrived on the receiving side" },
                        chain: { type: "string", nullable: true },
                        proof: {
                            type: "object",
                            description: "txid, exchangeDepositId, exchangeWithdrawalId, reference, note — whatever proves the movement",
                        },
                    },
                    required: ["currency", "direction", "amount", "proof"],
                },
            },
        },
    },
    responses: {
        200: { description: "Recorded" },
        400: { description: "Invalid request" },
        401: query_1.unauthorizedResponse,
        500: query_1.serverErrorResponse,
    },
};
exports.default = async (data) => {
    const { user, body, ctx } = data;
    if (!(user === null || user === void 0 ? void 0 : user.id))
        throw (0, error_1.createError)({ statusCode: 401, message: "Unauthorized" });
    const currency = String((body === null || body === void 0 ? void 0 : body.currency) || "").trim().toUpperCase();
    const direction = String((body === null || body === void 0 ? void 0 : body.direction) || "");
    const amount = Number(body === null || body === void 0 ? void 0 : body.amount);
    const chain = (body === null || body === void 0 ? void 0 : body.chain) ? String(body.chain).trim() : null;
    const proof = (body === null || body === void 0 ? void 0 : body.proof) && typeof body.proof === "object" ? body.proof : null;
    if (!currency)
        throw (0, error_1.createError)({ statusCode: 400, message: "currency is required" });
    if (direction !== "eco_to_exchange" && direction !== "exchange_to_eco") {
        throw (0, error_1.createError)({ statusCode: 400, message: "direction must be eco_to_exchange or exchange_to_eco" });
    }
    if (!Number.isFinite(amount) || amount <= 0)
        throw (0, error_1.createError)({ statusCode: 400, message: "amount must be a positive number" });
    if (!proof || !Object.values(proof).some((v) => typeof v === "string" && v.trim())) {
        throw (0, error_1.createError)({ statusCode: 400, message: "proof must carry at least one reference (txid, exchange id, bank reference or note)" });
    }
    ctx === null || ctx === void 0 ? void 0 : ctx.step(`Recording external ${direction} of ${amount} ${currency}`);
    const result = await db_1.sequelize.transaction(async (t) => {
        var _a;
        await (0, ledger_1.withCurrencyAnchor)(currency, t);
        const settlement = await db_1.models.poolBackingSettlement.create({
            currency,
            direction: "external",
            chain,
            network: null,
            amountRequested: amount,
            amountSent: amount,
            amountReceived: amount,
            status: "RECORDED",
            activeKey: null,
            proof: { ...proof, declaredDirection: direction, recordedAt: new Date().toISOString() },
            fees: null,
            initiatedBy: user.id,
            note: typeof proof.note === "string" ? proof.note : null,
        }, { transaction: t });
        const sign = direction === "eco_to_exchange" ? 1 : -1;
        const candidates = (await db_1.models.poolBackingObligation.findAll({
            where: { currency, status: "OPEN", side: ["both", "exchange"] },
            order: [["createdAt", "ASC"]],
            transaction: t,
            lock: t.LOCK.UPDATE,
        }));
        let remaining = amount;
        const settled = [];
        for (const row of candidates) {
            if (remaining <= 1e-12)
                break;
            const rowAmount = Number(row.amount) || 0;
            if (Math.sign(rowAmount) !== sign)
                continue;
            const magnitude = Math.abs(rowAmount);
            if (magnitude <= remaining + 1e-12) {
                await row.update({ status: "SETTLED", settlementId: settlement.id, settledAt: new Date() }, { transaction: t });
                settled.push({ id: row.id, amount: rowAmount, split: false });
                remaining -= magnitude;
            }
            else {
                const covered = sign * remaining;
                const child = await db_1.models.poolBackingObligation.create({
                    currency: row.currency,
                    side: row.side,
                    chain: row.chain,
                    amount: covered,
                    source: row.source,
                    status: "SETTLED",
                    nettable: row.nettable,
                    sourceRef: `${(_a = row.sourceRef) !== null && _a !== void 0 ? _a : row.id}#${settlement.id}`,
                    legs: { ...(row.legs || {}), splitFrom: row.id },
                    evidence: row.evidence,
                    settlementId: settlement.id,
                    createdBy: row.createdBy,
                    settledAt: new Date(),
                }, { transaction: t });
                await row.update({ amount: rowAmount - covered }, { transaction: t });
                settled.push({ id: child.id, amount: covered, split: true });
                remaining = 0;
            }
        }
        return { settlementId: settlement.id, settled, unapplied: remaining };
    });
    ctx === null || ctx === void 0 ? void 0 : ctx.success(`External settlement ${result.settlementId} recorded: ${result.settled.length} obligation(s) settled`);
    return {
        message: result.unapplied > 1e-12
            ? `Recorded. ${result.settled.length} obligation(s) settled; ${result.unapplied.toFixed(8)} ${currency} exceeded the open obligations of that direction and is recorded on the settlement only.`
            : `Recorded. ${result.settled.length} obligation(s) settled.`,
        ...result,
    };
};
