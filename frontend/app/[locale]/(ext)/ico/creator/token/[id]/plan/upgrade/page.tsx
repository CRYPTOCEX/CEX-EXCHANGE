"use client";

import { useEffect, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Check,
  Loader2,
  ArrowLeft,
  Shield,
  Users,
  BarChart4,
  X,
  Info,
  Sparkles,
} from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { Link, useRouter } from "@/i18n/routing";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useLaunchPlanStore } from "@/store/ico/launch-plan-store";
import { generateFeatureComparison } from "@/app/[locale]/(ext)/ico/creator/launch/components/stepped-launch-form/utils";

// A helper to parse a plan's features if they are a string.
function parseFeatures(features: any): Record<string, any> {
  if (!features) return {};
  if (typeof features === "string") {
    try {
      return JSON.parse(features);
    } catch (e) {
      console.error("Error parsing features:", e);
      return {};
    }
  }
  return features;
}

// Build a friendly list of features for display.
function getFeatureList(features: any): string[] {
  const f = parseFeatures(features);
  const list: string[] = [];
  if (f.maxTeamMembers != null)
    list.push(
      `${f.maxTeamMembers === 999 ? "Unlimited" : f.maxTeamMembers} Team Members`
    );
  if (f.maxRoadmapItems != null)
    list.push(
      `${f.maxRoadmapItems === 999 ? "Unlimited" : f.maxRoadmapItems} Roadmap Items`
    );
  if (f.maxOfferingPhases != null)
    list.push(
      `${f.maxOfferingPhases === 999 ? "Unlimited" : f.maxOfferingPhases} Offering Phases`
    );
  if (f.maxUpdatePosts != null)
    list.push(
      `${f.maxUpdatePosts === 999 ? "Unlimited" : f.maxUpdatePosts} Update Posts`
    );
  if (f.supportLevel)
    list.push(
      f.supportLevel === "basic"
        ? "Standard Support"
        : f.supportLevel === "standard"
          ? "Priority Support"
          : "24/7 Dedicated Support"
    );
  if (f.marketingSupport) list.push("Marketing Support");
  if (f.auditIncluded) list.push("Audit Included");
  if (f.customTokenomics) list.push("Custom Tokenomics");
  if (f.priorityListing) list.push("Priority Listing");
  if (f.kycRequired) list.push("KYC Required");
  return list;
}

// Renders a feature value either as a check, cross, or raw value.
const renderFeatureValue = (value: string | boolean) => {
  if (value === false) return <X className="h-5 w-5 text-destructive" />;
  if (value === true) return <Check className="h-5 w-5 text-primary" />;
  return <span>{value}</span>;
};

