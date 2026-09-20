"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Link } from "@/i18n/routing";
import { Edit, Eye, Pause, Play } from "lucide-react";
import { useTranslations } from "next-intl";

interface MyOffersProps {
  offers: any[];
  isLoading: boolean;
  error: string | null;
}

export function MyOffers({ offers, isLoading, error }: MyOffersProps) {
  const tCommon = useTranslations("common");

  if (isLoading) {
    return <MyOffersSkeleton />;
  }

  if (error) {
    return (
      <Card>
        <CardContent className="py-12">
          <div className="text-center text-red-500">
            {error}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!offers || offers.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{tCommon("my_offers")}</CardTitle>
        </CardHeader>
        <CardContent className="py-12">
          <div className="text-center">
            <p className="text-muted-foreground mb-4">
              {tCommon("you_dont_have_any_offers_yet")}
            </p>
            <Link href="/p2p/offer/create">
              <Button>{tCommon("create_your_first_offer")}</Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>{tCommon("my_offers")}</CardTitle>
        <Link href="/p2p/offer/create">
          <Button size="sm">{tCommon("create_offer")}</Button>
        </Link>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {offers.map((offer) => (
            <OfferCard key={offer.id} offer={offer} />
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function OfferCard({ offer }: { offer: any }) {
  const t = useTranslations("ext");
  const tCommon = useTranslations("common");

  const statusColor =
    offer.status === "ACTIVE"
      ? "bg-green-500/10 text-green-500 border-green-500/20"
      : offer.status === "PAUSED"
        ? "bg-amber-500/10 text-amber-500 border-amber-500/20"
        : "bg-gray-500/10 text-gray-500 border-gray-500/20";

  const statusIcon = offer.status === "ACTIVE" ? <Play className="h-3 w-3 mr-1" /> : <Pause className="h-3 w-3 mr-1" />;

  return (
    <div className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors">
      <div className="flex-1 space-y-2">
        <div className="flex items-center gap-2 flex-wrap">
          <Badge variant="outline" className="font-semibold">
            {offer.type}
          </Badge>
          <span className="text-lg font-medium">
            {offer.currency}
          </span>
          <Badge variant="outline" className={statusColor}>
            {statusIcon}
            {offer.status}
          </Badge>
        </div>

        <div className="text-sm text-muted-foreground space-y-1">
          <div className="flex gap-4 flex-wrap">
            <span>
              {tCommon("price")}: {(() => {
                const priceConfig = typeof offer.priceConfig === "string"
                  ? JSON.parse(offer.priceConfig)
                  : offer.priceConfig;
                const price = priceConfig?.finalPrice || priceConfig?.fixedPrice || offer.finalPrice || "N/A";
                const currency = offer.priceCurrency || priceConfig?.currency || "USD";
                return `${price} ${currency}`;
              })()}
            </span>
            <span>
              {tCommon("limit")}: {(() => {
                const amountConfig = typeof offer.amountConfig === "string"
                  ? JSON.parse(offer.amountConfig)
                  : offer.amountConfig;
                const priceCurrency = offer.priceCurrency ||
                  (typeof offer.priceConfig === "string"
                    ? JSON.parse(offer.priceConfig)
                    : offer.priceConfig)?.currency || "USD";
                return `${amountConfig?.min || 0} - ${amountConfig?.max || 0} ${priceCurrency}`;
              })()}
            </span>
          </div>

          {offer.paymentMethods && offer.paymentMethods.length > 0 && (
            <div className="flex items-center gap-2 flex-wrap">
              <span>{t("payment_methods")}:</span>
              {offer.paymentMethods.map((pm: any) => (
                <Badge key={pm.id} variant="secondary" className="text-xs">
                  {pm.name}
                </Badge>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2 ml-4">
        <Link href={`/p2p/offer/${offer.id}`}>
          <Button variant="outline" size="sm">
            <Eye className="h-4 w-4 mr-1" />
            {tCommon("view")}
          </Button>
        </Link>
        <Link href={`/p2p/offer/${offer.id}/edit`}>
          <Button variant="outline" size="sm">
            <Edit className="h-4 w-4 mr-1" />
            {tCommon("edit")}
          </Button>
        </Link>
      </div>
    </div>
  );
}

function MyOffersSkeleton() {
  return (
    <Card>
      <CardHeader>
        <Skeleton className="h-6 w-32" />
      </CardHeader>
      <CardContent className="space-y-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="flex items-center justify-between p-4 border rounded-lg">
            <div className="flex-1 space-y-2">
              <div className="flex items-center gap-2">
                <Skeleton className="h-5 w-16" />
                <Skeleton className="h-5 w-20" />
                <Skeleton className="h-5 w-20" />
              </div>
              <Skeleton className="h-4 w-64" />
              <Skeleton className="h-4 w-48" />
            </div>
            <div className="flex gap-2">
              <Skeleton className="h-9 w-20" />
              <Skeleton className="h-9 w-20" />
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
