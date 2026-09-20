"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Link } from "@/i18n/routing";
import { useTranslations } from "next-intl";

interface UserHistoryProps {
  dispute: any;
}

function getUserName(user: any): string {
  if (!user) return "Unknown User";
  if (user.firstName && user.lastName) return `${user.firstName} ${user.lastName}`;
  if (user.firstName) return user.firstName;
  if (user.email) return user.email.split("@")[0];
  return "Unknown User";
}

function StatusBadge({ status }: { status: string | undefined }) {
  const t = useTranslations("ext_admin");
  const tCommon = useTranslations("common");
  if (!status) {
    return (
      <Badge variant="outline" className="border-gray-200 bg-gray-100 text-gray-800 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300">
        N/A
      </Badge>
    );
  }

  const normalizedStatus = status.toLowerCase();
  if (normalizedStatus === "verified" || normalizedStatus === "active") {
    return (
      <Badge variant="outline" className="border-green-200 bg-green-100 text-green-800 dark:border-green-800 dark:bg-green-900/50 dark:text-green-300">
        {status}
      </Badge>
    );
  }
  if (normalizedStatus === "suspended" || normalizedStatus === "banned") {
    return (
      <Badge variant="outline" className="border-red-200 bg-red-100 text-red-800 dark:border-red-800 dark:bg-red-900/50 dark:text-red-300">
        {status}
      </Badge>
    );
  }
  return (
    <Badge variant="outline">
      {status}
    </Badge>
  );
}

export function UserHistory({ dispute }: UserHistoryProps) {
  const tCommon = useTranslations("common");

  const reportedBy = dispute?.reportedBy || {};
  const against = dispute?.against || {};

  return (
    <Card>
      <CardHeader>
        <CardTitle>{tCommon("user_history")}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Reporter */}
          <div>
            <h3 className="mb-2 text-sm font-medium flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-red-500" />
              {getUserName(reportedBy)}
            </h3>
            <div className="space-y-1.5 text-sm pl-4">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">{tCommon("disputes")}:</span>
                <span>{reportedBy.disputeCount ?? "N/A"}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">{tCommon("trades")}:</span>
                <span>{reportedBy.tradeCount ?? "N/A"}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">{tCommon("status")}:</span>
                <StatusBadge status={reportedBy.status} />
              </div>
              {reportedBy.id && (
                <Link
                  href={`/admin/crm/user/${reportedBy.id}`}
                  className="text-xs text-primary hover:underline block pt-1"
                >
                  {tCommon("view_full_profile_1")}
                </Link>
              )}
            </div>
          </div>

          <Separator />

          {/* Against */}
          <div>
            <h3 className="mb-2 text-sm font-medium flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-orange-500" />
              {getUserName(against)}
            </h3>
            <div className="space-y-1.5 text-sm pl-4">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">{tCommon("disputes")}:</span>
                <span>{against.disputeCount ?? "N/A"}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">{tCommon("trades")}:</span>
                <span>{against.tradeCount ?? "N/A"}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">{tCommon("status")}:</span>
                <StatusBadge status={against.status} />
              </div>
              {against.id && (
                <Link
                  href={`/admin/crm/user/${against.id}`}
                  className="text-xs text-primary hover:underline block pt-1"
                >
                  {tCommon("view_full_profile_1")}
                </Link>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