// Extracted PlanCard component to reduce duplicate code in cards view.
interface PlanCardProps {
  plan: icoLaunchPlanAttributes;
  currentPlanId: string;
  selectedPlan: icoLaunchPlanAttributes | null;
  isProcessing: boolean;
  upgradeComplete: boolean;
  handleUpgrade: (planId: string) => Promise<void>;
  onSelect: (plan: icoLaunchPlanAttributes) => void;
}
function PlanCard({
  plan,
  currentPlanId,
  selectedPlan,
  isProcessing,
  upgradeComplete,
  handleUpgrade,
}: PlanCardProps) {
  const isCurrentPlan = plan.id === currentPlanId;
  const isSelected = selectedPlan?.id === plan.id;
  const isPro = plan.id === "pro";
  const isEnterprise = plan.id === "enterprise";
  return (
    <Card
      key={plan.id}
      className={cn(
        "relative overflow-hidden transition-all duration-300 hover:shadow-md",
        isPro ? "border-primary shadow-lg" : "",
        isSelected ? "ring-2 ring-primary" : "",
        isCurrentPlan ? "bg-muted/30" : ""
      )}
    >
      {isPro && (
        <div className="absolute -right-12 top-6 rotate-45 bg-primary text-white text-xs py-1 w-36 text-center">
          POPULAR
        </div>
      )}
      <CardHeader className={isPro ? "pb-0" : ""}>
        <CardTitle className="flex items-center">
          {plan.name}
          {isCurrentPlan && (
            <Badge
              variant="outline"
              className="ml-2 border-primary text-primary"
            >
              Current
            </Badge>
          )}
        </CardTitle>
        <CardDescription>{plan.description}</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="mb-6">
          <div className="flex items-baseline">
            <span className="text-4xl font-bold">${plan.price}</span>
          </div>
        </div>
        <ul className="space-y-3">
          {getFeatureList(plan.features).map((feature, index) => (
            <li key={index} className="flex items-start gap-2 text-sm">
              <Check className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
              <span>{feature}</span>
            </li>
          ))}
        </ul>
      </CardContent>
      <CardFooter>
        <Button
          className="w-full"
          variant={isPro || isEnterprise ? "default" : "outline"}
          disabled={isCurrentPlan || (isProcessing && isSelected)}
          onClick={() => handleUpgrade(plan.id)}
        >
          {isProcessing && isSelected ? (
            upgradeComplete ? (
              <>
                <Check className="mr-2 h-4 w-4" />
                Upgraded!
              </>
            ) : (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Processing...
              </>
            )
          ) : isCurrentPlan ? (
            "Current Plan"
          ) : (
            `Upgrade to ${plan.name}`
          )}
        </Button>
      </CardFooter>
    </Card>
  );
}
export default function PlanUpgradePage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const tokenId = params.id as string;
  const currentPlanId = searchParams.get("currentPlan");
  const reason = searchParams.get("reason");
  const { upgradePlan, plans, getPlanById, fetchPlans } = useLaunchPlanStore();
  const [selectedPlan, setSelectedPlan] =
    useState<icoLaunchPlanAttributes | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [upgradeComplete, setUpgradeComplete] = useState(false);
  const [viewMode, setViewMode] = useState<"cards" | "comparison">("cards");

  // Fetch plans if they haven't been loaded yet.
  useEffect(() => {
    if (!plans.length) {
      fetchPlans();
    }
  }, [plans, fetchPlans]);

  // Render a fallback if the current plan ID is not provided.
  if (!currentPlanId) {
    router.push(`/ico/creator/token/${tokenId}`);
    return null;
  }
  const handleUpgrade = async (planId: string) => {
    if (planId === currentPlanId) {
      toast("Already on this plan", {
        description: `You are already on the ${planId} plan.`,
      });
      return;
    }
    setSelectedPlan(getPlanById(planId) || null);
    setIsProcessing(true);
    try {
      if (tokenId) {
        await upgradePlan(tokenId, planId);
      }
      setUpgradeComplete(true);
      router.push(`/ico/creator/token/${tokenId}`);
    } catch (error: any) {
      toast.error(error.message || "Upgrade failed");
    } finally {
      setIsProcessing(false);
    }
  };
  const currentPlanDetails = getPlanById(currentPlanId);
  const showCompare = plans.length > 1;
  const featureComparison = showCompare ? generateFeatureComparison(plans) : [];
  return (
    <div className="container pt-10 pb-24 max-w-7xl">
      {/* Page header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <Link
            href={tokenId ? `/ico/creator/token/${tokenId}` : "/ico/creator"}
            className="flex items-center"
          >
            <Button variant="ghost" size="sm" className="mb-4">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to {tokenId ? "Token" : "Dashboard"}
            </Button>
          </Link>
          <h1 className="text-4xl font-bold">Upgrade Your Plan</h1>
          <p className="text-muted-foreground mt-2 text-lg">
            Choose the plan that best fits your project's needs.
          </p>
        </div>
        <div className="hidden md:block">
          <Card className="bg-muted/50 border-none">
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                  <Shield className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <p className="text-sm font-medium">Current Plan</p>
                  <p className="text-xl font-bold">
                    {currentPlanDetails?.name || "N/A"}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {reason && (
        <Alert className="mb-8 border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/50">
          <AlertTitle className="text-amber-800 dark:text-amber-400">
            Upgrade Required
          </AlertTitle>
          <AlertDescription className="text-amber-700 dark:text-amber-300">
            {reason}
          </AlertDescription>
        </Alert>
      )}

      {showCompare ? (
        <Tabs
          defaultValue="cards"
          className="mb-8"
          onValueChange={(value) =>
            setViewMode(value as "cards" | "comparison")
          }
        >
          <div className="flex justify-between items-center mb-4">
            <TabsList className="grid w-full max-w-md grid-cols-2">
              <TabsTrigger value="cards">Plan Options</TabsTrigger>
              <TabsTrigger value="comparison">Compare Features</TabsTrigger>
            </TabsList>
            {selectedPlan && (
              <div className="flex items-center gap-2 bg-muted px-3 py-1.5 rounded-full text-sm">
                <span>Selected:</span>
                <Badge variant="outline" className="font-semibold">
                  {selectedPlan.name}
                </Badge>
                <span className="text-primary font-medium">
                  ${selectedPlan.price}
                </span>
              </div>
            )}
          </div>

          <TabsContent value="cards" className="mt-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {plans.map((plan) => (
                <PlanCard
                  key={plan.id}
                  plan={plan}
                  currentPlanId={currentPlanId}
                  selectedPlan={selectedPlan}
                  isProcessing={isProcessing}
                  upgradeComplete={upgradeComplete}
                  handleUpgrade={handleUpgrade}
                  onSelect={setSelectedPlan}
                />
              ))}
            </div>
          </TabsContent>

          <TabsContent value="comparison" className="mt-6">
            <Card>
              <CardContent className="p-0 overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left p-4 bg-muted/50 sticky left-0 z-10">
                        <span className="font-medium text-lg">Features</span>
                      </th>
                      {plans.map((plan) => {
                        return (
                          <th
                            key={plan.id}
                            className="p-4 text-center min-w-[150px]"
                          >
                            <div className="flex flex-col items-center gap-1">
                              <span
                                className={cn(
                                  "font-bold text-lg",
                                  plan.recommended ? "text-primary" : ""
                                )}
                              >
                                {plan.name}
                              </span>
                              <span className="text-muted-foreground text-sm">
                                ${plan.price}
                              </span>
                              {plan.recommended && (
                                <Badge variant="secondary" className="mt-1">
                                  Recommended
                                </Badge>
                              )}
                            </div>
                          </th>
                        );
                      })}
                    </tr>
                  </thead>
                  <tbody>
                    {featureComparison.map((feature) => (
                      <tr key={feature.name} className="border-b">
                        <td className="p-4 sticky left-0 bg-inherit z-10">
                          <div className="flex items-center gap-1">
                            <span className="font-medium">{feature.name}</span>
                            <Info className="h-4 w-4 text-muted-foreground" />
                          </div>
                        </td>
                        {plans.map((plan) => (
                          <td key={plan.id} className="p-4 text-center">
                            <div className="flex justify-center">
                              {renderFeatureValue(feature[plan.id])}
                            </div>
                          </td>
                        ))}
                      </tr>
                    ))}
                    <tr>
                      <td className="p-4 sticky left-0 bg-white z-10"></td>
                      {plans.map((plan) => (
                        <td key={plan.id} className="p-4 text-center">
                          <Button
                            variant={
                              selectedPlan?.id === plan.id
                                ? "default"
                                : "outline"
                            }
                            className={cn(
                              "w-full",
                              plan.recommended ? "border-primary" : ""
                            )}
                            onClick={() => setSelectedPlan(plan)}
                          >
                            {selectedPlan?.id === plan.id
                              ? "Selected"
                              : "Select"}
                          </Button>
                        </td>
                      ))}
                    </tr>
                  </tbody>
                </table>
              </CardContent>
            </Card>
            {selectedPlan && selectedPlan.id !== currentPlanId && (
              <div className="mt-6 flex justify-center">
                <Button onClick={() => handleUpgrade(selectedPlan.id)}>
                  Upgrade to {selectedPlan.name} for ${selectedPlan.price}
                </Button>
              </div>
            )}
          </TabsContent>
        </Tabs>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {plans.map((plan) => (
            <PlanCard
              key={plan.id}
              plan={plan}
              currentPlanId={currentPlanId}
              selectedPlan={selectedPlan}
              isProcessing={isProcessing}
              upgradeComplete={upgradeComplete}
              handleUpgrade={handleUpgrade}
              onSelect={setSelectedPlan}
            />
          ))}
        </div>
      )}

      <Separator className="my-10" />

      {/* Additional call-to-action section */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mt-10">
        <div className="flex flex-col items-center text-center p-6 rounded-lg border bg-card">
          <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center mb-4">
            <Sparkles className="h-6 w-6 text-primary" />
          </div>
          <h3 className="text-lg font-semibold mb-2">Unlock More Features</h3>
          <p className="text-muted-foreground text-sm">
            Upgrade your plan to access advanced features and increase your
            project's potential.
          </p>
        </div>
        <div className="flex flex-col items-center text-center p-6 rounded-lg border bg-card">
          <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center mb-4">
            <Users className="h-6 w-6 text-primary" />
          </div>
          <h3 className="text-lg font-semibold mb-2">Grow Your Team</h3>
          <p className="text-muted-foreground text-sm">
            Add more team members and collaborate effectively with higher tier
            plans.
          </p>
        </div>
        <div className="flex flex-col items-center text-center p-6 rounded-lg border bg-card">
          <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center mb-4">
            <BarChart4 className="h-6 w-6 text-primary" />
          </div>
          <h3 className="text-lg font-semibold mb-2">Advanced Analytics</h3>
          <p className="text-muted-foreground text-sm">
            Gain deeper insights into your token performance with detailed
            analytics.
          </p>
        </div>
      </div>

      <div className="mt-12 bg-muted/30 p-6 rounded-lg border">
        <div className="flex items-start space-x-2">
          <Info className="h-5 w-5 text-muted-foreground mt-0.5" />
          <div>
            <h4 className="font-medium mb-2">Why choose the right plan?</h4>
            <p className="text-sm text-muted-foreground mb-2">
              Your plan determines important limits and features throughout the
              token launch process:
            </p>
            <ul className="text-sm text-muted-foreground space-y-1 list-disc pl-4">
              <li>The number of team members you can showcase</li>
              <li>How many roadmap items you can create</li>
              <li>The number of offering phases you can configure</li>
              <li>Access to marketing support and security audits</li>
              <li>Priority listing and custom tokenomics options</li>
            </ul>
            <p className="text-sm text-muted-foreground mt-2">
              You can upgrade your plan later, but choosing the right plan now
              will save you time and ensure a smoother launch experience.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
