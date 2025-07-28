import { create } from "zustand";
import { persist } from "zustand/middleware";
import { $fetch } from "@/lib/api";

export type NotificationAction = {
  label: string;
  primary?: boolean;
  link?: string;
  onClick?: () => void;
};

export type NotificationStats = {
  total: number;
  unread: number;
  types: {
    investment: number;
    message: number;
    alert: number;
    system: number;
    user: number;
  };
  trend: {
    percentage: number;
    increasing: boolean;
  };
};

interface NotificationsState {
  notifications: notificationAttributes[];
  isLoading: boolean;
  error: string | null;
  stats: NotificationStats;
  lastFetched: number | null;
  cacheExpiry: number; // in milliseconds

  fetchNotifications: () => Promise<void>;
  markAsRead: (id: string) => Promise<void>;
  markAsUnread: (id: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  deleteNotification: (id: string) => Promise<void>;
  deleteAllNotifications: () => Promise<void>;
  filterNotifications: (types: string[]) => notificationAttributes[];
  searchNotifications: (query: string) => notificationAttributes[];
  handleNotificationMessage: (msg: {
    method: "create" | "update" | "delete";
    payload: notificationAttributes | { id: string };
  }) => void;

  // New: Sound setting (persisted)
  soundEnabled: boolean;
  toggleSound: () => void;
}

const computeStats = (
  notifications: notificationAttributes[]
): NotificationStats => {
  // Ensure notifications is an array
  const notificationArray = Array.isArray(notifications) ? notifications : [];

  const total = notificationArray.length;
  const unread = notificationArray.filter((n) => !n.read).length;
  const typesCount = notificationArray.reduce(
    (acc, notification) => {
      if (notification.type in acc) {
        acc[notification.type] += 1;
      }
      return acc;
    },
    {
      investment: 0,
      message: 0,
      alert: 0,
      system: 0,
      user: 0,
    } as Record<string, number>
  );

  return {
    total,
    unread,
    types: {
      investment: typesCount.investment,
      message: typesCount.message,
      alert: typesCount.alert,
      system: typesCount.system,
      user: typesCount.user,
    },
    trend: {
      percentage: 0,
      increasing: true,
    },
  };
};

export const useNotificationsStore = create<NotificationsState>()(
  (set, get) => ({
    notifications: [],
    isLoading: false,
    error: null,
    stats: {
      total: 0,
      unread: 0,
      types: {
        investment: 0,
        message: 0,
        alert: 0,
        system: 0,
        user: 0,
      },
      trend: {
        percentage: 0,
        increasing: true,
      },
    },
    lastFetched: null,
    cacheExpiry: 5 * 60 * 1000, // 5 minutes

    fetchNotifications: async () => {
      const now = Date.now();
      const { lastFetched, cacheExpiry, notifications } = get();
      if (
        lastFetched &&
        now - lastFetched < cacheExpiry &&
        notifications.length > 0
      ) {
        return;
      }
      try {
        set({ isLoading: true, error: null });
        const { data, error } = await $fetch({
          url: "/api/user/notification",
          silent: true,
        });
        if (!error && data) {
          // Ensure notifications array exists and is an array
          const notificationsArray = Array.isArray(data.notifications)
            ? data.notifications
            : Array.isArray(data)
              ? data
              : [];

          // Parse the actions field if it's a string
          const parsedNotifications = notificationsArray.map(
            (notification: notificationAttributes) => {
              let actions = notification.actions;
              if (typeof actions === "string") {
                try {
                  actions = JSON.parse(actions);
                } catch (parseError) {
                  console.error(
                    "Error parsing notification actions:",
                    parseError
                  );
                  actions = [];
                }
              }
              // If title is missing, default to an empty string.
              return {
                ...notification,
                actions,
                title: notification.title || "",
              };
            }
          );
          set({
            notifications: parsedNotifications,
            stats: computeStats(parsedNotifications),
            lastFetched: Date.now(),
            isLoading: false,
          });
        } else {
          set({
            isLoading: false,
            error: error || "Failed to fetch notifications",
          });
        }
      } catch (error) {
        console.error("Error fetching notifications:", error);
        set({
          isLoading: false,
          error:
            error instanceof Error
              ? error.message
              : "Failed to fetch notifications",
          notifications: [], // Ensure we have an empty array instead of undefined
        });
      }
    },

    markAsRead: async (id: string) => {
      try {
        const { error } = await $fetch({
          url: `/api/user/notification/${id}/read`,
          method: "POST",
          silent: true,
        });
        if (!error) {
          const { notifications } = get();
          const notificationArray = Array.isArray(notifications)
            ? notifications
            : [];
          const updatedNotifications = notificationArray.map((n) =>
            n.id === id ? { ...n, read: true } : n
          );
          set({
            notifications: updatedNotifications,
            stats: computeStats(updatedNotifications),
          });
        } else {
          console.error("Error marking notification as read:", error);
        }
      } catch (error) {
        console.error("Error marking notification as read:", error);
      }
    },

    markAsUnread: async (id: string) => {
      try {
        const { error } = await $fetch({
          url: `/api/user/notification/${id}/unread`,
          method: "POST",
          silent: true,
        });
        if (!error) {
          const { notifications } = get();
          const notificationArray = Array.isArray(notifications)
            ? notifications
            : [];
          const updatedNotifications = notificationArray.map((n) =>
            n.id === id ? { ...n, read: false } : n
          );
          set({
            notifications: updatedNotifications,
            stats: computeStats(updatedNotifications),
          });
        } else {
          console.error("Error marking notification as unread:", error);
        }
      } catch (error) {
        console.error("Error marking notification as unread:", error);
      }
    },

    markAllAsRead: async () => {
      try {
        const { error } = await $fetch({
          url: "/api/user/notification/mark-all-read",
          method: "POST",
          silent: true,
        });
        if (!error) {
          const { notifications } = get();
          const notificationArray = Array.isArray(notifications)
            ? notifications
            : [];
          const updatedNotifications = notificationArray.map((n) => ({
            ...n,
            read: true,
          }));
          set({
            notifications: updatedNotifications,
            stats: { ...get().stats, unread: 0 },
          });
        } else {
          console.error("Error marking all notifications as read:", error);
        }
      } catch (error) {
        console.error("Error marking all notifications as read:", error);
      }
    },

    deleteNotification: async (id: string) => {
      try {
        const { error } = await $fetch({
          url: `/api/user/notification/${id}`,
          method: "DELETE",
          silent: true,
        });
        if (!error) {
          const { notifications } = get();
          const notificationArray = Array.isArray(notifications)
            ? notifications
            : [];
          const updatedNotifications = notificationArray.filter(
            (n) => n.id !== id
          );
          set({
            notifications: updatedNotifications,
            stats: computeStats(updatedNotifications),
          });
        } else {
          console.error("Error deleting notification:", error);
        }
      } catch (error) {
        console.error("Error deleting notification:", error);
      }
    },

    deleteAllNotifications: async () => {
      try {
        const { error } = await $fetch({
          url: "/api/user/notification",
          method: "DELETE",
          silent: true,
        });
        if (!error) {
          set({
            notifications: [],
            stats: {
              total: 0,
              unread: 0,
              types: {
                investment: 0,
                message: 0,
                alert: 0,
                system: 0,
                user: 0,
              },
              trend: {
                percentage: 0,
                increasing: true,
              },
            },
          });
        } else {
          console.error("Error deleting all notifications:", error);
        }
      } catch (error) {
        console.error("Error deleting all notifications:", error);
      }
    },

    filterNotifications: (types: string[]) => {
      const { notifications } = get();
      const notificationArray = Array.isArray(notifications)
        ? notifications
        : [];
      return notificationArray.filter((n) => types.includes(n.type));
    },

    searchNotifications: (query: string) => {
      const { notifications } = get();
      const notificationArray = Array.isArray(notifications)
        ? notifications
        : [];
      const lowerQuery = query.toLowerCase();
      return notificationArray.filter(
        (n) =>
          n.message.toLowerCase().includes(lowerQuery) ||
          (n.details && n.details.toLowerCase().includes(lowerQuery))
      );
    },

    // Handle incoming websocket messages for notifications
    handleNotificationMessage: (msg: {
      method: "create" | "update" | "delete";
      payload: notificationAttributes | { id: string };
    }) => {
      const { notifications } = get();
      const notificationArray = Array.isArray(notifications)
        ? notifications
        : [];
      let newNotifications = notificationArray;
      if (msg.method === "create") {
        newNotifications = [
          msg.payload as notificationAttributes,
          ...notificationArray,
        ];
      } else if (msg.method === "update") {
        newNotifications = notificationArray.map((n) =>
          n.id === (msg.payload as notificationAttributes).id
            ? { ...n, ...(msg.payload as notificationAttributes) }
            : n
        );
      } else if (msg.method === "delete") {
        const idToDelete =
          typeof msg.payload === "object"
            ? (msg.payload as { id: string }).id
            : (msg.payload as string);
        newNotifications = notificationArray.filter((n) => n.id !== idToDelete);
      }
      set({
        notifications: newNotifications,
        stats: computeStats(newNotifications),
      });
    },

    // New: Sound preference and toggle function.
    soundEnabled: false,
    toggleSound: () => {
      const newVal = !get().soundEnabled;
      set({ soundEnabled: newVal });
    },
  })
);
