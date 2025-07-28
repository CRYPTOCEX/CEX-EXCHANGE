import { models, sequelize } from "@b/db";
import { createError } from "@b/utils/error";
import { createNotification } from "@b/utils/notifications";

export const metadata = {
  summary: "Submit Token Release Transaction Hash",
  description:
    "Submits the transaction hash after sending tokens to the investor and updates the token release status to VERIFICATION.",
  operationId: "submitTokenReleaseHash",
  tags: ["ICO", "Token", "Release"],
  requiresAuth: true,
  parameters: [
    {
      index: 0,
      name: "id",
      in: "path",
      required: true,
      schema: { type: "string" },
      description: "ID of the token release transaction",
    },
    {
      index: 1,
      name: "transactionId",
      in: "path",
      required: true,
      schema: { type: "string" },
      description: "ID of the token offering",
    },
  ],
  requestBody: {
    required: true,
    content: {
      "application/json": {
        schema: {
          type: "object",
          properties: {
            releaseUrl: { type: "string" },
          },
          required: ["releaseUrl"],
        },
      },
    },
  },
  responses: {
    200: {
      description: "Token release transaction hash submitted successfully.",
    },
    400: { description: "Bad Request" },
    401: { description: "Unauthorized" },
    404: { description: "Transaction not found" },
    500: { description: "Internal Server Error" },
  },
};

export default async (data: Handler) => {
  const { user, params, body } = data;
  if (!user?.id) {
    throw createError({ statusCode: 401, message: "Unauthorized" });
  }
  const { id, transactionId } = params;
  const { releaseUrl } = body;

  if (!id || !releaseUrl) {
    throw createError({ statusCode: 400, message: "Missing required fields" });
  }

  // Find the transaction ensuring it belongs to the specified token offering.
  const transaction = await models.icoTransaction.findOne({
    where: { id: transactionId, offeringId: id },
  });
  if (!transaction) {
    throw createError({ statusCode: 404, message: "Transaction not found" });
  }

  // Update the transaction: set the release hash and update the status.
  transaction.transactionId = releaseUrl;
  transaction.status = "VERIFICATION";
  await transaction.save();

  // Notify the buyer (investor)
  try {
    await createNotification({
      userId: transaction.userId,
      relatedId: id,
      type: "investment",
      message: "Your token release transaction is under verification.",
      details:
        "The seller has submitted the transaction hash to release your tokens. Please await further confirmation.",
      link: `/ico/transaction/${transactionId}`,
      actions: [
        {
          label: "View Transaction",
          link: `/ico/transaction/${transactionId}`,
          primary: true,
        },
      ],
    });
  } catch (notifErr) {
    console.error("Failed to notify buyer about token release", notifErr);
  }

  // Notify the seller (creator)
  try {
    await createNotification({
      userId: user.id,
      relatedId: id,
      type: "system",
      title: "Token Release Hash Submitted",
      message: "Token release hash submitted successfully.",
      details:
        "You have submitted the token release transaction hash. Your transaction is now under verification.",
      link: `/ico/creator/token/${id}/release`,
      actions: [
        {
          label: "View Transaction",
          link: `/ico/creator/token/${id}/release`,
          primary: true,
        },
      ],
    });
  } catch (notifErr) {
    console.error("Failed to notify seller about token release", notifErr);
  }

  return { message: "Token release transaction hash submitted successfully." };
};
