// /server/api/mlm/referral-conditions/index.get.ts

import { models } from "@b/db";

import { crudParameters, paginationSchema } from "@b/utils/constants";
import {
  getFiltered,
  notFoundMetadataResponse,
  serverErrorResponse,
  unauthorizedResponse,
} from "@b/utils/query";
import { mlmReferralConditionSchema } from "./utils";

export const metadata: OperationObject = {
  summary:
    "Lists all MLM Referral Conditions with pagination and optional filtering",
  operationId: "listMlmReferralConditions",
  tags: ["Admin", "MLM", "Referral Conditions"],
  parameters: crudParameters,
  responses: {
    200: {
      description:
        "List of MLM Referral Conditions with pagination information",
      content: {
        "application/json": {
          schema: {
            type: "object",
            properties: {
              data: {
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
    404: notFoundMetadataResponse("MLM Referral Conditions"),
    500: serverErrorResponse,
  },
  requiresAuth: true,
  permission: "view.affiliate.condition",
};

export default async (data: Handler) => {
  const { query } = data;

  // Call the generic fetch function
  return getFiltered({
    model: models.mlmReferralCondition,
    query,
    sortField: query.sortField || "id",
    timestamps: false,
  });
};
