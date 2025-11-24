"use client";
import { useState, useEffect, useRef } from "react";
import {
  MessageCircle,
  Clock,
  AlertCircle,
  CheckCircle,
  TrendingUp,
  Users,
  Zap,
  Star,
  Shield,
  X,
  Send,
  ArrowLeft,
  User,
  Paperclip,
  MoreVertical,
  Download,
  Copy,
  CheckCircle2,
  UserCheck,
  Settings,
  Edit3,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
import DataTable from "@/components/blocks/data-table";
import { columns } from "./columns";
import { supportTicketAnalytics } from "./analytics";
import { useTranslations } from "next-intl";
import { useToast } from "@/hooks/use-toast";
import { Lightbox } from "@/components/ui/lightbox";
import { imageUploader } from "@/utils/upload";
import { useUserStore } from "@/store/user";
import { useRouter } from "@/i18n/routing";
import { wsManager, ConnectionStatus } from "@/services/ws-manager";

interface SupportTicket {
  id: string;
  userId: string;
  agentId?: string;
  agentName?: string;
  subject: string;
  importance: "LOW" | "MEDIUM" | "HIGH";
  status: "PENDING" | "OPEN" | "REPLIED" | "CLOSED";
  messages?: string[];
  type: "LIVE" | "TICKET";
  createdAt: Date;
  updatedAt: Date;
  tags?: string[];
  responseTime?: number;
  satisfaction?: number;
  customerName?: string;
  customerEmail?: string;
}

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
  return `${Date.now()}-${messageIdCounter}-${Math.random().toString(36).substr(2, 9)}`;
};
// Utility functions
const getStatusColor = (status: string) => {
  switch (status) {
    case "PENDING":
      return "bg-gradient-to-r from-yellow-50 to-amber-50 text-yellow-700 border-yellow-200 dark:from-yellow-950 dark:to-amber-950 dark:text-yellow-400 dark:border-yellow-800";
    case "OPEN":
      return "bg-gradient-to-r from-blue-50 to-cyan-50 text-blue-700 border-blue-200 dark:from-blue-950 dark:to-cyan-950 dark:text-blue-400 dark:border-blue-800";
    case "REPLIED":
      return "bg-gradient-to-r from-green-50 to-emerald-50 text-green-700 border-green-200 dark:from-green-950 dark:to-emerald-950 dark:text-green-400 dark:border-green-800";
    case "CLOSED":
      return "bg-gradient-to-r from-zinc-50 to-slate-50 text-zinc-700 border-zinc-200 dark:from-zinc-800 dark:to-slate-800 dark:text-zinc-400 dark:border-zinc-700";
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
      return "bg-gradient-to-r from-zinc-500 to-slate-500 text-white";
  }
};

