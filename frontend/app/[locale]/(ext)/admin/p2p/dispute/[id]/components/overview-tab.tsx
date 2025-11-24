"use client";

import { AlertTriangle, CheckCircle, Clock } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Link } from "@/i18n/routing";
import { useTranslations } from "next-intl";

interface OverviewTabProps {
  dispute: any;
}

export function OverviewTab({ dispute }: OverviewTabProps) {
  const t = useTranslations("ext");
  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("dispute_information")}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="rounded-md border-2 border-red-200 bg-red-50 p-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="mt-0.5 h-5 w-5 text-red-600" />
            <div>
              <h3 className="font-medium text-red-800">
                {t("dispute_reason")}
              </h3>
              <p className="mt-1 text-red-800">{dispute.reason}</p>
            </div>
          </div>
        </div>

        <div className="mt-6">
          <h3 className="mb-2 font-medium">{t("dispute_details")}</h3>
          <p className="text-sm">
            {dispute.details ||
              "The buyer claims they have sent the payment but the seller has not confirmed receipt. The buyer has provided a screenshot of the bank transfer as evidence."}
          </p>
        </div>

        <Separator className="my-6" />

        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
          <div>
            <h3 className="mb-2 font-medium">{t("reported_by")}</h3>
            <div className="flex items-center gap-3">
              <Avatar className="h-12 w-12">
                <AvatarImage
                  src={dispute.reportedBy.avatar || "/placeholder.svg"}
                  alt={dispute.reportedBy.name}
                />
                <AvatarFallback>{dispute.reportedBy.initials}</AvatarFallback>
              </Avatar>
              <div>
                <p className="font-medium">{dispute.reportedBy.name}</p>
                <p className="text-sm text-muted-foreground">
                  {t("user_since_jan_2023")}
                </p>
                <Link
                  href={`/admin/users/${dispute.reportedBy.id || "123"}`}
                  className="text-sm text-primary hover:underline"
                >
                  {t("view_profile")}
                </Link>
              </div>
            </div>
          </div>

          <div>
            <h3 className="mb-2 font-medium">{t("Against")}</h3>
            <div className="flex items-center gap-3">
              <Avatar className="h-12 w-12">
                <AvatarImage
                  src={dispute.against.avatar || "/placeholder.svg"}
                  alt={dispute.against.name}
                />
                <AvatarFallback>{dispute.against.initials}</AvatarFallback>
              </Avatar>
              <div>
                <p className="font-medium">{dispute.against.name}</p>
                <p className="text-sm text-muted-foreground">
                  {t("user_since_mar_2022")}
                </p>
                <Link
                  href={`/admin/users/${dispute.against.id || "456"}`}
                  className="text-sm text-primary hover:underline"
                >
                  {t("view_profile")}
                </Link>
              </div>
            </div>
          </div>
        </div>

        <Separator className="my-6" />

        <div>
          <h3 className="mb-2 font-medium">{t("dispute_timeline")}</h3>
          <div className="space-y-4">
            <div className="flex gap-3">
              <div className="flex h-6 w-6 items-center justify-center rounded-full border border-red-200 bg-red-100">
                <AlertTriangle className="h-3 w-3 text-red-600" />
              </div>
              <div>
                <p className="text-sm font-medium">{t("dispute_filed")}</p>
                <p className="text-xs text-muted-foreground">
                  {dispute.filedOn}
                </p>
              </div>
            </div>
            {dispute.status === "in-progress" && (
              <div className="flex gap-3">
                <div className="flex h-6 w-6 items-center justify-center rounded-full border border-blue-200 bg-blue-100">
                  <Clock className="h-3 w-3 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm font-medium">
                    {t("admin_investigation_started")}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {t("jul_3_2023")}
                  </p>
                </div>
              </div>
            )}
            {dispute.status === "resolved" && (
              <>
                <div className="flex gap-3">
                  <div className="flex h-6 w-6 items-center justify-center rounded-full border border-blue-200 bg-blue-100">
                    <Clock className="h-3 w-3 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-sm font-medium">
                      {t("admin_investigation_started")}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {t("jul_3_2023")}
                    </p>
                  </div>
                </div>
                <div className="flex gap-3">
                  <div className="flex h-6 w-6 items-center justify-center rounded-full border border-green-200 bg-green-100">
                    <CheckCircle className="h-3 w-3 text-green-600" />
                  </div>
                  <div>
                    <p className="text-sm font-medium">
                      {t("dispute_resolved_for")}{" "}
                      {dispute.resolution?.outcome === "buyer"
                        ? "Buyer"
                        : dispute.resolution?.outcome === "seller"
                          ? "Seller"
                          : "Both Parties"}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {dispute.resolvedOn}
                    </p>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
