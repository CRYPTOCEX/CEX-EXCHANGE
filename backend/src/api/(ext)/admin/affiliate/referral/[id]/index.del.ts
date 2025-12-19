import {
  deleteRecordParams,
  deleteRecordResponses,
  handleSingleDelete,
} from "@b/utils/query";
import {
  unauthorizedResponse,
  serverErrorResponse,
  notFoundResponse,
} from "@b/utils/schema/errors";

export const metadata: OperationObject = {
  summary: "Deletes a specific affiliate referral",
  description:
    "Permanently deletes an affiliate referral record by ID. This also removes associated MLM node structures (binary/unilevel) and affects the referral network hierarchy.",
  operationId: "deleteAffiliateReferral",
  tags: ["Admin", "Affiliate", "Referral"],
  parameters: deleteRecordParams("Affiliate Referral"),
  responses: {
    200: {
      description: "Affiliate referral deleted successfully",
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
    404: notFoundResponse("Affiliate Referral"),
    500: serverErrorResponse,
  },
  permission: "delete.affiliate.referral",
  requiresAuth: true,
  logModule: "ADMIN_AFFILIATE",
  logTitle: "Delete affiliate referral",
};

export default async (data: Handler) => {
  const { params, query, ctx } = data;

  ctx?.step(`Deleting referral with ID: ${params.id}`);
  const result = handleSingleDelete({
    model: "mlmReferral",
    id: params.id,
    query,
  });

  ctx?.success("Referral deleted successfully");
  return result;
};
