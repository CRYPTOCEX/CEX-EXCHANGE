import { deleteRecordParams, handleSingleDelete } from "@b/utils/query";
import {
  unauthorizedResponse,
  serverErrorResponse,
  notFoundResponse,
} from "@b/utils/schema/errors";

export const metadata: OperationObject = {
  summary: "Delete a specific affiliate reward",
  operationId: "deleteAffiliateReward",
  tags: ["Admin", "Affiliate", "Reward"],
  description:
    "Deletes a single affiliate referral reward by its ID. This operation permanently removes the reward from the system.",
  parameters: deleteRecordParams("Affiliate Reward"),
  responses: {
    200: {
      description: "Affiliate reward deleted successfully",
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
    401: unauthorizedResponse,
    404: notFoundResponse("Affiliate Reward"),
    500: serverErrorResponse,
  },
  permission: "delete.affiliate.reward",
  requiresAuth: true,
  logModule: "ADMIN_AFFILIATE",
  logTitle: "Delete affiliate reward",
};

export default async (data: Handler) => {
  const { params, query, ctx } = data;

  ctx?.step(`Deleting reward with ID: ${params.id}`);
  const result = handleSingleDelete({
    model: "mlmReferralReward",
    id: params.id,
    query,
  });

  ctx?.success("Reward deleted successfully");
  return result;
};
