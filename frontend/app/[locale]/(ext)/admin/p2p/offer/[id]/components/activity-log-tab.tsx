"use client";

import { CheckCircle, Flag, Tag, XCircle } from "lucide-react";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useTranslations } from "next-intl";

interface ActivityLogTabProps {
  activityLog: any[];
}

export function ActivityLogTab({ activityLog }: ActivityLogTabProps) {
  const t = useTranslations("ext");
  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("activity_history")}</CardTitle>
        <CardDescription>
          {t("timeline_of_changes_to_this_offer")}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {activityLog && activityLog.length > 0 ? (
            activityLog.map((activity, index) => (
              <div key={index} className="flex gap-4">
                <div className="relative flex items-center justify-center">
                  <div
                    className={`h-8 w-8 rounded-full flex items-center justify-center
                    ${
                      activity.type === "create"
                        ? "bg-green-100"
                        : activity.type === "update"
                          ? "bg-blue-100"
                          : activity.type === "flag"
                            ? "bg-amber-100"
                            : "bg-gray-100"
                    }`}
                  >
                    {activity.type === "create" ? (
                      <CheckCircle className="h-4 w-4 text-green-600" />
                    ) : activity.type === "update" ? (
                      <Tag className="h-4 w-4 text-blue-600" />
                    ) : activity.type === "flag" ? (
                      <Flag className="h-4 w-4 text-amber-600" />
                    ) : (
                      <XCircle className="h-4 w-4 text-red-600" />
                    )}
                  </div>
                  {index < (activityLog?.length || 0) - 1 && (
                    <div className="absolute top-8 bottom-0 left-1/2 w-0.5 -ml-px bg-gray-200" />
                  )}
                </div>
                <div className="flex-1 pb-4">
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-medium">{activity.action}</h4>
                    <span className="text-xs text-muted-foreground">
                      {activity.timestamp}
                    </span>
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {activity.details}
                  </p>
                </div>
              </div>
            ))
          ) : (
            <p className="text-center text-muted-foreground">
              {t("no_activity_recorded_for_this_offer")}
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
