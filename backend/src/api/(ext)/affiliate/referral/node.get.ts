import {
  listBinaryReferrals,
  listDirectReferrals,
  listUnilevelReferrals,
} from "@b/api/(ext)/affiliate/utils";
import { models } from "@b/db";
import { createError } from "@b/utils/error";
import { CacheManager } from "@b/utils/cache";

export const metadata: OperationObject = {
  summary: "Fetch MLM node details by UUID",
  description:
    "Retrieves information about a specific MLM node using its UUID.",
  operationId: "getNodeById",
  tags: ["MLM", "Referrals"],
  responses: {
    200: {
      description: "Node details retrieved successfully",
      content: {
        "application/json": {
          schema: {
            type: "object",
            properties: {
              id: { type: "number", description: "User ID" },
              firstName: { type: "string", description: "First name" },
              lastName: { type: "string", description: "Last name" },
              referrals: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    id: { type: "number", description: "Referral ID" },
                  },
                },
              },
            },
          },
        },
      },
    },
    404: {
      description: "Node not found",
    },
    500: {
      description: "Internal server error",
    },
  },
  requiresAuth: true,
  logModule: "AFFILIATE",
  logTitle: "Get affiliate node details",
};

export default async (data: Handler) => {
  const { user, ctx } = data;

  if (!user?.id) {
    throw createError({ statusCode: 401, message: "Unauthorized" });
  }

  ctx?.step("Fetching user details with referral associations");
  const userPk = await models.user.findByPk(user.id, {
    include: [
      {
        model: models.mlmReferral,
        as: "referrerReferrals", // Correct alias for referrals where the user is the referrer
        include: [
          {
            model: models.user,
            as: "referred", // Correct alias for the referred user in this referral
            attributes: [
              "id",
              "firstName",
              "lastName",
              "avatar",
              "createdAt",
              "status",
            ],
          },
        ],
      },
      {
        model: models.mlmReferral,
        as: "referredReferrals", // Correct alias for referrals where the user is the referred
        include: [
          {
            model: models.user,
            as: "referrer", // Correct alias for the referrer user in this referral
            attributes: [
              "id",
              "firstName",
              "lastName",
              "avatar",
              "createdAt",
              "status",
            ],
          },
        ],
      },
      {
        model: models.mlmReferralReward,
        as: "referralRewards", // Correct alias for rewards associated with the user
        attributes: ["id"],
      },
    ],
  });

  if (!userPk) {
    throw createError({ statusCode: 404, message: "User not found" });
  }

  ctx?.step("Loading MLM system settings from cache");
  const cacheManager = CacheManager.getInstance();
  const settings = await cacheManager.getSettings();
  const mlmSettings = settings.has("mlmSettings")
    ? JSON.parse(settings.get("mlmSettings"))
    : null;

  const mlmSystem = settings.has("mlmSystem")
    ? settings.get("mlmSystem")
    : null;

  ctx?.step(`Building ${mlmSystem || 'DIRECT'} referral tree structure`);
  let nodeDetails;
  switch (mlmSystem) {
    case "DIRECT":
      nodeDetails = await listDirectReferrals(userPk, ctx);
      break;
    case "BINARY":
      nodeDetails = await listBinaryReferrals(userPk, mlmSettings, ctx);
      break;
    case "UNILEVEL":
      nodeDetails = await listUnilevelReferrals(userPk, mlmSettings, ctx);
      break;
    default:
      nodeDetails = await listDirectReferrals(userPk, ctx);
      break;
  }

  ctx?.success(`Retrieved ${mlmSystem || 'DIRECT'} node details for user`);
  return nodeDetails;
};
