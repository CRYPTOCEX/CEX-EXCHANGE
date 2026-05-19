"use client";

import { useState, useEffect } from "react";
import { $fetch } from "@/lib/api";
import { motion } from "framer-motion";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Database,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
  Clock,
  Play,
  Mail,
  Bell,
  MessageSquare,
  Smartphone,
  User,
  ListIcon,
} from "lucide-react";
import { toast } from "sonner";
import { StatsCard, statsCardColors } from "@/components/ui/card/stats-card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface QueueStats {
  waiting: number;
  active: number;
  completed: number;
  failed: number;
}

interface QueueHealth {
  status: string;
  totalJobs: number;
  failureRate: string;
}

interface QueueItem {
  id: string;
  userId: string;
  title: string;
  type: string;
  channels: string[] | null;
  template: string | null;
  queuedAt: string;
  age: string;
  status: "pending" | "processing";
}

interface QueueManagerProps {
  onRefresh: () => void;
}

const channelIcons: Record<string, React.ElementType> = {
  Email: Mail,
  Sms: MessageSquare,
  Push: Smartphone,
  InApp: Bell,
};

export function QueueManager({ onRefresh }: QueueManagerProps) {
  const [stats, setStats] = useState<QueueStats | null>(null);
  const [health, setHealth] = useState<QueueHealth | null>(null);
  const [queueItems, setQueueItems] = useState<QueueItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingItems, setIsLoadingItems] = useState(false);

  const fetchStats = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await $fetch({
        url: "/api/admin/system/notification/queue/stats",
        silent: true,
      });

      if (error) {
        toast.error("Failed to fetch queue statistics");
      } else {
        setStats(data.queue);
        setHealth(data.health);
      }
    } catch (err) {
      console.error("Queue stats fetch error:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchQueueItems = async () => {
    setIsLoadingItems(true);
    try {
      const { data, error } = await $fetch({
        url: "/api/admin/system/notification/queue/items?limit=50",
        silent: true,
      });

      if (error) {
        console.error("Failed to fetch queue items:", error);
      } else {
        setQueueItems(data.items || []);
      }
    } catch (err) {
      console.error("Queue items fetch error:", err);
    } finally {
      setIsLoadingItems(false);
    }
  };

  useEffect(() => {
    fetchStats();
    fetchQueueItems();
    // Auto-refresh every 5 seconds
    const interval = setInterval(() => {
      fetchStats();
      fetchQueueItems();
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  const totalJobs = stats
    ? stats.waiting + stats.active + stats.completed + stats.failed
    : 0;

  const failureRate = health?.failureRate || "0.00";
  const queueStatus = health?.status || "healthy";

  return (
    <div className="space-y-6">
      {/* Queue Statistics */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Database className="h-5 w-5" />
                  Queue Statistics
                </CardTitle>
                <CardDescription>Real-time notification queue metrics (auto-refreshes every 5s)</CardDescription>
              </div>
              <div className="flex items-center gap-2">
                <Badge
                  variant={queueStatus === "healthy" ? "default" : "destructive"}
                  className={
                    queueStatus === "healthy"
                      ? "bg-green-500/10 text-green-500 hover:bg-green-500/20"
                      : "bg-yellow-500/10 text-yellow-500 hover:bg-yellow-500/20"
                  }
                >
                  {queueStatus === "healthy" ? "Healthy" : "Degraded"}
                </Badge>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    fetchStats();
                    fetchQueueItems();
                    onRefresh();
                  }}
                  disabled={isLoading}
                >
                  <RefreshCw className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-5">
              <StatsCard
                label="Waiting"
                value={stats?.waiting || 0}
                icon={Clock}
                {...statsCardColors.amber}
                index={0}
              />
              <StatsCard
                label="Processing"
                value={stats?.active || 0}
                icon={Play}
                {...statsCardColors.blue}
                change={(stats?.active || 0) > 0 ? "Active" : "Idle"}
                index={1}
              />
              <StatsCard
                label="Completed"
                value={stats?.completed || 0}
                icon={CheckCircle2}
                {...statsCardColors.green}
                index={2}
              />
              <StatsCard
                label="Failed"
                value={stats?.failed || 0}
                icon={AlertCircle}
                {...statsCardColors.red}
                change={failureRate}
                changeLabel="failure rate"
                isPercent={true}
                index={3}
              />
              <StatsCard
                label="Total"
                value={totalJobs}
                icon={Database}
                {...statsCardColors.purple}
                change={queueStatus === "healthy" ? "Healthy" : "Degraded"}
                index={4}
              />
            </div>

            {/* Health Indicators */}
            <div className="mt-6 grid gap-4 md:grid-cols-2">
              <div className="p-4 rounded-lg border">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Failure Rate</span>
                  <Badge
                    variant={parseFloat(failureRate) < 5 ? "default" : "destructive"}
                    className={
                      parseFloat(failureRate) < 5
                        ? "bg-green-500/10 text-green-500 hover:bg-green-500/20"
                        : ""
                    }
                  >
                    {failureRate}%
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Based on completed and failed notifications
                </p>
              </div>
              <div className="p-4 rounded-lg border">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Queue Health</span>
                  <Badge
                    variant={queueStatus === "healthy" ? "default" : "destructive"}
                    className={
                      queueStatus === "healthy"
                        ? "bg-green-500/10 text-green-500 hover:bg-green-500/20"
                        : "bg-yellow-500/10 text-yellow-500 hover:bg-yellow-500/20"
                    }
                  >
                    {queueStatus === "healthy" ? "Healthy" : "Degraded"}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {queueStatus === "healthy"
                    ? "Queue is operating normally"
                    : (stats?.waiting || 0) > 100
                      ? "Queue backing up - notifications waiting"
                      : "High failure rate detected"}
                </p>
              </div>
            </div>

            {/* Info about Redis persistence */}
            <div className="mt-4 p-4 rounded-lg border bg-muted/50">
              <div className="flex items-start gap-3">
                <CheckCircle2 className="h-5 w-5 text-green-500 mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm font-medium">Redis-Backed Queue</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Notifications are persisted to Redis before processing. If the server crashes or restarts,
                    pending notifications are automatically recovered and re-processed. Statistics (completed/failed)
                    are also persisted to Redis and survive restarts.
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Queue Items */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.1 }}
      >
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <ListIcon className="h-5 w-5" />
                  Pending Notifications
                </CardTitle>
                <CardDescription>
                  {queueItems.length > 0
                    ? `${queueItems.length} notification${queueItems.length !== 1 ? "s" : ""} waiting in queue`
                    : "No notifications in queue"}
                </CardDescription>
              </div>
              <Button
                size="sm"
                variant="outline"
                onClick={fetchQueueItems}
                disabled={isLoadingItems}
              >
                <RefreshCw className={`h-4 w-4 ${isLoadingItems ? "animate-spin" : ""}`} />
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {queueItems.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Database className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p className="text-sm">Queue is empty</p>
                <p className="text-xs mt-1">Notifications will appear here when queued</p>
              </div>
            ) : (
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Status</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Title</TableHead>
                      <TableHead>User</TableHead>
                      <TableHead>Channels</TableHead>
                      <TableHead>Age</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {queueItems.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell>
                          <Badge
                            variant={item.status === "processing" ? "default" : "secondary"}
                            className={
                              item.status === "processing"
                                ? "bg-blue-500/10 text-blue-500"
                                : "bg-amber-500/10 text-amber-500"
                            }
                          >
                            {item.status === "processing" ? (
                              <Play className="h-3 w-3 mr-1" />
                            ) : (
                              <Clock className="h-3 w-3 mr-1" />
                            )}
                            {item.status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="font-mono text-xs">
                            {item.type}
                          </Badge>
                        </TableCell>
                        <TableCell className="max-w-[200px] truncate" title={item.title}>
                          {item.title}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1 text-xs text-muted-foreground">
                            <User className="h-3 w-3" />
                            <span className="truncate max-w-[100px]" title={item.userId}>
                              {item.userId.substring(0, 8)}...
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            {item.channels?.map((channel) => {
                              const Icon = channelIcons[channel] || Bell;
                              return (
                                <span
                                  key={channel}
                                  title={channel}
                                  className="p-1 rounded bg-muted"
                                >
                                  <Icon className="h-3 w-3" />
                                </span>
                              );
                            }) || (
                              <span className="text-xs text-muted-foreground">Default</span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <span className="text-xs text-muted-foreground">{item.age}</span>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
