import { updateStatus } from "@b/utils/query";

export const metadata = {
  summary: "Updates the status of a notification template",
  operationId: "updateNotificationTemplateStatus",
  tags: ["Admin", "Notifications"],
  parameters: [
    {
      index: 0,
      name: "id",
      in: "path",
      required: true,
      description: "ID of the notification template to update",
      schema: { type: "string" },
    },
  ],
  requestBody: {
    required: true,
    content: {
      "application/json": {
        schema: {
          type: "object",
          properties: {
            email: {
              type: "boolean",
              description: "Enable or disable template for email notifications",
            },
            sms: {
              type: "boolean",
              description: "Enable or disable template for SMS notifications",
            },
            push: {
              type: "boolean",
              description: "Enable or disable template for push notifications",
            },
          },
          required: ["email", "sms", "push"],
        },
      },
    },
  },
  responses: {
    200: {
      description: "Notification template status updated successfully",
      content: {
        "application/json": {
          schema: {
            type: "object",
            properties: {
              message: {
                type: "string",
                description:
                  "Confirmation message indicating successful update",
              },
            },
          },
        },
      },
    },
    401: { description: "Unauthorized access" },
    500: { description: "Internal server error" },
  },
  requiresAuth: true,
  permission: "edit.notification.template",
};

export default async (data: Handler) => {
  const { body, params } = data;
  const { id } = params;
  const { email, sms, push } = body;
  return Promise.all([
    updateStatus("notificationTemplates", id, email, "email"),
    updateStatus("notificationTemplates", id, sms, "sms"),
    updateStatus("notificationTemplates", id, push, "push"),
  ]).then((results) => ({
    message: "Notification template statuses updated successfully",
  }));
};
