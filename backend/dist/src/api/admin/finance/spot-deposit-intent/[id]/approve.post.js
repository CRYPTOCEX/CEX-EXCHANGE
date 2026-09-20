"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
exports.resolveTarget = resolveTarget;
const db_1 = require("@b/db");
const error_1 = require("@b/utils/error");
const console_1 = require("@b/utils/console");
const query_1 = require("@b/utils/query");
const intents_1 = require("@b/utils/spot-deposit/intents");
const index_put_1 = __importDefault(require("@b/api/admin/finance/deposit/log/[id]/index.put"));
const utils_1 = require("../utils");
exports.metadata = {
    summary: "Approves a spot deposit intent and credits the customer",
    description: "Credits a REVIEW intent — or a pre-intent claim marked no_intent — through the admin deposit-log approval path: the same locked, idempotent credit, the same pool-backing obligation with the exchange's evidence, the same platform-fee booking and customer email. The note is quoted to the customer.",
    operationId: "approveSpotDepositIntent",
    tags: ["Admin", "Finance", "Spot Deposit Intents"],
    requiresAuth: true,
    permission: "edit.spot.deposit.intent",
    logModule: "ADMIN_FIN",
    logTitle: "Approve spot deposit intent",
    parameters: [
        {
            index: 0,
            name: "id",
            in: "path",
            required: true,
            schema: { type: "string" },
            description: "Intent id, or the id of a pre-intent SPOT claim row",
        },
    ],
    requestBody: {
        required: true,
        content: {
            "application/json": {
                schema: {
                    type: "object",
                    properties: {
                        amount: {
                            type: "number",
                            description: "The gross amount the exchange shows for this deposit. Required when the claim row still carries 0 — a pasted hash carries no figure.",
                        },
                        note: {
                            type: "string",
                            description: "Why this is being credited, at least 10 characters. Quoted to the customer in the status email.",
                        },
                    },
                    required: ["note"],
                },
            },
        },
    },
    responses: {
        200: { description: "Credited" },
        400: { description: "Not approvable, or no amount to credit" },
        401: query_1.unauthorizedResponse,
        404: (0, query_1.notFoundMetadataResponse)("Spot deposit intent"),
        409: { description: "The row changed while it was being approved" },
        500: query_1.serverErrorResponse,
    },
};
async function resolveTarget(id) {
    const intent = await db_1.models.spotDepositIntent.findOne({ where: { id } });
    if (intent) {
        if (String(intent.status) !== "REVIEW") {
            throw (0, error_1.createError)({
                statusCode: 400,
                message: `Only an intent in REVIEW can be approved; this one is ${intent.status}.`,
            });
        }
        const transaction = await findClaimRow(intent);
        if (!transaction) {
            throw (0, error_1.createError)({
                statusCode: 400,
                message: "This intent has no SPOT deposit row to credit: nothing was ever claimed on the exchange for it. " +
                    "Reject it, or (mode C) resweep it, rather than approving.",
            });
        }
        return { intent, transaction };
    }
    const row = await (0, utils_1.findPreIntentClaim)(id);
    if (!row)
        throw (0, error_1.createError)({ statusCode: 404, message: "Spot deposit intent not found" });
    return { intent: null, transaction: row };
}
async function findClaimRow(intent) {
    if (intent.spotTransactionId) {
        const byId = await db_1.models.transaction.findOne({ where: { id: String(intent.spotTransactionId), type: "DEPOSIT" } });
        if (byId)
            return byId;
    }
    if (intent.claimedTxid) {
        const byRef = await db_1.models.transaction.findOne({
            where: { referenceId: String(intent.claimedTxid), type: "DEPOSIT" },
        });
        if (byRef)
            return byRef;
    }
    return null;
}
exports.default = async (data) => {
    var _a, _b;
    const { user, params, body, ctx } = data;
    if (!(user === null || user === void 0 ? void 0 : user.id))
        throw (0, error_1.createError)({ statusCode: 401, message: "Unauthorized" });
    const id = String((params === null || params === void 0 ? void 0 : params.id) || "");
    const note = typeof (body === null || body === void 0 ? void 0 : body.note) === "string" ? body.note.trim() : "";
    if (note.length < 10) {
        throw (0, error_1.createError)({
            statusCode: 400,
            message: "A note of at least 10 characters is required: it is recorded on the deposit and quoted to the customer.",
        });
    }
    ctx === null || ctx === void 0 ? void 0 : ctx.step(`Resolving spot deposit intent ${id}`);
    const { intent, transaction } = await resolveTarget(id);
    if (String(transaction.status) === "COMPLETED") {
        if (!intent) {
            throw (0, error_1.createError)({ statusCode: 400, message: "This deposit has already been credited." });
        }
        ctx === null || ctx === void 0 ? void 0 : ctx.step("Claim row already credited; reconciling the intent");
        const reconciled = await (0, intents_1.markCredited)(String(intent.id), {
            spotTransactionId: String(transaction.id),
            metadata: { approvedBy: String(user.id), approvedAt: new Date().toISOString(), adminNote: note },
            broadcast: { message: "Your deposit has been credited" },
        });
        ctx === null || ctx === void 0 ? void 0 : ctx.success("Intent reconciled with an already-credited deposit");
        return {
            message: "The deposit was already credited; the intent has been reconciled. No new credit was made.",
            credited: false,
            reconciled: true,
            transactionId: String(transaction.id),
            intent: reconciled ? (0, intents_1.serialiseIntent)(reconciled) : null,
        };
    }
    const suppliedAmount = body === null || body === void 0 ? void 0 : body.amount;
    const hasSuppliedAmount = suppliedAmount !== undefined && suppliedAmount !== null && suppliedAmount !== "";
    const effectiveAmount = hasSuppliedAmount ? Number(suppliedAmount) : Number(transaction.amount);
    if (!Number.isFinite(effectiveAmount) || effectiveAmount <= 0) {
        throw (0, error_1.createError)({
            statusCode: 400,
            message: "This deposit carries no amount to credit. Send `amount` — the gross figure the exchange shows for this " +
                "deposit, which the intent screen displays under the exchange evidence.",
        });
    }
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Crediting through the deposit approval path");
    const result = await (0, index_put_1.default)({
        ...data,
        params: { ...(params !== null && params !== void 0 ? params : {}), id: String(transaction.id) },
        body: {
            status: "COMPLETED",
            ...(hasSuppliedAmount ? { amount: effectiveAmount } : {}),
            metadata: { message: note },
        },
    });
    let credited = null;
    if (intent) {
        ctx === null || ctx === void 0 ? void 0 : ctx.step("Closing the intent");
        credited = await (0, intents_1.markCredited)(String(intent.id), {
            spotTransactionId: String(transaction.id),
            metadata: {
                approvedBy: String(user.id),
                approvedAt: new Date().toISOString(),
                adminNote: note,
                approvedAmount: effectiveAmount,
                reviewResolved: (_a = (0, intents_1.parseIntentMetadata)(intent.metadata).review) !== null && _a !== void 0 ? _a : null,
            },
            broadcast: { message: "Your deposit has been credited" },
        });
        if (!credited) {
            console_1.logger.warn("SPOT_DEPOSIT", `Intent ${intent.id} left REVIEW while it was being approved; the credit stands`);
        }
    }
    ctx === null || ctx === void 0 ? void 0 : ctx.success("Spot deposit intent approved and credited");
    return {
        message: (_b = result === null || result === void 0 ? void 0 : result.message) !== null && _b !== void 0 ? _b : "Deposit credited",
        credited: true,
        reconciled: false,
        transactionId: String(transaction.id),
        intent: credited ? (0, intents_1.serialiseIntent)(credited) : null,
    };
};
