import { models } from "@b/db";
import { createError } from "@b/utils/error";
import { Op } from "sequelize";

export const metadata = {
  summary: "Get Transaction Details",
  description:
    "Retrieves transaction details by ID along with related offering and investor data, plus all other transactions for the same offering and investor.",
  operationId: "adminGetTransactionDetails",
  tags: ["ICO", "Admin", "Transaction"],
  requiresAuth: true,
  logModule: "ADMIN_ICO",
  logTitle: "Get ICO Transaction",
  responses: {
    200: {
      description: "Transaction details retrieved successfully.",
      content: {
        "application/json": {
          schema: {
            type: "object",
            properties: {
              id: { type: "string" },
              amount: { type: "number" },
              price: { type: "number" },
              status: {
                type: "string",
                enum: ["PENDING", "VERIFICATION", "RELEASED", "REJECTED"],
              },
              releaseUrl: { type: "string" },
              walletAddress: { type: "string" },
              notes: { type: "string" },
              createdAt: { type: "string", format: "date-time" },
              updatedAt: { type: "string", format: "date-time" },
              offering: {
                type: "object",
                properties: {
                  id: { type: "string" },
                  name: { type: "string" },
                  symbol: { type: "string" },
                  userId: { type: "string" },
                  purchaseWalletType: { type: "string" },
                  purchaseWalletCurrency: { type: "string" },
                },
              },
              user: {
                type: "object",
                properties: {
                  id: { type: "string" },
                  firstName: { type: "string" },
                  lastName: { type: "string" },
                  email: { type: "string" },
                  avatar: { type: "string" },
                },
              },
              relatedTransactions: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    id: { type: "string" },
                    amount: { type: "number" },
                    price: { type: "number" },
                    status: {
                      type: "string",
                      enum: ["PENDING", "VERIFICATION", "RELEASED", "REJECTED"],
                    },
                    releaseUrl: { type: "string" },
                    createdAt: { type: "string", format: "date-time" },
                  },
                },
              },
            },
          },
        },
      },
    },
    401: { description: "Unauthorized – Admin privileges required." },
    404: { description: "Transaction not found." },
    500: { description: "Internal Server Error" },
  },
  permission: "view.ico.transaction",
  demoMask: ["user.email"],
};

export default async (data: Handler) => {
  const { params, user, ctx } = data;
  ctx?.step("Validate user authentication");
  if (!user?.id) {
    throw createError({ statusCode: 401, message: "Unauthorized" });
  }

  // Fetch the transaction with offering and investor (user) details.
  const transaction = await models.icoTransaction.findOne({
    where: { id: params.id },
    include: [
      {
        model: models.icoTokenOffering,
        as: "offering",
        attributes: [
          "id",
          "userId",
          "name",
          "symbol",
          "purchaseWalletType",
          "purchaseWalletCurrency",
        ],
      },
      {
        model: models.user,
        as: "user",
        attributes: ["id", "firstName", "lastName", "email", "avatar"],
      },
    ],
  });

  if (!transaction) {
    throw createError({ statusCode: 404, message: "Transaction not found." });
  }

  // Fetch related transactions: same offering and same investor, excluding the current transaction.
  const relatedTransactions = await models.icoTransaction.findAll({
    where: {
      offeringId: transaction.offeringId,
      userId: transaction.userId,
      id: { [Op.ne]: transaction.id },
    },
    attributes: ["id", "amount", "price", "status", "releaseUrl", "createdAt"],
    order: [["createdAt", "DESC"]],
  });

  // Attach related transactions to the response.
  const txJSON = transaction.toJSON();
  txJSON.relatedTransactions = relatedTransactions.map((tx) => tx.toJSON());
  ctx?.success("Get ICO Transaction retrieved successfully");
  return txJSON;
};
