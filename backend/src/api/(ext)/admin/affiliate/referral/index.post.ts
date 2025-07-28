// /api/mlm/referrals/store.post.ts

import { storeRecord, storeRecordResponses } from "@b/utils/query";
import { mlmReferralStoreSchema, mlmReferralUpdateSchema } from "./utils";
import { models } from "@b/db";
import { CacheManager } from "@b/utils/cache";
import {
  handleBinaryMlmReferralRegister,
  handleUnilevelMlmReferralRegister,
} from "@b/utils/affiliate";

export const metadata: OperationObject = {
  summary: "Stores a new MLM Referral",
  operationId: "storeMlmReferral",
  tags: ["Admin", "MLM", "Referrals"],
  requestBody: {
    required: true,
    content: {
      "application/json": {
        schema: mlmReferralUpdateSchema,
      },
    },
  },
  responses: storeRecordResponses(mlmReferralStoreSchema, "MLM Referral"),
  requiresAuth: true,
  permission: "create.affiliate.referral",
};

export default async (data: Handler) => {
  const { body } = data;
  const { status, referrerId, referredId } = body;

  if (referrerId === referredId)
    throw new Error("Referrer and referred user cannot be the same");

  const referrer = await models.user.findOne({ where: { id: referrerId } });
  if (!referrer) throw new Error("Referrer not found");

  const referred = await models.user.findOne({ where: { id: referredId } });
  if (!referred) throw new Error("Referred user not found");

  // Create the referral record.
  const newReferral = await storeRecord({
    model: "mlmReferral",
    data: {
      status,
      referrerId,
      referredId,
    },
  });

  const cacheManager = CacheManager.getInstance();
  const settings = await cacheManager.getSettings();
  const mlmSystem = settings.has("mlmSystem")
    ? settings.get("mlmSystem")
    : null;

  // For DIRECT system, skip node creation.
  if (mlmSystem === "DIRECT") {
    return newReferral;
  } else if (mlmSystem === "BINARY") {
    await handleBinaryMlmReferralRegister(
      referrerId,
      newReferral,
      models.mlmBinaryNode
    );
  } else if (mlmSystem === "UNILEVEL") {
    await handleUnilevelMlmReferralRegister(
      referrerId,
      newReferral,
      models.mlmUnilevelNode
    );
  }

  return newReferral;
};
