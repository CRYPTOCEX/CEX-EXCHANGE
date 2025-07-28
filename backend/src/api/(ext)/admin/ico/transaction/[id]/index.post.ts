import { models, sequelize } from "@b/db";
import { createError } from "@b/utils/error";
import { getWallet } from "@b/api/finance/wallet/utils";
import { createNotification } from "@b/utils/notifications";
import { sendIcoEmail } from "../../utils";

export const metadata = {
  summary: "Update Transaction Action",
  description:
    "Performs an admin action on a transaction (verify, reject, save-note, remove-note). On verification approval, credits the seller’s wallet with the locked funds; on rejection, refunds the investor’s wallet.",
  operationId: "adminUpdateTransactionAction",
  tags: ["ICO", "Admin", "Transaction"],
  requiresAuth: true,
  parameters: [
    {
      name: "action",
      in: "query",
      description:
        "Action to perform. Valid values: verify, reject, save-note, remove-note",
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
};

// Mapping of action handlers.
const updateActions = {
  verify: async (transaction, t, fiatAmount, note) => {
    if (transaction.status !== "VERIFICATION")
      throw createError({
        statusCode: 400,
        message: "Transaction is not pending verification.",
      });
    const sellerWallet = await getWallet(
      transaction.offering.userId,
      transaction.offering.purchaseWalletType,
      transaction.offering.purchaseWalletCurrency
    );
    if (!sellerWallet)
      throw createError({
        statusCode: 400,
        message: "Seller wallet not found.",
      });
    const sellerWalletForUpdate = await models.wallet.findOne({
      where: { id: sellerWallet.id },
      transaction: t,
      lock: t.LOCK.UPDATE,
    });
    await sellerWalletForUpdate.update(
      { balance: sellerWalletForUpdate.balance + fiatAmount },
      { transaction: t }
    );
    await transaction.update({ status: "RELEASED" }, { transaction: t });
    return { message: "Transaction verified successfully." };
  },
  reject: async (transaction, t, fiatAmount, note) => {
    if (transaction.status !== "VERIFICATION")
      throw createError({
        statusCode: 400,
        message: "Transaction is not pending verification.",
      });
    // Refund investor's wallet
    const investorWallet = await getWallet(
      transaction.userId,
      transaction.offering.purchaseWalletType,
      transaction.offering.purchaseWalletCurrency
    );
    if (!investorWallet)
      throw createError({
        statusCode: 400,
        message: "Investor wallet not found.",
      });
    const investorWalletForUpdate = await models.wallet.findOne({
      where: { id: investorWallet.id },
      transaction: t,
      lock: t.LOCK.UPDATE,
    });
    await investorWalletForUpdate.update(
      { balance: investorWalletForUpdate.balance + fiatAmount },
      { transaction: t }
    );
    // Update transaction status to REJECTED and add any notes
    await transaction.update(
      { status: "REJECTED", notes: note || transaction.notes },
      { transaction: t }
    );
    return { message: "Transaction rejected successfully." };
  },
  "save-note": async (transaction, t, _fiatAmount, note) => {
    if (transaction.status === "RELEASED")
      throw createError({
        statusCode: 400,
        message: "Cannot add note: Transaction already verified and released.",
      });
    if (!note)
      throw createError({
        statusCode: 400,
        message: "Note is required for saving transaction note.",
      });
    await transaction.update({ notes: note }, { transaction: t });
    return { message: "Transaction note saved successfully." };
  },
  "remove-note": async (transaction, t) => {
    if (!transaction.notes || transaction.notes.trim() === "")
      throw createError({
        statusCode: 400,
        message: "Cannot remove note: No note exists.",
      });
    await transaction.update({ notes: "" }, { transaction: t });
    return { message: "Transaction note removed successfully." };
  },
};

// Mapping of email templates by action.
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

// Mapping of in‑app notification payloads by action.
const notifMapping = {
  verify: {
    buyer: {
      title: "Transaction Verified",
      message: (name, note) =>
        `Your transaction for offering "${name}" has been verified.${note ? " Note: " + note : ""}`,
      link: (txId) => `/ico/investor/transactions/${txId}`,
    },
    seller: {
      title: "Transaction Verified",
      message: (name, note) =>
        `Transaction for your offering "${name}" has been verified.${note ? " Note: " + note : ""}`,
      link: (offeringId) => `/ico/creator/token/${offeringId}?tab=transactions`,
    },
  },
  reject: {
    buyer: {
      title: "Transaction Rejected",
      message: (name, note) =>
        `Your transaction for offering "${name}" has been rejected.${note ? " Note: " + note : ""}`,
      link: (txId) => `/ico/investor/transactions/${txId}`,
    },
    seller: {
      title: "Transaction Rejected",
      message: (name, note) =>
        `A transaction for your offering "${name}" has been rejected.${note ? " Note: " + note : ""}`,
      link: (offeringId) => `/ico/creator/token/${offeringId}?tab=transactions`,
    },
  },
  "save-note": {
    buyer: {
      title: "Transaction Note Added",
      message: (name, note) =>
        `A note has been added to your transaction for offering "${name}".${note ? " Note: " + note : ""}`,
      link: (txId) => `/ico/investor/transactions/${txId}`,
    },
    seller: {
      title: "Transaction Note Added",
      message: (name, note) =>
        `A note has been added to a transaction for your offering "${name}".${note ? " Note: " + note : ""}`,
      link: (offeringId) => `/ico/creator/token/${offeringId}?tab=transactions`,
    },
  },
  "remove-note": {
    buyer: {
      title: "Transaction Note Removed",
      message: (name) =>
        `The note on your transaction for offering "${name}" has been removed.`,
      link: (txId) => `/ico/investor/transactions/${txId}`,
    },
    seller: {
      title: "Transaction Note Removed",
      message: (name) =>
        `The note on a transaction for your offering "${name}" has been removed.`,
      link: (offeringId) => `/ico/creator/token/${offeringId}?tab=transactions`,
    },
  },
};

export default async (data: Handler) => {
  const { params, user, query, body } = data;
  if (!user?.id)
    throw createError({ statusCode: 401, message: "Unauthorized" });
  const action = query.action;
  if (!action || !updateActions[action])
    throw createError({
      statusCode: 400,
      message: "Invalid or missing action.",
    });

  // Fetch the transaction with its offering details.
  const transaction = await models.icoTransaction.findOne({
    where: { id: params.id },
    include: [
      {
        model: models.icoTokenOffering,
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
    throw createError({ statusCode: 404, message: "Transaction not found." });

  const fiatAmount = transaction.amount * transaction.price;
  const note = body.note;

  // Execute the update operation within a transaction.
  const t = await sequelize.transaction();
  let result;
  try {
    result = await updateActions[action](transaction, t, fiatAmount, note);

    // Log the admin activity using icoAdminActivity model.
    await models.icoAdminActivity.create(
      {
        type: action,
        offeringId: transaction.offering.id,
        offeringName: transaction.offering.name,
        adminId: user.id,
      },
      { transaction: t }
    );

    await t.commit();
  } catch (err: any) {
    await t.rollback();
    throw createError({
      statusCode: 500,
      message: "Internal Server Error: " + err.message,
    });
  }

  // Fetch buyer (investor) and seller (creator) details.
  const buyer = await models.user.findByPk(transaction.userId);
  const seller = await models.user.findByPk(transaction.offering.userId);

  // Helper to send emails if recipient exists.
  const sendEmailIfNeeded = async (
    templateName: string,
    recipient,
    dataObj
  ) => {
    if (recipient?.email) {
      try {
        await sendIcoEmail(templateName, recipient.email, dataObj);
      } catch (emailErr) {
        console.error(`Failed to send ${templateName} email`, emailErr);
      }
    }
  };

  // Send Emails based on action mapping.
  if (emailMapping[action]) {
    const { buyer: buyerTemplate, seller: sellerTemplate } =
      emailMapping[action];
    if (buyerTemplate && buyer)
      await sendEmailIfNeeded(buyerTemplate, buyer, {
        INVESTOR_NAME: `${buyer.firstName} ${buyer.lastName}`,
        OFFERING_NAME: transaction.offering.name,
        TRANSACTION_ID: transaction.transactionId || transaction.id,
        AMOUNT: fiatAmount.toString(),
        NOTE: note ? `<p>Note: ${note}</p>` : "",
      });
    if (sellerTemplate && seller)
      await sendEmailIfNeeded(sellerTemplate, seller, {
        SELLER_NAME: `${seller.firstName} ${seller.lastName}`,
        OFFERING_NAME: transaction.offering.name,
        TRANSACTION_ID: transaction.transactionId || transaction.id,
        AMOUNT: fiatAmount.toString(),
        NOTE: note ? `<p>Note: ${note}</p>` : "",
      });
  }

  // Helper to send in‑app notifications.
  const sendNotif = async (userId, notifData) => {
    try {
      await createNotification({
        userId,
        relatedId: transaction.offering.id,
        type: "system",
        title: notifData.title,
        message: notifData.message(transaction.offering.name, note),
        details: `Transaction ID: ${transaction.id}. Amount: $${fiatAmount}. Status updated to ${
          action === "verify"
            ? "RELEASED"
            : action === "reject"
              ? "REJECTED"
              : action === "save-note"
                ? "NOTE ADDED"
                : action === "remove-note"
                  ? "NOTE REMOVED"
                  : "UPDATED"
        }.`,
        link:
          action === "verify" || action === "reject"
            ? `/ico/investor/transactions/${transaction.id}`
            : notifData.link(transaction.offering.id),
        actions: [
          {
            label: "View Transaction",
            link:
              action === "verify" || action === "reject"
                ? `/ico/investor/transactions/${transaction.id}`
                : notifData.link(transaction.offering.id),
            primary: true,
          },
        ],
      });
    } catch (notifErr) {
      console.error(`Failed to create notification for ${action}`, notifErr);
    }
  };

  // Send in‑app notifications based on action mapping.
  if (notifMapping[action]) {
    const mappings = notifMapping[action];
    if (mappings.buyer && buyer) {
      await sendNotif(buyer.id, mappings.buyer);
    }
    if (mappings.seller && seller) {
      await sendNotif(seller.id, mappings.seller);
    }
  }

  return { message: result.message || "Transaction updated successfully." };
};
