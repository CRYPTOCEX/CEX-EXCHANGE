import {
  getRecord,
  unauthorizedResponse,
  notFoundMetadataResponse,
  serverErrorResponse,
} from "@b/utils/query";
import { baseMailwizardCampaignSchema } from "../utils";
import { models } from "@b/db";

export const metadata = {
  summary:
    "Retrieves detailed information of a specific Mailwizard Campaign by ID",
  operationId: "getMailwizardCampaignById",
  tags: ["Admin","Marketing", "Mailwizard Campaigns"],
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
    200: {
      description: "Mailwizard Campaign details",
      content: {
        "application/json": {
          schema: {
            type: "object",
            properties: baseMailwizardCampaignSchema, // Define this schema in your utils if it's not already defined
          },
        },
      },
    },
    401: unauthorizedResponse,
    404: notFoundMetadataResponse("Mailwizard Campaign"),
    500: serverErrorResponse,
  },
  permission: "view.mailwizard.campaign",
  requiresAuth: true,
};

export default async (data) => {
  const { params } = data;

  return await getRecord("mailwizardCampaign", params.id, [
    {
      model: models.mailwizardTemplate,
      as: "template",
      attributes: ["id", "name"],
    },
  ]);
};
