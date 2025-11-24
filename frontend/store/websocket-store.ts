import { create } from "zustand";
import WebSocketManager from "@/lib/websocket-manager";

interface MessageHandler {
  handler: (message: any) => void;
  filter: (message: any) => boolean;
}

interface Subscription {
  type: string;
  payload?: any;
}

interface WebSocketConnection {
  isConnected: boolean;
  wsManager: WebSocketManager | null;
  subscriptions: Subscription[];
  subscriptionQueue: Subscription[];
  isTypeSubscribed: (type: string, payload?: any) => boolean;
}

interface WebSocketState {
  connections: Record<string, WebSocketConnection>;
  messageHandlers: Record<string, MessageHandler[]>;

  createConnection: (
    connectionKey: string,
    path: string,
    options?: WebSocketOptions
  ) => Promise<void>;
  removeConnection: (connectionKey: string) => void;

  send: (connectionKey: string, message: any) => void;

  subscribe: (connectionKey: string, type: string, payload?: any) => void;
  unsubscribe: (connectionKey: string, type: string, payload?: any) => void;

  addMessageHandler: (
    connectionKey: string,
    handler: (message: any) => void,
    filter?: (message: any) => boolean
  ) => void;
  removeMessageHandler: (
    connectionKey: string,
    handler: (message: any) => void
  ) => void;

  isConnectionOpen: (connectionKey: string) => boolean;
}

interface WebSocketOptions {
  onOpen?: () => void;
  onClose?: () => void;
  onError?: (error: Event) => void;
  onMessage?: (message: any) => void;
}

const createWebSocketConnection = (): WebSocketConnection => ({
  isConnected: false,
  wsManager: null,
  subscriptions: [],
  subscriptionQueue: [],
  isTypeSubscribed: function (type: string, payload?: any) {
    return this.subscriptions.some(
      (sub) =>
        sub.type === type &&
        JSON.stringify(sub.payload) === JSON.stringify(payload)
    );
  },
});

export const useWebSocketStore = create<WebSocketState>()((set, get) => ({
  connections: {},
  messageHandlers: {},

  createConnection: async (
    connectionKey: string,
    path: string,
    options?: WebSocketOptions
  ): Promise<void> => {
    const connections = get().connections;
    const connection = connections[connectionKey];

    if (!path) {
      return Promise.reject("Path is invalid");
    }

    if (connection && connection.isConnected) {
      options?.onOpen?.();
      return Promise.resolve();
    }

    const wsManager = new WebSocketManager(path);

    set((state) => ({
      connections: {
        ...state.connections,
        [connectionKey]: {
          isConnected: false,
          wsManager,
          subscriptions: [],
          subscriptionQueue: [],
          isTypeSubscribed: createWebSocketConnection().isTypeSubscribed,
        },
      },
    }));

    wsManager.on("open", () => {
      console.log("WebSocket Connected to", path);

      set((state) => ({
        connections: {
          ...state.connections,
          [connectionKey]: {
            ...state.connections[connectionKey],
            isConnected: true,
          },
        },
      }));

      options?.onOpen?.();

      // Process subscription queue
      const connection = get().connections[connectionKey];
      connection.subscriptionQueue.forEach((sub) => {
        wsManager.send({
          action: "SUBSCRIBE",
          payload: { type: sub.type, ...sub.payload },
        });
      });

      set((state) => ({
        connections: {
          ...state.connections,
          [connectionKey]: {
            ...state.connections[connectionKey],
            subscriptionQueue: [],
          },
        },
      }));
    });

    wsManager.on("close", () => {
      console.log("WebSocket Disconnected from", path);

      set((state) => ({
        connections: {
          ...state.connections,
          [connectionKey]: {
            ...state.connections[connectionKey],
            isConnected: false,
          },
        },
      }));

      options?.onClose?.();
    });

    wsManager.on("error", (error) => {
      console.error("WebSocket error on", path, ":", error);
      options?.onError?.(error);
    });

    wsManager.on("message", (message) => {
      const handlers = get().messageHandlers[connectionKey] || [];
      handlers.forEach(({ handler, filter }) => {
        if (filter(message)) {
          handler(message);
        }
      });

      options?.onMessage?.(message);
    });

    wsManager.connect();
  },

  removeConnection: (connectionKey: string) => {
    const connections = get().connections;
    const connection = connections[connectionKey];

    if (connection && connection.isConnected && connection.wsManager) {
      connection.wsManager.disconnect();

      set((state) => ({
        connections: {
          ...state.connections,
          [connectionKey]: {
            ...state.connections[connectionKey],
            isConnected: false,
            wsManager: null,
          },
        },
      }));
    }
  },

  send: (connectionKey: string, message: any) => {
    const connections = get().connections;
    const connection = connections[connectionKey];

    if (connection && connection.isConnected && connection.wsManager) {
      connection.wsManager.send(message);
    }
  },

  subscribe: (connectionKey: string, type: string, payload?: any) => {
    const connections = get().connections;
    const connection = connections[connectionKey];

    if (!connection) return;

    if (!connection.isTypeSubscribed(type, payload)) {
      const newSubscription = { type, payload };

      set((state) => ({
        connections: {
          ...state.connections,
          [connectionKey]: {
            ...state.connections[connectionKey],
            subscriptions: [
              ...state.connections[connectionKey].subscriptions,
              newSubscription,
            ],
          },
        },
      }));

      if (connection.wsManager?.isConnected()) {
        connection.wsManager.send({
          action: "SUBSCRIBE",
          payload: { type, ...payload },
        });
      } else {
        set((state) => ({
          connections: {
            ...state.connections,
            [connectionKey]: {
              ...state.connections[connectionKey],
              subscriptionQueue: [
                ...state.connections[connectionKey].subscriptionQueue,
                newSubscription,
              ],
            },
          },
        }));
      }
    }
  },

  unsubscribe: (connectionKey: string, type: string, payload?: any) => {
    const connections = get().connections;
    const connection = connections[connectionKey];

    if (!connection) return;

    set((state) => ({
      connections: {
        ...state.connections,
        [connectionKey]: {
          ...state.connections[connectionKey],
          subscriptions: state.connections[connectionKey].subscriptions.filter(
            (sub) =>
              sub.type !== type ||
              JSON.stringify(sub.payload) !== JSON.stringify(payload)
          ),
        },
      },
    }));

    if (connection.wsManager?.isConnected()) {
      connection.wsManager.send({
        action: "UNSUBSCRIBE",
        payload: { type, ...payload },
      });
    }
  },

  addMessageHandler: (
    connectionKey: string,
    handler: (message: any) => void,
    filter: (message: any) => boolean = () => true
  ) => {
    set((state) => ({
      messageHandlers: {
        ...state.messageHandlers,
        [connectionKey]: [
          ...(state.messageHandlers[connectionKey] || []),
          { handler, filter },
        ],
      },
    }));
  },

  removeMessageHandler: (
    connectionKey: string,
    handler: (message: any) => void
  ) => {
    set((state) => ({
      messageHandlers: {
        ...state.messageHandlers,
        [connectionKey]: (state.messageHandlers[connectionKey] || []).filter(
          (item) => item.handler !== handler
        ),
      },
    }));
  },

  isConnectionOpen: (connectionKey: string): boolean => {
    const connections = get().connections;
    const connection = connections[connectionKey];
    return connection?.isConnected || false;
  },
}));

export default useWebSocketStore;
