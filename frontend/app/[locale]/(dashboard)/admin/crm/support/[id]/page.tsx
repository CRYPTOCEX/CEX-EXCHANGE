"use client";
import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Clock,
  AlertCircle,
  Send,
  ArrowLeft,
  Paperclip,
  CheckCircle2,
  MoreVertical,
  Info,
  X,
  MessageSquare,
  Ticket,
  Calendar,
  Tag,
  ChevronRight,
  Loader2,
  Sun,
  Moon,
  Settings,
  Ban,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Label } from "@/components/ui/label";
import { $fetch } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { useUserStore } from "@/store/user";
import { Link, useRouter } from "@/i18n/routing";
import { wsManager, ConnectionStatus } from "@/services/ws-manager";
import { cn } from "@/lib/utils";
import { useTheme } from "next-themes";
import { imageUploader } from "@/utils/upload";

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
  messages?: SupportMessage[] | string | null;
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
  return `${Date.now()}-${messageIdCounter}-${Math.random().toString(36).substring(2, 11)}`;
};

// Status badge styles
const getStatusStyle = (status: string) => {
  switch (status) {
    case "PENDING":
      return "bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-500/15 dark:text-amber-400 dark:border-amber-500/30";
    case "OPEN":
      return "bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-500/15 dark:text-blue-400 dark:border-blue-500/30";
    case "REPLIED":
      return "bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-500/15 dark:text-emerald-400 dark:border-emerald-500/30";
    case "CLOSED":
      return "bg-gray-100 text-gray-600 border-gray-200 dark:bg-zinc-500/15 dark:text-zinc-400 dark:border-zinc-500/30";
    default:
      return "bg-red-100 text-red-700 border-red-200 dark:bg-red-500/15 dark:text-red-400 dark:border-red-500/30";
  }
};

const getImportanceStyle = (importance: string) => {
  switch (importance) {
    case "HIGH":
      return "bg-red-100 text-red-700 border-red-200 dark:bg-red-500/15 dark:text-red-400 dark:border-red-500/30";
    case "MEDIUM":
      return "bg-orange-100 text-orange-700 border-orange-200 dark:bg-orange-500/15 dark:text-orange-400 dark:border-orange-500/30";
    case "LOW":
      return "bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-500/15 dark:text-emerald-400 dark:border-emerald-500/30";
    default:
      return "bg-gray-100 text-gray-600 border-gray-200 dark:bg-zinc-500/15 dark:text-zinc-400 dark:border-zinc-500/30";
  }
};

