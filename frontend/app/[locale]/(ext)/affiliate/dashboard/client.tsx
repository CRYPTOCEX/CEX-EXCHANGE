"use client";

import type React from "react";
import { useEffect, useState, useMemo, useCallback, useRef } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  ArrowUpRight,
  Copy,
  Share2,
  TrendingUp,
  Users,
  DollarSign,
  Gift,
  CheckCircle2,
  Clock,
  Calendar,
  X,
  AlertCircle,
  ArrowUpDown,
  RefreshCw,
  Mail,
  Twitter,
  Facebook,
  Linkedin,
  QrCode,
  Smartphone,
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Link } from "@/i18n/routing";
import { useConditionStore } from "@/store/affiliate/condition-store";
import { useAffiliateStore } from "@/store/affiliate/affiliate-store";
import { toast } from "sonner";
import { motion } from "framer-motion";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogClose,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { QRCodeCanvas } from "qrcode.react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  Area,
  AreaChart,
} from "recharts";
import { useUserStore } from "@/store/user";
import { useConfigStore } from "@/store/config";
import KycRequiredNotice from "@/components/blocks/kyc/kyc-required-notice";
import { useLocale } from "next-intl";

// Define chart data types
interface ReferralChartItem {
  name: string;
  referrals: number;
}
interface EarningsChartItem {
  month: string;
  earnings: number;
}
interface RewardSourceItem {
  name: string;
  value: number;
  color: string;
}
export default function AffiliateDashboardClient() {
  const { user, hasKyc, canAccessFeature } = useUserStore();
  const { settings } = useConfigStore();
  const { conditions, fetchConditions } = useConditionStore();
  const locale = useLocale();
  const {
    dashboardData: { referrals, rewards, monthlyEarnings, stats },
    loading,
    error: dashboardError,
    fetchDashboardData,
    dashboardData,
  } = useAffiliateStore();
  const [referralLink, setReferralLink] = useState("");
  useEffect(() => {
    if (user?.id) {
      const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || window.location.origin;
      setReferralLink(
        `${baseUrl}/${locale}/register?ref=${user.id}`
      );
    }
  }, [user?.id, locale]);
  const [isLoading, setIsLoading] = useState(true);
  const [errors, setErrors] = useState<string[]>([]);
  const [chartPeriod, setChartPeriod] = useState("6m");
  const [showQRCode, setShowQRCode] = useState(false);
  
  // Add cleanup ref to prevent memory leaks
  const isMountedRef = useRef(true);
  
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      // Clear accumulated errors on unmount to prevent memory leaks
      setErrors([]);
    };
  }, []);
  const fetchAllData = useCallback(async () => {
    if (!isMountedRef.current) return; // Prevent state updates if unmounted
    
    setIsLoading(true);
    setErrors([]);
    const newErrors: string[] = [];
    try {
      // Fetch data sequentially to better handle errors
      try {
        await fetchConditions();
      } catch (error) {
        console.error("Error fetching conditions:", error);
        if (isMountedRef.current) { // Check if still mounted before updating state
          newErrors.push("Failed to load affiliate programs");
        }
      }
      try {
        await fetchDashboardData(chartPeriod);
      } catch (error) {
        console.error("Error fetching dashboard data:", error);
        if (isMountedRef.current) { // Check if still mounted before updating state
          newErrors.push("Failed to load dashboard data");
        }
      }
      if (dashboardError && isMountedRef.current) {
        newErrors.push(`Dashboard error: ${dashboardError}`);
      }
    } catch (error) {
      console.error("General error fetching data:", error);
      if (isMountedRef.current) { // Check if still mounted before updating state
        newErrors.push("Failed to load dashboard data");
      }
    } finally {
      if (isMountedRef.current) { // Only update state if component is still mounted
        // Limit error array size to prevent memory accumulation
        const limitedErrors = newErrors.slice(0, 5);
        setErrors(limitedErrors);
        setIsLoading(false);
      }
    }
  }, [chartPeriod, fetchConditions, fetchDashboardData, dashboardError]); // Added missing dependencies

  useEffect(() => {
    fetchAllData();
  }, [fetchAllData]); // Fixed dependency

  // Fetch data when period changes - removed duplicate effect since fetchAllData already handles chartPeriod
  useEffect(() => {
    if (chartPeriod) {
      fetchDashboardData(chartPeriod);
    }
  }, [chartPeriod, fetchDashboardData]); // Added missing dependency
  const copyReferralLink = () => {
    navigator.clipboard.writeText(referralLink);
    toast.success("Referral link copied to clipboard!");
  };

  // Share functions with security validation
  const validateReferralLink = (link: string): boolean => {
    if (!link || !link.trim()) return false;
    
    try {
      const url = new URL(link);
      // Only allow our own domain and HTTPS protocol
      const allowedHosts = [
        new URL(process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000').hostname,
        'localhost'
      ];
      
      return (url.protocol === 'https:' || url.protocol === 'http:') && 
             allowedHosts.includes(url.hostname);
    } catch {
      return false;
    }
  };
  
  const shareViaEmail = () => {
    if (!validateReferralLink(referralLink)) {
      toast.error("Invalid referral link - cannot share");
      return;
    }
    
    const subject = encodeURIComponent("Join me on our platform");
    const body = encodeURIComponent(
      `Hey, I thought you might be interested in this platform. Use my referral link to sign up: ${referralLink}`
    );
    
    try {
      window.open(`mailto:?subject=${subject}&body=${body}`, "_blank");
      toast.success("Email client opened");
    } catch (error) {
      console.error("Error opening email client:", error);
      toast.error("Failed to open email client");
    }
  };
  
  const shareViaSMS = () => {
    if (!validateReferralLink(referralLink)) {
      toast.error("Invalid referral link - cannot share");
      return;
    }
    
    const message = encodeURIComponent(
      `Join me on our platform using my referral link: ${referralLink}`
    );
    
    // Check if device supports SMS links
    if (/Android|iPhone|iPad|iPod/i.test(navigator.userAgent)) {
      try {
        window.open(`sms:?&body=${message}`, "_blank");
        toast.success("SMS app opened");
      } catch (error) {
        console.error("Error opening SMS app:", error);
        toast.error("Failed to open SMS app");
      }
    } else {
      toast.error("SMS sharing is only available on mobile devices");
    }
  };
  
  const shareViaSocial = (platform: string) => {
    if (!validateReferralLink(referralLink)) {
      toast.error("Invalid referral link - cannot share");
      return;
    }
    
    // Validate platform parameter to prevent injection
    const allowedPlatforms = ['twitter', 'facebook', 'linkedin'];
    if (!allowedPlatforms.includes(platform)) {
      toast.error("Unsupported sharing platform");
      return;
    }
    
    const text = encodeURIComponent(
      "Join me on this amazing platform using my referral link!"
    );
    const url = encodeURIComponent(referralLink);
    let shareUrl = "";
    
    switch (platform) {
      case "twitter":
        shareUrl = `https://twitter.com/intent/tweet?text=${text}&url=${url}`;
        break;
      case "facebook":
        shareUrl = `https://www.facebook.com/sharer/sharer.php?u=${url}`;
        break;
      case "linkedin":
        shareUrl = `https://www.linkedin.com/sharing/share-offsite/?url=${url}`;
        break;
    }
    
    if (shareUrl) {
      try {
        window.open(shareUrl, "_blank", "width=600,height=400,noopener,noreferrer");
        toast.success(`Shared on ${platform}`);
      } catch (error) {
        console.error(`Error sharing on ${platform}:`, error);
        toast.error(`Failed to open ${platform} sharing`);
      }
    }
  };

  // Process monthly earnings data for the chart
  const processedMonthlyEarnings = useMemo((): EarningsChartItem[] => {
    if (!Array.isArray(monthlyEarnings) || monthlyEarnings.length === 0) {
      return generateEmptyMonthlyData();
    }
    return monthlyEarnings.map((item) => {
      // Handle different month formats
      let month = item.month;
      if (month.includes("-")) {
        // Format like "2025-03" to "Mar 2025"
        const [year, monthNum] = month.split("-");
        const date = new Date(
          Number.parseInt(year),
          Number.parseInt(monthNum) - 1,
          1
        );
        month = date.toLocaleDateString("en-US", {
          month: "short",
          year: "numeric",
        });
      }
      return {
        month,
        earnings: item.earnings || 0,
      };
    });
  }, [monthlyEarnings]);

  // Generate empty monthly data if none exists
  function generateEmptyMonthlyData(): EarningsChartItem[] {
    const data: EarningsChartItem[] = [];
    const today = new Date();
    for (let i = 6; i >= 0; i--) {
      const date = new Date();
      date.setMonth(today.getMonth() - i);
      data.push({
        month: date.toLocaleDateString("en-US", {
          month: "short",
          year: "numeric",
        }),
        earnings: 0,
      });
    }
    return data;
  }

  // Process referrals data for the chart
  const referralsChartData = useMemo((): ReferralChartItem[] => {
    // If no referrals, create empty chart data with months
    if (!Array.isArray(referrals) || referrals.length === 0) {
      const data: ReferralChartItem[] = [];
      const today = new Date();
      for (let i = 6; i >= 0; i--) {
        const date = new Date();
        date.setMonth(today.getMonth() - i);
        data.push({
          name: date.toLocaleDateString("en-US", {
            month: "short",
            year: "numeric",
          }),
          referrals: 0,
        });
      }
      return data;
    }

    // Group referrals by month
    const referralsByMonth: Record<string, number> = {};
    for (const referral of referrals) {
      if (!referral.createdAt) {
        continue;
      }
      const date = new Date(referral.createdAt);
      const monthYear = date.toLocaleDateString("en-US", {
        month: "short",
        year: "numeric",
      });
      if (!referralsByMonth[monthYear]) {
        referralsByMonth[monthYear] = 0;
      }
      referralsByMonth[monthYear]++;
    }

    // Convert to chart format with explicit number type
    return Object.entries(referralsByMonth).map(
      ([month, count]): ReferralChartItem => ({
        name: month,
        referrals: count,
      })
    );
  }, [referrals]);

  // Process rewards data for the pie chart
  const rewardSourceData = useMemo((): RewardSourceItem[] => {
    if (!Array.isArray(rewards) || rewards.length === 0) {
      return [
        {
          name: "No Rewards Yet",
          value: 100,
          color: "#94a3b8",
        },
      ];
    }

    // Group rewards by type
    const rewardsByType: Record<string, number> = {};
    for (const reward of rewards) {
      // Get condition name or use reward type if available
      const type = reward.condition?.name || "Unknown";
      if (!rewardsByType[type]) {
        rewardsByType[type] = 0;
      }
      rewardsByType[type] += reward.reward || 0;
    }

    // Calculate total for percentages
    const total = Object.values(rewardsByType).reduce(
      (sum, amount) => sum + amount,
      0
    );

    // If total is 0, return a placeholder
    if (total === 0) {
      return [
        {
          name: "No Rewards Yet",
          value: 100,
          color: "#94a3b8",
        },
      ];
    }

    // Define colors for each type
    const typeColors: Record<string, string> = {
      DEPOSIT: "#6366f1",
      TRADE: "#22c55e",
      STAKING: "#f97316",
      STAKING_LOYALTY: "#8b5cf6",
      P2P_TRADE: "#ea580c",
      ICO_CONTRIBUTION: "#d946ef",
      Unknown: "#94a3b8",
    };

    // Convert to chart format with percentages
    return Object.entries(rewardsByType).map(([type, amount]) => ({
      name: type
        .replace(/_/g, " ")
        .toLowerCase()
        .replace(/\b\w/g, (l) => l.toUpperCase()),
      value: Math.round((amount / total) * 100),
      color: typeColors[type] || "#8884d8",
    }));
  }, [rewards]);

  // Custom tooltip for earnings chart
  const EarningsTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-background border rounded-md shadow-md p-3">
          <p className="font-medium text-sm">{label}</p>
          <p className="text-lg font-bold text-primary">
            ${payload[0].value.toFixed(3)}
          </p>
        </div>
      );
    }
    return null;
  };

  // Custom tooltip for referrals chart
  const ReferralsTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-background border rounded-md shadow-md p-3">
          <p className="font-medium text-sm">{label}</p>
          <p className="text-lg font-bold text-primary">
            {payload[0].value} referrals
          </p>
        </div>
      );
    }
    return null;
  };

  // Custom tooltip for pie chart
  const PieTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-background border rounded-md shadow-md p-3">
          <p className="font-medium text-sm">{payload[0].name}</p>
          <p className="text-lg font-bold text-primary">{payload[0].value}%</p>
        </div>
      );
    }
    return null;
  };

  // Generate a gradient background based on the condition type
  const getGradient = (conditionName: string) => {
    switch (conditionName) {
      case "DEPOSIT":
        return "from-blue-500/10 to-blue-600/10 border-blue-500/20";
      case "TRADE":
        return "from-purple-500/10 to-purple-600/10 border-purple-500/20";
      case "STAKING":
      case "STAKING_LOYALTY":
        return "from-green-500/10 to-green-600/10 border-green-500/20";
      case "P2P_TRADE":
        return "from-amber-500/10 to-amber-600/10 border-amber-500/20";
      case "ICO_CONTRIBUTION":
        return "from-pink-500/10 to-pink-600/10 border-pink-500/20";
      default:
        return "from-primary/10 to-primary/5 border-primary/20";
    }
  };

  // Check if there's any data to display in charts
  const hasReferralData = referralsChartData.some((item) => item.referrals > 0);
  const hasEarningsData = processedMonthlyEarnings.some(
    (item) => item.earnings > 0
  );

  // KYC status & feature check
  const kycEnabled = settings?.kycStatus === true || settings?.kycStatus === "true";
  const hasAffiliateAccess = hasKyc() && canAccessFeature("affiliate_mlm");
  if (kycEnabled && !hasAffiliateAccess) {
    return <KycRequiredNotice feature="affiliate_mlm" />;
  }
  if (isLoading || loading) {
    return (
      <div className="flex items-center justify-center h-[50vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }
  return (
    <div className="w-full px-3 sm:px-4 lg:px-6 py-4 sm:py-6 max-w-7xl mx-auto">
      <div className="flex flex-col gap-3 mb-6 sm:mb-8">
        <div className="text-center sm:text-left">
          <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
            Affiliate Dashboard
          </h1>
          <p className="text-sm sm:text-base text-muted-foreground mt-1">
            Track your performance and earnings in real-time
          </p>
        </div>
      </div>

      {/* Display errors if any */}
      {errors.length > 0 && (
        <Alert variant="destructive" className="mb-6">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error loading some data</AlertTitle>
          <AlertDescription>
            <ul className="list-disc pl-5 mt-2">
              {errors.map((error, index) => (
                <li key={index}>{error}</li>
              ))}
            </ul>
          </AlertDescription>
        </Alert>
      )}

      {/* Referral Link Card */}
      <Card className="mb-6 sm:mb-8 bg-gradient-to-r from-indigo-500/10 to-purple-500/10 border-indigo-200/50 dark:border-indigo-800/50">
        <CardHeader className="p-4 sm:p-6">
          <CardTitle className="text-base sm:text-lg lg:text-xl flex items-center gap-2">
            <Share2 className="h-4 w-4 sm:h-5 sm:w-5" />
            Your Referral Link
          </CardTitle>
          <CardDescription className="text-sm">
            Share this link to start earning rewards
          </CardDescription>
        </CardHeader>
        <CardContent className="p-4 sm:p-6 pt-0">
          <div className="flex flex-col lg:flex-row gap-3 lg:gap-4">
            {/* Input with Copy Icon */}
            <div className="relative flex-1">
              <div className="bg-background border rounded-lg pr-12 pl-3 py-3 w-full text-xs sm:text-sm font-mono break-all">
                {referralLink}
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={copyReferralLink}
                className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8 p-0 hover:bg-muted"
              >
                <Copy className="h-4 w-4" />
              </Button>
            </div>

            {/* Share Button with Dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  className="lg:w-auto w-full bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white"
                >
                  <Share2 className="h-4 w-4 mr-2 flex-shrink-0" />
                  <span className="truncate">Share</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuItem
                  onClick={() => shareViaSocial("twitter")}
                  className="cursor-pointer"
                >
                  <Twitter className="h-4 w-4 mr-2" />
                  <span>Twitter</span>
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => shareViaSocial("facebook")}
                  className="cursor-pointer"
                >
                  <Facebook className="h-4 w-4 mr-2" />
                  <span>Facebook</span>
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => shareViaSocial("linkedin")}
                  className="cursor-pointer"
                >
                  <Linkedin className="h-4 w-4 mr-2" />
                  <span>LinkedIn</span>
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={shareViaEmail}
                  className="cursor-pointer"
                >
                  <Mail className="h-4 w-4 mr-2" />
                  <span>Email</span>
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={shareViaSMS}
                  className="cursor-pointer"
                >
                  <Smartphone className="h-4 w-4 mr-2" />
                  <span>SMS</span>
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={(e) => {
                    e.preventDefault();
                    setShowQRCode(true);
                  }}
                  className="cursor-pointer"
                >
                  <QrCode className="h-4 w-4 mr-2" />
                  <span>QR Code</span>
                </DropdownMenuItem>

                {/* QR Code Dialog - Separate from dropdown to prevent auto-closing */}
                <Dialog open={showQRCode} onOpenChange={setShowQRCode}>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Share via QR Code</DialogTitle>
                      <DialogDescription>
                        Scan this QR code to access your referral link
                      </DialogDescription>
                    </DialogHeader>
                    <div className="flex flex-col items-center justify-center p-4">
                      {referralLink && referralLink.trim() ? (
                        <>
                          <QRCodeCanvas 
                            value={referralLink} 
                            size={200}
                            level="M"
                            includeMargin={true}
                          />
                          <p className="mt-4 text-sm text-muted-foreground text-center">
                            You can save this image or show it directly to others
                          </p>
                        </>
                      ) : (
                        <div className="flex flex-col items-center justify-center h-48 w-48 border-2 border-dashed border-gray-300 rounded-lg">
                          <AlertCircle className="h-8 w-8 text-gray-400 mb-2" />
                          <p className="text-sm text-gray-500 text-center">
                            Unable to generate QR code.<br />
                            Referral link not available.
                          </p>
                        </div>
                      )}
                    </div>
                    <div className="flex justify-center">
                      <Button
                        onClick={() => {
                          if (!referralLink || !referralLink.trim()) {
                            toast.error("Cannot download QR code: Referral link not available");
                            return;
                          }
                          
                          const canvas = document.querySelector("canvas");
                          if (canvas) {
                            try {
                              const link = document.createElement("a");
                              link.download = "referral-qrcode.png";
                              link.href = canvas.toDataURL("image/png");
                              link.click();
                              toast.success("QR code downloaded");
                            } catch (error) {
                              console.error("Error downloading QR code:", error);
                              toast.error("Failed to download QR code");
                            }
                          } else {
                            toast.error("QR code not available for download");
                          }
                        }}
                        className="mr-2"
                      >
                        Download QR
                      </Button>
                      <DialogClose asChild>
                        <Button variant="outline">Close</Button>
                      </DialogClose>
                    </div>
                  </DialogContent>
                </Dialog>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </CardContent>
      </Card>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 xs:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 lg:gap-6 mb-6 sm:mb-8">
        <StatsCard
          title="Total Referrals"
          value={stats?.totalReferrals.toString() || "0"}
          description="All-time referred users"
          icon={<Users className="h-5 w-5 text-indigo-500" />}
          trend={
            dashboardData.previousStats
              ? calculateTrend(
                  stats.totalReferrals,
                  dashboardData.previousStats.totalReferrals
                )
              : stats.weeklyGrowth
          }
          trendLabel="vs last period"
        />

        <StatsCard
          title="Active Referrals"
          value={stats?.activeReferrals.toString() || "0"}
          description="Currently active users"
          icon={<CheckCircle2 className="h-5 w-5 text-green-500" />}
          trend={
            dashboardData.previousStats
              ? calculateTrend(
                  stats.activeReferrals,
                  dashboardData.previousStats.activeReferrals
                )
              : 0
          }
          trendLabel="vs last period"
        />

        <StatsCard
          title="Pending Referrals"
          value={stats?.pendingReferrals.toString() || "0"}
          description="Awaiting activation"
          icon={<Clock className="h-5 w-5 text-amber-500" />}
          trend={
            dashboardData.previousStats
              ? calculateTrend(
                  stats.pendingReferrals,
                  dashboardData.previousStats.pendingReferrals
                )
              : 0
          }
          trendLabel="vs last period"
        />

        <StatsCard
          title="Conversion Rate"
          value={`${stats?.conversionRate || 0}%`}
          description="Pending to active conversion"
          icon={<TrendingUp className="h-5 w-5 text-blue-500" />}
          trend={
            dashboardData.previousStats
              ? calculateTrend(
                  stats.conversionRate,
                  dashboardData.previousStats.conversionRate
                )
              : 0
          }
          trendLabel="vs last period"
        />
      </div>

      {/* Performance Tabs */}
      <Tabs defaultValue="earnings" className="mb-6 sm:mb-8">
        <div className="flex flex-col gap-3 mb-4">
          <div className="flex flex-col xs:flex-row justify-between items-start xs:items-center gap-3">
            <TabsList className="w-full xs:w-auto grid grid-cols-3 xs:flex">
              <TabsTrigger value="earnings" className="text-xs sm:text-sm">
                Earnings
              </TabsTrigger>
              <TabsTrigger value="referrals" className="text-xs sm:text-sm">
                Referrals
              </TabsTrigger>
              <TabsTrigger value="sources" className="text-xs sm:text-sm">
                Sources
              </TabsTrigger>
            </TabsList>

            <div className="flex gap-1 sm:gap-2 w-full xs:w-auto justify-center xs:justify-end">
              <Button
                variant="outline"
                size="sm"
                className={`text-xs px-2 sm:px-3 h-8 flex-1 xs:flex-none ${chartPeriod === "1m" ? "bg-muted" : ""}`}
                onClick={() => setChartPeriod("1m")}
              >
                1M
              </Button>
              <Button
                variant="outline"
                size="sm"
                className={`text-xs px-2 sm:px-3 h-8 flex-1 xs:flex-none ${chartPeriod === "3m" ? "bg-muted" : ""}`}
                onClick={() => setChartPeriod("3m")}
              >
                3M
              </Button>
              <Button
                variant="outline"
                size="sm"
                className={`text-xs px-2 sm:px-3 h-8 flex-1 xs:flex-none ${chartPeriod === "6m" ? "bg-muted" : ""}`}
                onClick={() => setChartPeriod("6m")}
              >
                6M
              </Button>
              <Button
                variant="outline"
                size="sm"
                className={`text-xs px-2 sm:px-3 h-8 flex-1 xs:flex-none ${chartPeriod === "1y" ? "bg-muted" : ""}`}
                onClick={() => setChartPeriod("1y")}
              >
                1Y
              </Button>
            </div>
          </div>
        </div>

        <TabsContent value="earnings" className="space-y-4 mt-0">
          <Card>
            <CardHeader className="p-4 sm:p-6 pb-2">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                <div>
                  <CardTitle className="text-base sm:text-lg font-medium">
                    Earnings Over Time
                  </CardTitle>
                  <CardDescription className="text-sm">
                    Your earnings for the past{" "}
                    {chartPeriod === "1m"
                      ? "month"
                      : chartPeriod === "3m"
                        ? "3 months"
                        : chartPeriod === "6m"
                          ? "6 months"
                          : "year"}
                  </CardDescription>
                </div>
                <Badge
                  variant="outline"
                  className="font-normal text-xs sm:text-sm"
                >
                  <DollarSign className="h-3 w-3 sm:h-3.5 sm:w-3.5 mr-1" />
                  <span className="hidden xs:inline">Total: </span>$
                  {stats?.totalEarnings.toFixed(3) || "0.000"}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="p-4 sm:p-6 pt-2">
              <div className="h-48 sm:h-60 lg:h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart
                    data={processedMonthlyEarnings}
                    margin={{
                      top: 20,
                      right: 30,
                      left: 20,
                      bottom: 10,
                    }}
                  >
                    <CartesianGrid
                      strokeDasharray="3 3"
                      vertical={false}
                      stroke="var(--border)"
                      opacity={0.2}
                    />
                    <XAxis
                      dataKey="month"
                      axisLine={false}
                      tickLine={false}
                      tick={{
                        fill: "var(--muted-foreground)",
                        fontSize: 12,
                      }}
                      dy={10}
                    />
                    <YAxis
                      axisLine={false}
                      tickLine={false}
                      tick={{
                        fill: "var(--muted-foreground)",
                        fontSize: 12,
                      }}
                      tickFormatter={(value) => `$${value.toFixed(3)}`}
                      width={60}
                      domain={[0, "dataMax"]}
                      allowDecimals={true}
                    />
                    <Tooltip content={<EarningsTooltip />} />
                    <defs>
                      <linearGradient
                        id="earningsGradient"
                        x1="0"
                        y1="0"
                        x2="0"
                        y2="1"
                      >
                        <stop
                          offset="5%"
                          stopColor="#6366f1"
                          stopOpacity={0.8}
                        />
                        <stop
                          offset="95%"
                          stopColor="#6366f1"
                          stopOpacity={0}
                        />
                      </linearGradient>
                    </defs>
                    <Area
                      type="monotone"
                      dataKey="earnings"
                      stroke="#6366f1"
                      strokeWidth={2}
                      fillOpacity={1}
                      fill="url(#earningsGradient)"
                    />
                    {!hasEarningsData && (
                      <text
                        x="50%"
                        y="50%"
                        textAnchor="middle"
                        dominantBaseline="middle"
                        className="fill-muted-foreground"
                      >
                        No earnings data available yet
                      </text>
                    )}
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="referrals" className="space-y-4 mt-0">
          <Card>
            <CardHeader className="p-4 md:p-6 pb-2">
              <div className="flex justify-between items-center">
                <div>
                  <CardTitle className="text-base md:text-lg font-medium">
                    Referrals Over Time
                  </CardTitle>
                  <CardDescription>
                    Your referrals for the past{" "}
                    {chartPeriod === "1m"
                      ? "month"
                      : chartPeriod === "3m"
                        ? "3 months"
                        : chartPeriod === "6m"
                          ? "6 months"
                          : "year"}
                  </CardDescription>
                </div>
                <Badge variant="outline" className="font-normal">
                  <Users className="h-3.5 w-3.5 mr-1" />
                  Total: {stats?.totalReferrals || 0}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="p-4 md:p-6 pt-2">
              <div className="h-60 md:h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={referralsChartData}
                    margin={{
                      top: 20,
                      right: 30,
                      left: 20,
                      bottom: 10,
                    }}
                  >
                    <CartesianGrid
                      strokeDasharray="3 3"
                      vertical={false}
                      stroke="var(--border)"
                      opacity={0.2}
                    />
                    <XAxis
                      dataKey="name"
                      axisLine={false}
                      tickLine={false}
                      tick={{
                        fill: "var(--muted-foreground)",
                        fontSize: 12,
                      }}
                      dy={10}
                    />
                    <YAxis
                      axisLine={false}
                      tickLine={false}
                      tick={{
                        fill: "var(--muted-foreground)",
                        fontSize: 12,
                      }}
                      width={30}
                      domain={[0, "dataMax"]}
                      allowDecimals={false}
                    />
                    <Tooltip content={<ReferralsTooltip />} />
                    <Bar
                      dataKey="referrals"
                      fill="#6366f1"
                      radius={[4, 4, 0, 0]}
                      barSize={30}
                      animationDuration={1500}
                    />
                    {!hasReferralData && (
                      <text
                        x="50%"
                        y="50%"
                        textAnchor="middle"
                        dominantBaseline="middle"
                        className="fill-muted-foreground"
                      >
                        No referral data available yet
                      </text>
                    )}
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="sources" className="space-y-4 mt-0">
          <Card>
            <CardHeader className="p-4 md:p-6 pb-2">
              <div className="flex justify-between items-center">
                <div>
                  <CardTitle className="text-base md:text-lg font-medium">
                    Reward Sources
                  </CardTitle>
                  <CardDescription>
                    Distribution of your rewards by source
                  </CardDescription>
                </div>
                <Badge variant="outline" className="font-normal">
                  <Gift className="h-3.5 w-3.5 mr-1" />
                  {rewardSourceData.length}{" "}
                  {rewardSourceData.length === 1 ? "Source" : "Sources"}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="p-4 md:p-6 pt-2">
              <div className="h-60 md:h-80 flex justify-center">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={rewardSourceData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={100}
                      paddingAngle={2}
                      dataKey="value"
                      labelLine={false}
                      label={({
                        cx,
                        cy,
                        midAngle,
                        innerRadius,
                        outerRadius,
                        percent,
                        name,
                      }) => {
                        // Only show label if it's not "No Rewards Yet"
                        if (name === "No Rewards Yet") return null;
                        const radius =
                          innerRadius + (outerRadius - innerRadius) * 0.5;
                        const x =
                          cx + radius * Math.cos(-midAngle * (Math.PI / 180));
                        const y =
                          cy + radius * Math.sin(-midAngle * (Math.PI / 180));
                        return (
                          <text
                            x={x}
                            y={y}
                            fill="#fff"
                            textAnchor={x > cx ? "start" : "end"}
                            dominantBaseline="central"
                            className="text-xs font-medium"
                          >
                            {`${(percent * 100).toFixed(0)}%`}
                          </text>
                        );
                      }}
                    >
                      {rewardSourceData.map((entry, index) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={entry.color}
                          stroke="rgba(255,255,255,0.2)"
                          strokeWidth={1}
                        />
                      ))}
                    </Pie>
                    <Tooltip content={<PieTooltip />} />
                    <Legend
                      layout="vertical"
                      verticalAlign="middle"
                      align="right"
                      wrapperStyle={{
                        paddingLeft: 20,
                      }}
                      iconType="circle"
                      iconSize={10}
                    />
                    {rewardSourceData.length === 1 &&
                      rewardSourceData[0].name === "No Rewards Yet" && (
                        <text
                          x="50%"
                          y="50%"
                          textAnchor="middle"
                          dominantBaseline="middle"
                          className="fill-muted-foreground"
                        >
                          No reward data available yet
                        </text>
                      )}
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Recent Referrals */}
      <Card className="mb-6 md:mb-8">
        <CardHeader className="p-4 md:p-6">
          <div className="flex justify-between items-center">
            <CardTitle className="text-base md:text-lg font-medium">
              Recent Referrals
            </CardTitle>
              <Link
                href="/affiliate/referrals"
                className="flex items-center gap-1 text-xs md:text-sm"
              >
              <Button variant="outline" size="sm">
                View All
                <ArrowUpRight className="h-3 w-3 md:h-4 md:w-4" />
            </Button>
            </Link>
          </div>
        </CardHeader>
        <CardContent className="p-4 md:p-6 pt-0 md:pt-0">
          <div className="space-y-3 md:space-y-4">
            {Array.isArray(referrals) && referrals.length > 0 ? (
              referrals.slice(0, 5).map((referral, index) => (
                <motion.div
                  key={referral.id}
                  className="flex items-center justify-between p-2 md:p-3 rounded-lg hover:bg-muted/50 transition-colors"
                  initial={{
                    opacity: 0,
                    y: 10,
                  }}
                  animate={{
                    opacity: 1,
                    y: 0,
                  }}
                  transition={{
                    delay: index * 0.1,
                  }}
                >
                  <div className="flex items-center gap-2 md:gap-3">
                    <Avatar className="h-8 w-8 md:h-10 md:w-10">
                      <AvatarImage src={referral.referred?.avatar || ""} />
                      <AvatarFallback className="bg-gradient-to-br from-indigo-500 to-purple-600 text-white text-xs md:text-sm">
                        {referral.referred?.firstName?.charAt(0) || ""}
                        {referral.referred?.lastName?.charAt(0) || ""}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-medium text-sm md:text-base">
                        {referral.referred?.firstName}{" "}
                        {referral.referred?.lastName}
                      </p>
                      <p className="text-xs md:text-sm text-muted-foreground">
                        {referral.referred?.email}
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-col items-end">
                    <StatusBadge status={referral.status} />
                    <span className="text-xs text-muted-foreground flex items-center mt-1">
                      <Calendar className="h-3 w-3 mr-1" />
                      {new Date(referral.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                </motion.div>
              ))
            ) : (
              <div className="text-center py-4 text-muted-foreground">
                No referrals yet. Share your link to get started!
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Affiliate Conditions */}
      <Card className="mb-6 md:mb-8">
        <CardHeader className="p-4 md:p-6">
          <div className="flex justify-between items-center">
            <CardTitle className="text-base md:text-lg font-medium">
              Available Affiliate Programs
            </CardTitle>
              <Link
                href="/affiliate/conditions"
                className="flex items-center gap-1 text-xs md:text-sm"
              >
              <Button variant="outline" size="sm">
                View Details
                <ArrowUpRight className="h-3 w-3 md:h-4 md:w-4" />
            </Button>
            </Link>
          </div>
        </CardHeader>
        <CardContent className="p-4 md:p-6 pt-0 md:pt-0">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4">
            {Array.isArray(conditions) && conditions.length > 0 ? (
              conditions.slice(0, 3).map((condition) => {
                return (
                  <motion.div
                    key={condition.id}
                    whileHover={{
                      y: -5,
                      transition: {
                        duration: 0.2,
                      },
                    }}
                  >
                    <Card
                      className={`bg-gradient-to-br ${getGradient(condition.name)} hover:shadow-md transition-shadow h-full`}
                    >
                      <CardHeader className="p-3 md:p-4 pb-2">
                        <div className="flex justify-between items-start">
                          <CardTitle className="text-sm md:text-base">
                            {condition.title}
                          </CardTitle>
                          <Badge
                            variant={
                              condition.rewardType === "PERCENTAGE"
                                ? "default"
                                : "secondary"
                            }
                            className="text-xs"
                          >
                            {condition.rewardType === "PERCENTAGE" ? "%" : "$"}
                          </Badge>
                        </div>
                      </CardHeader>
                      <CardContent className="p-3 md:p-4 pt-0">
                        <p className="text-xs md:text-sm line-clamp-2">
                          {condition.description}
                        </p>
                        <div className="flex justify-between mt-2 text-xs md:text-sm">
                          <span className="text-muted-foreground">Reward:</span>
                          <span className="font-medium">
                            {condition.rewardType === "PERCENTAGE"
                              ? `${condition.reward}%`
                              : `${condition.reward} ${condition.rewardCurrency}`}
                          </span>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                );
              })
            ) : (
              <div className="col-span-1 sm:col-span-2 lg:col-span-3 text-center py-10 text-muted-foreground">
                No affiliate programs available yet.
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
function StatusBadge({ status }: { status: string }) {
  const getStatusIcon = () => {
    switch (status) {
      case "ACTIVE":
        return <CheckCircle2 className="h-3 w-3 mr-1" />;
      case "PENDING":
        return <Clock className="h-3 w-3 mr-1" />;
      case "REJECTED":
        return <X className="h-3 w-3 mr-1" />;
      default:
        return <AlertCircle className="h-3 w-3 mr-1" />;
    }
  };
  return (
    <Badge
      variant={
        status === "ACTIVE"
          ? "success"
          : status === "REJECTED"
            ? "destructive"
            : "secondary"
      }
      className="flex items-center px-1.5 py-0.5 text-xs"
    >
      {getStatusIcon()}
      <span>{status}</span>
    </Badge>
  );
}

// Update the StatsCard component to use real trend data
function StatsCard({
  title,
  value,
  description,
  icon,
  trend,
  trendLabel,
}: {
  title: string;
  value: string;
  description: string;
  icon: React.ReactNode;
  trend?: number;
  trendLabel?: string;
}) {
  return (
    <Card className="overflow-hidden">
      <CardContent className="p-4 sm:p-6">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <p className="text-xs sm:text-sm font-medium text-muted-foreground truncate">
              {title}
            </p>
            <p className="text-lg sm:text-xl lg:text-2xl font-bold mt-1 truncate">
              {value}
            </p>

            {trend !== undefined && (
              <div className="flex items-center gap-1 mt-1 flex-wrap">
                <div
                  className={`flex items-center ${trend >= 0 ? "text-green-500" : "text-red-500"}`}
                >
                  {trend >= 0 ? (
                    <TrendingUp className="h-3 w-3 mr-1 flex-shrink-0" />
                  ) : (
                    <ArrowUpDown className="h-3 w-3 mr-1 flex-shrink-0" />
                  )}
                  <span className="text-xs font-medium">
                    {trend >= 0 ? "+" : ""}
                    {trend}%
                  </span>
                </div>
                {trendLabel && (
                  <span className="text-xs text-muted-foreground hidden xs:inline">
                    {trendLabel}
                  </span>
                )}
              </div>
            )}

            <p className="text-xs sm:text-sm text-muted-foreground mt-1 line-clamp-2">
              {description}
            </p>
          </div>
          <div className="h-8 w-8 sm:h-10 sm:w-10 lg:h-12 lg:w-12 rounded-full bg-gradient-to-br from-indigo-500/20 to-purple-500/20 flex items-center justify-center flex-shrink-0">
            {icon}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// Add this function to calculate trend percentages
const calculateTrend = (current: number, previous: number): number => {
  if (previous === 0) {
    return current > 0 ? 100 : 0; // If previous was 0, and current is positive, that's a 100% increase
  }
  return Math.round(((current - previous) / previous) * 100 * 10) / 10; // Round to 1 decimal place
};
