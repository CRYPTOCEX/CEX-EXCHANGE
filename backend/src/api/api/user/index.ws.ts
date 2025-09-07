import { handleDirectClientMessage } from "@b/handler/Websocket";
import { models } from "@b/db";

export const metadata = {};

export default async (data: Handler, message: any) => {
  // Parse the message if it's a string.
  if (typeof message === "string") {
    message = JSON.parse(message);
  }

  const { user } = data;
  if (!user?.id) {
    return;
  }

  const { type, payload } = message;

  // Fetch notifications for the user.
  const notifications = await models.notification.findAll({
    where: { userId: user.id },
    order: [["createdAt", "DESC"]],
  });

  // Send notifications to the client using the new direct messaging function.
  await handleDirectClientMessage({
    type: "notifications",
    method: "create",
    clientId: user.id,
    data: notifications.map((n) => n.get({ plain: true })),
  });

  // Fetch announcements with active status.
  const announcements = await models.announcement.findAll({
    where: { status: true },
    order: [["createdAt", "DESC"]],
  });

  // Send announcements to the client using the new direct messaging function.
  await handleDirectClientMessage({
    type: "announcements",
    method: "create",
    clientId: user.id,
    data: announcements.map((a) => a.get({ plain: true })),
  });
};
