"use client";

import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useRouter } from "@/i18n/routing";
import {
  Shield,
  Star,
  ArrowRight,
  Zap,
  Clock,
  CheckCircle,
  RefreshCw,
  AlertCircle,
} from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { motion } from "framer-motion";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Link } from "@/i18n/routing";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { $fetch } from "@/lib/api";

interface MatchingResultsProps {
  criteria: any;
  matches?: any[];
  onStartOver: () => void;
}

interface TradeOffer {
  id: string;
  type: "buy" | "sell";
  coin: string;
  price: number;
  minLimit: number;
  maxLimit: number;
  availableAmount: number;
  paymentMethods: string[];
  matchScore: number;
  trader: {
    id: string;
    name: string;
    avatar?: string;
    completedTrades: number;
    completionRate: number;
    verified: boolean;
    responseTime?: number;
  };
  benefits: string[];
  location: string;
  createdAt: string;
  updatedAt: string;
}

export function MatchingResults({
  criteria,
  matches = [],
  onStartOver,
}: MatchingResultsProps) {
  const { toast } = useToast();
  const router = useRouter();
  const [loading, setLoading] = useState<string | null>(null);
  const [isLoadingResults, setIsLoadingResults] = useState(
    matches.length === 0
  );
  const [matchingOffers, setMatchingOffers] = useState<TradeOffer[]>(matches);
  const [sortBy, setSortBy] = useState("match_score");
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  // Fetch matching offers from API
  const fetchMatches = async (showRefreshLoader = false) => {
    if (showRefreshLoader) {
      setRefreshing(true);
    } else {
      setIsLoadingResults(true);
    }
    setError(null);
    try {
      const { data, error: apiError } = await $fetch({
        url: "/api/p2p/guided-matching",
        method: "POST",
        body: criteria,
      });
      if (apiError) {
        throw new Error(apiError || "Failed to fetch matches");
      }
      if (data?.matches) {
        setMatchingOffers(data.matches);
      } else {
        setMatchingOffers([]);
      }
    } catch (err) {
      console.error("Error fetching matches:", err);
      setError(
        err instanceof Error
          ? err.message
          : "Failed to fetch matching offers. Please try again."
      );
      setMatchingOffers([]);
    } finally {
      setIsLoadingResults(false);
      setRefreshing(false);
    }
  };
  useEffect(() => {
    // If no matches were provided, fetch them from API
    if (matches.length === 0) {
      fetchMatches();
    }
  }, [criteria, matches.length]);
  const handleTrade = async (offerId: string) => {
    setLoading(offerId);
    setError(null);
    try {
      // Show loading state in toast
      toast({
        title: "Initiating trade...",
        description: "Please wait while we set up your trade.",
      });

      // Create trade via API
      const { data, error: apiError } = await $fetch({
        url: "/api/p2p/trade",
        method: "POST",
        body: {
          offerId,
          amount: criteria.amount,
          paymentMethod: criteria.paymentMethods?.[0] || null,
        },
      });
      if (apiError) {
        throw new Error(apiError || "Failed to create trade");
      }

      // Show success toast
      toast({
        title: "Trade created successfully",
        description: "Redirecting to trade details...",
      });

      // Redirect to trade details page
      router.push(`/p2p/trade/${data.id}`);
    } catch (err) {
      console.error("Error creating trade:", err);
      const errorMessage =
        err instanceof Error
          ? err.message
          : "Failed to create trade. Please try again.";
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
      setError(errorMessage);
    } finally {
      setLoading(null);
    }
  };
  const handleRefresh = () => {
    fetchMatches(true);
  };
  const handleSort = (value: string) => {
    setSortBy(value);
    const sortedOffers = [...matchingOffers];
    switch (value) {
      case "match_score":
        sortedOffers.sort((a, b) => b.matchScore - a.matchScore);
        break;
      case "price_asc":
        sortedOffers.sort((a, b) => a.price - b.price);
        break;
      case "price_desc":
        sortedOffers.sort((a, b) => b.price - a.price);
        break;
      case "rating_desc":
        sortedOffers.sort(
          (a, b) => b.trader.completionRate - a.trader.completionRate
        );
        break;
      case "amount_desc":
        sortedOffers.sort((a, b) => b.availableAmount - a.availableAmount);
        break;
      default:
        break;
    }
    setMatchingOffers(sortedOffers);
  };

  // Loading skeleton component
  const LoadingSkeleton = () => (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {[1, 2, 3, 4, 5, 6].map((i) => (
        <Card key={i} className="h-full">
          <CardContent className="p-5">
            <div className="flex items-center gap-3 mb-4">
              <Skeleton className="h-12 w-12 rounded-full" />
              <div className="space-y-2">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-3 w-32" />
              </div>
              <Skeleton className="h-6 w-16 ml-auto" />
            </div>
            <div className="grid grid-cols-3 gap-2 mb-4">
              <Skeleton className="h-16 rounded-lg" />
              <Skeleton className="h-16 rounded-lg" />
              <Skeleton className="h-16 rounded-lg" />
            </div>
            <div className="space-y-2 mb-4">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-3/4" />
            </div>
            <div className="flex justify-between items-center">
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-9 w-24" />
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
  if (isLoadingResults) {
    return (
      <div className="space-y-6">
        <div className="flex flex-col items-center justify-center py-12 space-y-4">
          <div className="h-12 w-12 animate-spin rounded-full border-b-2 border-primary"></div>
          <p className="text-lg font-medium">Finding your perfect matches...</p>
          <p className="text-sm text-muted-foreground">
            This may take a moment as we search for the best offers
          </p>
          <Progress
            value={Math.floor(Math.random() * 60) + 40}
            className="w-64 h-2 mt-2"
          />
        </div>
        <LoadingSkeleton />
      </div>
    );
  }
  if (error) {
    return (
      <div className="space-y-6">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
        <div className="flex flex-col items-center justify-center py-12 space-y-4">
          <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center">
            <AlertCircle className="h-8 w-8 text-muted-foreground" />
          </div>
          <h3 className="text-xl font-medium">Failed to Load Offers</h3>
          <p className="text-muted-foreground text-center max-w-md">
            We encountered an error while fetching matching offers. Please try
            again.
          </p>
          <div className="flex gap-2">
            <Button onClick={() => fetchMatches()} variant="outline">
              Try Again
            </Button>
            <Button onClick={onStartOver}>Start Over</Button>
          </div>
        </div>
      </div>
    );
  }
  if (matchingOffers.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 space-y-4">
        <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center">
          <AlertCircle className="h-8 w-8 text-muted-foreground" />
        </div>
        <h3 className="text-xl font-medium">No Matching Offers Found</h3>
        <p className="text-muted-foreground text-center max-w-md">
          We couldn't find any offers that match your criteria. Try adjusting
          your preferences or check back later.
        </p>
        <div className="flex gap-2">
          <Button onClick={handleRefresh} variant="outline">
            Refresh
          </Button>
          <Button onClick={onStartOver}>Start Over</Button>
        </div>
      </div>
    );
  }
  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h3 className="text-lg font-medium">
            We found {matchingOffers.length} matching offers for you
          </h3>
          <p className="text-sm text-muted-foreground">
            Based on your preferences, here are the best{" "}
            {criteria.tradeType === "buy" ? "sellers" : "buyers"} for{" "}
            {criteria.cryptocurrency}
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={refreshing}
            className="gap-1"
          >
            <RefreshCw
              className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`}
            />
            {refreshing ? "Refreshing..." : "Refresh"}
          </Button>
          <Select value={sortBy} onValueChange={handleSort}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Sort By" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="match_score">Best Match</SelectItem>
              <SelectItem value="price_asc">Price: Low to High</SelectItem>
              <SelectItem value="price_desc">Price: High to Low</SelectItem>
              <SelectItem value="rating_desc">Highest Rating</SelectItem>
              <SelectItem value="amount_desc">Largest Amount</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {refreshing && (
        <div className="flex items-center justify-center py-4">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <RefreshCw className="h-4 w-4 animate-spin" />
            Refreshing offers...
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {matchingOffers.map((offer, index) => {
          return (
            <motion.div
              key={offer.id}
              initial={{
                opacity: 0,
                y: 20,
              }}
              animate={{
                opacity: 1,
                y: 0,
              }}
              transition={{
                duration: 0.3,
                delay: index * 0.1,
              }}
            >
              <Card className="relative h-full border-primary/10 bg-card overflow-hidden">
                <div className="h-1 w-full bg-primary"></div>
                <CardContent className="p-5 flex flex-col h-full pt-6">
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex items-center gap-3">
                      <Avatar className="h-12 w-12 border-2 border-primary/10 ring-2 ring-background">
                        <AvatarImage
                          src={
                            offer.trader?.avatar ||
                            "/placeholder.svg?height=40&width=40"
                          }
                          alt={offer.trader?.name || "Trader"}
                        />
                        <AvatarFallback className="bg-primary/10">
                          {offer.trader?.name
                            ? offer.trader.name.charAt(0)
                            : "T"}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <div className="font-medium flex items-center text-lg">
                          {offer.trader?.name || "Trader"}
                          {offer.trader?.verified && (
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Shield className="h-4 w-4 ml-1 text-green-500 fill-green-500/20" />
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p>Verified Trader</p>
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          )}
                        </div>
                        <div className="text-xs text-muted-foreground flex items-center">
                          <div className="flex mr-1">
                            {[1, 2, 3, 4, 5].map((star) => (
                              <Star
                                key={star}
                                className={`h-3 w-3 ${star <= Math.floor((offer.trader?.completionRate || 0) / 20) ? "text-yellow-500 fill-yellow-500" : "text-muted-foreground"}`}
                              />
                            ))}
                          </div>
                          {offer.trader?.completedTrades || 0} trades •{" "}
                          {offer.trader?.completionRate || 0}%
                        </div>
                      </div>
                    </div>
                    <Badge className="bg-primary/10 text-primary border-primary/20 font-medium flex items-center gap-1 px-2.5 py-1">
                      <Zap className="h-3.5 w-3.5" />
                      {offer.matchScore}% Match
                    </Badge>
                  </div>

                  <div className="space-y-4 flex-1">
                    <div className="grid grid-cols-3 gap-2">
                      <div className="rounded-lg bg-muted/50 p-3 text-center">
                        <div className="text-xs text-muted-foreground mb-1">
                          Price
                        </div>
                        <div className="font-semibold">
                          ${offer.price.toLocaleString()}
                        </div>
                      </div>
                      <div className="rounded-lg bg-muted/50 p-3 text-center">
                        <div className="text-xs text-muted-foreground mb-1">
                          Amount
                        </div>
                        <div className="font-semibold">
                          {offer.availableAmount} {offer.coin}
                        </div>
                      </div>
                      <div className="rounded-lg bg-muted/50 p-3 text-center">
                        <div className="text-xs text-muted-foreground mb-1">
                          Limits
                        </div>
                        <div className="font-semibold">
                          ${offer.minLimit}-${offer.maxLimit}
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-1.5">
                      {offer.paymentMethods?.map(
                        (method: string, index: number) => (
                          <Badge
                            key={index}
                            variant="outline"
                            className="bg-primary/5 border-primary/20"
                          >
                            {method}
                          </Badge>
                        )
                      ) || <Badge variant="outline">No payment methods</Badge>}
                    </div>

                    <div className="pt-2">
                      <div className="text-sm font-medium mb-2">
                        Why this is a good match:
                      </div>
                      <div className="space-y-1.5">
                        {offer.benefits?.map(
                          (benefit: string, index: number) => (
                            <div
                              key={index}
                              className="flex items-center text-sm"
                            >
                              <div className="h-5 w-5 rounded-full bg-primary/10 flex items-center justify-center mr-2">
                                <CheckCircle className="h-3 w-3 text-primary" />
                              </div>
                              {benefit}
                            </div>
                          )
                        ) || (
                          <div className="flex items-center text-sm">
                            <div className="h-5 w-5 rounded-full bg-primary/10 flex items-center justify-center mr-2">
                              <CheckCircle className="h-3 w-3 text-primary" />
                            </div>
                            Good match for your criteria
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-between items-center mt-4 pt-4 border-t">
                    <div className="flex items-center text-xs text-muted-foreground">
                      <Clock className="h-3.5 w-3.5 mr-1.5 text-primary" />
                      Responds in ~{offer.trader?.responseTime || 5} min
                    </div>
                    <Button
                      onClick={() => handleTrade(offer.id)}
                      disabled={loading === offer.id}
                      className="gap-1.5 bg-primary hover:bg-primary/90"
                    >
                      {loading === offer.id ? "Processing..." : "Trade Now"}
                      <ArrowRight className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          );
        })}
      </div>

      <div className="flex justify-between pt-4">
        <Button variant="outline" onClick={onStartOver}>
          Start Over
        </Button>
        <Link href="/p2p/offer">
          <Button>Browse All Offers</Button>
        </Link>
      </div>
    </div>
  );
}
