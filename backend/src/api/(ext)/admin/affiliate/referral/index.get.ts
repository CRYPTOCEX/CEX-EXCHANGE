// /server/api/mlm/referrals/index.get.ts

import { models } from "@b/db";

import { crudParameters, paginationSchema } from "@b/utils/constants";
import { getFiltered } from "@b/utils/query";
import {
  notFoundResponse,
  serverErrorResponse,
  unauthorizedResponse,
} from "@b/utils/schema/errors";
import { mlmReferralSchema } from "./utils";

export const metadata: OperationObject = {
  summary: "Lists all affiliate referrals with pagination and filtering",
  description:
    "Retrieves a paginated list of all affiliate referral records in the system. Each referral includes information about the referrer and referred user. Supports filtering, sorting, and searching through query parameters.",
  operationId: "listAffiliateReferrals",
  tags: ["Admin", "Affiliate", "Referral"],
  parameters: crudParameters,
  responses: {
    200: {
      description: "List of affiliate referrals with pagination information",
      content: {
        "application/json": {
          schema: {
            type: "object",
            properties: {
              items: {
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
    404: notFoundResponse("Affiliate Referrals"),
    500: serverErrorResponse,
  },
  requiresAuth: true,
  permission: "view.affiliate.referral",
  logModule: "ADMIN_AFFILIATE",
  logTitle: "List affiliate referrals",
  demoMask: ["items.referrer.email", "items.referred.email"],
};

export default async (data: Handler) => {
  const { query, ctx } = data;

  ctx?.step("Fetching affiliate referrals with user details");
  const result = getFiltered({
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

  ctx?.success("Referrals fetched successfully");
  return result;
};
