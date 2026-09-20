"use client";
import { useState, useEffect, useRef } from "react";
import { m, AnimatePresence } from "framer-motion";
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
import { statusTone } from "@/lib/status-tone";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Textarea } from "@/components/ui/textarea";
import { Loadable } from "@/components/ui/skeleton";
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
import { useTranslations } from "next-intl";

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

export default function SupportTicketDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const t = useTranslations("dashboard_admin");
  const tCommon = useTranslations("common");
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
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const isDev = process.env.NODE_ENV === "development";
    const backendPort = process.env.NEXT_PUBLIC_BACKEND_PORT || "4000";
    // In development, connect directly to backend (Next.js rewrites don't support WebSocket upgrades)
    const wsHost = isDev ? `${window.location.hostname}:${backendPort}` : window.location.host;
    const wsUrl = `${protocol}//${wsHost}/api/user/support/ticket`;

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

    // Always the staff route. Non-LIVE replies used to POST to
    // `/api/user/support/ticket/[id]`, which scopes its lookup to
    // `userId: user.id` — so it 404s for an admin who is not the ticket owner,
    // and 403s on `type: "agent"` even when they are. Agent replies to normal
    // tickets were therefore impossible. The staff route takes both kinds: it
    // resolves the ticket by primary key and assigns the agent on first reply.
    const { data, error } = await $fetch({
      url: `/api/admin/crm/support/ticket/${selectedTicket.id}/reply`,
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
        title: t("message_failed"),
        description: error || t("failed_to_send_message_please_try_again"),
        variant: "destructive",
      });
      return;
    }

    // Only LIVE tickets hold a socket, so only they learn the new status and
    // agent assignment by broadcast. For a normal ticket the reply is the only
    // moment the header can learn it — otherwise it keeps reading OPEN and
    // "Unassigned" until a manual reload.
    const updated = data?.data;
    if (updated) {
      setSelectedTicket((prev) =>
        prev
          ? {
              ...prev,
              status: updated.status ?? prev.status,
              agentId: updated.agentId ?? prev.agentId,
              agentName: updated.agentName ?? prev.agentName,
              updatedAt: updated.updatedAt ? new Date(updated.updatedAt) : prev.updatedAt,
            }
          : prev
      );
    }
  };

  const handleUpdateStatus = async () => {
    if (!selectedTicket || !selectedStatus) return;

    const { data } = await $fetch({
      url: `/api/admin/crm/support/ticket/${selectedTicket.id}/status`,
      method: "PUT",
      body: { status: selectedStatus },
      successMessage: tCommon("status_updated"),
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
      successMessage: tCommon("ticket_closed"),
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
        title: tCommon("invalid_file_type"),
        description: tCommon("please_select_an_image_file"),
        variant: "destructive",
      });
      return;
    }

    // Check file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      toast({
        title: tCommon("file_too_large"),
        description: tCommon("file_size_must_be_less_than_10mb"),
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
            title: tCommon("upload_failed"),
            description: t("failed_to_send_image_please_try_again"),
            variant: "destructive",
          });
        }
      } else {
        toast({
          title: tCommon("upload_failed"),
          description: uploadResult.error || tCommon("failed_to_upload_image"),
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error uploading file:", error);
      toast({
        title: tCommon("upload_failed"),
        description: tCommon("failed_to_upload_image"),
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
          setError(t("failed_to_load_ticket", { error: String(error) }));
          return;
        }

        if (!data) {
          setError(t("no_ticket_data_received"));
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
        // Normalize status to uppercase to match SelectItem values
        setSelectedStatus(data.status?.toUpperCase() || "PENDING");
      } catch (error: any) {
        setError(error.message || tCommon("unexpected_error"));
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

  /**
   * NOT-FOUND IS AN OUTCOME. PENDING IS NOT.
   * ==========================================================================
   *
   * What was here: two consecutive full-viewport returns, `if (isLoading)`
   * then `if (error || !selectedTicket)`, each a `h-screen w-screen` centred
   * box. The first one is gone entirely — see the comment on the return below —
   * and only the second survives, because "this ticket does not exist or you
   * cannot see it" is a genuine terminal answer for this URL, not a stage on
   * the way to the conversation. Reaching it is a dead end by design; it has a
   * Back button and no layout to preserve.
   *
   * `notFound` is a named boolean rather than `!isLoading && (error || …)`
   * inline, because the two ideas being separated here are exactly the ones
   * the old code ran together, and the name is where the separation is stated.
   */
  const notFound = !isLoading && (Boolean(error) || !selectedTicket);

  if (notFound) {
    return (
      <div className="h-screen w-screen bg-background flex items-center justify-center">
        <m.div
          className="flex flex-col items-center gap-4 text-center max-w-md p-6"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: "easeOut" }}
        >
          <m.div
            className="h-16 w-16 rounded-full bg-destructive/10 flex items-center justify-center"
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.1, type: "spring", stiffness: 200, damping: 15 }}
          >
            <AlertCircle className="h-8 w-8 text-destructive-ink" />
          </m.div>
          <m.h2
            className="text-lg font-semibold"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
          >
            {error || tCommon("ticket_not_found")}
          </m.h2>
          <m.p
            className="text-sm text-muted-foreground"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
          >
            {tCommon("the_ticket_youre_looking_for_doesnt")}
          </m.p>
          <m.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
          >
            <Link href="/admin/crm/support">
              <Button variant="outline">
                <ArrowLeft className="h-4 w-4 mr-2" />
                {tCommon("back_to_support")}
              </Button>
            </Link>
          </m.div>
        </m.div>
      </div>
    );
  }

  /**
   * EMPTY IS A CONCLUSION; PENDING IS NOT.
   *
   * `messages` is `[]` before the fetch AND when a ticket genuinely has no
   * replies. Now that the transcript renders during the wait, the difference
   * has to be stated once, here, instead of being hidden by the fact that the
   * page used not to be on screen at all.
   */
  const showEmptyState = !isLoading && messages.length === 0;

  const customerName = `${selectedTicket?.user?.firstName || ""} ${selectedTicket?.user?.lastName || ""}`.trim() || "Customer";
  const customerInitial = selectedTicket?.user?.firstName?.charAt(0) || "C";

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
          <Avatar className="h-12 w-12 border-2 border-border shadow-md">
            <AvatarImage src={selectedTicket?.user?.avatar} />
            <AvatarFallback className="bg-primary text-primary-foreground font-medium">
              {customerInitial}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1">
            <h3 className="font-medium text-sm truncate">
              <Loadable loading={isLoading} placeholder={t("jordan_fletcher")}>
                {customerName}
              </Loadable>
            </h3>
            <p className="text-xs text-muted-foreground truncate">
              <Loadable loading={isLoading} placeholder="name@example.com">
                {selectedTicket?.user?.email || t("no_email")}
              </Loadable>
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div className="bg-primary/10 rounded-lg p-2.5 text-center border border-primary/20">
            <p className="text-lg font-semibold text-primary-ink">
              <Loadable loading={isLoading} placeholder="00">
                {selectedTicket?.userStats?.totalTickets || 0}
              </Loadable>
            </p>
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium">
              Tickets
            </p>
          </div>
          <div className="bg-success/10 rounded-lg p-2.5 text-center border border-success/20">
            <p className="text-lg font-semibold text-success-ink">
              <Loadable loading={isLoading} placeholder="00">
                {selectedTicket?.userStats?.resolvedTickets || 0}
              </Loadable>
            </p>
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium">
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
          {t("ticket_information")}
        </h4>

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Ticket className="h-3.5 w-3.5" />
              <span>Status</span>
            </div>
            <Badge
              tone={statusTone(selectedTicket?.status)}
              size="xs"
              className="cursor-pointer hover:opacity-80 transition-opacity"
              onClick={() => {
                /* Guarded rather than hidden: the chip has to keep its slot in
                   the details rail while the ticket loads, but it must not
                   open a status dialog for a record with no status. */
                if (!isLoading) setIsStatusDialogOpen(true);
              }}
            >
              <Loadable loading={isLoading} placeholder="PENDING">
                {selectedTicket?.status}
              </Loadable>
              <ChevronRight className="h-3 w-3 ml-1" />
            </Badge>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <AlertCircle className="h-3.5 w-3.5" />
              <span>Priority</span>
            </div>
            <Badge
              tone={statusTone(selectedTicket?.importance)}
              size="xs"
            >
              <Loadable loading={isLoading} placeholder="MEDIUM">
                {selectedTicket?.importance}
              </Loadable>
            </Badge>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <MessageSquare className="h-3.5 w-3.5" />
              <span>Type</span>
            </div>
            <div className="flex items-center gap-1.5">
              {selectedTicket?.type === "LIVE" && wsConnected && (
                <div className="h-1.5 w-1.5 rounded-full bg-success animate-pulse" />
              )}
              <span className="text-xs font-medium">
                <Loadable loading={isLoading} placeholder="TICKET">
                  {selectedTicket?.type || tCommon("ticket")}
                </Loadable>
              </span>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Calendar className="h-3.5 w-3.5" />
              <span>Created</span>
            </div>
            <span className="text-xs">
              <Loadable loading={isLoading} placeholder="00/00/0000">
                {selectedTicket?.createdAt
                  ? new Date(selectedTicket?.createdAt).toLocaleDateString()
                  : "N/A"}
              </Loadable>
            </span>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Clock className="h-3.5 w-3.5" />
              <span>Response</span>
            </div>
            <span className="text-xs">
              <Loadable loading={isLoading} placeholder="00 min">
                {selectedTicket?.responseTime
                  ? t("min", { responseTime: String(selectedTicket?.responseTime) })
                  : "—"}
              </Loadable>
            </span>
          </div>
        </div>
      </div>

      {/* Tags */}
      {(selectedTicket?.tags?.length ?? 0) > 0 && (
        <>
          <div className="h-px bg-linear-to-r from-transparent via-border to-transparent" />
          <div className="space-y-3">
            <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Tags
            </h4>
            <div className="flex flex-wrap gap-1.5">
              {(selectedTicket?.tags ?? []).map((tag) => (
                <Badge key={tag} tone="neutral" size="xs">
                  <Tag className="h-2.5 w-2.5 mr-1" />
                  {tag}
                </Badge>
              ))}
            </div>
          </div>
        </>
      )}

      {/* Agent Info */}
      {selectedTicket?.agent && (
        <>
          <div className="h-px bg-linear-to-r from-transparent via-border to-transparent" />
          <div className="space-y-3">
            <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              {tCommon("assigned_agent")}
            </h4>
            <div className="flex items-center gap-3">
              <Avatar className="h-10 w-10">
                <AvatarImage src={selectedTicket?.agent?.avatar} />
                <AvatarFallback className="bg-primary text-primary-foreground text-xs">
                  {selectedTicket?.agent?.firstName?.charAt(0) || "A"}
                </AvatarFallback>
              </Avatar>
              <div>
                <p className="text-sm font-medium">
                  {`${selectedTicket?.agent?.firstName || ""} ${selectedTicket?.agent?.lastName || ""}`.trim() ||
                    tCommon("agent")}
                </p>
                <div className="flex items-center gap-1 text-xs text-success-ink">
                  <div className="h-1.5 w-1.5 rounded-full bg-success" />
                  Online
                </div>
              </div>
            </div>
            {selectedTicket?.agentStats && (
              <div className="grid grid-cols-2 gap-2">
                <div className="bg-muted rounded-lg p-2 text-center border border-border dark:border-border-strong/50">
                  <p className="text-sm font-semibold">
                    {selectedTicket?.agentStats?.avgRating?.toFixed(1) || "—"}
                  </p>
                  <p className="text-[10px] text-muted-foreground">Rating</p>
                </div>
                <div className="bg-muted rounded-lg p-2 text-center border border-border dark:border-border-strong/50">
                  <p className="text-sm font-semibold">
                    {selectedTicket?.agentStats?.resolved}
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

  /**
   * ONE TREE, BOTH STATES — and on this route that is the difference between
   * a page and a blank screen.
   * ==========================================================================
   *
   * What was removed: `if (isLoading) return <div className="h-screen w-screen
   * bg-background flex items-center justify-center"><Loader2/>Loading
   * conversation...</div>`.
   *
   * This is a chrome-less, full-viewport route — `h-screen w-screen` — so that
   * swap was the entire application replaced by a centred spinner. And almost
   * nothing it replaced was actually unknown: the 56/64px top bar, the Back
   * button, the Status and Close buttons, the theme toggle, the info-panel
   * toggle, the scrolling transcript region, the composer with its attach and
   * send buttons, and the 320px details rail are all fixed geometry that this
   * file could draw before the request left the browser. Only about a dozen
   * strings and two counters depend on the fetch.
   *
   * Because the swap was full-viewport it also cost the scroll container: the
   * transcript element did not exist during the wait, so it was created and
   * then immediately scrolled to the bottom by the `useEffect` on `messages`,
   * which is the jump-to-bottom flash this page showed on every open.
   *
   * The transcript itself gets no pending rows on purpose. A conversation has
   * no knowable length, and its container is `flex-1 overflow-y-auto` inside a
   * `h-screen` column — the region's box is fixed by the frame either way, so
   * filling it with fake bubbles would buy no stability and would put words
   * that are not in the ticket on an admin's screen.
   */
  return (
    <div className="h-screen w-screen bg-background flex overflow-hidden">
      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col min-w-0 h-full">
        {/* Top Bar */}
        <m.div
          className="h-14 md:h-16 border-b border-border bg-card/80 backdrop-blur-sm flex items-center justify-between px-3 md:px-4 shrink-0"
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.3 }}
        >
          {/* Left side */}
          <m.div
            className="flex items-center gap-2 md:gap-3 min-w-0 flex-1"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.1, duration: 0.3 }}
          >
            <Link href="/admin/crm/support">
              <m.div whileHover={{ scale: 1.1, x: -2 }} whileTap={{ scale: 0.9 }}>
                <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0">
                  <ArrowLeft className="h-4 w-4" />
                </Button>
              </m.div>
            </Link>

            <div className="flex items-center gap-2 md:gap-3 min-w-0">
              <m.div
                className="relative shrink-0"
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", stiffness: 400, damping: 20, delay: 0.15 }}
              >
                <Avatar className="h-8 w-8 md:h-10 md:w-10 border-2 border-border shadow-sm">
                  <AvatarImage src={selectedTicket?.user?.avatar} />
                  <AvatarFallback className="bg-primary text-primary-foreground text-xs md:text-sm font-medium">
                    {customerInitial}
                  </AvatarFallback>
                </Avatar>
                {selectedTicket?.type === "LIVE" && wsConnected && (
                  <m.div
                    className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full bg-success border-2 border-card"
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: 0.3, type: "spring", stiffness: 500 }}
                  />
                )}
              </m.div>

              <m.div
                className="min-w-0"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2, duration: 0.3 }}
              >
                <div className="flex items-center gap-2">
                  <h1 className="text-sm font-semibold truncate max-w-[120px] sm:max-w-[200px] md:max-w-[300px]">
                    <Loadable loading={isLoading} placeholder={t("loading_ticket_subject")}>
                      {selectedTicket?.subject}
                    </Loadable>
                  </h1>
                  <m.div
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.25 }}
                  >
                    <Badge
                      tone={statusTone(selectedTicket?.status)}
                      size="xs"
                      className="h-5 font-medium hidden sm:flex"
                    >
                      <Loadable loading={isLoading} placeholder="PENDING">
                        {selectedTicket?.status}
                      </Loadable>
                    </Badge>
                  </m.div>
                </div>
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <span className="truncate max-w-20 sm:max-w-none">
                    <Loadable loading={isLoading} placeholder={t("jordan_fletcher")}>
                      {customerName}
                    </Loadable>
                  </span>
                  <span className="hidden sm:inline">•</span>
                  <span className="hidden sm:inline">
                    #
                    <Loadable loading={isLoading} placeholder="00000000">
                      {selectedTicket?.id?.slice(0, 8)}
                    </Loadable>
                  </span>
                </div>
              </m.div>
            </div>
          </m.div>

          {/* Right side - Actions */}
          <m.div
            className="flex items-center gap-1 md:gap-2 shrink-0"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.1, duration: 0.3 }}
          >
            {/* Status Update - Desktop */}
            <m.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} className="hidden md:block">
              <Button
                variant="outline"
                size="sm"
                className="flex gap-1.5 h-8 text-xs"
                onClick={() => setIsStatusDialogOpen(true)}
                disabled={isLoading}
              >
                <Settings className="h-3.5 w-3.5" />
                Status
              </Button>
            </m.div>

            {/* Close Ticket - Desktop */}
            <AnimatePresence>
              {selectedTicket?.status !== "CLOSED" && (
                <m.div
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className="hidden md:block"
                >
                  {/* `selectedTicket?.status !== "CLOSED"` is TRUE while the
                      ticket is undefined, which is right for the layout — the
                      button should occupy its slot in both states — and wrong
                      for behaviour, because it would be a live control acting
                      on a record that has not arrived. `handleCloseTicket`
                      returns early on a null ticket, so a click was already
                      harmless; `disabled` makes that visible instead of
                      silent. */}
                  <Button
                    variant="outline"
                    tone="destructive"
                    size="sm"
                    className="flex gap-1.5 h-8 text-xs"
                    onClick={handleCloseTicket}
                    disabled={isLoading}
                  >
                    <Ban className="h-3.5 w-3.5" />
                    Close
                  </Button>
                </m.div>
              )}
            </AnimatePresence>

            {/* Theme Toggle */}
            <m.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
              >
                <Sun className="h-4 w-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
                <Moon className="absolute h-4 w-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
              </Button>
            </m.div>

            {/* Info Panel Toggle - Desktop */}
            <m.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }} className="hidden lg:block">
              <Button
                variant="ghost"
                size="icon"
                className={cn("h-8 w-8 flex", showInfoPanel && "bg-muted")}
                onClick={() => setShowInfoPanel(!showInfoPanel)}
              >
                <m.div
                  animate={{ rotate: showInfoPanel ? 180 : 0 }}
                  transition={{ duration: 0.3 }}
                >
                  <Info className="h-4 w-4" />
                </m.div>
              </Button>
            </m.div>

            {/* Mobile Info Sheet */}
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8 lg:hidden">
                  <Info className="h-4 w-4" />
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-[300px] sm:w-[350px] p-0">
                <SheetHeader className="p-4 border-b">
                  <SheetTitle>{tCommon("ticket_details")}</SheetTitle>
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
                <DropdownMenuItem
                  onClick={() => setIsStatusDialogOpen(true)}
                  disabled={isLoading}
                >
                  <Settings className="h-4 w-4 mr-2" />
                  {t("update_status")}
                </DropdownMenuItem>
                {selectedTicket?.status !== "CLOSED" && (
                  <DropdownMenuItem
                    onClick={handleCloseTicket}
                    disabled={isLoading}
                    className="text-destructive-ink"
                  >
                    <Ban className="h-4 w-4 mr-2" />
                    {tCommon("close_ticket")}
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </m.div>
        </m.div>

        {/* Messages Area */}
        <div
          ref={chatContainerRef}
          className="flex-1 overflow-y-auto px-3 md:px-4"
          style={{ minHeight: 0 }}
        >
          <m.div
            className="max-w-3xl mx-auto py-4 space-y-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.3 }}
          >
            {Object.entries(groupedMessages).map(([date, dateMessages], groupIndex) => (
              <div key={date} className="space-y-3">
                {/* Date Separator */}
                <m.div
                  className="flex items-center gap-4 my-4"
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: groupIndex * 0.1, duration: 0.3 }}
                >
                  <div className="flex-1 h-px bg-linear-to-r from-transparent via-border to-transparent" />
                  {/* The scroller paints nothing, so this chip sits on
                      `--background`. It used to be `bg-card`, i.e. a visible
                      lighter box behind the date. */}
                  <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider bg-background px-2">
                    {formatDateHeader(date)}
                  </span>
                  <div className="flex-1 h-px bg-linear-to-r from-transparent via-border to-transparent" />
                </m.div>

                {/* Messages for this date */}
                <AnimatePresence mode="popLayout">
                  {dateMessages.map((message, index) => {
                    const isAgent = message.sender === "agent";
                    const showAvatar =
                      index === 0 ||
                      dateMessages[index - 1]?.sender !== message.sender;

                    return (
                      <m.div
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
                              <m.div
                                initial={{ scale: 0 }}
                                animate={{ scale: 1 }}
                                transition={{ type: "spring", stiffness: 500, damping: 30 }}
                              >
                                <Avatar className="h-7 w-7 md:h-8 md:w-8">
                                  <AvatarImage src={selectedTicket?.user?.avatar} />
                                  <AvatarFallback className="bg-muted text-xs">
                                    {customerInitial}
                                  </AvatarFallback>
                                </Avatar>
                              </m.div>
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
                            <m.span
                              className="text-[10px] font-medium text-muted-foreground mb-1 px-1"
                              initial={{ opacity: 0 }}
                              animate={{ opacity: 1 }}
                              transition={{ delay: 0.1 }}
                            >
                              {message.senderName}
                            </m.span>
                          )}

                          {/* Message Bubble */}
                          {(() => {
                            const isImageOnly = (!message.content || message.content === "[Image]") &&
                              message.attachments &&
                              message.attachments.length > 0 &&
                              message.attachments.every(a => a.match(/\.(jpg|jpeg|png|gif|webp)$/i));

                            return (
                              <m.div
                                className={cn(
                                  "rounded-2xl shadow-sm overflow-hidden",
                                  isImageOnly ? "p-0.5" : "px-3 md:px-4 py-2 md:py-2.5",
                                  isAgent
                                    ? "bg-primary text-primary-foreground rounded-br-md"
                                    : "bg-muted border border-border-strong rounded-bl-md"
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
                                          <m.button
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
                                                isAgent ? "rounded-2xl rounded-br-sm" : "rounded-2xl rounded-bl-sm"
                                              )}
                                              onLoad={handleImageLoad}
                                            />
                                          </m.button>
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
                                                ? "text-primary-foreground/80 hover:text-primary-foreground"
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
                              </m.div>
                            );
                          })()}

                          {/* Timestamp */}
                          <m.span
                            className="text-[10px] text-muted-foreground mt-1 px-1"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ delay: 0.15 }}
                          >
                            {new Date(message.timestamp).toLocaleTimeString([], {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </m.span>
                        </div>

                        {/* Agent Avatar */}
                        {isAgent && (
                          <div className="w-7 md:w-8 shrink-0">
                            {showAvatar && (
                              <m.div
                                initial={{ scale: 0 }}
                                animate={{ scale: 1 }}
                                transition={{ type: "spring", stiffness: 500, damping: 30 }}
                              >
                                <Avatar className="h-7 w-7 md:h-8 md:w-8">
                                  <AvatarImage src={selectedTicket?.agent?.avatar} />
                                  <AvatarFallback className="bg-primary text-primary-foreground text-xs">
                                    {selectedTicket?.agent?.firstName?.charAt(0) || "A"}
                                  </AvatarFallback>
                                </Avatar>
                              </m.div>
                            )}
                          </div>
                        )}
                      </m.div>
                    );
                  })}
                </AnimatePresence>
              </div>
            ))}

            {/* Empty state — `showEmptyState`, not `messages.length === 0`.
                An unfetched conversation and a conversation with no replies
                are both an empty array, and only one of them should say "No
                messages yet". See the declaration above. */}
            {showEmptyState && (
              <m.div
                className="flex flex-col items-center justify-center py-16 md:py-20 text-center"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
              >
                <m.div
                  className="h-14 w-14 md:h-16 md:w-16 rounded-full bg-muted flex items-center justify-center mb-4"
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: "spring", stiffness: 300, damping: 20 }}
                >
                  <MessageSquare className="h-7 w-7 md:h-8 md:w-8 text-muted-foreground" />
                </m.div>
                <m.h3
                  className="text-sm font-medium mb-1"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.3 }}
                >
                  {tCommon("no_messages_yet")}
                </m.h3>
                <m.p
                  className="text-xs text-muted-foreground"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.4 }}
                >
                  {t("start_the_conversation_by_sending_a_message_below")}
                </m.p>
              </m.div>
            )}

            <div ref={messagesEndRef} className="h-4" />
          </m.div>
        </div>

        {/* Input Area */}
        <m.div
          className="border-t border-border bg-card/80 backdrop-blur-sm p-3 md:p-4 shrink-0"
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.2, duration: 0.3 }}
        >
          <div className="max-w-3xl mx-auto">
            <AnimatePresence mode="wait">
              {selectedTicket?.status === "CLOSED" ? (
                <m.div
                  key="closed"
                  className="flex items-center justify-center gap-2 py-3 px-4 bg-success/10 rounded-xl border border-success/20"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                >
                  <m.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: "spring", stiffness: 400, damping: 20 }}
                  >
                    <CheckCircle2 className="h-4 w-4 text-success-ink" />
                  </m.div>
                  <span className="text-sm text-success-ink font-medium">
                    {tCommon("this_ticket_has_been_resolved")}
                  </span>
                </m.div>
              ) : (
                <m.div
                  key="input"
                  className="flex items-end gap-2"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 10 }}
                >
                  <m.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="md:h-11 md:w-11 shrink-0 rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={isUploading || isLoading}
                    >
                      {isUploading ? (
                        <m.div
                          animate={{ rotate: 360 }}
                          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                        >
                          <Loader2 className="h-5 w-5" />
                        </m.div>
                      ) : (
                        <Paperclip className="h-5 w-5" />
                      )}
                    </Button>
                  </m.div>

                  <div className="flex-1 relative">
                    {/* The field must READ as a field. It was `border-0` on a
                        `bg-muted` fill inside a `surface-2/80` bar — no
                        boundary at all, and a fill that separates from its own
                        bar by only ~1.1:1, so at rest there was nothing to see.
                        The boundary is therefore carried by the RULE, not the
                        fill: `--border-strong` is the strongest hairline in the
                        system (1.87:1 dark / 1.62:1 light as measured, vs 1.35
                        for the `border-input` every other input uses).
                        Keep the fill on `--muted` — a lighter surface widens
                        the box but drops the placeholder below 4:1. Focus comes
                        from the primitive's own `--ring` treatment; don't
                        override it back to a bare `ring-primary/50`. */}
                    <Textarea
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      placeholder={`${tCommon("type_your_message")}…`}
                      disabled={isLoading}
                      className="min-h-10 md:min-h-11 max-h-[150px] md:max-h-[200px] py-2.5 md:py-3 px-4 pr-14 text-sm resize-none rounded-xl bg-muted border-border-strong"
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && !e.shiftKey) {
                          e.preventDefault();
                          handleSendMessage();
                        }
                      }}
                      rows={1}
                    />
                    <m.div
                      className="absolute right-1.5 bottom-1.5"
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.9 }}
                      animate={newMessage.trim() ? { scale: [1, 1.05, 1] } : {}}
                      transition={{ duration: 0.2 }}
                    >
                      <Button
                        onClick={handleSendMessage}
                        disabled={!newMessage.trim() || isUploading || isLoading}
                        size="icon"
                        className="h-7 w-7 md:h-8 md:w-8 shrink-0 rounded-lg disabled:opacity-40"
                      >
                        <Send className="h-3.5 w-3.5 md:h-4 md:w-4" />
                      </Button>
                    </m.div>
                  </div>
                </m.div>
              )}
            </AnimatePresence>
          </div>
        </m.div>
      </div>

      {/* Info Panel - Desktop Only */}
      <AnimatePresence>
        {showInfoPanel && (
          <m.div
            className="w-80 border-l border-border bg-card/50 backdrop-blur-sm shrink-0 hidden lg:flex flex-col h-full"
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: 320, opacity: 1 }}
            exit={{ width: 0, opacity: 0 }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
          >
            {/* Panel Header */}
            <m.div
              className="h-14 md:h-16 border-b border-border flex items-center justify-between px-4 shrink-0"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.1 }}
            >
              <span className="text-sm font-semibold">Details</span>
              <m.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  onClick={() => setShowInfoPanel(false)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </m.div>
            </m.div>

            <m.div
              className="flex-1 overflow-y-auto"
              style={{ minHeight: 0 }}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.15 }}
            >
              <InfoPanelContent />
            </m.div>
          </m.div>
        )}
      </AnimatePresence>

      {/* Status Update Dialog */}
      <Dialog open={isStatusDialogOpen} onOpenChange={setIsStatusDialogOpen}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>{t("update_status")}</DialogTitle>
            <DialogDescription>
              {t("change_the_ticket_status_to_update_the_customer")}
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
              <Button onClick={handleUpdateStatus} className="bg-primary hover:bg-primary/90">
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
      <Dialog
        open={!!lightboxImage}
        onOpenChange={(open) => {
          if (!open) setLightboxImage(null);
        }}
      >
        {lightboxImage && (
          <DialogContent
            hideCloseButton
            aria-describedby={undefined}
            className="w-auto max-w-none sm:max-w-none border-0 bg-transparent p-0 shadow-none"
          >
            <DialogTitle className="sr-only">Full size</DialogTitle>
            <div className="absolute top-4 right-4">
              <Button
                variant="ghost"
                size="icon"
                className="text-overlay-foreground/80 hover:text-overlay-foreground hover:bg-overlay-foreground/10"
                onClick={() => setLightboxImage(null)}
              >
                <X className="h-6 w-6" />
              </Button>
            </div>
            <img
              src={lightboxImage}
              alt={tCommon("full_size")}
              className="max-w-[90vw] max-h-[90vh] object-contain rounded-lg shadow-2xl"
            />
          </DialogContent>
        )}
      </Dialog>
    </div>
  );
}
