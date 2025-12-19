"use client";
import React, { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import {
  Shield,
  User,
  TrendingUp,
  DollarSign,
  Settings,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Play,
  RefreshCw,
  Edit,
  Plus,
  Search,
  Filter,
  Calendar,
  Clock,
  MapPin,
  ChevronDown,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { $fetch } from "@/lib/api";
import { format } from "date-fns";

interface AuditLog {
  id: string;
  entityType: string;
  entityId: string;
  action: string;
  oldValue: any;
  newValue: any;
  metadata: any;
  userId: string;
  adminId: string;
  ipAddress: string;
  userAgent: string;
  createdAt: string;
  user?: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
  };
  admin?: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
  };
}

export default function AuditLogPage() {
  const t = useTranslations("ext_admin");
  const tCommon = useTranslations("common");

  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [selectedAction, setSelectedAction] = useState<string>("ALL");
  const [selectedEntityType, setSelectedEntityType] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedLog, setExpandedLog] = useState<string | null>(null);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const params: any = { page, limit: 20 };
      if (selectedAction && selectedAction !== "ALL")
        params.action = selectedAction;
      if (selectedEntityType && selectedEntityType !== "ALL")
        params.entityType = selectedEntityType;
      if (searchQuery && searchQuery.trim()) params.entityId = searchQuery;

      const response = await $fetch({
        url: "/api/admin/copy-trading/audit",
        method: "GET",
        params,
        silentSuccess: true,
      });

      setLogs(response.data?.items || []);
      setTotalPages(response.data?.pagination?.totalPages || 1);
      setTotal(response.data?.pagination?.total || 0);
    } catch (error) {
      console.error("Failed to fetch audit logs:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, [page, selectedAction, selectedEntityType, searchQuery]);

  const getEntityIcon = (entityType: string) => {
    switch (entityType) {
      case "LEADER":
        return Shield;
      case "FOLLOWER":
        return User;
      case "TRADE":
        return TrendingUp;
      case "TRANSACTION":
        return DollarSign;
      case "SETTING":
        return Settings;
      default:
        return Shield;
    }
  };

  const getActionIcon = (action: string) => {
    switch (action) {
      case "APPROVE":
      case "ACTIVATE":
        return CheckCircle2;
      case "REJECT":
      case "DELETE":
        return XCircle;
      case "SUSPEND":
      case "REVERSE":
        return AlertTriangle;
      case "START":
      case "RESUME":
        return Play;
      case "RECALCULATE":
        return RefreshCw;
      case "UPDATE":
        return Edit;
      case "CREATE":
        return Plus;
      default:
        return Edit;
    }
  };

  const getActionColor = (action: string) => {
    switch (action) {
      case "APPROVE":
      case "ACTIVATE":
      case "START":
      case "RESUME":
        return "text-emerald-500 bg-emerald-500/10 border-emerald-500/20";
      case "REJECT":
      case "DELETE":
        return "text-red-500 bg-red-500/10 border-red-500/20";
      case "SUSPEND":
      case "REVERSE":
        return "text-amber-500 bg-amber-500/10 border-amber-500/20";
      case "UPDATE":
      case "RECALCULATE":
        return "text-blue-500 bg-blue-500/10 border-blue-500/20";
      case "CREATE":
        return "text-violet-500 bg-violet-500/10 border-violet-500/20";
      default:
        return "text-zinc-500 bg-zinc-500/10 border-zinc-500/20";
    }
  };

  const getEntityTypeColor = (entityType: string) => {
    switch (entityType) {
      case "LEADER":
        return "bg-indigo-500/10 text-indigo-600 border-indigo-500/20";
      case "FOLLOWER":
        return "bg-blue-500/10 text-blue-600 border-blue-500/20";
      case "TRADE":
        return "bg-emerald-500/10 text-emerald-600 border-emerald-500/20";
      case "TRANSACTION":
        return "bg-amber-500/10 text-amber-600 border-amber-500/20";
      case "SETTING":
        return "bg-violet-500/10 text-violet-600 border-violet-500/20";
      default:
        return "bg-zinc-500/10 text-zinc-600 border-zinc-500/20";
    }
  };

  const formatChanges = (oldValue: any, newValue: any) => {
    if (!oldValue && !newValue) return null;

    const changes: { field: string; old: any; new: any }[] = [];
    const allKeys = new Set([
      ...Object.keys(oldValue || {}),
      ...Object.keys(newValue || {}),
    ]);

    allKeys.forEach((key) => {
      if (JSON.stringify(oldValue?.[key]) !== JSON.stringify(newValue?.[key])) {
        changes.push({
          field: key,
          old: oldValue?.[key],
          new: newValue?.[key],
        });
      }
    });

    return changes;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-zinc-50 via-white to-indigo-50/30 dark:from-zinc-950 dark:via-zinc-900 dark:to-indigo-950/20">
      {/* Header */}
      <div className="border-b border-zinc-200 dark:border-zinc-800 bg-white/80 dark:bg-zinc-900/80 backdrop-blur-xl sticky top-0 z-10">
        <div className="container mx-auto px-6 pt-20 pb-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-indigo-600 to-violet-600 bg-clip-text text-transparent">
                {t("audit_log")}
              </h1>
              <p className="text-zinc-600 dark:text-zinc-400 mt-1">
                {t("view_admin_actions_and_system_events")}
              </p>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <Clock className="h-4 w-4 text-zinc-400" />
              <span className="text-zinc-600 dark:text-zinc-400">
                {total} {t("total_events")}
              </span>
            </div>
          </div>

          {/* Filters */}
          <div className="flex flex-wrap gap-3">
            <div className="flex-1 min-w-[200px]">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
                <Input
                  placeholder={t("search_by_entity_id")}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <Select
              value={selectedEntityType}
              onValueChange={setSelectedEntityType}
            >
              <SelectTrigger className="w-[180px]">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue placeholder={t("entity_type")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">{tCommon("all")}</SelectItem>
                <SelectItem value="LEADER">Leader</SelectItem>
                <SelectItem value="FOLLOWER">Follower</SelectItem>
                <SelectItem value="TRADE">Trade</SelectItem>
                <SelectItem value="TRANSACTION">Transaction</SelectItem>
                <SelectItem value="SETTING">Setting</SelectItem>
              </SelectContent>
            </Select>
            <Select value={selectedAction} onValueChange={setSelectedAction}>
              <SelectTrigger className="w-[180px]">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue placeholder={tCommon("action")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">{tCommon("all")}</SelectItem>
                <SelectItem value="APPROVE">Approve</SelectItem>
                <SelectItem value="REJECT">Reject</SelectItem>
                <SelectItem value="SUSPEND">Suspend</SelectItem>
                <SelectItem value="ACTIVATE">Activate</SelectItem>
                <SelectItem value="CREATE">Create</SelectItem>
                <SelectItem value="UPDATE">Update</SelectItem>
                <SelectItem value="DELETE">Delete</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* Timeline */}
      <div className="container mx-auto px-6 py-8">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
          </div>
        ) : logs.length === 0 ? (
          <Card className="border-0 shadow-lg">
            <CardContent className="flex flex-col items-center justify-center py-20">
              <Shield className="h-16 w-16 text-zinc-300 dark:text-zinc-700 mb-4" />
              <h3 className="text-lg font-semibold text-zinc-900 dark:text-white mb-2">
                {t("no_audit_logs")}
              </h3>
              <p className="text-sm text-zinc-500">
                {t("no_events_match_your_filters")}
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="relative">
            {/* Timeline line */}
            <div className="absolute left-8 top-0 bottom-0 w-0.5 bg-gradient-to-b from-indigo-200 via-violet-200 to-transparent dark:from-indigo-900 dark:via-violet-900" />

            {/* Timeline items */}
            <div className="space-y-6">
              {logs.map((log, index) => {
                const EntityIcon = getEntityIcon(log.entityType);
                const ActionIcon = getActionIcon(log.action);
                const changes = formatChanges(log.oldValue, log.newValue);
                const isExpanded = expandedLog === log.id;

                return (
                  <div key={log.id} className="relative pl-20">
                    {/* Timeline dot */}
                    <div
                      className={`absolute left-5 top-6 w-6 h-6 rounded-full border-4 border-white dark:border-zinc-900 shadow-lg ${
                        getActionColor(log.action).split(" ")[1]
                      }`}
                    >
                      <div className="absolute inset-0 animate-ping opacity-20 rounded-full bg-current" />
                    </div>

                    {/* Card */}
                    <Card className="group border-0 shadow-lg hover:shadow-xl transition-all duration-300 overflow-hidden">
                      <CardContent className="p-0">
                        {/* Header */}
                        <div
                          className="p-6 cursor-pointer"
                          onClick={() =>
                            setExpandedLog(isExpanded ? null : log.id)
                          }
                        >
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex items-start gap-4 flex-1">
                              {/* Action Icon */}
                              <div
                                className={`p-3 rounded-xl border ${getActionColor(
                                  log.action
                                )}`}
                              >
                                <ActionIcon className="h-5 w-5" />
                              </div>

                              {/* Content */}
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 flex-wrap mb-2">
                                  <h3 className="text-lg font-semibold text-zinc-900 dark:text-white">
                                    {log.action.replace("_", " ")}
                                  </h3>
                                  <Badge
                                    className={`border ${getEntityTypeColor(
                                      log.entityType
                                    )}`}
                                    variant="outline"
                                  >
                                    <EntityIcon className="h-3 w-3 mr-1" />
                                    {log.entityType}
                                  </Badge>
                                </div>

                                <div className="flex items-center gap-4 text-sm text-zinc-500 dark:text-zinc-400 flex-wrap">
                                  {log.admin && (
                                    <div className="flex items-center gap-1.5">
                                      <User className="h-3.5 w-3.5" />
                                      <span>
                                        {log.admin.firstName}{" "}
                                        {log.admin.lastName}
                                      </span>
                                    </div>
                                  )}
                                  {log.ipAddress && (
                                    <div className="flex items-center gap-1.5">
                                      <MapPin className="h-3.5 w-3.5" />
                                      <span className="font-mono">
                                        {log.ipAddress}
                                      </span>
                                    </div>
                                  )}
                                  <div className="flex items-center gap-1.5">
                                    <Calendar className="h-3.5 w-3.5" />
                                    <span>
                                      {format(
                                        new Date(log.createdAt),
                                        "MMM dd, yyyy 'at' HH:mm"
                                      )}
                                    </span>
                                  </div>
                                </div>

                                {log.user && (
                                  <div className="mt-3 flex items-center gap-2 text-sm">
                                    <span className="text-zinc-500">
                                      {t("affected_user")}:
                                    </span>
                                    <span className="font-medium text-zinc-700 dark:text-zinc-300">
                                      {log.user.firstName} {log.user.lastName}
                                    </span>
                                    <span className="text-zinc-400">
                                      ({log.user.email})
                                    </span>
                                  </div>
                                )}
                              </div>
                            </div>

                            {/* Expand button */}
                            <Button
                              variant="ghost"
                              size="sm"
                              className="shrink-0"
                            >
                              <ChevronDown
                                className={`h-4 w-4 transition-transform ${
                                  isExpanded ? "rotate-180" : ""
                                }`}
                              />
                            </Button>
                          </div>
                        </div>

                        {/* Expanded Details */}
                        {isExpanded && (
                          <div className="border-t border-zinc-100 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/50 p-6 space-y-4">
                            {/* Entity ID */}
                            <div>
                              <label className="text-xs font-medium text-zinc-500 uppercase tracking-wider">
                                {t("entity_id")}
                              </label>
                              <p className="mt-1 font-mono text-sm text-zinc-700 dark:text-zinc-300">
                                {log.entityId}
                              </p>
                            </div>

                            {/* Changes */}
                            {changes && changes.length > 0 && (
                              <div>
                                <label className="text-xs font-medium text-zinc-500 uppercase tracking-wider">
                                  {t("changes")}
                                </label>
                                <div className="mt-2 space-y-2">
                                  {changes.map((change, idx) => (
                                    <div
                                      key={idx}
                                      className="flex items-start gap-4 p-3 rounded-lg bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700"
                                    >
                                      <div className="flex-1">
                                        <span className="text-xs font-medium text-zinc-500 uppercase">
                                          {change.field}
                                        </span>
                                        <div className="mt-1 flex items-center gap-2">
                                          <code className="px-2 py-1 text-sm bg-red-500/10 text-red-700 dark:text-red-400 rounded">
                                            {change.old !== undefined &&
                                            change.old !== null
                                              ? JSON.stringify(change.old)
                                              : "—"}
                                          </code>
                                          <span className="text-zinc-400">
                                            →
                                          </span>
                                          <code className="px-2 py-1 text-sm bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 rounded">
                                            {change.new !== undefined &&
                                            change.new !== null
                                              ? JSON.stringify(change.new)
                                              : "—"}
                                          </code>
                                        </div>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}

                            {/* Metadata */}
                            {log.metadata &&
                              Object.keys(log.metadata).length > 0 && (
                                <div>
                                  <label className="text-xs font-medium text-zinc-500 uppercase tracking-wider">
                                    {tCommon("metadata")}
                                  </label>
                                  <pre className="mt-2 p-4 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg text-xs overflow-auto">
                                    {JSON.stringify(log.metadata, null, 2)}
                                  </pre>
                                </div>
                              )}

                            {/* User Agent */}
                            {log.userAgent && (
                              <div>
                                <label className="text-xs font-medium text-zinc-500 uppercase tracking-wider">
                                  {t("user_agent")}
                                </label>
                                <p className="mt-1 text-xs text-zinc-600 dark:text-zinc-400 font-mono">
                                  {log.userAgent}
                                </p>
                              </div>
                            )}
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="mt-8 flex items-center justify-center gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={page === 1}
              onClick={() => setPage(page - 1)}
            >
              {tCommon('prev')}
            </Button>
            <div className="flex items-center gap-1">
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                let pageNum;
                if (totalPages <= 5) {
                  pageNum = i + 1;
                } else if (page <= 3) {
                  pageNum = i + 1;
                } else if (page >= totalPages - 2) {
                  pageNum = totalPages - 4 + i;
                } else {
                  pageNum = page - 2 + i;
                }

                return (
                  <Button
                    key={i}
                    variant={page === pageNum ? "default" : "outline"}
                    size="sm"
                    onClick={() => setPage(pageNum)}
                  >
                    {pageNum}
                  </Button>
                );
              })}
            </div>
            <Button
              variant="outline"
              size="sm"
              disabled={page === totalPages}
              onClick={() => setPage(page + 1)}
            >
              {tCommon("next")}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
