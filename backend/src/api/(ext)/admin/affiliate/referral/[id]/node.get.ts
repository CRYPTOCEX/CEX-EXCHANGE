// /api/mlmReferralConditions/structure.get.ts

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
  tags: ["Admin", "MLM", "Referrals"],
  parameters: [
    {
      index: 0,
      name: "id",
      in: "path",
      required: true,
      schema: { type: "string", description: "UUID of the node user" },
    },
  ],
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
  permission: "view.affiliate.referral",
};

export default async (data: Handler) => {
  const { params } = data;
  const { id } = params;

  const user = await models.user.findByPk(id, {
    include: [
      {
        model: models.mlmReferral,
        as: "referrer",
        include: [
          {
            model: models.user,
            as: "referred",
          },
        ],
      },
      {
        model: models.mlmReferral,
        as: "referred",
      },
    ],
  });

  if (!user) {
    throw createError({ statusCode: 404, message: "User not found" });
  }

  // Load settings from CacheManager
  const cacheManager = CacheManager.getInstance();
  const settings = await cacheManager.getSettings();
  const mlmSettings = settings.has["mlmSettings"]
    ? JSON.parse(settings.has["mlmSettings"])
    : null;
  const mlmSystem = settings.has["mlmSystem"] || null;

  let nodeDetails;
  switch (mlmSystem) {
    case "DIRECT":
      nodeDetails = await listDirectReferrals(user);
      break;
    case "BINARY":
      nodeDetails = await listBinaryReferrals(user, mlmSettings);
      break;
    case "UNILEVEL":
      nodeDetails = await listUnilevelReferrals(user, mlmSettings);
      break;
    default:
      nodeDetails = await listDirectReferrals(user);
      break;
  }

  return nodeDetails;
};
