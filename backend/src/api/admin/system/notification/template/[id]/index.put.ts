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
  logModule: "ADMIN_SYS",
  logTitle: "Update notification template",
};

export default async (data: Handler) => {
  const { body, params, ctx } = data;
  const { id } = params;
  const { subject, emailBody, smsBody, pushBody, email, sms, push } = body;

  ctx?.step("Validating notification template data");

  ctx?.step(`Updating notification template ${id}`);
  const result = await updateRecord("notificationTemplate", id, {
    subject,
    emailBody,
    smsBody,
    pushBody,
    email,
    sms,
    push,
  });

  ctx?.success("Notification template updated successfully");
  return result;
};
