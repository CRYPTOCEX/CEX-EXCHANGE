import { getRecord } from "@b/utils/query";
import {
  unauthorizedResponse,
  notFoundResponse,
  serverErrorResponse,
  singleItemResponse,
} from "@b/utils/schema/errors";
import { baseMailwizardCampaignSchema } from "../utils";
import { models } from "@b/db";
import { applyDemoMask } from "@b/utils/demoMask";

export const metadata = {
  summary: "Get a Mailwizard campaign",
  operationId: "getMailwizardCampaignById",
  tags: ["Admin", "Mailwizard", "Campaigns"],
  description:
    "Retrieves detailed information about a specific Mailwizard campaign including its configuration, status, targets, and associated template details.",
  parameters: [
    {
      index: 0,
      name: "id",
      in: "path",
      required: true,
      description: "ID of the Mailwizard Campaign to retrieve",
      schema: { type: "string" },
    },
  ],
  responses: {
    200: singleItemResponse(
      {
        type: "object",
        properties: {
          ...baseMailwizardCampaignSchema,
          template: {
            type: "object",
            properties: {
              id: { type: "string", description: "Template ID" },
              name: { type: "string", description: "Template name" },
            },
          },
        },
      },
      "Mailwizard campaign retrieved successfully"
    ),
    401: unauthorizedResponse,
    404: notFoundResponse("Mailwizard Campaign"),
    500: serverErrorResponse,
  },
  permission: "view.mailwizard.campaign",
  requiresAuth: true,
  logModule: "ADMIN_MAIL",
  logTitle: "Get Mail Campaign",
};

export default async (data) => {
  const { params, ctx } = data;
  ctx?.step("Fetch mail campaign by ID");

  const result = await getRecord("mailwizardCampaign", params.id, [
    {
      model: models.mailwizardTemplate,
      as: "template",
      attributes: ["id", "name"],
    },
  ]);

  // Parse targets JSON and apply demo mask
  if (result && (result as any).targets) {
    try {
      const targets = JSON.parse((result as any).targets);
      // Apply demo mask to email fields in targets array
      const maskedTargets = applyDemoMask(targets, ["email"]);
      (result as any).targets = JSON.stringify(maskedTargets);
    } catch (error) {
      // If parsing fails, leave targets as is
      console.error("Failed to parse targets for email masking:", error);
    }
  }

  ctx?.success("Get Mail Campaign retrieved successfully");
  return result;
};
