"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const db_1 = require("@b/db");
const error_1 = require("@b/utils/error");
const utils_1 = require("@b/api/finance/wallet/utils");
const notifications_1 = require("@b/utils/notifications");
const utils_2 = require("../../utils");
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
        const sellerWalletForUpdate = await db_1.models.wallet.findOne({
            where: { id: sellerWallet.id },
            transaction: t,
            lock: t.LOCK.UPDATE,
        });
        if (!sellerWalletForUpdate)
            throw (0, error_1.createError)({
                statusCode: 400,
                message: "Seller wallet not found for update.",
            });
        await sellerWalletForUpdate.update({ balance: sellerWalletForUpdate.balance + fiatAmount }, { transaction: t });
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
        if (!investorWallet)
            throw (0, error_1.createError)({
                statusCode: 400,
                message: "Investor wallet not found.",
            });
        const investorWalletForUpdate = await db_1.models.wallet.findOne({
            where: { id: investorWallet.id },
            transaction: t,
            lock: t.LOCK.UPDATE,
        });
        if (!investorWalletForUpdate)
            throw (0, error_1.createError)({
                statusCode: 400,
                message: "Investor wallet not found for update.",
            });
        await investorWalletForUpdate.update({ balance: investorWalletForUpdate.balance + fiatAmount }, { transaction: t });
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
    const transaction = await db_1.models.icoTransaction.findOne({
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
    });
    if (!transaction)
        throw (0, error_1.createError)({ statusCode: 404, message: "Transaction not found." });
    if (!transaction.offering)
        throw (0, error_1.createError)({
            statusCode: 404,
            message: "Transaction offering not found.",
        });
    const offering = transaction.offering;
    const fiatAmount = transaction.amount * transaction.price;
    const note = body.note;
    ctx === null || ctx === void 0 ? void 0 : ctx.step(`Processing ${action} action on transaction`);
    const t = await db_1.sequelize.transaction();
    let result;
    try {
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
            statusCode: 500,
            message: "Internal Server Error: " + err.message,
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
                NOTE: note ? `<p>Note: ${note}</p>` : "",
            });
        if (sellerTemplate && seller)
            await sendEmailIfNeeded(sellerTemplate, seller, {
                SELLER_NAME: `${seller.firstName} ${seller.lastName}`,
                OFFERING_NAME: offering.name,
                TRANSACTION_ID: transaction.id,
                AMOUNT: fiatAmount.toString(),
                NOTE: note ? `<p>Note: ${note}</p>` : "",
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
