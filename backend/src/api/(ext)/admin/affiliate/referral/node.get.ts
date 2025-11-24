import { models } from "@b/db";
import { Op } from "sequelize";

export const metadata: OperationObject = {
  summary: "Fetch all MLM binary nodes",
  description: "Retrieves all nodes associated with MLM binary referrals.",
  operationId: "getAllNodes",
  tags: ["Admin", "MLM", "Referrals"],
  responses: {
    200: {
      description: "Nodes retrieved successfully",
      content: {
        "application/json": {
          schema: {
            type: "array",
            items: {
              type: "object",
              properties: {
                id: { type: "number", description: "User ID" },
                firstName: { type: "string", description: "First name" },
                lastName: { type: "string", description: "Last name" },
                avatar: { type: "string", description: "User avatar URL" },
                binaryReferralCount: {
                  type: "number",
                  description: "Number of binary referrals",
                },
              },
            },
          },
        },
      },
    },
    500: {
      description: "Internal server error",
    },
  },
  permission: "view.affiliate.referral",
};

export default async () => {
  const users = (await models.user.findAll({
    include: [
      {
        model: models.mlmReferral,
        as: "referrals",
        where: {
          mlmBinaryNode: { [Op.ne]: null },
        },
      },
    ],
  })) as any[];

  const usersWithReferralCount = users.map((user) => ({
    ...user,
    binaryReferralCount: user.referrals.length,
  }));

  return usersWithReferralCount;
};
