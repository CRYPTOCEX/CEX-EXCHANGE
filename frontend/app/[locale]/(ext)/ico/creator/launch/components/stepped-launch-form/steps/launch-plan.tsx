"use client";

import { useState, useEffect } from "react";
import { Check, X, Info, Zap, Award, ArrowRight, Sparkles } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import type { FormData } from "../types";
import { cn } from "@/lib/utils";
import { generateFeatureComparison } from "../utils";
import { useLaunchPlanStore } from "@/store/ico/launch-plan-store";
import { useTranslations } from "next-intl";

// Helper function to safely access features as an object
const getPlanFeatures = (
  features: IcoLaunchPlanFeatures | string[] | string | undefined
): IcoLaunchPlanFeatures | null => {
  if (!features) return null;
  if (typeof features === "string") {
    try {
      return JSON.parse(features);
    } catch {
      return null;
    }
  }
  if (Array.isArray(features)) return null;
  return features;
};
interface LaunchPlanStepProps {
  updateFormData: (field: keyof FormData, value: any) => void;
  errors: Record<string, string>;
}
export default function LaunchPlanStep({
  updateFormData,
  errors,
}: LaunchPlanStepProps) {
  const t = useTranslations("ext_ico");
  const tExt = useTranslations("ext");
  const tCommon = useTranslations("common");
  const [selectedPlan, setSelectedPlan] =
    useState<icoLaunchPlanAttributes | null>(null);
  const [viewMode, setViewMode] = useState<"cards" | "comparison">("cards");
  const [highlightedFeature, setHighlightedFeature] = useState<string | null>(
    null
  );
  const [showSuccessAnimation, setShowSuccessAnimation] = useState(false);

  // Retrieve state and actions from the launch plan store
  const {
    plans: launchPlans,
    isLoading,
    error: fetchError,
    fetchPlans,
  } = useLaunchPlanStore();

  // Fetch plans on component mount (if not already cached)
  useEffect(() => {
    fetchPlans();
  }, [fetchPlans]);

  // Reset animation state when plan changes
  useEffect(() => {
    setShowSuccessAnimation(false);
  }, [selectedPlan]);
  const handleSelectPlan = (plan: icoLaunchPlanAttributes) => {
    setSelectedPlan(plan);
    updateFormData("selectedPlan", plan);
    setShowSuccessAnimation(true);

    // Reset animation after it completes
    setTimeout(() => {
      setShowSuccessAnimation(false);
    }, 1500);
  };
  const featureComparison = generateFeatureComparison(launchPlans);

  // Render feature value with appropriate styling
  const renderFeatureValue = (value: string | boolean) => {
    if (value === false) {
      return <X className="h-5 w-5 text-destructive" />;
    } else if (value === true) {
      return <Check className={"h-5 w-5 text-teal-600"} />;
    } else {
      return <span>{value}</span>;
    }
  };
  if (isLoading) {
    return (
      <div className="flex justify-center items-center py-12">
        <div className={"animate-spin rounded-full h-12 w-12 border-b-2 border-teal-600"}></div>
      </div>
    );
  }
  if (fetchError) {
    return (
      <div className="bg-destructive/10 text-destructive px-4 py-3 rounded-md">
        {fetchError}
      </div>
    );
  }
  if (launchPlans.length === 0) {
    return (
      <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 px-4 py-3 rounded-md">
        <h3 className="font-medium">{t("no_launch_plans_available")}</h3>
        <p className="text-sm mt-1">
          {t("please_contact_the_administrator_to_set")}
        </p>
      </div>
    );
  }
  return (
    <div className="space-y-6">
      <div className="flex flex-col space-y-2">
        <h3 className="text-xl font-bold">{t("choose_your_launch_plan")}</h3>
        <p className="text-muted-foreground">
          {t("select_the_plan_that_best_fits")} {t("your_plan_determines_the_features_and")}
        </p>
      </div>

      {errors.selectedPlan && (
        <div className="bg-destructive/10 text-destructive px-4 py-3 rounded-md">
          {errors.selectedPlan}
        </div>
      )}

      <Tabs
        defaultValue="cards"
        className="w-full"
        onValueChange={(value) => setViewMode(value as "cards" | "comparison")}
      >
        <div className="flex justify-between items-center mb-4">
          <TabsList>
            <TabsTrigger value="cards" className="flex items-center gap-1">
              <Zap className="h-4 w-4" />
              <span>{t("plan_cards")}</span>
            </TabsTrigger>
            <TabsTrigger value="comparison" className="flex items-center gap-1">
              <Award className="h-4 w-4" />
              <span>{t("feature_comparison")}</span>
            </TabsTrigger>
          </TabsList>

          {selectedPlan && (
            <div className="flex items-center gap-2 bg-muted px-3 py-1.5 rounded-full text-sm">
              <span>{tCommon("selected")}:</span>
              <Badge variant="outline" className="font-semibold">
                {selectedPlan.name}
              </Badge>
              <span className={"text-teal-600 font-medium"}>
                {selectedPlan.price} {selectedPlan.currency}
              </span>
            </div>
          )}
        </div>

        <TabsContent value="cards" className="mt-0">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start pt-6">
            {launchPlans.map((plan, index) => {
              const isSelected = selectedPlan?.id === plan.id;
              const features = getPlanFeatures(plan.features);
              return (
                <motion.div
                  key={plan.id}
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
                  className="relative"
                >
                  {plan.recommended && (
                    <div className="absolute -top-4 left-1/2 -translate-x-1/2 z-20 w-full flex justify-center px-4">
                      <div className="flex items-center gap-2 border-2 border-amber-400 dark:border-amber-500 bg-amber-100 dark:bg-amber-900 text-amber-900 dark:text-amber-100 px-3 sm:px-4 py-1.5 rounded-full shadow-lg whitespace-nowrap">
                        <Sparkles className="h-4 w-4 text-amber-600 dark:text-amber-400 flex-shrink-0" />
                        <span className="text-xs sm:text-sm font-semibold">
                          {t("most_popular")}
                        </span>
                      </div>
                    </div>
                  )}
                  <Card
                    className={cn(
                      "relative overflow-hidden transition-all duration-300 h-full rounded-xl flex flex-col",
                      isSelected
                        ? "border-teal-600 ring-2 ring-teal-600 ring-opacity-50 shadow-lg"
                        : "hover:border-teal-600/50 hover:shadow-md"
                    )}
                  >
                    <CardHeader
                      className={cn(
                        "transition-all duration-300 relative rounded-t-xl pb-6",
                        isSelected
                          ? "bg-gradient-to-br from-teal-600/10 via-teal-600/5 to-card dark:from-teal-600/20 dark:via-teal-600/10"
                          : "bg-gradient-to-br from-muted/30 to-card",
                        plan.recommended && "pt-10 sm:pt-8"
                      )}
                    >
                      <div className="flex items-center gap-2">
                        <CardTitle className="text-xl">{plan.name}</CardTitle>
                      </div>
                      <CardDescription className="min-h-[40px] text-muted-foreground">
                        {plan.description}
                      </CardDescription>
                      <div className="mt-4 pt-4 border-t border-border/50">
                        <div className="flex items-baseline gap-1">
                          <span className={"text-4xl font-bold bg-gradient-to-r from-teal-600 to-teal-600/70 bg-clip-text text-transparent"}>
                            {plan.price}
                          </span>
                          <span className="text-lg font-semibold text-muted-foreground">
                            {plan.currency}
                          </span>
                        </div>
                      </div>
                    </CardHeader>

                    <CardContent className="flex-1 overflow-y-auto pt-6 pb-4">
                      <ul className="space-y-3">
                        <motion.li
                          className="flex items-start group"
                          initial={{
                            opacity: 0,
                            x: -10,
                          }}
                          animate={{
                            opacity: 1,
                            x: 0,
                          }}
                          transition={{
                            duration: 0.2,
                          }}
                        >
                          <div className={"flex-shrink-0 mr-3 mt-0.5 rounded-full bg-teal-600/10 dark:bg-teal-600/20 p-1"}>
                            <Check className={"h-4 w-4 text-teal-600 dark:text-teal-400"} />
                          </div>
                          <span className="text-sm leading-relaxed group-hover:text-foreground transition-colors">
                            {t("up_to")}{" "}
                            {features?.maxTeamMembers === 999
                              ? "unlimited"
                              : features?.maxTeamMembers}{" "}
                            {t("team_members")}
                          </span>
                        </motion.li>
                        <motion.li
                          className="flex items-start group"
                          initial={{
                            opacity: 0,
                            x: -10,
                          }}
                          animate={{
                            opacity: 1,
                            x: 0,
                          }}
                          transition={{
                            duration: 0.2,
                            delay: 0.05,
                          }}
                        >
                          <div className={"flex-shrink-0 mr-3 mt-0.5 rounded-full bg-teal-600/10 dark:bg-teal-600/20 p-1"}>
                            <Check className={"h-4 w-4 text-teal-600 dark:text-teal-400"} />
                          </div>
                          <span className="text-sm leading-relaxed group-hover:text-foreground transition-colors">
                            {t("up_to")}{" "}
                            {features?.maxRoadmapItems === 999
                              ? "unlimited"
                              : features?.maxRoadmapItems}{" "}
                            {t("roadmap_items")}
                          </span>
                        </motion.li>
                        <motion.li
                          className="flex items-start group"
                          initial={{
                            opacity: 0,
                            x: -10,
                          }}
                          animate={{
                            opacity: 1,
                            x: 0,
                          }}
                          transition={{
                            duration: 0.2,
                            delay: 0.1,
                          }}
                        >
                          <div className={"flex-shrink-0 mr-3 mt-0.5 rounded-full bg-teal-600/10 dark:bg-teal-600/20 p-1"}>
                            <Check className={"h-4 w-4 text-teal-600 dark:text-teal-400"} />
                          </div>
                          <span className="text-sm leading-relaxed group-hover:text-foreground transition-colors">
                            {features?.maxOfferingPhases === 999
                              ? "Unlimited"
                              : features?.maxOfferingPhases}{" "}
                            {tExt("offering_phases")}
                          </span>
                        </motion.li>
                        <motion.li
                          className="flex items-start group"
                          initial={{
                            opacity: 0,
                            x: -10,
                          }}
                          animate={{
                            opacity: 1,
                            x: 0,
                          }}
                          transition={{
                            duration: 0.2,
                            delay: 0.15,
                          }}
                        >
                          <div className={"flex-shrink-0 mr-3 mt-0.5 rounded-full bg-teal-600/10 dark:bg-teal-600/20 p-1"}>
                            <Check className={"h-4 w-4 text-teal-600 dark:text-teal-400"} />
                          </div>
                          <span className="text-sm leading-relaxed group-hover:text-foreground transition-colors">
                            {features?.maxUpdatePosts === 999
                              ? "Unlimited"
                              : features?.maxUpdatePosts}{" "}
                            {t("update_posts")}
                          </span>
                        </motion.li>
                        <motion.li
                          className="flex items-start group"
                          initial={{
                            opacity: 0,
                            x: -10,
                          }}
                          animate={{
                            opacity: 1,
                            x: 0,
                          }}
                          transition={{
                            duration: 0.2,
                            delay: 0.15,
                          }}
                        >
                          <div className={"flex-shrink-0 mr-3 mt-0.5 rounded-full bg-teal-600/10 dark:bg-teal-600/20 p-1"}>
                            <Check className={"h-4 w-4 text-teal-600 dark:text-teal-400"} />
                          </div>
                          <span className="text-sm leading-relaxed group-hover:text-foreground transition-colors">
                            {features?.supportLevel === "basic"
                              ? "Standard support"
                              : features?.supportLevel === "standard"
                                ? "Priority support"
                                : "24/7 Dedicated support"}
                          </span>
                        </motion.li>
                        {features?.marketingSupport && (
                          <motion.li
                            className="flex items-start group"
                            initial={{
                              opacity: 0,
                              x: -10,
                            }}
                            animate={{
                              opacity: 1,
                              x: 0,
                            }}
                            transition={{
                              duration: 0.2,
                              delay: 0.2,
                            }}
                          >
                            <Check className={"h-5 w-5 text-teal-600 flex-shrink-0 mr-2"} />
                            <span className="text-sm">
                              {t("marketing_support_included")}
                            </span>
                          </motion.li>
                        )}
                        {features?.auditIncluded && (
                          <motion.li
                            className="flex items-start group"
                            initial={{
                              opacity: 0,
                              x: -10,
                            }}
                            animate={{
                              opacity: 1,
                              x: 0,
                            }}
                            transition={{
                              duration: 0.2,
                              delay: 0.25,
                            }}
                          >
                            <Check className={"h-5 w-5 text-teal-600 flex-shrink-0 mr-2"} />
                            <span className="text-sm">
                              {tExt("security_audit_included")}
                            </span>
                          </motion.li>
                        )}
                        {features?.customTokenomics && (
                          <motion.li
                            className="flex items-start group"
                            initial={{
                              opacity: 0,
                              x: -10,
                            }}
                            animate={{
                              opacity: 1,
                              x: 0,
                            }}
                            transition={{
                              duration: 0.2,
                              delay: 0.3,
                            }}
                          >
                            <Check className={"h-5 w-5 text-teal-600 flex-shrink-0 mr-2"} />
                            <span className="text-sm">{tExt("custom_tokenomics")}</span>
                          </motion.li>
                        )}
                        {features?.priorityListing && (
                          <motion.li
                            className="flex items-start group"
                            initial={{
                              opacity: 0,
                              x: -10,
                            }}
                            animate={{
                              opacity: 1,
                              x: 0,
                            }}
                            transition={{
                              duration: 0.2,
                              delay: 0.35,
                            }}
                          >
                            <Check className={"h-5 w-5 text-teal-600 flex-shrink-0 mr-2"} />
                            <span className="text-sm">{tExt("priority_listing")}</span>
                          </motion.li>
                        )}
                      </ul>
                    </CardContent>

                    <CardFooter className="mt-auto pt-4 pb-6 px-6 border-t border-border/30">
                      <Button
                        variant={isSelected ? "default" : "outline"}
                        className="w-full"
                        onClick={() => handleSelectPlan(plan)}
                      >
                        {isSelected ? (
                          showSuccessAnimation ? (
                            <motion.span
                              initial={{
                                opacity: 0,
                                scale: 0.8,
                              }}
                              animate={{
                                opacity: 1,
                                scale: 1,
                              }}
                              exit={{
                                opacity: 0,
                              }}
                              className="flex items-center justify-center"
                            >
                              <Check className="mr-2 h-4 w-4" /> Selected
                            </motion.span>
                          ) : (
                            <span className="flex items-center justify-center">
                              <Check className="mr-2 h-4 w-4" /> Selected
                            </span>
                          )
                        ) : (
                          <span className="flex items-center justify-center">
                            Select {plan.name}
                            <ArrowRight className="ml-2 h-4 w-4" />
                          </span>
                        )}
                      </Button>
                    </CardFooter>
                  </Card>
                </motion.div>
              );
            })}
          </div>
        </TabsContent>

        <TabsContent value="comparison" className="mt-0">
          <Card>
            <CardContent className="p-0 overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left p-4 bg-muted/50 sticky left-0 z-10">
                      <span className="font-medium text-lg">Features</span>
                    </th>
                    {launchPlans.map((plan) => {
                      return (
                        <th
                          key={plan.id}
                          className="p-4 text-center min-w-[150px]"
                        >
                          <div className="flex flex-col items-center gap-1">
                            <span
                              className={cn(
                                "font-bold text-lg",
                                plan.recommended ? "text-teal-600" : ""
                              )}
                            >
                              {plan.name}
                            </span>
                            <span className="text-muted-foreground text-sm">
                              {plan.price} {plan.currency}
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
                  {featureComparison.map((feature, index) => (
                    <tr
                      key={feature.name}
                      className={cn(
                        "border-b transition-colors",
                        highlightedFeature === feature.name
                          ? "bg-muted/50"
                          : "",
                        index % 2 === 0 ? "bg-muted/20" : ""
                      )}
                      onMouseEnter={() => setHighlightedFeature(feature.name)}
                      onMouseLeave={() => setHighlightedFeature(null)}
                    >
                      <td className="p-4 sticky left-0 bg-inherit z-10">
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger className="flex items-center gap-1 text-left">
                              <span className="font-medium">
                                {feature.name}
                              </span>
                              <Info className="h-4 w-4 text-muted-foreground" />
                            </TooltipTrigger>
                            <TooltipContent>
                              <p className="max-w-xs">{feature.description}</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </td>
                      {launchPlans.map((plan) => (
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
                    {launchPlans.map((plan) => (
                      <td key={plan.id} className="p-4 text-center">
                        <Button
                          variant={
                            selectedPlan?.id === plan.id ? "default" : "outline"
                          }
                          className={cn(
                            "w-full",
                            plan.recommended ? "border-teal-600" : ""
                          )}
                          onClick={() => handleSelectPlan(plan)}
                        >
                          {selectedPlan?.id === plan.id ? "Selected" : "Select"}
                        </Button>
                      </td>
                    ))}
                  </tr>
                </tbody>
              </table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <div className="bg-muted p-4 rounded-lg">
        <div className="flex items-start space-x-2">
          <Info className="h-5 w-5 text-muted-foreground mt-0.5" />
          <div>
            <h4 className="font-medium mb-2">{tCommon("why_choose_the_right_plan")}</h4>
            <p className="text-sm text-muted-foreground mb-2">
              {t("your_launch_plan_determines_important_limits")}:
            </p>
            <ul className="text-sm text-muted-foreground space-y-1 list-disc pl-4">
              <li>{tCommon("the_number_of_team_members_you_can_showcase")}</li>
              <li>{tCommon("how_many_roadmap_items_you_can_create")}</li>
              <li>{tCommon("the_number_of_offering_phases_you_can_configure")}</li>
              <li>{tCommon("access_to_marketing_support_and_security_audits")}</li>
              <li>{tCommon("priority_listing_and_custom_tokenomics_options")}</li>
            </ul>
            <p className="text-sm text-muted-foreground mt-2">
              {tExt("you_can_upgrade_your_plan_later")}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
