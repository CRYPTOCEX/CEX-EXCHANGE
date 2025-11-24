import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { BadgeCheck, Star } from "lucide-react";
import { useTranslations } from "next-intl";

interface SellerInformationProps {
  seller: any;
}

export function SellerInformation({ seller }: SellerInformationProps) {
  const t = useTranslations("ext");
  if (!seller) {
    return null;
  }

  // Get display name from user data
  const displayName =
    `${seller.firstName || ""} ${seller.lastName || ""}`.trim() ||
    "Anonymous User";

  // Get initials for avatar fallback
  const getInitials = () => {
    if (seller.firstName && seller.lastName) {
      return `${seller.firstName[0]}${seller.lastName[0]}`.toUpperCase();
    }
    if (seller.firstName) return seller.firstName.substring(0, 2).toUpperCase();
    if (seller.lastName) return seller.lastName.substring(0, 2).toUpperCase();
    return "UN";
  };

  // Get user stats with fallbacks
  const stats = seller.stats || {
    totalTrades: 0,
    volume: 0,
    completionRate: 0,
    avgResponseTime: null,
    ratings: {
      communication: null,
      speed: null,
      trust: null,
      overall: null,
    },
  };

  // Format completion rate
  const completionRate = stats.completionRate || 0;

  // Format response time (in minutes)
  const responseTime =
    stats.avgResponseTime !== null ? Math.round(stats.avgResponseTime) : 5;

  // Format ratings with fallbacks
  const ratings = {
    communication: stats.ratings?.communication || 0,
    speed: stats.ratings?.speed || 0,
    trust: stats.ratings?.trust || 0,
    overall: stats.ratings?.overall || 0,
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-xl">{t("seller_information")}</CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="flex flex-col md:flex-row md:items-start">
          <div className="flex items-center mb-6 md:mb-0 md:mr-6">
            <Avatar className="h-16 w-16 mr-4 border-2 border-primary/20">
              <AvatarImage
                src={seller.avatar || "/placeholder.svg?height=64&width=64"}
                alt={displayName}
              />
              <AvatarFallback className="text-lg">
                {getInitials()}
              </AvatarFallback>
            </Avatar>
            <div>
              <div className="flex items-center">
                <h3 className="text-lg font-bold">{displayName}</h3>
                {seller.verificationLevel === "verified" && (
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <BadgeCheck className="h-5 w-5 ml-1 text-primary" />
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>{t("verified_seller")}</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                )}
              </div>
              <div className="flex items-center text-sm">
                <Star className="h-4 w-4 mr-1 text-yellow-500" />
                <span className="font-medium">{completionRate}%</span>
                <span className="mx-1 text-muted-foreground">•</span>
                <span className="text-muted-foreground">{stats.totalTrades} {t("trades")}</span>
              </div>
              <div className="mt-1">
                <Badge
                  variant="outline"
                  className="text-xs bg-green-50 dark:bg-green-950/20 text-green-700 dark:text-green-400 border-green-200 dark:border-green-900"
                >
                  {t("online_now")}
                </Badge>
              </div>
            </div>
          </div>

          <Separator className="my-4 md:hidden" />

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:ml-auto">
            <div className="text-center p-3 bg-muted/30 rounded-md">
              <p className="text-2xl font-bold">{stats.totalTrades}</p>
              <p className="text-xs text-muted-foreground">{t("Trades")}</p>
            </div>
            <div className="text-center p-3 bg-muted/30 rounded-md">
              <p className="text-2xl font-bold">{stats.volume.toFixed(2)}</p>
              <p className="text-xs text-muted-foreground">
                {t("volume_(btc)")}
              </p>
            </div>
            <div className="text-center p-3 bg-muted/30 rounded-md">
              <div className="flex items-center justify-center">
                <p className="text-2xl font-bold">{responseTime}</p>
                <p className="text-sm ml-1">min</p>
              </div>
              <p className="text-xs text-muted-foreground">
                {t("response_time")}
              </p>
            </div>
            <div className="text-center p-3 bg-muted/30 rounded-md">
              <div className="flex items-center justify-center">
                <p className="text-2xl font-bold">{completionRate}</p>
                <p className="text-sm ml-1">%</p>
              </div>
              <p className="text-xs text-muted-foreground">{t("Completion")}</p>
            </div>
          </div>
        </div>

        <Separator className="my-6" />

        <div className="space-y-4">
          <h3 className="text-sm font-medium">{t("seller_ratings")}</h3>
          <div className="space-y-3">
            <div className="flex items-center">
              <span className="text-sm w-32">{t("Communication")}</span>
              <Progress
                value={ratings.communication * 20}
                className="h-2 flex-1"
              />
              <span className="text-sm ml-2 w-8 text-right">
                {(ratings.communication * 20).toFixed(0)}%
              </span>
            </div>
            <div className="flex items-center">
              <span className="text-sm w-32">{t("Speed")}</span>
              <Progress value={ratings.speed * 20} className="h-2 flex-1" />
              <span className="text-sm ml-2 w-8 text-right">
                {(ratings.speed * 20).toFixed(0)}%
              </span>
            </div>
            <div className="flex items-center">
              <span className="text-sm w-32">{t("Trust")}</span>
              <Progress value={ratings.trust * 20} className="h-2 flex-1" />
              <span className="text-sm ml-2 w-8 text-right">
                {(ratings.trust * 20).toFixed(0)}%
              </span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
