"use client";

import { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import { $fetch } from "@/lib/api";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
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
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { toast } from "sonner";
import {
  AlertTriangle,
  Shield,
  Clock,
  CheckCircle,
  XCircle,
  MessageSquare,
  User,
  Calendar,
  DollarSign,
  FileText,
  Search,
  Filter,
  ChevronRight,
  AlertCircle,
  Gavel,
  Ban,
  RefreshCw,
  Download,
  Eye,
  Send,
  Paperclip,
  History,
  Scale,
  Flag
} from "lucide-react";

interface Dispute {
  id: string;
  disputeType: string;
  status: string;
  priority: string;
  title: string;
  description: string;
  evidence?: any;
  resolution?: string;
  resolutionType?: string;
  refundAmount?: number;
  reporterId: string;
  respondentId?: string;
  assignedToId?: string;
  resolvedById?: string;
  createdAt: string;
  escalatedAt?: string;
  investigatedAt?: string;
  resolvedAt?: string;
  reporter?: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    avatar?: string;
  };
  respondent?: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    avatar?: string;
  };
  listing?: {
    id: string;
    price: number;
    currency: string;
    token?: {
      id: string;
      name: string;
      image?: string;
    };
  };
  messages?: any[];
}

interface DisputeMessage {
  id: string;
  message: string;
  userId: string;
  user?: {
    firstName: string;
    lastName: string;
    avatar?: string;
  };
  attachments?: string[];
  isInternal: boolean;
  createdAt: string;
}

const DISPUTE_STATUSES = [
  { value: "PENDING", label: "Pending", color: "bg-yellow-500" },
  { value: "INVESTIGATING", label: "Investigating", color: "bg-blue-500" },
  { value: "AWAITING_RESPONSE", label: "Awaiting Response", color: "bg-orange-500" },
  { value: "RESOLVED", label: "Resolved", color: "bg-green-500" },
  { value: "REJECTED", label: "Rejected", color: "bg-red-500" },
  { value: "ESCALATED", label: "Escalated", color: "bg-purple-500" },
];

const DISPUTE_PRIORITIES = [
  { value: "LOW", label: "Low", color: "bg-gray-500" },
  { value: "MEDIUM", label: "Medium", color: "bg-yellow-500" },
  { value: "HIGH", label: "High", color: "bg-orange-500" },
  { value: "CRITICAL", label: "Critical", color: "bg-red-500" },
];

const RESOLUTION_TYPES = [
  { value: "REFUND", label: "Full Refund", icon: DollarSign },
  { value: "PARTIAL_REFUND", label: "Partial Refund", icon: DollarSign },
  { value: "CANCEL_SALE", label: "Cancel Sale", icon: XCircle },
  { value: "REMOVE_LISTING", label: "Remove Listing", icon: Ban },
  { value: "BAN_USER", label: "Ban User", icon: Ban },
  { value: "WARNING", label: "Issue Warning", icon: AlertTriangle },
  { value: "NO_ACTION", label: "No Action", icon: CheckCircle },
];

