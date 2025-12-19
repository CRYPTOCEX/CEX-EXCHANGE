// /api/mlm/referrals/store.post.ts

import { storeRecord, storeRecordResponses } from "@b/utils/query";
import { mlmReferralStoreSchema, mlmReferralUpdateSchema } from "./utils";
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
  conflictResponse,
} from "@b/utils/schema/errors";

export const metadata: OperationObject = {
  summary: "Creates a new affiliate referral",
  description:
    "Creates a new affiliate referral relationship between two users. Automatically creates the appropriate MLM node structure (binary/unilevel) based on the system configuration. For DIRECT systems, only the referral record is created without node structures.",
  operationId: "createAffiliateReferral",
  tags: ["Admin", "Affiliate", "Referral"],
  requestBody: {
    required: true,
    content: {
      "application/json": {
        schema: mlmReferralUpdateSchema,
      },
    },
  },
  responses: {
    200: {
      description: "Affiliate referral created successfully",
      content: {
        "application/json": {
          schema: {
            type: "object",
            properties: mlmReferralStoreSchema,
          },
        },
      },
    },
    400: badRequestResponse,
    401: unauthorizedResponse,
    409: conflictResponse("Referral"),
    500: serverErrorResponse,
  },
  requiresAuth: true,
  permission: "create.affiliate.referral",
  logModule: "ADMIN_AFFILIATE",
  logTitle: "Create affiliate referral",
};

export default async (data: Handler) => {
  const { body, ctx } = data;
  const { status, referrerId, referredId } = body;

  ctx?.step("Validating referral data");
  if (referrerId === referredId)
    throw new Error("Referrer and referred user cannot be the same");

  ctx?.step("Verifying referrer user");
  const referrer = await models.user.findOne({ where: { id: referrerId } });
  if (!referrer) throw new Error("Referrer not found");

  ctx?.step("Verifying referred user");
  const referred = await models.user.findOne({ where: { id: referredId } });
  if (!referred) throw new Error("Referred user not found");

  ctx?.step("Creating referral record");
  // Create the referral record.
  const newReferral = await storeRecord({
    model: "mlmReferral",
    data: {
      status,
      referrerId,
      referredId,
    },
  });

  ctx?.step("Fetching MLM system settings");
  const cacheManager = CacheManager.getInstance();
  const settings = await cacheManager.getSettings();
  const mlmSystem = settings.has("mlmSystem")
    ? settings.get("mlmSystem")
    : null;

  // For DIRECT system, skip node creation.
  if (mlmSystem === "DIRECT") {
    ctx?.success("Referral created successfully (DIRECT system)");
    return newReferral;
  } else if (mlmSystem === "BINARY") {
    ctx?.step("Creating binary node structure");
    await handleBinaryMlmReferralRegister(
      referrerId,
      newReferral,
      models.mlmBinaryNode
    );
  } else if (mlmSystem === "UNILEVEL") {
    ctx?.step("Creating unilevel node structure");
    await handleUnilevelMlmReferralRegister(
      referrerId,
      newReferral,
      models.mlmUnilevelNode
    );
  }

  ctx?.success("Referral created successfully");
  return newReferral;
};
