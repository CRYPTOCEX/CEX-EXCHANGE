"use client";

import { CheckCircle, Clock, AlertTriangle } from "lucide-react";
import { memo } from "react";
import type { ActivityItem } from "../../types";

interface ActivityCardProps {
  activity: ActivityItem;
  index: number;
}

// Memoize the activity card to prevent unnecessary re-renders
export const ActivityCard = memo(function ActivityCard({
  activity,
  index,
}: ActivityCardProps) {
  const getStatusIcon = () => {
    switch (activity.status) {
      case "success":
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case "pending":
        return <Clock className="h-4 w-4 text-amber-500" />;
      case "failed":
        return <AlertTriangle className="h-4 w-4 text-red-500" />;
      default:
        return <Clock className="h-4 w-4 text-gray-500" />;
    }
  };

  const getStatusColor = () => {
    switch (activity.status) {
      case "success":
        return "bg-green-100 text-green-800";
      case "pending":
        return "bg-amber-100 text-amber-800";
      case "failed":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const formatRelativeTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (diffInSeconds < 60) return `${diffInSeconds} seconds ago`;
    if (diffInSeconds < 3600)
      return `${Math.floor(diffInSeconds / 60)} minutes ago`;
    if (diffInSeconds < 86400)
      return `${Math.floor(diffInSeconds / 3600)} hours ago`;
    if (diffInSeconds < 2592000)
      return `${Math.floor(diffInSeconds / 86400)} days ago`;
    return date.toLocaleDateString();
  };

  // Use CSS classes for animation instead of Framer Motion
  return (
    <div
      className={`flex items-center justify-between p-3 rounded-lg hover:bg-muted/50 transition-colors animate-fadeIn`}
      style={{ animationDelay: `${index * 50}ms` }}
    >
      <div className="flex items-center gap-3">
        <div className={`p-1.5 rounded-full ${getStatusColor()}`}>
          {getStatusIcon()}
        </div>
        <div>
          <div className="text-sm font-medium">{activity.description}</div>
          <div className="text-xs text-muted-foreground">
            {formatRelativeTime(activity.timestamp)}
          </div>
        </div>
      </div>
      {activity.details && (
        <div className="text-xs text-muted-foreground max-w-[120px] truncate">
          {activity.details}
        </div>
      )}
    </div>
  );
});
