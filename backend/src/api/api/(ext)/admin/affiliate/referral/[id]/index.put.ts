import { updateRecord, updateRecordResponses } from "@b/utils/query";
import { mlmReferralUpdateSchema } from "../utils";
import { models } from "@b/db";
import { CacheManager } from "@b/utils/cache";
import {
  handleBinaryMlmReferralRegister,
  handleUnilevelMlmReferralRegister,
} from "@b/utils/affiliate";

export const metadata: OperationObject = {
  summary: "Updates a specific MLM Referral",
  operationId: "updateMlmReferral",
  tags: ["Admin", "MLM Referrals"],
  parameters: [
    {
      name: "id",
      in: "path",
      description: "ID of the MLM Referral to update",
      required: true,
      schema: {
        type: "string",
      },
    },
  ],
  requestBody: {
    description: "New data for the MLM Referral",
    content: {
      "application/json": {
        schema: mlmReferralUpdateSchema,
      },
    },
  },
  responses: updateRecordResponses("MLM Referral"),
  requiresAuth: true,
  permission: "edit.affiliate.referral",
};

export default async (data: Handler) => {
  const { body, params } = data;
  const { id } = params;
  const { status, referrerId, referredId } = body;

  // Basic validation: referrer and referred cannot be the same.
  if (referrerId === referredId) {
    throw new Error("Referrer and referred user cannot be the same");
  }

  // Validate that both users exist.
  const referrer = await models.user.findOne({ where: { id: referrerId } });
  if (!referrer) throw new Error("Referrer not found");

  const referred = await models.user.findOne({ where: { id: referredId } });
  if (!referred) throw new Error("Referred user not found");

  // Fetch the existing referral record.
  const existingReferral = await models.mlmReferral.findOne({ where: { id } });
  if (!existingReferral) throw new Error("Referral record not found");

  // Get MLM settings.
  const cacheManager = CacheManager.getInstance();
  const settings = await cacheManager.getSettings();
  const mlmSystem = settings.has("mlmSystem")
    ? settings.get("mlmSystem")
    : null;

  // If the system is not DIRECT and the referral relationship is changing,
  // update the MLM node accordingly.
  if (
    mlmSystem !== "DIRECT" &&
    (existingReferral.referrerId !== referrerId ||
      existingReferral.referredId !== referredId)
  ) {
    if (mlmSystem === "BINARY") {
      // Remove any existing binary node for this referral.
      await models.mlmBinaryNode.destroy({ where: { referralId: id } });
      // Create a new binary node (with cycle detection inside the handler).
      await handleBinaryMlmReferralRegister(
        referrerId,
        { id, referredId },
        models.mlmBinaryNode
      );
    } else if (mlmSystem === "UNILEVEL") {
      // Remove any existing unilevel node for this referral.
      await models.mlmUnilevelNode.destroy({ where: { referralId: id } });
      // Create a new unilevel node.
      await handleUnilevelMlmReferralRegister(
        referrerId,
        { id, referredId },
        models.mlmUnilevelNode
      );
    }
  }

  // Finally, update the referral record.
  const updatedReferral = await updateRecord("mlmReferral", id, {
    status,
    referrerId,
    referredId,
  });

  return updatedReferral;
};
