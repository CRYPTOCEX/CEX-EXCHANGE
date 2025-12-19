import { updateRecord, updateRecordResponses } from "@b/utils/query";
import { mlmReferralUpdateSchema } from "../utils";
import { models } from "@b/db";
import { CacheManager } from "@b/utils/cache";
import {
  handleBinaryMlmReferralRegister,
  handleUnilevelMlmReferralRegister,
} from "@b/utils/affiliate";
import {
  unauthorizedResponse,
  serverErrorResponse,
  badRequestResponse,
  notFoundResponse,
} from "@b/utils/schema/errors";

export const metadata: OperationObject = {
  summary: "Updates a specific affiliate referral",
  description:
    "Updates an existing affiliate referral record. When referrer or referred user changes, the MLM node structure (binary/unilevel) is automatically rebuilt to maintain network integrity.",
  operationId: "updateAffiliateReferral",
  tags: ["Admin", "Affiliate", "Referral"],
  parameters: [
    {
      name: "id",
      in: "path",
      description: "ID of the affiliate referral to update",
      required: true,
      schema: {
        type: "string",
        format: "uuid",
      },
    },
  ],
  requestBody: {
    description: "New data for the affiliate referral",
    content: {
      "application/json": {
        schema: mlmReferralUpdateSchema,
      },
    },
  },
  responses: {
    200: {
      description: "Affiliate referral updated successfully",
      content: {
        "application/json": {
          schema: {
            type: "object",
            properties: {
              message: {
                type: "string",
                description: "Success message",
              },
            },
          },
        },
      },
    },
    400: badRequestResponse,
    401: unauthorizedResponse,
    404: notFoundResponse("Affiliate Referral"),
    500: serverErrorResponse,
  },
  requiresAuth: true,
  permission: "edit.affiliate.referral",
  logModule: "ADMIN_AFFILIATE",
  logTitle: "Update affiliate referral",
};

export default async (data: Handler) => {
  const { body, params, ctx } = data;
  const { id } = params;
  const { status, referrerId, referredId } = body;

  ctx?.step("Validating referral update data");
  if (referrerId === referredId) {
    throw new Error("Referrer and referred user cannot be the same");
  }

  ctx?.step("Verifying users exist");
  const referrer = await models.user.findOne({ where: { id: referrerId } });
  if (!referrer) throw new Error("Referrer not found");

  const referred = await models.user.findOne({ where: { id: referredId } });
  if (!referred) throw new Error("Referred user not found");

  ctx?.step("Fetching existing referral record");
  const existingReferral = await models.mlmReferral.findOne({ where: { id } });
  if (!existingReferral) throw new Error("Referral record not found");

  ctx?.step("Loading MLM system settings");
  const cacheManager = CacheManager.getInstance();
  const settings = await cacheManager.getSettings();
  const mlmSystem = settings.has("mlmSystem")
    ? settings.get("mlmSystem")
    : null;

  if (
    mlmSystem !== "DIRECT" &&
    (existingReferral.referrerId !== referrerId ||
      existingReferral.referredId !== referredId)
  ) {
    if (mlmSystem === "BINARY") {
      ctx?.step("Updating binary node structure");
      await models.mlmBinaryNode.destroy({ where: { referralId: id } });
      await handleBinaryMlmReferralRegister(
        referrerId,
        { id, referredId },
        models.mlmBinaryNode
      );
    } else if (mlmSystem === "UNILEVEL") {
      ctx?.step("Updating unilevel node structure");
      await models.mlmUnilevelNode.destroy({ where: { referralId: id } });
      await handleUnilevelMlmReferralRegister(
        referrerId,
        { id, referredId },
        models.mlmUnilevelNode
      );
    }
  }

  ctx?.step("Updating referral record");
  const updatedReferral = await updateRecord("mlmReferral", id, {
    status,
    referrerId,
    referredId,
  });

  ctx?.success("Referral updated successfully");
  return updatedReferral;
};
