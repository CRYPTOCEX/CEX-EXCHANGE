"use client";

import { useEffect, useRef } from "react";

// Extend the Window interface to include our custom properties
declare global {
  interface Window {
    __chartWebSockets?: WebSocket[];
  }
}

/**
 * Hook to manage WebSocket cleanup when navigating away from a page
 * @param selector CSS selector for elements that might contain WebSocket references
 */
export function useWebSocketCleanup(selector = ".chart-container") {
  // Track if we've already cleaned up
  const hasCleanedUpRef = useRef(false);

  useEffect(() => {
    // This runs when the component mounts
    console.log("WebSocket cleanup hook initialized");

    // Return a cleanup function that runs when the component unmounts
    return () => {
      // Prevent duplicate cleanup
      if (hasCleanedUpRef.current) return;
      hasCleanedUpRef.current = true;

      console.log("Running WebSocket cleanup on page navigation");

      // Find all chart containers
      const containers = document.querySelectorAll(selector);

      // For each container, try to access its WebSocket reference and close it
      containers.forEach((container) => {
        try {
          // Try to access the WebSocket reference we stored on the DOM element
          const ws = (container as any).__chartWebSocket;

          if (
            ws &&
            ws.readyState !== WebSocket.CLOSED &&
            ws.readyState !== WebSocket.CLOSING
          ) {
            console.log("Closing WebSocket connection on page navigation");
            ws.close();
          }
        } catch (e) {
          console.error("Error during WebSocket cleanup:", e);
        }
      });

      // Also try to find any global WebSocket references
      if (window.__chartWebSockets) {
        try {
          const webSockets = window.__chartWebSockets;
          webSockets.forEach((ws) => {
            if (
              ws &&
              ws.readyState !== WebSocket.CLOSED &&
              ws.readyState !== WebSocket.CLOSING
            ) {
              console.log("Closing global WebSocket connection");
              ws.close();
            }
          });
        } catch (e) {
          console.error("Error closing global WebSockets:", e);
        }
      }
    };
  }, [selector]);
}
