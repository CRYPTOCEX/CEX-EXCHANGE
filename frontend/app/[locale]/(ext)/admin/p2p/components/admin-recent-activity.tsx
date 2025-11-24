"use client";

import { useEffect } from "react";
import {
  Shield,
  User,
  BarChart2,
  AlertTriangle,
  CreditCard,
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { useAdminDashboardStore } from "@/store/p2p/admin-dashboard-store";
export function AdminRecentActivity() {
  const {
    recentActivity,
    isLoadingRecentActivity,
    recentActivityError,
    fetchRecentActivity,
  } = useAdminDashboardStore();
  useEffect(() => {
    fetchRecentActivity();
  }, [fetchRecentActivity]);
  if (isLoadingRecentActivity) {
    return (
      <div className="space-y-4">
        {Array.from({
          length: 5,
        }).map((_, i) => (
          <div key={i} className="flex items-start gap-4">
            <Skeleton className="h-10 w-10 rounded-full" />
            <div className="space-y-2">
              <Skeleton className="h-4 w-[250px]" />
              <Skeleton className="h-4 w-[200px]" />
            </div>
          </div>
        ))}
      </div>
    );
  }
  if (recentActivityError) {
    return (
      <div className="rounded-md bg-red-50 p-4">
        <div className="flex">
          <div className="flex-shrink-0">
            <AlertTriangle
              className="h-5 w-5 text-red-400"
              aria-hidden="true"
            />
          </div>
          <div className="ml-3">
            <h3 className="text-sm font-medium text-red-800">
              Error loading recent activity
            </h3>
            <div className="mt-2 text-sm text-red-700">
              <p>Please try refreshing the page.</p>
            </div>
          </div>
        </div>
      </div>
    );
  }
  if (!recentActivity || recentActivity.length === 0) {
    return <p className="text-muted-foreground">No recent activity found.</p>;
  }
  return (
    <div className="space-y-8">
      {recentActivity.map((activity) => {
        return (
          <div key={activity.id} className="flex items-start gap-4">
            <Avatar className="h-10 w-10 border">
              <AvatarImage
                src={activity.user?.avatar || "/placeholder.svg"}
                alt={activity.user?.firstName || "User"}
              />
              <AvatarFallback>
                {activity.user?.firstName?.slice(0, 1)}
              </AvatarFallback>
            </Avatar>
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="font-medium">{activity.title}</span>
                {activity.priority === "high" && (
                  <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-800">
                    High Priority
                  </span>
                )}
              </div>
              <p className="text-sm text-muted-foreground">
                {activity.description}
              </p>
              <p className="text-xs text-muted-foreground">
                {activity.createdAt}
              </p>
            </div>
            <div className="ml-auto">
              {activity.type === "dispute" && (
                <Shield className="h-5 w-5 text-red-500" />
              )}
              {activity.type === "user" && (
                <User className="h-5 w-5 text-blue-500" />
              )}
              {activity.type === "trade" && (
                <BarChart2 className="h-5 w-5 text-green-500" />
              )}
              {activity.type === "system" && (
                <AlertTriangle className="h-5 w-5 text-amber-500" />
              )}
              {activity.type === "payment" && (
                <CreditCard className="h-5 w-5 text-purple-500" />
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
