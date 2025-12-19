import { updateRecord, updateRecordResponses } from "@b/utils/query";
import { mlmReferralConditionUpdateSchema } from "../utils";

export const metadata: OperationObject = {
  summary: "Updates a specific affiliate condition",
  description:
    "Updates an existing affiliate condition's configuration including reward amounts, types, wallet settings, blockchain details, status, and associated images. Allows modification of all condition parameters except the condition type itself.",
  operationId: "updateAffiliateCondition",
  tags: ["Admin", "Affiliate", "Condition"],
  parameters: [
    {
      name: "id",
      in: "path",
      description: "ID of the affiliate condition to update",
      required: true,
      schema: {
        type: "string",
      },
    },
  ],
  requestBody: {
    description: "Updated affiliate condition data",
    content: {
      "application/json": {
        schema: mlmReferralConditionUpdateSchema,
      },
    },
  },
  responses: updateRecordResponses("Affiliate Condition"),
  requiresAuth: true,
  permission: "edit.affiliate.condition",
  logModule: "ADMIN_AFFILIATE",
  logTitle: "Update affiliate condition",
};

export default async (data) => {
  const { body, params, ctx } = data;
  const { id } = params;

  ctx?.step("Validating update data");
  const updatedFields = {
    status: body.status,
    type: body.type,
    reward: body.reward,
    rewardType: body.rewardType,
    rewardWalletType: body.rewardWalletType,
    rewardCurrency: body.rewardCurrency,
    rewardChain: body.rewardChain,
    image: body.image,
  };

  ctx?.step(`Updating condition record with ID: ${id}`);
  const result = await updateRecord("mlmReferralCondition", id, updatedFields);

  ctx?.success("Condition updated successfully");
  return result;
};
