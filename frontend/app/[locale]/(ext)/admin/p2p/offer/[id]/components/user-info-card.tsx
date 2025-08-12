"use client";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useTranslations } from "next-intl";

interface UserInfoCardProps {
  user: any;
}

export function UserInfoCard({ user }: UserInfoCardProps) {
  const t = useTranslations("ext");
  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("user_information")}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex items-center gap-3">
          <Avatar className="h-10 w-10">
            <AvatarImage
              src={user.avatar || "/placeholder.svg"}
              alt={user.name}
            />
            <AvatarFallback>{user.initials}</AvatarFallback>
          </Avatar>
          <div>
            <p className="font-medium">{user.name}</p>
            <p className="text-sm text-muted-foreground">
              {user.email || "No email provided"}
            </p>
          </div>
        </div>

        <Separator className="my-4" />

        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div className="font-medium">{t("total_trades")}</div>
            <div>{user.trades}</div>
          </div>
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div className="font-medium">{t("successful_trades")}</div>
            <div>{user.successfulTrades || Math.floor(user.trades * 0.95)}</div>
          </div>
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div className="font-medium">{t("previous_disputes")}</div>
            <div>{user.previousDisputes || Math.floor(user.trades * 0.05)}</div>
          </div>
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div className="font-medium">{t("account_status")}</div>
            <div>
              <Badge variant="outline">
                {user.accountStatus || "VERIFIED"}
              </Badge>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div className="font-medium">{t("reputation")}</div>
            <div className="flex items-center">
              {user.reputation || "4.8"}
              / 5. 0
            </div>
          </div>
        </div>
      </CardContent>
      <CardFooter>
        <Button variant="outline" className="w-full" size="sm">
          {t("view_user_profile")}
        </Button>
      </CardFooter>
    </Card>
  );
}
