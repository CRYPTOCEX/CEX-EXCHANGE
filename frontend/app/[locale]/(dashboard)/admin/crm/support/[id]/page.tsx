"use client";

import type React from "react";
import { useState, useEffect, useRef } from "react";
// Remove useParams import - we'll use props instead
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
  UserCheck,
  Settings,
  Edit3,
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { $fetch } from "@/lib/api";
import { wsManager, ConnectionStatus } from "@/services/ws-manager";
import { useToast } from "@/hooks/use-toast";
import { Lightbox } from "@/components/ui/lightbox";
import { imageUploader } from "@/utils/upload";
import { Link } from "@/i18n/routing";
import { useUserStore } from "@/store/user";
import { useTranslations } from "next-intl";
import { useParams } from "next/navigation";

interface Agent {
  id: string;
  avatar?: string;
  firstName: string;
  lastName: string;
  lastLogin?: string;
}
interface SupportUser {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  avatar?: string;
}
interface UserStats {
  totalTickets: number;
  resolvedTickets: number;
}
interface AgentStats {
  resolved: number;
  avgRating: number | null;
}
interface supportTicketAttributes {
  id: string;
  userId: string;
  agentId?: string | null;
  agentName?: string | null;
  subject: string;
  importance: "LOW" | "MEDIUM" | "HIGH";
  status: "PENDING" | "OPEN" | "REPLIED" | "CLOSED";
  messages?: SupportMessage[] | string | null; // Can be array (new) or JSON string (legacy)
  type?: "LIVE" | "TICKET";
  tags?: string[] | null;
  responseTime?: number | null;
  satisfaction?: number | null;
  createdAt?: Date | string;
  deletedAt?: Date | string | null;
  updatedAt?: Date | string;
  agent?: Agent | null;
  user?: SupportUser | null;
  userStats?: UserStats;
  agentStats?: AgentStats;
}
interface Message {
  id: string;
  content: string;
  sender: "user" | "agent";
  timestamp: Date;
  senderName?: string;
  attachments?: string[];
}
interface SupportMessage {
  id?: string;
  text?: string;
  content?: string;
  type: "client" | "agent";
  time: string;
  timestamp?: string;
  attachment?: string;
  attachments?: string[];
  senderName?: string;
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


export default function AdminTicketDetailPage() {
  const params = useParams() as { id: string };
  
  if (!params?.id) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50/30 to-indigo-50/20 dark:from-zinc-950 dark:via-blue-950/10 dark:to-indigo-950/10 flex items-center justify-center">
        <div className="text-center">
          <div className="w-24 h-24 bg-gradient-to-r from-red-500 to-rose-500 rounded-full flex items-center justify-center mb-6 shadow-xl">
            <AlertCircle className="h-12 w-12 text-white" />
          </div>
          <h3 className="text-2xl font-bold mb-3 text-gray-900 dark:text-zinc-100">
            Invalid Ticket ID
          </h3>
          <p className="text-gray-600 dark:text-zinc-400 text-center mb-8">
            No ticket ID provided in the URL
          </p>
        </div>
      </div>
    );
  }
  
  return <AdminTicketDetailContent ticketId={params.id} />;
}

interface AdminTicketDetailContentProps {
  ticketId: string;
}

