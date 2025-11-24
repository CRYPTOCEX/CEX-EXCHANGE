import { models } from "@b/db";

export const metadata = {
  summary: "Get ICO Transaction by ID",
  description:
    "Retrieves detailed ICO transaction data by its unique identifier, including associated offering and user details.",
  operationId: "getIcoTransactionById",
  tags: ["ICO", "Transactions"],
  parameters: [
    {
      index: 0,
      name: "id",
      in: "path",
      description: "Unique identifier of the ICO transaction",
      required: true,
      schema: { type: "string" },
    },
  ],
  responses: {
    200: {
      description: "ICO transaction retrieved successfully.",
      content: {
        "application/json": {
          schema: {
            type: "object",
            properties: {
              id: { type: "string", description: "Transaction ID" },
              amount: { type: "number", description: "Transaction amount" },
              price: {
                type: "number",
                description: "Token price at time of transaction",
              },
              status: {
                type: "string",
                description:
                  "Transaction status. One of PENDING, VERIFICATION, RELEASED, or REJECTED",
              },
              releaseUrl: {
                type: "string",
                description:
                  "Transaction hash (or release URL, if used in its place)",
              },
              tokenAmount: {
                type: "number",
                description:
                  "Calculated token amount (amount divided by token price)",
              },
              type: {
                type: "string",
                description:
                  "Derived transaction type (for example, 'completed' if released, otherwise 'pending')",
              },
              date: {
                type: "string",
                format: "date-time",
                description: "Transaction date",
              },
              notes: { type: "string", description: "Transaction notes" },
              walletAddress: {
                type: "string",
                description: "Investor's wallet address",
              },
              offering: {
                type: "object",
                description: "Associated offering details",
                properties: {
                  id: { type: "string" },
                  name: { type: "string" },
                  symbol: { type: "string" },
                  icon: { type: "string" },
                  tokenDetail: { type: "object" },
                },
              },
              user: {
                type: "object",
                description: "Investor user details",
                properties: {
                  id: { type: "string" },
                  email: { type: "string" },
                },
              },
            },
          },
        },
      },
    },
    404: { description: "ICO transaction not found." },
    500: { description: "Internal Server Error." },
  },
};

export default async (data: { params?: any }): Promise<any> => {
  try {
    const { id } = data.params || {};
    if (!id) {
      throw new Error("No transaction ID provided");
    }

    // Fetch the transaction with its associated offering and user
    const transaction = await models.icoTransaction.findOne({
      where: { id: id },
      include: [
        {
          model: models.icoTokenOffering,
          as: "offering",
          include: [{ model: models.icoTokenDetail, as: "tokenDetail" }],
        },
        { model: models.user, as: "user" },
      ],
    });

    if (!transaction) {
      return { error: "Transaction not found" };
    }

    // Return the raw object (ensure toJSON() is called if needed)
    return transaction.toJSON();
  } catch (error) {
    console.error("Error in getIcoTransactionById:", error);
    throw error;
  }
};
