"use client";

import type React from "react";
import { useState, useEffect, useRef } from "react";
import { useParams } from "next/navigation";
import {
  Send,
  ArrowLeft,
  Clock,
  User,
  Paperclip,
  MoreVertical,
  Download,
  Copy,
  Star,
  Zap,
  Shield,
  CheckCircle2,
  AlertCircle,
  MessageCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Progress } from "@/components/ui/progress";
import { $fetch } from "@/lib/api";
import { wsManager, ConnectionStatus } from "@/services/ws-manager";
import { Link } from "@/i18n/routing";
import { ThemeToggle } from "@/app/[locale]/(dashboard)/admin/builder/components/theme-toggle";
import { useToast } from "@/hooks/use-toast";
import { Lightbox } from "@/components/ui/lightbox";
import { imageUploader } from "@/utils/upload";
import { useUserStore } from "@/store/user";

interface SupportMessage {
  type: "client" | "agent";
  text: string;
  time: string; // or Date, but ISO string is safer for JSON
  userId: string;
  attachment?: string;
}
interface supportTicketAttributes {
  id: string;
  userId: string;
  agentId?: string | null;
  agentName?: string | null;
  subject: string;
  importance: "LOW" | "MEDIUM" | "HIGH";
  status: "PENDING" | "OPEN" | "REPLIED" | "CLOSED";
  messages?: SupportMessage[] | string | null;
  type?: "LIVE" | "TICKET";
  tags?: string[] | null;
  responseTime?: number | null;
  satisfaction?: number | null;
  createdAt?: Date | string;
  deletedAt?: Date | string | null;
  updatedAt?: Date | string;
}
interface Message {
  id: string;
  content: string;
  sender: "user" | "agent";
  timestamp: Date;
  senderName?: string;
  attachments?: string[];
}

