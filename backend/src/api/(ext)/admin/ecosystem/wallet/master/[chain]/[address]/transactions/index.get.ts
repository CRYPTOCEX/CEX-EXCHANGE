import { fetchEcosystemTransactions } from "@b/api/(ext)/ecosystem/utils/transactions";
import { createError } from "@b/utils/error";

export const metadata: OperationObject = {
  summary: "Retrieves transactions for a specific address on a chain",
  description:
    "Fetches all transactions associated with a specific address on a blockchain.",
  operationId: "getTransactions",
  tags: ["Admin", "Blockchain", "Transactions"],
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
    500: {
      description: "Failed to retrieve transactions",
    },
  },
  permission: "view.ecosystem.master.wallet",
};

export const getTransactionsController = async (data: Handler) => {
  const { params } = data;
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
