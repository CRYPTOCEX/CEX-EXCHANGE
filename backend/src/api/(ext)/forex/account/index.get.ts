import { models } from "@b/db";
import { createError } from "@b/utils/error";
import { Op, WhereOptions } from "sequelize";

import {
  notFoundMetadataResponse,
  serverErrorResponse,
  unauthorizedResponse,
} from "@b/utils/query";
import { baseForexAccountSchema } from "./utils";

export const metadata: OperationObject = {
  summary: "Retrieves all Forex accounts for the logged-in user",
  description:
    "Fetches all Forex accounts associated with the currently authenticated user.",
  operationId: "getForexAccounts",
  tags: ["Forex", "Accounts"],
  requiresAuth: true,
  responses: {
    200: {
      description: "Forex accounts retrieved successfully",
      content: {
        "application/json": {
          schema: {
            type: "array",
            items: {
              type: "object",
              properties: baseForexAccountSchema,
            },
          },
        },
      },
    },
    401: unauthorizedResponse,
    404: notFoundMetadataResponse("Forex Account"),
    500: serverErrorResponse,
  },
};

export default async (data: Handler) => {
  const { user } = data;
  if (!user?.id) {
    throw createError({ statusCode: 401, message: "Unauthorized" });
  }

  const types: ("DEMO" | "LIVE")[] = ["DEMO", "LIVE"];
  const accounts: { [key: string]: forexAccountAttributes } = {};

  try {
    const userAccounts = await models.forexAccount.findAll({
      where: {
        userId: user.id,
      },
      attributes: [
        "id",
        "accountId",
        "broker",
        "status",
        "type",
        "mt",
        "balance",
        "leverage",
        "password",
      ],
      include: [
        {
          model: models.user,
          as: "user",
          attributes: ["id", "firstName", "lastName", "avatar"],
        },
        {
          model: models.forexSignal,
          as: "accountSignals",
          through: {
            attributes: [],
          },
        },
      ],
    });

    const existingTypes = new Set(userAccounts.map((account) => account.type));

    for (const type of types) {
      if (!existingTypes.has(type)) {
        // Try to find an unassigned account of this type
        const unassignedAccount = await models.forexAccount.findOne({
          where: {
            userId: { [Op.is]: null },
            type: type,
          } as WhereOptions<forexAccountAttributes>,
        });

        let account;
        if (unassignedAccount) {
          // Update unassigned account with the userId
          account = await models.forexAccount.update(
            {
              userId: user.id,
              status: true,
            },
            {
              where: { id: unassignedAccount.id },
            }
          );
        } else {
          // Create new account
          account = await models.forexAccount.create({
            userId: user.id,
            type: type,
            status: false,
          });
        }
        accounts[type] = account as forexAccountAttributes;
      } else {
        accounts[type] = userAccounts.find(
          (account) => account.type === type
        ) as unknown as forexAccountAttributes;
      }
    }
  } catch (error) {
    console.error(
      `An error occurred while upserting Forex accounts for userId: ${user.id}`,
      error
    );
    throw error; // Re-throw to be handled elsewhere
  }

  return accounts;
};
