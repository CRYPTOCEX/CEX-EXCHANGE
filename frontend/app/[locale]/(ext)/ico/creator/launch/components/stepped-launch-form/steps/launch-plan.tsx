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
interface LaunchPlanStepProps {
  updateFormData: (field: keyof FormData, value: any) => void;
  errors: Record<string, string>;
}
export default function LaunchPlanStep({
  updateFormData,
  errors,
}: LaunchPlanStepProps) {
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
      return <Check className="h-5 w-5 text-primary" />;
    } else {
      return <span>{value}</span>;
    }
  };
  if (isLoading) {
    return (
      <div className="flex justify-center items-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
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
        <h3 className="font-medium">No Launch Plans Available</h3>
        <p className="text-sm mt-1">
          Please contact the administrator to set up launch plans.
        </p>
      </div>
    );
  }
  return (
    <div className="space-y-6">
      <div className="flex flex-col space-y-2">
        <h3 className="text-xl font-bold">Choose Your Launch Plan</h3>
        <p className="text-muted-foreground">
          Select the plan that best fits your project's needs and budget. Your
          plan determines the features and limits available throughout the
          launch process.
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
              <span>Plan Cards</span>
            </TabsTrigger>
            <TabsTrigger value="comparison" className="flex items-center gap-1">
              <Award className="h-4 w-4" />
              <span>Feature Comparison</span>
            </TabsTrigger>
          </TabsList>

          {selectedPlan && (
            <div className="flex items-center gap-2 bg-muted px-3 py-1.5 rounded-full text-sm">
              <span>Selected:</span>
              <Badge variant="outline" className="font-semibold">
                {selectedPlan.name}
              </Badge>
              <span className="text-primary font-medium">
                {selectedPlan.price} {selectedPlan.currency}
              </span>
            </div>
          )}
        </div>

        <TabsContent value="cards" className="mt-0">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {launchPlans.map((plan, index) => {
              const isSelected = selectedPlan?.id === plan.id;
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
                  className="relative mt-2"
                >
                  <Card
                    className={cn(
                      "relative overflow-visible transition-all duration-300 h-full",
                      isSelected
                        ? "border-primary ring-2 ring-primary ring-opacity-50 shadow-lg"
                        : "hover:border-primary/50 hover:shadow-md"
                    )}
                  >
                    {plan.recommended && (
                      <div className="absolute -top-4 left-1/2 -translate-x-1/2 z-10">
                        <div className="flex items-center gap-2 border border-yellow-500 bg-yellow-50 text-yellow-800 px-3 py-1 rounded-full">
                          <Sparkles className="h-4 w-4 text-yellow-500" />
                          <span className="text-sm font-medium">
                            Most Popular
                          </span>
                        </div>
                      </div>
                    )}

                    <CardHeader
                      className={cn(
                        "transition-colors duration-300",
                        isSelected ? "bg-primary/5" : ""
                      )}
                    >
                      <div className="flex items-center gap-2">
                        <CardTitle className="text-xl">{plan.name}</CardTitle>
                      </div>
                      <CardDescription className="min-h-[40px]">
                        {plan.description}
                      </CardDescription>
                      <div className="mt-2">
                        <div className="flex items-baseline">
                          <span className="text-3xl font-bold">
                            {plan.price}
                          </span>
                          <span className="ml-1 text-sm text-muted-foreground">
                            {plan.currency}
                          </span>
                        </div>
                      </div>
                    </CardHeader>

                    <CardContent className="h-[320px] overflow-y-auto">
                      <ul className="space-y-3">
                        <motion.li
                          className="flex items-start"
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
                          <Check className="h-5 w-5 text-primary flex-shrink-0 mr-2" />
                          <span className="text-sm">
                            Up to{" "}
                            {plan.features.maxTeamMembers === 999
                              ? "unlimited"
                              : plan.features.maxTeamMembers}{" "}
                            team members
                          </span>
                        </motion.li>
                        <motion.li
                          className="flex items-start"
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
                          <Check className="h-5 w-5 text-primary flex-shrink-0 mr-2" />
                          <span className="text-sm">
                            Up to{" "}
                            {plan.features.maxRoadmapItems === 999
                              ? "unlimited"
                              : plan.features.maxRoadmapItems}{" "}
                            roadmap items
                          </span>
                        </motion.li>
                        <motion.li
                          className="flex items-start"
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
                          <Check className="h-5 w-5 text-primary flex-shrink-0 mr-2" />
                          <span className="text-sm">
                            {plan.features.maxOfferingPhases === 999
                              ? "Unlimited"
                              : plan.features.maxOfferingPhases}{" "}
                            offering phases
                          </span>
                        </motion.li>
                        <motion.li
                          className="flex items-start"
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
                          <Check className="h-5 w-5 text-primary flex-shrink-0 mr-2" />
                          <span className="text-sm">
                            {plan.features.maxUpdatePosts === 999
                              ? "Unlimited"
                              : plan.features.maxUpdatePosts}{" "}
                            update posts
                          </span>
                        </motion.li>
                        <motion.li
                          className="flex items-start"
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
                          <Check className="h-5 w-5 text-primary flex-shrink-0 mr-2" />
                          <span className="text-sm">
                            {plan.features.supportLevel === "basic"
                              ? "Standard support"
                              : plan.features.supportLevel === "standard"
                                ? "Priority support"
                                : "24/7 Dedicated support"}
                          </span>
                        </motion.li>
                        {plan.features.marketingSupport && (
                          <motion.li
                            className="flex items-start"
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
                            <Check className="h-5 w-5 text-primary flex-shrink-0 mr-2" />
                            <span className="text-sm">
                              Marketing support included
                            </span>
                          </motion.li>
                        )}
                        {plan.features.auditIncluded && (
                          <motion.li
                            className="flex items-start"
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
                            <Check className="h-5 w-5 text-primary flex-shrink-0 mr-2" />
                            <span className="text-sm">
                              Security audit included
                            </span>
                          </motion.li>
                        )}
                        {plan.features.customTokenomics && (
                          <motion.li
                            className="flex items-start"
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
                            <Check className="h-5 w-5 text-primary flex-shrink-0 mr-2" />
                            <span className="text-sm">Custom tokenomics</span>
                          </motion.li>
                        )}
                        {plan.features.priorityListing && (
                          <motion.li
                            className="flex items-start"
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
                            <Check className="h-5 w-5 text-primary flex-shrink-0 mr-2" />
                            <span className="text-sm">Priority listing</span>
                          </motion.li>
                        )}
                      </ul>
                    </CardContent>

                    <CardFooter className="bg-muted/30">
                      <Button
                        className={cn(
                          "w-full transition-all duration-300",
                          isSelected
                            ? "bg-primary text-primary-foreground"
                            : "bg-primary/10 text-primary hover:bg-primary hover:text-primary-foreground"
                        )}
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
                              className="flex items-center"
                            >
                              <Check className="mr-2 h-4 w-4" /> Selected
                            </motion.span>
                          ) : (
                            <span className="flex items-center">
                              <Check className="mr-2 h-4 w-4" /> Selected
                            </span>
                          )
                        ) : (
                          <span className="flex items-center">
                            Select {plan.name}{" "}
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
                                plan.recommended ? "text-primary" : ""
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
                            plan.recommended ? "border-primary" : ""
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
            <h4 className="font-medium mb-2">Why choose the right plan?</h4>
            <p className="text-sm text-muted-foreground mb-2">
              Your launch plan determines important limits and features
              throughout the token launch process:
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
