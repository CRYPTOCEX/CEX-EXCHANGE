"use client";

import { motion } from "framer-motion";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Bell,
  CheckCircle2,
  XCircle,
  Clock,
  TrendingUp,
  RefreshCw,
  Mail,
  MessageSquare,
  Smartphone,
  Inbox
} from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { StatsCard, statsCardColors } from "@/components/ui/card/stats-card";

interface DashboardOverviewProps {
  data: any;
  onRefresh: () => void;
}

export function DashboardOverview({ data, onRefresh }: DashboardOverviewProps) {
  if (!data) return null;

  const successRate = parseFloat(data.metrics.successRate);
  const cacheHitRate = parseFloat(data.metrics.cacheHitRate);
  const totalJobs = data.queue.waiting + data.queue.active + data.queue.completed + data.queue.failed;

  const stats = [
    {
      label: "Total Sent",
      value: data.metrics.totalSent,
      icon: CheckCircle2,
      ...statsCardColors.green,
      change: "+12.5",
      changeLabel: "vs last period",
      isPercent: true,
    },
    {
      label: "Total Failed",
      value: data.metrics.totalFailed,
      icon: XCircle,
      ...statsCardColors.red,
      change: "-2.3",
      changeLabel: "improvement",
      isPercent: true,
    },
    {
      label: "Queue Jobs",
      value: totalJobs,
      icon: Clock,
      ...statsCardColors.blue,
      change: data.queue.waiting,
      changeLabel: "waiting",
    },
    {
      label: "Success Rate",
      value: `${successRate.toFixed(1)}%`,
      icon: TrendingUp,
      ...statsCardColors.purple,
      change: "Last 24h",
    },
  ];

  const channels = [
    {
      name: "In-App",
      icon: Inbox,
      enabled: data.channels.available.includes("IN_APP"),
      color: "text-blue-500",
      bgColor: "bg-blue-500/10",
    },
    {
      name: "Email",
      icon: Mail,
      enabled: data.channels.available.includes("EMAIL"),
      color: "text-green-500",
      bgColor: "bg-green-500/10",
    },
    {
      name: "SMS",
      icon: MessageSquare,
      enabled: data.channels.available.includes("SMS"),
      color: "text-orange-500",
      bgColor: "bg-orange-500/10",
    },
    {
      name: "Push",
      icon: Smartphone,
      enabled: data.channels.available.includes("PUSH"),
      color: "text-purple-500",
      bgColor: "bg-purple-500/10",
    },
  ];

  const formatUptime = (seconds: number) => {
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);

    if (days > 0) return `${days}d ${hours}h`;
    if (hours > 0) return `${hours}h ${minutes}m`;
    return `${minutes}m`;
  };

  return (
    <div className="space-y-6">
      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat, index) => (
          <StatsCard key={stat.label} {...stat} index={index} />
        ))}
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Channels Status */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5 }}
        >
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Notification Channels</CardTitle>
                  <CardDescription>Available communication channels</CardDescription>
                </div>
                <Badge variant="outline">{data.channels.total} Active</Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {channels.map((channel) => (
                <div
                  key={channel.name}
                  className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg ${channel.bgColor}`}>
                      <channel.icon className={`h-5 w-5 ${channel.color}`} />
                    </div>
                    <div>
                      <p className="font-medium">{channel.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {channel.enabled ? "Active" : "Inactive"}
                      </p>
                    </div>
                  </div>
                  <Badge
                    variant={channel.enabled ? "default" : "secondary"}
                    className={channel.enabled ? "bg-green-500/10 text-green-500 hover:bg-green-500/20" : ""}
                  >
                    {channel.enabled ? "Enabled" : "Disabled"}
                  </Badge>
                </div>
              ))}
            </CardContent>
          </Card>
        </motion.div>

        {/* Performance Metrics */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5 }}
        >
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Performance Metrics</CardTitle>
                  <CardDescription>Service health indicators</CardDescription>
                </div>
                <Button size="sm" variant="outline" onClick={onRefresh}>
                  <RefreshCw className="h-4 w-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Success Rate */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium">Success Rate</span>
                  <span className="text-muted-foreground">{successRate.toFixed(1)}%</span>
                </div>
                <Progress value={successRate} className="h-2" />
              </div>

              {/* Cache Hit Rate */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium">Cache Hit Rate</span>
                  <span className="text-muted-foreground">{cacheHitRate.toFixed(1)}%</span>
                </div>
                <Progress value={cacheHitRate} className="h-2" />
              </div>

              {/* Uptime */}
              <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium">Uptime</span>
                </div>
                <Badge variant="outline">{formatUptime(data.uptime)}</Badge>
              </div>

              {/* Redis Status */}
              <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                <div className="flex items-center gap-2">
                  <Bell className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium">Redis Cache</span>
                </div>
                <Badge
                  variant={data.health.redis ? "default" : "destructive"}
                  className={data.health.redis ? "bg-green-500/10 text-green-500 hover:bg-green-500/20" : ""}
                >
                  {data.health.redis ? "Connected" : "Disconnected"}
                </Badge>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Queue Overview */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.2 }}
      >
        <Card>
          <CardHeader>
            <CardTitle>Queue Status</CardTitle>
            <CardDescription>Current notification queue statistics</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-4 gap-4">
              <div className="text-center p-4 rounded-lg border">
                <p className="text-2xl font-bold text-yellow-500">{data.queue.waiting}</p>
                <p className="text-sm text-muted-foreground mt-1">Waiting</p>
              </div>
              <div className="text-center p-4 rounded-lg border">
                <p className="text-2xl font-bold text-blue-500">{data.queue.active}</p>
                <p className="text-sm text-muted-foreground mt-1">Active</p>
              </div>
              <div className="text-center p-4 rounded-lg border">
                <p className="text-2xl font-bold text-green-500">{data.queue.completed}</p>
                <p className="text-sm text-muted-foreground mt-1">Completed</p>
              </div>
              <div className="text-center p-4 rounded-lg border">
                <p className="text-2xl font-bold text-red-500">{data.queue.failed}</p>
                <p className="text-sm text-muted-foreground mt-1">Failed</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
