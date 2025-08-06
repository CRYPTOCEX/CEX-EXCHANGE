"use client";

import { useEffect } from "react";
import { useAffiliateStore } from "@/store/affiliate/affiliate-store";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  ArrowLeft,
  User,
  DollarSign,
  Activity,
  Mail,
  Phone,
  Calendar,
  MapPin,
  AlertCircle,
} from "lucide-react";
import { Link } from "@/i18n/routing";
import { Progress } from "@/components/ui/progress";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { useParams } from "next/navigation";

interface AffiliateDetailClientProps {
  isModal?: boolean;
  onClose?: () => void;
  onUpdated?: () => void;
  affiliateId?: string;
}

export default function AffiliateDetailClient({ 
  isModal = false, 
  onClose, 
  onUpdated,
  affiliateId 
}: AffiliateDetailClientProps) {
  const params = useParams();
  const id = affiliateId || (params?.id as string);
  const {
    affiliateDetails: { affiliate, network, rewards, monthlyEarnings },
    loading,
    error,
    fetchAffiliateDetails,
  } = useAffiliateStore();
  useEffect(() => {
    fetchAffiliateDetails(id);
  }, [id, fetchAffiliateDetails]);

  // Get status badge color
  const getStatusColor = (status: string) => {
    switch (status) {
      case "active":
        return "bg-green-500/20 text-green-500 dark:bg-green-500/10 dark:text-green-400";
      case "pending":
        return "bg-yellow-500/20 text-yellow-500 dark:bg-yellow-500/10 dark:text-yellow-400";
      case "suspended":
        return "bg-red-500/20 text-red-500 dark:bg-red-500/10 dark:text-red-400";
      case "inactive":
        return "bg-gray-500/20 text-gray-500 dark:bg-gray-500/10 dark:text-gray-400";
      default:
        return "bg-gray-500/20 text-gray-500 dark:bg-gray-500/10 dark:text-gray-400";
    }
  };

  // Format currency
  const formatCurrency = (value: number | undefined | null): string => {
    if (value === undefined || value === null || isNaN(value)) {
      return "$0";
    }
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  // Safe number formatting function
  const formatNumber = (value: number | undefined | null): string => {
    if (value === undefined || value === null || isNaN(value)) {
      return "0";
    }
    return value.toLocaleString();
  };
  if (loading) {
    return (
      <div className={isModal ? "space-y-6" : "container mx-auto py-4 md:py-6 px-4 md:px-6 space-y-6"}>
        <div className="flex items-center gap-2">
          {!isModal && (
            <Link href="/admin/affiliate/referral">
              <Button variant="ghost" size="icon">
                <ArrowLeft className="h-4 w-4" />
              </Button>
            </Link>
          )}
          <Skeleton className="h-9 w-48" />
          <Skeleton className="h-6 w-20" />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 md:gap-6">
          {/* Profile Card Skeleton */}
          <Card className="md:col-span-1">
            <CardHeader>
              <Skeleton className="h-6 w-24" />
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-col items-center mb-6">
                <Skeleton className="w-24 h-24 rounded-full mb-4" />
                <Skeleton className="h-6 w-32 mb-1" />
                <Skeleton className="h-4 w-40" />
              </div>

              <div className="space-y-3">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="flex items-center gap-2">
                    <Skeleton className="h-4 w-4" />
                    <Skeleton className="h-4 w-full" />
                  </div>
                ))}
              </div>

              <div className="pt-4 border-t dark:border-gray-800">
                <Skeleton className="h-5 w-28 mb-2" />
                <Skeleton className="h-16 w-full" />
              </div>
            </CardContent>
          </Card>

          {/* Stats and Tabs Skeleton */}
          <div className="md:col-span-3 space-y-6">
            {/* Stats Cards Skeleton */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {[1, 2, 3].map((i) => (
                <Card key={i}>
                  <CardHeader className="pb-2">
                    <Skeleton className="h-4 w-24" />
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center">
                      <Skeleton className="h-5 w-5 mr-2" />
                      <Skeleton className="h-8 w-20" />
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Tabs Skeleton */}
            <div>
              <div className="border-b mb-4">
                <div className="flex space-x-2">
                  {["Performance", "Network", "Rewards"].map((tab) => (
                    <Skeleton key={tab} className="h-10 w-28" />
                  ))}
                </div>
              </div>

              {/* Tab Content Skeleton */}
              <div className="space-y-4">
                <Card>
                  <CardHeader>
                    <Skeleton className="h-6 w-40 mb-1" />
                    <Skeleton className="h-4 w-60" />
                  </CardHeader>
                  <CardContent>
                    <Skeleton className="h-[300px] w-full" />
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <Skeleton className="h-6 w-40" />
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {[1, 2, 3].map((i) => (
                      <div key={i}>
                        <div className="flex justify-between mb-1">
                          <Skeleton className="h-4 w-32" />
                          <Skeleton className="h-4 w-16" />
                        </div>
                        <Skeleton className="h-2 w-full" />
                      </div>
                    ))}
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }
  if (error) {
    return (
      <div className={isModal ? "space-y-6" : "container mx-auto py-4 md:py-6 px-4 md:px-6 space-y-6"}>
        <div className="flex items-center gap-2">
          {!isModal && (
            <Link href="/admin/affiliate/referral">
              <Button variant="ghost" size="icon">
                <ArrowLeft className="h-4 w-4" />
              </Button>
            </Link>
          )}
          <h1 className="text-2xl md:text-3xl font-bold">Error</h1>
        </div>
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error loading affiliate data</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
        <div className="flex justify-center">
          <Button onClick={() => fetchAffiliateDetails(id)}>Try Again</Button>
        </div>
      </div>
    );
  }
  if (!affiliate) {
    return (
      <div className={isModal ? "space-y-6" : "container mx-auto py-4 md:py-6 px-4 md:px-6 space-y-6"}>
        <div className="flex items-center gap-2">
          {!isModal && (
            <Link href="/admin/affiliate/referral">
              <Button variant="ghost" size="icon">
                <ArrowLeft className="h-4 w-4" />
              </Button>
            </Link>
          )}
          <h1 className="text-2xl md:text-3xl font-bold">
            Affiliate Not Found
          </h1>
        </div>
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>No data available</AlertTitle>
          <AlertDescription>
            The requested affiliate could not be found or has been deleted.
          </AlertDescription>
        </Alert>
        {!isModal && (
          <div className="flex justify-center">
            <Link href="/admin/affiliate/referral">
              <Button>
                Return to Affiliates
              </Button>
            </Link>
          </div>
        )}
      </div>
    );
  }
  return (
    <div className={isModal ? "space-y-6" : "container mx-auto py-4 md:py-6 px-4 md:px-6 space-y-6"}>
      <div className={isModal ? "px-6 py-4 mb-4 md:mb-6" : "flex flex-wrap items-center gap-2 mb-4 md:mb-6"}>
        <div className="flex flex-wrap items-center gap-2">
          {!isModal && (
            <Link href="/admin/affiliate/referral">
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <ArrowLeft className="h-4 w-4" />
                <span className="sr-only">Back</span>
              </Button>
            </Link>
          )}
          <h1 className="text-xl md:text-3xl font-bold truncate max-w-[200px] md:max-w-none">
            {affiliate.name}
          </h1>
          <Badge className={getStatusColor(affiliate.status)}>
            {affiliate.status.charAt(0).toUpperCase() + affiliate.status.slice(1)}
          </Badge>
        </div>
      </div>

      <div className={isModal ? "px-6 grid grid-cols-1 lg:grid-cols-4 gap-4 md:gap-6" : "grid grid-cols-1 md:grid-cols-4 gap-4 md:gap-6"}>
        <Card className="md:col-span-1">
          <CardHeader className="pb-2 md:pb-4">
            <CardTitle>Profile</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-col items-center mb-4 md:mb-6">
              <div className="w-20 h-20 md:w-24 md:h-24 rounded-full bg-primary/10 dark:bg-primary/20 flex items-center justify-center text-2xl md:text-3xl mb-3 md:mb-4">
                {affiliate.name.charAt(0)}
              </div>
              <h3 className="text-lg md:text-xl font-semibold text-center">
                {affiliate.name}
              </h3>
              <p className="text-sm text-muted-foreground text-center">
                Affiliate ID: {affiliate.id}
              </p>
            </div>

            <div className="space-y-3">
              <div className="flex items-center gap-2 text-sm md:text-base">
                <Mail className="h-4 w-4 flex-shrink-0 text-muted-foreground" />
                <span className="truncate">{affiliate.email}</span>
              </div>
              <div className="flex items-center gap-2 text-sm md:text-base">
                <Phone className="h-4 w-4 flex-shrink-0 text-muted-foreground" />
                <span>{affiliate.phone || "Not provided"}</span>
              </div>
              <div className="flex items-center gap-2 text-sm md:text-base">
                <MapPin className="h-4 w-4 flex-shrink-0 text-muted-foreground" />
                <span>{affiliate.location || "Not provided"}</span>
              </div>
              <div className="flex items-center gap-2 text-sm md:text-base">
                <Calendar className="h-4 w-4 flex-shrink-0 text-muted-foreground" />
                <span>
                  Joined {new Date(affiliate.joinDate).toLocaleDateString()}
                </span>
              </div>
            </div>

            <div className="pt-4 border-t dark:border-gray-800">
              <h4 className="font-medium mb-2 text-sm md:text-base">
                Referral Link
              </h4>
              <div className="p-2 bg-muted rounded text-xs md:text-sm break-all">
                https://example.com/ref/{affiliate.referralCode || affiliate.id}
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="md:col-span-3 space-y-4 md:space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 md:gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-xs md:text-sm font-medium text-muted-foreground">
                  Total Referrals
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center">
                  <User className="h-4 w-4 md:h-5 md:w-5 text-muted-foreground mr-2" />
                  <span className="text-xl md:text-2xl font-bold">
                    {affiliate.referrals}
                  </span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-xs md:text-sm font-medium text-muted-foreground">
                  Total Earnings
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center">
                  <DollarSign className="h-4 w-4 md:h-5 md:w-5 text-muted-foreground mr-2" />
                  <span className="text-xl md:text-2xl font-bold">
                    ${formatNumber(affiliate.earnings)}
                  </span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-xs md:text-sm font-medium text-muted-foreground">
                  Conversion Rate
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center">
                  <Activity className="h-4 w-4 md:h-5 md:w-5 text-muted-foreground mr-2" />
                  <span className="text-xl md:text-2xl font-bold">
                    {affiliate.conversionRate || "12.5"}%
                  </span>
                </div>
              </CardContent>
            </Card>
          </div>

          <Tabs defaultValue="performance" className="w-full">
            <TabsList className="grid grid-cols-3 mb-4 w-full">
              <TabsTrigger value="performance">Performance</TabsTrigger>
              <TabsTrigger value="network">Network</TabsTrigger>
              <TabsTrigger value="rewards">Rewards</TabsTrigger>
            </TabsList>

            <TabsContent value="performance" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Earnings History</CardTitle>
                  <CardDescription>
                    Monthly earnings for the last 6 months
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="h-[250px] md:h-[300px]">
                    {monthlyEarnings.length > 0 ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={monthlyEarnings}>
                          <XAxis
                            dataKey="month"
                            stroke="#888888"
                            fontSize={12}
                            tickLine={false}
                            axisLine={false}
                          />
                          <YAxis
                            stroke="#888888"
                            fontSize={12}
                            tickLine={false}
                            axisLine={false}
                            tickFormatter={(value) => formatCurrency(value)}
                          />
                          <Tooltip
                            formatter={(value: number) => [
                              formatCurrency(value),
                              "Earnings",
                            ]}
                            labelFormatter={(label) => `Month: ${label}`}
                            contentStyle={{
                              backgroundColor: "var(--background)",
                              borderColor: "var(--border)",
                              borderRadius: "0.375rem",
                            }}
                          />
                          <Line
                            type="monotone"
                            dataKey="earnings"
                            stroke="hsl(var(--primary))"
                            strokeWidth={2}
                            dot={{
                              r: 4,
                              strokeWidth: 2,
                              fill: "var(--background)",
                            }}
                            activeDot={{
                              r: 6,
                              strokeWidth: 2,
                            }}
                          />
                        </LineChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="flex items-center justify-center h-full">
                        <p className="text-muted-foreground">
                          No earnings data available
                        </p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Performance Metrics</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <div className="flex justify-between mb-1">
                      <span className="text-sm font-medium">
                        Conversion Rate
                      </span>
                      <span className="text-sm font-medium">
                        {affiliate.conversionRate || "12.5"}%
                      </span>
                    </div>
                    <Progress
                      value={affiliate.conversionRate || 12.5}
                      className="h-2"
                    />
                  </div>

                  <div>
                    <div className="flex justify-between mb-1">
                      <span className="text-sm font-medium">
                        Click-through Rate
                      </span>
                      <span className="text-sm font-medium">
                        {affiliate.ctr || "8.3"}%
                      </span>
                    </div>
                    <Progress value={affiliate.ctr || 8.3} className="h-2" />
                  </div>

                  <div>
                    <div className="flex justify-between mb-1">
                      <span className="text-sm font-medium">
                        Average Order Value
                      </span>
                      <span className="text-sm font-medium">
                        ${affiliate.aov || "125"}
                      </span>
                    </div>
                    <Progress
                      value={affiliate.aov || 125}
                      max={200}
                      className="h-2"
                    />
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="network" className="space-y-4">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <div>
                    <CardTitle>Referral Network</CardTitle>
                    <CardDescription>
                      Direct and indirect referrals
                    </CardDescription>
                  </div>
                </CardHeader>
                <CardContent>
                  {network.length === 0 ? (
                    <div className="text-center py-10 text-muted-foreground">
                      No referrals found for this affiliate.
                    </div>
                  ) : (
                    <div className="rounded-md border dark:border-gray-800 overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Name</TableHead>
                            <TableHead className="hidden md:table-cell">
                              Level
                            </TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead className="text-right hidden sm:table-cell">
                              Referrals
                            </TableHead>
                            <TableHead className="text-right">
                              Earnings
                            </TableHead>
                            <TableHead className="text-right hidden lg:table-cell">
                              Join Date
                            </TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {network.map((node) => {
                            return (
                              <TableRow key={node.id}>
                                <TableCell className="font-medium">
                                  <div className="flex items-center gap-2">
                                    <div className="w-8 h-8 rounded-full bg-primary/10 dark:bg-primary/20 flex items-center justify-center">
                                      {node.name.charAt(0)}
                                    </div>
                                    <div>
                                      <div className="truncate max-w-[120px] md:max-w-none">
                                        {node.name}
                                      </div>
                                      <div className="text-xs text-muted-foreground truncate max-w-[120px] md:max-w-none">
                                        {node.email}
                                      </div>
                                    </div>
                                  </div>
                                </TableCell>
                                <TableCell className="hidden md:table-cell">
                                  Level {node.level}
                                </TableCell>
                                <TableCell>
                                  <Badge
                                    className={getStatusColor(node.status)}
                                  >
                                    {node.status.charAt(0).toUpperCase() +
                                      node.status.slice(1)}
                                  </Badge>
                                </TableCell>
                                <TableCell className="text-right hidden sm:table-cell">
                                  {node.referrals}
                                </TableCell>
                                <TableCell className="text-right">
                                  ${formatNumber(node.earnings)}
                                </TableCell>
                                <TableCell className="text-right hidden lg:table-cell">
                                  {new Date(node.joinDate).toLocaleDateString()}
                                </TableCell>
                              </TableRow>
                            );
                          })}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="rewards" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Reward History</CardTitle>
                  <CardDescription>
                    Commissions and bonuses earned
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {rewards.length === 0 ? (
                    <div className="text-center py-10 text-muted-foreground">
                      No rewards found for this affiliate.
                    </div>
                  ) : (
                    <div className="rounded-md border dark:border-gray-800 overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Date</TableHead>
                            <TableHead className="hidden md:table-cell">
                              Type
                            </TableHead>
                            <TableHead className="hidden sm:table-cell">
                              Description
                            </TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead className="text-right">Amount</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {rewards.map((reward) => {
                            return (
                              <TableRow key={reward.id}>
                                <TableCell>
                                  {reward.createdAt
                                    ? new Date(
                                        reward.createdAt
                                      ).toLocaleDateString()
                                    : "-"}
                                </TableCell>
                                <TableCell className="hidden md:table-cell">
                                  {/* Type is not present in the type, so show Condition ID or "-" */}
                                  {reward.conditionId || "-"}
                                </TableCell>
                                <TableCell className="hidden sm:table-cell max-w-[200px] truncate">
                                  {/* Description is not present, so show Referrer ID or "-" */}
                                  {reward.referrerId || "-"}
                                </TableCell>
                                <TableCell>
                                  <Badge
                                    className={
                                      reward.isClaimed
                                        ? "bg-green-500/20 text-green-500 dark:bg-green-500/10 dark:text-green-400"
                                        : "bg-yellow-500/20 text-yellow-500 dark:bg-yellow-500/10 dark:text-yellow-400"
                                    }
                                  >
                                    {reward.isClaimed ? "Claimed" : "Pending"}
                                  </Badge>
                                </TableCell>
                                <TableCell className="text-right">
                                  ${formatNumber(reward.reward)}
                                </TableCell>
                              </TableRow>
                            );
                          })}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}
