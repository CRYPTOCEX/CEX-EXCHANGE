"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { useTranslations } from "next-intl";

interface UserHistoryProps {
  dispute: any;
}

export function UserHistory({ dispute }: UserHistoryProps) {
  const t = useTranslations("ext");
  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("user_history")}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div>
            <h3 className="mb-1 text-sm font-medium">
              {dispute.reportedBy.name}
            </h3>
            <div className="space-y-2 text-sm">
              <p>
                <span className="font-medium">{t("previous_disputes")}</span>
                1:
              </p>
              <p>
                <span className="font-medium">{t("successful_trades")}</span>
                15
              </p>
              <p>
                <span className="font-medium">{t("account_status")}</span>{" "}
                <Badge
                  variant="outline"
                  className="border-green-200 bg-green-100 text-green-800"
                >
                  {t("Verified")}
                </Badge>
              </p>
            </div>
          </div>
          <Separator />
          <div>
            <h3 className="mb-1 text-sm font-medium">{dispute.against.name}</h3>
            <div className="space-y-2 text-sm">
              <p>
                <span className="font-medium">{t("previous_disputes")}</span>
                2
              </p>
              <p>
                <span className="font-medium">{t("successful_trades")}</span>
                28
              </p>
              <p>
                <span className="font-medium">{t("account_status")}</span>{" "}
                <Badge
                  variant="outline"
                  className="border-green-200 bg-green-100 text-green-800"
                >
                  {t("Verified")}
                </Badge>
              </p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
