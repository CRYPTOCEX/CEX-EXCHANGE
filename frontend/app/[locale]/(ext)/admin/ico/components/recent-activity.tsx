"use client";

import { useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { format, formatDistanceToNow } from "date-fns";
import { motion } from "framer-motion";
import {
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Flag,
  PauseCircle,
  PlayCircle,
  Clock,
  ChevronDown,
  ChevronUp,
  RefreshCcw,
  Filter,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Link } from "@/i18n/routing";
interface RecentActivityProps {
  activities?: (icoAdminActivityAttributes & {
    admin: {
      // Use optional properties to support both API responses
      firstName?: string;
      lastName?: string;
      name?: string;
      avatar?: string | null;
    };
  })[];
}
type ActivityType =
  | "all"
  | "approval"
  | "rejection"
  | "flag"
  | "pause"
  | "resume";

// Helper functions to safely get admin initials and full name
const getAdminInitials = (admin) => {
  const fullName = admin.firstName
    ? `${admin.firstName} ${admin.lastName || ""}`
    : admin.name;
  return fullName
    ? fullName
        .split(" ")
        .map((n) => n[0])
        .join("")
    : "NA";
};
const getAdminFullName = (admin) => {
  return admin.firstName
    ? `${admin.firstName} ${admin.lastName || ""}`
    : admin.name || "NA";
};
export function RecentActivity({ activities = [] }: RecentActivityProps) {
  const [activeTab, setActiveTab] = useState<ActivityType>("all");
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [showCount, setShowCount] = useState(5);
  const filteredActivities = activities.filter(
    (activity) => activeTab === "all" || activity.type === activeTab
  );
  const getActivityIcon = (type: string) => {
    switch (type) {
      case "approval":
        return <CheckCircle2 className="h-5 w-5 text-green-500" />;
      case "rejection":
        return <XCircle className="h-5 w-5 text-red-500" />;
      case "flag":
        return <Flag className="h-5 w-5 text-amber-500" />;
      case "pause":
        return <PauseCircle className="h-5 w-5 text-blue-500" />;
      case "resume":
        return <PlayCircle className="h-5 w-5 text-emerald-500" />;
      default:
        return <AlertTriangle className="h-5 w-5 text-gray-500" />;
    }
  };
  const getActivityColor = (type: string) => {
    switch (type) {
      case "approval":
        return "bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800";
      case "rejection":
        return "bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800";
      case "flag":
        return "bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800";
      case "pause":
        return "bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800";
      case "resume":
        return "bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800";
      default:
        return "bg-gray-50 dark:bg-gray-900/20 border-gray-200 dark:border-gray-800";
    }
  };
  const getActivityLabel = (type: string) => {
    switch (type) {
      case "approval":
        return "Approved";
      case "rejection":
        return "Rejected";
      case "flag":
        return "Flagged";
      case "pause":
        return "Paused";
      case "resume":
        return "Resumed";
      default:
        return "Action";
    }
  };
  const getActivityVariant = (type: string) => {
    switch (type) {
      case "approval":
        return "success";
      case "rejection":
        return "destructive";
      case "flag":
        return "warning";
      case "pause":
        return "outline";
      case "resume":
        return "secondary";
      default:
        return "default";
    }
  };
  const toggleExpand = (id: string) => {
    setExpanded((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };
  const loadMore = () => {
    setShowCount((prev) => prev + 5);
  };
  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-xl font-bold">Recent Activity</CardTitle>
            <CardDescription>
              Latest admin actions on the platform
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" title="Refresh">
              <RefreshCcw className="h-4 w-4" />
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" title="Filter">
                  <Filter className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => setActiveTab("all")}>
                  All Activities
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setActiveTab("approval")}>
                  Approvals
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setActiveTab("rejection")}>
                  Rejections
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setActiveTab("flag")}>
                  Flags
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setActiveTab("pause")}>
                  Pauses
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setActiveTab("resume")}>
                  Resumes
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
        <Tabs
          value={activeTab}
          onValueChange={(value) => setActiveTab(value as ActivityType)}
          className="mt-2"
        >
          <TabsList className="grid grid-cols-6">
            <TabsTrigger value="all">All</TabsTrigger>
            <TabsTrigger value="approval">Approvals</TabsTrigger>
            <TabsTrigger value="rejection">Rejections</TabsTrigger>
            <TabsTrigger value="flag">Flags</TabsTrigger>
            <TabsTrigger value="pause">Pauses</TabsTrigger>
            <TabsTrigger value="resume">Resumes</TabsTrigger>
          </TabsList>
        </Tabs>
      </CardHeader>
      <CardContent className="p-0">
        {filteredActivities.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <Clock className="h-12 w-12 text-muted-foreground/50 mb-4" />
            <p className="text-muted-foreground font-medium">
              No recent activity to display
            </p>
            <p className="text-sm text-muted-foreground/70 mt-1">
              {activeTab !== "all"
                ? "Try changing your filter or"
                : "Check back later or"}{" "}
              view all activities
            </p>
            <Link href="/admin/activity">
              <Button variant="outline" className="mt-4">
                View Activity Log
              </Button>
            </Link>
          </div>
        ) : (
          <div className="divide-y">
            {filteredActivities.slice(0, showCount).map((activity) => {
              return (
                <motion.div
                  key={activity.id}
                  initial={{
                    opacity: 0,
                    y: 10,
                  }}
                  animate={{
                    opacity: 1,
                    y: 0,
                  }}
                  transition={{
                    duration: 0.3,
                  }}
                  className={`relative p-4 transition-all hover:bg-muted/50 ${expanded[activity.id] ? "bg-muted/30" : ""}`}
                >
                  <div className="flex items-start gap-4">
                    <div
                      className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${getActivityColor(activity.type)}`}
                    >
                      {getActivityIcon(activity.type)}
                    </div>
                    <div className="flex-1 space-y-1">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Badge
                            variant={getActivityVariant(activity.type) as any}
                          >
                            {getActivityLabel(activity.type)}
                          </Badge>
                          <span
                            className="text-xs text-muted-foreground cursor-help"
                            title={
                              activity.createdAt
                                ? format(new Date(activity.createdAt), "PPpp")
                                : "N/A"
                            }
                          >
                            {activity.createdAt
                              ? formatDistanceToNow(
                                  new Date(activity.createdAt),
                                  {
                                    addSuffix: true,
                                  }
                                )
                              : "N/A"}
                          </span>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => toggleExpand(activity.id)}
                        >
                          {expanded[activity.id] ? (
                            <ChevronUp className="h-4 w-4" />
                          ) : (
                            <ChevronDown className="h-4 w-4" />
                          )}
                        </Button>
                      </div>
                      <p className="font-medium">{activity.offeringName}</p>
                      <div className="flex items-center gap-2">
                        <Avatar className="h-6 w-6">
                          <AvatarImage
                            src={`/img/placeholder.svg`}
                            alt={getAdminFullName(activity.admin)}
                          />
                          <AvatarFallback>
                            {getAdminInitials(activity.admin)}
                          </AvatarFallback>
                        </Avatar>
                        <p className="text-sm text-muted-foreground">
                          {getAdminFullName(activity.admin)}
                        </p>
                      </div>
                      {expanded[activity.id] && (
                        <motion.div
                          initial={{
                            opacity: 0,
                            height: 0,
                          }}
                          animate={{
                            opacity: 1,
                            height: "auto",
                          }}
                          exit={{
                            opacity: 0,
                            height: 0,
                          }}
                          transition={{
                            duration: 0.2,
                          }}
                          className="mt-3 pt-3 border-t text-sm"
                        >
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <p className="text-muted-foreground mb-1">
                                Offering ID
                              </p>
                              <p className="font-mono text-xs bg-muted px-2 py-1 rounded inline-block">
                                {activity.offeringId}
                              </p>
                            </div>
                            <div>
                              <p className="text-muted-foreground mb-1">
                                Admin ID
                              </p>
                              <p className="font-mono text-xs bg-muted px-2 py-1 rounded inline-block">
                                {activity.adminId}
                              </p>
                            </div>
                            <div className="col-span-2">
                              <p className="text-muted-foreground mb-1">
                                Timestamp
                              </p>
                              <p className="font-mono text-xs">
                                {activity.createdAt
                                  ? format(
                                      new Date(activity.createdAt),
                                      "yyyy-MM-dd HH:mm:ss"
                                    )
                                  : "N/A"}
                              </p>
                            </div>
                          </div>
                          <div className="flex justify-end mt-3">
                            <Link
                              href={`/admin/ico/offer/${activity.offeringId}`}
                            >
                              <Button variant="outline" size="sm">
                                View Offering
                              </Button>
                            </Link>
                          </div>
                        </motion.div>
                      )}
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </CardContent>
      {filteredActivities.length > showCount && (
        <CardFooter className="flex justify-center p-4 border-t">
          <Button variant="outline" onClick={loadMore}>
            Load More
          </Button>
        </CardFooter>
      )}
    </Card>
  );
}
