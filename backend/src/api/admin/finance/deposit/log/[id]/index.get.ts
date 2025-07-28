import { models } from "@b/db";
import { createError } from "@b/utils/error";
import { crudParameters, paginationSchema } from "@b/utils/constants";

export const metadata = {
  summary: "Get deposit transaction by ID",
  operationId: "getDepositTransactionById",
  tags: ["Admin", "Finance", "Deposits"],
  parameters: [
    {
      name: "id",
      in: "path",
      required: true,
      schema: { type: "string" },
      description: "Deposit transaction ID",
    },
  ],
  responses: {
    200: {
      description: "Deposit transaction details",
      content: {
        "application/json": {
          schema: {
            type: "object",
            properties: {
              id: { type: "string" },
              userId: { type: "string" },
              walletId: { type: "string" },
              amount: { type: "number" },
              fee: { type: "number" },
              description: { type: "string" },
              status: { type: "string" },
              referenceId: { type: "string" },
              createdAt: { type: "string" },
              updatedAt: { type: "string" },
              user: {
                type: "object",
                properties: {
                  firstName: { type: "string" },
                  lastName: { type: "string" },
                  email: { type: "string" },
                  avatar: { type: "string" },
                },
              },
              wallet: {
                type: "object",
                properties: {
                  currency: { type: "string" },
                  type: { type: "string" },
                },
              },
            },
          },
        },
      },
    },
    404: {
      description: "Deposit transaction not found",
    },
  },
  requiresAuth: true,
  permission: "Access Deposit Management",
};

export default async (data) => {
  const { params, user } = data;
  const { id } = params;

  if (!user) {
    throw createError({
      statusCode: 401,
      message: "Unauthorized",
    });
  }

  try {
    const transaction = await models.transaction.findOne({
      where: {
        id,
        type: "DEPOSIT",
      },
      include: [
        {
          model: models.user,
          as: "user",
          attributes: ["id", "firstName", "lastName", "email", "avatar"],
        },
        {
          model: models.wallet,
          as: "wallet",
          attributes: ["id", "currency", "type"],
        },
      ],
    });

    if (!transaction) {
      throw createError({
        statusCode: 404,
        message: "Deposit transaction not found",
      });
    }

    return {
      ...transaction.get({ plain: true }),
    };
  } catch (error) {
    console.error("Error fetching deposit transaction:", error);
    throw createError({
      statusCode: 500,
      message: error.message || "Internal server error",
    });
  }
}; 