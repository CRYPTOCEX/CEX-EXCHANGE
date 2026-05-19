"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const db_1 = require("@b/db");
const error_1 = require("@b/utils/error");
const utils_1 = require("@b/api/finance/wallet/utils");
const notifications_1 = require("@b/utils/notifications");
const utils_2 = require("../../utils");
const wallet_1 = require("@b/services/wallet");
const fees_1 = require("@b/utils/fees");
const console_1 = require("@b/utils/console");
exports.metadata = {
    summary: "Update Transaction Action",
    description: "Performs an admin action on a transaction (verify, reject, save-note, remove-note). On verification approval, credits the seller’s wallet with the locked funds; on rejection, refunds the investor’s wallet.",
    operationId: "adminUpdateTransactionAction",
    tags: ["ICO", "Admin", "Transaction"],
    requiresAuth: true,
    parameters: [
        {
            name: "action",
            in: "query",
            description: "Action to perform. Valid values: verify, reject, save-note, remove-note",
            required: true,
            schema: { type: "string" },
        },
    ],
    requestBody: {
        description: "Optional note for actions that require it.",
        content: {
            "application/json": {
                schema: {
                    type: "object",
                    properties: {
                        note: { type: "string" },
                    },
                },
            },
        },
    },
    responses: {
        200: { description: "Transaction updated successfully." },
        400: { description: "Bad Request – Invalid action or missing parameters." },
        401: { description: "Unauthorized – Admin privileges required." },
        404: { description: "Transaction not found." },
        500: { description: "Internal Server Error" },
    },
    permission: "edit.ico.transaction",
    logModule: "ADMIN_ICO",
    logTitle: "Update ICO Transaction",
};
const updateActions = {
    verify: async (transaction, t, fiatAmount, note) => {
        if (transaction.status !== "VERIFICATION")
            throw (0, error_1.createError)({
                statusCode: 400,
                message: "Transaction is not pending verification.",
            });
        const sellerWallet = await (0, utils_1.getWallet)(transaction.offering.userId, transaction.offering.purchaseWalletType, transaction.offering.purchaseWalletCurrency);
        if (!sellerWallet)
            throw (0, error_1.createError)({
                statusCode: 400,
                message: "Seller wallet not found.",
            });
        const escrowAdmin = await (0, fees_1.getSuperAdmin)();
        if (!escrowAdmin) {
            throw (0, error_1.createError)({
                statusCode: 500,
                message: "ICO escrow Super Admin wallet not configured.",
            });
        }
        try {
            await wallet_1.walletService.debit({
                idempotencyKey: `ico_escrow_release_${transaction.id}`,
                userId: escrowAdmin.id,
                walletType: transaction.offering.purchaseWalletType,
                currency: transaction.offering.purchaseWalletCurrency,
                amount: fiatAmount,
                operationType: "ICO_CONTRIBUTION",
                referenceId: transaction.id,
                description: `ICO escrow release to seller for ${transaction.offering.name} (tx ${transaction.id})`,
                metadata: {
                    escrow: true,
                    direction: "release",
                    transactionId: transaction.id,
                    offeringId: transaction.offering.id,
                    action: "verify",
                },
                transaction: t,
            });
        }
        catch (escrowErr) {
            if ((escrowErr === null || escrowErr === void 0 ? void 0 : escrowErr.name) !== "DuplicateOperationError")
                throw escrowErr;
            console_1.logger.warn("ADMIN_ICO_VERIFY", `Escrow already released for ICO transaction ${transaction.id}; continuing.`);
        }
        await wallet_1.walletService.credit({
            idempotencyKey: `ico_verify_${transaction.id}`,
            userId: transaction.offering.userId,
            walletId: sellerWallet.id,
            walletType: transaction.offering.purchaseWalletType,
            currency: transaction.offering.purchaseWalletCurrency,
            amount: fiatAmount,
            operationType: "ICO_CONTRIBUTION",
            referenceId: transaction.id,
            description: `ICO Transaction Verified: ${transaction.offering.name}`,
            metadata: {
                transactionId: transaction.id,
                offeringId: transaction.offering.id,
                action: 'verify',
            },
            transaction: t,
        });
        await transaction.update({ status: "RELEASED" }, { transaction: t });
        return { message: "Transaction verified successfully." };
    },
    reject: async (transaction, t, fiatAmount, note) => {
        if (transaction.status !== "VERIFICATION")
            throw (0, error_1.createError)({
                statusCode: 400,
                message: "Transaction is not pending verification.",
            });
        const investorWallet = await (0, utils_1.getWallet)(transaction.userId, transaction.offering.purchaseWalletType, transaction.offering.purchaseWalletCurrency);
        if (!investorWallet) {
            await wallet_1.walletCreationService.getOrCreateWallet(transaction.userId, transaction.offering.purchaseWalletType, transaction.offering.purchaseWalletCurrency, t);
        }
        const escrowAdmin = await (0, fees_1.getSuperAdmin)();
        if (!escrowAdmin) {
            throw (0, error_1.createError)({
                statusCode: 500,
                message: "ICO escrow Super Admin wallet not configured.",
            });
        }
        try {
            await wallet_1.walletService.debit({
                idempotencyKey: `ico_escrow_refund_${transaction.id}`,
                userId: escrowAdmin.id,
                walletType: transaction.offering.purchaseWalletType,
                currency: transaction.offering.purchaseWalletCurrency,
                amount: fiatAmount,
                operationType: "REFUND",
                referenceId: transaction.id,
                description: `ICO escrow refund to buyer for ${transaction.offering.name} (tx ${transaction.id})`,
                metadata: {
                    escrow: true,
                    direction: "refund",
                    transactionId: transaction.id,
                    offeringId: transaction.offering.id,
                    action: "reject",
                },
                transaction: t,
            });
        }
        catch (escrowErr) {
            if ((escrowErr === null || escrowErr === void 0 ? void 0 : escrowErr.name) !== "DuplicateOperationError")
                throw escrowErr;
            console_1.logger.warn("ADMIN_ICO_REJECT", `Escrow already refunded for ICO transaction ${transaction.id}; continuing.`);
        }
        const refundWallet = investorWallet ||
            (await (0, utils_1.getWallet)(transaction.userId, transaction.offering.purchaseWalletType, transaction.offering.purchaseWalletCurrency));
        if (!refundWallet) {
            throw (0, error_1.createError)({
                statusCode: 500,
                message: "Unable to resolve investor wallet for refund.",
            });
        }
        await wallet_1.walletService.credit({
            idempotencyKey: `ico_reject_${transaction.id}`,
            userId: transaction.userId,
            walletId: refundWallet.id,
            walletType: transaction.offering.purchaseWalletType,
            currency: transaction.offering.purchaseWalletCurrency,
            amount: fiatAmount,
            operationType: "REFUND",
            referenceId: transaction.id,
            description: `ICO Transaction Rejected: ${transaction.offering.name}`,
            metadata: {
                transactionId: transaction.id,
                offeringId: transaction.offering.id,
                action: 'reject',
            },
            transaction: t,
        });
        await transaction.update({ status: "REJECTED", notes: note || transaction.notes }, { transaction: t });
        return { message: "Transaction rejected successfully." };
    },
    "save-note": async (transaction, t, _fiatAmount, note) => {
        if (transaction.status === "RELEASED")
            throw (0, error_1.createError)({
                statusCode: 400,
                message: "Cannot add note: Transaction already verified and released.",
            });
        if (!note)
            throw (0, error_1.createError)({
                statusCode: 400,
                message: "Note is required for saving transaction note.",
            });
        await transaction.update({ notes: note }, { transaction: t });
        return { message: "Transaction note saved successfully." };
    },
    "remove-note": async (transaction, t) => {
        if (!transaction.notes || transaction.notes.trim() === "")
            throw (0, error_1.createError)({
                statusCode: 400,
                message: "Cannot remove note: No note exists.",
            });
        await transaction.update({ notes: "" }, { transaction: t });
        return { message: "Transaction note removed successfully." };
    },
};
const emailMapping = {
    verify: {
        buyer: "TransactionVerifiedBuyer",
        seller: "TransactionVerifiedSeller",
    },
    reject: {
        buyer: "TransactionRejectedBuyer",
        seller: "TransactionRejectedSeller",
    },
    "save-note": {
        buyer: "TransactionNoteAddedBuyer",
        seller: "TransactionNoteAddedSeller",
    },
    "remove-note": {
        buyer: "TransactionNoteRemovedBuyer",
        seller: "TransactionNoteRemovedSeller",
    },
};
const notifMapping = {
    verify: {
        buyer: {
            title: "Transaction Verified",
            message: (name, note) => `Your transaction for offering "${name}" has been verified.${note ? " Note: " + note : ""}`,
            link: (txId) => `/ico/investor/transactions/${txId}`,
        },
        seller: {
            title: "Transaction Verified",
            message: (name, note) => `Transaction for your offering "${name}" has been verified.${note ? " Note: " + note : ""}`,
            link: (offeringId) => `/ico/creator/token/${offeringId}?tab=transactions`,
        },
    },
    reject: {
        buyer: {
            title: "Transaction Rejected",
            message: (name, note) => `Your transaction for offering "${name}" has been rejected.${note ? " Note: " + note : ""}`,
            link: (txId) => `/ico/investor/transactions/${txId}`,
        },
        seller: {
            title: "Transaction Rejected",
            message: (name, note) => `A transaction for your offering "${name}" has been rejected.${note ? " Note: " + note : ""}`,
            link: (offeringId) => `/ico/creator/token/${offeringId}?tab=transactions`,
        },
    },
    "save-note": {
        buyer: {
            title: "Transaction Note Added",
            message: (name, note) => `A note has been added to your transaction for offering "${name}".${note ? " Note: " + note : ""}`,
            link: (txId) => `/ico/investor/transactions/${txId}`,
        },
        seller: {
            title: "Transaction Note Added",
            message: (name, note) => `A note has been added to a transaction for your offering "${name}".${note ? " Note: " + note : ""}`,
            link: (offeringId) => `/ico/creator/token/${offeringId}?tab=transactions`,
        },
    },
    "remove-note": {
        buyer: {
            title: "Transaction Note Removed",
            message: (name) => `The note on your transaction for offering "${name}" has been removed.`,
            link: (txId) => `/ico/investor/transactions/${txId}`,
        },
        seller: {
            title: "Transaction Note Removed",
            message: (name) => `The note on a transaction for your offering "${name}" has been removed.`,
            link: (offeringId) => `/ico/creator/token/${offeringId}?tab=transactions`,
        },
    },
};
exports.default = async (data) => {
    const { params, user, query, body, ctx } = data;
    if (!(user === null || user === void 0 ? void 0 : user.id))
        throw (0, error_1.createError)({ statusCode: 401, message: "Unauthorized" });
    const action = query.action;
    if (!action || !updateActions[action])
        throw (0, error_1.createError)({
            statusCode: 400,
            message: "Invalid or missing action.",
        });
    ctx === null || ctx === void 0 ? void 0 : ctx.step(`Fetching transaction for action: ${action}`);
    const t = await db_1.sequelize.transaction();
    let result;
    let transaction;
    let offering;
    let fiatAmount;
    let note;
    try {
        transaction = await db_1.models.icoTransaction.findOne({
            where: { id: params.id },
            include: [
                {
                    model: db_1.models.icoTokenOffering,
                    as: "offering",
                    attributes: [
                        "id",
                        "name",
                        "userId",
                        "purchaseWalletType",
                        "purchaseWalletCurrency",
                    ],
                },
            ],
            transaction: t,
            lock: t.LOCK.UPDATE,
        });
        if (!transaction)
            throw (0, error_1.createError)({ statusCode: 404, message: "Transaction not found." });
        if (!transaction.offering)
            throw (0, error_1.createError)({
                statusCode: 404,
                message: "Transaction offering not found.",
            });
        offering = transaction.offering;
        fiatAmount = transaction.amount * transaction.price;
        note = body.note;
        ctx === null || ctx === void 0 ? void 0 : ctx.step(`Processing ${action} action on transaction`);
        result = await updateActions[action](transaction, t, fiatAmount, note);
        ctx === null || ctx === void 0 ? void 0 : ctx.step("Logging admin activity");
        await db_1.models.icoAdminActivity.create({
            type: action,
            offeringId: offering.id,
            offeringName: offering.name,
            adminId: user.id,
        }, { transaction: t });
        await t.commit();
    }
    catch (err) {
        await t.rollback();
        throw (0, error_1.createError)({
            statusCode: err.statusCode || 500,
            message: err.message || "Internal Server Error",
        });
    }
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Sending emails and notifications");
    const buyer = await db_1.models.user.findByPk(transaction.userId);
    const seller = await db_1.models.user.findByPk(offering.userId);
    const sendEmailIfNeeded = async (templateName, recipient, dataObj) => {
        if (recipient === null || recipient === void 0 ? void 0 : recipient.email) {
            try {
                await (0, utils_2.sendIcoEmail)(templateName, recipient.email, dataObj, ctx);
            }
            catch (emailErr) {
                console.error(`Failed to send ${templateName} email`, emailErr);
            }
        }
    };
    if (emailMapping[action]) {
        const { buyer: buyerTemplate, seller: sellerTemplate } = emailMapping[action];
        if (buyerTemplate && buyer)
            await sendEmailIfNeeded(buyerTemplate, buyer, {
                INVESTOR_NAME: `${buyer.firstName} ${buyer.lastName}`,
                OFFERING_NAME: offering.name,
                TRANSACTION_ID: transaction.id,
                AMOUNT: fiatAmount.toString(),
                NOTE: note ? `<p>Note: ${note.replace(/[<>&"']/g, c => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;', "'": '&#39;' }[c] || c))}</p>` : "",
            });
        if (sellerTemplate && seller)
            await sendEmailIfNeeded(sellerTemplate, seller, {
                SELLER_NAME: `${seller.firstName} ${seller.lastName}`,
                OFFERING_NAME: offering.name,
                TRANSACTION_ID: transaction.id,
                AMOUNT: fiatAmount.toString(),
                NOTE: note ? `<p>Note: ${note.replace(/[<>&"']/g, c => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;', "'": '&#39;' }[c] || c))}</p>` : "",
            });
    }
    const sendNotif = async (userId, notifData) => {
        try {
            await (0, notifications_1.createNotification)({
                userId,
                relatedId: offering.id,
                type: "system",
                title: notifData.title,
                message: notifData.message(offering.name, note),
                details: `Transaction ID: ${transaction.id}. Amount: $${fiatAmount}. Status updated to ${action === "verify"
                    ? "RELEASED"
                    : action === "reject"
                        ? "REJECTED"
                        : action === "save-note"
                            ? "NOTE ADDED"
                            : action === "remove-note"
                                ? "NOTE REMOVED"
                                : "UPDATED"}.`,
                link: action === "verify" || action === "reject"
                    ? `/ico/investor/transactions/${transaction.id}`
                    : notifData.link(offering.id),
                actions: [
                    {
                        label: "View Transaction",
                        link: action === "verify" || action === "reject"
                            ? `/ico/investor/transactions/${transaction.id}`
                            : notifData.link(offering.id),
                        primary: true,
                    },
                ],
            }, ctx);
        }
        catch (notifErr) {
            console.error(`Failed to create notification for ${action}`, notifErr);
        }
    };
    if (notifMapping[action]) {
        const mappings = notifMapping[action];
        if (mappings.buyer && buyer) {
            await sendNotif(buyer.id, mappings.buyer);
        }
        if (mappings.seller && seller) {
            await sendNotif(seller.id, mappings.seller);
        }
    }
    ctx === null || ctx === void 0 ? void 0 : ctx.success(`Transaction ${action} action completed successfully`);
    return { message: result.message || "Transaction updated successfully." };
};
