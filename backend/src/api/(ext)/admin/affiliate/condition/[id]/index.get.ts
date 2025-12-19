import { getRecord } from "@b/utils/query";
import {
  unauthorizedResponse,
  serverErrorResponse,
  notFoundResponse,
} from "@b/utils/schema/errors";
import { baseMlmReferralConditionSchema } from "../utils";

export const metadata: OperationObject = {
  summary: "Retrieves a specific affiliate condition by ID",
  description:
    "Fetches detailed information about a specific affiliate condition including its type, reward configuration, wallet settings, and current status. Returns complete condition details including creation and update timestamps.",
  operationId: "getAffiliateConditionById",
  tags: ["Admin", "Affiliate", "Condition"],
  parameters: [
    {
      index: 0,
      name: "id",
      in: "path",
      required: true,
      description: "ID of the affiliate condition to retrieve",
      schema: { type: "string" },
    },
  ],
  responses: {
    200: {
      description: "Affiliate condition retrieved successfully",
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
    404: notFoundResponse("Affiliate Condition"),
    500: serverErrorResponse,
  },
  permission: "view.affiliate.condition",
  requiresAuth: true,
  logModule: "ADMIN_AFFILIATE",
  logTitle: "Get affiliate condition details",
};

export default async (data) => {
  const { params, ctx } = data;

  ctx?.step(`Fetching condition with ID: ${params.id}`);
  const result = await getRecord("mlmReferralCondition", params.id);

  ctx?.success("Condition details retrieved successfully");
  return result;
};
