import { models } from "@b/db";
import {
  getFiltered,
  notFoundMetadataResponse,
  serverErrorResponse,
  unauthorizedResponse,
} from "@b/utils/query";
import { crudParameters, paginationSchema } from "@b/utils/constants";

export const metadata: OperationObject = {
  summary: "Lists all KYC templates with pagination and optional filtering",
  operationId: "listKycTemplates",
  tags: ["Admin", "CRM", "KYC Template"],
  parameters: crudParameters,
  responses: {
    200: {
      description: "Paginated list of KYC templates with detailed information",
      content: {
        "application/json": {
          schema: {
            type: "object",
            properties: {
              data: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    id: { type: "string" },
                    name: { type: "string" },
                    description: { type: "string" },
                    status: {
                      type: "string",
                      enum: ["ACTIVE", "DRAFT", "INACTIVE"],
                      description: "Level status",
                    },
                    createdAt: { type: "string", format: "date-time" },
                    updatedAt: { type: "string", format: "date-time" },
                  },
                },
              },
              pagination: paginationSchema,
            },
          },
        },
      },
    },
    401: unauthorizedResponse,
    404: notFoundMetadataResponse("KYC Templates"),
    500: serverErrorResponse,
  },
  requiresAuth: true,
  permission: "view.kyc.level",
};

export default async (data: Handler) => {
  const { query } = data;

  return getFiltered({
    model: models.kycLevel,
    query,
    sortField: query.sortField || "createdAt",
    timestamps: false,
  });
};
