"use client";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, FileEdit, Trash2, ArrowRight, User, Clock } from "lucide-react";
import { useTranslations } from "next-intl";

// Updated helper function for admin activity text formatting
export function getActivityText(activity: any) {
  // Use entityType if available; otherwise, fallback to type, or default to "activity"
  const displayType = activity.entityType || activity.type || "activity";
  const displayName = activity.entityName || "";

  switch (activity.action) {
    case "create":
      return `Created ${displayType}${displayName ? " " + displayName : ""}`;
    case "update":
      return `Updated ${displayType}${displayName ? " " + displayName : ""}`;
    case "delete":
      return `Deleted ${displayType}${displayName ? " " + displayName : ""}`;
    case "approve":
      return `Approved ${displayType}${displayName ? " " + displayName : ""}`;
    case "reject":
      return `Rejected ${displayType}${displayName ? " " + displayName : ""}`;
    case "distribute":
      return `Distributed ${displayType}${displayName ? " " + displayName : ""}`;
    default:
      return `Modified ${displayType}${displayName ? " " + displayName : ""}`;
  }
}

export function getActivityIcon(action: string) {
  switch (action) {
    case "create":
      return <Plus className="h-4 w-4" />;
    case "update":
      return <FileEdit className="h-4 w-4" />;
    case "delete":
      return <Trash2 className="h-4 w-4" />;
    case "approve":
    case "reject":
      return <User className="h-4 w-4" />;
    case "distribute":
      return <ArrowRight className="h-4 w-4" />;
    default:
      return <Clock className="h-4 w-4" />;
  }
}

export function getActivityColor(action: string) {
  switch (action) {
    case "create":
      return "text-green-500 bg-green-500/20";
    case "update":
      return "text-blue-500 bg-blue-500/20";
    case "delete":
      return "text-red-500 bg-red-500/20";
    case "approve":
      return "text-green-500 bg-green-500/20";
    case "reject":
      return "text-red-500 bg-red-500/20";
    case "distribute":
      return "text-purple-500 bg-purple-500/20";
    default:
      return "text-gray-500 bg-gray-500/20";
  }
}

export function formatTimeAgo(dateInput: string | Date) {
  // Always convert to a Date object
  const date = typeof dateInput === "string" ? new Date(dateInput) : dateInput;

  // If the date is invalid, handle gracefully
  if (isNaN(date.getTime())) {
    return "Invalid date";
  }

  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSecs = Math.floor(diffMs / 1000);
  const diffMins = Math.floor(diffSecs / 60);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffDays > 0) {
    return `${diffDays}d ago`;
  } else if (diffHours > 0) {
    return `${diffHours}h ago`;
  } else if (diffMins > 0) {
    return `${diffMins}m ago`;
  } else {
    return "Just now";
  }
}

interface AdminActivityListProps {
  adminActivities: any[];
  isLoading: boolean;
}

export default function AdminActivityList({
  adminActivities,
  isLoading,
}: AdminActivityListProps) {
  const t = useTranslations("ext");
  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("admin_activity")}</CardTitle>
        <CardDescription>
          {t("recent_actions_performed_by_administrators")}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex justify-center py-8">
            <div className="animate-pulse text-muted-foreground">
              {t("loading_activity_data")}.
            </div>
          </div>
        ) : adminActivities.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <Clock className="h-10 w-10 text-muted-foreground mb-2" />
            <h3 className="font-medium">{t("no_activity_yet")}</h3>
            <p className="text-sm text-muted-foreground mt-1">
              {t("admin_actions_will_appear_here")}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {adminActivities.map((activity) => (
              <div
                key={activity.id}
                className="flex items-start space-x-4 pb-4 border-b last:border-0 last:pb-0"
              >
                <div
                  className={`mt-0.5 h-8 w-8 rounded-full flex items-center justify-center ${getActivityColor(
                    activity.action
                  )}`}
                >
                  {getActivityIcon(activity.action)}
                </div>
                <div className="flex-1 space-y-1">
                  <div className="flex items-center justify-between">
                    <p className="font-medium">{getActivityText(activity)}</p>
                    <span className="text-xs text-muted-foreground">
                      {formatTimeAgo(activity.createdAt)}
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground flex items-center">
                    <User className="h-3 w-3 mr-1" />
                    {activity.user?.firstName} {activity.user?.lastName}
                  </p>
                </div>
              </div>
            ))}
            {/* <div className="flex justify-center pt-2">
              <Button variant="ghost" size="sm" className="text-xs">
                View All Activity
                <ArrowRight className="ml-1 h-3 w-3" />
              </Button>
            </div> */}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
