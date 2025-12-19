import { fetchEcosystemTransactions } from "@b/api/(ext)/ecosystem/utils/transactions";
import { createError } from "@b/utils/error";
import { unauthorizedResponse, serverErrorResponse } from "@b/utils/schema/errors";

export const metadata: OperationObject = {
  summary: "Get master wallet transactions",
  description: "Retrieves the transaction history for a specific master wallet address on a given blockchain. Returns transaction details including sender, receiver, amount, and timestamp.",
  operationId: "getMasterWalletTransactions",
  tags: ["Admin", "Ecosystem", "Wallet"],
  parameters: [
    {
      name: "chain",
      in: "path",
      required: true,
      schema: { type: "string", description: "Blockchain chain identifier" },
    },
    {
      name: "address",
      in: "path",
      required: true,
      schema: { type: "string", description: "Blockchain address" },
    },
  ],
  responses: {
    200: {
      description: "Transactions retrieved successfully",
      content: {
        "application/json": {
          schema: {
            type: "array",
            items: {
              type: "object",
              properties: {
                txid: { type: "string", description: "Transaction ID" },
                from: { type: "string", description: "Sender address" },
                to: { type: "string", description: "Receiver address" },
                amount: { type: "number", description: "Amount transferred" },
                timestamp: {
                  type: "number",
                  description: "Timestamp of the transaction",
                },
              },
            },
          },
        },
      },
    },
    401: unauthorizedResponse,
    500: serverErrorResponse,
  },
  permission: "view.ecosystem.master.wallet",
};

export const getTransactionsController = async (data: Handler) => {
  const { params, ctx } = data;

  ctx?.step("Fetching master wallet transactions");

  try {
    const { chain, address } = params;
    return await fetchEcosystemTransactions(chain, address);
  } catch (error) {
    throw createError({
      statusCode: 500,
      message: `Failed to fetch transactions: ${error.message}`,
    });
  }
};
