"use client";

import { useState, useEffect, useMemo } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { useRouter, usePathname } from "@/i18n/routing";
import { useTranslations } from "next-intl";
import { format, formatDistanceToNow, subDays, subMonths } from "date-fns";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { 
  User, 
  Mail, 
  Phone, 
  Calendar, 
  Clock,
  Shield,
  ShieldOff,
  CheckCircle,
  XCircle,
  Wallet, 
  CreditCard, 
  TrendingUp,
  TrendingDown,
  FileText,
  MessageCircle,
  AlertTriangle,
  Activity,
  Eye,
  ArrowLeft,
  DollarSign,
  Globe,
  Key,
  Smartphone,
  Archive,
  Settings,
  MapPin,
  BarChart3,
  ChevronDown,
  RefreshCw,
  Download,
  Filter,
  Search,
  Copy,
  ExternalLink,
  Edit,
  Ban,
  UserCheck,
  Zap,
  Target,
  Award,
  Star,
  Briefcase,
  PieChart,
  LineChart,
  Users,
} from "lucide-react";
import { $fetch } from "@/lib/api";
import { toast } from "sonner";
import { useExtensionChecker } from "@/lib/extensions";
import DataTable from "@/components/blocks/data-table";
import { PAGE_PADDING } from "@/app/[locale]/(dashboard)/theme-config";

// Import existing table columns
import { useColumns as useTransactionColumns } from "@/app/[locale]/(dashboard)/admin/finance/transaction/columns";
import { useAnalytics as useTransactionAnalytics } from "@/app/[locale]/(dashboard)/admin/finance/transaction/analytics";
import { useColumns as useWalletColumns } from "@/app/[locale]/(dashboard)/admin/finance/wallet/columns";
import { useColumns as useSupportColumns } from "@/app/[locale]/(dashboard)/admin/crm/support/columns";

// Import extension table columns
import { useColumns as useBinaryOrderColumns } from "@/app/[locale]/(dashboard)/admin/finance/order/binary/columns";
import { useColumns as useExchangeOrderColumns } from "@/app/[locale]/(dashboard)/admin/finance/order/exchange/columns";
import { useColumns as useFuturesOrderColumns } from "@/app/[locale]/(dashboard)/admin/finance/order/futures/columns";
import { useColumns as useEcosystemOrderColumns } from "@/app/[locale]/(dashboard)/admin/finance/order/ecosystem/columns";
import { useColumns as useInvestmentColumns } from "@/app/[locale]/(dashboard)/admin/finance/investment/history/columns";
import { useColumns as useIcoTransactionColumns } from "@/app/[locale]/(ext)/admin/ico/transaction/columns";
import { useColumns as useP2pOfferColumns } from "@/app/[locale]/(ext)/admin/p2p/offer/columns";
import { useColumns as useP2pTradeColumns } from "@/app/[locale]/(ext)/admin/p2p/trade/columns";
import { useColumns as useStakingPositionColumns } from "@/app/[locale]/(ext)/admin/staking/position/columns";
import { useColumns as useAffiliateReferralColumns } from "@/app/[locale]/(ext)/admin/affiliate/referral/columns";
import { useColumns as useEcommerceOrderColumns } from "@/app/[locale]/(ext)/admin/ecommerce/order/columns";
import { useColumns as useForexTransactionColumns } from "@/app/[locale]/(ext)/forex/transaction/columns";

interface UserData {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  avatar?: string;
  status: "ACTIVE" | "INACTIVE" | "SUSPENDED" | "BANNED";
  role: {
    id: number;
    name: string;
  };
  emailVerified: boolean;
  phoneVerified: boolean;
  lastLogin?: string;
  failedLoginAttempts: number;
  kyc?: {
    id: string;
    status: string;
    reviewedAt?: string;
    createdAt: string;
    data?: any;
    adminNotes?: string;
  };
  twoFactor?: {
    enabled: boolean;
    type: string;
    createdAt: string;
  };
  notifications?: Array<{
    id: string;
    type: string;
    title: string;
    message: string;
    read: boolean;
    createdAt: string;
  }>;
  createdAt: string;
  updatedAt: string;
  // Extension data
  binaryData?: any;
  spotData?: any;
  forexData?: any;
  futuresData?: any;
  ecosystemData?: any;
  aiData?: any;
  icoData?: any;
  p2pData?: any;
  stakingData?: any;
}

const DURATION_OPTIONS = [
  { value: 1, label: "1 hour" },
  { value: 24, label: "1 day" },
  { value: 168, label: "1 week" },
  { value: 720, label: "1 month" },
  { value: 8760, label: "1 year" },
];

const BLOCK_REASONS = [
  "Suspicious Activity",
  "Terms of Service Violation", 
  "Security Concern",
  "Fraud Prevention",
  "Money Laundering",
  "Multiple Account Violation",
  "Admin Request",
  "Other",
];

// Helper function to filter out user column
const createUserSpecificColumns = (originalColumns: any[]) => {
  return originalColumns.filter(column => column.key !== 'user');
};

