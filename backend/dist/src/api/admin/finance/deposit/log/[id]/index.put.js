"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const ledger_1 = require("@b/utils/pool-backing/ledger");
const evidence_1 = require("@b/utils/pool-backing/evidence");
const query_1 = require("@b/utils/query");
const db_1 = require("@b/db");
const utils_1 = require("../utils");
const emails_1 = require("@b/utils/emails");
const wallet_1 = require("@b/services/wallet");
const fees_1 = require("@b/utils/fees");
const error_1 = require("@b/utils/error");
const utils_2 = require("@b/api/finance/utils");
exports.metadata = {
    summary: "Updates an existing deposit transaction",
    operationId: "updateDepositTransaction",
    tags: ["Admin", "Finance", "Deposits"],
    parameters: [
        {
            index: 0,
            name: "id",
            in: "path",
            description: "The ID of the deposit transaction to update",
            required: true,
            schema: {
                type: "string",
            },
        },
    ],
    requestBody: {
        required: true,
        description: "Updated data for the deposit transaction",
        content: {
            "application/json": {
                schema: utils_1.depositUpdateSchema,
            },
        },
    },
    responses: (0, query_1.updateRecordResponses)("Deposit Transaction"),
    requiresAuth: true,
    permission: "edit.deposit",
    logModule: "ADMIN_FIN",
    logTitle: "Update deposit transaction",
};
exports.default = async (data) => {
    const { body, params, ctx, user: actor } = data;
    const { id } = params;
    const { status, amount, fee, description, referenceId, metadata: requestMetadata, } = body;
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Fetching deposit transaction");
    const transaction = await db_1.models.transaction.findOne({
        where: { id, type: "DEPOSIT" },
    });
    if (!transaction)
        throw (0, error_1.createError)({ statusCode: 404, message: "Transaction not found" });
    if (transaction.status !== "PENDING") {
        throw (0, error_1.createError)({ statusCode: 400, message: "Only pending transactions can be updated" });
    }
    if (amount !== undefined && amount !== null && amount !== "") {
        const parsedAmount = Number(amount);
        if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
            throw (0, error_1.createError)({
                statusCode: 400,
                message: "Invalid amount: must be a positive finite number",
            });
        }
        transaction.amount = parsedAmount;
    }
    if (fee !== undefined && fee !== null && fee !== "") {
        const parsedFee = Number(fee);
        if (!Number.isFinite(parsedFee) || parsedFee < 0) {
            throw (0, error_1.createError)({
                statusCode: 400,
                message: "Invalid fee: must be zero or a positive finite number",
            });
        }
        transaction.fee = parsedFee;
    }
    if (description !== undefined) {
        transaction.description = description;
    }
    if (referenceId !== undefined) {
        transaction.referenceId = referenceId;
    }
    const backingEvidence = status === "COMPLETED" ? await gatherApprovalEvidence(transaction) : null;
    return await db_1.sequelize.transaction(async (t) => {
        var _a, _b;
        const metadata = parseMetadata(transaction.metadata);
        ctx === null || ctx === void 0 ? void 0 : ctx.step("Fetching wallet");
        const wallet = await db_1.models.wallet.findOne({
            where: { id: transaction.walletId },
            transaction: t,
        });
        if (!wallet)
            throw (0, error_1.createError)({ statusCode: 404, message: "Wallet not found" });
        if (requestMetadata) {
            metadata.message = requestMetadata.message;
        }
        if (transaction.status === "PENDING") {
            if (status === "REJECTED") {
                ctx === null || ctx === void 0 ? void 0 : ctx.step("Processing transaction rejection");
                await handleWalletRejection(wallet, t);
            }
            else if (status === "COMPLETED") {
                ctx === null || ctx === void 0 ? void 0 : ctx.step("Processing transaction completion");
                await handleWalletCompletion(transaction, wallet, t, backingEvidence, (_a = actor === null || actor === void 0 ? void 0 : actor.id) !== null && _a !== void 0 ? _a : null);
            }
            const settledWallet = await db_1.models.wallet.findOne({
                where: { id: wallet.id },
                transaction: t,
            });
            const newBalance = Number((_b = settledWallet === null || settledWallet === void 0 ? void 0 : settledWallet.balance) !== null && _b !== void 0 ? _b : wallet.balance) || 0;
            ctx === null || ctx === void 0 ? void 0 : ctx.step("Sending status update email");
            const user = await db_1.models.user.findOne({
                where: { id: transaction.userId },
            });
            if (user) {
                await (0, emails_1.sendTransactionStatusUpdateEmail)(user, { ...(transaction.get ? transaction.get({ plain: true }) : transaction), status }, wallet, Number(newBalance.toFixed(8)), metadata.message || null);
            }
        }
        const nextMetadata = JSON.stringify(metadata);
        ctx === null || ctx === void 0 ? void 0 : ctx.step("Saving transaction");
        const [claimed] = await db_1.models.transaction.update({
            status,
            metadata: nextMetadata,
            amount: transaction.amount,
            fee: transaction.fee,
            description: transaction.description,
            referenceId: transaction.referenceId,
        }, { where: { id: transaction.id, status: "PENDING" }, transaction: t });
        if (claimed === 0) {
            throw (0, error_1.createError)({
                statusCode: 409,
                message: "This deposit was approved, rejected or claimed by another request while you were editing it. Nothing was changed — reload and check its current status.",
            });
        }
        ctx === null || ctx === void 0 ? void 0 : ctx.success("Deposit transaction updated successfully");
        return { message: "Transaction updated successfully" };
    });
};
function parseMetadata(metadataString) {
    return (0, utils_2.parseTransactionMetadata)(metadataString);
}
async function handleWalletRejection(_wallet, _t) {
}
async function gatherApprovalEvidence(transaction) {
    const wallet = await db_1.models.wallet.findOne({
        where: { id: transaction.walletId },
        attributes: ["id", "type", "currency"],
    });
    if (!wallet)
        return null;
    if (wallet.type === "SPOT") {
        return (0, evidence_1.gatherSpotDepositEvidence)({ currency: wallet.currency, referenceId: transaction.referenceId });
    }
    if (wallet.type === "ECO") {
        return {
            backed: false,
            reason: "an ECO deposit approved by hand carries no on-chain proof",
            checkedAt: new Date().toISOString(),
        };
    }
    return null;
}
async function handleWalletCompletion(transaction, wallet, t, backingEvidence = null, actorId = null) {
    const grossAmount = Number(transaction.amount);
    const feeAmount = Number(transaction.fee) || 0;
    if (!Number.isFinite(grossAmount) || grossAmount <= 0) {
        throw (0, error_1.createError)({
            statusCode: 400,
            message: `Cannot approve: deposit amount is invalid (${transaction.amount}).`,
        });
    }
    const depositAmount = grossAmount - feeAmount;
    if (depositAmount <= 0) {
        throw (0, error_1.createError)({
            statusCode: 400,
            message: `Cannot approve: the fee (${feeAmount}) is not less than the deposit amount ` +
                `(${grossAmount}), so the customer would receive nothing. Correct the fee on this ` +
                `deposit, or on the deposit method, before approving.`,
        });
    }
    const idempotencyKey = `admin_deposit_approve_${transaction.id}`;
    await wallet_1.walletService.credit({
        idempotencyKey,
        userId: transaction.userId,
        walletId: wallet.id,
        walletType: wallet.type,
        currency: wallet.currency,
        amount: depositAmount,
        operationType: "DEPOSIT",
        fee: feeAmount,
        referenceId: transaction.id,
        description: `Deposit approved - ${depositAmount} ${wallet.currency}`,
        metadata: {
            transactionId: transaction.id,
            fee: feeAmount,
            grossAmount,
        },
        transaction: t,
    });
    if (backingEvidence && (wallet.type === "SPOT" || wallet.type === "ECO")) {
        await (0, ledger_1.recordAdminObligation)({
            walletType: wallet.type,
            currency: wallet.currency,
            amount: depositAmount,
            adjustmentTransactionId: transaction.id,
            adminUserId: actorId,
            reason: `deposit approved by hand: ${backingEvidence.reason}`,
            evidence: backingEvidence,
            backed: backingEvidence.backed,
            t,
        });
    }
    if (feeAmount > 0) {
        await (0, fees_1.collectPlatformFee)({
            userId: transaction.userId,
            currency: wallet.currency,
            walletType: wallet.type,
            feeAmount,
            type: "DEPOSIT",
            description: `Platform fee from approved deposit of ${feeAmount} ${wallet.currency}`,
            referenceId: transaction.id,
            metadata: { transactionId: transaction.id, userId: transaction.userId },
            transaction: t,
        });
    }
}