export function DisputeManagementClient() {
  const t = useTranslations("admin.nft.dispute");
  const [disputes, setDisputes] = useState<Dispute[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDispute, setSelectedDispute] = useState<Dispute | null>(null);
  const [disputeMessages, setDisputeMessages] = useState<DisputeMessage[]>([]);
  const [messageInput, setMessageInput] = useState("");
  const [isInternalMessage, setIsInternalMessage] = useState(false);
  const [resolutionModalOpen, setResolutionModalOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [priorityFilter, setPriorityFilter] = useState("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTab, setSelectedTab] = useState("active");

  // Resolution form state
  const [resolutionForm, setResolutionForm] = useState({
    resolutionType: "",
    resolution: "",
    refundAmount: 0,
  });

  // Statistics
  const [stats, setStats] = useState({
    total: 0,
    pending: 0,
    investigating: 0,
    resolved: 0,
    averageResolutionTime: 0,
    criticalDisputes: 0,
  });

  useEffect(() => {
    fetchDisputes();
    fetchStatistics();
  }, [statusFilter, priorityFilter, searchQuery]);

  const fetchDisputes = async () => {
    try {
      setLoading(true);
      const params: any = {};
      
      if (statusFilter !== "ALL") params.status = statusFilter;
      if (priorityFilter !== "ALL") params.priority = priorityFilter;
      if (searchQuery) params.search = searchQuery;

      const response = await $fetch({
        url: "/api/admin/nft/dispute",
        params,
        silent: true,
      });

      if (response.data) {
        setDisputes(response.data);
      }
    } catch (error) {
      toast.error("Failed to fetch disputes");
    } finally {
      setLoading(false);
    }
  };

  const fetchStatistics = async () => {
    try {
      const response = await $fetch({
        url: "/api/admin/nft/dispute/stats",
        silent: true,
      });

      if (response.data) {
        setStats(response.data);
      }
    } catch (error) {
      console.error("Failed to fetch statistics:", error);
    }
  };

  const fetchDisputeMessages = async (disputeId: string) => {
    try {
      const response = await $fetch({
        url: `/api/admin/nft/dispute/${disputeId}/messages`,
        silent: true,
      });

      if (response.data) {
        setDisputeMessages(response.data);
      }
    } catch (error) {
      toast.error("Failed to fetch messages");
    }
  };

  const handleStatusChange = async (disputeId: string, newStatus: string) => {
    try {
      const response = await $fetch({
        url: `/api/admin/nft/dispute/${disputeId}/status`,
        method: "PUT",
        body: { status: newStatus },
      });

      if (response.data) {
        toast.success("Status updated successfully");
        fetchDisputes();
        if (selectedDispute?.id === disputeId) {
          setSelectedDispute({ ...selectedDispute, status: newStatus });
        }
      }
    } catch (error) {
      toast.error("Failed to update status");
    }
  };

  const handlePriorityChange = async (disputeId: string, newPriority: string) => {
    try {
      const response = await $fetch({
        url: `/api/admin/nft/dispute/${disputeId}/priority`,
        method: "PUT",
        body: { priority: newPriority },
      });

      if (response.data) {
        toast.success("Priority updated successfully");
        fetchDisputes();
      }
    } catch (error) {
      toast.error("Failed to update priority");
    }
  };

  const handleSendMessage = async () => {
    if (!selectedDispute || !messageInput.trim()) return;

    try {
      const response = await $fetch({
        url: `/api/admin/nft/dispute/${selectedDispute.id}/message`,
        method: "POST",
        body: {
          message: messageInput,
          isInternal: isInternalMessage,
        },
      });

      if (response.data) {
        toast.success("Message sent");
        setMessageInput("");
        fetchDisputeMessages(selectedDispute.id);
      }
    } catch (error) {
      toast.error("Failed to send message");
    }
  };

  const handleResolveDispute = async () => {
    if (!selectedDispute || !resolutionForm.resolutionType) return;

    try {
      const response = await $fetch({
        url: `/api/admin/nft/dispute/${selectedDispute.id}/resolve`,
        method: "POST",
        body: resolutionForm,
      });

      if (response.data) {
        toast.success("Dispute resolved successfully");
        setResolutionModalOpen(false);
        setResolutionForm({ resolutionType: "", resolution: "", refundAmount: 0 });
        fetchDisputes();
        setSelectedDispute(null);
      }
    } catch (error) {
      toast.error("Failed to resolve dispute");
    }
  };

  const handleAssignDispute = async (disputeId: string, adminId: string) => {
    try {
      const response = await $fetch({
        url: `/api/admin/nft/dispute/${disputeId}/assign`,
        method: "PUT",
        body: { assignedToId: adminId },
      });

      if (response.data) {
        toast.success("Dispute assigned successfully");
        fetchDisputes();
      }
    } catch (error) {
      toast.error("Failed to assign dispute");
    }
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = DISPUTE_STATUSES.find(s => s.value === status);
    return (
      <Badge className={`${statusConfig?.color} text-white`}>
        {statusConfig?.label || status}
      </Badge>
    );
  };

  const getPriorityBadge = (priority: string) => {
    const priorityConfig = DISPUTE_PRIORITIES.find(p => p.value === priority);
    return (
      <Badge variant="outline" className={`border-2`}>
        <div className={`w-2 h-2 rounded-full ${priorityConfig?.color} mr-1`} />
        {priorityConfig?.label || priority}
      </Badge>
    );
  };

  const getTimeElapsed = (date: string) => {
    const diff = Date.now() - new Date(date).getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(hours / 24);
    
    if (days > 0) return `${days}d ago`;
    if (hours > 0) return `${hours}h ago`;
    return "Just now";
  };

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Dispute Management</h1>
          <p className="text-muted-foreground">
            Manage and resolve NFT marketplace disputes
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={fetchDisputes}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <Button variant="outline">
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Disputes</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Pending</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{stats.pending}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Investigating</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{stats.investigating}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Resolved</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats.resolved}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Critical</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{stats.criticalDisputes}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Avg Resolution</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.averageResolutionTime}h</div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4">
            <div className="flex-1">
              <Input
                placeholder="Search disputes..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All Statuses</SelectItem>
                {DISPUTE_STATUSES.map((status) => (
                  <SelectItem key={status.value} value={status.value}>
                    {status.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={priorityFilter} onValueChange={setPriorityFilter}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Priority" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All Priorities</SelectItem>
                {DISPUTE_PRIORITIES.map((priority) => (
                  <SelectItem key={priority.value} value={priority.value}>
                    {priority.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Disputes List */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Disputes</CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[600px]">
                <div className="space-y-2">
                  {disputes.map((dispute) => (
                    <Card
                      key={dispute.id}
                      className={`cursor-pointer transition-colors ${
                        selectedDispute?.id === dispute.id ? "border-primary" : ""
                      }`}
                      onClick={() => {
                        setSelectedDispute(dispute);
                        fetchDisputeMessages(dispute.id);
                      }}
                    >
                      <CardContent className="p-4">
                        <div className="flex justify-between items-start mb-2">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              {getPriorityBadge(dispute.priority)}
                              {getStatusBadge(dispute.status)}
                              <Badge variant="outline">
                                {dispute.disputeType.replace(/_/g, " ")}
                              </Badge>
                            </div>
                            <h4 className="font-semibold">{dispute.title}</h4>
                            <p className="text-sm text-muted-foreground line-clamp-2">
                              {dispute.description}
                            </p>
                          </div>
                        </div>
                        <div className="flex justify-between items-center mt-3">
                          <div className="flex items-center gap-4 text-sm text-muted-foreground">
                            <div className="flex items-center gap-1">
                              <User className="h-3 w-3" />
                              {dispute.reporter?.firstName} {dispute.reporter?.lastName}
                            </div>
                            <div className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {getTimeElapsed(dispute.createdAt)}
                            </div>
                          </div>
                          {dispute.listing && (
                            <div className="text-sm font-medium">
                              {dispute.listing.price} {dispute.listing.currency}
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </div>

        {/* Dispute Details */}
        <div>
          {selectedDispute ? (
            <Card>
              <CardHeader>
                <CardTitle>Dispute Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Quick Actions */}
                <div className="flex gap-2">
                  <Select
                    value={selectedDispute.status}
                    onValueChange={(value) => handleStatusChange(selectedDispute.id, value)}
                  >
                    <SelectTrigger className="flex-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {DISPUTE_STATUSES.map((status) => (
                        <SelectItem key={status.value} value={status.value}>
                          {status.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button
                    onClick={() => setResolutionModalOpen(true)}
                    className="flex-1"
                  >
                    <Gavel className="h-4 w-4 mr-2" />
                    Resolve
                  </Button>
                </div>

                <Separator />

                {/* Parties Involved */}
                <div className="space-y-3">
                  <Label>Parties Involved</Label>
                  <div className="space-y-2">
                    <div className="flex items-center gap-3">
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={selectedDispute.reporter?.avatar} />
                        <AvatarFallback>
                          {selectedDispute.reporter?.firstName?.[0]}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1">
                        <p className="text-sm font-medium">
                          {selectedDispute.reporter?.firstName} {selectedDispute.reporter?.lastName}
                        </p>
                        <p className="text-xs text-muted-foreground">Reporter</p>
                      </div>
                    </div>
                    {selectedDispute.respondent && (
                      <div className="flex items-center gap-3">
                        <Avatar className="h-8 w-8">
                          <AvatarImage src={selectedDispute.respondent?.avatar} />
                          <AvatarFallback>
                            {selectedDispute.respondent?.firstName?.[0]}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1">
                          <p className="text-sm font-medium">
                            {selectedDispute.respondent?.firstName} {selectedDispute.respondent?.lastName}
                          </p>
                          <p className="text-xs text-muted-foreground">Respondent</p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                <Separator />

                {/* Messages */}
                <div className="space-y-3">
                  <Label>Communication</Label>
                  <ScrollArea className="h-[200px] border rounded-lg p-3">
                    <div className="space-y-2">
                      {disputeMessages.map((msg) => (
                        <div key={msg.id} className="space-y-1">
                          <div className="flex items-center gap-2">
                            <p className="text-xs font-medium">
                              {msg.user?.firstName} {msg.user?.lastName}
                            </p>
                            {msg.isInternal && (
                              <Badge variant="outline" className="text-xs">
                                Internal
                              </Badge>
                            )}
                            <span className="text-xs text-muted-foreground">
                              {getTimeElapsed(msg.createdAt)}
                            </span>
                          </div>
                          <p className="text-sm">{msg.message}</p>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                  <div className="space-y-2">
                    <Textarea
                      placeholder="Type your message..."
                      value={messageInput}
                      onChange={(e) => setMessageInput(e.target.value)}
                      className="min-h-[80px]"
                    />
                    <div className="flex justify-between">
                      <div className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          id="internal"
                          checked={isInternalMessage}
                          onChange={(e) => setIsInternalMessage(e.target.checked)}
                        />
                        <Label htmlFor="internal" className="text-sm">
                          Internal note
                        </Label>
                      </div>
                      <Button onClick={handleSendMessage} size="sm">
                        <Send className="h-4 w-4 mr-2" />
                        Send
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="flex flex-col items-center justify-center h-[400px] text-muted-foreground">
                <Scale className="h-12 w-12 mb-4" />
                <p>Select a dispute to view details</p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Resolution Modal */}
      <Dialog open={resolutionModalOpen} onOpenChange={setResolutionModalOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Resolve Dispute</DialogTitle>
            <DialogDescription>
              Choose a resolution type and provide details for this dispute.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Resolution Type</Label>
              <div className="grid grid-cols-2 gap-2 mt-2">
                {RESOLUTION_TYPES.map((type) => (
                  <Card
                    key={type.value}
                    className={`cursor-pointer transition-colors ${
                      resolutionForm.resolutionType === type.value
                        ? "border-primary"
                        : ""
                    }`}
                    onClick={() =>
                      setResolutionForm({ ...resolutionForm, resolutionType: type.value })
                    }
                  >
                    <CardContent className="flex items-center gap-3 p-3">
                      <type.icon className="h-5 w-5" />
                      <span className="text-sm font-medium">{type.label}</span>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>

            {(resolutionForm.resolutionType === "REFUND" ||
              resolutionForm.resolutionType === "PARTIAL_REFUND") && (
              <div>
                <Label>Refund Amount</Label>
                <Input
                  type="number"
                  placeholder="Enter refund amount"
                  value={resolutionForm.refundAmount}
                  onChange={(e) =>
                    setResolutionForm({
                      ...resolutionForm,
                      refundAmount: parseFloat(e.target.value),
                    })
                  }
                  className="mt-2"
                />
              </div>
            )}

            <div>
              <Label>Resolution Details</Label>
              <Textarea
                placeholder="Provide detailed resolution explanation..."
                value={resolutionForm.resolution}
                onChange={(e) =>
                  setResolutionForm({ ...resolutionForm, resolution: e.target.value })
                }
                className="mt-2 min-h-[120px]"
              />
            </div>

            {resolutionForm.resolutionType === "BAN_USER" && (
              <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>Warning</AlertTitle>
                <AlertDescription>
                  Banning a user will prevent them from using the marketplace. This action
                  requires additional approval.
                </AlertDescription>
              </Alert>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setResolutionModalOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleResolveDispute}>
              Resolve Dispute
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}