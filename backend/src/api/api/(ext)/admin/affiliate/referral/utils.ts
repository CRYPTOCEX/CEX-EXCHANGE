import {
  baseStringSchema,
  baseDateTimeSchema,
  baseEnumSchema,
} from "@b/utils/schema";

const id = baseStringSchema("ID of the MLM Referral");
const referrerId = baseStringSchema("ID of the referrer");
const referredId = baseStringSchema("ID of the referred");
const status = baseEnumSchema("Status of the referral", [
  "PENDING",
  "ACTIVE",
  "REJECTED",
]);
const createdAt = baseDateTimeSchema("Creation date of the referral");
const updatedAt = baseDateTimeSchema("Last update date of the referral", true);
const deletedAt = baseDateTimeSchema(
  "Deletion date of the MLM Referral, if any"
);

export const mlmReferralSchema = {
  id,
  referrerId,
  referredId,
  status,
  createdAt,
  updatedAt,
};

export const baseMlmReferralSchema = {
  id,
  referrerId,
  referredId,
  status,
  createdAt,
  updatedAt,
  deletedAt,
};

export const mlmReferralUpdateSchema = {
  type: "object",
  properties: {
    status,
  },
  required: ["status"],
};

export const mlmReferralStoreSchema = {
  description: `MLM Referral created or updated successfully`,
  content: {
    "application/json": {
      schema: {
        type: "object",
        properties: baseMlmReferralSchema,
      },
    },
  },
};