export default function UserDetailPage() {
  const params = useParams();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const t = useTranslations("dashboard_admin");
  const tCommon = useTranslations("common");
  const tDashboard = useTranslations("dashboard");
  const { isExtensionAvailable } = useExtensionChecker();
  const transactionAnalytics = useTransactionAnalytics();

  // Get columns from hooks
  const transactionColumns = useTransactionColumns();
  const walletColumns = useWalletColumns();
  const supportColumns = useSupportColumns();
  const binaryOrderColumns = useBinaryOrderColumns();
  const exchangeOrderColumns = useExchangeOrderColumns();
  const futuresOrderColumns = useFuturesOrderColumns();
  const ecosystemOrderColumns = useEcosystemOrderColumns();
  const investmentColumns = useInvestmentColumns();
  const icoTransactionColumns = useIcoTransactionColumns();
  const p2pOfferColumns = useP2pOfferColumns();
  const p2pTradeColumns = useP2pTradeColumns();
  const stakingPositionColumns = useStakingPositionColumns();
  const affiliateReferralColumns = useAffiliateReferralColumns();
  const ecommerceOrderColumns = useEcommerceOrderColumns();
  const forexTransactionColumns = useForexTransactionColumns();

  // Create user-specific columns (filtered to exclude user column)
  const userTransactionColumns = useMemo(() => createUserSpecificColumns(transactionColumns), [transactionColumns]);
  const userWalletColumns = useMemo(() => createUserSpecificColumns(walletColumns), [walletColumns]);
  const userSupportColumns = useMemo(() => createUserSpecificColumns(supportColumns), [supportColumns]);
  const userBinaryOrderColumns = useMemo(() => createUserSpecificColumns(binaryOrderColumns), [binaryOrderColumns]);
  const userExchangeOrderColumns = useMemo(() => createUserSpecificColumns(exchangeOrderColumns), [exchangeOrderColumns]);
  const userFuturesOrderColumns = useMemo(() => createUserSpecificColumns(futuresOrderColumns), [futuresOrderColumns]);
  const userEcosystemOrderColumns = useMemo(() => createUserSpecificColumns(ecosystemOrderColumns), [ecosystemOrderColumns]);
  const userInvestmentColumns = useMemo(() => createUserSpecificColumns(investmentColumns), [investmentColumns]);
  const userIcoTransactionColumns = useMemo(() => createUserSpecificColumns(icoTransactionColumns), [icoTransactionColumns]);
  const userP2pOfferColumns = useMemo(() => createUserSpecificColumns(p2pOfferColumns), [p2pOfferColumns]);
  const userP2pTradeColumns = useMemo(() => createUserSpecificColumns(p2pTradeColumns), [p2pTradeColumns]);
  const userStakingPositionColumns = useMemo(() => createUserSpecificColumns(stakingPositionColumns), [stakingPositionColumns]);
  const userAffiliateReferralColumns = useMemo(() => createUserSpecificColumns(affiliateReferralColumns), [affiliateReferralColumns]);
  const userEcommerceOrderColumns = useMemo(() => createUserSpecificColumns(ecommerceOrderColumns), [ecommerceOrderColumns]);
  const userForexTransactionColumns = useMemo(() => createUserSpecificColumns(forexTransactionColumns), [forexTransactionColumns]);

  const [user, setUser] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [isBlockDialogOpen, setIsBlockDialogOpen] = useState(false);
  const [isTemporaryBlock, setIsTemporaryBlock] = useState(false);
  const [blockDuration, setBlockDuration] = useState(24);
  const [blockReason, setBlockReason] = useState("");
  const [customReason, setCustomReason] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [activeCategory, setActiveCategory] = useState<'account' | 'trading' | 'extensions'>('account');
  
  // Get active tab from URL or default to 'overview'
  const activeTab = searchParams.get('tab') || 'overview';

  // Function to handle tab changes and update URL
  const handleTabChange = (tabValue: string) => {
    const currentParams = new URLSearchParams(searchParams.toString());
    currentParams.set('tab', tabValue);
    router.push(`${pathname}?${currentParams.toString()}`, { scroll: false });
  };

  // Function to handle category changes and switch to first tab in category
  const handleCategoryChange = (category: 'account' | 'trading' | 'extensions') => {
    setActiveCategory(category);
    
    // Get the first tab in the new category
    const categoryTabs = tabsByCategory[category];
    if (categoryTabs.length > 0) {
      const firstTab = categoryTabs[0];
      handleTabChange(firstTab.key);
    }
  };

  useEffect(() => {
    if (params.id) {
      fetchUser();
    }
  }, [params.id]);

  const fetchUser = async (showRefresh = false) => {
    try {
      if (showRefresh) setRefreshing(true);
      else setLoading(true);
      
      const { data, error } = await $fetch({
        url: `/api/admin/crm/user/${params.id}`,
        method: "GET",
      });

      if (error) {
        throw new Error(error);
      }

      setUser(data);
    } catch (error: any) {
      toast.error(error.message || "Failed to fetch user data");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleBlockUser = async () => {
    try {
      setIsLoading(true);
      const { error } = await $fetch({
        url: `/api/admin/crm/user/${params.id}/block`,
        method: "PUT",
        body: {
          isTemporary: isTemporaryBlock,
          duration: isTemporaryBlock ? blockDuration : null,
          reason: blockReason === "Other" ? customReason : blockReason,
        },
      });

      if (error) {
        throw new Error(error);
      }

      toast.success("User blocked successfully");
      setIsBlockDialogOpen(false);
      fetchUser(true);
    } catch (error: any) {
      toast.error(error.message || "Failed to block user");
    } finally {
      setIsLoading(false);
    }
  };

  const handleUnblockUser = async () => {
    try {
      setIsLoading(true);
      const { error } = await $fetch({
        url: `/api/admin/crm/user/${params.id}/unblock`,
        method: "PUT",
      });

      if (error) {
        throw new Error(error);
      }

      toast.success("User unblocked successfully");
      fetchUser(true);
    } catch (error: any) {
      toast.error(error.message || "Failed to unblock user");
    } finally {
      setIsLoading(false);
    }
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} copied to clipboard`);
  };

  const formatDate = (dateString: string) => {
    return format(new Date(dateString), "MMM dd, yyyy");
  };

  const formatDateTime = (dateString: string) => {
    return format(new Date(dateString), "MMM dd, yyyy HH:mm");
  };

  const formatRelativeTime = (dateString: string) => {
    return formatDistanceToNow(new Date(dateString), { addSuffix: true });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "ACTIVE": return "success";
      case "INACTIVE": return "secondary";
      case "SUSPENDED": return "destructive";
      case "BANNED": return "destructive";
      default: return "secondary";
    }
  };

  const getKycStatusColor = (status?: string) => {
    switch (status) {
      case "APPROVED": return "success";
      case "REJECTED": return "destructive";
      case "PENDING": return "secondary";
      default: return "outline";
    }
  };

  const getStatusVariant = (status: string) => {
    switch (status) {
      case "COMPLETED": case "ACTIVE": case "APPROVED": return "success";
      case "PENDING": case "PROCESSING": case "REVIEW": return "secondary";
      case "FAILED": case "CANCELLED": case "REJECTED": return "destructive";
      default: return "outline";
    }
  };

  // Enhanced calculations with memoization - Sophisticated Risk & Activity Assessment
  const userStats = useMemo(() => {
    if (!user) return null;

    // === ADVANCED ACTIVITY SCORE CALCULATION ===
    // Multi-dimensional scoring system with weighted factors
    
    // 1. Account Security & Verification (40% weight)
    const securityScore = (() => {
      let score = 0;
      
      // Email verification (essential)
      if (user.emailVerified) score += 15;
      
      // Phone verification (important for 2FA)
      if (user.phoneVerified) score += 12;
      
      // KYC status (critical for compliance)
      if (user.kyc?.status === 'APPROVED') score += 20;
      else if (user.kyc?.status === 'PENDING') score += 5;
      
      // Two-factor authentication (security critical)
      if (user.twoFactor?.enabled) score += 18;
      
      return Math.min(40, score); // Cap at 40%
    })();

    // 2. Account Activity & Engagement (30% weight)
    const engagementScore = (() => {
      let score = 0;
      const now = new Date();
      const accountAge = now.getTime() - new Date(user.createdAt).getTime();
      const daysSinceCreated = accountAge / (1000 * 60 * 60 * 24);
      
      // Account age factor (mature accounts are more valuable)
      if (daysSinceCreated > 365) score += 8; // 1+ years
      else if (daysSinceCreated > 180) score += 6; // 6+ months
      else if (daysSinceCreated > 30) score += 4; // 1+ month
      else if (daysSinceCreated > 7) score += 2; // 1+ week
      
      // Recent login activity
      if (user.lastLogin) {
        const daysSinceLogin = (now.getTime() - new Date(user.lastLogin).getTime()) / (1000 * 60 * 60 * 24);
        if (daysSinceLogin <= 1) score += 10; // Active today
        else if (daysSinceLogin <= 7) score += 8; // Active this week
        else if (daysSinceLogin <= 30) score += 5; // Active this month
        else if (daysSinceLogin <= 90) score += 2; // Active last 3 months
      }
      
      // Profile completeness
      const profileFields = [user.firstName, user.lastName, user.phone, user.avatar];
      const completedFields = profileFields.filter(field => field && field.trim()).length;
      score += (completedFields / profileFields.length) * 8;
      
      // Extension usage (shows platform engagement)
      const extensionData = [user.binaryData, user.spotData, user.forexData, user.futuresData, 
                           user.ecosystemData, user.aiData, user.icoData, user.p2pData, user.stakingData];
      const activeExtensions = extensionData.filter(data => data && Object.keys(data).length > 0).length;
      score += Math.min(4, activeExtensions * 0.5); // Up to 4 points for extension usage
      
      return Math.min(30, score); // Cap at 30%
    })();

    // 3. Account Status & Compliance (20% weight)
    const complianceScore = (() => {
      let score = 0;
      
      // Account status
      if (user.status === 'ACTIVE') score += 15;
      else if (user.status === 'INACTIVE') score += 5;
      // SUSPENDED/BANNED get 0 points
      
      // No recent security issues
      if (user.failedLoginAttempts === 0) score += 5;
      
      return Math.min(20, score); // Cap at 20%
    })();

    // 4. Platform Integration (10% weight)
    const integrationScore = (() => {
      let score = 0;
      
      // Notification preferences (shows engagement)
      if (user.notifications && user.notifications.length > 0) {
        const unreadCount = user.notifications.filter(n => !n.read).length;
        const totalCount = user.notifications.length;
        if (totalCount > 0) {
          const readRatio = (totalCount - unreadCount) / totalCount;
          score += readRatio * 5; // Up to 5 points for notification engagement
        }
      }
      
        // Support interaction (positive engagement) - removed as supportTickets is handled by DataTable
  // if (user.supportTickets && user.supportTickets.length > 0) {
  //   const resolvedTickets = user.supportTickets.filter(t => t.status === 'CLOSED').length;
  //   if (resolvedTickets > 0) score += 3;
  // }
      
      // Role-based bonus
      if (user.role?.name && user.role.name !== 'User') score += 2; // VIP/Premium users
      
      return Math.min(10, score); // Cap at 10%
    })();

    const totalActivityScore = Math.round(securityScore + engagementScore + complianceScore + integrationScore);

    // === ADVANCED RISK LEVEL ASSESSMENT ===
    // Multi-factor risk analysis with weighted scoring
    
    const riskFactors = {
      // Security Risk Factors
      security: (() => {
        let risk = 0;
        
        // Failed login attempts (exponential risk increase)
        if (user.failedLoginAttempts > 10) risk += 40;
        else if (user.failedLoginAttempts > 5) risk += 25;
        else if (user.failedLoginAttempts > 2) risk += 10;
        else if (user.failedLoginAttempts > 0) risk += 3;
        
        // Missing security features
        if (!user.twoFactor?.enabled) risk += 15;
        if (!user.emailVerified) risk += 20;
        if (!user.phoneVerified) risk += 10;
        
        return risk;
      })(),
      
      // Account Status Risk
      account: (() => {
        let risk = 0;
        
        if (user.status === 'SUSPENDED') risk += 50;
        else if (user.status === 'BANNED') risk += 80;
        else if (user.status === 'INACTIVE') risk += 5;
        
        // KYC status risk
        if (user.kyc?.status === 'REJECTED') risk += 30;
        else if (user.kyc?.status === 'ADDITIONAL_INFO_REQUIRED') risk += 15;
        else if (!user.kyc || user.kyc.status === 'PENDING') risk += 10;
        
        return risk;
      })(),
      
      // Behavioral Risk
      behavioral: (() => {
        let risk = 0;
        const now = new Date();
        
        // Inactivity risk
        if (user.lastLogin) {
          const daysSinceLogin = (now.getTime() - new Date(user.lastLogin).getTime()) / (1000 * 60 * 60 * 24);
          if (daysSinceLogin > 180) risk += 15; // 6+ months inactive
          else if (daysSinceLogin > 90) risk += 8; // 3+ months inactive
          else if (daysSinceLogin > 30) risk += 3; // 1+ month inactive
        } else {
          risk += 20; // Never logged in
        }
        
        // New account risk (less than 7 days old)
        const accountAge = (now.getTime() - new Date(user.createdAt).getTime()) / (1000 * 60 * 60 * 24);
        if (accountAge < 1) risk += 15; // Brand new account
        else if (accountAge < 7) risk += 8; // Very new account
        else if (accountAge < 30) risk += 3; // New account
        
        // Incomplete profile risk
        const requiredFields = [user.firstName, user.lastName, user.email];
        const missingRequired = requiredFields.filter(field => !field || !field.trim()).length;
        risk += missingRequired * 5;
        
        return risk;
      })(),
      
      // Compliance Risk
      compliance: (() => {
        const risk = 0;
        
              // Support ticket patterns (frequent issues might indicate problems) - removed as supportTickets is handled by DataTable
      // if (user.supportTickets && user.supportTickets.length > 0) {
      //   const recentTickets = user.supportTickets.filter(ticket => {
      //     const ticketAge = (new Date().getTime() - new Date(ticket.createdAt).getTime()) / (1000 * 60 * 60 * 24);
      //     return ticketAge <= 30; // Last 30 days
      //   });
      //   
      //   if (recentTickets.length > 5) risk += 10; // Many recent tickets
      //   else if (recentTickets.length > 2) risk += 5; // Some recent tickets
      //   
      //   // High priority tickets indicate serious issues
      //   const highPriorityTickets = user.supportTickets.filter(t => t.importance === 'HIGH');
      //   risk += highPriorityTickets.length * 3;
      // }
        
        return risk;
      })()
    };

    const totalRiskScore = riskFactors.security + riskFactors.account + riskFactors.behavioral + riskFactors.compliance;
    
    // Determine risk level with more nuanced thresholds
    let riskLevel: "Low" | "Medium" | "High" | "Critical";
    let riskColor: string;
    
    if (totalRiskScore >= 80) {
      riskLevel = "Critical";
      riskColor = "destructive";
    } else if (totalRiskScore >= 50) {
      riskLevel = "High";
      riskColor = "destructive";
    } else if (totalRiskScore >= 25) {
      riskLevel = "Medium";
      riskColor = "secondary";
    } else {
      riskLevel = "Low";
      riskColor = "success";
    }

    // Calculate risk confidence (how certain we are about the risk assessment)
    const riskConfidence = (() => {
      let confidence = 0;
      
      // More data points = higher confidence
      if (user.lastLogin) confidence += 20;
      if (user.kyc) confidence += 20;
      if (user.twoFactor) confidence += 15;
      // Support tickets confidence removed as it's handled by DataTable
      // if (user.supportTickets && user.supportTickets.length > 0) confidence += 10;
      if (user.notifications && user.notifications.length > 0) confidence += 10;
      
      // Account age increases confidence
      const accountAge = (new Date().getTime() - new Date(user.createdAt).getTime()) / (1000 * 60 * 60 * 24);
      if (accountAge > 30) confidence += 15;
      else if (accountAge > 7) confidence += 10;
      else confidence += 5;
      
      // Activity data increases confidence
      const hasExtensionData = [user.binaryData, user.spotData, user.forexData].some(data => data && Object.keys(data).length > 0);
      if (hasExtensionData) confidence += 10;
      
      return Math.min(100, confidence);
    })();

    return {
      activityScore: totalActivityScore,
      riskLevel,
      riskColor,
      riskScore: totalRiskScore,
      riskConfidence,
      riskFactors, // Detailed breakdown for debugging/display
      accountAge: formatDistanceToNow(new Date(user.createdAt)),
      lastActiveTime: user.lastLogin ? formatRelativeTime(user.lastLogin) : "Never",
      // Additional insights
      securityScore,
      engagementScore,
      complianceScore,
      integrationScore,
    };
  }, [user]);

  // Tab configuration with enhanced features
  const tabConfigs = [
    // Account Management Tabs
    {
      key: "overview",
      label: "Overview",
      category: 'account' as const,
      icon: <User className="w-4 h-4" />,
      description: "Complete user profile and activity summary"
    },
    {
      key: "transactions", 
      label: "Transactions",
      category: 'account' as const,
      icon: <CreditCard className="w-4 h-4" />,
      description: "All financial transactions and history"
    },
    {
      key: "wallets",
      label: "Wallets", 
      category: 'account' as const,
      icon: <Wallet className="w-4 h-4" />,
      description: "Digital wallets and balances"
    },
    {
      key: "kyc",
      label: "KYC",
      category: 'account' as const,
      icon: <Shield className="w-4 h-4" />,
      description: "Identity verification status"
    },
    {
      key: "support",
      label: "Support",
      category: 'account' as const,
      icon: <MessageCircle className="w-4 h-4" />,
      description: "Support tickets and communication"
    },
    {
      key: "security",
      label: "Security", 
      category: 'account' as const,
      icon: <Key className="w-4 h-4" />,
      description: "Security settings and authentication"
    },
    {
      key: "activity",
      label: "Activity",
      category: 'account' as const,
      icon: <Activity className="w-4 h-4" />,
      description: "Account activity and admin actions"
    },
    
    // Core Trading Tabs
    {
      key: "binary",
      label: "Binary",
      category: 'trading' as const,
      icon: <Target className="w-4 h-4" />,
      description: "Binary options trading activity"
    },
    {
      key: "spot",
      label: "Spot", 
      category: 'trading' as const,
      icon: <TrendingUp className="w-4 h-4" />,
      description: "Spot market trading orders"
    },
    
    // Extension-based Trading Tabs
    {
      key: "futures",
      label: "Futures",
      extension: "futures",
      category: 'trading' as const,
      icon: <LineChart className="w-4 h-4" />,
      description: "Futures trading with leverage"
    },
    {
      key: "ecosystem",
      label: "Ecosystem",
      extension: "ecosystem",
      category: 'trading' as const,
      icon: <Globe className="w-4 h-4" />,
      description: "Ecosystem token trading"
    },
    
    // Extension Services
    {
      key: "forex",
      label: "Forex",
      extension: "forex",
      category: 'extensions' as const,
      icon: <BarChart3 className="w-4 h-4" />,
      description: "Foreign exchange trading"
    },
    {
      key: "ai",
      label: "AI Investments",
      extension: "ai_investment",
      category: 'extensions' as const,
      icon: <Zap className="w-4 h-4" />,
      description: "AI-powered investment strategies"
    },
    {
      key: "ico",
      label: "ICO",
      extension: "ico", 
      category: 'extensions' as const,
      icon: <Star className="w-4 h-4" />,
      description: "Initial coin offering participation"
    },
    {
      key: "p2p",
      label: "P2P",
      extension: "p2p",
      category: 'extensions' as const,
      icon: <Users className="w-4 h-4" />,
      description: "Peer-to-peer trading platform"
    },
    {
      key: "staking",
      label: "Staking",
      extension: "staking",
      category: 'extensions' as const,
      icon: <Award className="w-4 h-4" />,
      description: "Token staking and rewards"
    },
    {
      key: "affiliate",
      label: "Affiliate",
      extension: "affiliate",
      category: 'extensions' as const,
      icon: <Users className="w-4 h-4" />,
      description: "Affiliate program and referrals"
    },
    {
      key: "ecommerce",
      label: "Ecommerce",
      extension: "ecommerce",
      category: 'extensions' as const,
      icon: <Briefcase className="w-4 h-4" />,
      description: "E-commerce orders and products"
    },
  ];

  // Set active category based on current tab
  useEffect(() => {
    if (activeTab) {
      const tab = tabConfigs.find(t => t.key === activeTab);
      if (tab && tab.category !== activeCategory) {
        setActiveCategory(tab.category);
      }
    }
  }, [activeTab, activeCategory]);

  // Filter tabs based on extensions
  const availableTabs = tabConfigs.filter((tab) => {
    if (!tab.extension) {
      return true;
    }
    return isExtensionAvailable(tab.extension);
  });

  // Group tabs by category
  const tabsByCategory = {
    account: availableTabs.filter(tab => tab.category === 'account'),
    trading: availableTabs.filter(tab => tab.category === 'trading'),
    extensions: availableTabs.filter(tab => tab.category === 'extensions'),
  };

  // Get current category tabs
  const currentTabs = tabsByCategory[activeCategory];

  // Ensure active tab is available, fallback to first available tab if not
  useEffect(() => {
    const isActiveTabAvailable = availableTabs.some(tab => tab.key === activeTab);
    if (!isActiveTabAvailable && availableTabs.length > 0) {
      handleTabChange(availableTabs[0].key);
    }
  }, [availableTabs, activeTab]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">{t("loading_user_profile_ellipsis")}</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <AlertTriangle className="h-16 w-16 text-destructive mx-auto mb-4" />
          <h2 className="text-2xl font-bold mb-2">{t("user_not_found")}</h2>
          <p className="text-muted-foreground mb-4">{t("the_requested_user_could_not_be_found")}</p>
          <Button onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            {tCommon("go_back")}
          </Button>
        </div>
      </div>
    );
  }

  const isBlocked = user.status === "SUSPENDED" || user.status === "BANNED";

  return (
    <div className={`container ${PAGE_PADDING} space-y-6`}>
      {/* Enhanced Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button
            variant="outline"
            size="icon"
            onClick={() => router.back()}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
        <div className="flex items-center space-x-4">
          <Avatar className="h-16 w-16">
            <AvatarImage src={user.avatar} />
              <AvatarFallback className="text-lg">
              {user.firstName?.[0]}{user.lastName?.[0]}
            </AvatarFallback>
          </Avatar>
          <div>
              <div className="flex items-center space-x-2">
                <h1 className="text-3xl font-bold tracking-tight">
              {user.firstName} {user.lastName}
            </h1>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => copyToClipboard(`${user.firstName} ${user.lastName}`, "Name")}
                >
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
              <div className="flex items-center space-x-2">
            <p className="text-muted-foreground">{user.email}</p>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => copyToClipboard(user.email, "Email")}
                >
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
            <div className="flex items-center space-x-2 mt-1">
                <Badge variant="outline" className="text-xs">
                  ID: {user.id}
                </Badge>
                <Badge variant="outline" className="text-xs">
                  {user.role.name}
                </Badge>
                <Badge variant="outline" className="text-xs">
                  {t("score")}: {userStats?.activityScore}%
                </Badge>
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => fetchUser(true)}
            disabled={refreshing}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Badge variant={getStatusColor(user.status)} className="text-sm px-3 py-1">
            {user.status}
          </Badge>
          {isBlocked ? (
            <Button variant="outline" size="sm" onClick={handleUnblockUser} disabled={isLoading}>
              <ShieldOff className="h-4 w-4 mr-2" />
              {t("unblock_user")}
            </Button>
          ) : (
            <Button variant="destructive" size="sm" onClick={() => setIsBlockDialogOpen(true)} disabled={isLoading}>
                  <Shield className="h-4 w-4 mr-2" />
                  {t("block_user")}
                </Button>
          )}
                    </div>
                  </div>

      {/* Enhanced Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="relative overflow-hidden">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{tCommon("last_login")}</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {user.lastLogin ? formatRelativeTime(user.lastLogin) : 'Never'}
                    </div>
            <p className="text-xs text-muted-foreground">
              {user.lastLogin ? formatDateTime(user.lastLogin) : 'User has never logged in'}
            </p>
            <div className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-br from-green-500/10 to-transparent rounded-full -mr-10 -mt-10" />
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{tCommon("activity_score")}</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{userStats?.activityScore}%</div>
            <Progress value={userStats?.activityScore} className="mt-2" />
            <p className="text-xs text-muted-foreground mt-1">
              {t("user_engagement_level")}
            </p>
            <div className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-br from-blue-500/10 to-transparent rounded-full -mr-10 -mt-10" />
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{tCommon("account_age")}</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{userStats?.accountAge}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {t("since_registration")}
            </p>
            <div className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-br from-purple-500/10 to-transparent rounded-full -mr-10 -mt-10" />
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{tCommon("risk_level")}</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              <Badge variant={userStats?.riskColor as any}>
                {userStats?.riskLevel}
              </Badge>
                    </div>
            <p className="text-xs text-muted-foreground mt-1">
              {t("score")}: {userStats?.riskScore}/100 ({userStats?.riskConfidence}% {t("confidence")}
            </p>
            <div className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-br from-red-500/10 to-transparent rounded-full -mr-10 -mt-10" />
          </CardContent>
        </Card>
      </div>

      {/* Enhanced Detailed Information Tabs */}
      <div className="space-y-6">
        {/* Enhanced Category Navigation */}
        <div className="flex flex-wrap gap-2 border-b pb-4">
          <Button
            variant={activeCategory === 'account' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => handleCategoryChange('account')}
            className="flex items-center gap-2"
          >
            <User className="w-4 h-4" />
            {tCommon("account")} ({tabsByCategory.account.length})
                    </Button>
          
          {tabsByCategory.trading.length > 0 && (
            <Button
              variant={activeCategory === 'trading' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => handleCategoryChange('trading')}
              className="flex items-center gap-2"
            >
              <TrendingUp className="w-4 h-4" />
              {tCommon("trading")} ({tabsByCategory.trading.length})
                    </Button>
          )}
          
          {tabsByCategory.extensions.length > 0 && (
            <Button
              variant={activeCategory === 'extensions' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => handleCategoryChange('extensions')}
              className="flex items-center gap-2"
            >
              <Briefcase className="w-4 h-4" />
              {t("extensions")} ({tabsByCategory.extensions.length})
            </Button>
          )}
              </div>

        {/* Tabs Content */}
        <Tabs 
          key={`user-tabs-${user.id}-${activeCategory}`}
          value={activeTab} 
          onValueChange={handleTabChange}
          className="w-full"
        >
          <TabsList className="grid w-full" style={{ gridTemplateColumns: `repeat(${currentTabs.length}, 1fr)` }}>
            {currentTabs.map((tab) => (
              <TabsTrigger key={tab.key} value={tab.key} className="flex items-center gap-2 text-sm">
                {tab.icon}
                <span className="hidden sm:inline">{tab.label}</span>
                <span className="sm:hidden">{tab.label.split(' ')[0]}</span>
              </TabsTrigger>
            ))}
          </TabsList>

          {/* Enhanced Overview Tab */}
          <TabsContent value="overview" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Personal Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <User className="h-5 w-5 mr-2" />
              {tCommon('personal_info')}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Mail className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm">Email</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <span className="text-sm font-medium">{user.email}</span>
              {user.emailVerified ? (
                <CheckCircle className="h-4 w-4 text-green-600" />
              ) : (
                <XCircle className="h-4 w-4 text-red-600" />
              )}
                      </div>
            </div>

            {user.phone && (
                      <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Phone className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm">Phone</span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <span className="text-sm font-medium">{user.phone}</span>
                {user.phoneVerified ? (
                  <CheckCircle className="h-4 w-4 text-green-600" />
                ) : (
                  <XCircle className="h-4 w-4 text-red-600" />
                )}
                        </div>
              </div>
            )}

                    <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Calendar className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm">Joined</span>
                      </div>
                      <span className="text-sm font-medium">{formatDate(user.createdAt)}</span>
            </div>

                    <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Clock className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm">{tCommon("last_login")}</span>
              </div>
                      <span className="text-sm font-medium">
                        {user.lastLogin ? formatRelativeTime(user.lastLogin) : "Never"}
                      </span>
                    </div>
                  </div>
          </CardContent>
        </Card>

              {/* Account Summary */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
                    <Activity className="h-5 w-5 mr-2" />
                    {t("account_summary")}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="text-center p-4 border rounded-lg bg-blue-50 dark:bg-blue-950/20">
                      <div className="text-2xl font-bold text-blue-600">{userStats?.activityScore}%</div>
                      <div className="text-sm text-muted-foreground">{tCommon("activity_score")}</div>
                      <div className="text-xs text-muted-foreground mt-1">
                        {t("user_engagement_level")}
                      </div>
                    </div>
                    <div className="text-center p-4 border rounded-lg bg-purple-50 dark:bg-purple-950/20">
                      <div className="text-2xl font-bold text-purple-600">{userStats?.riskLevel}</div>
                      <div className="text-sm text-muted-foreground">{tCommon("risk_level")}</div>
                      <div className="text-xs text-muted-foreground mt-1">
                        {t("security_assessment")}
                      </div>
                    </div>
                  </div>

                  <Separator />

                  <div className="space-y-3">
            <div className="flex justify-between items-center">
                      <span className="text-sm">{tDashboard("account_status")}</span>
                      <Badge variant={getStatusColor(user.status)}>
                        {user.status}
              </Badge>
            </div>

            <div className="flex justify-between items-center">
                      <span className="text-sm">{tCommon("two_factor_auth")}</span>
                      <Badge variant={user.twoFactor?.enabled ? "success" : "secondary"}>
                        {user.twoFactor?.enabled ? "Enabled" : "Disabled"}
              </Badge>
            </div>

              <div className="flex justify-between items-center">
                <span className="text-sm">KYC Status</span>
                      <Badge variant={getKycStatusColor(user.kyc?.status)}>
                        {user.kyc?.status || "Pending"}
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>

              {/* Quick Stats */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
                    <PieChart className="h-5 w-5 mr-2" />
                    {t("quick_stats")}
            </CardTitle>
          </CardHeader>
                <CardContent className="space-y-4">
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                      <span className="text-sm">{tCommon("account_age")}</span>
                      <span className="text-sm font-medium">{userStats?.accountAge}</span>
              </div>
              
                    <div className="flex justify-between items-center">
                      <span className="text-sm">{t("last_active")}</span>
                      <span className="text-sm font-medium">{userStats?.lastActiveTime}</span>
                </div>
                    
                    <div className="flex justify-between items-center">
                      <span className="text-sm">{tCommon("email_verified")}</span>
                      <Badge variant={user.emailVerified ? "success" : "destructive"}>
                        {user.emailVerified ? "Yes" : "No"}
                      </Badge>
                    </div>
                    
                    <div className="flex justify-between items-center">
                      <span className="text-sm">{t("failed_logins")}</span>
                      <Badge variant={user.failedLoginAttempts > 3 ? "destructive" : "outline"}>
                        {user.failedLoginAttempts}
                      </Badge>
                    </div>
                  </div>

                  <Separator />

                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>{tCommon("activity_score")}</span>
                      <span>{userStats?.activityScore}%</span>
                    </div>
                    <Progress value={userStats?.activityScore} className="h-2" />
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Enhanced Transactions Tab with DataTable */}
          <TabsContent value="transactions" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>{t("transaction_history")}</CardTitle>
                <CardDescription>
                  {t("complete_transaction_history_for_this_user")}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <DataTable
                  key={`transactions-${user.id}`}
                  apiEndpoint="/api/admin/finance/transaction"
                  model="transaction"
                  modelConfig={{
                    userId: user.id,
                  }}
                  pageSize={12}
                  canView={true}
                  canEdit={true}
                  canDelete={true}
                  isParanoid={false}
                  title=""
                  itemTitle="Transaction"
                  columns={userTransactionColumns}
                  analytics={transactionAnalytics}
                  permissions={{
                    access: "access.transaction",
                    view: "view.transaction",
                    create: "create.transaction",
                    edit: "edit.transaction",
                    delete: "delete.transaction",
                  }}
                />
              </CardContent>
            </Card>
          </TabsContent>

          {/* Enhanced Wallets Tab with DataTable */}
          <TabsContent value="wallets" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>{t("user_wallets")}</CardTitle>
                <CardDescription>
                  {t("all_user_wallets_with_advanced_management")}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <DataTable
                  key={`wallets-${user.id}`}
                  apiEndpoint="/api/admin/finance/wallet"
                  model="wallet"
                  modelConfig={{
                    userId: user.id,
                  }}
                  pageSize={12}
                  canView={true}
                  canEdit={true}
                  canDelete={true}
                  editCondition={(row) => row.type !== "ECO" && row.type !== "FUTURES"}
                  isParanoid={false}
                  title=""
                  itemTitle="Wallet"
                  columns={userWalletColumns}
                  permissions={{
                    access: "access.wallet",
                    view: "view.wallet",
                    create: "create.wallet",
                    edit: "edit.wallet",
                    delete: "delete.wallet",
                  }}
                />
              </CardContent>
            </Card>
          </TabsContent>

          {/* Enhanced KYC Tab */}
          <TabsContent value="kyc" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>KYC Status</CardTitle>
                  <CardDescription>
                    {t("know_your_customer_verification_information")}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {user.kyc ? (
                    <div className="space-y-4">
                      <div className="flex justify-between items-center p-4 border rounded-lg">
                        <span className="font-medium">{tCommon("verification_status")}</span>
                        <Badge variant={getKycStatusColor(user.kyc.status)} className="text-sm">
                          {user.kyc.status}
                        </Badge>
                      </div>
                      
                      <div className="flex justify-between items-center p-4 border rounded-lg">
                        <span className="font-medium">{t("submitted_date")}</span>
                        <div className="text-right">
                          <div className="text-sm font-medium">{formatDate(user.kyc.createdAt)}</div>
                          <div className="text-xs text-muted-foreground">{formatRelativeTime(user.kyc.createdAt)}</div>
                        </div>
                      </div>
                      
                      {user.kyc.reviewedAt && (
                        <div className="flex justify-between items-center p-4 border rounded-lg">
                          <span className="font-medium">{t("reviewed_date")}</span>
                          <div className="text-right">
                            <div className="text-sm font-medium">{formatDate(user.kyc.reviewedAt)}</div>
                            <div className="text-xs text-muted-foreground">{formatRelativeTime(user.kyc.reviewedAt)}</div>
                          </div>
                        </div>
                      )}
                      
                      {user.kyc.adminNotes && (
                        <div className="space-y-2">
                          <Label>{tCommon("admin_notes")}</Label>
                          <div className="p-4 bg-muted rounded-lg">
                            <p className="text-sm">{user.kyc.adminNotes}</p>
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="text-center py-12">
                      <FileText className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                      <h3 className="text-lg font-semibold mb-2">{t("no_kyc_application")}</h3>
                      <p className="text-muted-foreground">
                        {t("this_user_has_not_submitted_kyc_documents_yet")}
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>{tCommon("verification_progress")}</CardTitle>
                  <CardDescription>
                    {t("account_verification_completion_status")}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <Mail className="h-4 w-4" />
                        <span className="text-sm">{t("email_verification")}</span>
                      </div>
                      {user.emailVerified ? (
                        <CheckCircle className="h-4 w-4 text-green-600" />
                      ) : (
                        <XCircle className="h-4 w-4 text-red-600" />
                      )}
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <Phone className="h-4 w-4" />
                        <span className="text-sm">{tCommon("phone_verification")}</span>
                      </div>
                      {user.phoneVerified ? (
                        <CheckCircle className="h-4 w-4 text-green-600" />
                      ) : (
                        <XCircle className="h-4 w-4 text-red-600" />
                      )}
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <FileText className="h-4 w-4" />
                        <span className="text-sm">KYC Documents</span>
                      </div>
                      {user.kyc?.status === 'APPROVED' ? (
                        <CheckCircle className="h-4 w-4 text-green-600" />
                      ) : user.kyc?.status === 'REJECTED' ? (
                        <XCircle className="h-4 w-4 text-red-600" />
                      ) : user.kyc ? (
                        <Clock className="h-4 w-4 text-yellow-600" />
                      ) : (
                        <XCircle className="h-4 w-4 text-red-600" />
                      )}
                    </div>
                  </div>
                  
                  <Separator />
                  
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>{t("completion_progress")}</span>
                      <span>{Math.round(((user.emailVerified ? 1 : 0) + (user.phoneVerified ? 1 : 0) + (user.kyc?.status === 'APPROVED' ? 1 : 0)) / 3 * 100)}%</span>
                    </div>
                    <Progress value={((user.emailVerified ? 1 : 0) + (user.phoneVerified ? 1 : 0) + (user.kyc?.status === 'APPROVED' ? 1 : 0)) / 3 * 100} />
            </div>
          </CardContent>
        </Card>
            </div>
          </TabsContent>

          {/* Enhanced Support Tab with DataTable */}
          <TabsContent value="support" className="space-y-6">
        <Card>
          <CardHeader>
                <CardTitle>{tCommon("support_tickets")}</CardTitle>
                <CardDescription>
                  {t("all_support_requests_and_communication_history")}
                </CardDescription>
          </CardHeader>
          <CardContent>
                <DataTable
                  key={`support-${user.id}`}
                  apiEndpoint="/api/admin/crm/support/ticket"
                  model="supportTicket"
                  modelConfig={{
                    userId: user.id,
                  }}
                  pageSize={12}
                  canView={true}
                  canEdit={false}
                  canDelete={true}
                  isParanoid={true}
                  title=""
                  itemTitle="Support Ticket"
                  columns={userSupportColumns}
                  permissions={{
                    access: "access.support.ticket",
                    view: "view.support.ticket",
                    create: "create.support.ticket",
                    edit: "edit.support.ticket",
                    delete: "delete.support.ticket",
                  }}
                />
              </CardContent>
            </Card>
          </TabsContent>

          {/* Enhanced Security Tab */}
          <TabsContent value="security" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>{tCommon("security_overview")}</CardTitle>
                  <CardDescription>
                    {t("account_security_status_and_settings")}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex justify-between items-center p-4 border rounded-lg">
                  <div>
                      <h4 className="font-medium">{tCommon("two_factor_authentication")}</h4>
                      <p className="text-sm text-muted-foreground">
                        {user.twoFactor?.enabled ? `Enabled via ${user.twoFactor.type}` : 'Not configured'}
                    </p>
                  </div>
                    <Badge variant={user.twoFactor?.enabled ? "success" : "destructive"}>
                      {user.twoFactor?.enabled ? "Active" : "Inactive"}
                    </Badge>
                  </div>
                  
                  <div className="flex justify-between items-center p-4 border rounded-lg">
                    <div>
                      <h4 className="font-medium">{t("email_verification")}</h4>
                      <p className="text-sm text-muted-foreground">{t("email_address_verification_status")}</p>
                </div>
                    <Badge variant={user.emailVerified ? "success" : "destructive"}>
                      {user.emailVerified ? "Verified" : "Unverified"}
                    </Badge>
                  </div>
                  
                  <div className="flex justify-between items-center p-4 border rounded-lg">
                    <div>
                      <h4 className="font-medium">{tCommon("phone_verification")}</h4>
                      <p className="text-sm text-muted-foreground">{t("phone_number_verification_status")}</p>
                    </div>
                    <Badge variant={user.phoneVerified ? "success" : "destructive"}>
                      {user.phoneVerified ? "Verified" : "Unverified"}
                    </Badge>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>{t("risk_assessment_details")}</CardTitle>
                  <CardDescription>
                    {t("comprehensive_risk_analysis_breakdown")}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium">{t("overall_risk_level")}</span>
                      <Badge variant={userStats?.riskColor as any} className="text-sm">
                        {userStats?.riskLevel} ({userStats?.riskScore}/100)
                      </Badge>
                    </div>
                    
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>{t("assessment_confidence")}</span>
                        <span>{userStats?.riskConfidence}%</span>
                      </div>
                      <Progress value={userStats?.riskConfidence} className="h-2" />
                    </div>
                    
                    <Separator />
                    
                    <div className="space-y-2">
                      <h5 className="font-medium text-sm">{t("risk_factors_breakdown")}:</h5>
                      
                      <div className="flex justify-between items-center text-sm">
                        <span>{t("security_risk")}</span>
                        <Badge variant={(userStats?.riskFactors?.security || 0) > 20 ? "destructive" : (userStats?.riskFactors?.security || 0) > 10 ? "secondary" : "success"}>
                          {userStats?.riskFactors?.security || 0}/45
                        </Badge>
                      </div>
                      
                      <div className="flex justify-between items-center text-sm">
                        <span>{t("account_status_risk")}</span>
                        <Badge variant={(userStats?.riskFactors?.account || 0) > 20 ? "destructive" : (userStats?.riskFactors?.account || 0) > 10 ? "secondary" : "success"}>
                          {userStats?.riskFactors?.account || 0}/80
                        </Badge>
                      </div>
                      
                      <div className="flex justify-between items-center text-sm">
                        <span>{t("behavioral_risk")}</span>
                        <Badge variant={(userStats?.riskFactors?.behavioral || 0) > 15 ? "destructive" : (userStats?.riskFactors?.behavioral || 0) > 8 ? "secondary" : "success"}>
                          {userStats?.riskFactors?.behavioral || 0}/38
                        </Badge>
                      </div>
                      
                      <div className="flex justify-between items-center text-sm">
                        <span>{t("compliance_risk")}</span>
                        <Badge variant={(userStats?.riskFactors?.compliance || 0) > 10 ? "destructive" : (userStats?.riskFactors?.compliance || 0) > 5 ? "secondary" : "success"}>
                          {userStats?.riskFactors?.compliance || 0}/13
                        </Badge>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
            
            {/* Activity Score Breakdown */}
            <Card>
              <CardHeader>
                <CardTitle>{t("activity_score_analysis")}</CardTitle>
                <CardDescription>
                  {t("detailed_breakdown_of_user_engagement_and")}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="text-center p-4 border rounded-lg bg-blue-50 dark:bg-blue-950/20">
                    <div className="text-2xl font-bold text-blue-600">{userStats?.securityScore}/40</div>
                    <div className="text-sm text-muted-foreground">{tCommon("security_score")}</div>
                    <div className="text-xs text-muted-foreground mt-1">
                      {t("verification_2fa")}
                    </div>
                  </div>
                  
                  <div className="text-center p-4 border rounded-lg bg-green-50 dark:bg-green-950/20">
                    <div className="text-2xl font-bold text-green-600">{userStats?.engagementScore}/30</div>
                    <div className="text-sm text-muted-foreground">{t("engagement_score")}</div>
                    <div className="text-xs text-muted-foreground mt-1">
                      {t("activity_usage")}
                    </div>
                  </div>
                  
                  <div className="text-center p-4 border rounded-lg bg-purple-50 dark:bg-purple-950/20">
                    <div className="text-2xl font-bold text-purple-600">{userStats?.complianceScore}/20</div>
                    <div className="text-sm text-muted-foreground">{t("compliance_score")}</div>
                    <div className="text-xs text-muted-foreground mt-1">
                      {t("status_security")}
                    </div>
                  </div>
                  
                  <div className="text-center p-4 border rounded-lg bg-orange-50 dark:bg-orange-950/20">
                    <div className="text-2xl font-bold text-orange-600">{userStats?.integrationScore}/10</div>
                    <div className="text-sm text-muted-foreground">{t("integration_score")}</div>
                    <div className="text-xs text-muted-foreground mt-1">
                      {t("platform_usage")}
                    </div>
                  </div>
                </div>
                
                <div className="mt-6 space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="font-medium">{t("total_activity_score")}</span>
                    <span className="font-bold">{userStats?.activityScore}/100</span>
                  </div>
                  <Progress value={userStats?.activityScore} className="h-3" />
                  <p className="text-xs text-muted-foreground">
                    {t("based_on_security_verification_account_activity")}
                  </p>
            </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Enhanced Binary Tab */}
          <TabsContent value="binary" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>{t("binary_options_orders")}</CardTitle>
                <CardDescription>
                  {t("all_binary_options_trading_orders_with")}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <DataTable
                  key={`binary-orders-${user.id}`}
                  apiEndpoint="/api/admin/finance/order/binary"
                  model="binaryOrder"
                  modelConfig={{
                    userId: user.id,
                  }}
                  columns={userBinaryOrderColumns}
                  permissions={{
                    access: "access.binary.order",
                    view: "view.binary.order",
                    create: "create.binary.order",
                    edit: "edit.binary.order",
                    delete: "delete.binary.order",
                  }}
                  canView={true}
                  canEdit={true}
                  canDelete={true}
                  pageSize={12}
                  isParanoid={false}
                />
              </CardContent>
            </Card>
          </TabsContent>

          {/* Enhanced Spot Tab */}
          <TabsContent value="spot" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>{t("spot_trading_orders")}</CardTitle>
                <CardDescription>
                  {t("all_spot_market_trading_orders_with")}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <DataTable
                  key={`spot-orders-${user.id}`}
                  apiEndpoint="/api/admin/finance/order/exchange"
                  model="exchangeOrder"
                  modelConfig={{
                    userId: user.id,
                  }}
                  columns={userExchangeOrderColumns}
                  permissions={{
                    access: "access.exchange.order",
                    view: "view.exchange.order",
                    create: "create.exchange.order",
                    edit: "edit.exchange.order",
                    delete: "delete.exchange.order",
                  }}
                  canView={true}
                  canEdit={true}
                  canDelete={true}
                  pageSize={12}
                  isParanoid={false}
                />
              </CardContent>
            </Card>
          </TabsContent>

          {/* Enhanced Futures Tab */}
          <TabsContent value="futures" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>{t("futures_trading_orders")}</CardTitle>
                <CardDescription>
                  {t("all_futures_trading_orders_with_advanced")}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <DataTable
                  key={`futures-orders-${user.id}`}
                  apiEndpoint="/api/admin/futures/order"
                  model="futuresOrder"
                  modelConfig={{
                    userId: user.id,
                  }}
                  columns={userFuturesOrderColumns}
                  permissions={{
                    access: "access.futures.order",
                    view: "view.futures.order",
                    create: "create.futures.order",
                    edit: "edit.futures.order",
                    delete: "delete.futures.order",
                  }}
                  canView={true}
                  canEdit={true}
                  canDelete={true}
                  pageSize={12}
                  isParanoid={false}
                />
              </CardContent>
            </Card>
          </TabsContent>

          {/* Enhanced Ecosystem Tab */}
          <TabsContent value="ecosystem" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>{t("ecosystem_trading_orders")}</CardTitle>
                <CardDescription>
                  {t("all_ecosystem_token_trading_orders_with")}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <DataTable
                  key={`ecosystem-orders-${user.id}`}
                  apiEndpoint="/api/admin/ecosystem/order"
                  model="ecosystemOrder"
                  modelConfig={{
                    userId: user.id,
                  }}
                  columns={userEcosystemOrderColumns}
                  permissions={{
                    access: "access.ecosystem.order",
                    view: "view.ecosystem.order",
                    create: "create.ecosystem.order",
                    edit: "edit.ecosystem.order",
                    delete: "delete.ecosystem.order",
                  }}
                  canView={true}
                  canEdit={true}
                  canDelete={true}
                  pageSize={12}
                  isParanoid={false}
                />
              </CardContent>
            </Card>
          </TabsContent>

          {/* Enhanced Forex Tab */}
          <TabsContent value="forex" className="space-y-6">
            <div className="space-y-6">
              {/* Forex Transactions (Combined Deposits & Withdrawals) */}
              <Card>
                <CardHeader>
                  <CardTitle>{tCommon("forex_transactions")}</CardTitle>
                  <CardDescription>
                    {t("all_forex_account_deposits_and_withdrawals")}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <DataTable
                    key={`forex-transactions-${user.id}`}
                    apiEndpoint="/api/admin/finance/transaction"
                    model="transaction"
                    modelConfig={{
                      userId: user.id,
                      type: ["FOREX_DEPOSIT", "FOREX_WITHDRAW"],
                    }}
                    columns={userForexTransactionColumns}
                    permissions={{
                      access: "access.transaction",
                      view: "view.transaction",
                      create: "create.transaction",
                      edit: "edit.transaction",
                      delete: "delete.transaction",
                    }}
                    canView={true}
                    canEdit={true}
                    canDelete={true}
                    pageSize={12}
                    isParanoid={false}
                  />
                </CardContent>
              </Card>

              {/* Forex Investments */}
              <Card>
                <CardHeader>
                  <CardTitle>{tCommon("forex_investments")}</CardTitle>
                  <CardDescription>
                    {t("all_forex_investment_plans_and_performance")}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <DataTable
                    key={`forex-investments-${user.id}`}
                    apiEndpoint="/api/admin/finance/investment/history"
                    model="forexInvestment"
                    modelConfig={{
                      userId: user.id,
                    }}
                    columns={userInvestmentColumns}
                    permissions={{
                      access: "access.investment",
                      view: "view.investment",
                      create: "create.investment",
                      edit: "edit.investment",
                      delete: "delete.investment",
                    }}
                    canView={true}
                    canEdit={true}
                    canDelete={true}
                    pageSize={12}
                    isParanoid={false}
                  />
          </CardContent>
        </Card>
      </div>
          </TabsContent>

          {/* Enhanced AI Tab */}
          <TabsContent value="ai" className="space-y-6">
        <Card>
          <CardHeader>
                <CardTitle>AI Investment Portfolio</CardTitle>
                <CardDescription>
                  {t("all_ai_powered_investment_plans_and")}
                </CardDescription>
          </CardHeader>
          <CardContent>
                <DataTable
                  key={`ai-investments-${user.id}`}
                  apiEndpoint="/api/admin/finance/investment/history"
                  model="aiInvestment"
                  modelConfig={{
                    userId: user.id,
                  }}
                  columns={userInvestmentColumns}
                  permissions={{
                    access: "access.ai.investment",
                    view: "view.ai.investment",
                    create: "create.ai.investment",
                    edit: "edit.ai.investment",
                    delete: "delete.ai.investment",
                  }}
                  canView={true}
                  canEdit={true}
                  canDelete={true}
                  pageSize={12}
                  isParanoid={false}
                />
              </CardContent>
            </Card>
          </TabsContent>

          {/* ICO Tab */}
          <TabsContent value="ico" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>ICO Transactions</CardTitle>
                <CardDescription>
                  {t("all_ico_transactions_and_token_purchases")}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <DataTable
                  key={`ico-transactions-${user.id}`}
                  apiEndpoint="/api/admin/ico/transaction"
                  model="icoTransaction"
                  modelConfig={{
                    userId: user.id,
                  }}
                  columns={userIcoTransactionColumns}
                  permissions={{
                    access: "access.ico.transaction",
                    view: "view.ico.transaction",
                    create: "create.ico.transaction",
                    edit: "edit.ico.transaction",
                    delete: "delete.ico.transaction",
                  }}
                  canView={true}
                  canEdit={true}
                  canDelete={true}
                  pageSize={12}
                  isParanoid={false}
                />
              </CardContent>
            </Card>
          </TabsContent>

          {/* P2P Tab */}
          <TabsContent value="p2p" className="space-y-6">
            {/* P2P Offers */}
            <Card>
              <CardHeader>
                <CardTitle>{t("p2p_offers")}</CardTitle>
                <CardDescription>
                  {t("all_p2p_offers_created_by_this")}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <DataTable
                  key={`p2p-offers-${user.id}`}
                  apiEndpoint="/api/admin/p2p/offer"
                  model="p2pOffer"
                  modelConfig={{
                    userId: user.id,
                  }}
                  columns={userP2pOfferColumns}
                  permissions={{
                    access: "access.p2p.offer",
                    view: "view.p2p.offer",
                    create: "create.p2p.offer",
                    edit: "edit.p2p.offer",
                    delete: "delete.p2p.offer",
                  }}
                  canView={true}
                  canEdit={true}
                  canDelete={true}
                  pageSize={12}
                  isParanoid={false}
                />
              </CardContent>
            </Card>

            {/* P2P Trades */}
            <Card>
              <CardHeader>
                <CardTitle>{tCommon("p2p_trades")}</CardTitle>
                <CardDescription>
                  {t("all_p2p_trades_completed_by_this")}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <DataTable
                  key={`p2p-trades-${user.id}`}
                  apiEndpoint="/api/admin/p2p/trade"
                  model="p2pTrade"
                  modelConfig={{
                    userId: user.id,
                  }}
                  columns={userP2pTradeColumns}
                  permissions={{
                    access: "access.p2p.trade",
                    view: "view.p2p.trade",
                    create: "create.p2p.trade",
                    edit: "edit.p2p.trade",
                    delete: "delete.p2p.trade",
                  }}
                  canView={true}
                  canEdit={true}
                  canDelete={true}
                  pageSize={12}
                  isParanoid={false}
                />
              </CardContent>
            </Card>
          </TabsContent>

          {/* Staking Tab */}
          <TabsContent value="staking" className="space-y-6">
            {/* Staking Positions */}
            <Card>
              <CardHeader>
                <CardTitle>{tCommon("staking_positions")}</CardTitle>
                <CardDescription>
                  {t("all_staking_positions_held_by_this")}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <DataTable
                  key={`staking-positions-${user.id}`}
                  apiEndpoint="/api/admin/staking/position"
                  model="stakingPosition"
                  modelConfig={{
                    userId: user.id,
                  }}
                  columns={userStakingPositionColumns}
                  permissions={{
                    access: "access.staking.position",
                    view: "view.staking.position",
                    create: "create.staking.position",
                    edit: "edit.staking.position",
                    delete: "delete.staking.position",
                  }}
                  canView={true}
                  canEdit={true}
                  canDelete={true}
                  pageSize={12}
                  isParanoid={false}
                />
              </CardContent>
            </Card>
          </TabsContent>

          {/* Affiliate Tab */}
          <TabsContent value="affiliate" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>{tCommon("affiliate_referrals")}</CardTitle>
                <CardDescription>
                  {t("all_affiliate_referrals_and_commissions_managed")}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <DataTable
                  key={`affiliate-referrals-${user.id}`}
                  apiEndpoint="/api/admin/affiliate/referral"
                  model="affiliateReferral"
                  modelConfig={{
                    userId: user.id,
                  }}
                  columns={userAffiliateReferralColumns}
                  permissions={{
                    access: "access.affiliate.referral",
                    view: "view.affiliate.referral",
                    create: "create.affiliate.referral",
                    edit: "edit.affiliate.referral",
                    delete: "delete.affiliate.referral",
                  }}
                  canView={true}
                  canEdit={true}
                  canDelete={true}
                  pageSize={12}
                  isParanoid={false}
                />
              </CardContent>
            </Card>
          </TabsContent>

          {/* Ecommerce Tab */}
          <TabsContent value="ecommerce" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>{t("ecommerce_orders")}</CardTitle>
                <CardDescription>
                  {t("all_e_commerce_orders_placed_by")}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <DataTable
                  key={`ecommerce-orders-${user.id}`}
                  apiEndpoint="/api/admin/ecommerce/order"
                  model="ecommerceOrder"
                  modelConfig={{
                    userId: user.id,
                  }}
                  columns={userEcommerceOrderColumns}
                  permissions={{
                    access: "access.ecommerce.order",
                    view: "view.ecommerce.order",
                    create: "create.ecommerce.order",
                    edit: "edit.ecommerce.order",
                    delete: "delete.ecommerce.order",
                  }}
                  canView={true}
                  canEdit={true}
                  canDelete={true}
                  pageSize={12}
                  isParanoid={false}
                />
              </CardContent>
            </Card>
          </TabsContent>

          {/* Enhanced Activity Tab */}
          <TabsContent value="activity" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>{t("account_activity")}</CardTitle>
                  <CardDescription>
                    {t("user_account_activity_and_session_information")}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex justify-between items-center p-4 border rounded-lg">
                  <div>
                      <h4 className="font-medium">{tDashboard("account_status")}</h4>
                      <p className="text-sm text-muted-foreground">{t("current_account_state")}</p>
                    </div>
                    <Badge variant={getStatusColor(user.status)} className="text-sm">
                      {user.status}
                    </Badge>
                  </div>
                  
                  <div className="flex justify-between items-center p-4 border rounded-lg">
                    <div>
                      <h4 className="font-medium">{tCommon("last_login")}</h4>
                    <p className="text-sm text-muted-foreground">
                        {user.lastLogin ? formatDateTime(user.lastLogin) : 'Never logged in'}
                    </p>
                  </div>
                    <Badge variant="outline">
                      {user.lastLogin ? formatRelativeTime(user.lastLogin) : 'Never'}
                  </Badge>
                </div>
                  
                  <div className="flex justify-between items-center p-4 border rounded-lg">
                    <div>
                      <h4 className="font-medium">{t("account_created")}</h4>
                      <p className="text-sm text-muted-foreground">{formatDateTime(user.createdAt)}</p>
                    </div>
                    <Badge variant="outline">
                      {userStats?.accountAge}
                    </Badge>
            </div>
          </CardContent>
        </Card>

              <Card>
                <CardHeader>
                  <CardTitle>{t("administrative_actions")}</CardTitle>
                  <CardDescription>
                    {t("available_admin_controls_for_this_user_account")}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex justify-between items-center p-4 border rounded-lg">
                    <div>
                      <h4 className="font-medium">{t("account_control")}</h4>
                      <p className="text-sm text-muted-foreground">{t("block_or_unblock_user_account_access")}</p>
                    </div>
                    <div className="space-x-2">
                      {isBlocked ? (
                        <Button variant="outline" onClick={handleUnblockUser} disabled={isLoading}>
                          <ShieldOff className="h-4 w-4 mr-2" />
                          Unblock
                        </Button>
                      ) : (
                        <Button variant="destructive" onClick={() => setIsBlockDialogOpen(true)} disabled={isLoading}>
                          <Shield className="h-4 w-4 mr-2" />
                          Block
                        </Button>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex justify-between items-center p-4 border rounded-lg">
                    <div>
                      <h4 className="font-medium">{t("data_export")}</h4>
                      <p className="text-sm text-muted-foreground">{t("export_user_data_and_transaction_history")}</p>
                    </div>
                    <Button variant="outline" size="sm">
                      <Download className="h-4 w-4 mr-2" />
                      Export
                    </Button>
                  </div>
                  
                  <div className="flex justify-between items-center p-4 border rounded-lg">
                    <div>
                      <h4 className="font-medium">{t("account_notes")}</h4>
                      <p className="text-sm text-muted-foreground">{t("add_administrative_notes")}</p>
                    </div>
                    <Button variant="outline" size="sm">
                      <Edit className="h-4 w-4 mr-2" />
                      {tCommon("add_note")}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>

      {/* Enhanced Block User Dialog */}
      <Dialog open={isBlockDialogOpen} onOpenChange={setIsBlockDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="text-red-600 flex items-center">
              <Shield className="h-5 w-5 mr-2" />
              {t("block_user_account")}
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-6">
            <div className="p-4 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 rounded-lg">
              <div className="flex items-center space-x-2">
                <AlertTriangle className="h-4 w-4 text-red-600" />
                <p className="text-sm text-red-800 dark:text-red-200">
                  {t("this_action_will_prevent_the_user")}
                </p>
              </div>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label>{t("block_type")}</Label>
                <div className="flex items-center space-x-2 p-3 border rounded-lg">
                  <Switch
                    checked={isTemporaryBlock}
                    onCheckedChange={setIsTemporaryBlock}
                  />
                  <Label>{t("temporary_block_auto_unblock_after_duration")} ({t("auto_unblock_after_duration")})</Label>
                </div>
              </div>

              {isTemporaryBlock && (
                <div className="space-y-2">
                  <Label>Duration</Label>
                  <Select 
                    value={blockDuration.toString()} 
                    onValueChange={(value) => setBlockDuration(parseInt(value))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {DURATION_OPTIONS.map((option) => (
                        <SelectItem key={option.value} value={option.value.toString()}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              <div className="space-y-2">
                <Label>{t("reason_for_block")}</Label>
                <Select value={blockReason} onValueChange={setBlockReason}>
                  <SelectTrigger>
                    <SelectValue placeholder={tCommon("select_a_reason")} />
                  </SelectTrigger>
                  <SelectContent>
                    {BLOCK_REASONS.map((reason) => (
                      <SelectItem key={reason} value={reason}>
                        {reason}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {blockReason === "Other" && (
                <div className="space-y-2">
                  <Label>{t("custom_reason")}</Label>
                  <Textarea
                    value={customReason}
                    onChange={(e) => setCustomReason(e.target.value)}
                    placeholder={t("enter_detailed_reason_for_blocking_this")}
                    rows={3}
                  />
                </div>
              )}
            </div>

            <div className="flex justify-end space-x-2">
              <Button variant="outline" onClick={() => setIsBlockDialogOpen(false)}>
                Cancel
              </Button>
              <Button 
                variant="destructive" 
                onClick={handleBlockUser}
                disabled={isLoading || !blockReason}
              >
                {isLoading ? (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    {t("blocking_ellipsis")}
                  </>
                ) : (
                  <>
                    <Ban className="h-4 w-4 mr-2" />
                    {t("block_user")}
                  </>
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
} 