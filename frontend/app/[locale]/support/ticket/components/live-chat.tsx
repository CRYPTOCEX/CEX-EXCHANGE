"use client";

import type React from "react";

import { useState, useEffect, useRef } from "react";
import {
  MessageCircle,
  X,
  Send,
  Minimize2,
  Maximize2,
  Paperclip,
  Loader2,
  User,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { imageUploader } from "@/utils/upload";
import { $fetch } from "@/lib/api";
import { wsManager, ConnectionStatus } from "@/services/ws-manager";
import { useTranslations } from "next-intl";
import { useUserStore } from "@/store/user";

interface ChatMessage {
  id: string;
  content: string;
  sender: "user" | "agent" | "system";
  timestamp: Date;
  senderName?: string;
  imageUrl?: string;
  fileName?: string;
  sessionId?: string;
  agentProfile?: {
    id: string;
    firstName: string;
    lastName: string;
    avatar: string;
  };
}

interface LiveChatSession {
  id: string;
  userId: string;
  status: "WAITING" | "CONNECTED" | "ENDED";
  queuePosition?: number;
  estimatedWaitTime?: number;
  agentId?: string;
  agentName?: string;
  messages: ChatMessage[];
  createdAt: Date;
  updatedAt: Date;
}

// Add this helper function near the top of the component, after the interfaces
const mapTicketStatusToChatStatus = (
  ticketStatus: string
): "WAITING" | "CONNECTED" | "ENDED" => {
  switch (ticketStatus) {
    case "PENDING":
      return "WAITING";
    case "OPEN":
    case "REPLIED":
      return "CONNECTED";
    case "CLOSED":
      return "ENDED";
    default:
      return "WAITING";
  }
};

// Add this helper function to parse messages
const parseMessages = (messagesData: any): ChatMessage[] => {
  if (!messagesData) return [];

  try {
    let parsedMessages: any[] = [];

    if (typeof messagesData === "string") {
      // Handle double-encoded JSON like "\"[]\""
      const cleanedString = messagesData
        .replace(/^"|"$/g, "")
        .replace(/\\"/g, '"');
      parsedMessages = JSON.parse(cleanedString);
    } else if (Array.isArray(messagesData)) {
      parsedMessages = messagesData;
    }

    return parsedMessages.map((msg: any, index: number) => ({
      id: msg.id || `msg-${Date.now()}-${index}`,
      content: msg.text || msg.content || "",
      sender:
        msg.type === "client"
          ? "user"
          : msg.sender === "user"
            ? "user"
            : "agent",
      timestamp: new Date(msg.time || msg.timestamp || Date.now()),
      senderName: msg.senderName,
      imageUrl: msg.imageUrl || msg.attachment,
      fileName: msg.fileName,
      sessionId: msg.sessionId,
    }));
  } catch (e) {
    console.error("Error parsing messages:", e);
    return [];
  }
};

export default function LiveChat() {
  const t = useTranslations("support/ticket/components/live-chat");
  const { user } = useUserStore();
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [session, setSession] = useState<LiveChatSession | null>(null);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isLoading, setIsLoading] = useState(false); // Fixed: removed duplicate declaration
  const [error, setError] = useState<string | null>(null);
  const [isTextareaFocused, setIsTextareaFocused] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [wsConnected, setWsConnected] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = () => {
    if (messagesEndRef.current) {
      const chatContainer = messagesEndRef.current.closest('.overflow-y-auto');
      if (chatContainer) {
        chatContainer.scrollTop = chatContainer.scrollHeight;
      } else {
        messagesEndRef.current.scrollIntoView({
          behavior: "smooth",
          block: "end",
          inline: "nearest"
        });
      }
    }
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    if (isOpen) {
      setUnreadCount(0);
    }
  }, [isOpen]);

  // Auto-resize textarea based on content
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [newMessage]);

  // WebSocket connection management for live chat
  useEffect(() => {
    if (!session?.id) return;

    const connectionId = "live-chat";
    const wsUrl = `${window.location.protocol === "https:" ? "wss:" : "ws:"}//${window.location.host}/api/user/support/ticket`;


    // Connect to WebSocket
    wsManager.connect(wsUrl, connectionId);

    // Subscribe to WebSocket status changes
    const handleStatusChange = (status: ConnectionStatus) => {
      setWsConnected(status === ConnectionStatus.CONNECTED);

      // Send subscribe message when connected
      if (status === ConnectionStatus.CONNECTED) {
        wsManager.sendMessage(
          {
            action: "SUBSCRIBE",
            payload: { id: session.id },
          },
          connectionId
        );
      }
    };

    // Subscribe to chat messages
    const handleMessage = (data: any) => {
      if (data.method) {
        switch (data.method) {
          case "update": {
            // Now consistently using 'payload' structure
            const updateData = data.payload;
            setSession((prev) =>
              prev && updateData
                ? {
                    ...prev,
                    ...updateData,
                    status: updateData.status
                      ? mapTicketStatusToChatStatus(updateData.status)
                      : prev.status,
                    createdAt: updateData.createdAt
                      ? new Date(updateData.createdAt)
                      : prev.createdAt,
                    updatedAt: updateData.updatedAt
                      ? new Date(updateData.updatedAt)
                      : prev.updatedAt,
                  }
                : null
            );
            break;
          }
          case "reply": {
            // Now consistently using 'payload' structure
            const replyData = data.payload;
            if (replyData && replyData.message) {
              const messageContent = replyData.message.text || replyData.message.content || "";
              const messageTime = new Date(replyData.message.timestamp || replyData.message.time || Date.now());
              const messageSender = replyData.message.sender || (replyData.message.type === "client" ? "user" : "agent");

              const newMessage: ChatMessage = {
                id: replyData.message.id || `server-${replyData.message.time || Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                content: messageContent,
                sender: messageSender,
                timestamp: messageTime,
                senderName: replyData.message.senderName,
                imageUrl: replyData.message.imageUrl,
                fileName: replyData.message.fileName,
                sessionId: session.id,
                agentProfile: replyData.message.agentProfile, // Include agent profile
              };

              setMessages((prev) => {
                // Check if there's an optimistic message with the same content and sender that was sent recently (within 10 seconds)
                const optimisticIndex = prev.findIndex(msg => 
                  msg.content === messageContent && 
                  msg.sender === messageSender &&
                  Math.abs(msg.timestamp.getTime() - messageTime.getTime()) < 10000 // Within 10 seconds
                );
                
                if (optimisticIndex !== -1) {
                  // Replace the optimistic message with the confirmed one
                  const updated = [...prev];
                  updated[optimisticIndex] = newMessage;
                  return updated;
                } else if (prev.some((msg) => msg.id === newMessage.id)) {
                  // Avoid duplicate messages with same ID
                  return prev;
                } else {
                  // Add as new message
                  return [...prev, newMessage];
                }
              });

              // Count new messages for unread badge
              if (!isOpen || isMinimized) {
                setUnreadCount((prev) => prev + 1);
              }
            }

            // Update session status and updatedAt if provided
            if (replyData && (replyData.status || replyData.updatedAt)) {
              setSession((prev) =>
                prev
                  ? {
                      ...prev,
                      ...(replyData.status && {
                        status: mapTicketStatusToChatStatus(replyData.status),
                      }),
                      ...(replyData.updatedAt && {
                        updatedAt: new Date(replyData.updatedAt),
                      }),
                      ...(replyData.agentId && { agentId: replyData.agentId }),
                      ...(replyData.agentName && {
                        agentName: replyData.agentName,
                      }),
                    }
                  : null
              );
            }
            break;
          }
          default:
            console.log("Unknown WebSocket method:", data.method);
            break;
        }
      }
    };

    // Add status listener and message subscriber
    wsManager.addStatusListener(handleStatusChange, connectionId);
    wsManager.subscribe(`ticket-${session.id}`, handleMessage, connectionId);

    // Cleanup on unmount
    return () => {
      // Send unsubscribe message before cleaning up (only if connected)
      if (wsManager.getStatus(connectionId) === ConnectionStatus.CONNECTED) {
        wsManager.sendMessage(
          {
            action: "UNSUBSCRIBE",
            payload: { id: session.id },
          },
          connectionId
        );
      }

      wsManager.removeStatusListener(handleStatusChange, connectionId);
      wsManager.unsubscribe(`ticket-${session.id}`, handleMessage, connectionId);
      // Remove this line: wsManager.close(connectionId)
      // Keep the WebSocket connection open for potential reuse
    };
  }, [session?.id, isOpen, isMinimized]);

  // Listen for external events to open live chat
  useEffect(() => {
    const handleOpenLiveChat = (event: CustomEvent) => {
      const { sessionId } = event.detail || {};
      setIsOpen(true);
      setIsMinimized(false);

      // If a specific session ID is provided, try to resume that session
      if (sessionId && !session) {
        resumeOrStartChat(sessionId);
      } else if (!session) {
        // If no session exists, start a new one
        startLiveChat();
      }
    };

    window.addEventListener(
      "openLiveChat",
      handleOpenLiveChat as EventListener
    );

    return () => {
      window.removeEventListener(
        "openLiveChat",
        handleOpenLiveChat as EventListener
      );
    };
  }, [session]);

  const resumeOrStartChat = async (sessionId?: string) => {
    setIsLoading(true);
    setError(null);

    try {
      // Try to get existing session first
      const { data: existingData, error: fetchError } = await $fetch<any>({
        url: sessionId
          ? `/api/user/support/ticket/${sessionId}`
          : `/api/user/support/chat`,
        silent: true,
      });

      if (existingData && !fetchError) {
        // Check if this is a ticket response (has subject, importance, etc.) or a chat session
        if (
          existingData.type === "LIVE" ||
          existingData.subject === "Live Chat"
        ) {
          // This is a live chat ticket, convert it to session format
          const chatSession: LiveChatSession = {
            id: existingData.id,
            userId: existingData.userId,
            status: mapTicketStatusToChatStatus(existingData.status), // Convert the status here
            agentId: existingData.agentId,
            agentName: existingData.agentName,
            messages: parseMessages(existingData.messages),
            createdAt: new Date(existingData.createdAt),
            updatedAt: new Date(existingData.updatedAt),
          };

          setSession(chatSession); // Set the converted session, not the original ticket
          setMessages(chatSession.messages);
        } else if (existingData.messages !== undefined) {
          // This is already a chat session format
          setSession({
            ...existingData,
            createdAt: new Date(existingData.createdAt),
            updatedAt: new Date(existingData.updatedAt),
          });
          setMessages(
            Array.isArray(existingData.messages) ? existingData.messages : []
          );
        } else {
          // Create new session
          await startLiveChat();
        }
      } else {
        // Create new session
        await startLiveChat();
      }
    } catch (error) {
      console.error("Error resuming chat:", error);
      // Fallback to creating new session
      await startLiveChat();
    } finally {
      setIsLoading(false);
    }
  };

  const startLiveChat = async () => {
    setIsLoading(true);
    setError(null);

    const { data, error } = await $fetch<any>({
      url: "/api/user/support/chat",
      silentSuccess: true,
      errorMessage: "Unable to connect to chat service",
    });

    if (data) {
      // Check if the response is a ticket format that needs conversion
      if (data.type === "LIVE" || data.subject === "Live Chat") {
        const chatSession: LiveChatSession = {
          id: data.id,
          userId: data.userId,
          status: mapTicketStatusToChatStatus(data.status),
          agentId: data.agentId,
          agentName: data.agentName,
          messages: parseMessages(data.messages),
          createdAt: new Date(data.createdAt),
          updatedAt: new Date(data.updatedAt),
        };
        setSession(chatSession);
        setMessages(chatSession.messages);
      } else {
        // Already in session format
        setSession({
          ...data,
          createdAt: new Date(data.createdAt),
          updatedAt: new Date(data.updatedAt),
        });
        setMessages(Array.isArray(data.messages) ? data.messages : []);
      }
    } else if (error) {
      setError(error);
    }

    setIsLoading(false);
  };

  const handleFileUpload = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];
    if (!file || !session) return;

    // Check if file is an image
    if (!file.type.startsWith("image/")) {
      setError("Please select an image file");
      return;
    }

    // Check file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      setError("File size must be less than 10MB");
      return;
    }

    setIsUploading(true);
    setError(null);

    try {
      const uploadResult = await imageUploader({
        file,
        dir: "live-chat-images",
        size: {
          maxWidth: 800,
          maxHeight: 600,
        },
      });

      if (uploadResult.success && uploadResult.url) {
        // Send image message via API (backend will notify WebSocket)
        const { data, error } = await $fetch({
          url: "/api/user/support/chat",
          method: "POST",
          body: {
            sessionId: session.id,
            content: `Shared an image: ${file.name}`,
            sender: "user",
            imageUrl: uploadResult.url,
            fileName: file.name,
          },
          silent: true,
        });

        if (error) {
          setError("Failed to send image");
        }
        // Note: We don't add the message to UI here since it will come via WebSocket
      } else {
        setError(uploadResult.error || "Failed to upload image");
      }
    } catch (error) {
      console.error("Error uploading file:", error);
      setError("Failed to upload image");
    } finally {
      setIsUploading(false);
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || !session) return;

    const messageContent = newMessage;
    setNewMessage("");
    setError(null);

    // Add message optimistically to UI since WebSocket might not be working
    const userMessage: ChatMessage = {
      id: `temp-${Date.now()}`,
      content: messageContent,
      sender: "user",
      timestamp: new Date(),
      sessionId: session.id,
    };
    setMessages((prev) => [...prev, userMessage]);

    // Send via HTTP API
    const { data, error } = await $fetch({
      url: "/api/user/support/chat",
      method: "POST",
      body: {
        sessionId: session.id,
        content: messageContent,
        sender: "user",
      },
      silent: true,
    });

    if (error) {
      console.error("Failed to send message:", error);
      setError("Failed to send message. Please try again.");
      // Remove the optimistic message and restore input
      setMessages((prev) => prev.filter((msg) => msg.id !== userMessage.id));
      setNewMessage(messageContent);
    } else if (data) {
      // Update session with latest data if provided
      if (data.success) {
        // Remove the temporary message since it should come via WebSocket with real ID
        setMessages((prev) => prev.filter((msg) => msg.id !== userMessage.id));
        
        // Update session status if needed
        setSession((prev) => prev ? { ...prev, updatedAt: new Date() } : null);
      }
    }
  };

  const endChat = async () => {
    if (session) {
      // Send unsubscribe message if WebSocket is connected
      const connectionId = "live-chat";
      if (wsManager.getStatus(connectionId) === ConnectionStatus.CONNECTED) {
        wsManager.sendMessage(
          {
            action: "UNSUBSCRIBE",
            payload: { id: session.id },
          },
          connectionId
        );
      }

      // Remove listeners for this specific session
      wsManager.unsubscribe(`ticket-${session.id}`, () => {}, connectionId);

      // Call the API to end the session
      await $fetch({
        url: "/api/user/support/chat",
        method: "DELETE",
        body: { sessionId: session.id },
        silent: true,
      });
    }

    setSession(null);
    setMessages([]);
    setUnreadCount(0);
    setError(null);
    setIsOpen(false);
  };

  const handleCloseChat = () => {
    if (session) {
      const connectionId = "live-chat";
      // Send unsubscribe message if WebSocket is connected
      if (wsManager.getStatus(connectionId) === ConnectionStatus.CONNECTED) {
        wsManager.sendMessage(
          {
            action: "UNSUBSCRIBE",
            payload: { id: session.id },
          },
          connectionId
        );
      }

      // Remove listeners for this specific session
      wsManager.unsubscribe(`ticket-${session.id}`, () => {}, connectionId);
    }

    setIsOpen(false);
    // Keep session data so it can be resumed later
  };

  return (
    <div className="fixed bottom-6 right-6 z-50">
      {!isOpen && (
        <div className="relative">
          <Button
            onClick={() => setIsOpen(true)}
            className="rounded-full h-12 w-12 shadow-2xl hover:shadow-3xl transition-all duration-300 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white transform hover:scale-105"
            size="icon"
          >
            <MessageCircle className="h-5 w-5" />
          </Button>
          {unreadCount > 0 && (
            <Badge className="absolute -top-2 -right-2 h-6 w-6 rounded-full bg-red-500 text-white text-xs flex items-center justify-center animate-bounce">
              {unreadCount}
            </Badge>
          )}
        </div>
      )}

      {isOpen && (
        <Card
          className={`w-96 shadow-2xl border-0 bg-white dark:bg-zinc-900 transition-all duration-300 ${isMinimized ? "h-16" : "h-[32rem]"} rounded-2xl overflow-hidden`}
        >
          <CardHeader className="pb-2 px-4 py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {session?.status === "CONNECTED" && session.agentName && (
                  <Avatar className="h-8 w-8 border-2 border-white/20">
                    <AvatarFallback className="bg-blue-500 text-white text-xs font-semibold">
                      {session.agentName.split(" ").map(n => n[0]).join("").substring(0, 2)}
                    </AvatarFallback>
                  </Avatar>
                )}
                <div>
                  <CardTitle className="text-sm font-medium">
                    {session?.status === "CONNECTED"
                      ? session.agentName || "Support Agent"
                      : session?.status === "WAITING"
                        ? "Waiting for agent..."
                        : "Live Support"}
                  </CardTitle>
                  {session?.status === "WAITING" && session.queuePosition && (
                    <p className="text-xs text-blue-100">
                      {t("position_#")}
                      {session.queuePosition}
                      {session.estimatedWaitTime &&
                        ` • ~${session.estimatedWaitTime}min wait`}
                    </p>
                  )}
                  {session?.status === "CONNECTED" && (
                    <div className="text-xs text-blue-100 flex items-center gap-1">
                      <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                      {t("Online")}
                    </div>
                  )}
                </div>
              </div>
              <div className="flex gap-1">
                {session?.status === "CONNECTED" && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={endChat}
                    className="text-xs text-white hover:bg-white/20 px-2 py-1"
                  >
                    {t("end_chat")}
                  </Button>
                )}
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 text-white hover:bg-white/20"
                  onClick={() => setIsMinimized(!isMinimized)}
                >
                  {isMinimized ? (
                    <Maximize2 className="h-4 w-4" />
                  ) : (
                    <Minimize2 className="h-4 w-4" />
                  )}
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 text-white hover:bg-white/20"
                  onClick={handleCloseChat}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardHeader>

          {!isMinimized && (
            <CardContent className="p-0 flex flex-col h-[28rem]">
              {!session ? (
                <div className="flex-1 flex flex-col items-center justify-center p-6 text-center bg-gradient-to-b from-blue-50 to-white dark:from-zinc-800 dark:to-zinc-900">
                  <div className="w-16 h-16 bg-gradient-to-r from-blue-500 to-blue-600 rounded-full flex items-center justify-center mb-6">
                    <MessageCircle className="h-8 w-8 text-white" />
                  </div>
                  <h3 className="text-lg font-semibold mb-2 text-gray-900 dark:text-zinc-100">
                    {t("start_live_chat")}
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-zinc-400 mb-6 max-w-sm">
                    {t("connect_instantly_with_our_expert_support_team")}.{" "}
                    {t("were_here_to_help_you_with_any_questions_or_issues")}.
                  </p>
                  {error && (
                    <div className="mb-4 p-3 bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 rounded-lg">
                      <p className="text-sm text-red-600 dark:text-red-400">
                        {error}
                      </p>
                    </div>
                  )}
                  <Button
                    onClick={startLiveChat}
                    disabled={isLoading}
                    className="w-full bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
                    size="lg"
                  >
                    <MessageCircle className="h-4 w-4 mr-2" />
                    {isLoading ? "Connecting..." : "Start Chat Now"}
                  </Button>
                </div>
              ) : (
                <>
                  <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50 dark:bg-zinc-800">
                    {session.status === "WAITING" && (
                      <div className="text-center">
                        <div className="inline-flex items-center gap-2 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 px-4 py-2 rounded-full text-sm">
                          <div className="flex gap-1">
                            <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
                            <div
                              className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"
                              style={{ animationDelay: "0.2s" }}
                            ></div>
                            <div
                              className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"
                              style={{ animationDelay: "0.4s" }}
                            ></div>
                          </div>
                          <span>{t("waiting_for_an_agent")}.</span>
                        </div>
                      </div>
                    )}

                    {Array.isArray(messages) &&
                      messages.map((message) => (
                        <div
                          key={message.id}
                          className={`flex gap-3 ${message.sender === "user" ? "justify-end" : "justify-start"} ${
                            message.sender === "system" ? "justify-center" : ""
                          }`}
                        >
                          {message.sender === "agent" && (
                            <Avatar className="h-8 w-8 border-2 border-white shadow-md">
                              {message.agentProfile?.avatar && (
                                <AvatarImage src={message.agentProfile.avatar} alt={`${message.agentProfile.firstName} ${message.agentProfile.lastName}`} />
                              )}
                              <AvatarFallback className="text-xs bg-gradient-to-r from-blue-500 to-blue-600 text-white font-semibold">
                                {(() => {
                                  let initials = "SA";
                                  
                                  // Try to get initials from agent profile first
                                  if (message.agentProfile?.firstName || message.agentProfile?.lastName) {
                                    const firstName = message.agentProfile.firstName || "";
                                    const lastName = message.agentProfile.lastName || "";
                                    initials = `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase().substring(0, 2);
                                  }
                                  // Fall back to sender name
                                  else if (message.senderName) {
                                    initials = message.senderName.split(" ").map(n => n[0]).join("").substring(0, 2);
                                  } 
                                  // Fall back to session agent name
                                  else if (session?.agentName) {
                                    initials = session.agentName.split(" ").map(n => n[0]).join("").substring(0, 2);
                                  }
                                  
                                  return initials;
                                })()}
                              </AvatarFallback>
                            </Avatar>
                          )}

                          <div
                            className={`max-w-[85%] ${message.sender === "user" ? "order-first" : ""}`}
                          >
                            <div
                              className={`rounded-2xl px-4 py-2 ${
                                message.sender === "user"
                                  ? "bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-lg"
                                  : message.sender === "system"
                                    ? "bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200 text-center text-xs py-1 px-3"
                                    : "bg-white dark:bg-zinc-700 border border-gray-200 dark:border-zinc-600 text-gray-900 dark:text-zinc-100 shadow-md"
                              }`}
                            >
                              {message.imageUrl ? (
                                <div className="space-y-2">
                                  <img
                                    src={message.imageUrl || "/placeholder.svg"}
                                    alt={message.fileName || "Uploaded image"}
                                    className="max-w-full h-auto rounded-lg"
                                    style={{ maxHeight: "200px" }}
                                  />
                                  {message.fileName && (
                                    <p
                                      className={`text-xs ${message.sender === "user" ? "text-blue-100" : "text-gray-500 dark:text-zinc-400"}`}
                                    >
                                      {message.fileName}
                                    </p>
                                  )}
                                </div>
                              ) : (
                                <p
                                  className={`text-sm ${message.sender === "system" ? "text-xs" : ""}`}
                                >
                                  {message.content}
                                </p>
                              )}
                              {message.sender !== "system" && (
                                <p
                                  className={`text-xs mt-1 ${
                                    message.sender === "user"
                                      ? "text-blue-100"
                                      : "text-gray-500 dark:text-zinc-400"
                                  }`}
                                >
                                  {new Date(
                                    message.timestamp
                                  ).toLocaleTimeString([], {
                                    hour: "2-digit",
                                    minute: "2-digit",
                                  })}
                                </p>
                              )}
                            </div>
                          </div>

                          {message.sender === "user" && (
                            <Avatar className="h-8 w-8 border-2 border-white shadow-md">
                              <AvatarImage src={user?.avatar || "/placeholder.svg?height=32&width=32&query=user avatar"} />
                              <AvatarFallback className="bg-gradient-to-r from-gray-500 to-gray-600 text-white text-xs">
                                {user?.firstName?.charAt(0) || user?.lastName?.charAt(0) || <User className="h-4 w-4" />}
                              </AvatarFallback>
                            </Avatar>
                          )}
                        </div>
                      ))}

                    {isUploading && (
                      <div className="flex justify-end">
                        <div className="bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-2xl px-4 py-2 shadow-lg">
                          <div className="flex items-center gap-2">
                            <Loader2 className="h-4 w-4 animate-spin" />
                            <span className="text-sm">
                              {t("uploading_image")}.
                            </span>
                          </div>
                        </div>
                      </div>
                    )}

                    <div ref={messagesEndRef} />
                  </div>

                  <div className="p-4 border-t border-gray-200 dark:border-zinc-700 bg-white dark:bg-zinc-900">
                    {session.status === "CONNECTED" ||
                    session.status === "WAITING" ? (
                      <div className="space-y-2">
                        <div className="flex gap-2 items-end">
                          <div className="flex-1 relative">
                            <Textarea
                              ref={textareaRef}
                              value={newMessage}
                              onChange={(e) => setNewMessage(e.target.value)}
                              onFocus={() => setIsTextareaFocused(true)}
                              onBlur={() => setIsTextareaFocused(false)}
                              placeholder={
                                session.status === "WAITING"
                                  ? "Type your message (will be sent when agent connects)..."
                                  : "Type your message..."
                              }
                              className={`flex-1 text-sm resize-none bg-gray-50 dark:bg-zinc-800 border-gray-200 dark:border-zinc-700 rounded-xl focus:ring-2 focus:ring-blue-500 pr-10 transition-all duration-200 ${
                                isTextareaFocused || newMessage.length > 0
                                  ? "min-h-[40px] max-h-[120px]"
                                  : "h-[40px] max-h-[40px] overflow-hidden"
                              }`}
                              style={{
                                height:
                                  isTextareaFocused || newMessage.length > 0
                                    ? "auto"
                                    : "40px",
                              }}
                              onKeyPress={(e) => {
                                if (e.key === "Enter" && !e.shiftKey) {
                                  e.preventDefault();
                                  sendMessage();
                                }
                              }}
                            />
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => fileInputRef.current?.click()}
                              disabled={isUploading}
                              className="absolute right-1 bottom-1 h-6 w-6 text-gray-400 hover:text-gray-600"
                            >
                              {isUploading ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <Paperclip className="h-4 w-4" />
                              )}
                            </Button>
                          </div>
                          <Button
                            onClick={sendMessage}
                            disabled={!newMessage.trim() || isUploading}
                            size="icon"
                            className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white shadow-lg hover:shadow-xl transition-all duration-200 h-[40px] w-[40px] rounded-xl flex-shrink-0"
                          >
                            <Send className="h-4 w-4" />
                          </Button>
                        </div>
                        <div className="flex items-center justify-between text-xs text-gray-500 dark:text-zinc-400">
                          <span>
                            {t("press_enter_to_send_shift+enter_for_new_line")}
                          </span>
                          <div className="flex items-center gap-2">
                            <div
                              className={`w-2 h-2 rounded-full ${wsConnected ? "bg-green-500" : "bg-gray-400"}`}
                            ></div>
                            <span>
                              {wsConnected ? "Connected" : "Connecting..."}
                            </span>
                          </div>
                        </div>
                        {error && (
                          <div className="p-2 bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 rounded-lg">
                            <p className="text-xs text-red-600 dark:text-red-400">
                              {error}
                            </p>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="text-center">
                        <p className="text-sm text-gray-500 dark:text-zinc-400 mb-3">
                          {t("chat_session_has_ended")}
                        </p>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setIsOpen(false)}
                          className="border-gray-200 dark:border-zinc-700 text-gray-900 dark:text-zinc-100"
                        >
                          {t("Close")}
                        </Button>
                      </div>
                    )}
                  </div>
                </>
              )}
            </CardContent>
          )}
        </Card>
      )}

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileUpload}
        className="hidden"
      />
    </div>
  );
}
