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
  Workflow,
  ChevronDown
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
  const [expandedTasks, setExpandedTasks] = useState<Set<string>>(new Set());

  useEffect(() => {
    const init = async () => {
      initializeOnboarding();
      await fetchRealProgress();
    };
    init();
  }, []);

  const fetchRealProgress = async () => {
    try {
      const response = await $fetch({
        url: "/api/nft/onboarding/status",
        method: "GET",
        silent: true
      });

      console.log('Onboarding progress response:', response);

      // Handle both response.data and direct response
      const data = response?.data || response;

      if (data && data.completedTasks) {
        const realCompleted = new Set<string>(data.completedTasks as string[]);

        // Use only backend data - all tasks are now auto-detectable
        // No need to merge localStorage since we removed manual testing tasks
        console.log('Completed tasks:', Array.from(realCompleted));
        setCompletedTasks(realCompleted);
        saveProgress(realCompleted);
      }
    } catch (error) {
      console.error('Failed to fetch real onboarding progress:', error);
      // Fall back to localStorage only
      loadProgress();
    }
  };

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
            id: "deploy-primary-marketplace",
            title: "Deploy Primary Marketplace Contract",
            description: "Deploy your first marketplace contract to any supported blockchain (ETH, BSC, Polygon, Arbitrum, etc.)",
            importance: "Critical foundation for your NFT marketplace. Choose the chain that best fits your target audience and budget.",
            estimatedTime: "10-15 minutes",
            category: "Blockchain",
            priority: "critical",
            completed: false,
            actionUrl: "/admin/nft/marketplace",
            actionText: "Deploy Contract",
            requirements: [
              "Wallet with native tokens for gas fees on your chosen chain",
              "Master wallet configured in system settings"
            ],
            tips: [
              "BSC and Polygon offer lower gas fees for testing and early launch",
              "Ethereum provides highest liquidity but higher gas costs",
              "Start with 2.5% marketplace fee as industry standard",
              "Use a dedicated treasury wallet for fee collection"
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
        description: "Configure marketplace settings and content policies",
        icon: Settings,
        color: "bg-purple-500",
        tasks: [
          {
            id: "configure-trading-settings",
            title: "Configure Trading Settings",
            description: "Enable auction features, offers, and configure bidding rules",
            importance: "Trading flexibility increases marketplace activity. Auctions can increase final sale prices by 30-50%.",
            estimatedTime: "10-15 minutes",
            category: "Trading",
            priority: "important",
            completed: false,
            actionUrl: "/admin/nft/settings",
            actionText: "Configure Trading",
            requirements: [
              "Understand different sale types (fixed price, auctions, offers)"
            ],
            tips: [
              "Enable both fixed price sales and auctions for flexibility",
              "Set reasonable auction durations (24h-7d)",
              "Configure anti-snipe extension to prevent last-second bids",
              "Set minimum bid increments to prevent spam bidding"
            ]
          },
          {
            id: "setup-content-policies",
            title: "Configure Content Settings",
            description: "Set file size limits, supported formats, and content moderation rules",
            importance: "Proper content policies protect your platform and ensure quality standards.",
            estimatedTime: "15-20 minutes",
            category: "Content",
            priority: "important",
            completed: false,
            actionUrl: "/admin/nft/settings",
            actionText: "Configure Content",
            requirements: [
              "Storage capacity planning",
              "Content moderation strategy"
            ],
            tips: [
              "Set max file size based on your storage (100MB is standard)",
              "Support common formats: JPG, PNG, GIF, MP4, MP3, WebP",
              "Enable content moderation to filter inappropriate content",
              "Enable IPFS storage for decentralized hosting"
            ]
          },
          {
            id: "configure-verification",
            title: "Configure Creator Verification",
            description: "Set up creator verification requirements and KYC rules",
            importance: "Verified creators build trust and reduce fraud. Consider KYC for high-value transactions.",
            estimatedTime: "10-15 minutes",
            category: "Trust & Safety",
            priority: "important",
            completed: false,
            actionUrl: "/admin/nft/settings",
            actionText: "Configure Verification",
            requirements: [
              "Verification badge system understanding",
              "KYC requirements (if enabled)"
            ],
            tips: [
              "Enable verification badges to highlight trusted creators",
              "Require manual review for new creators initially",
              "Configure KYC for high-value sales (if KYC enabled)",
              "Don't auto-verify creators unless you trust the source"
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
            description: "Create at least 2 categories to organize NFTs on your marketplace",
            importance: "Categories help users discover NFTs. Start with basic categories relevant to your marketplace focus.",
            estimatedTime: "10-15 minutes",
            category: "Content",
            priority: "important",
            completed: false,
            actionUrl: "/admin/nft/category",
            actionText: "Manage Categories",
            requirements: [
              "At least 2 categories created"
            ],
            tips: [
              "Popular categories: Art, Gaming, Music, Sports, Photography, Collectibles",
              "Use clear, simple category names",
              "Add category descriptions to help users",
              "You can add more categories as your marketplace grows"
            ]
          },
          {
            id: "approve-first-collections",
            title: "Approve First Collection",
            description: "Review and approve at least one NFT collection to get started",
            importance: "You need at least one active collection for users to mint and trade NFTs.",
            estimatedTime: "15-20 minutes",
            category: "Curation",
            priority: "important",
            completed: false,
            actionUrl: "/admin/nft/collection",
            actionText: "Review Collections",
            requirements: [
              "At least 1 collection with status 'ACTIVE'"
            ],
            tips: [
              "Review collection details and creator information",
              "Verify the collection has proper metadata",
              "Check that contract addresses are valid",
              "Start with 1-3 collections, add more over time"
            ]
          },
          {
            id: "setup-featured-content",
            title: "Ensure Collections Have NFTs",
            description: "Make sure approved collections have at least one minted NFT",
            importance: "Active collections with minted NFTs are what users come to buy. Empty collections don't generate revenue.",
            estimatedTime: "Varies",
            category: "Content",
            priority: "important",
            completed: false,
            actionUrl: "/admin/nft/collection",
            actionText: "View Collections",
            requirements: [
              "At least 1 collection with minted NFTs"
            ],
            tips: [
              "Creators mint NFTs through the user-facing platform",
              "Check collection pages to see how many tokens are minted",
              "Encourage early creators to mint their first NFTs",
              "You can also create test collections and mint NFTs yourself"
            ]
          }
        ]
      },
      {
        id: "users",
        title: "User & Creator Management",
        description: "Manage creators and review their submissions",
        icon: Users,
        color: "bg-amber-500",
        tasks: [
          {
            id: "setup-creator-verification",
            title: "Verify First Creator",
            description: "Review and verify at least one creator to establish trust on your marketplace",
            importance: "Verified creators build trust and attract buyers. Start with your first quality creator.",
            estimatedTime: "10-15 minutes",
            category: "Trust & Safety",
            priority: "important",
            completed: false,
            actionUrl: "/admin/nft/creator",
            actionText: "Manage Creators",
            requirements: [
              "At least 1 verified creator"
            ],
            tips: [
              "Verify creators who have good portfolios and active collections",
              "Check their social media presence if available",
              "Use KYC verification for high-value creators (if KYC enabled)",
              "You can verify more creators as your marketplace grows"
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
      case "critical": return "text-red-700 dark:text-red-400 border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-950/30";
      case "important": return "text-yellow-700 dark:text-yellow-400 border-yellow-200 dark:border-yellow-800 bg-yellow-50 dark:bg-yellow-950/30";
      case "optional": return "text-blue-700 dark:text-blue-400 border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-950/30";
      default: return "text-gray-700 dark:text-gray-400 border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/30";
    }
  };

  const getEstimatedTimeRemaining = () => {
    const incompleteTasks = phases.flatMap(phase => phase.tasks).filter(task => !completedTasks.has(task.id));
    const totalMinutes = incompleteTasks.reduce((sum, task) => {
      const time = task.estimatedTime;

      // Skip tasks with non-numeric estimates like "Varies"
      if (time.toLowerCase().includes('varies') || time.toLowerCase().includes('variable')) {
        return sum;
      }

      const minutes = time.includes('hour')
        ? parseInt(time) * 60
        : parseInt(time);

      // Only add if it's a valid number
      return !isNaN(minutes) ? sum + minutes : sum;
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
    <div className=" space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">NFT Admin Onboarding</h1>
          <p className="text-muted-foreground">
            Complete setup guide to get your NFT marketplace fully operational
          </p>
        </div>
        <div className="text-right flex items-center gap-4">
          <div>
            <div className="text-2xl font-bold text-primary">{Math.round(getTotalProgress())}%</div>
            <p className="text-sm text-muted-foreground">
              {completedTasks.size} of {phases.reduce((sum, phase) => sum + phase.tasks.length, 0)} tasks
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              fetchRealProgress();
              toast.success("Progress refreshed!");
            }}
          >
            Refresh Progress
          </Button>
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
                const isExpanded = expandedTasks.has(task.id);

                return (
                  <Card key={task.id} className={`transition-all ${isCompleted ? "bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-900/50" : ""}`}>
                    <CardHeader
                      className={isCompleted && !isExpanded ? "cursor-pointer" : ""}
                      onClick={() => {
                        if (isCompleted) {
                          const newExpanded = new Set(expandedTasks);
                          if (isExpanded) {
                            newExpanded.delete(task.id);
                          } else {
                            newExpanded.add(task.id);
                          }
                          setExpandedTasks(newExpanded);
                        }
                      }}
                    >
                      <div className="flex items-start gap-3">
                        <Checkbox
                          checked={isCompleted}
                          onCheckedChange={() => toggleTask(task.id)}
                          className="mt-1"
                          onClick={(e) => e.stopPropagation()}
                        />
                        <div className="flex-1 space-y-2">
                          <div className="flex items-center gap-2">
                            <CardTitle className={`text-lg ${isCompleted ? "line-through text-green-700 dark:text-green-400" : ""}`}>
                              {task.title}
                            </CardTitle>
                            <Badge variant="outline" className={getPriorityColor(task.priority)}>
                              {task.priority}
                            </Badge>
                            {isCompleted && (
                              <Badge variant="outline" className="bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300">
                                ✓ Completed
                              </Badge>
                            )}
                          </div>
                          {(!isCompleted || isExpanded) && (
                            <>
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
                            </>
                          )}
                        </div>

                        {task.actionUrl && !isCompleted && (
                          <Link href={task.actionUrl} onClick={(e) => e.stopPropagation()}>
                            <Button variant="outline" size="sm">
                              {task.actionText}
                              <ArrowRight className="h-3 w-3 ml-1" />
                            </Button>
                          </Link>
                        )}

                        {isCompleted && (
                          <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform ${isExpanded ? "rotate-180" : ""}`} />
                        )}
                      </div>
                    </CardHeader>

                    {(!isCompleted || isExpanded) && (
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
                    )}
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
                  <div key={task.id} className="p-3 border rounded-lg bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-900/50">
                    <div className="flex items-center gap-2 mb-1">
                      <AlertCircle className="h-4 w-4 text-red-600 dark:text-red-400" />
                      <span className="font-medium text-sm text-red-900 dark:text-red-100">{task.title}</span>
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
        <Card>
          <CardContent className="pt-6">
            <div className="text-center space-y-4">
              <div className="mx-auto w-16 h-16 bg-green-500 rounded-full flex items-center justify-center">
                <CheckCircle2 className="h-8 w-8 text-white" />
              </div>
              <div>
                <h3 className="text-2xl font-bold">Congratulations! 🎉</h3>
                <p className="text-muted-foreground mt-2">
                  Your NFT marketplace is fully configured and ready for launch!
                </p>
              </div>
              <div className="flex gap-2 justify-center">
                <Link href="/nft">
                  <Button className="bg-green-600 hover:bg-green-700 text-white">
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