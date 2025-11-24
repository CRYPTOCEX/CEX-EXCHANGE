// /server/api/mlm/referrals/index.get.ts

import { models } from "@b/db";

import { crudParameters, paginationSchema } from "@b/utils/constants";
import {
  getFiltered,
  notFoundMetadataResponse,
  serverErrorResponse,
  unauthorizedResponse,
} from "@b/utils/query";
import { mlmReferralSchema } from "./utils";

export const metadata: OperationObject = {
  summary: "Lists all MLM Referrals with pagination and optional filtering",
  operationId: "listMlmReferrals",
  tags: ["Admin", "MLM", "Referrals"],
  parameters: crudParameters,
  responses: {
    200: {
      description: "List of MLM Referrals with pagination information",
      content: {
        "application/json": {
          schema: {
            type: "object",
            properties: {
              data: {
                type: "array",
                items: {
                  type: "object",
                  properties: mlmReferralSchema,
                },
              },
              pagination: paginationSchema,
            },
          },
        },
      },
    },
    401: unauthorizedResponse,
    404: notFoundMetadataResponse("MLM Referrals"),
    500: serverErrorResponse,
  },
  requiresAuth: true,
  permission: "view.affiliate.referral",
};

export default async (data: Handler) => {
  const { query } = data;

  // Call the generic fetch function
  return getFiltered({
    model: models.mlmReferral,
    query,
    sortField: query.sortField || "createdAt",
    includeModels: [
      {
        model: models.user,
        as: "referrer",
        attributes: ["id", "firstName", "lastName", "email", "avatar"],
      },
      {
        model: models.user,
        as: "referred",
        attributes: ["id", "firstName", "lastName", "email", "avatar"],
      },
    ],
  });
};
