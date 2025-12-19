// /server/api/admin/kyc/applications/[id].get.ts

import {
  getRecord,
  unauthorizedResponse,
  notFoundMetadataResponse,
  serverErrorResponse,
} from "@b/utils/query";
import { kycApplicationSchema } from "../utils"; // Assuming the schema is in a separate file.
import { models } from "@b/db";

export const metadata: OperationObject = {
  summary: "Retrieves a specific KYC application by ID",
  operationId: "getKycApplicationById",
  tags: ["Admin", "CRM", "KYC"],
  parameters: [
    {
      index: 0,
      name: "id",
      in: "path",
      required: true,
      description: "ID of the KYC application to retrieve",
      schema: { type: "string" },
    },
  ],
  responses: {
    200: {
      description: "KYC application details",
      content: {
        "application/json": {
          schema: {
            type: "object",
            properties: kycApplicationSchema,
          },
        },
      },
    },
    401: unauthorizedResponse,
    404: notFoundMetadataResponse("KYC application not found"),
    500: serverErrorResponse,
  },
  requiresAuth: true,
  permission: "view.kyc.application",
  logModule: "ADMIN_CRM",
  logTitle: "View KYC application",
  demoMask: ["user.email", "user.phone"],
};

export default async (data: Handler) => {
  const { params, ctx } = data;

  ctx?.step(`Fetching KYC application ${params.id}`);
  const result = await getRecord("kycApplication", params.id, [
    {
      model: models.user,
      as: "user",
      attributes: [
        "id",
        "email",
        "avatar",
        "firstName",
        "lastName",
        "emailVerified",
        "phone",
        "lastLogin",
        "lastFailedLogin",
        "failedLoginAttempts",
        "status",
        "createdAt",
        "profile",
      ],
      includeModels: [
        {
          model: models.role,
          as: "role",
          attributes: ["id", "name"],
          includeModels: [
            {
              model: models.permission,
              as: "permissions",
              attributes: ["id", "name"],
              through: {
                attributes: [],
              },
            },
          ],
        },
      ],
    },
    {
      model: models.kycLevel,
      as: "level",
      paranoid: false, // kycLevel doesn't have soft deletes
      includeModels: [
        {
          model: models.kycVerificationService,
          as: "verificationService",
        },
      ],
    },
    {
      model: models.kycVerificationResult,
      as: "verificationResult",
    },
  ]);

  ctx?.success("KYC application retrieved successfully");
  return result;
};
