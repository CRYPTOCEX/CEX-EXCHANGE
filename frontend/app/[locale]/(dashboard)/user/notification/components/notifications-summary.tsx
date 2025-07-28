"use client";

import { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  CardFooter,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Sparkles,
  MessageSquare,
  AlertTriangle,
  CheckCircle,
  Clock,
  RefreshCw,
  Download,
  ThumbsUp,
  ThumbsDown,
  Share,
  Copy,
  DollarSign,
  Bell,
  User,
} from "lucide-react";
import { motion } from "framer-motion";
import { format } from "date-fns";
interface NotificationsSummaryProps {
  notifications: notificationAttributes[];
  isLoading: boolean;
}
export function NotificationsSummary({
  notifications,
  isLoading,
}: NotificationsSummaryProps) {
  const [summaryData, setSummaryData] = useState<any>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [activeTab, setActiveTab] = useState("summary");
  useEffect(() => {
    if (notifications.length > 0 && !summaryData) {
      generateSummary();
    }
  }, [notifications]);
  const generateSummary = async () => {
    setIsGenerating(true);

    // Simulate AI processing time
    await new Promise((resolve) => setTimeout(resolve, 1500));

    // Group notifications by type
    const byType = notifications.reduce(
      (acc, notification) => {
        if (!acc[notification.type]) {
          acc[notification.type] = [];
        }
        acc[notification.type].push(notification);
        return acc;
      },
      {} as Record<string, notificationAttributes[]>
    );

    // Count unread notifications
    const unreadCount = notifications.filter((n) => !n.read).length;

    // Find most recent notification
    const mostRecent = [...notifications].sort((a, b) => {
      const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return dateB - dateA;
    })[0];

    // Generate insights
    const insights = [
      unreadCount > 0
        ? `You have ${unreadCount} unread notifications that need your attention.`
        : "All notifications have been read. Great job staying on top of things!",
      byType.investment?.length > 0
        ? `There are ${byType.investment.length} investment notifications, which might require financial decisions.`
        : "",
      byType.alert?.length > 0
        ? `${byType.alert.length} alerts may need urgent attention.`
        : "",
      byType.message?.length > 0
        ? `You have ${byType.message.length} message notifications that might need responses.`
        : "",
    ].filter(Boolean);

    // Generate action items
    const actionItems = [
      unreadCount > 5 ? "Review and clear unread notifications" : "",
      byType.alert?.length > 0
        ? "Address alert notifications as they may be time-sensitive"
        : "",
      byType.message?.some((n) => !n.read) ? "Respond to unread messages" : "",
      byType.investment?.some((n) => !n.read)
        ? "Review investment notifications"
        : "",
    ].filter(Boolean);

    // Generate topics
    const topics = Object.entries(byType).map(([type, items]) => ({
      type,
      count: items.length,
      unread: items.filter((n) => !n.read).length,
      summary: `${items.length} ${type} notifications${items.filter((n) => !n.read).length > 0 ? ` (${items.filter((n) => !n.read).length} unread)` : ""}`,
    }));
    setSummaryData({
      overview: {
        total: notifications.length,
        unread: unreadCount,
        read: notifications.length - unreadCount,
        mostRecent: mostRecent
          ? {
              type: mostRecent.type,
              message: mostRecent.message,
              date: format(
                new Date(mostRecent.createdAt || Date.now()),
                "MMM d, yyyy h:mm a"
              ),
            }
          : null,
      },
      insights,
      actionItems,
      topics,
      generatedAt: new Date().toISOString(),
    });
    setIsGenerating(false);
  };
  if (isLoading || isGenerating) {
    return (
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <Skeleton className="h-8 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
          </CardHeader>
          <CardContent className="space-y-4">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card>
            <CardHeader>
              <Skeleton className="h-6 w-1/2" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-full mt-2" />
              <Skeleton className="h-4 w-3/4 mt-2" />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <Skeleton className="h-6 w-1/2" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-full mt-2" />
              <Skeleton className="h-4 w-3/4 mt-2" />
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }
  if (!summaryData) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-10">
          <Sparkles className="h-16 w-16 text-muted-foreground mb-4" />
          <h3 className="text-lg font-medium">No summary available</h3>
          <p className="text-sm text-muted-foreground mt-1 mb-4">
            Generate an AI summary of your notifications
          </p>
          <Button onClick={generateSummary}>
            <Sparkles className="mr-2 h-4 w-4" />
            Generate Summary
          </Button>
        </CardContent>
      </Card>
    );
  }
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="bg-primary/10 p-2 rounded-full">
            <Sparkles className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h2 className="text-xl font-bold">AI-Generated Summary</h2>
            <p className="text-sm text-muted-foreground">
              Last updated:{" "}
              {format(new Date(summaryData.generatedAt), "MMM d, yyyy h:mm a")}
            </p>
          </div>
        </div>

        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={generateSummary}
            className="gap-1"
          >
            <RefreshCw className="h-4 w-4" />
            <span>Refresh</span>
          </Button>

          <Button variant="outline" size="sm" className="gap-1">
            <Download className="h-4 w-4" />
            <span>Export</span>
          </Button>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid grid-cols-3 mb-4">
          <TabsTrigger value="summary" className="flex items-center gap-1">
            <Sparkles className="h-4 w-4" />
            <span>Summary</span>
          </TabsTrigger>
          <TabsTrigger value="insights" className="flex items-center gap-1">
            <MessageSquare className="h-4 w-4" />
            <span>Insights</span>
          </TabsTrigger>
          <TabsTrigger value="actions" className="flex items-center gap-1">
            <CheckCircle className="h-4 w-4" />
            <span>Actions</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="summary">
          <Card>
            <CardHeader>
              <CardTitle>Notification Summary</CardTitle>
              <CardDescription>
                AI-generated overview of your notifications
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <motion.div
                initial={{
                  opacity: 0,
                  y: 10,
                }}
                animate={{
                  opacity: 1,
                  y: 0,
                }}
                transition={{
                  duration: 0.4,
                }}
                className="p-4 bg-primary/5 rounded-lg border"
              >
                <p className="text-sm leading-relaxed">
                  You have a total of{" "}
                  <strong>{summaryData.overview.total} notifications</strong>,
                  with <strong>{summaryData.overview.unread} unread</strong> and{" "}
                  {summaryData.overview.read} read. Your most recent
                  notification is a {summaryData.overview.mostRecent.type}{" "}
                  notification received on{" "}
                  {summaryData.overview.mostRecent.date}.
                </p>

                <div className="mt-4 flex flex-wrap gap-2">
                  {summaryData.topics.map((topic: any) => (
                    <Badge
                      key={topic.type}
                      variant="outline"
                      className="bg-background"
                    >
                      {topic.summary}
                    </Badge>
                  ))}
                </div>
              </motion.div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {summaryData.topics
                  .slice(0, 3)
                  .map((topic: any, index: number) => {
                    return (
                      <motion.div
                        key={topic.type}
                        initial={{
                          opacity: 0,
                          y: 10,
                        }}
                        animate={{
                          opacity: 1,
                          y: 0,
                        }}
                        transition={{
                          duration: 0.4,
                          delay: index * 0.1,
                        }}
                        className="p-4 bg-card rounded-lg border shadow-sm"
                      >
                        <div className="flex items-center gap-2 mb-2">
                          <div
                            className={`p-2 rounded-full ${topic.type === "investment" ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300" : topic.type === "message" ? "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300" : topic.type === "alert" ? "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300" : topic.type === "system" ? "bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-300" : "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300"}`}
                          >
                            {topic.type === "investment" ? (
                              <DollarSign className="h-4 w-4" />
                            ) : topic.type === "message" ? (
                              <MessageSquare className="h-4 w-4" />
                            ) : topic.type === "alert" ? (
                              <AlertTriangle className="h-4 w-4" />
                            ) : topic.type === "system" ? (
                              <Bell className="h-4 w-4" />
                            ) : (
                              <User className="h-4 w-4" />
                            )}
                          </div>
                          <h3 className="font-medium capitalize">
                            {topic.type}
                          </h3>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {topic.count} notifications
                          {topic.unread > 0 && `, ${topic.unread} unread`}
                        </p>
                      </motion.div>
                    );
                  })}
              </div>
            </CardContent>
            <CardFooter className="flex justify-between border-t pt-4">
              <div className="flex gap-2">
                <Button variant="ghost" size="sm" className="gap-1">
                  <ThumbsUp className="h-4 w-4" />
                  <span>Helpful</span>
                </Button>
                <Button variant="ghost" size="sm" className="gap-1">
                  <ThumbsDown className="h-4 w-4" />
                  <span>Not Helpful</span>
                </Button>
              </div>
              <div className="flex gap-2">
                <Button variant="ghost" size="sm" className="gap-1">
                  <Share className="h-4 w-4" />
                  <span>Share</span>
                </Button>
                <Button variant="ghost" size="sm" className="gap-1">
                  <Copy className="h-4 w-4" />
                  <span>Copy</span>
                </Button>
              </div>
            </CardFooter>
          </Card>
        </TabsContent>

        <TabsContent value="insights">
          <Card>
            <CardHeader>
              <CardTitle>Key Insights</CardTitle>
              <CardDescription>
                Important patterns and observations
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="space-y-4">
                {summaryData.insights.map((insight: string, index: number) => (
                  <motion.li
                    key={index}
                    initial={{
                      opacity: 0,
                      x: -20,
                    }}
                    animate={{
                      opacity: 1,
                      x: 0,
                    }}
                    transition={{
                      duration: 0.4,
                      delay: index * 0.1,
                    }}
                    className="flex items-start gap-3 p-3 border rounded-lg"
                  >
                    <div className="bg-primary/10 p-2 rounded-full mt-0.5">
                      <Sparkles className="h-4 w-4 text-primary" />
                    </div>
                    <p className="text-sm">{insight}</p>
                  </motion.li>
                ))}
              </ul>
            </CardContent>
            <CardFooter className="border-t pt-4">
              <Button
                variant="outline"
                size="sm"
                onClick={generateSummary}
                className="gap-1"
              >
                <RefreshCw className="h-4 w-4" />
                <span>Regenerate Insights</span>
              </Button>
            </CardFooter>
          </Card>
        </TabsContent>

        <TabsContent value="actions">
          <Card>
            <CardHeader>
              <CardTitle>Recommended Actions</CardTitle>
              <CardDescription>
                Suggested next steps based on your notifications
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="space-y-4">
                {summaryData.actionItems.length > 0 ? (
                  summaryData.actionItems.map(
                    (action: string, index: number) => {
                      return (
                        <motion.li
                          key={index}
                          initial={{
                            opacity: 0,
                            x: -20,
                          }}
                          animate={{
                            opacity: 1,
                            x: 0,
                          }}
                          transition={{
                            duration: 0.4,
                            delay: index * 0.1,
                          }}
                          className="flex items-start gap-3 p-3 border rounded-lg"
                        >
                          <div className="bg-green-100 dark:bg-green-900/30 p-2 rounded-full mt-0.5">
                            <CheckCircle className="h-4 w-4 text-green-600 dark:text-green-400" />
                          </div>
                          <div className="flex-1">
                            <p className="text-sm font-medium">{action}</p>
                            <Button
                              variant="link"
                              size="sm"
                              className="h-auto p-0 text-xs text-muted-foreground"
                            >
                              Mark as done
                            </Button>
                          </div>
                        </motion.li>
                      );
                    }
                  )
                ) : (
                  <div className="flex flex-col items-center justify-center py-8 text-center">
                    <CheckCircle className="h-12 w-12 text-green-500 mb-2" />
                    <h3 className="text-lg font-medium">All caught up!</h3>
                    <p className="text-sm text-muted-foreground mt-1">
                      No action items needed at this time
                    </p>
                  </div>
                )}
              </ul>
            </CardContent>
            <CardFooter className="border-t pt-4 flex justify-between">
              <Button variant="outline" size="sm" className="gap-1">
                <Clock className="h-4 w-4" />
                <span>Snooze All</span>
              </Button>
              <Button variant="default" size="sm" className="gap-1">
                <CheckCircle className="h-4 w-4" />
                <span>Mark All Complete</span>
              </Button>
            </CardFooter>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
