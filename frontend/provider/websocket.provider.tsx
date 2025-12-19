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
  const audioLoadedRef = useRef(false);
  const audioUnlockedRef = useRef(false);

  // Initialize audio only once - use lazy loading to prevent glitches on page load
  useEffect(() => {
    if (typeof Audio !== "undefined" && !audioRef.current) {
      audioRef.current = new Audio();
      // Don't set src yet - we'll load it lazily on first user interaction
      audioRef.current.volume = 0.7;

      // Add event listeners to track audio state
      audioRef.current.onended = () => {
        isPlayingRef.current = false;
      };

      audioRef.current.onerror = () => {
        audioLoadedRef.current = false;
        isPlayingRef.current = false;
      };

      audioRef.current.oncanplaythrough = () => {
        audioLoadedRef.current = true;
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

  // Effect to load and unlock audio on first user interaction (no audible playback)
  useEffect(() => {
    const loadAndUnlockAudio = () => {
      if (audioRef.current && !audioUnlockedRef.current) {
        audioUnlockedRef.current = true;

        // Set the source and start loading
        audioRef.current.src = "/sound/notification.mp3";
        audioRef.current.load();

        // Create a silent AudioContext to unlock audio on iOS/Safari
        // This is more reliable than play/pause which can cause glitches
        try {
          const AudioContext =
            window.AudioContext || (window as any).webkitAudioContext;
          if (AudioContext) {
            const ctx = new AudioContext();
            // Create and immediately stop a silent buffer to unlock
            const buffer = ctx.createBuffer(1, 1, 22050);
            const source = ctx.createBufferSource();
            source.buffer = buffer;
            source.connect(ctx.destination);
            source.start(0);
            source.stop(0);
            // Resume context if suspended (required for some browsers)
            if (ctx.state === "suspended") {
              ctx.resume();
            }
          }
        } catch {
          // AudioContext not available, audio should still work on user interaction
        }

        document.removeEventListener("click", loadAndUnlockAudio);
        document.removeEventListener("touchstart", loadAndUnlockAudio);
        document.removeEventListener("keydown", loadAndUnlockAudio);
      }
    };

    document.addEventListener("click", loadAndUnlockAudio, { once: true });
    document.addEventListener("touchstart", loadAndUnlockAudio, { once: true });
    document.addEventListener("keydown", loadAndUnlockAudio, { once: true });

    return () => {
      document.removeEventListener("click", loadAndUnlockAudio);
      document.removeEventListener("touchstart", loadAndUnlockAudio);
      document.removeEventListener("keydown", loadAndUnlockAudio);
    };
  }, []);

  // Throttled audio play function
  const playNotificationSound = useCallback(() => {
    if (!soundEnabledRef.current || !audioRef.current || isPlayingRef.current) {
      return;
    }

    // Don't play if audio hasn't been loaded yet (user hasn't interacted)
    if (!audioUnlockedRef.current) {
      return;
    }

    const now = Date.now();
    // Throttle audio to prevent spam (min 1 second between notifications)
    if (now - lastPlayTimeRef.current < 1000) {
      return;
    }

    lastPlayTimeRef.current = now;
    isPlayingRef.current = true;

    // Reset to start and play
    audioRef.current.currentTime = 0;

    // Only play if audio is ready
    if (audioLoadedRef.current) {
      audioRef.current.play().catch(() => {
        isPlayingRef.current = false;
      });
    } else {
      // Audio not loaded yet, try to load and play
      audioRef.current.oncanplaythrough = () => {
        audioLoadedRef.current = true;
        audioRef.current?.play().catch(() => {
          isPlayingRef.current = false;
        });
      };
      audioRef.current.load();
    }
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
      // Note: "notifications" (bulk) type is handled by initial HTTP fetch
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
