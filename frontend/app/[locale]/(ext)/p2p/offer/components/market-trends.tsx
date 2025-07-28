"use client";

import { useEffect } from "react";
import { ArrowRight, TrendingUp, Users } from "lucide-react";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useP2PStore } from "@/store/p2p/p2p-store";
import { Button } from "@/components/ui/button";
import { Link } from "@/i18n/routing";
export function TrendingOffers() {
  const { offers, isLoadingOffers, fetchOffers } = useP2PStore();
  useEffect(() => {
    fetchOffers({
      limit: 4,
      sort: "popularity",
    });
  }, []);

  // If no offers and not loading, don't show
  if ((!offers || offers.length === 0) && !isLoadingOffers) {
    return null;
  }
  if (isLoadingOffers) {
    return (
      <Card className="w-full max-w-md">
        <CardContent className="p-6">
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <Skeleton className="h-6 w-32" />
              <Skeleton className="h-6 w-16" />
            </div>
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <Skeleton className="h-8 w-8 rounded-full" />
                  <Skeleton className="h-4 w-20" />
                </div>
                <div className="text-right">
                  <Skeleton className="h-4 w-16 mb-1" />
                  <Skeleton className="h-3 w-12" />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }
  return (
    <Card className="w-full max-w-md">
      <CardContent className="p-6">
        <div className="flex justify-between items-center mb-4">
          <h3 className="font-semibold text-lg flex items-center">
            <TrendingUp className="mr-2 h-5 w-5 text-primary" />
            Trending Offers
          </h3>
        </div>
        <div className="space-y-4">
          {offers.slice(0, 4).map((offer) => {
            return (
              <div key={offer.id} className="flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-medium">
                    {offer.currency?.substring(0, 1)}
                  </div>
                  <div>
                    <div className="font-medium capitalize">
                      {offer.tradeType === "buy" ? "Buy" : "Sell"}{" "}
                      {offer.currency}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {/* Payment Method Name or N/A */}
                      {offer.paymentMethods?.length > 0
                        ? offer.paymentMethods[0].name
                        : "N/A"}
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-medium">
                    {offer.priceConfig?.finalPrice ?? "-"} {offer.currency}
                  </div>
                  <div className="text-xs flex items-center justify-end text-muted-foreground">
                    <Users className="h-3 w-3 mr-1" />
                    {/* Use userRequirements.minCompletedTrades if available */}
                    {offer.userRequirements?.minCompletedTrades ?? 0} trades
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
      <CardFooter className="p-4 pt-0">
        <Link href="/p2p/offer" className="w-full">
          <Button variant="outline" className="w-full">
            View All Offers
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </Link>
      </CardFooter>
    </Card>
  );
}
