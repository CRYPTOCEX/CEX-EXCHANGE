// /api/admin/mailwizard/campaigns/store.post.ts

import { storeRecord } from "@b/utils/query";
import {
  badRequestResponse,
  unauthorizedResponse,
  conflictResponse,
  serverErrorResponse,
  singleItemResponse,
} from "@b/utils/schema/errors";
import {
  mailwizardCampaignUpdateSchema,
  mailwizardCampaignSchema,
} from "./utils";

export const metadata = {
  summary: "Create a new Mailwizard campaign",
  operationId: "createMailwizardCampaign",
  tags: ["Admin", "Mailwizard", "Campaigns"],
  description:
    "Creates a new Mailwizard campaign with the specified configuration. The campaign will be created in PENDING status by default and requires a valid template ID. Name and subject are required fields.",
  requestBody: {
    required: true,
    content: {
      "application/json": {
        schema: mailwizardCampaignUpdateSchema,
      },
    },
  },
  responses: {
    200: singleItemResponse(
      {
        type: "object",
        properties: mailwizardCampaignSchema,
      },
      "Mailwizard campaign created successfully"
    ),
    400: badRequestResponse,
    401: unauthorizedResponse,
    409: conflictResponse("Mailwizard Campaign"),
    500: serverErrorResponse,
  },
  requiresAuth: true,
  permission: "create.mailwizard.campaign",
  logModule: "ADMIN_MAIL",
  logTitle: "Create campaign",
};

export default async (data: Handler) => {
  const { body, ctx } = data;
  const { name, subject, speed, templateId } = body;

  ctx?.step("Creating campaign");
  const result = await storeRecord({
    model: "mailwizardCampaign",
    data: {
      name,
      subject,
      status: "PENDING",
      speed,
      templateId,
    },
  });

  ctx?.success("Campaign created successfully");
  return result;
};
