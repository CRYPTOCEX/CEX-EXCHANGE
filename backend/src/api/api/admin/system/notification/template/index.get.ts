// /server/api/admin/notifications/templates/index.get.ts

import { models } from "@b/db";
import { getFiltered } from "@b/utils/query";
import { crudParameters, paginationSchema } from "@b/utils/constants";

export const metadata = {
  summary:
    "Lists all notification templates with pagination and optional filtering",
  operationId: "listNotificationTemplates",
  tags: ["Admin", "Notifications"],
  parameters: crudParameters,
  responses: {
    200: {
      description: "Paginated list of notification templates with details",
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
                    id: {
                      type: "string",
                      description: "ID of the notification template",
                    },
                    name: {
                      type: "string",
                      description: "Name of the notification template",
                    },
                    subject: {
                      type: "string",
                      description: "Subject of the notification template",
                    },
                    emailBody: {
                      type: "string",
                      description: "Email body of the notification template",
                    },
                    smsBody: {
                      type: "string",
                      description: "SMS body of the notification template",
                    },
                    pushBody: {
                      type: "string",
                      description:
                        "Push notification body of the notification template",
                    },
                    shortCodes: {
                      type: "object",
                      description: "Short codes available for the template",
                    },
                    email: {
                      type: "boolean",
                      description: "Whether this template is used for emails",
                    },
                    sms: {
                      type: "boolean",
                      description: "Whether this template is used for SMS",
                    },
                    push: {
                      type: "boolean",
                      description:
                        "Whether this template is used for push notifications",
                    },
                  },
                },
              },
              pagination: paginationSchema,
            },
          },
        },
      },
    },
    401: {
      description:
        "Unauthorized, permission required to view notification templates",
    },
    500: { description: "Internal server error" },
  },
  requiresAuth: true,
  permission: "view.notification.template",
};

export default async (data: Handler) => {
  const { query } = data;

  return getFiltered({
    model: models.notificationTemplate,
    query,
    sortField: query.sortField || "name",
    timestamps: false,
  });
};
