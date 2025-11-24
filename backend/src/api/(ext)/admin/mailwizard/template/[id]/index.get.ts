import {
  getRecord,
  unauthorizedResponse,
  notFoundMetadataResponse,
  serverErrorResponse,
} from "@b/utils/query";
import { baseMailwizardTemplateSchema } from "../utils";

export const metadata = {
  summary:
    "Retrieves detailed information of a specific Mailwizard Template by ID",
  operationId: "getMailwizardTemplateById",
  tags: ["Admin", "Marketing", "Mailwizard Templates"],
  parameters: [
    {
      index: 0,
      name: "id",
      in: "path",
      required: true,
      description: "ID of the Mailwizard Template to retrieve",
      schema: { type: "string" },
    },
  ],
  responses: {
    200: {
      description: "Mailwizard Template details",
      content: {
        "application/json": {
          schema: {
            type: "object",
            properties: baseMailwizardTemplateSchema, // Define this schema in your utils if it's not already defined
          },
        },
      },
    },
    401: unauthorizedResponse,
    404: notFoundMetadataResponse("Mailwizard Template"),
    500: serverErrorResponse,
  },
  permission: "view.mailwizard.template",
  requiresAuth: true,
};

export default async (data) => {
  const { params } = data;

  return await getRecord("mailwizardTemplate", params.id);
};
