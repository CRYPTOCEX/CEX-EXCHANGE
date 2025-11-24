import {
  getRecord,
  unauthorizedResponse,
  notFoundMetadataResponse,
  serverErrorResponse,
} from "@b/utils/query";
import { baseMlmReferralConditionSchema } from "../utils";

export const metadata: OperationObject = {
  summary:
    "Retrieves detailed information of a specific MLM Referral Condition by ID",
  operationId: "getMlmReferralConditionById",
  tags: ["Admin", "MLM", "Referral Conditions"],
  parameters: [
    {
      index: 0,
      name: "id",
      in: "path",
      required: true,
      description: "ID of the MLM Referral Condition to retrieve",
      schema: { type: "string" },
    },
  ],
  responses: {
    200: {
      description: "MLM Referral Condition details",
      content: {
        "application/json": {
          schema: {
            type: "object",
            properties: baseMlmReferralConditionSchema,
          },
        },
      },
    },
    401: unauthorizedResponse,
    404: notFoundMetadataResponse("MLM Referral Condition"),
    500: serverErrorResponse,
  },
  permission: "view.affiliate.condition",
  requiresAuth: true,
};

export default async (data) => {
  const { params } = data;

  return await getRecord("mlmReferralCondition", params.id);
};