function AdminTicketDetailContent({ ticketId }: AdminTicketDetailContentProps) {
  const t = useTranslations("dashboard");
  const [ticket, setTicket] = useState<supportTicketAttributes | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [wsConnected, setWsConnected] = useState(false);
  const [isStatusDialogOpen, setIsStatusDialogOpen] = useState(false);
  const [isAssignDialogOpen, setIsAssignDialogOpen] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState("");
  const [selectedAgent, setSelectedAgent] = useState("");
  const [activeTab, setActiveTab] = useState("conversation");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const { user } = useUserStore();

  // Add validation for ticket ID format
  const isValidTicketId = (id: string): boolean => {
    if (!id || typeof id !== 'string') return false;
    // Check if it's a valid UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    return uuidRegex.test(id);
  };

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

  // Fetch ticket data with better error handling
  useEffect(() => {
    const fetchTicketData = async () => {
      // Validate ticket ID first
      if (!ticketId) {
        setLoadError("No ticket ID provided");
        setIsLoading(false);
        return;
      }

      if (!isValidTicketId(ticketId)) {
        setLoadError(`Invalid ticket ID format: ${ticketId}`);
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);
        setLoadError(null);

        console.log(`[AdminTicketDetail] Fetching ticket: ${ticketId}`);

        const { data, error } = await $fetch<supportTicketAttributes>({
          url: `/api/admin/crm/support/ticket/${ticketId}`,
          silent: true,
        });

        if (error) {
          console.error(`[AdminTicketDetail] API Error:`, error);
          
          // Handle specific error types
          if (error.includes('404') || error.includes('not found')) {
            setLoadError(`Ticket not found: ${ticketId}`);
          } else if (error.includes('403') || error.includes('unauthorized')) {
            setLoadError("You don't have permission to view this ticket");
          } else if (error.includes('500') || error.includes('Internal')) {
            setLoadError("Server error occurred while loading ticket");
          } else {
            setLoadError(`Failed to load ticket: ${error}`);
          }
          return;
        }

        if (!data) {
          console.error(`[AdminTicketDetail] No data received for ticket: ${ticketId}`);
          setLoadError("No ticket data received from server");
          return;
        }

        console.log(`[AdminTicketDetail] Successfully loaded ticket:`, data.id);

        let messagesData: Message[] = [];
        // Handle messages - they can be either an array (from fixed model) or a JSON string (legacy)
        if (data.messages) {
          let parsedMessages: SupportMessage[] = [];
          
          if (Array.isArray(data.messages)) {
            // Already an array (from fixed model getter)
            parsedMessages = data.messages as SupportMessage[];
          } else if (typeof data.messages === 'string') {
            // JSON string (legacy format)
            try {
              parsedMessages = JSON.parse(data.messages);
            } catch (e) {
              console.error("Error parsing messages:", e);
              parsedMessages = [];
            }
          }
          
            if (Array.isArray(parsedMessages)) {
              messagesData = parsedMessages.map(
                (msg: SupportMessage, index: number) => ({
                  id: generateUniqueMessageId(),
                  content: msg.text || "",
                  sender: msg.type === "client" ? "user" : "agent",
                  timestamp: new Date(msg.time),
                  senderName:
                    msg.type === "client"
                      ? `${data.user?.firstName || ""} ${data.user?.lastName || ""}`.trim() ||
                        "Customer"
                      : `${data.agent?.firstName || ""} ${data.agent?.lastName || ""}`.trim() ||
                        "Agent",
                  attachments: msg.attachment ? [msg.attachment] : [],
                })
              );
          }
        }
        
        setTicket({
          ...data,
          createdAt: data.createdAt ? new Date(data.createdAt) : undefined,
          updatedAt: data.updatedAt ? new Date(data.updatedAt) : undefined,
        });
        setMessages(messagesData);
        setSelectedStatus(data.status);
        setSelectedAgent(data.agentId || "");

        console.log(`[AdminTicketDetail] State updated successfully for ticket: ${ticketId}`);
      } catch (error: any) {
        console.error(`[AdminTicketDetail] Unexpected error:`, error);
        
        // Handle different types of errors
        if (error.name === 'TypeError' && error.message.includes('fetch')) {
          setLoadError("Network error: Unable to connect to server");
        } else if (error.name === 'SyntaxError') {
          setLoadError("Server returned invalid response");
        } else {
          setLoadError(error.message || "An unexpected error occurred");
        }
      } finally {
        setIsLoading(false);
      }
    };

    // Add a small delay to ensure component is fully mounted
    const timer = setTimeout(fetchTicketData, 50);
    return () => clearTimeout(timer);
  }, [ticketId]);

  // WebSocket connection for real-time updates with better error handling
  useEffect(() => {
    if (!ticket?.id || !ticketId || typeof window === 'undefined') return;

    let connectionId: string | null = null;
    
    try {
      connectionId = `admin-ticket-${ticket.id}`;
      // This works because we check if window exists first
      const wsUrl = `${typeof window !== 'undefined' && window.location.protocol === "https:" ? "wss:" : "ws:"}//${typeof window !== 'undefined' ? window.location.host : 'localhost'}/api/user/support/ticket`;

      // Connect to WebSocket with error handling
      wsManager.connect(wsUrl, connectionId);

      // Subscribe to WebSocket status changes
      const handleStatusChange = (status: ConnectionStatus) => {
        setWsConnected(status === ConnectionStatus.CONNECTED);
        // Send subscribe message when connected
        if (status === ConnectionStatus.CONNECTED && ticket?.id) {
          wsManager.sendMessage(
            {
              action: "SUBSCRIBE",
              payload: {
                id: ticket.id,
              },
            },
            connectionId!
          );
        }
      };

      // Subscribe to ticket updates
      const handleMessage = (data: any) => {
        try {
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
                  const messageContent = replyData.message.content || replyData.message.text || "";
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
                      id: `server-${replyData.message.time || Date.now()}`,
                      content: messageContent,
                      sender: messageSender as "user" | "agent",
                      timestamp: messageTime,
                      senderName: replyData.message.senderName || (messageSender === "agent" ? "Support Agent" : "User"),
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
        } catch (error) {
          console.error("Error handling WebSocket message:", error);
        }
      };

      // Add status listener and message subscriber
      wsManager.addStatusListener(handleStatusChange, connectionId);
      wsManager.subscribe(`ticket-${ticket.id}`, handleMessage, connectionId);

      // Cleanup on unmount
      return () => {
        try {
          // Send unsubscribe message before closing
          if (connectionId && wsManager.getStatus(connectionId) === ConnectionStatus.CONNECTED) {
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
          if (connectionId) {
            wsManager.removeStatusListener(handleStatusChange, connectionId);
            wsManager.unsubscribe(`ticket-${ticket.id}`, handleMessage, connectionId);
            wsManager.close(connectionId);
          }
        } catch (error) {
          console.error("Error during WebSocket cleanup:", error);
        }
      };
    } catch (error) {
      console.error("Error setting up WebSocket connection:", error);
    }
  }, [ticket?.id, ticketId]);

  // Show error state if there's a loading error
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50/30 to-indigo-50/20 dark:from-zinc-950 dark:via-blue-950/10 dark:to-indigo-950/10 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-zinc-400">
            {t("loading_ticket_details")}.
          </p>
        </div>
      </div>
    );
  }

  // Error state
  if (loadError) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50/30 to-indigo-50/20 dark:from-zinc-950 dark:via-blue-950/10 dark:to-indigo-950/10 flex items-center justify-center">
        <div className="text-center max-w-md mx-auto p-6">
          <div className="w-24 h-24 bg-gradient-to-r from-red-500 to-rose-500 rounded-full flex items-center justify-center mb-6 shadow-xl mx-auto">
            <AlertCircle className="h-12 w-12 text-white" />
          </div>
          <h3 className="text-2xl font-bold mb-3 text-gray-900 dark:text-zinc-100">
            Error Loading Ticket
          </h3>
          <p className="text-gray-600 dark:text-zinc-400 text-center mb-2">
            {loadError}
          </p>
          <div className="text-sm text-gray-500 dark:text-zinc-500 mb-6 p-3 bg-gray-100 dark:bg-zinc-800 rounded-lg">
            <strong>Ticket ID:</strong> {ticketId}<br/>
            <strong>URL:</strong> {typeof window !== 'undefined' ? window.location.pathname : 'N/A'}<br/>
            <strong>Time:</strong> {new Date().toLocaleString()}
          </div>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Button
              onClick={() => {
                setLoadError(null);
                setIsLoading(true);
                // Retry loading
                if (typeof window !== 'undefined') {
                  window.location.reload();
                }
              }}
              className="px-6"
            >
              Try Again
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                if (typeof window !== 'undefined') {
                  window.location.href = "/admin/crm/support";
                }
              }}
              className="px-6"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Tickets
            </Button>
          </div>
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
            {t("ticket_not_found")}
          </h3>
          <p className="text-gray-600 dark:text-zinc-400 text-center mb-8 max-w-md">
            {t("the_ticket_youre_view_it")}.
          </p>
          <Link href="/admin/crm/support">
            <Button className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105">
              <ArrowLeft className="h-4 w-4 mr-2" />
              {t("back_to_support_dashboard")}
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !ticket || !ticketId) return;
    const messageContent = newMessage;
    setNewMessage("");
    
    // Add agent message immediately to UI
    const agentMessage: Message = {
      id: generateUniqueMessageId(),
      content: messageContent,
      sender: "agent",
      timestamp: new Date(),
      senderName: "Support Agent",
    };
    setMessages((prev) => [...prev, agentMessage]);
    
    // Send to API with the required format
    const { data, error } = await $fetch({
      url: `/api/user/support/ticket/${ticketId}`,
      method: "POST",
      body: {
        type: "agent",
        time: new Date().toISOString(),
        userId: user?.id || "",
        text: messageContent,
        attachment: null,
      },
      silent: true,
    });
    
    if (error) {
      console.error("Failed to send message:", error);
      // Remove the optimistically added message on error
      setMessages((prev) => prev.filter((msg) => msg.id !== agentMessage.id));
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
  const handleUpdateStatus = async () => {
    if (!ticket || !selectedStatus || !ticketId) return;
    const { data, error } = await $fetch({
      url: `/api/admin/crm/support/ticket/${ticketId}/status`,
      method: "PUT",
      body: {
        status: selectedStatus,
      },
      successMessage: "Ticket status updated successfully",
    });
    if (data) {
      setTicket((prev) =>
        prev
          ? {
              ...prev,
              status: selectedStatus as any,
            }
          : null
      );
      setIsStatusDialogOpen(false);
    }
  };
  const handleAssignAgent = async () => {
    if (!ticket) return;
    const { data, error } = await $fetch({
      url: `/api/admin/crm/support/ticket/${ticket.id}/assign`,
      method: "PUT",
      body: {
        agentId: selectedAgent || null,
      },
      successMessage: selectedAgent
        ? "Agent assigned successfully"
        : "Agent unassigned successfully",
    });
    if (data) {
      setTicket((prev) =>
        prev
          ? {
              ...prev,
              agentId: selectedAgent || null,
              agentName: selectedAgent ? "Support Agent" : null, // This should come from agent lookup
            }
          : null
      );
      setIsAssignDialogOpen(false);
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
      sender: "agent",
      timestamp: new Date(),
      senderName: "Support Agent",
    };
    setMessages((prev) => [...prev, uploadingMessage]);
    try {
      const uploadResult = await imageUploader({
        file,
        dir: "admin-ticket-attachments",
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
          url: `/api/user/support/ticket/${ticketId}`,
          method: "POST",
          body: {
            type: "agent",
            time: new Date().toISOString(),
            userId: user?.id || "",
            text: `Shared an image: ${file.name}`,
            attachment: uploadResult.url,
          },
          silent: true,
        });
        if (!error) {
          // Add image message to UI
          const imageMessage: Message = {
            id: generateUniqueMessageId(),
            content: `Shared an image: ${file.name}`,
            sender: "agent",
            timestamp: new Date(),
            senderName: "Support Agent",
            attachments: [uploadResult.url],
          };
          setMessages((prev) => [...prev, imageMessage]);
          toast({
            title: "Image Uploaded",
            description: "Your image has been shared successfully.",
            variant: "success",
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
    if (!ticket || typeof window === 'undefined') return;
    
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
        agentName: ticket.agent
          ? `${ticket.agent.firstName || ""} ${ticket.agent.lastName || ""}`.trim() ||
            "Agent"
          : "Not assigned",
        responseTime: ticket.responseTime
          ? `${ticket.responseTime} minutes`
          : "N/A",
        satisfaction: ticket.satisfaction || null,
        type: ticket.type,
        customerName: ticket.user
          ? `${ticket.user.firstName || ""} ${ticket.user.lastName || ""}`.trim() ||
            "Customer"
          : "Customer",
        customerEmail: ticket.user?.email || null,
      },
      conversation: messages.map((msg) => ({
        id: msg.id,
        content: msg.content,
        sender: msg.sender,
        senderName:
          msg.senderName || (msg.sender === "user" ? "Customer" : "Agent"),
        timestamp: msg.timestamp.toISOString(),
        attachments: msg.attachments || [],
      })),
      exportedAt: new Date().toISOString(),
      totalMessages: messages.length,
      customerStats: ticket.userStats || {
        totalTickets: 0,
        resolvedTickets: 0,
      },
      agentStats: ticket.agentStats || {
        resolved: 0,
        avgRating: null,
      },
    };
    
    try {
      const dataStr = JSON.stringify(exportData, null, 2);
      const dataBlob = new Blob([dataStr], {
        type: "application/json",
      });
      const url = URL.createObjectURL(dataBlob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `admin-ticket-${ticket.id}-conversation-${new Date().toISOString().split("T")[0]}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      toast({
        title: "Export Successful",
        description: "Ticket conversation exported to JSON successfully.",
        variant: "success",
      });
    } catch (error) {
      console.error("Error exporting ticket:", error);
      toast({
        title: "Export Failed",
        description: "Failed to export ticket data. Please try again.",
        variant: "destructive",
      });
    }
  };
  const handleCopyTicketLink = (ticketId: string) => {
    if (typeof window === 'undefined') return; // Prevent SSR issues
    
    const url = `${window.location.origin}/admin/crm/support/${ticketId}`;
    navigator.clipboard
      .writeText(url)
      .then(() => {
        toast({
          title: "Link Copied",
          description: "Admin ticket link copied to clipboard successfully.",
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
    <>
      {/* Mobile-First Header */}
      <div className="mb-4 md:mb-6">
        {/* Enhanced Header */}
        <Card className="border-0 bg-gradient-to-r from-white via-blue-50/50 to-indigo-50/30 dark:from-zinc-900 dark:via-blue-950/20 dark:to-indigo-950/10 shadow-xl backdrop-blur-sm rounded-2xl overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-r from-blue-600/5 to-indigo-600/5 dark:from-blue-400/5 dark:to-indigo-400/5"></div>
          <CardHeader className="relative bg-white/50 dark:bg-zinc-900/50 backdrop-blur-sm p-4 md:p-6">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3 flex-1">
                {/* Back Button - Moved to left of icon */}
          <Link href="/admin/crm/support">
            <Button
              variant="ghost"
                    size="icon"
                    className="hover:bg-white/80 dark:hover:bg-zinc-800/80 text-gray-900 dark:text-zinc-100 backdrop-blur-sm h-8 w-8 md:h-10 md:w-10"
            >
                    <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
                
                {/* Icon */}
                <div className="p-2 md:p-3 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-xl shadow-lg">
                  <Shield className="h-5 w-5 md:h-6 md:w-6 text-white" />
        </div>
                
                {/* Title and Info */}
                <div className="flex-1 min-w-0">
                  <CardTitle className="text-lg md:text-2xl text-gray-900 dark:text-zinc-100 mb-1 md:mb-2 truncate">
                      {ticket.subject}
                    </CardTitle>
                  <CardDescription className="text-gray-600 dark:text-zinc-400 text-sm">
                    <div className="flex flex-wrap items-center gap-2 md:gap-4">
                      <span className="font-medium">
                        #{ticket.id.slice(0, 8)}
                      </span>
                      <span className="hidden md:inline">•</span>
                      <span className="hidden md:inline">
                        {t("Created")}{" "}
                        {ticket.createdAt
                          ? new Date(ticket.createdAt).toLocaleDateString()
                          : "N/A"}
                      </span>
                      <div className="flex items-center gap-2">
                        <Avatar className="h-4 w-4 md:h-5 md:w-5">
                          <AvatarImage
                            src={
                              ticket.user?.avatar ||
                              "/placeholder.svg?height=20&width=20&query=customer"
                            }
                          />
                          <AvatarFallback className="text-xs bg-gray-200 dark:bg-zinc-700">
                            {ticket.user?.firstName?.charAt(0) || "C"}
                          </AvatarFallback>
                        </Avatar>
                        <span className="text-blue-600 dark:text-blue-400 text-sm">
                          {`${ticket.user?.firstName || ""} ${ticket.user?.lastName || ""}`.trim() ||
                            "Customer"}
                        </span>
                      </div>
                      <div className="flex items-center gap-1 md:gap-2">
                        <Zap className="h-3 w-3 md:h-4 md:w-4 text-green-500" />
                        <span className="text-green-600 dark:text-green-400 text-sm">
                          {t("response")} {ticket.responseTime || 0}min
                        </span>
                      </div>
                      </div>
                    </CardDescription>
                  </div>
                </div>
              
              {/* Status Badges and Actions */}
              <div className="flex flex-col md:flex-row gap-2 md:gap-3 items-end md:items-start ml-2">
                  <div className="flex gap-2">
                      <Badge
                    className={`${getImportanceColor(ticket.importance)} text-xs`}
                  variant="outline"
                >
                  {ticket.importance}
                </Badge>
                <Badge
                    className={`${getStatusColor(ticket.status)} text-xs`}
                  variant="outline"
                >
                  {ticket.status}
                </Badge>
                </div>
                
                {/* Action Buttons */}
                <div className="flex gap-2">
                <Dialog
                  open={isStatusDialogOpen}
                  onOpenChange={setIsStatusDialogOpen}
                >
                  <DialogTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                        className="border-gray-200 dark:border-zinc-700 hover:bg-gray-50 dark:hover:bg-zinc-800 text-xs"
                    >
                        <Edit3 className="h-3 w-3 md:h-4 md:w-4 mr-1 md:mr-2" />
                        <span className="hidden md:inline">{t("update_status")}</span>
                        <span className="md:hidden">Update</span>
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="bg-white dark:bg-zinc-900 border-gray-200 dark:border-zinc-800">
                    <DialogHeader>
                      <DialogTitle className="text-gray-900 dark:text-zinc-100">
                        {t("update_ticket_status")}
                      </DialogTitle>
                      <DialogDescription className="text-gray-600 dark:text-zinc-400">
                        {t("change_the_status_of_this_support_ticket")}.
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div>
                        <Label
                          htmlFor="status"
                          className="text-gray-900 dark:text-zinc-100"
                        >
                          {t("Status")}
                        </Label>
                        <Select
                          value={selectedStatus}
                          onValueChange={setSelectedStatus}
                        >
                          <SelectTrigger className="bg-white dark:bg-zinc-800 border-gray-200 dark:border-zinc-700">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="bg-white dark:bg-zinc-800 border-gray-200 dark:border-zinc-700">
                            <SelectItem value="PENDING">
                              {t("Pending")}
                            </SelectItem>
                            <SelectItem value="OPEN">{t("Open")}</SelectItem>
                            <SelectItem value="REPLIED">
                              {t("Replied")}
                            </SelectItem>
                            <SelectItem value="CLOSED">
                              {t("Closed")}
                            </SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="outline"
                          onClick={() => setIsStatusDialogOpen(false)}
                          className="border-gray-200 dark:border-zinc-700"
                        >
                          {t("Cancel")}
                        </Button>
                        <Button
                          onClick={handleUpdateStatus}
                          className="bg-blue-600 hover:bg-blue-700 text-white"
                        >
                          {t("update_status")}
                        </Button>
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                        className="hover:bg-white/80 dark:hover:bg-zinc-800/80 backdrop-blur-sm h-8 w-8"
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
                      {t("export_as_json")}
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => handleCopyTicketLink(ticket.id)}
                      className="hover:bg-gray-50 dark:hover:bg-zinc-700 cursor-pointer"
                    >
                      <Copy className="h-4 w-4 mr-2" />
                      {t("copy_admin_link")}
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
            </div>
            
            {/* Tags Section */}
            {ticket.tags && Array.isArray(ticket.tags) && ticket.tags.length > 0 && (
              <div className="px-4 md:px-6 pb-4 md:pb-6">
                <div className="flex flex-wrap gap-2">
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
              </div>
            )}
          </CardHeader>
        </Card>
      </div>

      {/* Responsive Layout with Tabs */}
      <div className="flex flex-col lg:grid lg:grid-cols-4 gap-4 md:gap-8">
        {/* Mobile Tabs - Hidden on Desktop */}
        <div className="lg:hidden">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-3 bg-white/80 dark:bg-zinc-900/80 backdrop-blur-sm">
              <TabsTrigger value="conversation" className="text-xs">
                <Shield className="h-4 w-4 mr-1" />
                Chat
              </TabsTrigger>
              <TabsTrigger value="customer" className="text-xs">
                <User className="h-4 w-4 mr-1" />
                Customer
              </TabsTrigger>
              <TabsTrigger value="timeline" className="text-xs">
                <Clock className="h-4 w-4 mr-1" />
                Timeline
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="conversation" className="mt-4">
              {/* Mobile Chat Area */}
              <Card className="flex flex-col h-[calc(100vh-300px)] border-0 bg-white/80 dark:bg-zinc-900/80 backdrop-blur-sm shadow-xl rounded-2xl overflow-hidden">
                <CardHeader className="pb-3 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/50 dark:to-indigo-950/50 backdrop-blur-sm p-4">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base text-gray-900 dark:text-zinc-100 flex items-center gap-2">
                      <Shield className="h-4 w-4 text-blue-500" />
                      {t("admin_conversation")}
                    </CardTitle>
                    <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-zinc-400">
                      <div
                        className={`w-2 h-2 rounded-full ${wsConnected ? "bg-green-500 animate-pulse" : "bg-gray-400"}`}
                      ></div>
                      <span className="text-xs">
                        {wsConnected ? "Live" : "Connecting..."}
                      </span>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="flex-1 overflow-y-auto space-y-4 p-4 bg-gradient-to-b from-gray-50/50 to-white/50 dark:from-zinc-800/50 dark:to-zinc-900/50">
                  {messages.map((message, index) => (
                    <div
                      key={message.id}
                      className={`flex gap-3 ${message.sender === "agent" ? "justify-end" : "justify-start"} animate-in slide-in-from-bottom-2 duration-500`}
                      style={{
                        animationDelay: `${index * 100}ms`,
                      }}
                    >
                      {message.sender === "user" && (
                        <Avatar className="h-8 w-8 border-2 border-white shadow-lg">
                          <AvatarImage
                            src={
                              ticket.user?.avatar ||
                              "/placeholder.svg?height=32&width=32&query=customer"
                            }
                          />
                          <AvatarFallback className="bg-gradient-to-r from-gray-500 to-gray-600 text-white text-xs">
                            {ticket.user?.firstName?.charAt(0) || "C"}
                          </AvatarFallback>
                        </Avatar>
                      )}
                      <div
                        className={`max-w-[80%] ${message.sender === "agent" ? "order-first" : ""}`}
                      >
                        {message.sender === "user" && (
                          <p className="text-xs font-medium mb-1 text-gray-600 dark:text-zinc-400 flex items-center gap-2">
                            <User className="h-3 w-3 text-blue-500" />
                            {message.senderName || "Customer"}
                          </p>
                        )}
                        <div
                          className={`rounded-2xl p-3 shadow-lg ${message.sender === "agent" ? "bg-gradient-to-r from-blue-500 to-indigo-500 text-white" : "bg-white dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 text-gray-900 dark:text-zinc-100"}`}
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
                                            className="rounded-lg max-h-32 w-auto"
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
                                          <Paperclip className="h-3 w-3" />
                                          <a
                                            href={attachment}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="text-xs underline hover:no-underline"
                                          >
                                            {t("view_attachment")}
                                          </a>
                                        </div>
                                      );
                                    }
                                  }
                                )}
                              </div>
                            )}
                          <div className="flex items-center justify-between mt-2">
                            <p
                              className={`text-xs ${message.sender === "agent" ? "text-blue-100" : "text-gray-500 dark:text-zinc-400"}`}
                            >
                              <Clock className="h-3 w-3 inline mr-1" />
                              {new Date(message.timestamp).toLocaleTimeString()}
                            </p>
                            {message.sender === "agent" && (
                              <div className="flex items-center gap-1">
                                <Shield className="h-3 w-3 text-blue-200" />
                                <span className="text-xs text-blue-100">
                                  {message.senderName || "Support Agent"}
                                </span>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                      {message.sender === "agent" && (
                        <Avatar className="h-8 w-8 border-2 border-white shadow-lg">
                          <AvatarImage
                            src={
                              ticket.agent?.avatar ||
                              "/placeholder.svg?height=32&width=32&query=admin agent"
                            }
                          />
                          <AvatarFallback className="bg-gradient-to-r from-blue-500 to-indigo-500 text-white">
                            <Shield className="h-4 w-4" />
                          </AvatarFallback>
                        </Avatar>
                      )}
                    </div>
                  ))}
                  <div ref={messagesEndRef} />
                </CardContent>
                <div className="p-4 border-t border-gray-200 dark:border-zinc-800 bg-gradient-to-r from-gray-50 to-white dark:from-zinc-900 dark:to-zinc-800 backdrop-blur-sm">
                  {ticket.status !== "CLOSED" ? (
                    <div className="space-y-3">
                      <div className="flex gap-3">
                        <Textarea
                          value={newMessage}
                          onChange={(e) => setNewMessage(e.target.value)}
                          placeholder="Type your response as admin..."
                          className="flex-1 min-h-[60px] resize-none bg-white dark:bg-zinc-800 border-gray-200 dark:border-zinc-700 rounded-xl focus:ring-2 focus:ring-blue-500 transition-all text-sm"
                          onKeyPress={(e) => {
                            if (e.key === "Enter" && !e.shiftKey) {
                              e.preventDefault();
                              handleSendMessage();
                            }
                          }}
                        />
                        <div className="flex flex-col gap-2">
                          <Button
                            onClick={handleSendMessage}
                            disabled={!newMessage.trim()}
                            size="icon"
                            className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-lg hover:shadow-xl transition-all duration-300 h-10 w-10"
                          >
                            <Send className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="icon"
                            onClick={() => fileInputRef.current?.click()}
                            className="border-gray-200 dark:border-zinc-700 hover:bg-gray-50 dark:hover:bg-zinc-800 h-10 w-10"
                          >
                            <Paperclip className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-zinc-400">
                        <span>
                          Press Enter to send, Shift+Enter for new line
                        </span>
                        {!wsConnected && (
                          <span className="text-amber-600 dark:text-amber-400">
                            • Using fallback mode
                          </span>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-4">
                      <CheckCircle2 className="h-8 w-8 text-green-500 mx-auto mb-2" />
                      <p className="text-gray-500 dark:text-zinc-400 text-sm">
                        This ticket has been resolved.
                      </p>
                    </div>
                  )}
                </div>
              </Card>
            </TabsContent>

            <TabsContent value="customer" className="mt-4">
              {/* Mobile Customer Info */}
              <Card className="border-0 bg-white/80 dark:bg-zinc-900/80 shadow-xl backdrop-blur-sm rounded-2xl">
                <CardHeader>
                  <CardTitle className="text-base text-gray-900 dark:text-zinc-100 flex items-center gap-2">
                    <User className="h-5 w-5 text-blue-500" />
                    {t("customer_info")}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center gap-4">
                    <Avatar className="h-16 w-16 border-4 border-white shadow-lg">
                      <AvatarImage
                        src={
                          ticket.user?.avatar ||
                          "/placeholder.svg?height=64&width=64&query=customer"
                        }
                      />
                      <AvatarFallback className="bg-gradient-to-r from-gray-500 to-gray-600 text-white text-lg">
                        {ticket.user?.firstName?.charAt(0) || "C"}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <h3 className="font-semibold text-gray-900 dark:text-zinc-100">
                        {`${ticket.user?.firstName || ""} ${ticket.user?.lastName || ""}`.trim() ||
                          "Customer"}
                      </h3>
                      <p className="text-sm text-gray-600 dark:text-zinc-400">
                        {ticket.user?.email || "No email provided"}
                      </p>
                    </div>
                  </div>
                  
                  {ticket.userStats && (
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div className="text-center p-3 bg-white/50 dark:bg-zinc-800/50 rounded-xl">
                        <p className="font-semibold text-blue-600 dark:text-blue-400">
                          {ticket.userStats.totalTickets}
                        </p>
                        <p className="text-xs text-gray-600 dark:text-zinc-400">
                          {t("total_tickets")}
                        </p>
                      </div>
                      <div className="text-center p-3 bg-white/50 dark:bg-zinc-800/50 rounded-xl">
                        <p className="font-semibold text-green-600 dark:text-green-400">
                          {ticket.userStats.resolvedTickets}
                        </p>
                        <p className="text-xs text-gray-600 dark:text-zinc-400">
                          {t("resolved")}
                        </p>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Mobile Assigned Agent */}
              <Card className="border-0 bg-white/80 dark:bg-zinc-900/80 shadow-xl backdrop-blur-sm rounded-2xl mt-4">
                <CardHeader>
                  <CardTitle className="text-base text-gray-900 dark:text-zinc-100 flex items-center gap-2">
                    <UserCheck className="h-5 w-5 text-blue-500" />
                    {t("assigned_agent")}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {ticket.agent ? (
                    <div className="space-y-4">
                      <div className="flex items-center gap-4">
                        <Avatar className="h-12 w-12 border-2 border-white shadow-lg">
                          <AvatarImage
                            src={
                              ticket.agent.avatar ||
                              "/placeholder.svg?height=48&width=48&query=agent"
                            }
                          />
                          <AvatarFallback className="bg-gradient-to-r from-blue-500 to-indigo-500 text-white">
                            <Shield className="h-5 w-5" />
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1">
                          <h3 className="font-semibold text-gray-900 dark:text-zinc-100">
                            {`${ticket.agent.firstName} ${ticket.agent.lastName}`}
                          </h3>
                          <p className="text-sm text-blue-600 dark:text-blue-400">
                            {t("support_agent")}
                          </p>
                          {ticket.agent.lastLogin && (
                            <p className="text-xs text-gray-500 dark:text-zinc-400">
                              {t("last_login")}{" "}
                              {new Date(
                                ticket.agent.lastLogin
                              ).toLocaleDateString()}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-4">
                      <div className="w-12 h-12 bg-gray-200 dark:bg-zinc-700 rounded-full flex items-center justify-center mx-auto mb-3">
                        <UserCheck className="h-6 w-6 text-gray-400 dark:text-zinc-500" />
                      </div>
                      <p className="text-sm text-gray-600 dark:text-zinc-400 mb-3">
                        {t("no_agent_assigned")}
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="timeline" className="mt-4">
              {/* Mobile Timeline */}
              <Card className="border-0 bg-white/80 dark:bg-zinc-900/80 shadow-xl backdrop-blur-sm rounded-2xl">
                <CardHeader>
                  <CardTitle className="text-base text-gray-900 dark:text-zinc-100 flex items-center gap-2">
                    <Clock className="h-5 w-5 text-blue-500" />
                    {t("progress_timeline")}
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
            </TabsContent>
          </Tabs>
        </div>

        {/* Desktop Layout - Enhanced Chat Area */}
        <div className="hidden lg:block lg:col-span-3">
          <Card className="flex flex-col h-[700px] border-0 bg-white/80 dark:bg-zinc-900/80 backdrop-blur-sm shadow-xl rounded-2xl overflow-hidden">
            <CardHeader className="pb-4 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/50 dark:to-indigo-950/50 backdrop-blur-sm">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg text-gray-900 dark:text-zinc-100 flex items-center gap-2">
                  <Shield className="h-5 w-5 text-blue-500" />
                  {t("admin_conversation")}
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
            </CardHeader>
            <CardContent className="flex-1 overflow-y-auto space-y-6 p-6 bg-gradient-to-b from-gray-50/50 to-white/50 dark:from-zinc-800/50 dark:to-zinc-900/50">
              {messages.map((message, index) => (
                <div
                  key={message.id}
                  className={`flex gap-4 ${message.sender === "agent" ? "justify-end" : "justify-start"} animate-in slide-in-from-bottom-2 duration-500`}
                  style={{
                    animationDelay: `${index * 100}ms`,
                  }}
                >
                  {message.sender === "user" && (
                    <Avatar className="h-10 w-10 border-2 border-white shadow-lg">
                      <AvatarImage
                        src={
                          ticket.user?.avatar ||
                          "/placeholder.svg?height=40&width=40&query=customer"
                        }
                      />
                      <AvatarFallback className="bg-gradient-to-r from-gray-500 to-gray-600 text-white text-sm">
                        {ticket.user?.firstName?.charAt(0) || "C"}
                      </AvatarFallback>
                    </Avatar>
                  )}
                  <div
                    className={`max-w-[75%] ${message.sender === "agent" ? "order-first" : ""}`}
                  >
                    {message.sender === "user" && (
                      <p className="text-sm font-medium mb-2 text-gray-600 dark:text-zinc-400 flex items-center gap-2">
                        <User className="h-4 w-4 text-blue-500" />
                        {message.senderName || "Customer"}
                      </p>
                    )}
                    <div
                      className={`rounded-2xl p-4 shadow-lg ${message.sender === "agent" ? "bg-gradient-to-r from-blue-500 to-indigo-500 text-white" : "bg-white dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 text-gray-900 dark:text-zinc-100"}`}
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
                                        {t("view_attachment")}
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
                          className={`text-xs ${message.sender === "agent" ? "text-blue-100" : "text-gray-500 dark:text-zinc-400"}`}
                        >
                          <Clock className="h-3 w-3 inline mr-1" />
                          {new Date(message.timestamp).toLocaleTimeString()}
                        </p>
                        {message.sender === "agent" && (
                          <div className="flex items-center gap-1">
                            <Shield className="h-3 w-3 text-blue-200" />
                            <span className="text-xs text-blue-100">
                              {message.senderName || "Support Agent"}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                  {message.sender === "agent" && (
                    <Avatar className="h-10 w-10 border-2 border-white shadow-lg">
                      <AvatarImage
                        src={
                          ticket.agent?.avatar ||
                          "/placeholder.svg?height=40&width=40&query=admin agent"
                        }
                      />
                      <AvatarFallback className="bg-gradient-to-r from-blue-500 to-indigo-500 text-white">
                        <Shield className="h-5 w-5" />
                      </AvatarFallback>
                    </Avatar>
                  )}
                </div>
              ))}
              <div ref={messagesEndRef} />
            </CardContent>
            <div className="p-6 border-t border-gray-200 dark:border-zinc-800 bg-gradient-to-r from-gray-50 to-white dark:from-zinc-900 dark:to-zinc-800 backdrop-blur-sm">
              {ticket.status !== "CLOSED" ? (
                <div className="space-y-4">
                  <div className="flex gap-4">
                    <Textarea
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      placeholder="Type your response as admin..."
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
                    <span>
                      {t("press_enter_to_send_shift+enter_for_new_line")}
                    </span>
                    {!wsConnected && (
                      <span className="text-amber-600 dark:text-amber-400">
                        {t("•_using_fallback_mode")}
                      </span>
                    )}
                  </div>
                </div>
              ) : (
                <div className="text-center py-6">
                  <CheckCircle2 className="h-12 w-12 text-green-500 mx-auto mb-3" />
                  <p className="text-gray-500 dark:text-zinc-400 text-lg">
                    {t("this_ticket_has_been_resolved")}.
                  </p>
                </div>
              )}
            </div>
          </Card>
        </div>

        {/* Desktop Sidebar - Hidden on Mobile */}
        <div className="hidden lg:block lg:col-span-1">
          <div className="space-y-6">
            {/* Customer Info */}
            <Card className="border-0 bg-gradient-to-br from-white to-blue-50/30 dark:from-zinc-900 dark:to-blue-950/20 shadow-xl backdrop-blur-sm rounded-2xl overflow-hidden">
              <CardHeader className="pb-4">
                <CardTitle className="text-base text-gray-900 dark:text-zinc-100 flex items-center gap-2">
                  <User className="h-5 w-5 text-blue-500" />
                  {t("customer_info")}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-4">
                  <Avatar className="h-12 w-12 border-2 border-white shadow-lg">
                    <AvatarImage
                      src={
                        ticket.user?.avatar ||
                        "/placeholder.svg?height=48&width=48&query=customer"
                      }
                    />
                    <AvatarFallback className="bg-gradient-to-r from-gray-500 to-gray-600 text-white">
                      {ticket.user?.firstName?.charAt(0) || "C"}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-semibold text-gray-900 dark:text-zinc-100">
                      {`${ticket.user?.firstName || ""} ${ticket.user?.lastName || ""}`.trim() ||
                        "Customer"}
                    </p>
                    <p className="text-sm text-gray-600 dark:text-zinc-400">
                      {ticket.user?.email || "No email provided"}
                    </p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div className="text-center p-3 bg-white/50 dark:bg-zinc-800/50 rounded-xl">
                    <p className="font-semibold text-blue-600 dark:text-blue-400">
                      {ticket.userStats?.totalTickets || 0}
                    </p>
                    <p className="text-xs text-gray-600 dark:text-zinc-400">
                      {t("total_tickets")}
                    </p>
                  </div>
                  <div className="text-center p-3 bg-white/50 dark:bg-zinc-800/50 rounded-xl">
                    <p className="font-semibold text-green-600 dark:text-green-400">
                      {ticket.userStats?.resolvedTickets || 0}
                    </p>
                    <p className="text-xs text-gray-600 dark:text-zinc-400">
                      {t("resolved")}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Agent Info */}
            <Card className="border-0 bg-gradient-to-br from-white to-blue-50/30 dark:from-zinc-900 dark:to-blue-950/20 shadow-xl backdrop-blur-sm rounded-2xl overflow-hidden">
              <CardHeader className="pb-4">
                <CardTitle className="text-base text-gray-900 dark:text-zinc-100 flex items-center gap-2">
                  <Shield className="h-5 w-5 text-blue-500" />
                  {t("assigned_agent")}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {ticket.agentId && ticket.agent ? (
                  <div className="flex items-center gap-4">
                    <Avatar className="h-12 w-12 border-2 border-white shadow-lg">
                      <AvatarImage
                        src={
                          ticket.agent.avatar ||
                          "/placeholder.svg?height=48&width=48&query=support agent"
                        }
                      />
                      <AvatarFallback className="bg-gradient-to-r from-blue-500 to-indigo-500 text-white">
                        {`${ticket.agent.firstName?.charAt(0) || ""}${ticket.agent.lastName?.charAt(0) || ""}` ||
                          "SA"}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-semibold text-gray-900 dark:text-zinc-100">
                        {`${ticket.agent.firstName || ""} ${ticket.agent.lastName || ""}`.trim() ||
                          "Support Agent"}
                      </p>
                      <div className="text-sm text-green-600 dark:text-green-400 flex items-center gap-2">
                        <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                        {t("online_•_expert_level")}
                      </div>
                      {ticket.agent.lastLogin && (
                        <p className="text-xs text-gray-500 dark:text-zinc-400">
                          {t("last_login")}{" "}
                          {new Date(
                            ticket.agent.lastLogin
                          ).toLocaleDateString()}
                        </p>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-4">
                    <div className="w-12 h-12 bg-gray-200 dark:bg-zinc-700 rounded-full flex items-center justify-center mx-auto mb-3">
                      <UserCheck className="h-6 w-6 text-gray-400 dark:text-zinc-500" />
                    </div>
                    <p className="text-sm text-gray-600 dark:text-zinc-400 mb-3">
                      {t("no_agent_assigned")}
                    </p>
                  </div>
                )}
                {ticket.agentId && ticket.agent && (
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div className="text-center p-3 bg-white/50 dark:bg-zinc-800/50 rounded-xl">
                      <p className="font-semibold text-blue-600 dark:text-blue-400">
                        {ticket.agentStats?.avgRating?.toFixed(1) || "N/A"}
                      </p>
                      <p className="text-xs text-gray-600 dark:text-zinc-400">
                        {t("rating")}
                      </p>
                    </div>
                    <div className="text-center p-3 bg-white/50 dark:bg-zinc-800/50 rounded-xl">
                      <p className="font-semibold text-green-600 dark:text-green-400">
                        {ticket.agentStats?.resolved || 0}
                      </p>
                      <p className="text-xs text-gray-600 dark:text-zinc-400">
                        {t("resolved")}
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
                  {t("progress_timeline")}
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
    </>
  );
}
