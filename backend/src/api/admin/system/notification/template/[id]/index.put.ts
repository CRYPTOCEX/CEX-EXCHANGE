// /api/admin/notifications/[id]/update.put.ts
import { updateRecord, updateRecordResponses } from "@b/utils/query";
import { notificationTemplateUpdateSchema } from "../utils";

export const metadata = {
  summary: "Updates an existing notification template",
  operationId: "updateNotificationTemplate",
  tags: ["Admin", "Notifications"],
  parameters: [
    {
      index: 0,
      name: "id",
      in: "path",
      required: true,
      description: "ID of the notification template to update",
      schema: {
        type: "string",
      },
    },
  ],
  requestBody: {
    required: true,
    description: "Updated data for the notification template",
    content: {
      "application/json": {
        schema: notificationTemplateUpdateSchema,
      },
    },
  },
  responses: updateRecordResponses("Notification Template"),
  requiresAuth: true,
  permission: "edit.notification.template",
};

export default async (data: Handler) => {
  const { body, params } = data;
  const { id } = params;
  const { subject, emailBody, smsBody, pushBody, email, sms, push } = body;

  return await updateRecord("notificationTemplate", id, {
    subject,
    emailBody,
    smsBody,
    pushBody,
    email,
    sms,
    push,
  });
};
