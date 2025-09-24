"use client";

import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useRef,
  useCallback,
} from "react";
import WebSocketManager, { WebSocketManagerConfig } from "@/utils/ws";
import { useNotificationsStore } from "@/store/notification-store";

interface WebSocketContextType {
  wsManager: WebSocketManager | null;
}

const WebSocketContext = createContext<WebSocketContextType>({
  wsManager: null,
});

interface WebSocketProviderProps {
  children: React.ReactNode;
  userId: string;
  config?: WebSocketManagerConfig;
}

export const WebSocketProvider = ({
  children,
  userId,
  config,
}: WebSocketProviderProps) => {
  const [wsManager, setWsManager] = useState<WebSocketManager | null>(null);

  // Create the audio element immediately (only on client) with better error handling
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const isPlayingRef = useRef(false);
  const lastPlayTimeRef = useRef(0);
  
  // Initialize audio only once
  useEffect(() => {
    if (typeof Audio !== "undefined" && !audioRef.current) {
      audioRef.current = new Audio("/sound/notification.mp3");
      audioRef.current.preload = "auto";
      audioRef.current.volume = 0.7;
      
      // Add event listeners to track audio state
      audioRef.current.onended = () => {
        isPlayingRef.current = false;
      };
      
      audioRef.current.onerror = (e) => {
        console.warn("Audio failed to load:", e);
        isPlayingRef.current = false;
      };
    }
  }, []);

  // Use a stable reference to the notification handler to prevent WebSocket recreation
  const handleNotificationMessageRef = useRef(
    useNotificationsStore.getState().handleNotificationMessage
  );

  // Update the ref whenever the store changes (but don't recreate WebSocket)
  useEffect(() => {
    handleNotificationMessageRef.current = useNotificationsStore.getState().handleNotificationMessage;
  });

  // Use a ref to avoid re-running the effect for soundEnabled.
  const soundEnabledRef = useRef(useNotificationsStore.getState().soundEnabled);
  const soundEnabled = useNotificationsStore((state) => state.soundEnabled);

  // Update the ref whenever the store value changes.
  useEffect(() => {
    soundEnabledRef.current = soundEnabled;
  }, [soundEnabled]);

  // Effect to unlock audio on first user interaction with throttling
  useEffect(() => {
    let isUnlocked = false;
    
    const unlockAudio = () => {
      if (audioRef.current && !isUnlocked) {
        isUnlocked = true;
        audioRef.current
          .play()
          .then(() => {
            audioRef.current?.pause();
            audioRef.current!.currentTime = 0;
            console.log("Audio unlocked successfully");
          })
          .catch((err) => console.warn("Audio unlock failed:", err));
        document.removeEventListener("click", unlockAudio);
        document.removeEventListener("touchstart", unlockAudio);
      }
    };

    document.addEventListener("click", unlockAudio, { once: true });
    document.addEventListener("touchstart", unlockAudio, { once: true });
    
    return () => {
      document.removeEventListener("click", unlockAudio);
      document.removeEventListener("touchstart", unlockAudio);
    };
  }, []);

  // Throttled audio play function
  const playNotificationSound = useCallback(() => {
    if (!soundEnabledRef.current || !audioRef.current || isPlayingRef.current) {
      return;
    }
    
    const now = Date.now();
    // Throttle audio to prevent spam (min 1 second between notifications)
    if (now - lastPlayTimeRef.current < 1000) {
      return;
    }
    
    lastPlayTimeRef.current = now;
    isPlayingRef.current = true;
    
    audioRef.current.currentTime = 0;
    audioRef.current
      .play()
      .catch((err) => {
        console.warn("Sound blocked by browser:", err);
        isPlayingRef.current = false;
      });
  }, []);

  // Create the WebSocketManager only once per userId/config (removed handleNotificationMessage dependency)
  useEffect(() => {
    // Don't create WebSocket connection if userId is not provided
    if (!userId) {
      console.warn("WebSocketProvider: No userId provided, skipping WebSocket connection");
      return;
    }
    
    // Instantiate the WebSocketManager.
    const manager = new WebSocketManager(`/api/user?userId=${userId}`, config);

    manager.on("open", () => {
      // Subscribe when the connection opens.
      manager.send({ type: "SUBSCRIBE", payload: { type: "auth" } });
    });

    // Listen for messages and handle notification messages.
    const messageHandler = (msg: any) => {
      if (msg.type === "notification") {
        // Update the store with the new notification using stable ref.
        handleNotificationMessageRef.current({
          method: msg.method,
          payload: msg.payload,
        });

        // Play the notification sound with throttling
        playNotificationSound();
      }
    };

    manager.on("message", messageHandler);
    manager.connect();
    setWsManager(manager);

    // Cleanup on unmount.
    return () => {
      manager.off("message", messageHandler);
      manager.disconnect();
    };
  }, [userId, config, playNotificationSound]); // Added playNotificationSound dependency

  return (
    <WebSocketContext.Provider value={{ wsManager }}>
      {children}
    </WebSocketContext.Provider>
  );
};

export const useWebSocket = () => useContext(WebSocketContext);
