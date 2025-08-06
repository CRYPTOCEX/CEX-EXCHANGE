"use client";

import { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import { $fetch } from "@/lib/api";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Checkbox } from "@/components/ui/checkbox";
import { Link } from "@/i18n/routing";
import { toast } from "sonner";
import {
  CheckCircle2,
  Circle,
  AlertCircle,
  Info,
  ArrowRight,
  Building2,
  Settings,
  Package,
  Users,
  Rocket,
  Monitor,
  Crown,
  Zap,
  Shield,
  Coins,
  TrendingUp,
  Eye,
  BookOpen,
  Target,
  Timer,
  Star,
  Workflow
} from "lucide-react";

interface OnboardingTask {
  id: string;
  title: string;
  description: string;
  importance: string;
  estimatedTime: string;
  category: string;
  priority: "critical" | "important" | "optional";
  completed: boolean;
  actionUrl?: string;
  actionText?: string;
  requirements?: string[];
  tips?: string[];
}

interface OnboardingPhase {
  id: string;
  title: string;
  description: string;
  icon: any;
  color: string;
  tasks: OnboardingTask[];
}

export default function NFTAdminOnboardingClient() {
  const t = useTranslations("ext");
  const [phases, setPhases] = useState<OnboardingPhase[]>([]);
  const [loading, setLoading] = useState(true);
  const [completedTasks, setCompletedTasks] = useState<Set<string>>(new Set());
  const [currentPhase, setCurrentPhase] = useState("infrastructure");

  useEffect(() => {
    initializeOnboarding();
    loadProgress();
  }, []);

  const initializeOnboarding = () => {
    const onboardingPhases: OnboardingPhase[] = [
      {
        id: "infrastructure",
        title: "Infrastructure Setup",
        description: "Deploy and configure your marketplace foundation",
        icon: Building2,
        color: "bg-blue-500",
        tasks: [
          {
            id: "deploy-eth-marketplace",
            title: "Deploy Ethereum Marketplace Contract",
            description: "Deploy your primary marketplace contract to Ethereum mainnet",
            importance: "Critical foundation for your NFT marketplace. Ethereum provides the highest liquidity and user base.",
            estimatedTime: "10-15 minutes",
            category: "Blockchain",
            priority: "critical",
            completed: false,
            actionUrl: "/admin/nft/marketplace",
            actionText: "Deploy Contract",
            requirements: [
              "Ethereum wallet with sufficient ETH for gas fees (~0.05 ETH)",
              "Master wallet configured in system settings"
            ],
            tips: [
              "Start with 2.5% marketplace fee as industry standard",
              "Use a dedicated treasury wallet for fee collection",
              "Deploy during low gas periods (weekends/nights UTC)"
            ]
          },
          {
            id: "deploy-secondary-chains",
            title: "Deploy to Secondary Chains",
            description: "Deploy marketplace contracts to BSC, Polygon, Arbitrum for broader reach",
            importance: "Expands your market reach and provides cheaper alternatives for users. 80% of NFT volume comes from multi-chain support.",
            estimatedTime: "20-30 minutes",
            category: "Blockchain",
            priority: "important",
            completed: false,
            actionUrl: "/admin/nft/marketplace",
            actionText: "Deploy Multi-Chain",
            requirements: [
              "Native tokens for each chain (BNB, MATIC, ETH for L2s)",
              "Same fee structure across all chains for consistency"
            ],
            tips: [
              "Deploy in order: BSC → Polygon → Arbitrum → Optimism",
              "Use same fee recipient address across all chains",
              "Test with small amounts first"
            ]
          },
          {
            id: "verify-blockchain-health",
            title: "Verify Blockchain Integration Health",
            description: "Ensure all marketplace contracts are responding and RPC connections are stable",
            importance: "Prevents user frustration and failed transactions. Healthy blockchain integration is crucial for marketplace reliability.",
            estimatedTime: "5-10 minutes",
            category: "Monitoring",
            priority: "critical",
            completed: false,
            actionUrl: "/admin/nft/marketplace",
            actionText: "Check Health",
            requirements: [
              "All marketplace contracts deployed",
              "RPC endpoints configured and responding"
            ],
            tips: [
              "Check contract balances are zero initially",
              "Verify fee percentages match across chains",
              "Test gas estimation functionality"
            ]
          }
        ]
      },
      {
        id: "configuration",
        title: "Marketplace Configuration",
        description: "Configure marketplace settings, fees, and policies",
        icon: Settings,
        color: "bg-purple-500",
        tasks: [
          {
            id: "configure-marketplace-fees",
            title: "Configure Marketplace Fees",
            description: "Set optimal marketplace fee rates and recipient addresses",
            importance: "Directly impacts your revenue. Well-optimized fees balance profitability with user attraction. Industry standard is 2.5%.",
            estimatedTime: "15-20 minutes",
            category: "Financial",
            priority: "critical",
            completed: false,
            actionUrl: "/admin/nft/settings",
            actionText: "Configure Fees",
            requirements: [
              "Treasury wallet address for fee collection",
              "Market research on competitor pricing"
            ],
            tips: [
              "Start with 2.5% marketplace fee (industry standard)",
              "Set maximum royalty at 10% to attract creators",
              "Consider dynamic fees based on transaction volume",
              "Use multi-signature wallet for fee collection"
            ]
          },
          {
            id: "setup-payment-methods",
            title: "Configure Payment Methods",
            description: "Enable cryptocurrency payment options and set up payment processing",
            importance: "More payment options = higher conversion rates. Support for popular cryptocurrencies increases user adoption by 40%.",
            estimatedTime: "10-15 minutes",
            category: "Financial",
            priority: "important",
            completed: false,
            actionUrl: "/admin/nft/settings",
            actionText: "Setup Payments",
            requirements: [
              "Supported cryptocurrency list",
              "Price oracle integration for USD conversion"
            ],
            tips: [
              "Enable ETH, WETH, USDC, USDT as minimum",
              "Add native tokens for each chain (BNB, MATIC)",
              "Set minimum listing prices to prevent spam"
            ]
          },
          {
            id: "configure-gas-settings",
            title: "Configure Gas Optimization",
            description: "Set up gas estimation and optimization settings for better user experience",
            importance: "High gas costs are the #1 barrier to NFT adoption. Good gas management improves user satisfaction and reduces failed transactions.",
            estimatedTime: "10-15 minutes",
            category: "Technical",
            priority: "important",
            completed: false,
            actionUrl: "/admin/nft/settings",
            actionText: "Configure Gas",
            requirements: [
              "RPC provider connections",
              "Gas tracking service integration"
            ],
            tips: [
              "Enable gas optimization features",
              "Set up gas price alerts for users",
              "Configure automatic gas estimation",
              "Implement batching for multiple operations"
            ]
          },
          {
            id: "setup-content-policies",
            title: "Establish Content Policies",
            description: "Define content moderation rules, DMCA procedures, and community guidelines",
            importance: "Protects your platform from legal issues and maintains quality standards. Clear policies reduce disputes by 60%.",
            estimatedTime: "30-45 minutes",
            category: "Legal",
            priority: "critical",
            completed: false,
            actionUrl: "/admin/nft/settings",
            actionText: "Setup Policies",
            requirements: [
              "Legal consultation on content policies",
              "DMCA takedown procedure documentation"
            ],
            tips: [
              "Prohibit copyrighted content without permission",
              "Ban explicit content unless age-gated",
              "Require creator identity verification for high-value items",
              "Implement automated content scanning"
            ]
          }
        ]
      },
      {
        id: "content",
        title: "Content Management",
        description: "Set up collections, categories, and content organization",
        icon: Package,
        color: "bg-green-500",
        tasks: [
          {
            id: "create-categories",
            title: "Create NFT Categories",
            description: "Set up comprehensive category system for NFT organization",
            importance: "Good categorization improves discoverability by 300%. Users find relevant NFTs faster, leading to more sales.",
            estimatedTime: "20-30 minutes",
            category: "Content",
            priority: "important",
            completed: false,
            actionUrl: "/admin/nft/category",
            actionText: "Manage Categories",
            requirements: [
              "Market research on popular NFT types",
              "Category icon assets prepared"
            ],
            tips: [
              "Start with: Art, Gaming, Music, Sports, Photography, Collectibles",
              "Use clear, recognizable category names",
              "Add subcategories for popular types (Digital Art, Pixel Art, etc.)",
              "Include trending categories like AI Art, Utility NFTs"
            ]
          },
          {
            id: "approve-first-collections",
            title: "Approve Initial Collections",
            description: "Review and approve the first batch of NFT collections for marketplace launch",
            importance: "Quality first impressions are crucial. Well-curated launch collections establish your marketplace's reputation and attract more creators.",
            estimatedTime: "45-60 minutes",
            category: "Curation",
            priority: "important",
            completed: false,
            actionUrl: "/admin/nft/collection",
            actionText: "Review Collections",
            requirements: [
              "Collection review criteria established",
              "Quality assessment checklist"  
            ],
            tips: [
              "Start with 10-20 high-quality collections",
              "Verify creator authenticity and portfolio",
              "Check for originality and copyright compliance",
              "Balance different art styles and price points"
            ]
          },
          {
            id: "setup-featured-content",
            title: "Configure Featured Content",
            description: "Set up homepage featured collections and trending algorithms",
            importance: "Featured content drives 40% of marketplace traffic. Strategic featuring increases sales for promoted collections by 250%.",
            estimatedTime: "25-35 minutes",
            category: "Marketing",
            priority: "important",
            completed: false,
            actionUrl: "/admin/nft/collection",
            actionText: "Feature Collections",
            requirements: [
              "Analytics system for tracking performance",
              "Featured content rotation schedule"
            ],
            tips: [
              "Rotate featured collections weekly",
              "Feature diverse art styles and price ranges",
              "Promote new and established creators equally",
              "Use data-driven featuring based on engagement"
            ]
          }
        ]
      },
      {
        id: "users",
        title: "User Management",
        description: "Configure user roles, creator verification, and community features",
        icon: Users,
        color: "bg-orange-500",
        tasks: [
          {
            id: "setup-creator-verification",
            title: "Establish Creator Verification Program",
            description: "Create verification criteria and process for authenticating creators",
            importance: "Verified creators generate 3x more sales than unverified ones. Verification builds trust and reduces fraud by 85%.",
            estimatedTime: "40-50 minutes",
            category: "Trust & Safety",
            priority: "critical",
            completed: false,
            actionUrl: "/admin/nft/creator",
            actionText: "Setup Verification",
            requirements: [
              "Verification criteria document",
              "Identity verification process",
              "Portfolio review guidelines"
            ],
            tips: [
              "Require social media verification (Twitter, Instagram)",
              "Check portfolio consistency across platforms",
              "Verify identity for high-value creators",
              "Create tiered verification (Basic, Premium, Elite)"
            ]
          },
          {
            id: "configure-user-roles",
            title: "Configure User Roles & Permissions",
            description: "Set up user role hierarchy and administrative permissions",
            importance: "Proper role management prevents security breaches and enables efficient team management. Clear permissions reduce errors by 70%.",
            estimatedTime: "20-30 minutes",
            category: "Security",
            priority: "important",
            completed: false,
            actionUrl: "/admin/user",
            actionText: "Manage Roles",
            requirements: [
              "Team structure planning",
              "Permission matrix documentation"
            ],
            tips: [
              "Create roles: Super Admin, Admin, Moderator, Support",
              "Limit Super Admin access to 1-2 people",
              "Give moderators collection approval rights only",
              "Enable activity logging for all admin actions"
            ]
          },
          {
            id: "setup-kyc-system",
            title: "Configure KYC/Identity Verification",
            description: "Set up Know Your Customer procedures for high-value transactions",
            importance: "KYC compliance is required for large transactions in many jurisdictions. Prevents money laundering and builds institutional trust.",
            estimatedTime: "30-40 minutes",
            category: "Compliance",
            priority: "important",
            completed: false,
            actionUrl: "/admin/kyc",
            actionText: "Setup KYC",
            requirements: [
              "KYC service provider integration",
              "Legal compliance requirements research"
            ],
            tips: [
              "Require KYC for transactions > $10,000",
              "Use automated document verification when possible",
              "Store KYC data securely and encrypted",
              "Implement regular KYC status reviews"
            ]
          }
        ]
      },
      {
        id: "launch",
        title: "Launch Preparation",
        description: "Final testing, monitoring setup, and go-live preparation",
        icon: Rocket,
        color: "bg-red-500",
        tasks: [
          {
            id: "conduct-full-testing",
            title: "Conduct Comprehensive Testing",
            description: "Test all marketplace functions: minting, listing, buying, transfers",
            importance: "Bugs in production can cost thousands in lost transactions and damage reputation. Thorough testing prevents 90% of launch issues.",
            estimatedTime: "2-3 hours",
            category: "Testing",
            priority: "critical",
            completed: false,
            actionUrl: "/admin/nft",
            actionText: "Start Testing",
            requirements: [
              "Test wallet with funds on all chains",
              "Test NFT collections prepared",
              "Testing checklist prepared"
            ],
            tips: [
              "Test complete user journey: register → mint → list → buy",
              "Try edge cases: high gas fees, network congestion",
              "Test on all supported chains and devices",
              "Verify all payment methods work correctly"
            ]
          },
          {
            id: "setup-monitoring",
            title: "Configure Monitoring & Alerts",
            description: "Set up system monitoring, error tracking, and performance alerts",
            importance: "Early detection of issues prevents user frustration and revenue loss. Good monitoring reduces downtime by 80%.",
            estimatedTime: "45-60 minutes",
            category: "Operations",
            priority: "critical",
            completed: false,
            actionUrl: "/admin/nft/analytics",
            actionText: "Setup Monitoring",
            requirements: [
              "Error tracking service account",
              "Performance monitoring tools",
              "Alert notification channels"
            ],
            tips: [
              "Monitor blockchain connection health",
              "Set alerts for failed transactions > 5%",
              "Track gas estimation accuracy",
              "Monitor marketplace contract balances"
            ]
          },
          {
            id: "prepare-launch-content",
            title: "Prepare Launch Marketing Content",
            description: "Create launch announcements, tutorials, and promotional materials",
            importance: "Strong launch marketing determines initial adoption. Good launch content increases day-1 registrations by 400%.",
            estimatedTime: "60-90 minutes",
            category: "Marketing",
            priority: "important",
            completed: false,
            actionUrl: "/admin/nft",
            actionText: "Review Content",
            requirements: [
              "Marketing materials prepared",
              "Tutorial videos created",
              "Social media accounts ready"
            ],
            tips: [
              "Create step-by-step user guides",
              "Prepare FAQ addressing common questions",
              "Design eye-catching launch graphics",
              "Plan social media announcement schedule"
            ]
          },
          {
            id: "backup-and-security",
            title: "Configure Backup & Security Measures",
            description: "Set up data backups, security measures, and disaster recovery",
            importance: "Data loss or security breaches can destroy a marketplace. Proper security measures prevent 95% of potential attacks.",
            estimatedTime: "30-45 minutes",
            category: "Security",
            priority: "critical",
            completed: false,
            actionUrl: "/admin/nft/settings",
            actionText: "Configure Security",
            requirements: [
              "Backup storage system",
              "Security audit checklist",
              "Emergency response procedures"
            ],
            tips: [
              "Enable 2FA for all admin accounts",
              "Set up automated database backups",
              "Create emergency pause procedures",
              "Document recovery procedures"
            ]
          }
        ]
      },
      {
        id: "operations",
        title: "Ongoing Operations",
        description: "Daily maintenance, community management, and growth optimization",
        icon: Monitor,
        color: "bg-indigo-500",
        tasks: [
          {
            id: "daily-health-checks",
            title: "Establish Daily Health Checks",
            description: "Create routine for monitoring marketplace health and performance",
            importance: "Regular monitoring prevents small issues from becoming major problems. Daily checks reduce critical incidents by 60%.",
            estimatedTime: "15-20 minutes daily",
            category: "Maintenance",
            priority: "important",
            completed: false,
            actionUrl: "/admin/nft/analytics",
            actionText: "View Dashboard",
            requirements: [
              "Monitoring dashboard access",
              "Health check checklist",
              "Alert response procedures"
            ],
            tips: [
              "Check transaction success rates",
              "Monitor gas estimation accuracy",
              "Review new collection submissions",
              "Track revenue and fee collection"
            ]
          },
          {
            id: "community-moderation",
            title: "Set Up Community Moderation",
            description: "Establish content moderation workflow and community management",
            importance: "Active moderation maintains marketplace quality and safety. Well-moderated platforms have 50% higher user retention.",
            estimatedTime: "30-45 minutes setup",
            category: "Community",
            priority: "important",
            completed: false,
            actionUrl: "/admin/nft/review",
            actionText: "Setup Moderation",
            requirements: [
              "Moderation team hired/assigned",
              "Moderation guidelines documented",
              "Escalation procedures established"
            ],
            tips: [
              "Review new collections within 24 hours",
              "Respond to reports within 48 hours",
              "Maintain clear communication with creators",
              "Use automated tools for initial screening"
            ]
          },
          {
            id: "analytics-and-optimization",
            title: "Configure Analytics & Optimization",
            description: "Set up data tracking for continuous marketplace improvement",
            importance: "Data-driven decisions improve marketplace performance by 200%. Analytics help identify growth opportunities and user pain points.",
            estimatedTime: "40-60 minutes",
            category: "Growth",
            priority: "important",
            completed: false,
            actionUrl: "/admin/nft/analytics",
            actionText: "Setup Analytics",
            requirements: [
              "Analytics tools configured",
              "KPI tracking dashboard",
              "Regular reporting schedule"
            ],
            tips: [
              "Track user acquisition and retention",
              "Monitor sales conversion rates",
              "Analyze popular categories and price points",
              "Measure creator satisfaction and activity"
            ]
          }
        ]
      }
    ];

    setPhases(onboardingPhases);
    setLoading(false);
  };

  const loadProgress = () => {
    // Load from localStorage or API
    const saved = localStorage.getItem('nft-admin-onboarding-progress');
    if (saved) {
      try {
        const progress = JSON.parse(saved);
        setCompletedTasks(new Set(progress));
      } catch (e) {
        console.error('Failed to load onboarding progress:', e);
      }
    }
  };

  const saveProgress = (newCompletedTasks: Set<string>) => {
    localStorage.setItem('nft-admin-onboarding-progress', JSON.stringify([...newCompletedTasks]));
  };

  const toggleTask = (taskId: string) => {
    const newCompleted = new Set(completedTasks);
    if (newCompleted.has(taskId)) {
      newCompleted.delete(taskId);
    } else {
      newCompleted.add(taskId);
      toast.success("Task marked as completed!");
    }
    setCompletedTasks(newCompleted);
    saveProgress(newCompleted);
  };

  const getPhaseProgress = (phase: OnboardingPhase) => {
    const completed = phase.tasks.filter(task => completedTasks.has(task.id)).length;
    return (completed / phase.tasks.length) * 100;
  };

  const getTotalProgress = () => {
    const totalTasks = phases.reduce((sum, phase) => sum + phase.tasks.length, 0);
    const completedCount = completedTasks.size;
    return totalTasks > 0 ? (completedCount / totalTasks) * 100 : 0;
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "critical": return "text-red-600 border-red-200 bg-red-50";
      case "important": return "text-orange-600 border-orange-200 bg-orange-50";
      case "optional": return "text-blue-600 border-blue-200 bg-blue-50";
      default: return "text-gray-600 border-gray-200 bg-gray-50";
    }
  };

  const getEstimatedTimeRemaining = () => {
    const incompleteTasks = phases.flatMap(phase => phase.tasks).filter(task => !completedTasks.has(task.id));
    const totalMinutes = incompleteTasks.reduce((sum, task) => {
      const time = task.estimatedTime;
      const minutes = time.includes('hour') 
        ? parseInt(time) * 60 
        : parseInt(time);
      return sum + minutes;
    }, 0);
    
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    return hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold">NFT Admin Onboarding</h1>
        </div>
        <div className="animate-pulse space-y-4">
      {[...Array(3)].map((_, i) => (
        <Card key={i}>
          <CardHeader>
            <div className="h-6 bg-muted rounded w-1/3" />
            <div className="h-4 bg-muted rounded w-2/3" />
          </CardHeader>
          <CardContent>
            <div className="h-20 bg-muted rounded" />
          </CardContent>
        </Card>
      ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">NFT Admin Onboarding</h1>
          <p className="text-muted-foreground">
            Complete setup guide to get your NFT marketplace fully operational
          </p>
        </div>
        <div className="text-right">
          <div className="text-2xl font-bold text-primary">{Math.round(getTotalProgress())}%</div>
          <p className="text-sm text-muted-foreground">
            {completedTasks.size} of {phases.reduce((sum, phase) => sum + phase.tasks.length, 0)} tasks
          </p>
        </div>
      </div>

      {/* Progress Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5" />
            Setup Progress Overview
          </CardTitle>
          <CardDescription>
            Track your progress through the complete NFT marketplace setup
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Overall Progress</span>
              <span>{Math.round(getTotalProgress())}%</span>
            </div>
            <Progress value={getTotalProgress()} className="h-2" />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>{completedTasks.size} completed</span>
              <span>Est. {getEstimatedTimeRemaining()} remaining</span>
            </div>
          </div>

          <div className="grid gap-2 md:grid-cols-2 lg:grid-cols-3">
            {phases.map((phase) => {
              const Icon = phase.icon;
              const progress = getPhaseProgress(phase);
              const isActive = currentPhase === phase.id;
              
              return (
                <div
                  key={phase.id}
                  className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                    isActive ? "border-primary bg-primary/5" : "border-border hover:bg-muted/50"
                  }`}
                  onClick={() => setCurrentPhase(phase.id)}
                >
                  <div className="flex items-center gap-2 mb-2">
                    <div className={`p-1 rounded ${phase.color} text-white`}>
                      <Icon className="h-4 w-4" />
                    </div>
                    <span className="font-medium text-sm">{phase.title}</span>
                  </div>
                  <Progress value={progress} className="h-1 mb-1" />
                  <p className="text-xs text-muted-foreground">
                    {phase.tasks.filter(t => completedTasks.has(t.id)).length}/{phase.tasks.length} tasks
                  </p>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Phase Tasks */}
      <Tabs value={currentPhase} onValueChange={setCurrentPhase}>
        <TabsList className="grid w-full grid-cols-6">
          {phases.map((phase) => {
            const Icon = phase.icon;
            return (
              <TabsTrigger key={phase.id} value={phase.id} className="flex items-center gap-1">
                <Icon className="h-4 w-4" />
                <span className="hidden sm:inline">{phase.title}</span>
              </TabsTrigger>
            );
          })}
        </TabsList>

        {phases.map((phase) => (
          <TabsContent key={phase.id} value={phase.id} className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <phase.icon className="h-5 w-5" />
                  {phase.title}
                </CardTitle>
                <CardDescription>{phase.description}</CardDescription>
                <div className="flex items-center gap-4">
                  <Progress value={getPhaseProgress(phase)} className="flex-1 h-2" />
                  <span className="text-sm font-medium">
                    {Math.round(getPhaseProgress(phase))}%
                  </span>
                </div>
              </CardHeader>
            </Card>

            <div className="space-y-4">
              {phase.tasks.map((task) => {
                const isCompleted = completedTasks.has(task.id);
                
                return (
                  <Card key={task.id} className={`transition-all ${isCompleted ? "opacity-75 bg-green-50/50 border-green-200" : ""}`}>
                    <CardHeader>
                      <div className="flex items-start gap-3">
                        <Checkbox
                          checked={isCompleted}
                          onCheckedChange={() => toggleTask(task.id)}
                          className="mt-1"
                        />
                        <div className="flex-1 space-y-2">
                          <div className="flex items-center gap-2">
                            <CardTitle className={`text-lg ${isCompleted ? "line-through text-muted-foreground" : ""}`}>
                              {task.title}
                            </CardTitle>
                            <Badge variant="outline" className={getPriorityColor(task.priority)}>
                              {task.priority}
                            </Badge>
                          </div>
                          <CardDescription className="text-sm">
                            {task.description}
                          </CardDescription>
                          
                          <div className="flex items-center gap-4 text-xs text-muted-foreground">
                            <div className="flex items-center gap-1">
                              <Timer className="h-3 w-3" />
                              {task.estimatedTime}
                            </div>
                            <div className="flex items-center gap-1">
                              <Workflow className="h-3 w-3" />
                              {task.category}
                            </div>
                          </div>
                        </div>
                        
                        {task.actionUrl && (
                          <Link href={task.actionUrl}>
                            <Button variant="outline" size="sm">
                              {task.actionText}
                              <ArrowRight className="h-3 w-3 ml-1" />
                            </Button>
                          </Link>
                        )}
                      </div>
                    </CardHeader>
                    
                    <CardContent className="pt-0">
                      <Alert>
                        <Info className="h-4 w-4" />
                        <AlertDescription className="text-sm">
                          <strong>Why this matters:</strong> {task.importance}
                        </AlertDescription>
                      </Alert>
                      
                      {task.requirements && (
                        <div className="mt-3">
                          <h4 className="font-medium text-sm mb-2">Requirements:</h4>
                          <ul className="text-sm text-muted-foreground space-y-1">
                            {task.requirements.map((req, index) => (
                              <li key={index} className="flex items-start gap-2">
                                <Circle className="h-3 w-3 mt-0.5 flex-shrink-0" />
                                {req}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                      
                      {task.tips && (
                        <div className="mt-3">
                          <h4 className="font-medium text-sm mb-2">💡 Pro Tips:</h4>
                          <ul className="text-sm text-muted-foreground space-y-1">
                            {task.tips.map((tip, index) => (
                              <li key={index} className="flex items-start gap-2">
                                <Star className="h-3 w-3 mt-0.5 flex-shrink-0 text-yellow-500" />
                                {tip}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </TabsContent>
        ))}
      </Tabs>

      {/* Quick Actions */}
      {getTotalProgress() < 100 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Zap className="h-5 w-5" />
              Next Recommended Actions
            </CardTitle>
            <CardDescription>
              Focus on these high-priority tasks to get your marketplace operational quickly
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 md:grid-cols-2">
              {phases
                .flatMap(phase => phase.tasks)
                .filter(task => !completedTasks.has(task.id) && task.priority === "critical")
                .slice(0, 4)
                .map((task) => (
                  <div key={task.id} className="p-3 border rounded-lg bg-red-50/50 border-red-200">
                    <div className="flex items-center gap-2 mb-1">
                      <AlertCircle className="h-4 w-4 text-red-600" />
                      <span className="font-medium text-sm">{task.title}</span>
                    </div>
                    <p className="text-xs text-muted-foreground mb-2">{task.description}</p>
                    {task.actionUrl && (
                      <Link href={task.actionUrl}>
                        <Button size="sm" variant="outline" className="h-7 text-xs">
                          {task.actionText}
                        </Button>
                      </Link>
                    )}
                  </div>
                ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Completion Celebration */}
      {getTotalProgress() === 100 && (
        <Card className="border-green-200 bg-green-50">
          <CardContent className="pt-6">
            <div className="text-center space-y-4">
              <div className="mx-auto w-16 h-16 bg-green-500 rounded-full flex items-center justify-center">
                <CheckCircle2 className="h-8 w-8 text-white" />
              </div>
              <div>
                <h3 className="text-2xl font-bold text-green-800">Congratulations! 🎉</h3>
                <p className="text-green-700 mt-2">
                  Your NFT marketplace is fully configured and ready for launch!
                </p>
              </div>
              <div className="flex gap-2 justify-center">
                <Link href="/nft">
                  <Button className="bg-green-600 hover:bg-green-700">
                    <Eye className="h-4 w-4 mr-2" />
                    View Live Marketplace
                  </Button>
                </Link>
                <Link href="/admin/nft">
                  <Button variant="outline">
                    <Monitor className="h-4 w-4 mr-2" />
                    Admin Dashboard
                  </Button>
                </Link>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}