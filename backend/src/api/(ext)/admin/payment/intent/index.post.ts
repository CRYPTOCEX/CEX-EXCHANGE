import { storeRecord, storeRecordResponses } from "@b/utils/query";
import { paymentIntentStoreSchema, paymentIntentUpdateSchema } from "./utils";
import { models } from "@b/db";

export const metadata = {
  summary: "Stores a new Payment Intent",
  operationId: "storePaymentIntent",
  tags: ["Admin", "Payment"],
  requestBody: {
    required: true,
    content: {
      "application/json": {
        schema: paymentIntentUpdateSchema,
      },
    },
  },
  responses: storeRecordResponses(paymentIntentStoreSchema, "Payment Intent"),
  requiresAuth: true,
  permission: "create.payment.intent",
};

export default async (data: Handler) => {
  const { body } = data;
  const {
    userId,
    walletId,
    amount,
    currency,
    tax,
    discount,
    status,
    ipnUrl,
    successUrl,
    failUrl,
  } = body;

  // Validate associated User
  const user = await models.user.findOne({ where: { id: userId } });
  if (!user) throw new Error("User not found");

  // Validate associated Wallet
  const wallet = await models.wallet.findOne({ where: { id: walletId } });
  if (!wallet) throw new Error("Wallet not found");

  // Store the Payment Intent record
  return await storeRecord({
    model: "paymentIntent",
    data: {
      userId,
      walletId,
      amount,
      currency,
      tax,
      discount,
      status,
      ipnUrl,
      successUrl,
      failUrl,
    },
  });
};