export default function AdminSupportPage() {
  const t = useTranslations("dashboard");
  const { toast } = useToast();
  const { user } = useUserStore();
  const router = useRouter();
  
  const [allTickets, setAllTickets] = useState<SupportTicket[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [stats, setStats] = useState({
    total: 0,
    open: 0,
    pending: 0,
    closed: 0,
    unassigned: 0,
    avgResponseTime: 0,
    satisfaction: 0,
  });
  const [statsLoading, setStatsLoading] = useState(true);

  // Drawer states
  const [selectedTicket, setSelectedTicket] = useState<supportTicketAttributes | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [drawerLoading, setDrawerLoading] = useState(false);
  const [drawerError, setDrawerError] = useState<string | null>(null);

  // Detail states for drawer
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [isStatusDialogOpen, setIsStatusDialogOpen] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState("");
  const [activeTab, setActiveTab] = useState("conversation");
  const [mounted, setMounted] = useState(false);
  const [wsConnected, setWsConnected] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Scroll to bottom function
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

  // Auto-scroll when messages change
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Mount effect
  useEffect(() => {
    setMounted(true);
  }, []);

  // WebSocket connection for LIVE tickets in drawer
  useEffect(() => {
    if (!selectedTicket?.id || !isDrawerOpen || selectedTicket.type !== "LIVE") {
      return;
    }

    const connectionId = `admin-drawer-${selectedTicket.id}`;
    const wsUrl = `${window.location.protocol === "https:" ? "wss:" : "ws:"}//${window.location.host}/api/user/support/ticket`;

    // Connect to WebSocket
    wsManager.connect(wsUrl, connectionId);

    // Subscribe to WebSocket status changes
    const handleStatusChange = (status: ConnectionStatus) => {
      setWsConnected(status === ConnectionStatus.CONNECTED);
      // Send subscribe message when connected
      if (status === ConnectionStatus.CONNECTED && selectedTicket?.id) {
        wsManager.sendMessage(
          {
            action: "SUBSCRIBE",
            payload: {
              id: selectedTicket.id,
            },
          },
          connectionId
        );
      }
    };

    // Subscribe to ticket updates
    const handleMessage = (data: any) => {
      try {
        if (data.method === "reply") {
          // Now consistently using 'payload' structure
          const replyData = data.payload;
          if (replyData && replyData.message) {
            const messageContent = replyData.message.text || replyData.message.content || "";
            const messageTime = new Date(replyData.message.timestamp || replyData.message.time || Date.now());
            const messageSender = replyData.message.sender || (replyData.message.type === "client" ? "user" : "agent");
            
            setMessages((prev) => {
              // Check if there's an optimistic message with the same content
              const optimisticIndex = prev.findIndex(msg => 
                msg.content === messageContent && 
                msg.sender === messageSender &&
                Math.abs(msg.timestamp.getTime() - messageTime.getTime()) < 10000
              );
              
              const newMessage: Message = {
                id: replyData.message.id || `server-${replyData.message.time || Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
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
                // Add as new message
                return [...prev, newMessage];
              }
            });
          }
          // Update ticket status if provided
          if (replyData && (replyData.status || replyData.updatedAt)) {
            setSelectedTicket((prev) =>
              prev
                ? {
                    ...prev,
                    ...(replyData.status && { status: replyData.status }),
                    ...(replyData.updatedAt && { updatedAt: new Date(replyData.updatedAt) }),
                  }
                : null
            );
          }
        }
      } catch (error) {
        console.error("Error handling WebSocket message:", error);
      }
    };

    // Add status listener and message subscriber
    wsManager.addStatusListener(handleStatusChange, connectionId);
    wsManager.subscribe(`ticket-${selectedTicket.id}`, handleMessage, connectionId);

    // Cleanup on unmount or when drawer closes
    return () => {
      try {
        // Send unsubscribe message before closing
        if (wsManager.getStatus(connectionId) === ConnectionStatus.CONNECTED) {
          wsManager.sendMessage(
            {
              action: "UNSUBSCRIBE",
              payload: {
                id: selectedTicket.id,
              },
            },
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
  }, [selectedTicket?.id, selectedTicket?.type, isDrawerOpen]);

  // Drawer functions
  const openTicketDrawer = async (ticketId: string) => {
    setDrawerLoading(true);
    setDrawerError(null);
    setIsDrawerOpen(true);

    try {
      const { data, error } = await $fetch<supportTicketAttributes>({
        url: `/api/admin/crm/support/ticket/${ticketId}`,
        silent: true,
      });

      if (error) {
        setDrawerError(`Failed to load ticket: ${error}`);
        return;
      }

      if (!data) {
        setDrawerError("No ticket data received from server");
        return;
      }

      // Process messages
      let messagesData: Message[] = [];
      if (data.messages) {
        let parsedMessages: SupportMessage[] = [];
        
        if (Array.isArray(data.messages)) {
          parsedMessages = data.messages as SupportMessage[];
        } else if (typeof data.messages === 'string') {
          try {
            parsedMessages = JSON.parse(data.messages);
          } catch (e) {
            console.error("Error parsing messages:", e);
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
      setActiveTab("conversation");
      
    } catch (error: any) {
      console.error("Error loading ticket:", error);
      setDrawerError(error.message || "An unexpected error occurred");
    } finally {
      setDrawerLoading(false);
    }
  };

  const closeDrawer = () => {
    setIsDrawerOpen(false);
    setSelectedTicket(null);
    setMessages([]);
    setNewMessage("");
    setDrawerError(null);
    setActiveTab("conversation");
    setWsConnected(false);
  };

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !selectedTicket) return;
    
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
    
    // Use admin endpoint for LIVE tickets, regular endpoint for others
    const endpoint = selectedTicket.type === "LIVE" 
      ? `/api/admin/crm/support/ticket/${selectedTicket.id}/reply`
      : `/api/user/support/ticket/${selectedTicket.id}`;
    
    // Send to API
    const { data, error } = await $fetch({
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
      console.error("Failed to send message:", error);
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
    
    const { data, error } = await $fetch({
      url: `/api/admin/crm/support/ticket/${selectedTicket.id}/status`,
      method: "PUT",
      body: {
        status: selectedStatus,
      },
      successMessage: "Ticket status updated successfully",
    });
    
    if (data) {
      setSelectedTicket((prev) =>
        prev ? { ...prev, status: selectedStatus as any } : null
      );
      setIsStatusDialogOpen(false);
    }
  };

  // Fetch tickets from API
  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      setStatsLoading(true);
      // Fetch tickets
      const { data: ticketsData, error: ticketsError } = await $fetch({
        url: "/api/admin/crm/support/ticket",
        silent: true,
        errorMessage: "Failed to load tickets",
      });
      if (ticketsData && ticketsData.items) {
        setAllTickets(
          ticketsData.items.map((ticket: any) => ({
            ...ticket,
            createdAt: new Date(ticket.createdAt),
            updatedAt: new Date(ticket.updatedAt),
          }))
        );
      }
      setIsLoading(false);
      // Fetch stats
      const { data: statsData, error: statsError } = await $fetch({
        url: "/api/admin/crm/support/stat",
        silent: true,
        errorMessage: "Failed to load statistics",
      });
      if (statsData) {
        setStats({
          total: statsData.total || 0,
          open: statsData.open || 0,
          pending: statsData.pending || 0,
          closed: statsData.closed || 0,
          unassigned: statsData.unassigned || 0,
          avgResponseTime: statsData.avgResponseTime || 0,
          satisfaction: Number.parseFloat(statsData.satisfaction) || 0,
        });
      }
      setStatsLoading(false);
    };
    fetchData();
  }, []);
  if (isLoading || statsLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50/30 to-indigo-50/20 dark:from-zinc-950 dark:via-blue-950/10 dark:to-indigo-950/10 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-zinc-400">
            {t("loading_tickets")}.
          </p>
        </div>
      </div>
    );
  }
  return (
    <>
      {/* Enhanced Header */}
      <div className="mb-8">
        <div className="relative overflow-hidden bg-gradient-to-r from-white via-blue-50/50 to-indigo-50/30 dark:from-zinc-900 dark:via-blue-950/20 dark:to-indigo-950/10 rounded-2xl border border-gray-200/50 dark:border-zinc-800/50 p-8 shadow-xl backdrop-blur-sm">
          <div className="absolute inset-0 bg-gradient-to-r from-blue-600/5 to-indigo-600/5 dark:from-blue-400/5 dark:to-indigo-400/5"></div>
          <div className="relative flex items-center justify-between">
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-xl shadow-lg">
                  <Shield className="h-8 w-8 text-white" />
                </div>
                <div>
                  <h1 className="text-3xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 dark:from-zinc-100 dark:to-zinc-300 bg-clip-text text-transparent">
                    {t("admin_support_center")}
                  </h1>
                  <p className="text-gray-600 dark:text-zinc-400 text-lg">
                    {t("manage_customer_support_expert_assistance")}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-6 text-sm">
                <div className="flex items-center gap-2 text-green-600 dark:text-green-400">
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                  <span className="font-medium">{t("system_online")}</span>
                </div>
                <div className="flex items-center gap-2 text-blue-600 dark:text-blue-400">
                  <Zap className="h-4 w-4" />
                  <span className="font-medium">
                    {t("avg_response")}
                    {stats.avgResponseTime}
                    min
                  </span>
                </div>
                <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400">
                  <Star className="h-4 w-4 fill-current" />
                  <span className="font-medium">
                    {stats.satisfaction.toFixed(1)}
                    {t("5_rating")}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      {/* Enhanced Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 mb-8">
        <Card className="relative overflow-hidden border-0 bg-gradient-to-br from-blue-500 to-blue-600 text-white shadow-xl hover:shadow-2xl transition-all duration-300 transform hover:scale-105">
          <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent"></div>
          <CardContent className="relative p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-blue-100 text-sm font-medium">
                  {t("total_tickets")}
                </p>
                <p className="text-3xl font-bold">{stats.total}</p>
                <div className="flex items-center gap-1 mt-2">
                  <TrendingUp className="h-4 w-4 text-blue-200" />
                  <span className="text-xs text-blue-200">
                    {stats.total > 0
                      ? `${stats.total} total tickets`
                      : "No tickets yet"}
                  </span>
                </div>
              </div>
              <div className="p-3 bg-white/20 rounded-xl backdrop-blur-sm">
                <MessageCircle className="h-8 w-8" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="relative overflow-hidden border-0 bg-gradient-to-br from-amber-500 to-orange-500 text-white shadow-xl hover:shadow-2xl transition-all duration-300 transform hover:scale-105">
          <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent"></div>
          <CardContent className="relative p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-amber-100 text-sm font-medium">
                  {t("Pending")}
                </p>
                <p className="text-3xl font-bold">{stats.pending}</p>
                <div className="mt-2">
                  <Progress
                    value={
                      stats.total > 0 ? (stats.pending / stats.total) * 100 : 0
                    }
                    className="h-2 bg-white/20"
                  />
                </div>
              </div>
              <div className="p-3 bg-white/20 rounded-xl backdrop-blur-sm">
                <Clock className="h-8 w-8" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="relative overflow-hidden border-0 bg-gradient-to-br from-red-500 to-rose-500 text-white shadow-xl hover:shadow-2xl transition-all duration-300 transform hover:scale-105">
          <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent"></div>
          <CardContent className="relative p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-red-100 text-sm font-medium">
                  {t("Unassigned")}
                </p>
                <p className="text-3xl font-bold">{stats.unassigned}</p>
                <div className="flex items-center gap-1 mt-2">
                  <AlertCircle className="h-4 w-4 text-red-200" />
                  <span className="text-xs text-red-200">
                    {t("needs_attention")}
                  </span>
                </div>
              </div>
              <div className="p-3 bg-white/20 rounded-xl backdrop-blur-sm">
                <Users className="h-8 w-8" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="relative overflow-hidden border-0 bg-gradient-to-br from-green-500 to-emerald-500 text-white shadow-xl hover:shadow-2xl transition-all duration-300 transform hover:scale-105">
          <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent"></div>
          <CardContent className="relative p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-green-100 text-sm font-medium">
                  {t("Resolved")}
                </p>
                <p className="text-3xl font-bold">{stats.closed}</p>
                <div className="flex items-center gap-1 mt-2">
                  <CheckCircle className="h-4 w-4 text-green-200" />
                  <span className="text-xs text-green-200">
                    {stats.total > 0
                      ? Math.round((stats.closed / stats.total) * 100)
                      : 0}
                    {t("%_success_rate")}
                  </span>
                </div>
              </div>
              <div className="p-3 bg-white/20 rounded-xl backdrop-blur-sm">
                <CheckCircle className="h-8 w-8" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="relative overflow-hidden border-0 bg-gradient-to-br from-purple-500 to-indigo-500 text-white shadow-xl hover:shadow-2xl transition-all duration-300 transform hover:scale-105">
          <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent"></div>
          <CardContent className="relative p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-purple-100 text-sm font-medium">
                  {t("avg_response")}
                </p>
                <p className="text-3xl font-bold">
                  {stats.avgResponseTime}
                  m
                </p>
                <div className="flex items-center gap-1 mt-2">
                  <Zap className="h-4 w-4 text-purple-200" />
                  <span className="text-xs text-purple-200">
                    {t("lightning_fast")}
                  </span>
                </div>
              </div>
              <div className="p-3 bg-white/20 rounded-xl backdrop-blur-sm">
                <Clock className="h-8 w-8" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
      <DataTable
        apiEndpoint="/api/admin/crm/support/ticket"
        model="supportTicket"
        permissions={{
          access: "access.support.ticket",
          view: "view.support.ticket",
          create: "create.support.ticket",
          edit: "edit.support.ticket",
          delete: "delete.support.ticket",
        }}
        pageSize={10}
        canCreate={false}
        canEdit={false}
        canDelete={true}
        canView={true}
        title="Support Tickets"
        itemTitle="Support Ticket"
        columns={columns}
        analytics={supportTicketAnalytics}
        isParanoid={true}
        expandedButtons={(row) => {
          return (
            <Button 
              variant="outline"
              onClick={() => openTicketDrawer(row.id)}
            >
              {t("view_chat")}
            </Button>
          );
        }}
      />

      {/* Support Ticket Drawer */}
      <Sheet open={isDrawerOpen} onOpenChange={setIsDrawerOpen}>
        <SheetContent 
          className="support-drawer-content !w-[90vw] !max-w-[90vw] min-w-[90vw] p-0 !h-[100vh] !max-h-[100vh] flex flex-col"
          onInteractOutside={(e) => {
            e.preventDefault();
          }}
        >
          <SheetHeader className="p-6 pb-4 border-b border-zinc-200 dark:border-zinc-800 flex-shrink-0">
            <SheetTitle className="text-left text-xl font-semibold text-zinc-900 dark:text-zinc-100">
              {drawerLoading ? "Loading..." : selectedTicket?.subject || "Support Ticket"}
            </SheetTitle>
          </SheetHeader>

          {drawerLoading ? (
            <div className="flex-1 flex items-center justify-center">
              <div className="w-16 h-16 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div>
            </div>
          ) : drawerError ? (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center">
                <AlertCircle className="h-16 w-16 text-red-500 mx-auto mb-4" />
                <p className="text-red-600 dark:text-red-400 mb-4">{drawerError}</p>
                <Button onClick={() => selectedTicket && openTicketDrawer(selectedTicket.id)}>
                  Try Again
                </Button>
              </div>
            </div>
          ) : selectedTicket ? (
            <div className="flex flex-col h-full overflow-hidden flex-1">
              {/* Enhanced Header - Exact copy from original */}
              <div className="p-4 border-b border-zinc-200 dark:border-zinc-800 flex-shrink-0">
                <Card className="border-0 bg-gradient-to-r from-white via-blue-50/50 to-indigo-50/30 dark:from-zinc-900 dark:via-blue-950/20 dark:to-indigo-950/10 shadow-xl backdrop-blur-sm rounded-2xl overflow-hidden">
                  <div className="absolute inset-0 bg-gradient-to-r from-blue-600/5 to-indigo-600/5 dark:from-blue-400/5 dark:to-indigo-400/5"></div>
                  <CardHeader className="relative bg-white/50 dark:bg-zinc-900/50 backdrop-blur-sm p-4 md:p-6">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3 flex-1">
                        {/* Icon */}
                        <div className="p-2 md:p-3 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-xl shadow-lg">
                          <Shield className="h-5 w-5 md:h-6 md:w-6 text-white" />
                        </div>
                        
                        {/* Title and Info */}
                        <div className="flex-1 min-w-0">
                          <CardTitle className="text-lg md:text-2xl text-zinc-900 dark:text-zinc-100 mb-1 md:mb-2 truncate">
                            {selectedTicket.subject}
                          </CardTitle>
                          <CardDescription className="text-zinc-600 dark:text-zinc-400 text-sm">
                            <div className="flex flex-wrap items-center gap-2 md:gap-4">
                              <span className="font-medium">
                                #{selectedTicket.id.slice(0, 8)}
                              </span>
                              <span className="hidden md:inline">•</span>
                              <span className="hidden md:inline">
                                Created{" "}
                                {selectedTicket.createdAt
                                  ? new Date(selectedTicket.createdAt).toLocaleDateString()
                                  : "N/A"}
                              </span>
                              <div className="flex items-center gap-2">
                                <Avatar className="h-4 w-4 md:h-5 md:w-5">
                                  <AvatarImage src={selectedTicket.user?.avatar} />
                                  <AvatarFallback className="text-xs bg-zinc-200 dark:bg-zinc-700">
                                    {selectedTicket.user?.firstName?.charAt(0) || "C"}
                                  </AvatarFallback>
                                </Avatar>
                                <span className="text-blue-600 dark:text-blue-400 text-sm">
                                  {`${selectedTicket.user?.firstName || ""} ${selectedTicket.user?.lastName || ""}`.trim() ||
                                    "Customer"}
                                </span>
                              </div>
                              <div className="flex items-center gap-1 md:gap-2">
                                <Zap className="h-3 w-3 md:h-4 md:w-4 text-green-500" />
                                <span className="text-green-600 dark:text-green-400 text-sm">
                                  Response {selectedTicket.responseTime || 0}min
                                </span>
                              </div>
                              {/* WebSocket status for LIVE tickets */}
                              {selectedTicket.type === "LIVE" && (
                                <div className="flex items-center gap-2 text-sm">
                                  <div
                                    className={`w-2 h-2 rounded-full ${
                                      wsConnected ? "bg-green-500 animate-pulse" : "bg-gray-400"
                                    }`}
                                  ></div>
                                  <span className={wsConnected ? "text-green-600 dark:text-green-400" : "text-gray-500 dark:text-gray-400"}>
                                    {wsConnected ? "Live" : "Connecting..."}
                                  </span>
                                </div>
                              )}
                            </div>
                          </CardDescription>
                        </div>
                      </div>
                      
                      {/* Status Badges and Actions */}
                      <div className="flex flex-col md:flex-row gap-2 md:gap-3 items-end md:items-start ml-2">
                        <div className="flex gap-2">
                          <Badge
                            className={`${getImportanceColor(selectedTicket.importance)} text-xs`}
                            variant="outline"
                          >
                            {selectedTicket.importance}
                          </Badge>
                          <Badge
                            className={`${getStatusColor(selectedTicket.status)} text-xs`}
                            variant="outline"
                          >
                            {selectedTicket.status}
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
                                className="border-zinc-200 dark:border-zinc-700 hover:bg-zinc-50 dark:hover:bg-zinc-800 text-xs"
                              >
                                <Edit3 className="h-3 w-3 md:h-4 md:w-4 mr-1 md:mr-2" />
                                <span className="hidden md:inline">Update Status</span>
                                <span className="md:hidden">Update</span>
                              </Button>
                            </DialogTrigger>
                            <DialogContent className="bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800">
                              <DialogHeader>
                                <DialogTitle className="text-zinc-900 dark:text-zinc-100">
                                  Update Ticket Status
                                </DialogTitle>
                                <DialogDescription className="text-zinc-600 dark:text-zinc-400">
                                  Change the status of this support ticket.
                                </DialogDescription>
                              </DialogHeader>
                              <div className="space-y-4">
                                <div>
                                  <Label htmlFor="status" className="text-zinc-900 dark:text-zinc-100">
                                    Status
                                  </Label>
                                  <Select
                                    value={selectedStatus}
                                    onValueChange={setSelectedStatus}
                                  >
                                    <SelectTrigger className="bg-white dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700">
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent className="bg-white dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700">
                                      <SelectItem value="PENDING">Pending</SelectItem>
                                      <SelectItem value="OPEN">Open</SelectItem>
                                      <SelectItem value="REPLIED">Replied</SelectItem>
                                      <SelectItem value="CLOSED">Closed</SelectItem>
                                    </SelectContent>
                                  </Select>
                                </div>
                                <div className="flex justify-end gap-2">
                                  <Button
                                    variant="outline"
                                    onClick={() => setIsStatusDialogOpen(false)}
                                    className="border-zinc-200 dark:border-zinc-700"
                                  >
                                    Cancel
                                  </Button>
                                  <Button
                                    onClick={handleUpdateStatus}
                                    className="bg-blue-600 hover:bg-blue-700 text-white"
                                  >
                                    Update Status
                                  </Button>
                                </div>
                              </div>
                            </DialogContent>
                          </Dialog>
                        </div>
                      </div>
                    </div>
                    
                    {/* Tags Section */}
                    {selectedTicket.tags && Array.isArray(selectedTicket.tags) && selectedTicket.tags.length > 0 && (
                      <div className="px-4 md:px-6 pb-4 md:pb-6">
                        <div className="flex flex-wrap gap-2">
                          {selectedTicket.tags.map((tag) => (
                            <Badge
                              key={tag}
                              variant="secondary"
                              className="text-xs bg-gradient-to-r from-zinc-100 to-zinc-200 dark:from-zinc-800 dark:to-zinc-700 text-zinc-700 dark:text-zinc-300"
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

              {/* Responsive Layout with Tabs - Exact copy from original */}
              <div className="flex-1 flex flex-col lg:grid lg:grid-cols-4 gap-4 md:gap-8 min-h-0 p-4">
                {/* Mobile Tabs - Hidden on Desktop */}
                <div className="lg:hidden flex flex-col flex-1 min-h-0">
                  <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full flex flex-col flex-1 min-h-0">
                    <TabsList className="grid w-full grid-cols-3 bg-white/80 dark:bg-zinc-900/80 backdrop-blur-sm flex-shrink-0 mb-4">
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
                    
                    <TabsContent value="conversation" className="flex-1 min-h-0 data-[state=active]:flex data-[state=active]:flex-col">
                      {/* Mobile Chat Area */}
                      <Card className="flex flex-col flex-1 min-h-0 border-0 bg-white/80 dark:bg-zinc-900/80 backdrop-blur-sm shadow-xl rounded-2xl overflow-hidden">
                        <CardHeader className="pb-3 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/50 dark:to-indigo-950/50 backdrop-blur-sm p-4">
                          <div className="flex items-center justify-between">
                            <CardTitle className="text-base text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                              <Shield className="h-4 w-4 text-blue-500" />
                              Admin Conversation
                            </CardTitle>
                            <div className="flex items-center gap-2 text-sm text-zinc-600 dark:text-zinc-400">
                              <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
                              <span className="text-xs">Live</span>
                            </div>
                          </div>
                        </CardHeader>
                        <CardContent className="flex-1 overflow-y-auto space-y-4 p-4 bg-gradient-to-b from-zinc-50/50 to-white/50 dark:from-zinc-800/50 dark:to-zinc-900/50">
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
                                  <AvatarImage src={selectedTicket.user?.avatar} />
                                  <AvatarFallback className="bg-gradient-to-r from-zinc-500 to-zinc-600 text-white text-xs">
                                    {selectedTicket.user?.firstName?.charAt(0) || "C"}
                                  </AvatarFallback>
                                </Avatar>
                              )}
                              <div className={`max-w-[80%] ${message.sender === "agent" ? "order-first" : ""}`}>
                                {message.sender === "user" && (
                                  <p className="text-xs font-medium mb-1 text-zinc-600 dark:text-zinc-400 flex items-center gap-2">
                                    <User className="h-3 w-3 text-blue-500" />
                                    {message.senderName || "Customer"}
                                  </p>
                                )}
                                <div
                                  className={`rounded-2xl p-3 shadow-lg ${message.sender === "agent" ? "bg-gradient-to-r from-blue-500 to-indigo-500 text-white" : "bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-900 dark:text-zinc-100"}`}
                                >
                                  {message.content && (
                                    <p className="text-sm leading-relaxed mb-2">
                                      {message.content}
                                    </p>
                                  )}
                                  {message.attachments && message.attachments.length > 0 && (
                                    <div className="space-y-2">
                                      {message.attachments.map((attachment, attachmentIndex) => {
                                        const isImage = attachment.match(/\.(jpg|jpeg|png|gif|webp)$/i);
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
                                                View Attachment
                                              </a>
                                            </div>
                                          );
                                        }
                                      })}
                                    </div>
                                  )}
                                  <div className="flex items-center justify-between mt-2">
                                    <p
                                      className={`text-xs ${message.sender === "agent" ? "text-blue-100" : "text-zinc-500 dark:text-zinc-400"}`}
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
                                  <AvatarImage src={selectedTicket.agent?.avatar} />
                                  <AvatarFallback className="bg-gradient-to-r from-blue-500 to-indigo-500 text-white">
                                    <Shield className="h-4 w-4" />
                                  </AvatarFallback>
                                </Avatar>
                              )}
                            </div>
                          ))}
                          <div ref={messagesEndRef} />
                        </CardContent>
                        <div className="p-4 border-t border-zinc-200 dark:border-zinc-800 bg-gradient-to-r from-zinc-50 to-white dark:from-zinc-900 dark:to-zinc-800 backdrop-blur-sm">
                          {selectedTicket.status !== "CLOSED" ? (
                            <div className="space-y-3">
                              <div className="flex gap-3">
                                <Textarea
                                  value={newMessage}
                                  onChange={(e) => setNewMessage(e.target.value)}
                                  placeholder="Type your response as admin..."
                                  className="flex-1 min-h-[60px] resize-none bg-white dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700 rounded-xl focus:ring-2 focus:ring-blue-500 transition-all text-sm"
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
                                    className="border-zinc-200 dark:border-zinc-700 hover:bg-zinc-50 dark:hover:bg-zinc-800 h-10 w-10"
                                  >
                                    <Paperclip className="h-4 w-4" />
                                  </Button>
                                </div>
                              </div>
                              <div className="flex items-center gap-2 text-xs text-zinc-500 dark:text-zinc-400">
                                <span>Press Enter to send, Shift+Enter for new line</span>
                              </div>
                            </div>
                          ) : (
                            <div className="text-center py-4">
                              <CheckCircle2 className="h-8 w-8 text-green-500 mx-auto mb-2" />
                              <p className="text-zinc-500 dark:text-zinc-400 text-sm">
                                This ticket has been resolved.
                              </p>
                            </div>
                          )}
                        </div>
                      </Card>
                    </TabsContent>

                    <TabsContent value="customer" className="flex-1 min-h-0 data-[state=active]:flex data-[state=active]:flex-col overflow-auto">
                      {/* Mobile Customer Info */}
                      <Card className="border-0 bg-white/80 dark:bg-zinc-900/80 shadow-xl backdrop-blur-sm rounded-2xl">
                        <CardHeader>
                          <CardTitle className="text-base text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                            <User className="h-5 w-5 text-blue-500" />
                            Customer Info
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                          <div className="flex items-center gap-4">
                            <Avatar className="h-16 w-16 border-4 border-white shadow-lg">
                              <AvatarImage src={selectedTicket.user?.avatar} />
                              <AvatarFallback className="bg-gradient-to-r from-zinc-500 to-zinc-600 text-white text-lg">
                                {selectedTicket.user?.firstName?.charAt(0) || "C"}
                              </AvatarFallback>
                            </Avatar>
                            <div className="flex-1">
                              <h3 className="font-semibold text-zinc-900 dark:text-zinc-100">
                                {`${selectedTicket.user?.firstName || ""} ${selectedTicket.user?.lastName || ""}`.trim() ||
                                  "Customer"}
                              </h3>
                              <p className="text-sm text-zinc-600 dark:text-zinc-400">
                                {selectedTicket.user?.email || "No email provided"}
                              </p>
                            </div>
                          </div>
                          
                          {selectedTicket.userStats && (
                            <div className="grid grid-cols-2 gap-3 text-sm">
                              <div className="text-center p-3 bg-white/50 dark:bg-zinc-800/50 rounded-xl">
                                <p className="font-semibold text-blue-600 dark:text-blue-400">
                                  {selectedTicket.userStats.totalTickets}
                                </p>
                                <p className="text-xs text-zinc-600 dark:text-zinc-400">
                                  Total Tickets
                                </p>
                              </div>
                              <div className="text-center p-3 bg-white/50 dark:bg-zinc-800/50 rounded-xl">
                                <p className="font-semibold text-green-600 dark:text-green-400">
                                  {selectedTicket.userStats.resolvedTickets}
                                </p>
                                <p className="text-xs text-zinc-600 dark:text-zinc-400">
                                  Resolved
                                </p>
                              </div>
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    </TabsContent>

                    <TabsContent value="timeline" className="flex-1 min-h-0 data-[state=active]:flex data-[state=active]:flex-col overflow-auto">
                      {/* Mobile Timeline */}
                      <Card className="border-0 bg-white/80 dark:bg-zinc-900/80 shadow-xl backdrop-blur-sm rounded-2xl">
                        <CardHeader>
                          <CardTitle className="text-base text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                            <Clock className="h-5 w-5 text-blue-500" />
                            Progress Timeline
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                          <div className="flex items-center gap-3">
                            <div className="w-3 h-3 bg-gradient-to-r from-green-500 to-emerald-500 rounded-full shadow-lg shadow-green-500/25" />
                            <div className="flex-1">
                              <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">Created</p>
                              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                                {selectedTicket.createdAt ? new Date(selectedTicket.createdAt).toLocaleString() : "N/A"}
                              </p>
                            </div>
                          </div>
                          {selectedTicket.status !== "PENDING" && (
                            <div className="flex items-center gap-3">
                              <div className="w-3 h-3 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full shadow-lg shadow-blue-500/25" />
                              <div className="flex-1">
                                <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">In Progress</p>
                                <p className="text-xs text-zinc-500 dark:text-zinc-400">
                                  {selectedTicket.updatedAt ? new Date(selectedTicket.updatedAt).toLocaleString() : "N/A"}
                                </p>
                              </div>
                            </div>
                          )}
                          {selectedTicket.status === "CLOSED" && (
                            <div className="flex items-center gap-3">
                              <div className="w-3 h-3 bg-gradient-to-r from-green-500 to-emerald-500 rounded-full shadow-lg shadow-green-500/25" />
                              <div className="flex-1">
                                <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">Resolved</p>
                                <p className="text-xs text-zinc-500 dark:text-zinc-400">
                                  {selectedTicket.updatedAt ? new Date(selectedTicket.updatedAt).toLocaleString() : "N/A"}
                                </p>
                              </div>
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    </TabsContent>
                  </Tabs>
                </div>

                {/* Desktop Layout - Enhanced Chat Area */}
                <div className="hidden lg:block lg:col-span-3 min-h-0">
                  <Card className="flex flex-col h-full border-0 bg-white/80 dark:bg-zinc-900/80 backdrop-blur-sm shadow-xl rounded-2xl overflow-hidden">
                    <CardHeader className="pb-4 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/50 dark:to-indigo-950/50 backdrop-blur-sm">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-lg text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                          <Shield className="h-5 w-5 text-blue-500" />
                          Admin Conversation
                        </CardTitle>
                        <div className="flex items-center gap-2 text-sm text-zinc-600 dark:text-zinc-400">
                          <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
                          <span>Live conversation</span>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="flex-1 overflow-y-auto space-y-6 p-6 bg-gradient-to-b from-zinc-50/50 to-white/50 dark:from-zinc-800/50 dark:to-zinc-900/50">
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
                              <AvatarImage src={selectedTicket.user?.avatar} />
                              <AvatarFallback className="bg-gradient-to-r from-zinc-500 to-zinc-600 text-white text-sm">
                                {selectedTicket.user?.firstName?.charAt(0) || "C"}
                              </AvatarFallback>
                            </Avatar>
                          )}
                          <div className={`max-w-[75%] ${message.sender === "agent" ? "order-first" : ""}`}>
                            {message.sender === "user" && (
                              <p className="text-sm font-medium mb-2 text-zinc-600 dark:text-zinc-400 flex items-center gap-2">
                                <User className="h-4 w-4 text-blue-500" />
                                {message.senderName || "Customer"}
                              </p>
                            )}
                            <div
                              className={`rounded-2xl p-4 shadow-lg ${message.sender === "agent" ? "bg-gradient-to-r from-blue-500 to-indigo-500 text-white" : "bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-900 dark:text-zinc-100"}`}
                            >
                              {message.content && (
                                <p className="text-sm leading-relaxed mb-2">
                                  {message.content}
                                </p>
                              )}
                              {message.attachments && message.attachments.length > 0 && (
                                <div className="space-y-2">
                                  {message.attachments.map((attachment, attachmentIndex) => {
                                    const isImage = attachment.match(/\.(jpg|jpeg|png|gif|webp)$/i);
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
                                  })}
                                </div>
                              )}
                              <div className="flex items-center justify-between mt-3">
                                <p
                                  className={`text-xs ${message.sender === "agent" ? "text-blue-100" : "text-zinc-500 dark:text-zinc-400"}`}
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
                              <AvatarImage src={selectedTicket.agent?.avatar} />
                              <AvatarFallback className="bg-gradient-to-r from-blue-500 to-indigo-500 text-white">
                                <Shield className="h-5 w-5" />
                              </AvatarFallback>
                            </Avatar>
                          )}
                        </div>
                      ))}
                      <div ref={messagesEndRef} />
                    </CardContent>
                    <div className="p-6 border-t border-zinc-200 dark:border-zinc-800 bg-gradient-to-r from-zinc-50 to-white dark:from-zinc-900 dark:to-zinc-800 backdrop-blur-sm">
                      {selectedTicket.status !== "CLOSED" ? (
                        <div className="space-y-4">
                          <div className="flex gap-4">
                            <Textarea
                              value={newMessage}
                              onChange={(e) => setNewMessage(e.target.value)}
                              placeholder="Type your response as admin..."
                              className="flex-1 min-h-[80px] resize-none bg-white dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700 rounded-xl focus:ring-2 focus:ring-blue-500 transition-all"
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
                                className="border-zinc-200 dark:border-zinc-700 hover:bg-zinc-50 dark:hover:bg-zinc-800 h-12 w-12"
                              >
                                <Paperclip className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 text-xs text-zinc-500 dark:text-zinc-400">
                            <span>Press Enter to send, Shift+Enter for new line</span>
                          </div>
                        </div>
                      ) : (
                        <div className="text-center py-6">
                          <CheckCircle2 className="h-12 w-12 text-green-500 mx-auto mb-3" />
                          <p className="text-zinc-500 dark:text-zinc-400 text-lg">
                            This ticket has been resolved.
                          </p>
                        </div>
                      )}
                    </div>
                  </Card>
                </div>

                {/* Desktop Sidebar - Hidden on Mobile */}
                <div className="hidden lg:block lg:col-span-1 min-h-0 overflow-auto">
                  <div className="space-y-6 h-full">
                    {/* Customer Info */}
                    <Card className="border-0 bg-gradient-to-br from-white to-blue-50/30 dark:from-zinc-900 dark:to-blue-950/20 shadow-xl backdrop-blur-sm rounded-2xl overflow-hidden">
                      <CardHeader className="pb-4">
                        <CardTitle className="text-base text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                          <User className="h-5 w-5 text-blue-500" />
                          Customer Info
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="flex items-center gap-4">
                          <Avatar className="h-12 w-12 border-2 border-white shadow-lg">
                            <AvatarImage src={selectedTicket.user?.avatar} />
                            <AvatarFallback className="bg-gradient-to-r from-zinc-500 to-zinc-600 text-white">
                              {selectedTicket.user?.firstName?.charAt(0) || "C"}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-semibold text-zinc-900 dark:text-zinc-100">
                              {`${selectedTicket.user?.firstName || ""} ${selectedTicket.user?.lastName || ""}`.trim() ||
                                "Customer"}
                            </p>
                            <p className="text-sm text-zinc-600 dark:text-zinc-400">
                              {selectedTicket.user?.email || "No email provided"}
                            </p>
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-3 text-sm">
                          <div className="text-center p-3 bg-white/50 dark:bg-zinc-800/50 rounded-xl">
                            <p className="font-semibold text-blue-600 dark:text-blue-400">
                              {selectedTicket.userStats?.totalTickets || 0}
                            </p>
                            <p className="text-xs text-zinc-600 dark:text-zinc-400">
                              Total Tickets
                            </p>
                          </div>
                          <div className="text-center p-3 bg-white/50 dark:bg-zinc-800/50 rounded-xl">
                            <p className="font-semibold text-green-600 dark:text-green-400">
                              {selectedTicket.userStats?.resolvedTickets || 0}
                            </p>
                            <p className="text-xs text-zinc-600 dark:text-zinc-400">
                              Resolved
                            </p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    {/* Agent Info */}
                    <Card className="border-0 bg-gradient-to-br from-white to-blue-50/30 dark:from-zinc-900 dark:to-blue-950/20 shadow-xl backdrop-blur-sm rounded-2xl overflow-hidden">
                      <CardHeader className="pb-4">
                        <CardTitle className="text-base text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                          <Shield className="h-5 w-5 text-blue-500" />
                          Assigned Agent
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        {selectedTicket.agentId && selectedTicket.agent ? (
                          <div className="flex items-center gap-4">
                            <Avatar className="h-12 w-12 border-2 border-white shadow-lg">
                              <AvatarImage src={selectedTicket.agent.avatar} />
                              <AvatarFallback className="bg-gradient-to-r from-blue-500 to-indigo-500 text-white">
                                {`${selectedTicket.agent.firstName?.charAt(0) || ""}${selectedTicket.agent.lastName?.charAt(0) || ""}` ||
                                  "SA"}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <p className="font-semibold text-zinc-900 dark:text-zinc-100">
                                {`${selectedTicket.agent.firstName || ""} ${selectedTicket.agent.lastName || ""}`.trim() ||
                                  "Support Agent"}
                              </p>
                              <div className="text-sm text-green-600 dark:text-green-400 flex items-center gap-2">
                                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                                Online • Expert Level
                              </div>
                              {selectedTicket.agent.lastLogin && (
                                <p className="text-xs text-zinc-500 dark:text-zinc-400">
                                  Last login{" "}
                                  {new Date(selectedTicket.agent.lastLogin).toLocaleDateString()}
                                </p>
                              )}
                            </div>
                          </div>
                        ) : (
                          <div className="text-center py-4">
                            <div className="w-12 h-12 bg-zinc-200 dark:bg-zinc-700 rounded-full flex items-center justify-center mx-auto mb-3">
                              <UserCheck className="h-6 w-6 text-zinc-400 dark:text-zinc-500" />
                            </div>
                            <p className="text-sm text-zinc-600 dark:text-zinc-400 mb-3">
                              No agent assigned
                            </p>
                          </div>
                        )}
                        {selectedTicket.agentId && selectedTicket.agent && (
                          <div className="grid grid-cols-2 gap-3 text-sm">
                            <div className="text-center p-3 bg-white/50 dark:bg-zinc-800/50 rounded-xl">
                              <p className="font-semibold text-blue-600 dark:text-blue-400">
                                {selectedTicket.agentStats?.avgRating?.toFixed(1) || "N/A"}
                              </p>
                              <p className="text-xs text-zinc-600 dark:text-zinc-400">
                                Rating
                              </p>
                            </div>
                            <div className="text-center p-3 bg-white/50 dark:bg-zinc-800/50 rounded-xl">
                              <p className="font-semibold text-green-600 dark:text-green-400">
                                {selectedTicket.agentStats?.resolved || 0}
                              </p>
                              <p className="text-xs text-zinc-600 dark:text-zinc-400">
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
                        <CardTitle className="text-base text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                          <Clock className="h-5 w-5 text-blue-500" />
                          Progress Timeline
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="flex items-center gap-3">
                          <div className="w-3 h-3 bg-gradient-to-r from-green-500 to-emerald-500 rounded-full shadow-lg shadow-green-500/25" />
                          <div className="flex-1">
                            <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">Created</p>
                            <p className="text-xs text-zinc-500 dark:text-zinc-400">
                              {selectedTicket.createdAt ? new Date(selectedTicket.createdAt).toLocaleString() : "N/A"}
                            </p>
                          </div>
                        </div>
                        {selectedTicket.agentId && (
                          <div className="flex items-center gap-3">
                            <div className="w-3 h-3 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full shadow-lg shadow-blue-500/25" />
                            <div className="flex-1">
                              <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">Agent Assigned</p>
                              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                                {selectedTicket.createdAt ? new Date(selectedTicket.createdAt).toLocaleString() : "N/A"}
                              </p>
                            </div>
                          </div>
                        )}
                        {(selectedTicket.status === "OPEN" || selectedTicket.status === "REPLIED" || selectedTicket.status === "CLOSED") && (
                          <div className="flex items-center gap-3">
                            <div className="w-3 h-3 bg-gradient-to-r from-amber-500 to-orange-500 rounded-full shadow-lg shadow-amber-500/25" />
                            <div className="flex-1">
                              <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">In Progress</p>
                              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                                {selectedTicket.updatedAt ? new Date(selectedTicket.updatedAt).toLocaleString() : "N/A"}
                              </p>
                            </div>
                          </div>
                        )}
                        {selectedTicket.status === "CLOSED" && (
                          <div className="flex items-center gap-3">
                            <div className="w-3 h-3 bg-gradient-to-r from-green-500 to-emerald-500 rounded-full shadow-lg shadow-green-500/25" />
                            <div className="flex-1">
                              <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">Resolved</p>
                              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                                {selectedTicket.updatedAt ? new Date(selectedTicket.updatedAt).toLocaleString() : "N/A"}
                              </p>
                            </div>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  </div>
                </div>
              </div>
            </div>
          ) : null}
        </SheetContent>
      </Sheet>
    </>
  );
}