// Counter for unique message IDs
let messageIdCounter = 0;
const generateUniqueMessageId = (): string => {
  messageIdCounter += 1;
  return `${Date.now()}-${messageIdCounter}-${Math.random().toString(36).substr(2, 9)}`;
};
const getStatusColor = (status: string) => {
  switch (status) {
    case "PENDING":
      return "bg-gradient-to-r from-yellow-50 to-amber-50 text-yellow-700 border-yellow-200 dark:from-yellow-950 dark:to-amber-950 dark:text-yellow-400 dark:border-yellow-800";
    case "OPEN":
      return "bg-gradient-to-r from-blue-50 to-cyan-50 text-blue-700 border-blue-200 dark:from-blue-950 dark:to-cyan-950 dark:text-blue-400 dark:border-blue-800";
    case "REPLIED":
      return "bg-gradient-to-r from-green-50 to-emerald-50 text-green-700 border-green-200 dark:from-green-950 dark:to-emerald-950 dark:text-green-400 dark:border-green-800";
    case "CLOSED":
      return "bg-gradient-to-r from-gray-50 to-slate-50 text-gray-700 border-gray-200 dark:from-zinc-800 dark:to-slate-800 dark:text-zinc-400 dark:border-zinc-700";
    default:
      return "bg-gradient-to-r from-red-50 to-rose-50 text-red-700 border-red-200 dark:from-red-950 dark:to-rose-950 dark:text-red-400 dark:border-red-800";
  }
};
const getImportanceColor = (importance: string) => {
  switch (importance) {
    case "HIGH":
      return "bg-gradient-to-r from-red-500 to-rose-500 text-white shadow-lg shadow-red-500/25";
    case "MEDIUM":
      return "bg-gradient-to-r from-orange-500 to-amber-500 text-white shadow-lg shadow-orange-500/25";
    case "LOW":
      return "bg-gradient-to-r from-green-500 to-emerald-500 text-white shadow-lg shadow-green-500/25";
    default:
      return "bg-gradient-to-r from-gray-500 to-slate-500 text-white";
  }
};
export default function TicketDetailPage() {
  const params = useParams<{ id: string }>();
  const [ticket, setTicket] = useState<supportTicketAttributes | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [wsConnected, setWsConnected] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const { user } = useUserStore();
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

  // Fetch ticket data
  useEffect(() => {
    const fetchTicketData = async () => {
      if (!params.id) return;
      setIsLoading(true);
      const { data, error } = await $fetch<
        | supportTicketAttributes
        | {
            ticket?: supportTicketAttributes;
            messages?: Message[];
            items?: supportTicketAttributes[];
          }
      >({
        url: `/api/user/support/ticket/${params.id}`,
        silent: true,
        errorMessage: "Failed to load ticket",
      });
      if (data) {
        let ticketData: supportTicketAttributes | null = null;
        let messagesData: Message[] = [];

        // Handle direct ticket object response (most common case)
        if (
          data &&
          typeof data === "object" &&
          "id" in data &&
          "subject" in data
        ) {
          ticketData = data as supportTicketAttributes;
          // Parse messages from the stringified format
          if (ticketData.messages) {
            try {
              let parsedMessages: SupportMessage[] = [];
              if (typeof ticketData.messages === "string") {
                parsedMessages = JSON.parse(ticketData.messages);
              } else if (Array.isArray(ticketData.messages)) {
                parsedMessages = ticketData.messages;
              }
              if (Array.isArray(parsedMessages)) {
                messagesData = parsedMessages.map(
                  (msg: SupportMessage, index: number) => ({
                    id: generateUniqueMessageId(),
                    content: msg.text || "",
                    sender: msg.type === "client" ? "user" : "agent",
                    timestamp: new Date(msg.time),
                    senderName: undefined,
                    attachments: msg.attachment ? [msg.attachment] : [],
                  })
                );
              }
            } catch (e) {
              console.error("Error parsing messages:", e);
              messagesData = [];
            }
          }
        }
        // Handle wrapped response formats
        else if (data && typeof data === "object" && "ticket" in data) {
          const wrappedData = data as {
            ticket: supportTicketAttributes;
            messages?: Message[];
          };
          ticketData = wrappedData.ticket;
          messagesData = wrappedData.messages || [];
        } else if (
          data &&
          typeof data === "object" &&
          "items" in data &&
          Array.isArray(data.items) &&
          data.items.length > 0
        ) {
          const itemsData = data as {
            items: supportTicketAttributes[];
          };
          ticketData = itemsData.items[0];
        }
        if (ticketData) {
          setTicket({
            ...ticketData,
            createdAt: ticketData.createdAt
              ? new Date(ticketData.createdAt)
              : undefined,
            updatedAt: ticketData.updatedAt
              ? new Date(ticketData.updatedAt)
              : undefined,
          });
          setMessages(messagesData);
        }
      }
      setIsLoading(false);
    };
    fetchTicketData();
  }, [params.id]);

  // WebSocket connection for real-time updates
  useEffect(() => {
    if (!ticket?.id) return;
    const connectionId = `ticket-${ticket.id}`;
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
            payload: {
              id: ticket.id,
            },
          },
          connectionId
        );
      }
    };

    // Subscribe to ticket updates
    const handleMessage = (data: any) => {
      if (data.method) {
        switch (data.method) {
          case "update": {
            const { data: updateData } = data;
            setTicket((prev) =>
              prev
                ? {
                    ...prev,
                    ...updateData,
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
            const { data: replyData } = data;
            if (replyData.message) {
              const messageContent = replyData.message.text || replyData.message.content || "";
              const messageTime = new Date(replyData.message.timestamp || replyData.message.time || Date.now());
              const messageSender = replyData.message.sender || (replyData.message.type === "client" ? "user" : "agent");
              
              setMessages((prev) => {
                // Check if there's an optimistic message with the same content and sender that was sent recently (within 10 seconds)
                const optimisticIndex = prev.findIndex(msg => 
                  msg.content === messageContent && 
                  msg.sender === messageSender &&
                  Math.abs(msg.timestamp.getTime() - messageTime.getTime()) < 10000 // Within 10 seconds
                );
                
                const newMessage: Message = {
                  id: replyData.message.id || `server-${replyData.message.time || Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                  content: messageContent,
                  sender: messageSender as "user" | "agent",
                  timestamp: messageTime,
                  senderName: replyData.message.senderName,
                  attachments: replyData.message.attachments || (replyData.message.attachment ? [replyData.message.attachment] : []),
                };
                
                if (optimisticIndex !== -1) {
                  // Replace the optimistic message with the confirmed one
                  const updated = [...prev];
                  updated[optimisticIndex] = newMessage;
                  return updated;
                } else {
                  // Add as new message (this handles messages from other users/agents)
                  return [...prev, newMessage];
                }
              });
            }

            // Update ticket status and updatedAt if provided
            if (replyData.status || replyData.updatedAt) {
              setTicket((prev) =>
                prev
                  ? {
                      ...prev,
                      ...(replyData.status && {
                        status: replyData.status,
                      }),
                      ...(replyData.updatedAt && {
                        updatedAt: new Date(replyData.updatedAt),
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
    wsManager.subscribe(`ticket-${ticket.id}`, handleMessage, connectionId);

    // Cleanup on unmount
    return () => {
      // Send unsubscribe message before closing
      if (wsManager.getStatus(connectionId) === ConnectionStatus.CONNECTED) {
        wsManager.sendMessage(
          {
            action: "UNSUBSCRIBE",
            payload: {
              id: ticket.id,
            },
          },
          connectionId
        );
      }
      wsManager.removeStatusListener(handleStatusChange, connectionId);
      wsManager.unsubscribe(`ticket-${ticket.id}`, handleMessage, connectionId);
      wsManager.close(connectionId);
    };
  }, [ticket?.id]);
  const handleSendMessage = async () => {
    if (!newMessage.trim() || !ticket || !user?.id) return;
    const messageContent = newMessage;
    setNewMessage("");

    // Add user message immediately to UI
    const userMessage: Message = {
      id: generateUniqueMessageId(),
      content: messageContent,
      sender: "user",
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, userMessage]);

    // Send to API with the required format
    const { data, error } = await $fetch({
      url: `/api/user/support/ticket/${params.id}`,
      method: "POST",
      body: {
        type: "client",
        time: new Date().toISOString(),
        userId: user.id,
        text: messageContent,
        attachment: null,
      },
      silent: true,
    });
    
    if (error) {
      console.error("Failed to send message:", error);
      // Remove the optimistically added message on error
      setMessages((prev) => prev.filter((msg) => msg.id !== userMessage.id));
      // Restore the message content to the input
      setNewMessage(messageContent);
      toast({
        title: "Message Failed",
        description: error || "Failed to send message. Please try again.",
        variant: "destructive",
      });
    } else if (data) {
      // Update ticket with latest data from server (but not messages - let WebSocket handle that)
      if (data.data) {
        setTicket((prev) => ({
          ...prev,
          ...data.data,
          messages: prev?.messages, // Keep existing messages array
        }));
      }
    }
  };
  const handleFileUpload = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];
    if (!file || !ticket) return;

    // Check if file is an image
    if (!file.type.startsWith("image/")) {
      toast({
        title: "Invalid File Type",
        description: "Please select an image file (JPG, PNG, GIF, WebP)",
        variant: "destructive",
      });
      return;
    }

    // Check file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      toast({
        title: "File Too Large",
        description: "File size must be less than 10MB",
        variant: "destructive",
      });
      return;
    }

    // Add uploading message to UI
    const uploadingMessage: Message = {
      id: generateUniqueMessageId(),
      content: `Uploading image: ${file.name}...`,
      sender: "user",
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, uploadingMessage]);
    try {
      const uploadResult = await imageUploader({
        file,
        dir: "ticket-attachments",
        size: {
          maxWidth: 1024,
          maxHeight: 768,
        },
      });
      if (uploadResult.success && uploadResult.url) {
        // Remove uploading message
        setMessages((prev) =>
          prev.filter((msg) => msg.id !== uploadingMessage.id)
        );

        // Send image message via API
        const { data, error } = await $fetch({
          url: `/api/user/support/ticket/${params.id}`,
          method: "POST",
          body: {
            type: "client",
            time: new Date().toISOString(),
            userId: user?.id || "",
            text: `Shared an image: ${file.name}`,
            attachment: uploadResult.url,
          },
          silent: true,
        });
        if (!error) {
          // Message will be added via WebSocket, no need to add manually here
          toast({
            title: "Image Uploaded",
            description: "Your image has been shared successfully.",
            variant: "success",
          });
        } else {
          // Remove uploading message on error
          setMessages((prev) =>
            prev.filter((msg) => msg.id !== uploadingMessage.id)
          );
          toast({
            title: "Upload Failed",
            description: error || "Failed to send image message",
            variant: "destructive",
          });
        }
      } else {
        // Remove uploading message on error
        setMessages((prev) =>
          prev.filter((msg) => msg.id !== uploadingMessage.id)
        );
        toast({
          title: "Upload Failed",
          description: uploadResult.error || "Failed to upload image",
          variant: "destructive",
        });
      }
    } catch (error) {
      // Remove uploading message on error
      setMessages((prev) =>
        prev.filter((msg) => msg.id !== uploadingMessage.id)
      );
      console.error("Error uploading file:", error);
      toast({
        title: "Upload Error",
        description: "An error occurred while uploading the image",
        variant: "destructive",
      });
    } finally {
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };
  const exportTicketToJSON = () => {
    if (!ticket) return;
    const exportData = {
      ticket: {
        id: ticket.id,
        subject: ticket.subject,
        status: ticket.status,
        priority: ticket.importance,
        created: ticket.createdAt
          ? new Date(ticket.createdAt).toISOString()
          : null,
        updated: ticket.updatedAt
          ? new Date(ticket.updatedAt).toISOString()
          : null,
        tags: ticket.tags || [],
        agentName: ticket.agentName || "Not assigned",
        responseTime: ticket.responseTime
          ? `${ticket.responseTime} minutes`
          : "N/A",
        satisfaction: ticket.satisfaction || null,
        type: ticket.type,
      },
      conversation: messages.map((msg) => ({
        id: msg.id,
        content: msg.content,
        sender: msg.sender,
        senderName: msg.senderName || (msg.sender === "user" ? "You" : "Agent"),
        timestamp: msg.timestamp.toISOString(),
        attachments: msg.attachments || [],
      })),
      exportedAt: new Date().toISOString(),
      totalMessages: messages.length,
    };
    const dataStr = JSON.stringify(exportData, null, 2);
    const dataBlob = new Blob([dataStr], {
      type: "application/json",
    });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `ticket-${ticket.id}-conversation-${new Date().toISOString().split("T")[0]}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    toast({
      title: "Export Successful",
      description: "Ticket conversation exported to JSON successfully.",
      variant: "success",
    });
  };
  const exportTicketToCSV = () => {
    if (!ticket) return;
    const headers = [
      "Message ID",
      "Timestamp",
      "Sender",
      "Sender Name",
      "Content",
      "Attachments",
    ];
    const csvDataRows = messages.map((msg) => [
      msg.id,
      msg.timestamp.toLocaleString(),
      msg.sender,
      `"${msg.senderName || (msg.sender === "user" ? "You" : "Agent")}"`,
      `"${msg.content.replace(/"/g, '""')}"`,
      `"${msg.attachments?.join(", ") || "None"}"`,
    ]);
    const metadata = [
      ["Ticket Information"],
      ["Ticket ID", ticket.id],
      ["Subject", `"${ticket.subject.replace(/"/g, '""')}"`],
      ["Status", ticket.status],
      ["Priority", ticket.importance],
      [
        "Created",
        ticket.createdAt ? new Date(ticket.createdAt).toLocaleString() : "N/A",
      ],
      ["Agent", ticket.agentName || "Not assigned"],
      [
        "Response Time",
        ticket.responseTime ? `${ticket.responseTime} minutes` : "N/A",
      ],
      ["Tags", `"${ticket.tags?.join(", ") || "None"}"`],
      [""],
      ["Conversation Messages"],
      headers,
    ];
    const csvData = [
      ...metadata.map((row) => row.join(",")),
      ...csvDataRows.map((row) => row.join(",")),
    ].join("\n");
    const dataBlob = new Blob([csvData], {
      type: "text/csv;charset=utf-8;",
    });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `ticket-${ticket.id}-conversation-${new Date(ticket.createdAt || Date.now()).toISOString().split("T")[0]}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    toast({
      title: "Export Successful",
      description: "Ticket conversation exported to CSV successfully.",
      variant: "success",
    });
  };
  const handleCopyTicketLink = (ticketId: string) => {
    const url = `${window.location.origin}/support/ticket/${ticketId}`;
    navigator.clipboard
      .writeText(url)
      .then(() => {
        toast({
          title: "Link Copied",
          description: "Ticket link copied to clipboard successfully.",
          variant: "success",
        });
      })
      .catch((err) => {
        console.error("Failed to copy ticket link:", err);
        toast({
          title: "Copy Failed",
          description: "Failed to copy ticket link. Please try again.",
          variant: "destructive",
        });
      });
  };
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50/30 to-indigo-50/20 dark:from-zinc-950 dark:via-blue-950/10 dark:to-indigo-950/10 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-zinc-400">
            Loading ticket details...
          </p>
        </div>
      </div>
    );
  }
  if (!ticket) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50/30 to-indigo-50/20 dark:from-zinc-950 dark:via-blue-950/10 dark:to-indigo-950/10 flex items-center justify-center">
        <div className="text-center">
          <div className="w-24 h-24 bg-gradient-to-r from-red-500 to-rose-500 rounded-full flex items-center justify-center mb-6 shadow-xl">
            <AlertCircle className="h-12 w-12 text-white" />
          </div>
          <h3 className="text-2xl font-bold mb-3 text-gray-900 dark:text-zinc-100">
            Ticket not found
          </h3>
          <p className="text-gray-600 dark:text-zinc-400 text-center mb-8 max-w-md">
            The ticket you're looking for doesn't exist or you don't have
            permission to view it.
          </p>
          <Link href="/support">
            <Button className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Support
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  // Generate status timeline based on ticket data
  const statusTimeline = [
    {
      status: "Created",
      time: ticket.createdAt ? new Date(ticket.createdAt).toISOString() : null,
      completed: true,
    },
    {
      status: "Agent Assigned",
      time:
        ticket.agentId && ticket.createdAt
          ? new Date(ticket.createdAt).toISOString()
          : null,
      completed: !!ticket.agentId,
    },
    {
      status: "In Progress",
      time:
        (ticket.status === "OPEN" ||
          ticket.status === "REPLIED" ||
          ticket.status === "CLOSED") &&
        ticket.updatedAt
          ? new Date(ticket.updatedAt).toISOString()
          : null,
      completed:
        ticket.status === "OPEN" ||
        ticket.status === "REPLIED" ||
        ticket.status === "CLOSED",
    },
    {
      status: "Resolved",
      time:
        ticket.status === "CLOSED" && ticket.updatedAt
          ? new Date(ticket.updatedAt).toISOString()
          : null,
      completed: ticket.status === "CLOSED",
    },
  ];
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50/30 to-indigo-50/20 dark:from-zinc-950 dark:via-blue-950/10 dark:to-indigo-950/10">
      <div className="container mx-auto p-6 max-w-7xl">
        <div className="mb-6">
          {/* Enhanced Header */}
          <Card className="border-0 bg-gradient-to-r from-white via-blue-50/50 to-indigo-50/30 dark:from-zinc-900 dark:via-blue-950/20 dark:to-indigo-950/10 shadow-xl backdrop-blur-sm rounded-2xl overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-r from-blue-600/5 to-indigo-600/5 dark:from-blue-400/5 dark:to-indigo-400/5"></div>
            <CardHeader className="relative bg-white/50 dark:bg-zinc-900/50 backdrop-blur-sm">
              <div className="flex items-start justify-between">
                <div className="flex-1 space-y-4">
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-xl shadow-lg">
                      <MessageCircle className="h-6 w-6 text-white" />
                    </div>
                    <div>
                      <CardTitle className="text-2xl text-gray-900 dark:text-zinc-100 mb-2">
                        {ticket.subject}
                      </CardTitle>
                      <CardDescription className="text-gray-600 dark:text-zinc-400 flex items-center gap-4">
                        <span className="font-medium">
                          Ticket #{ticket.id.slice(0, 8)}
                        </span>
                        <span>•</span>
                        <span>
                          Created{" "}
                          {ticket.createdAt
                            ? new Date(ticket.createdAt).toLocaleDateString()
                            : "N/A"}
                        </span>
                        <span>•</span>
                        <div className="flex items-center gap-2">
                          <Zap className="h-4 w-4 text-green-500" />
                          <span className="text-green-600 dark:text-green-400">
                            Response: {ticket.responseTime || 0}min
                          </span>
                        </div>
                      </CardDescription>
                    </div>
                  </div>
                  {ticket.tags && Array.isArray(ticket.tags) && ticket.tags.length > 0 && (
                    <div className="flex gap-2">
                      {ticket.tags.map((tag) => (
                        <Badge
                          key={tag}
                          variant="secondary"
                          className="text-xs bg-gradient-to-r from-gray-100 to-gray-200 dark:from-zinc-800 dark:to-zinc-700 text-gray-700 dark:text-zinc-300"
                        >
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>
                <div className="flex gap-3 items-start">
                  <Badge
                    className={getImportanceColor(ticket.importance)}
                    variant="outline"
                  >
                    {ticket.importance}
                  </Badge>
                  <Badge
                    className={getStatusColor(ticket.status)}
                    variant="outline"
                  >
                    {ticket.status}
                  </Badge>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="hover:bg-white/80 dark:hover:bg-zinc-800/80 backdrop-blur-sm"
                      >
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent className="bg-white dark:bg-zinc-800 border-gray-200 dark:border-zinc-700">
                      <DropdownMenuItem
                        onClick={exportTicketToJSON}
                        className="hover:bg-gray-50 dark:hover:bg-zinc-700 cursor-pointer"
                      >
                        <Download className="h-4 w-4 mr-2" />
                        Export as JSON
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={exportTicketToCSV}
                        className="hover:bg-gray-50 dark:hover:bg-zinc-700 cursor-pointer"
                      >
                        <Download className="h-4 w-4 mr-2" />
                        Export as CSV
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => handleCopyTicketLink(ticket.id)}
                        className="hover:bg-gray-50 dark:hover:bg-zinc-700 cursor-pointer"
                      >
                        <Copy className="h-4 w-4 mr-2" />
                        Copy Ticket Link
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
            </CardHeader>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Enhanced Chat Area */}
          <div className="lg:col-span-3">
            <Card className="flex flex-col h-[700px] border-0 bg-white/80 dark:bg-zinc-900/80 backdrop-blur-sm shadow-xl rounded-2xl overflow-hidden">
              <CardHeader className="pb-4 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/50 dark:to-indigo-950/50 backdrop-blur-sm">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg text-gray-900 dark:text-zinc-100 flex items-center gap-2">
                    <MessageCircle className="h-5 w-5 text-blue-500" />
                    Conversation
                  </CardTitle>
                  <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-zinc-400">
                    <div
                      className={`w-2 h-2 rounded-full ${wsConnected ? "bg-green-500 animate-pulse" : "bg-gray-400"}`}
                    ></div>
                    <span>
                      {wsConnected ? "Live conversation" : "Connecting..."}
                    </span>
                  </div>
                </div>
                <Separator className="bg-gray-200 dark:bg-zinc-800" />
              </CardHeader>

              <CardContent className="flex-1 overflow-y-auto space-y-6 p-6 bg-gradient-to-b from-gray-50/50 to-white/50 dark:from-zinc-800/50 dark:to-zinc-900/50">
                {messages.map((message, index) => {
                  return (
                    <div
                      key={message.id}
                      className={`flex gap-4 ${message.sender === "user" ? "justify-end" : "justify-start"} animate-in slide-in-from-bottom-2 duration-500`}
                      style={{
                        animationDelay: `${index * 100}ms`,
                      }}
                    >
                      {message.sender === "agent" && (
                        <Avatar className="h-10 w-10 border-2 border-white shadow-lg">
                          <AvatarImage src="/img/avatars/agent-placeholder.svg" />
                          <AvatarFallback className="bg-gradient-to-r from-blue-500 to-indigo-500 text-white text-sm">
                            {ticket?.agentName?.split(" ").map((n) => n[0]).join("") || "SA"}
                          </AvatarFallback>
                        </Avatar>
                      )}

                      <div
                        className={`max-w-[75%] ${message.sender === "user" ? "order-first" : ""}`}
                      >
                        {message.sender === "agent" && message.senderName && (
                          <p className="text-sm font-medium mb-2 text-gray-600 dark:text-zinc-400 flex items-center gap-2">
                            <Shield className="h-4 w-4 text-blue-500" />
                            {message.senderName} • Support Agent
                          </p>
                        )}

                        <div
                          className={`rounded-2xl p-4 shadow-lg ${message.sender === "user" ? "bg-gradient-to-r from-blue-500 to-indigo-500 text-white" : "bg-white dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 text-gray-900 dark:text-zinc-100"}`}
                        >
                          {/* Text content */}
                          {message.content && (
                            <p className="text-sm leading-relaxed mb-2">
                              {message.content}
                            </p>
                          )}

                          {/* Image attachments */}
                          {message.attachments &&
                            message.attachments.length > 0 && (
                              <div className="space-y-2">
                                {message.attachments.map(
                                  (attachment, attachmentIndex) => {
                                    // Check if attachment is an image
                                    const isImage = attachment.match(
                                      /\.(jpg|jpeg|png|gif|webp)$/i
                                    );
                                    if (isImage) {
                                      return (
                                        <div
                                          key={`${message.id}-attachment-${attachmentIndex}`}
                                          className="max-w-xs"
                                        >
                                          <Lightbox
                                            src={attachment}
                                            alt={`Attachment ${attachmentIndex + 1}`}
                                            className="rounded-lg max-h-48 w-auto"
                                            wrapperClassName="inline-block"
                                          />
                                        </div>
                                      );
                                    } else {
                                      // Non-image attachments
                                      return (
                                        <div
                                          key={`${message.id}-attachment-${attachmentIndex}`}
                                          className="flex items-center gap-2 p-2 bg-black/10 dark:bg-white/10 rounded-lg"
                                        >
                                          <Paperclip className="h-4 w-4" />
                                          <a
                                            href={attachment}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="text-sm underline hover:no-underline"
                                          >
                                            View Attachment
                                          </a>
                                        </div>
                                      );
                                    }
                                  }
                                )}
                              </div>
                            )}

                          <div className="flex items-center justify-between mt-3">
                            <p
                              className={`text-xs ${message.sender === "user" ? "text-blue-100" : "text-gray-500 dark:text-zinc-400"}`}
                            >
                              <Clock className="h-3 w-3 inline mr-1" />
                              {new Date(message.timestamp).toLocaleTimeString()}
                            </p>
                            {message.sender === "agent" && (
                              <div className="flex items-center gap-1">
                                <CheckCircle2 className="h-3 w-3 text-green-500" />
                                <span className="text-xs text-green-600 dark:text-green-400">
                                  Verified Agent
                                </span>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>

                      {message.sender === "user" && (
                        <Avatar className="h-10 w-10 border-2 border-white shadow-lg">
                          <AvatarImage src={user?.avatar || "/img/avatars/placeholder.webp"} />
                          <AvatarFallback className="bg-gradient-to-r from-gray-500 to-slate-500 text-white">
                            {user?.firstName?.[0]}{user?.lastName?.[0]}
                          </AvatarFallback>
                        </Avatar>
                      )}
                    </div>
                  );
                })}
                <div ref={messagesEndRef} />
              </CardContent>

              <div className="p-6 border-t border-gray-200 dark:border-zinc-800 bg-gradient-to-r from-gray-50 to-white dark:from-zinc-900 dark:to-zinc-800 backdrop-blur-sm">
                {ticket.status !== "CLOSED" ? (
                  <div className="space-y-4">
                    <div className="flex gap-4">
                      <Textarea
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        placeholder="Type your message..."
                        className="flex-1 min-h-[80px] resize-none bg-white dark:bg-zinc-800 border-gray-200 dark:border-zinc-700 rounded-xl focus:ring-2 focus:ring-blue-500 transition-all"
                        onKeyPress={(e) => {
                          if (e.key === "Enter" && !e.shiftKey) {
                            e.preventDefault();
                            handleSendMessage();
                          }
                        }}
                      />
                      <div className="flex flex-col gap-3">
                        <Button
                          onClick={handleSendMessage}
                          disabled={!newMessage.trim()}
                          size="icon"
                          className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-lg hover:shadow-xl transition-all duration-300 h-12 w-12"
                        >
                          <Send className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={() => fileInputRef.current?.click()}
                          className="border-gray-200 dark:border-zinc-700 hover:bg-gray-50 dark:hover:bg-zinc-800 h-12 w-12"
                        >
                          <Paperclip className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-zinc-400">
                      <span>Press Enter to send, Shift+Enter for new line</span>
                      {!wsConnected && (
                        <span className="text-amber-600 dark:text-amber-400">
                          • Using fallback mode
                        </span>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-6">
                    <CheckCircle2 className="h-12 w-12 text-green-500 mx-auto mb-3" />
                    <p className="text-gray-500 dark:text-zinc-400 text-lg">
                      This ticket has been resolved.
                    </p>
                  </div>
                )}
              </div>
            </Card>
          </div>

          {/* Enhanced Sidebar */}
          <div className="lg:col-span-1">
            <div className="space-y-6">
              {/* Agent Info */}
              <Card className="border-0 bg-gradient-to-br from-white to-blue-50/30 dark:from-zinc-900 dark:to-blue-950/20 shadow-xl backdrop-blur-sm rounded-2xl overflow-hidden">
                <CardHeader className="pb-4">
                  <CardTitle className="text-base text-gray-900 dark:text-zinc-100 flex items-center gap-2">
                    <Shield className="h-5 w-5 text-blue-500" />
                    Support Agent
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center gap-4">
                    <Avatar className="h-12 w-12 border-2 border-white shadow-lg">
                      <AvatarImage src="/placeholder.svg?height=48&width=48&query=professional woman" />
                      <AvatarFallback className="bg-gradient-to-r from-blue-500 to-indigo-500 text-white">
                        {ticket.agentName?.split(" ").map((n) => n[0]) || "SA"}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-semibold text-gray-900 dark:text-zinc-100">
                        {ticket.agentName || "Not assigned"}
                      </p>
                      <div className="text-sm text-green-600 dark:text-green-400 flex items-center gap-2">
                        <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                        {ticket.agentId
                          ? "Online • Expert Level"
                          : "Not assigned"}
                      </div>
                    </div>
                  </div>
                  {ticket.agentId && (
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div className="text-center p-3 bg-white/50 dark:bg-zinc-800/50 rounded-xl">
                        <p className="font-semibold text-blue-600 dark:text-blue-400">
                          4.9
                        </p>
                        <p className="text-xs text-gray-600 dark:text-zinc-400">
                          Rating
                        </p>
                      </div>
                      <div className="text-center p-3 bg-white/50 dark:bg-zinc-800/50 rounded-xl">
                        <p className="font-semibold text-green-600 dark:text-green-400">
                          2.5k
                        </p>
                        <p className="text-xs text-gray-600 dark:text-zinc-400">
                          Resolved
                        </p>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Status Timeline */}
              <Card className="border-0 bg-white/80 dark:bg-zinc-900/80 shadow-xl backdrop-blur-sm rounded-2xl">
                <CardHeader>
                  <CardTitle className="text-base text-gray-900 dark:text-zinc-100 flex items-center gap-2">
                    <Clock className="h-5 w-5 text-blue-500" />
                    Progress Timeline
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {statusTimeline.map((item, index) => (
                    <div key={index} className="flex items-center gap-3">
                      <div
                        className={`w-3 h-3 rounded-full ${item.completed ? "bg-gradient-to-r from-green-500 to-emerald-500 shadow-lg shadow-green-500/25" : "bg-gray-300 dark:bg-zinc-600"}`}
                      />
                      <div className="flex-1">
                        <p
                          className={`text-sm font-medium ${item.completed ? "text-gray-900 dark:text-zinc-100" : "text-gray-500 dark:text-zinc-400"}`}
                        >
                          {item.status}
                        </p>
                        {item.time && (
                          <p className="text-xs text-gray-500 dark:text-zinc-400">
                            {new Date(item.time).toLocaleString()}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>

              {/* Ticket Details */}
              <Card className="border-0 bg-white/80 dark:bg-zinc-900/80 shadow-xl backdrop-blur-sm rounded-2xl">
                <CardHeader>
                  <CardTitle className="text-base text-gray-900 dark:text-zinc-100 flex items-center gap-2">
                    <AlertCircle className="h-5 w-5 text-blue-500" />
                    Ticket Details
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-3">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600 dark:text-zinc-400">
                        Created:
                      </span>
                      <span className="text-gray-900 dark:text-zinc-100 font-medium">
                        {ticket.createdAt
                          ? new Date(ticket.createdAt).toLocaleDateString()
                          : "N/A"}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600 dark:text-zinc-400">
                        Last Update:
                      </span>
                      <span className="text-gray-900 dark:text-zinc-100 font-medium">
                        {ticket.updatedAt
                          ? new Date(ticket.updatedAt).toLocaleDateString()
                          : "N/A"}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600 dark:text-zinc-400">
                        Response Time:
                      </span>
                      <span className="text-green-600 dark:text-green-400 font-medium flex items-center gap-1">
                        <Zap className="h-3 w-3" />
                        {ticket.responseTime || 0}min
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600 dark:text-zinc-400">
                        Priority:
                      </span>
                      <Badge
                        className={getImportanceColor(ticket.importance)}
                        variant="outline"
                      >
                        {ticket.importance}
                      </Badge>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600 dark:text-zinc-400">
                        Status:
                      </span>
                      <Badge
                        className={getStatusColor(ticket.status)}
                        variant="outline"
                      >
                        {ticket.status}
                      </Badge>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600 dark:text-zinc-400">
                        Connection:
                      </span>
                      <Badge
                        variant="outline"
                        className={
                          wsConnected
                            ? "text-green-600 border-green-200"
                            : "text-amber-600 border-amber-200"
                        }
                      >
                        {wsConnected ? "Live" : "Fallback"}
                      </Badge>
                    </div>
                  </div>

                  {ticket.satisfaction && (
                    <div className="mt-4 p-4 bg-gradient-to-r from-amber-50 to-yellow-50 dark:from-amber-950/20 dark:to-yellow-950/20 rounded-xl border border-amber-200 dark:border-amber-800">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium text-amber-800 dark:text-amber-200">
                          Satisfaction Rating
                        </span>
                        <div className="flex items-center gap-1">
                          {[...Array(5)].map((_, i) => (
                            <Star
                              key={i}
                              className={`h-4 w-4 ${i < ticket.satisfaction! ? "text-amber-500 fill-current" : "text-gray-300 dark:text-zinc-600"}`}
                            />
                          ))}
                        </div>
                      </div>
                      <Progress
                        value={(ticket.satisfaction / 5) * 100}
                        className="h-2 bg-amber-200 dark:bg-amber-900"
                      />
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </div>

        <input
          ref={fileInputRef}
          type="file"
          multiple
          className="hidden"
          onChange={handleFileUpload}
        />
      </div>
    </div>
  );
}
