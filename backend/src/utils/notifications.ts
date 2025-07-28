// backend/src/api/utils/notification.ts
import { models } from "@b/db";
import { messageBroker } from "@b/handler/Websocket";
import { taskQueue } from "./task";

export interface NotificationOptions {
  userId: string;
  relatedId?: string;
  title?: string;
  type: "investment" | "message" | "user" | "alert" | "system";
  message: string;
  details?: string;
  link?: string;
  actions?: Array<{
    label: string;
    link?: string;
    primary?: boolean;
    onClick?: () => void;
  }>;
}

export async function createNotification(options: NotificationOptions) {
  try {
    // Wrap the notification creation and sending in a task
    const task = async () => {
      const newRecord = await models.notification.create({
        userId: options.userId,
        relatedId: options.relatedId,
        title: options.title,
        type: options.type,
        message: options.message,
        details: options.details,
        link: options.link,
        actions: options.actions,
        read: false,
      });
      const plainRecord = newRecord.get({ plain: true });

      messageBroker.sendToClientOnRoute("/api/user", options.userId, {
        type: "notification",
        method: "create",
        payload: plainRecord,
      });

      return newRecord;
    };

    // Add the task to the queue and await its completion
    return await taskQueue.add(task);
  } catch (err) {
    console.error("Failed to create notification", err);
    throw err;
  }
}

export async function createAdminNotification(
  permissionName: string,
  title: string,
  message: string,
  type: "investment" | "message" | "user" | "alert" | "system",
  link?: string,
  details?: string,
  actions?: Array<{
    label: string;
    link?: string;
    primary?: boolean;
    onClick?: () => void;
  }>
): Promise<void> {
  try {
    // Find all users whose role includes the specified permission
    const users = await models.user.findAll({
      include: [
        {
          model: models.role,
          as: "role",
          include: [
            {
              model: models.permission,
              as: "permissions",
              through: { attributes: [] },
              where: { name: permissionName },
            },
          ],
          required: true,
        },
      ],
      attributes: ["id"],
    });

    // Create a task for each user to send the notification
    const tasks = users.map((user) => {
      return async () => {
        await createNotification({
          userId: user.id,
          title,
          message,
          type,
          link,
          details,
          actions,
        });
      };
    });

    // Add all tasks to the task queue and wait for them to complete
    await Promise.all(tasks.map((task) => taskQueue.add(task)));
  } catch (error) {
    console.error("Failed to create admin notification", error);
    throw error;
  }
}
