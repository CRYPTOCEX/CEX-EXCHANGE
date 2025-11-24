import { create } from "zustand";
import { toast } from "sonner";
import WebSocketManager from "@/utils/ws";
import { $fetch } from "@/lib/api";
import { useUserStore } from "./user";
import { imageUploader } from "@/utils/upload";

interface TicketState {
  ticket: any | null;
  ws: WebSocketManager | null;
  isSupport: boolean;
  isReplying: boolean;

  setIsSupport: (value: boolean) => void;
  initializeWebSocket: (id: string) => void;
  disconnectWebSocket: () => void;
  fetchTicket: (id: string) => Promise<void>;
  fetchLiveTicket: () => Promise<void>;
  replyToTicket: (message: string, attachment?: string) => Promise<boolean | undefined>;
  handleFileUpload: (file?: File) => Promise<void>;
  resolveTicket: (id: string, status: string) => Promise<void>;
}

export const useSupportStore = create<TicketState>()((set, get) => ({
  ticket: null,
  ws: null,
  isReplying: false,
  isSupport: false,

  setIsSupport: (value: boolean) => {
    set({ isSupport: value });
  },

  initializeWebSocket: (id: string) => {
    const wsPath = `/api/user/support/ticket`;
    const wsManager = new WebSocketManager(wsPath);

    wsManager.connect();

    wsManager.on("open", () => {
      wsManager.send({ action: "SUBSCRIBE", payload: { id } });
    });

    wsManager.on("message", (msg) => {
      if (!msg.method) return;
      switch (msg.method) {
        case "update": {
          const { data } = msg;
          // Merge updated fields into existing ticket
          set({ ticket: { ...get().ticket, ...data } });
          break;
        }
        case "reply": {
          const { data } = msg;
          const currentTicket = get().ticket;
          const messages = currentTicket?.messages || [];
          set({
            ticket: {
              ...currentTicket,
              messages: [...messages, data.message],
              status: data.status,
              updatedAt: data.updatedAt,
            },
          });
          break;
        }
        default:
          break;
      }
    });

    // Unsubscribe on close
    wsManager.on("close", () => {
      wsManager.send({ action: "UNSUBSCRIBE", payload: { id } });
    });

    set({ ws: wsManager });
  },

  disconnectWebSocket: () => {
    const { ws } = get();
    if (ws) {
      ws.disconnect();
      set({ ws: null });
    }
  },

  fetchLiveTicket: async () => {
    try {
      const { data, error } = await $fetch({
        url: `/api/user/support/chat`,
        silent: true,
      });
      if (!error && data?.id) {
        set({ ticket: data });
        get().initializeWebSocket(data.id);
      }
    } catch (error) {
      console.error("Error fetching live ticket:", error);
    }
  },

  fetchTicket: async (id: string) => {
    const { isSupport } = get();
    const url = isSupport
      ? `/api/admin/crm/support/ticket/${id}`
      : `/api/user/support/ticket/${id}`;
    try {
      const { data, error } = await $fetch({
        url,
        silent: true,
      });
      if (error) {
        toast.error("Ticket not found");
      } else {
        set({ ticket: data });
      }
    } catch (err) {
      console.error("Error fetching ticket:", err);
    }
  },

  replyToTicket: async (message, attachment) => {
    const { isSupport, isReplying, ticket } = get();
    if ((!message.trim() && !attachment) || isReplying) return;

    set({ isReplying: true });
    const { user } = useUserStore.getState();
    if (!user) {
      set({ isReplying: false });
      return;
    }

    try {
      const { data, error } = await $fetch({
        url: `/api/user/support/ticket/${ticket?.id}`,
        method: "POST",
        silent: true,
        body: {
          type: isSupport ? "agent" : "client",
          text: message,
          time: new Date().toISOString(),
          userId: user.id,
          attachment: attachment || null,
        },
      });

      // Check if the response indicates an error (e.g., error property or status code)
      if (error) {
        console.error("API Error:", error);
        toast.error(error || "Error sending message.");
        return false;
      }

      // If successful, update the ticket with the new message
      if (data) {
        set({ ticket: data.data || data });
      }
      
      return true;
    } catch (error) {
      console.error("Error replying to ticket:", error);
      toast.error("Error sending message.");
      return false;
    } finally {
      set({ isReplying: false });
    }
  },

  handleFileUpload: async (file) => {
    const { replyToTicket, ticket } = get();
    if (!file || !ticket?.id) return;

    try {
      const response = await imageUploader({
        file,
        dir: `support/tickets/${ticket.id}`,
        size: { maxWidth: 1024, maxHeight: 728 },
      });
      if (response.success) {
        await replyToTicket("", response.url);
      }
    } catch (error) {
      console.error("Error uploading file:", error);
    }
  },

  resolveTicket: async (id, status) => {
    const { isSupport, ticket } = get();
    const url = isSupport
      ? `/api/admin/crm/support/ticket/${id}/status`
      : `/api/user/support/ticket/${id}/close`;

    try {
      // Call the API to update the ticket status
      await $fetch({
        url,
        method: "PUT",
        body: { status },
      });
      // Optimistically update the local ticket state with the new status
      set({ ticket: { ...ticket, status } });
    } catch (error) {
      console.error("Error resolving ticket:", error);
    }
  },
}));
