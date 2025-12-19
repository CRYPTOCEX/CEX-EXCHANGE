import {
  listBinaryReferrals,
  listDirectReferrals,
  listUnilevelReferrals,
} from "@b/api/(ext)/affiliate/utils";
import { models } from "@b/db";
import { createError } from "@b/utils/error";
import { CacheManager } from "@b/utils/cache";
import {
  unauthorizedResponse,
  serverErrorResponse,
  notFoundResponse,
} from "@b/utils/schema/errors";

export const metadata: OperationObject = {
  summary: "Fetches MLM node details by user ID",
  description:
    "Retrieves detailed information about a user MLM node including their downline structure. The structure varies based on MLM system (DIRECT/BINARY/UNILEVEL). Returns user information and their referral network.",
  operationId: "getAffiliateNodeById",
  tags: ["Admin", "Affiliate", "Referral"],
  parameters: [
    {
      index: 0,
      name: "id",
      in: "path",
      required: true,
      schema: { type: "string", format: "uuid", description: "User ID" },
    },
  ],
  responses: {
    200: {
      description: "Node details retrieved successfully",
      content: {
        "application/json": {
          schema: {
            type: "object",
            description: "User node with referral details",
          },
        },
      },
    },
    401: unauthorizedResponse,
    404: notFoundResponse("Node"),
    500: serverErrorResponse,
  },
  requiresAuth: true,
  permission: "view.affiliate.referral",
  logModule: "ADMIN_AFFILIATE",
  logTitle: "Get MLM node details",
};

export default async (data: Handler) => {
  const { params, ctx } = data;
  const { id } = params;

  ctx?.step(`Fetching user node with ID: ${id}`);
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

  ctx?.step("Loading MLM system settings");
  const cacheManager = CacheManager.getInstance();
  const settings = await cacheManager.getSettings();
  const mlmSettings = settings.has["mlmSettings"]
    ? JSON.parse(settings.has["mlmSettings"])
    : null;
  const mlmSystem = settings.has["mlmSystem"] || null;

  ctx?.step(`Processing ${mlmSystem || 'DIRECT'} referral structure`);
  let nodeDetails;
  switch (mlmSystem) {
    case "DIRECT":
      nodeDetails = await listDirectReferrals(user, ctx);
      break;
    case "BINARY":
      nodeDetails = await listBinaryReferrals(user, mlmSettings, ctx);
      break;
    case "UNILEVEL":
      nodeDetails = await listUnilevelReferrals(user, mlmSettings, ctx);
      break;
    default:
      nodeDetails = await listDirectReferrals(user, ctx);
      break;
  }

  ctx?.success("Node details retrieved successfully");
  return nodeDetails;
};
