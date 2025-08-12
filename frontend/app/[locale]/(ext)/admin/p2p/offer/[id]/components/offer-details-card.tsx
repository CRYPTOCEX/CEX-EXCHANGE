"use client";

import {
  Clock,
  DollarSign,
  Globe,
  MessageSquare,
  Tag,
  User,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { useTranslations } from "next-intl";

interface OfferDetailsCardProps {
  offer: any;
}

export function OfferDetailsCard({ offer }: OfferDetailsCardProps) {
  const t = useTranslations("ext");
  return (
    <Card className="md:col-span-2">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>{t("offer_details")}</CardTitle>
            <CardDescription>
              {t("id")}
              {offer.id}
            </CardDescription>
          </div>
          <Badge
            variant={
              offer.status === "active"
                ? "default"
                : offer.status === "pending"
                  ? "outline"
                  : offer.status === "flagged"
                    ? "secondary"
                    : "destructive"
            }
            className="text-sm"
          >
            {offer.status.toUpperCase()}
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm">
              <Tag className="h-4 w-4 text-muted-foreground" />
              <span className="font-medium">{t("type")}</span>
              <Badge variant={offer.type === "BUY" ? "outline" : "secondary"}>
                {offer.type}
              </Badge>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <DollarSign className="h-4 w-4 text-muted-foreground" />
              <span className="font-medium">{t("crypto")}</span>
              <span>{offer.crypto}</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <DollarSign className="h-4 w-4 text-muted-foreground" />
              <span className="font-medium">{t("price")}</span>
              <span>{offer.price}</span>
              <span
                className={
                  offer.marketDiff.startsWith("+")
                    ? "text-green-600"
                    : "text-red-600"
                }
              >
                (
                {offer.marketDiff}
                )
              </span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <span className="font-medium">{t("time_limit")}</span>
              <span>{offer.timeLimit || "30 minutes"}</span>
            </div>
          </div>
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm">
              <DollarSign className="h-4 w-4 text-muted-foreground" />
              <span className="font-medium">{t("limits")}</span>
              <span>{offer.limits}</span>
            </div>
            <div className="flex items-start gap-2 text-sm">
              <MessageSquare className="h-4 w-4 text-muted-foreground" />
              <span className="font-medium">{t("payment_methods")}</span>
              <div className="flex flex-wrap gap-1">
                {offer.paymentMethods.map((method: string, index: number) => (
                  <Badge key={index} variant="outline" className="text-xs">
                    {method}
                  </Badge>
                ))}
              </div>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <Globe className="h-4 w-4 text-muted-foreground" />
              <span className="font-medium">{t("location")}</span>
              <span>{offer.location || "Global"}</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <User className="h-4 w-4 text-muted-foreground" />
              <span className="font-medium">{t("requirements")}</span>
              <span>{offer.userRequirements || "None"}</span>
            </div>
          </div>
        </div>

        <Separator className="my-4" />

        <div className="space-y-2">
          <h3 className="text-sm font-medium">{t("created_at")}</h3>
          <p className="text-sm">
            {new Date(offer.createdAt).toLocaleString()}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