export default function SupportTicketDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { toast } = useToast();
  const { user } = useUserStore();
  const router = useRouter();
  const { theme, setTheme } = useTheme();

  const [ticketId, setTicketId] = useState<string | null>(null);
  const [selectedTicket, setSelectedTicket] =
    useState<supportTicketAttributes | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Detail states
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [isStatusDialogOpen, setIsStatusDialogOpen] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState("");
  const [showInfoPanel, setShowInfoPanel] = useState(false);
  const [wsConnected, setWsConnected] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Scroll to bottom function
  const scrollToBottom = () => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  };

  // Auto-scroll when messages change
  useEffect(() => {
    scrollToBottom();
    // Also scroll after a short delay to account for images that may still be loading
    const timeoutId = setTimeout(scrollToBottom, 100);
    return () => clearTimeout(timeoutId);
  }, [messages]);

  // Handle image load to ensure scroll accounts for image height
  const handleImageLoad = () => {
    scrollToBottom();
  };

  // Unwrap params promise
  useEffect(() => {
    params.then((p) => setTicketId(p.id));
  }, [params]);

  // WebSocket connection for LIVE tickets
  useEffect(() => {
    if (!selectedTicket?.id || selectedTicket.type !== "LIVE") {
      return;
    }

    const connectionId = `admin-detail-${selectedTicket.id}`;
    const wsUrl = `${window.location.protocol === "https:" ? "wss:" : "ws:"}//${window.location.host}/api/user/support/ticket`;

    wsManager.connect(wsUrl, connectionId);

    const handleStatusChange = (status: ConnectionStatus) => {
      setWsConnected(status === ConnectionStatus.CONNECTED);
      if (status === ConnectionStatus.CONNECTED && selectedTicket?.id) {
        wsManager.sendMessage(
          {
            action: "SUBSCRIBE",
            payload: { id: selectedTicket.id },
          },
          connectionId
        );
      }
    };

    const handleMessage = (data: any) => {
      try {
        if (data.method === "reply") {
          const replyData = data.payload;
          if (replyData && replyData.message) {
            const messageContent =
              replyData.message.text || replyData.message.content || "";
            const messageTime = new Date(
              replyData.message.timestamp || replyData.message.time || Date.now()
            );
            const messageSender =
              replyData.message.sender ||
              (replyData.message.type === "client" ? "user" : "agent");

            setMessages((prev) => {
              const optimisticIndex = prev.findIndex(
                (msg) =>
                  msg.content === messageContent &&
                  msg.sender === messageSender &&
                  Math.abs(msg.timestamp.getTime() - messageTime.getTime()) < 10000
              );

              const newMessage: Message = {
                id:
                  replyData.message.id ||
                  `server-${replyData.message.time || Date.now()}-${Math.random().toString(36).substring(2, 11)}`,
                content: messageContent,
                sender: messageSender as "user" | "agent",
                timestamp: messageTime,
                senderName:
                  replyData.message.senderName ||
                  (messageSender === "agent" ? "Support Agent" : "User"),
                attachments:
                  replyData.message.attachments ||
                  (replyData.message.attachment
                    ? [replyData.message.attachment]
                    : []),
              };

              if (optimisticIndex !== -1) {
                const updated = [...prev];
                updated[optimisticIndex] = newMessage;
                return updated;
              } else {
                return [...prev, newMessage];
              }
            });
          }
          if (replyData && (replyData.status || replyData.updatedAt)) {
            setSelectedTicket((prev) =>
              prev
                ? {
                    ...prev,
                    ...(replyData.status && { status: replyData.status }),
                    ...(replyData.updatedAt && {
                      updatedAt: new Date(replyData.updatedAt),
                    }),
                  }
                : null
            );
          }
        }
      } catch (error) {
        console.error("Error handling WebSocket message:", error);
      }
    };

    wsManager.addStatusListener(handleStatusChange, connectionId);
    wsManager.subscribe(`ticket-${selectedTicket.id}`, handleMessage, connectionId);

    return () => {
      try {
        if (wsManager.getStatus(connectionId) === ConnectionStatus.CONNECTED) {
          wsManager.sendMessage(
            { action: "UNSUBSCRIBE", payload: { id: selectedTicket.id } },
            connectionId
          );
        }
        wsManager.removeStatusListener(handleStatusChange, connectionId);
        wsManager.unsubscribe(`ticket-${selectedTicket.id}`, handleMessage, connectionId);
        wsManager.close(connectionId);
      } catch (error) {
        console.error("Error during WebSocket cleanup:", error);
      }
    };
  }, [selectedTicket?.id, selectedTicket?.type]);

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !selectedTicket) return;

    const messageContent = newMessage;
    setNewMessage("");

    const agentMessage: Message = {
      id: generateUniqueMessageId(),
      content: messageContent,
      sender: "agent",
      timestamp: new Date(),
      senderName: `${user?.firstName || ""} ${user?.lastName || ""}`.trim() || "Agent",
    };
    setMessages((prev) => [...prev, agentMessage]);

    const endpoint =
      selectedTicket.type === "LIVE"
        ? `/api/admin/crm/support/ticket/${selectedTicket.id}/reply`
        : `/api/user/support/ticket/${selectedTicket.id}`;

    const { error } = await $fetch({
      url: endpoint,
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
      setMessages((prev) => prev.filter((msg) => msg.id !== agentMessage.id));
      setNewMessage(messageContent);
      toast({
        title: "Message Failed",
        description: error || "Failed to send message. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleUpdateStatus = async () => {
    if (!selectedTicket || !selectedStatus) return;

    const { data } = await $fetch({
      url: `/api/admin/crm/support/ticket/${selectedTicket.id}/status`,
      method: "PUT",
      body: { status: selectedStatus },
      successMessage: "Status updated",
    });

    if (data) {
      setSelectedTicket((prev) =>
        prev ? { ...prev, status: selectedStatus as any } : null
      );
      setIsStatusDialogOpen(false);
    }
  };

  const handleCloseTicket = async () => {
    if (!selectedTicket) return;
    setSelectedStatus("CLOSED");
    const { data } = await $fetch({
      url: `/api/admin/crm/support/ticket/${selectedTicket.id}/status`,
      method: "PUT",
      body: { status: "CLOSED" },
      successMessage: "Ticket closed",
    });
    if (data) {
      setSelectedTicket((prev) => (prev ? { ...prev, status: "CLOSED" } : null));
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !selectedTicket) return;

    // Check if file is an image
    if (!file.type.startsWith("image/")) {
      toast({
        title: "Invalid file type",
        description: "Please select an image file",
        variant: "destructive",
      });
      return;
    }

    // Check file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      toast({
        title: "File too large",
        description: "File size must be less than 10MB",
        variant: "destructive",
      });
      return;
    }

    setIsUploading(true);

    try {
      const uploadResult = await imageUploader({
        file,
        dir: "support-attachments",
        size: {
          maxWidth: 1200,
          maxHeight: 900,
        },
      });

      if (uploadResult.success && uploadResult.url) {
        // Add optimistic message with image
        const agentMessage: Message = {
          id: generateUniqueMessageId(),
          content: "[Image]",
          sender: "agent",
          timestamp: new Date(),
          senderName: `${user?.firstName || ""} ${user?.lastName || ""}`.trim() || "Agent",
          attachments: [uploadResult.url],
        };
        setMessages((prev) => [...prev, agentMessage]);

        // Send via API - always use admin reply endpoint for admin
        const { error } = await $fetch({
          url: `/api/admin/crm/support/ticket/${selectedTicket.id}/reply`,
          method: "POST",
          body: {
            type: "agent",
            time: new Date().toISOString(),
            userId: user?.id || "",
            text: "[Image]", // Backend requires non-empty text
            attachment: uploadResult.url,
          },
          silent: true,
        });

        if (error) {
          setMessages((prev) => prev.filter((msg) => msg.id !== agentMessage.id));
          toast({
            title: "Upload Failed",
            description: "Failed to send image. Please try again.",
            variant: "destructive",
          });
        }
      } else {
        toast({
          title: "Upload Failed",
          description: uploadResult.error || "Failed to upload image",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error uploading file:", error);
      toast({
        title: "Upload Failed",
        description: "Failed to upload image",
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  // Fetch ticket data
  useEffect(() => {
    if (!ticketId) return;

    const fetchTicket = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const { data, error } = await $fetch<supportTicketAttributes>({
          url: `/api/admin/crm/support/ticket/${ticketId}`,
          silent: true,
        });

        if (error) {
          setError(`Failed to load ticket: ${error}`);
          return;
        }

        if (!data) {
          setError("No ticket data received");
          return;
        }

        let messagesData: Message[] = [];
        if (data.messages) {
          let parsedMessages: SupportMessage[] = [];

          if (Array.isArray(data.messages)) {
            parsedMessages = data.messages as SupportMessage[];
          } else if (typeof data.messages === "string") {
            try {
              parsedMessages = JSON.parse(data.messages);
            } catch (e) {
              parsedMessages = [];
            }
          }

          if (Array.isArray(parsedMessages)) {
            messagesData = parsedMessages.map((msg: SupportMessage) => ({
              id: generateUniqueMessageId(),
              content: msg.text || "",
              sender: msg.type === "client" ? "user" : "agent",
              timestamp: new Date(msg.time),
              senderName:
                msg.type === "client"
                  ? `${data.user?.firstName || ""} ${data.user?.lastName || ""}`.trim() || "Customer"
                  : `${data.agent?.firstName || ""} ${data.agent?.lastName || ""}`.trim() || "Agent",
              attachments: msg.attachment ? [msg.attachment] : [],
            }));
          }
        }

        setSelectedTicket({
          ...data,
          createdAt: data.createdAt ? new Date(data.createdAt) : undefined,
          updatedAt: data.updatedAt ? new Date(data.updatedAt) : undefined,
        });
        setMessages(messagesData);
        setSelectedStatus(data.status);
      } catch (error: any) {
        setError(error.message || "An unexpected error occurred");
      } finally {
        setIsLoading(false);
      }
    };

    fetchTicket();
  }, [ticketId]);

  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        // Close lightbox first if open, otherwise go back
        if (lightboxImage) {
          setLightboxImage(null);
        } else {
          router.push("/admin/crm/support");
        }
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [router, lightboxImage]);

  // Loading state
  if (isLoading) {
    return (
      <div className="h-screen w-screen bg-linear-to-br from-slate-50 to-slate-100 dark:from-zinc-900 dark:to-zinc-950 flex items-center justify-center">
        <motion.div
          className="flex flex-col items-center gap-4"
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.3 }}
        >
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
          >
            <Loader2 className="h-8 w-8 text-primary" />
          </motion.div>
          <motion.p
            className="text-sm text-muted-foreground"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            Loading conversation...
          </motion.p>
        </motion.div>
      </div>
    );
  }

  // Error state
  if (error || !selectedTicket) {
    return (
      <div className="h-screen w-screen bg-linear-to-br from-slate-50 to-slate-100 dark:from-zinc-900 dark:to-zinc-950 flex items-center justify-center">
        <motion.div
          className="flex flex-col items-center gap-4 text-center max-w-md p-6"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: "easeOut" }}
        >
          <motion.div
            className="h-16 w-16 rounded-full bg-red-100 dark:bg-red-500/20 flex items-center justify-center"
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.1, type: "spring", stiffness: 200, damping: 15 }}
          >
            <AlertCircle className="h-8 w-8 text-red-600 dark:text-red-400" />
          </motion.div>
          <motion.h2
            className="text-lg font-semibold"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
          >
            {error || "Ticket not found"}
          </motion.h2>
          <motion.p
            className="text-sm text-muted-foreground"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
          >
            The ticket you&apos;re looking for doesn&apos;t exist or you don&apos;t have permission to view it.
          </motion.p>
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
          >
            <Link href="/admin/crm/support">
              <Button variant="outline">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Support
              </Button>
            </Link>
          </motion.div>
        </motion.div>
      </div>
    );
  }

  const customerName = `${selectedTicket.user?.firstName || ""} ${selectedTicket.user?.lastName || ""}`.trim() || "Customer";
  const customerInitial = selectedTicket.user?.firstName?.charAt(0) || "C";

  // Group messages by date
  const groupedMessages = messages.reduce((groups, message) => {
    const date = new Date(message.timestamp).toDateString();
    if (!groups[date]) {
      groups[date] = [];
    }
    groups[date].push(message);
    return groups;
  }, {} as Record<string, Message[]>);

  const formatDateHeader = (dateString: string) => {
    const date = new Date(dateString);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === today.toDateString()) {
      return "Today";
    } else if (date.toDateString() === yesterday.toDateString()) {
      return "Yesterday";
    } else {
      return date.toLocaleDateString(undefined, {
        weekday: "long",
        month: "short",
        day: "numeric",
      });
    }
  };

  // Info Panel Content (reusable for both sheet and sidebar)
  const InfoPanelContent = () => (
    <div className="p-4 space-y-6">
      {/* Customer Card */}
      <div className="space-y-3">
        <div className="flex items-center gap-3">
          <Avatar className="h-12 w-12 border-2 border-white dark:border-zinc-800 shadow-md">
            <AvatarImage src={selectedTicket.user?.avatar} />
            <AvatarFallback className="bg-linear-to-br from-blue-500 to-indigo-600 text-white font-medium">
              {customerInitial}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1">
            <h3 className="font-medium text-sm truncate">{customerName}</h3>
            <p className="text-xs text-muted-foreground truncate">
              {selectedTicket.user?.email || "No email"}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div className="bg-blue-50 dark:bg-blue-500/10 rounded-lg p-2.5 text-center border border-blue-100 dark:border-blue-500/20">
            <p className="text-lg font-semibold text-blue-600 dark:text-blue-400">
              {selectedTicket.userStats?.totalTickets || 0}
            </p>
            <p className="text-[10px] text-blue-600/70 dark:text-blue-400/70 uppercase tracking-wider font-medium">
              Tickets
            </p>
          </div>
          <div className="bg-emerald-50 dark:bg-emerald-500/10 rounded-lg p-2.5 text-center border border-emerald-100 dark:border-emerald-500/20">
            <p className="text-lg font-semibold text-emerald-600 dark:text-emerald-400">
              {selectedTicket.userStats?.resolvedTickets || 0}
            </p>
            <p className="text-[10px] text-emerald-600/70 dark:text-emerald-400/70 uppercase tracking-wider font-medium">
              Resolved
            </p>
          </div>
        </div>
      </div>

      {/* Divider */}
      <div className="h-px bg-linear-to-r from-transparent via-border to-transparent" />

      {/* Ticket Info */}
      <div className="space-y-4">
        <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
          Ticket Information
        </h4>

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Ticket className="h-3.5 w-3.5" />
              <span>Status</span>
            </div>
            <Badge
              variant="outline"
              className={cn(
                "text-[10px] px-2 py-0.5 cursor-pointer hover:opacity-80 transition-opacity",
                getStatusStyle(selectedTicket.status)
              )}
              onClick={() => setIsStatusDialogOpen(true)}
            >
              {selectedTicket.status}
              <ChevronRight className="h-3 w-3 ml-1" />
            </Badge>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <AlertCircle className="h-3.5 w-3.5" />
              <span>Priority</span>
            </div>
            <Badge
              variant="outline"
              className={cn(
                "text-[10px] px-2 py-0.5",
                getImportanceStyle(selectedTicket.importance)
              )}
            >
              {selectedTicket.importance}
            </Badge>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <MessageSquare className="h-3.5 w-3.5" />
              <span>Type</span>
            </div>
            <div className="flex items-center gap-1.5">
              {selectedTicket.type === "LIVE" && wsConnected && (
                <div className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
              )}
              <span className="text-xs font-medium">
                {selectedTicket.type || "TICKET"}
              </span>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Calendar className="h-3.5 w-3.5" />
              <span>Created</span>
            </div>
            <span className="text-xs">
              {selectedTicket.createdAt
                ? new Date(selectedTicket.createdAt).toLocaleDateString()
                : "N/A"}
            </span>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Clock className="h-3.5 w-3.5" />
              <span>Response</span>
            </div>
            <span className="text-xs">
              {selectedTicket.responseTime
                ? `${selectedTicket.responseTime} min`
                : "—"}
            </span>
          </div>
        </div>
      </div>

      {/* Tags */}
      {selectedTicket.tags && selectedTicket.tags.length > 0 && (
        <>
          <div className="h-px bg-linear-to-r from-transparent via-border to-transparent" />
          <div className="space-y-3">
            <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Tags
            </h4>
            <div className="flex flex-wrap gap-1.5">
              {selectedTicket.tags.map((tag) => (
                <Badge
                  key={tag}
                  variant="secondary"
                  className="text-[10px] px-2 py-0.5 bg-slate-100 dark:bg-zinc-800"
                >
                  <Tag className="h-2.5 w-2.5 mr-1" />
                  {tag}
                </Badge>
              ))}
            </div>
          </div>
        </>
      )}

      {/* Agent Info */}
      {selectedTicket.agent && (
        <>
          <div className="h-px bg-linear-to-r from-transparent via-border to-transparent" />
          <div className="space-y-3">
            <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Assigned Agent
            </h4>
            <div className="flex items-center gap-3">
              <Avatar className="h-10 w-10">
                <AvatarImage src={selectedTicket.agent.avatar} />
                <AvatarFallback className="bg-linear-to-br from-indigo-500 to-purple-600 text-white text-xs">
                  {selectedTicket.agent.firstName?.charAt(0) || "A"}
                </AvatarFallback>
              </Avatar>
              <div>
                <p className="text-sm font-medium">
                  {`${selectedTicket.agent.firstName || ""} ${selectedTicket.agent.lastName || ""}`.trim() ||
                    "Agent"}
                </p>
                <div className="flex items-center gap-1 text-xs text-emerald-600 dark:text-emerald-400">
                  <div className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                  Online
                </div>
              </div>
            </div>
            {selectedTicket.agentStats && (
              <div className="grid grid-cols-2 gap-2">
                <div className="bg-slate-50 dark:bg-zinc-800/50 rounded-lg p-2 text-center border border-slate-100 dark:border-zinc-700/50">
                  <p className="text-sm font-semibold">
                    {selectedTicket.agentStats.avgRating?.toFixed(1) || "—"}
                  </p>
                  <p className="text-[10px] text-muted-foreground">Rating</p>
                </div>
                <div className="bg-slate-50 dark:bg-zinc-800/50 rounded-lg p-2 text-center border border-slate-100 dark:border-zinc-700/50">
                  <p className="text-sm font-semibold">
                    {selectedTicket.agentStats.resolved}
                  </p>
                  <p className="text-[10px] text-muted-foreground">Resolved</p>
                </div>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );

  return (
    <div className="h-screen w-screen bg-linear-to-br from-slate-50 via-white to-slate-100 dark:from-zinc-900 dark:via-zinc-900 dark:to-zinc-950 flex overflow-hidden">
      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col min-w-0 h-full">
        {/* Top Bar */}
        <motion.div
          className="h-14 md:h-16 border-b border-slate-200 dark:border-zinc-800 bg-white/80 dark:bg-zinc-900/80 backdrop-blur-sm flex items-center justify-between px-3 md:px-4 shrink-0"
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.3 }}
        >
          {/* Left side */}
          <motion.div
            className="flex items-center gap-2 md:gap-3 min-w-0 flex-1"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.1, duration: 0.3 }}
          >
            <Link href="/admin/crm/support">
              <motion.div whileHover={{ scale: 1.1, x: -2 }} whileTap={{ scale: 0.9 }}>
                <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0">
                  <ArrowLeft className="h-4 w-4" />
                </Button>
              </motion.div>
            </Link>

            <div className="flex items-center gap-2 md:gap-3 min-w-0">
              <motion.div
                className="relative shrink-0"
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", stiffness: 400, damping: 20, delay: 0.15 }}
              >
                <Avatar className="h-8 w-8 md:h-10 md:w-10 border-2 border-white dark:border-zinc-800 shadow-sm">
                  <AvatarImage src={selectedTicket.user?.avatar} />
                  <AvatarFallback className="bg-linear-to-br from-blue-500 to-indigo-600 text-white text-xs md:text-sm font-medium">
                    {customerInitial}
                  </AvatarFallback>
                </Avatar>
                {selectedTicket.type === "LIVE" && wsConnected && (
                  <motion.div
                    className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full bg-emerald-500 border-2 border-white dark:border-zinc-900"
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: 0.3, type: "spring", stiffness: 500 }}
                  />
                )}
              </motion.div>

              <motion.div
                className="min-w-0"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2, duration: 0.3 }}
              >
                <div className="flex items-center gap-2">
                  <h1 className="text-sm font-semibold truncate max-w-[120px] sm:max-w-[200px] md:max-w-[300px]">
                    {selectedTicket.subject}
                  </h1>
                  <motion.div
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.25 }}
                  >
                    <Badge
                      variant="outline"
                      className={cn("text-[10px] px-1.5 py-0 h-5 font-medium hidden sm:flex", getStatusStyle(selectedTicket.status))}
                    >
                      {selectedTicket.status}
                    </Badge>
                  </motion.div>
                </div>
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <span className="truncate max-w-20 sm:max-w-none">{customerName}</span>
                  <span className="hidden sm:inline">•</span>
                  <span className="hidden sm:inline">#{selectedTicket.id.slice(0, 8)}</span>
                </div>
              </motion.div>
            </div>
          </motion.div>

          {/* Right side - Actions */}
          <motion.div
            className="flex items-center gap-1 md:gap-2 shrink-0"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.1, duration: 0.3 }}
          >
            {/* Status Update - Desktop */}
            <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} className="hidden md:block">
              <Button
                variant="outline"
                size="sm"
                className="flex gap-1.5 h-8 text-xs"
                onClick={() => setIsStatusDialogOpen(true)}
              >
                <Settings className="h-3.5 w-3.5" />
                Status
              </Button>
            </motion.div>

            {/* Close Ticket - Desktop */}
            <AnimatePresence>
              {selectedTicket.status !== "CLOSED" && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className="hidden md:block"
                >
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex gap-1.5 h-8 text-xs text-red-600 dark:text-red-400 border-red-200 dark:border-red-500/30 hover:bg-red-50 dark:hover:bg-red-500/10"
                    onClick={handleCloseTicket}
                  >
                    <Ban className="h-3.5 w-3.5" />
                    Close
                  </Button>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Theme Toggle */}
            <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
              >
                <Sun className="h-4 w-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
                <Moon className="absolute h-4 w-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
              </Button>
            </motion.div>

            {/* Info Panel Toggle - Desktop */}
            <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }} className="hidden lg:block">
              <Button
                variant="ghost"
                size="icon"
                className={cn("h-8 w-8 flex", showInfoPanel && "bg-slate-100 dark:bg-zinc-800")}
                onClick={() => setShowInfoPanel(!showInfoPanel)}
              >
                <motion.div
                  animate={{ rotate: showInfoPanel ? 180 : 0 }}
                  transition={{ duration: 0.3 }}
                >
                  <Info className="h-4 w-4" />
                </motion.div>
              </Button>
            </motion.div>

            {/* Mobile Info Sheet */}
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8 lg:hidden">
                  <Info className="h-4 w-4" />
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-[300px] sm:w-[350px] p-0">
                <SheetHeader className="p-4 border-b">
                  <SheetTitle>Ticket Details</SheetTitle>
                </SheetHeader>
                <div className="overflow-y-auto h-[calc(100vh-60px)]">
                  <InfoPanelContent />
                </div>
              </SheetContent>
            </Sheet>

            {/* More Menu - Mobile Only */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8 md:hidden">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem onClick={() => setIsStatusDialogOpen(true)}>
                  <Settings className="h-4 w-4 mr-2" />
                  Update Status
                </DropdownMenuItem>
                {selectedTicket.status !== "CLOSED" && (
                  <DropdownMenuItem onClick={handleCloseTicket} className="text-red-600 dark:text-red-400">
                    <Ban className="h-4 w-4 mr-2" />
                    Close Ticket
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </motion.div>
        </motion.div>

        {/* Messages Area */}
        <div
          ref={chatContainerRef}
          className="flex-1 overflow-y-auto px-3 md:px-4"
          style={{ minHeight: 0 }}
        >
          <motion.div
            className="max-w-3xl mx-auto py-4 space-y-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.3 }}
          >
            {Object.entries(groupedMessages).map(([date, dateMessages], groupIndex) => (
              <div key={date} className="space-y-3">
                {/* Date Separator */}
                <motion.div
                  className="flex items-center gap-4 my-4"
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: groupIndex * 0.1, duration: 0.3 }}
                >
                  <div className="flex-1 h-px bg-linear-to-r from-transparent via-slate-200 dark:via-zinc-700 to-transparent" />
                  <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider bg-white dark:bg-zinc-900 px-2">
                    {formatDateHeader(date)}
                  </span>
                  <div className="flex-1 h-px bg-linear-to-r from-transparent via-slate-200 dark:via-zinc-700 to-transparent" />
                </motion.div>

                {/* Messages for this date */}
                <AnimatePresence mode="popLayout">
                  {dateMessages.map((message, index) => {
                    const isAgent = message.sender === "agent";
                    const showAvatar =
                      index === 0 ||
                      dateMessages[index - 1]?.sender !== message.sender;

                    return (
                      <motion.div
                        key={message.id}
                        layout
                        initial={{ opacity: 0, y: 20, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.95, transition: { duration: 0.15 } }}
                        transition={{
                          type: "spring",
                          stiffness: 500,
                          damping: 40,
                          mass: 1,
                        }}
                        className={cn(
                          "flex gap-2 md:gap-3",
                          isAgent ? "justify-end" : "justify-start"
                        )}
                      >
                        {/* User Avatar */}
                        {!isAgent && (
                          <div className="w-7 md:w-8 shrink-0">
                            {showAvatar && (
                              <motion.div
                                initial={{ scale: 0 }}
                                animate={{ scale: 1 }}
                                transition={{ type: "spring", stiffness: 500, damping: 30 }}
                              >
                                <Avatar className="h-7 w-7 md:h-8 md:w-8">
                                  <AvatarImage src={selectedTicket.user?.avatar} />
                                  <AvatarFallback className="bg-slate-200 dark:bg-zinc-700 text-xs">
                                    {customerInitial}
                                  </AvatarFallback>
                                </Avatar>
                              </motion.div>
                            )}
                          </div>
                        )}

                        <div
                          className={cn(
                            "flex flex-col max-w-[75%] md:max-w-[70%]",
                            isAgent ? "items-end" : "items-start"
                          )}
                        >
                          {/* Sender name for first message in group */}
                          {showAvatar && (
                            <motion.span
                              className="text-[10px] font-medium text-muted-foreground mb-1 px-1"
                              initial={{ opacity: 0 }}
                              animate={{ opacity: 1 }}
                              transition={{ delay: 0.1 }}
                            >
                              {message.senderName}
                            </motion.span>
                          )}

                          {/* Message Bubble */}
                          {(() => {
                            const isImageOnly = (!message.content || message.content === "[Image]") &&
                              message.attachments &&
                              message.attachments.length > 0 &&
                              message.attachments.every(a => a.match(/\.(jpg|jpeg|png|gif|webp)$/i));

                            return (
                              <motion.div
                                className={cn(
                                  "rounded-2xl shadow-sm overflow-hidden",
                                  isImageOnly ? "p-0.5" : "px-3 md:px-4 py-2 md:py-2.5",
                                  isAgent
                                    ? "bg-linear-to-br from-blue-500 to-indigo-600 text-white rounded-br-md"
                                    : "bg-white dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 rounded-bl-md"
                                )}
                                whileHover={{ scale: 1.01 }}
                                transition={{ type: "spring", stiffness: 400, damping: 25 }}
                              >
                                {/* Only show text content if it's not just "[Image]" placeholder */}
                                {message.content && message.content !== "[Image]" && (
                                  <p className="text-[13px] leading-relaxed whitespace-pre-wrap overflow-wrap-break-word">
                                    {message.content}
                                  </p>
                                )}

                                {/* Attachments */}
                                {message.attachments && message.attachments.length > 0 && (
                                  <div className={cn("space-y-2", message.content && message.content !== "[Image]" && "mt-2")}>
                                    {message.attachments.map((attachment, idx) => {
                                      const isImage = attachment.match(/\.(jpg|jpeg|png|gif|webp)$/i);
                                      if (isImage) {
                                        return (
                                          <motion.button
                                            key={idx}
                                            type="button"
                                            onClick={() => setLightboxImage(attachment)}
                                            className="block cursor-pointer overflow-hidden hover:opacity-90 transition-opacity"
                                            whileTap={{ scale: 0.98 }}
                                          >
                                            <img
                                              src={attachment}
                                              alt={`Attachment ${idx + 1}`}
                                              className={cn(
                                                "max-w-60 max-h-48 object-contain",
                                                isAgent ? "rounded-[14px] rounded-br-sm" : "rounded-[14px] rounded-bl-sm"
                                              )}
                                              onLoad={handleImageLoad}
                                            />
                                          </motion.button>
                                        );
                                      } else {
                                        return (
                                          <a
                                            key={idx}
                                            href={attachment}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className={cn(
                                              "flex items-center gap-2 text-xs",
                                              isAgent
                                                ? "text-white/80 hover:text-white"
                                                : "text-muted-foreground hover:text-foreground"
                                            )}
                                          >
                                            <Paperclip className="h-3 w-3" />
                                            <span className="underline">Attachment</span>
                                          </a>
                                        );
                                      }
                                    })}
                                  </div>
                                )}
                              </motion.div>
                            );
                          })()}

                          {/* Timestamp */}
                          <motion.span
                            className="text-[10px] text-muted-foreground/60 mt-1 px-1"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ delay: 0.15 }}
                          >
                            {new Date(message.timestamp).toLocaleTimeString([], {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </motion.span>
                        </div>

                        {/* Agent Avatar */}
                        {isAgent && (
                          <div className="w-7 md:w-8 shrink-0">
                            {showAvatar && (
                              <motion.div
                                initial={{ scale: 0 }}
                                animate={{ scale: 1 }}
                                transition={{ type: "spring", stiffness: 500, damping: 30 }}
                              >
                                <Avatar className="h-7 w-7 md:h-8 md:w-8">
                                  <AvatarImage src={selectedTicket.agent?.avatar} />
                                  <AvatarFallback className="bg-linear-to-br from-indigo-500 to-purple-600 text-white text-xs">
                                    {selectedTicket.agent?.firstName?.charAt(0) || "A"}
                                  </AvatarFallback>
                                </Avatar>
                              </motion.div>
                            )}
                          </div>
                        )}
                      </motion.div>
                    );
                  })}
                </AnimatePresence>
              </div>
            ))}

            {/* Empty state */}
            {messages.length === 0 && (
              <motion.div
                className="flex flex-col items-center justify-center py-16 md:py-20 text-center"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
              >
                <motion.div
                  className="h-14 w-14 md:h-16 md:w-16 rounded-full bg-slate-100 dark:bg-zinc-800 flex items-center justify-center mb-4"
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: "spring", stiffness: 300, damping: 20 }}
                >
                  <MessageSquare className="h-7 w-7 md:h-8 md:w-8 text-muted-foreground" />
                </motion.div>
                <motion.h3
                  className="text-sm font-medium mb-1"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.3 }}
                >
                  No messages yet
                </motion.h3>
                <motion.p
                  className="text-xs text-muted-foreground"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.4 }}
                >
                  Start the conversation by sending a message below.
                </motion.p>
              </motion.div>
            )}

            <div ref={messagesEndRef} className="h-4" />
          </motion.div>
        </div>

        {/* Input Area */}
        <motion.div
          className="border-t border-slate-200 dark:border-zinc-800 bg-white/80 dark:bg-zinc-900/80 backdrop-blur-sm p-3 md:p-4 shrink-0"
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.2, duration: 0.3 }}
        >
          <div className="max-w-3xl mx-auto">
            <AnimatePresence mode="wait">
              {selectedTicket.status === "CLOSED" ? (
                <motion.div
                  key="closed"
                  className="flex items-center justify-center gap-2 py-3 px-4 bg-emerald-50 dark:bg-emerald-500/10 rounded-xl border border-emerald-200 dark:border-emerald-500/20"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                >
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: "spring", stiffness: 400, damping: 20 }}
                  >
                    <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                  </motion.div>
                  <span className="text-sm text-emerald-700 dark:text-emerald-400 font-medium">
                    This ticket has been resolved
                  </span>
                </motion.div>
              ) : (
                <motion.div
                  key="input"
                  className="flex items-end gap-2"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 10 }}
                >
                  <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-10 w-10 md:h-11 md:w-11 shrink-0 rounded-xl text-muted-foreground hover:text-foreground hover:bg-slate-200 dark:hover:bg-zinc-700"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={isUploading}
                    >
                      {isUploading ? (
                        <motion.div
                          animate={{ rotate: 360 }}
                          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                        >
                          <Loader2 className="h-5 w-5" />
                        </motion.div>
                      ) : (
                        <Paperclip className="h-5 w-5" />
                      )}
                    </Button>
                  </motion.div>

                  <div className="flex-1 relative">
                    <Textarea
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      placeholder="Type your message..."
                      className="min-h-10 md:min-h-11 max-h-[150px] md:max-h-[200px] py-2.5 md:py-3 px-4 pr-14 text-sm resize-none rounded-xl bg-slate-100 dark:bg-zinc-800 border-0 focus-visible:ring-2 focus-visible:ring-blue-500/50"
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && !e.shiftKey) {
                          e.preventDefault();
                          handleSendMessage();
                        }
                      }}
                      rows={1}
                    />
                    <motion.div
                      className="absolute right-1.5 bottom-1.5"
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.9 }}
                      animate={newMessage.trim() ? { scale: [1, 1.05, 1] } : {}}
                      transition={{ duration: 0.2 }}
                    >
                      <Button
                        onClick={handleSendMessage}
                        disabled={!newMessage.trim() || isUploading}
                        size="icon"
                        className="h-7 w-7 md:h-8 md:w-8 shrink-0 rounded-lg bg-linear-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white shadow-md disabled:opacity-40 disabled:shadow-none"
                      >
                        <Send className="h-3.5 w-3.5 md:h-4 md:w-4" />
                      </Button>
                    </motion.div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </motion.div>
      </div>

      {/* Info Panel - Desktop Only */}
      <AnimatePresence>
        {showInfoPanel && (
          <motion.div
            className="w-80 border-l border-slate-200 dark:border-zinc-800 bg-white/50 dark:bg-zinc-900/50 backdrop-blur-sm shrink-0 hidden lg:flex flex-col h-full"
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: 320, opacity: 1 }}
            exit={{ width: 0, opacity: 0 }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
          >
            {/* Panel Header */}
            <motion.div
              className="h-14 md:h-16 border-b border-slate-200 dark:border-zinc-800 flex items-center justify-between px-4 shrink-0"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.1 }}
            >
              <span className="text-sm font-semibold">Details</span>
              <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  onClick={() => setShowInfoPanel(false)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </motion.div>
            </motion.div>

            <motion.div
              className="flex-1 overflow-y-auto"
              style={{ minHeight: 0 }}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.15 }}
            >
              <InfoPanelContent />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Status Update Dialog */}
      <Dialog open={isStatusDialogOpen} onOpenChange={setIsStatusDialogOpen}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>Update Status</DialogTitle>
            <DialogDescription>
              Change the ticket status to update the customer.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            <div className="space-y-2">
              <Label htmlFor="status">Status</Label>
              <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="PENDING">Pending</SelectItem>
                  <SelectItem value="OPEN">Open</SelectItem>
                  <SelectItem value="REPLIED">Replied</SelectItem>
                  <SelectItem value="CLOSED">Closed</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex justify-end gap-2 pt-4">
              <Button variant="outline" onClick={() => setIsStatusDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleUpdateStatus} className="bg-linear-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700">
                Update
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileUpload}
        className="hidden"
      />

      {/* Internal Lightbox */}
      <AnimatePresence>
        {lightboxImage && (
          <motion.div
            className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center cursor-zoom-out"
            onClick={() => setLightboxImage(null)}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            <motion.div
              className="absolute top-4 right-4"
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ delay: 0.1 }}
            >
              <Button
                variant="ghost"
                size="icon"
                className="h-10 w-10 text-white/80 hover:text-white hover:bg-white/10"
                onClick={(e) => {
                  e.stopPropagation();
                  setLightboxImage(null);
                }}
              >
                <X className="h-6 w-6" />
              </Button>
            </motion.div>
            <motion.img
              src={lightboxImage}
              alt="Full size"
              className="max-w-[90vw] max-h-[90vh] object-contain rounded-lg shadow-2xl"
              onClick={(e) => e.stopPropagation()}
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
              transition={{ type: "spring", stiffness: 300, damping: 25 }}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
