"use client";

import { useState, useEffect } from "react";
import { $fetch } from "@/lib/api";
import { motion } from "framer-motion";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Database, Trash2, RefreshCw, AlertCircle, CheckCircle2, Clock, Play } from "lucide-react";
import { toast } from "sonner";
import { StatsCard, statsCardColors } from "@/components/ui/card/stats-card";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

interface QueueStats {
  waiting: number;
  active: number;
  completed: number;
  failed: number;
  delayed: number;
}

interface QueueManagerProps {
  onRefresh: () => void;
}

export function QueueManager({ onRefresh }: QueueManagerProps) {
  const [stats, setStats] = useState<QueueStats | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isCleaning, setIsCleaning] = useState(false);
  const [cleanOlderThan, setCleanOlderThan] = useState("24");

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
      }
    } catch (err) {
      console.error("Queue stats fetch error:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  const handleClean = async () => {
    setIsCleaning(true);
    try {
      const olderThanMs = parseFloat(cleanOlderThan) * 3600000; // Convert hours to milliseconds
      const { data, error } = await $fetch({
        url: "/api/admin/system/notification/queue/clean",
        method: "POST",
        body: { olderThan: olderThanMs },
      });

      if (error) {
        toast.error("Failed to clean queue");
      } else {
        toast.success(`Successfully cleaned ${data.removed.total} jobs from queue`);
        fetchStats();
        onRefresh();
      }
    } catch (err) {
      console.error("Queue clean error:", err);
      toast.error("An error occurred while cleaning queue");
    } finally {
      setIsCleaning(false);
    }
  };

  const totalJobs = stats
    ? stats.waiting + stats.active + stats.completed + stats.failed + (stats.delayed || 0)
    : 0;

  const failureRate = stats && stats.completed + stats.failed > 0
    ? ((stats.failed / (stats.completed + stats.failed)) * 100).toFixed(2)
    : "0.00";

  const queueStatus = stats && stats.failed > stats.completed * 0.1 ? "degraded" : "healthy";

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
                <CardDescription>Real-time notification queue metrics</CardDescription>
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
                label="Active"
                value={stats?.active || 0}
                icon={Play}
                {...statsCardColors.blue}
                change={stats?.active || 0 > 0 ? "Processing" : "Idle"}
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
                label="Total Jobs"
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
                  Based on completed and failed jobs
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
                    : "High failure rate detected"}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Queue Maintenance */}
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
                  <Trash2 className="h-5 w-5" />
                  Queue Maintenance
                </CardTitle>
                <CardDescription>Clean up old completed and failed jobs</CardDescription>
              </div>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="destructive" size="sm" disabled={isCleaning}>
                    {isCleaning ? (
                      <>
                        <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                        Cleaning...
                      </>
                    ) : (
                      <>
                        <Trash2 className="mr-2 h-4 w-4" />
                        Clean Queue
                      </>
                    )}
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Clean Queue Jobs?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This will permanently remove all completed and failed jobs older than {cleanOlderThan}{" "}
                      hours. This action cannot be undone.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={handleClean}>Clean Queue</AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="cleanOlderThan">Remove jobs older than (hours)</Label>
              <Input
                id="cleanOlderThan"
                type="number"
                min="1"
                value={cleanOlderThan}
                onChange={(e) => setCleanOlderThan(e.target.value)}
                placeholder="24"
              />
              <p className="text-xs text-muted-foreground">
                Default: 24 hours. Removes completed and failed jobs older than the specified time.
              </p>
            </div>

            <div className="p-4 rounded-lg border bg-muted/50">
              <div className="flex items-start gap-3">
                <AlertCircle className="h-5 w-5 text-yellow-500 mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm font-medium">Important Notes</p>
                  <ul className="text-xs text-muted-foreground mt-2 space-y-1">
                    <li>• Only completed and failed jobs will be removed</li>
                    <li>• Active and waiting jobs are never affected</li>
                    <li>• This helps maintain queue performance</li>
                    <li>• Regular cleanup is recommended for production environments</li>
                  </ul>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
