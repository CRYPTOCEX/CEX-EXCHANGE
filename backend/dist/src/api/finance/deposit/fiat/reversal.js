"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.applyDepositReversal = applyDepositReversal;
exports.reverseDepositByReference = reverseDepositByReference;
const db_1 = require("@b/db");
const console_1 = require("@b/utils/console");
const wallet_1 = require("@b/services/wallet");
const notification_1 = require("@b/services/notification");
const fees_1 = require("@b/utils/fees");
const utils_1 = require("@b/api/finance/utils");
const credit_contract_1 = require("./credit-contract");
const reversal_contract_1 = require("./reversal-contract");
async function applyDepositReversal(input) {
    const { provider, kind, reference, transaction, user, metadata, detail, partialAmount } = input;
    const existingMetadata = (0, utils_1.parseTransactionMetadata)(transaction === null || transaction === void 0 ? void 0 : transaction.metadata);
    const credited = (0, reversal_contract_1.reversalAmount)(transaction);
    const done = (0, reversal_contract_1.alreadyReversed)(transaction);
    const isPartial = partialAmount !== undefined && partialAmount !== null;
    const amount = isPartial
        ? (0, reversal_contract_1.partialReversalAmount)({ credited, reported: partialAmount, alreadyReversed: done })
        : Math.max(0, credited - done);
    const fee = isPartial ? 0 : (0, reversal_contract_1.feeToWriteBack)(transaction);
    const fallbackCurrency = (() => {
        try {
            return (0, credit_contract_1.resolveDepositCurrency)(transaction);
        }
        catch (_a) {
            return "";
        }
    })();
    let wallet = (transaction === null || transaction === void 0 ? void 0 : transaction.walletId)
        ? await db_1.models.wallet.findByPk(transaction.walletId)
        : null;
    if (wallet && String(wallet.userId) !== String(user.id)) {
        wallet = null;
    }
    if (!wallet && fallbackCurrency) {
        wallet = await db_1.models.wallet.findOne({
            where: { userId: user.id, currency: fallbackCurrency, type: "FIAT" },
        });
    }
    const currency = String((wallet === null || wallet === void 0 ? void 0 : wallet.currency) || fallbackCurrency || "");
    if (!wallet) {
        console_1.logger.error(provider.toUpperCase(), `[CRITICAL] ${kind} for payment ${reference}: no ${currency || "(unknown currency)"} FIAT wallet for user ${user.id}. Nothing recorded.`);
        return { outcome: "no_wallet", debited: 0, shortfall: amount, currency };
    }
    const debitKey = (0, reversal_contract_1.reversalIdempotencyKey)(provider, reference, kind);
    const alreadyDebited = await db_1.models.transaction.findOne({
        where: { idempotencyKey: debitKey },
        attributes: ["id"],
    });
    const alreadyOwed = alreadyDebited
        ? null
        : await db_1.models.transaction.findOne({
            where: { referenceId: (0, reversal_contract_1.shortfallReferenceId)(provider, reference, kind) },
            attributes: ["id"],
        });
    if (alreadyDebited || alreadyOwed) {
        console_1.logger.info(provider.toUpperCase(), `${kind} ${reference} already processed (idempotency hit)`);
        return { outcome: "duplicate", debited: 0, shortfall: 0, currency };
    }
    const plan = amount > 1e-9
        ? (0, reversal_contract_1.planReversal)({ amount, availableBalance: wallet.balance })
        : { debit: 0, shortfall: 0, short: false };
    let debited = 0;
    let duplicate = false;
    await db_1.sequelize.transaction(async (dbTransaction) => {
        if (plan.debit > 0) {
            try {
                await wallet_1.walletService.debit({
                    idempotencyKey: debitKey,
                    userId: user.id,
                    walletId: wallet.id,
                    walletType: "FIAT",
                    currency,
                    amount: plan.debit,
                    operationType: "REFUND",
                    referenceId: (0, reversal_contract_1.reversalReferenceId)(provider, reference, kind),
                    description: `${provider} ${kind} - ${plan.debit} ${currency}`,
                    metadata: { method: provider.toUpperCase(), kind, reference, ...metadata },
                    transaction: dbTransaction,
                });
                debited = plan.debit;
            }
            catch (error) {
                if (error instanceof wallet_1.DuplicateOperationError) {
                    duplicate = true;
                    console_1.logger.info(provider.toUpperCase(), `${kind} ${reference} already processed (idempotency hit)`);
                    return;
                }
                if (error instanceof wallet_1.InsufficientFundsError) {
                    debited = 0;
                }
                else {
                    throw error;
                }
            }
        }
        if (duplicate)
            return;
        const shortfall = amount - debited;
        if (shortfall > 1e-9) {
            await db_1.models.transaction.create({
                userId: user.id,
                walletId: wallet.id,
                type: "REFUND",
                status: "PENDING",
                amount: shortfall,
                fee: 0,
                description: `Unrecovered ${kind} on ${provider} payment ${reference} — ` +
                    `${shortfall} ${currency} could not be taken back because the wallet did not hold it.`,
                referenceId: (0, reversal_contract_1.shortfallReferenceId)(provider, reference, kind),
                metadata: {
                    method: provider.toUpperCase(),
                    kind,
                    reference,
                    unrecovered: true,
                    originalAmount: amount,
                    recovered: debited,
                    ...metadata,
                },
            }, { transaction: dbTransaction });
            await db_1.models.wallet.update({ status: false }, { where: { id: wallet.id }, transaction: dbTransaction });
        }
        if (fee > 0 && !(await (0, fees_1.isSuperAdmin)(user.id))) {
            await (0, fees_1.recordPlatformLoss)({
                currency,
                walletType: "FIAT",
                lossAmount: fee,
                type: "DEPOSIT",
                description: `Reversal of platform fee on ${kind} ${provider} deposit - ${fee} ${currency}`,
                referenceId: (0, reversal_contract_1.reversalReferenceId)(provider, reference, kind),
                metadata: { method: provider.toUpperCase(), kind, reference, ...metadata },
                transaction: dbTransaction,
            });
        }
        const reversedSoFar = done + amount;
        await transaction.update({
            ...(isPartial ? {} : { status: "REFUNDED" }),
            metadata: JSON.stringify({
                ...existingMetadata,
                [`${kind}At`]: new Date().toISOString(),
                [`${kind}Reference`]: reference,
                reversedAmount: reversedSoFar,
                ...(isPartial ? { partialReversals: [
                        ...(Array.isArray(existingMetadata.partialReversals)
                            ? existingMetadata.partialReversals
                            : []),
                        { kind, reference, amount, at: new Date().toISOString() },
                    ] } : {}),
            }),
        }, { transaction: dbTransaction });
    });
    if (duplicate) {
        return { outcome: "duplicate", debited: 0, shortfall: 0, currency };
    }
    const shortfall = amount - debited;
    await notify({ provider, kind, reference, user, currency, debited, shortfall, detail });
    return {
        outcome: shortfall > 1e-9 ? "partial" : "reversed",
        debited,
        shortfall,
        currency,
    };
}
async function notify(input) {
    const { provider, kind, reference, user, currency, debited, shortfall, detail } = input;
    const label = kind === "chargeback" ? "Chargeback" : "Refund";
    try {
        await notification_1.notificationService.send({
            userId: user.id,
            type: "ALERT",
            channels: ["IN_APP"],
            idempotencyKey: `${provider}_${kind}_user_${reference}`,
            data: {
                title: `Deposit ${label}`,
                message: `Your ${provider} deposit has been ${kind === "chargeback" ? "charged back" : "refunded"}. ` +
                    `${debited} ${currency} has been deducted from your wallet.` +
                    (shortfall > 1e-9
                        ? ` A further ${shortfall} ${currency} could not be deducted and your wallet has been suspended pending review.`
                        : "") +
                    (detail ? ` ${detail}` : ""),
                link: "/wallet",
            },
            priority: "HIGH",
        });
    }
    catch (error) {
        console_1.logger.error(provider.toUpperCase(), `Failed to notify user of ${kind}`, error);
    }
    try {
        const admins = await db_1.models.user.findAll({
            include: [
                {
                    model: db_1.models.role,
                    as: "role",
                    where: { name: ["Admin", "Super Admin"] },
                },
            ],
            attributes: ["id", "email"],
        });
        for (const admin of admins) {
            await notification_1.notificationService.send({
                userId: admin.id,
                type: "ALERT",
                channels: ["IN_APP"],
                idempotencyKey: `${provider}_${kind}_admin_${reference}_${admin.id}`,
                data: {
                    title: shortfall > 1e-9
                        ? `CRITICAL: Unrecovered deposit ${kind}`
                        : `Deposit ${label}`,
                    message: `${provider} ${kind}: ${debited} ${currency} recovered from user ${user.id} (${user.email}). ` +
                        (shortfall > 1e-9
                            ? `${shortfall} ${currency} COULD NOT BE RECOVERED and is recorded as a pending receivable. ` +
                                `The wallet is suspended — note that this also blocks incoming deposits, so the user cannot ` +
                                `repay until you re-enable it. `
                            : "") +
                        `Payment ${reference}.`,
                    link: `/admin/finance/transactions`,
                },
                priority: "HIGH",
            });
        }
    }
    catch (error) {
        console_1.logger.error(provider.toUpperCase(), `Failed to notify admins of ${kind}`, error);
    }
}
async function reverseDepositByReference(input) {
    const { provider, kind, depositReference, eventReference, reportedAmount, metadata, detail, allowPartial, } = input;
    const tag = provider.toUpperCase();
    const reference = String(eventReference || depositReference || "");
    const empty = (reason) => ({
        outcome: "not_applicable",
        debited: 0,
        shortfall: 0,
        currency: "",
        reason,
    });
    if (!depositReference)
        return empty("no deposit reference on the payload");
    const transaction = await db_1.models.transaction.findOne({
        where: { referenceId: depositReference, type: "DEPOSIT" },
    });
    if (!transaction) {
        console_1.logger.info(tag, `${kind} for unknown deposit ${depositReference}; ignored`);
        return empty("no deposit with that reference");
    }
    if (!(0, reversal_contract_1.isReversible)(transaction.status)) {
        console_1.logger.info(tag, `${kind} for deposit ${depositReference} in status ${transaction.status}; not reversible`);
        return empty(`deposit is ${transaction.status}, not COMPLETED`);
    }
    const gross = (0, reversal_contract_1.depositGross)(transaction);
    const full = (0, reversal_contract_1.isFullReversal)({ depositAmount: gross, reportedAmount });
    let partialAmount;
    if (!full) {
        if (!allowPartial) {
            console_1.logger.warn(tag, `[MANUAL] PARTIAL ${kind} on deposit ${depositReference}: provider reports ` +
                `${String(reportedAmount)} against a deposit of ${gross}. ` +
                `Nothing was reversed — a partial reversal has to be applied by hand.`);
            return empty("partial reversal — needs an operator");
        }
        partialAmount = Number(reportedAmount);
        if (!Number.isFinite(partialAmount) || partialAmount <= 0) {
            console_1.logger.warn(tag, `[MANUAL] PARTIAL ${kind} on deposit ${depositReference} carried no usable ` +
                `portion (${String(reportedAmount)}). Nothing was reversed.`);
            return empty("partial reversal without a reversed portion — needs an operator");
        }
    }
    const user = await db_1.models.user.findByPk(transaction.userId);
    if (!user) {
        console_1.logger.error(tag, `[CRITICAL] ${kind} for deposit ${depositReference}: user ${transaction.userId} not found`);
        return empty("user not found");
    }
    try {
        return await applyDepositReversal({
            provider,
            kind,
            reference,
            transaction,
            user,
            metadata: { depositReference, ...metadata },
            detail,
            partialAmount,
        });
    }
    catch (error) {
        console_1.logger.error(tag, `Failed to apply ${kind} for deposit ${depositReference}`, error);
        throw error;
    }
}
