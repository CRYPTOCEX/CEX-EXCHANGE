// /server/api/mlm/referral-conditions/index.get.ts

import { models } from "@b/db";

import { crudParameters, paginationSchema } from "@b/utils/constants";
import { getFiltered } from "@b/utils/query";
import {
  unauthorizedResponse,
  serverErrorResponse,
  notFoundResponse,
} from "@b/utils/schema/errors";
import { mlmReferralConditionSchema } from "./utils";

export const metadata: OperationObject = {
  summary: "Lists all affiliate conditions with pagination and filtering",
  description:
    "Retrieves a paginated list of all affiliate conditions. Supports filtering, sorting, and searching through various condition parameters. Returns conditions with reward details, types, and status information.",
  operationId: "listAffiliateConditions",
  tags: ["Admin", "Affiliate", "Condition"],
  parameters: crudParameters,
  responses: {
    200: {
      description: "Affiliate conditions retrieved successfully",
      content: {
        "application/json": {
          schema: {
            type: "object",
            properties: {
              items: {
                type: "array",
                items: {
                  type: "object",
                  properties: mlmReferralConditionSchema,
                },
              },
              pagination: paginationSchema,
            },
          },
        },
      },
    },
    401: unauthorizedResponse,
    404: notFoundResponse("Affiliate Conditions"),
    500: serverErrorResponse,
  },
  requiresAuth: true,
  permission: "view.affiliate.condition",
  logModule: "ADMIN_AFFILIATE",
  logTitle: "List affiliate conditions",
};

export default async (data: Handler) => {
  const { query, ctx } = data;

  ctx?.step("Fetching affiliate conditions");
  const result = getFiltered({
    model: models.mlmReferralCondition,
    query,
    sortField: query.sortField || "id",
    timestamps: false,
  });

  ctx?.success("Conditions fetched successfully");
  return result;
};
