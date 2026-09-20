"use client";

import { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import { $fetch } from "@/lib/api";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { statusTone } from "@/lib/status-tone";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Checkbox } from "@/components/ui/checkbox";
import { Link } from "@/i18n/routing";
import { toast } from "sonner";
import { Loadable } from "@/components/ui/skeleton";
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
  const tExt = useTranslations("ext");
  const tCommon = useTranslations("common");
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

      // $fetch never throws, so the catch below is dead — take the localStorage
      // fallback here rather than silently keeping an empty progress set.
      if (response?.error) {
        console.error('Failed to fetch real onboarding progress:', response.error);
        loadProgress();
        return;
      }

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
        title: tExt("infrastructure_setup"),
        description: tExt("deploy_and_configure_your_marketplace_foundation"),
        icon: Building2,
        color: "bg-primary",
        tasks: [
          {
            id: "deploy-primary-marketplace",
            title: tExt("deploy_primary_marketplace_contract"),
            description: tExt("deploy_your_first_marketplace_contract_to"),
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
            title: tExt("verify_blockchain_integration_health"),
            description: tExt("ensure_all_marketplace_contracts_are_responding"),
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
        title: tExt("marketplace_configuration"),
        description: tExt("configure_marketplace_settings_and_content_policie"),
        icon: Settings,
        color: "bg-primary",
        tasks: [
          {
            id: "configure-trading-settings",
            title: tExt("configure_trading_settings"),
            description: tExt("enable_auction_features_offers_and_configure"),
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
            title: tExt("configure_content_settings"),
            description: tExt("set_file_size_limits_supported_formats"),
            /* The tips here used to describe four controls that do not exist:
               a max file size (the creator form hardcodes 10MB), a format list
               including MP4/MP3/WebP (the same form rejects anything that is not
               `image/*`), content moderation (there is no filter — `isExplicit`
               is self-declared by the creator and read by nothing), and IPFS
               storage (the platform pins nothing; `ipfs-upload-guide.tsx` tells
               the CREATOR to open their own Pinata account). What this screen
               really carries for content is metadata validation. */
            importance: "Metadata validation is the content control this screen actually sets.",
            estimatedTime: "15-20 minutes",
            category: "Content",
            priority: "important",
            completed: false,
            actionUrl: "/admin/nft/settings",
            actionText: "Configure Content",
            requirements: [
              "A decision on whether malformed metadata should block a mint"
            ],
            tips: [
              "Turn on metadata validation to refuse a mint whose metadata is missing or malformed",
              "Cover images are capped at 10MB and must be an image file — that limit lives in the creator form, not on this screen",
              "The platform pins nothing to IPFS: creators bring their own pinning account, and the create flow walks them through it",
              "Explicit/sensitive flags are self-declared by the creator; there is no automated moderation filter"
            ]
          },
          {
            id: "configure-verification",
            title: tExt("configure_creator_verification"),
            description: tExt("set_up_creator_verification_requirements_and"),
            /* Badges, manual review and auto-verify were all invented: `nftCreator`
               has no review status, and nothing on this screen issues a badge. The
               two KYC switches are real. */
            importance: "KYC on creators and on high-value sales is the verification this screen can set.",
            estimatedTime: "10-15 minutes",
            category: "Trust & Safety",
            priority: "important",
            completed: false,
            actionUrl: "/admin/nft/settings",
            actionText: "Configure Verification",
            requirements: [
              "KYC levels configured, if you intend to require them"
            ],
            tips: [
              "Minting is barred by the Create NFT verification feature on a KYC level, not by this screen",
              "Require KYC above a sale value you choose, and set that threshold",
              "These switches do nothing while platform KYC is off"
            ]
          }
        ]
      },
      {
        id: "content",
        title: tExt("content_management"),
        description: tExt("set_up_collections_categories_and_content"),
        icon: Package,
        color: "bg-success",
        tasks: [
          {
            id: "create-categories",
            title: tExt("create_nft_categories"),
            description: tExt("create_at_least_2_categories_to"),
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
            title: tExt("approve_first_collection"),
            description: tExt("review_and_approve_at_least_one"),
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
            title: tExt("ensure_collections_have_nfts"),
            description: tExt("make_sure_approved_collections_have_at"),
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
        title: tExt("user_creator_management"),
        description: tExt("manage_creators_and_review_their_submissions"),
        icon: Users,
        color: "bg-warning",
        tasks: [
          {
            id: "setup-creator-verification",
            title: tExt("verify_first_creator"),
            description: tExt("review_and_verify_at_least_one"),
            /* This task asked for "at least 1 verified creator" and sent the
               operator to a table that ships `canCreate/canEdit/canDelete={false}`
               and renders `isVerified` read-only, so it could not be completed
               from the UI at all. It now describes what the screen does do. The
               admin PUT route exists (`admin/nft/creator/index.put.ts`) but takes
               the id in the BODY, so it has no DataTable-shaped `[id]` door — that
               is the work needed to make verifying a creator possible in the UI. */
            importance: "Know who is minting on your marketplace before it has volume.",
            estimatedTime: "10-15 minutes",
            category: "Trust & Safety",
            priority: "important",
            completed: false,
            actionUrl: "/admin/nft/creator",
            actionText: "Review Creators",
            requirements: [
              "At least one creator profile to look at"
            ],
            tips: [
              "Open a creator to see their collections, sales and verification tier",
              "The Active toggle hides a creator's public profile — that is the enforcement this table has",
              "Setting the verification badge is not yet possible from this screen",
              "To bar minting, put the Create NFT feature behind a KYC level — the NFT settings switch does not gate it"
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
      toast.success(tExt("task_marked_as_completed"));
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

  /*
    A SECOND HEADER AND THREE GUESSED CARDS, FOR A PAGE THAT IS STATIC.
    ==========================================================================
    Nearly all of this page is hardcoded: `phases` is a literal list of setup
    tasks with their own titles, descriptions and estimated times, so every
    card, every row and every label is knowable before any request is made. The
    ONLY things the fetch decides are which tasks are ticked and therefore the
    two progress figures.

    The pending branch nonetheless rebuilt the h1 by hand (without its
    subtitle, so the header block was 24px short) and replaced all of the
    phase cards with three `h-6`/`h-4`/`h-20` guesses. It is deleted: the page
    renders once and the two figures take placeholders.
  */
  return (
    <div className=" space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">{tExt("nft_admin_onboarding")}</h1>
          <p className="text-muted-foreground">
            {tExt("complete_setup_guide_to_get_your")}
          </p>
        </div>
        <div className="text-right flex items-center gap-4">
          <div>
            <div className="text-2xl font-bold text-primary">
              <Loadable loading={loading} placeholder="00">
                {Math.round(getTotalProgress())}
              </Loadable>
              %
            </div>
            {/* The DENOMINATOR is a property of the hardcoded `phases` list, so
                it renders immediately; only the completed count waits. */}
            <p className="text-sm text-muted-foreground">
              <Loadable loading={loading} placeholder="00">
                {completedTasks.size}
              </Loadable>{" "}
              of {phases.reduce((sum, phase) => sum + phase.tasks.length, 0)} tasks
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              fetchRealProgress();
              toast.success(tExt("progress_refreshed"));
            }}
          >
            {tExt("refresh_progress")}
          </Button>
        </div>
      </div>

      {/* Progress Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <span className="grid h-7 w-7 shrink-0 place-items-center rounded-sm bg-surface-3 text-muted-foreground">
              <Target className="h-3.5 w-3.5" />
            </span>
            {tExt("setup_progress_overview")}
          </CardTitle>
          <CardDescription>
            {tExt("track_your_progress_through_the_complete")}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>{tExt("overall_progress")}</span>
              <span>{Math.round(getTotalProgress())}%</span>
            </div>
            <Progress value={getTotalProgress()} className="h-2" />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>{completedTasks.size} completed</span>
              <span>{tExt("est")} {getEstimatedTimeRemaining()} remaining</span>
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
                    <div className={`p-1 rounded ${phase.color} text-primary-foreground`}>
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
                  <span className="grid h-7 w-7 shrink-0 place-items-center rounded-sm bg-surface-3 text-muted-foreground">
                    <phase.icon className="h-3.5 w-3.5" />
                  </span>
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
                  <Card key={task.id} className={`transition-all ${isCompleted ? "bg-success/5 dark:bg-success/20 border-success/20 dark:border-success/50" : ""}`}>
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
                            <CardTitle className={`text-lg ${isCompleted ? "line-through text-success" : ""}`}>
                              {task.title}
                            </CardTitle>
                            <Badge tone={statusTone(task.priority)}>
                              {task.priority}
                            </Badge>
                            {isCompleted && (
                              <Badge variant="outline" className="bg-success/10 text-success-ink">
                                {tExt("completed")}
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
                          <strong>{tExt("why_this_matters")}:</strong> {task.importance}
                        </AlertDescription>
                      </Alert>
                      
                      {task.requirements && (
                        <div className="mt-3">
                          <h4 className="font-medium text-sm mb-2">{tExt("requirements")}:</h4>
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
                          <h4 className="font-medium text-sm mb-2">{tExt("pro_tips")}:</h4>
                          <ul className="text-sm text-muted-foreground space-y-1">
                            {task.tips.map((tip, index) => (
                              <li key={index} className="flex items-start gap-2">
                                <Star className="h-3 w-3 mt-0.5 flex-shrink-0 text-warning" />
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
              <span className="grid h-7 w-7 shrink-0 place-items-center rounded-sm bg-surface-3 text-muted-foreground">
                <Zap className="h-3.5 w-3.5" />
              </span>
              {tExt("next_recommended_actions")}
            </CardTitle>
            <CardDescription>
              {tExt("focus_on_these_high_priority_tasks")}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 md:grid-cols-2">
              {phases
                .flatMap(phase => phase.tasks)
                .filter(task => !completedTasks.has(task.id) && task.priority === "critical")
                .slice(0, 4)
                .map((task) => (
                  <div key={task.id} className="p-3 border rounded-lg bg-destructive/5 dark:bg-destructive/20 border-destructive/20 dark:border-destructive/50">
                    <div className="flex items-center gap-2 mb-1">
                      <AlertCircle className="h-4 w-4 text-destructive" />
                      <span className="font-medium text-sm text-destructive">{task.title}</span>
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
              <div className="mx-auto w-16 h-16 bg-success rounded-full flex items-center justify-center">
                <CheckCircle2 className="h-8 w-8 text-success-foreground" />
              </div>
              <div>
                <h3 className="text-2xl font-semibold leading-tight tracking-tight">{tExt("congratulations")}</h3>
                <p className="text-muted-foreground mt-2">
                  {tExt("your_nft_marketplace_is_fully_configured")}
                </p>
              </div>
              <div className="flex gap-2 justify-center">
                <Link href="/nft">
                  <Button className="bg-success hover:bg-success text-success-foreground">
                    <Eye className="h-4 w-4 mr-2" />
                    {tExt("view_live_marketplace")}
                  </Button>
                </Link>
                <Link href="/admin/nft">
                  <Button variant="outline">
                    <Monitor className="h-4 w-4 mr-2" />
                    {tCommon("admin_dashboard")}
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