import { updateRecord } from "@b/utils/query";
import { mlmReferralRewardUpdateSchema } from "../utils";
import {
  unauthorizedResponse,
  serverErrorResponse,
  badRequestResponse,
  notFoundResponse,
} from "@b/utils/schema/errors";

export const metadata: OperationObject = {
  summary: "Update a specific affiliate reward",
  operationId: "updateAffiliateReward",
  tags: ["Admin", "Affiliate", "Reward"],
  description:
    "Updates the reward amount and claimed status for a specific affiliate referral reward.",
  parameters: [
    {
      name: "id",
      in: "path",
      description: "ID of the affiliate reward to update",
      required: true,
      schema: {
        type: "string",
      },
    },
  ],
  requestBody: {
    required: true,
    description: "Updated reward data",
    content: {
      "application/json": {
        schema: mlmReferralRewardUpdateSchema,
      },
    },
  },
  responses: {
    200: {
      description: "Affiliate reward updated successfully",
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
    404: notFoundResponse("Affiliate Reward"),
    500: serverErrorResponse,
  },
  requiresAuth: true,
  permission: "edit.affiliate.reward",
  logModule: "ADMIN_AFFILIATE",
  logTitle: "Update affiliate reward",
};

export default async (data) => {
  const { body, params, ctx } = data;
  const { id } = params;

  ctx?.step("Validating update data");
  const updatedFields = {
    reward: body.reward,
    isClaimed: body.isClaimed,
  };

  ctx?.step(`Updating reward with ID: ${id}`);
  const result = await updateRecord("mlmReferralReward", id, updatedFields);

  ctx?.success("Reward updated successfully");
  return result;
};
