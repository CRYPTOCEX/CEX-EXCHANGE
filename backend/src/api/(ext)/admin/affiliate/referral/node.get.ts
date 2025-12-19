import { models } from "@b/db";
import { Op } from "sequelize";
import {
  unauthorizedResponse,
  serverErrorResponse,
} from "@b/utils/schema/errors";

export const metadata: OperationObject = {
  summary: "Fetches all users with binary MLM nodes",
  description:
    "Retrieves all users who have binary MLM referrals with associated binary nodes. Returns user information along with the count of their binary referrals. This endpoint is specific to BINARY MLM systems.",
  operationId: "getAllBinaryNodes",
  tags: ["Admin", "Affiliate", "Referral"],
  responses: {
    200: {
      description: "Binary nodes retrieved successfully",
      content: {
        "application/json": {
          schema: {
            type: "array",
            items: {
              type: "object",
              properties: {
                id: {
                  type: "string",
                  format: "uuid",
                  description: "User ID",
                },
                firstName: { type: "string", description: "First name" },
                lastName: { type: "string", description: "Last name" },
                avatar: {
                  type: "string",
                  nullable: true,
                  description: "User avatar URL",
                },
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
    401: unauthorizedResponse,
    500: serverErrorResponse,
  },
  requiresAuth: true,
  permission: "view.affiliate.referral",
  logModule: "ADMIN_AFFILIATE",
  logTitle: "Get all MLM binary nodes",
};

export default async (data: any) => {
  const { ctx } = data || {};

  ctx?.step("Fetching all MLM binary nodes");
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

  ctx?.success("All binary nodes retrieved successfully");
  return usersWithReferralCount;
};
