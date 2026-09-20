"use client";

import { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import { $fetch } from "@/lib/api";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { StatsCard, statsCardColors } from "@/components/ui/card/stats-card";
import { Button } from "@/components/ui/button";
import { Badge, type BadgeTone } from "@/components/ui/badge";
import { statusTone } from "@/lib/status-tone";
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

/**
 * Dispute statuses, carrying a TONE rather than a fill class so `Badge` picks
 * the matching ink (see below) and the admin design panel reaches both.
 *
 * `INVESTIGATING`, `AWAITING_RESPONSE` and `ESCALATED` are not keys in
 * `lib/status-tone.ts` — the dispute board is their only site in the app — so
 * they are declared here rather than looked up. The other three agree with the
 * shared table.
 *
 * Two were wrong: `INVESTIGATING` and `ESCALATED` wore `primary`, and R2
 * reserves the accent for things you CLICK. Investigating is in flight, so it
 * takes `info`; escalated is the urgent rung above "awaiting response", so it
 * takes `destructive` to stay distinguishable from it.
 */
const DISPUTE_STATUSES: Array<{
  value: string;
  label: string;
  tone: BadgeTone;
}> = [
  { value: "PENDING", label: "Pending", tone: "warning" },
  { value: "INVESTIGATING", label: "Investigating", tone: "info" },
  { value: "AWAITING_RESPONSE", label: "Awaiting Response", tone: "warning" },
  { value: "RESOLVED", label: "Resolved", tone: "success" },
  { value: "REJECTED", label: "Rejected", tone: "destructive" },
  { value: "ESCALATED", label: "Escalated", tone: "destructive" },
];

/**
 * A four-rung ORDINAL scale, so it is deliberately NOT `statusTone()`: the table
 * lands both `HIGH` and `VERY_HIGH` on destructive and says so explicitly. Here
 * `HIGH` was warning — byte-identical to `MEDIUM`, i.e. the scale had three
 * distinct rungs, not four. It now matches the shared table's `HIGH`.
 */
const DISPUTE_PRIORITIES: Array<{
  value: string;
  label: string;
  dot: string;
}> = [
  { value: "LOW", label: "Low", dot: "bg-muted-foreground" },
  { value: "MEDIUM", label: "Medium", dot: "bg-warning" },
  { value: "HIGH", label: "High", dot: "bg-destructive/60" },
  { value: "CRITICAL", label: "Critical", dot: "bg-destructive" },
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
  const t = useTranslations("ext_admin");
  const tCommon = useTranslations("common");
  const tExt = useTranslations("ext");
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

      if (response.error) {
        // $fetch never throws — report the failure instead of rendering an
        // empty dispute list as if there were none.
        toast.error(t("failed_to_fetch_disputes"));
      } else if (response.data) {
        /*
         * The endpoint returns `getFiltered(...)`, which is the paginated
         * envelope every admin list uses — `{ items, pagination }`, not a bare
         * array. Assigning it straight to state made `disputes.map` throw
         * `disputes.map is not a function` on first render, and the page has
         * only ever shown its error boundary ("Something went wrong!").
         */
        const payload = response.data as any;
        setDisputes(Array.isArray(payload) ? payload : (payload?.items ?? []));
      }
    } catch (error) {
      toast.error(t("failed_to_fetch_disputes"));
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

      if (response.error) {
        toast.error(t("failed_to_fetch_messages"));
      } else if (response.data) {
        setDisputeMessages(response.data);
      }
    } catch (error) {
      toast.error(t("failed_to_fetch_messages"));
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
        toast.success(tCommon("status_updated_successfully"));
        fetchDisputes();
        if (selectedDispute?.id === disputeId) {
          setSelectedDispute({ ...selectedDispute, status: newStatus });
        }
      }
    } catch (error) {
      toast.error(tCommon("failed_to_update_status"));
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
        toast.success(t("priority_updated_successfully"));
        fetchDisputes();
      }
    } catch (error) {
      toast.error(t("failed_to_update_priority"));
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
        toast.success(t("message_sent"));
        setMessageInput("");
        fetchDisputeMessages(selectedDispute.id);
      }
    } catch (error) {
      toast.error(tExt("failed_to_send_message"));
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
        toast.success(t("dispute_resolved_successfully"));
        setResolutionModalOpen(false);
        setResolutionForm({ resolutionType: "", resolution: "", refundAmount: 0 });
        fetchDisputes();
        setSelectedDispute(null);
      }
    } catch (error) {
      toast.error(t("failed_to_resolve_dispute"));
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
        toast.success(t("dispute_assigned_successfully"));
        fetchDisputes();
      }
    } catch (error) {
      toast.error(t("failed_to_assign_dispute"));
    }
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = DISPUTE_STATUSES.find(s => s.value === status);
    /* Was `${color} text-primary-foreground` — a solid warning/success/
       destructive fill carrying the ink calibrated for the PRIMARY fill. The
       `solid` appearance pairs each tone with its own `-foreground`. */
    return (
      <Badge tone={statusConfig?.tone ?? statusTone(status)} appearance="solid">
        {statusConfig?.label || status}
      </Badge>
    );
  };

  const getPriorityBadge = (priority: string) => {
    const priorityConfig = DISPUTE_PRIORITIES.find(p => p.value === priority);
    return (
      <Badge variant="outline" className={`border-2`}>
        <div className={`w-2 h-2 rounded-full ${priorityConfig?.dot} mr-1`} />
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

  // Was `container mx-auto py-6 space-y-6`, nested inside the page's own
  // `container ${PAGE_PADDING}` (dispute/page.tsx) — two containers meant
  // two sets of gutters, so this page was inset further than every other
  // admin page. The page owns the frame; the client owns only its rhythm.
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">{t("dispute_management")}</h1>
          <p className="text-muted-foreground">
            {t("manage_and_resolve_nft_marketplace_disputes")}
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
        <StatsCard
          label={t("total_disputes")}
          value={stats.total}
          icon={Gavel}
          {...statsCardColors.neutral}
        />
        <StatsCard
          label="Pending"
          value={stats.pending}
          icon={Clock}
          {...statsCardColors.warning}
        />
        <StatsCard
          label="Investigating"
          value={stats.investigating}
          icon={Search}
          {...statsCardColors.primary}
        />
        <StatsCard
          label="Resolved"
          value={stats.resolved}
          icon={CheckCircle}
          {...statsCardColors.success}
        />
        <StatsCard
          label="Critical"
          value={stats.criticalDisputes}
          icon={AlertTriangle}
          {...statsCardColors.red}
        />
        <StatsCard
          label={t("avg_resolution")}
          value={`${stats.averageResolutionTime}h`}
          icon={Scale}
          {...statsCardColors.neutral}
        />
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
                placeholder={`${t("search_disputes")}…`}
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
                <SelectItem value="ALL">{tCommon("all_statuses")}</SelectItem>
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
                <SelectItem value="ALL">{t("all_priorities")}</SelectItem>
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
                <CardTitle>{t("dispute_details")}</CardTitle>
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
                  <Label>{t("parties_involved")}</Label>
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
                      placeholder={`${tCommon("type_your_message")}…`}
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
                          {t("internal_note")}
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
                <p>{t("select_a_dispute_to_view_details")}</p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Resolution Modal */}
      <Dialog open={resolutionModalOpen} onOpenChange={setResolutionModalOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{t("resolve_dispute")}</DialogTitle>
            <DialogDescription>
              {t("choose_a_resolution_type_and_provide")}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>{t("resolution_type")}</Label>
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
                <Label>{tCommon("refund_amount")}</Label>
                <Input
                  type="number"
                  placeholder={t("enter_refund_amount")}
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
              <Label>{t("resolution_details")}</Label>
              <Textarea
                placeholder={`${t("provide_detailed_resolution_explanation")}…`}
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
                  {t("banning_a_user_will_prevent_them")} {t("this_action_requires_additional_approval")}
                </AlertDescription>
              </Alert>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setResolutionModalOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleResolveDispute}>
              {t("resolve_dispute")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}