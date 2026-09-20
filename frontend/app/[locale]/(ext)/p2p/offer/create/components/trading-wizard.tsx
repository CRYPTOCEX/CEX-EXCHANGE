"use client";

import React from "react";

import {
  useState,
  createContext,
  useContext,
  useCallback,
  useMemo,
} from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import {
  ArrowLeft,
  ArrowRight,
  HelpCircle,
  CheckCircle2,
  AlertTriangle,
} from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useP2PStore } from "@/store/p2p/p2p-store";
import { useRouter } from "@/i18n/routing";
import { useTranslations } from "next-intl";

// Define the trading wizard context
type WizardContextType = {
  currentStep: number;
  totalSteps: number;
  goToStep: (step: number) => void;
  nextStep: () => void;
  prevStep: () => void;
  tradeData: any;
  updateTradeData: (data: any) => void;
  isStepComplete: (step: number) => boolean;
  markStepComplete: (step: number) => void;
};

const WizardContext = createContext<WizardContextType | undefined>(undefined);

export function useWizard() {
  const context = useContext(WizardContext);
  if (!context) {
    throw new Error("useWizard must be used within a TradingWizardProvider");
  }
  return context;
}

interface TradingWizardProps {
  children: React.ReactNode;
  initialData?: any;
}

export function TradingWizard({
  children,
  initialData = {},
}: TradingWizardProps) {
  const t = useTranslations("common");
  const tExtP2p = useTranslations("ext_p2p");
  const tExt = useTranslations("ext");
  const [currentStep, setCurrentStep] = useState(1);
  const [tradeData, setTradeData] = useState(initialData);
  const [completedSteps, setCompletedSteps] = useState<number[]>([]);
  const router = useRouter();
  const { updateOfferFormData, submitOffer, isSubmittingOffer } = useP2PStore();

  // Count the number of child steps
  const totalSteps = React.Children.count(children);

  const goToStep = useCallback(
    (step: number) => {
      if (step >= 1 && step <= totalSteps) {
        setCurrentStep(step);
      }
    },
    [totalSteps]
  );

  const handleComplete = async (data: any) => {
    try {
      // Update the store with the final form data
      updateOfferFormData(data);

      // Submit the offer using the store
      const success = await submitOffer();

      if (success) {
        // If successful, redirect to the offers page
        router.push("/p2p/offer");
      }
    } catch (error) {
      // Error submitting offer
    }
  };

  const handleCancel = () => {
    router.push("/p2p/offer");
  };

  const nextStep = useCallback(() => {
    if (currentStep < totalSteps) {
      setCurrentStep(currentStep + 1);
    } else {
      // If we're on the last step, complete the wizard
      handleComplete(tradeData);
    }
  }, [currentStep, totalSteps, tradeData]);

  const prevStep = useCallback(() => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  }, [currentStep]);

  const updateTradeData = useCallback((data: any) => {
    // Special handling for payment methods to ensure they're properly saved
    if (data.paymentMethods !== undefined) {

      // Ensure paymentMethods is always an array
      const paymentMethods = Array.isArray(data.paymentMethods)
        ? data.paymentMethods
        : [];

      setTradeData((prev: any) => ({
        ...prev,
        ...data,
        paymentMethods: paymentMethods,
        paymentMethodsCount: paymentMethods.length,
      }));
    } else {
      // Normal update for other data
      setTradeData((prev: any) => ({ ...prev, ...data }));
    }
  }, []);

  // Simplified isStepComplete function
  const isStepComplete = useCallback(
    (step: number) => {
      // Always allow navigation to previous steps
      if (step < currentStep) {
        return true;
      }

      // For the current step, check if it's in the completedSteps array
      return completedSteps.includes(step);
    },
    [completedSteps, currentStep]
  );

  // Simplified markStepComplete function
  const markStepComplete = useCallback((step: number) => {
    setCompletedSteps((prev) => {
      if (prev.includes(step)) {
        return prev;
      }
      return [...prev, step];
    });
  }, []);

  const isLastStep = currentStep === totalSteps;

  // Calculate progress percentage
  const progressPercentage = (currentStep / totalSteps) * 100;

  // In the WizardContext.Provider, use memoized values to prevent unnecessary re-renders
  const contextValue = useMemo(
    () => ({
      currentStep,
      totalSteps,
      goToStep,
      nextStep,
      prevStep,
      tradeData,
      updateTradeData,
      isStepComplete,
      markStepComplete,
    }),
    [
      currentStep,
      totalSteps,
      goToStep,
      nextStep,
      prevStep,
      tradeData,
      updateTradeData,
      isStepComplete,
      markStepComplete,
    ]
  );

  return (
    <WizardContext.Provider value={contextValue}>
      <Card className="w-full max-w-4xl mx-auto">
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle>{tExtP2p("guided_trading")}</CardTitle>
            <div className="text-sm text-muted-foreground">
              {t("step")}{" "}
              {currentStep}{" "}
              {t("of")}{" "}
              {totalSteps}
            </div>
          </div>
          <Progress value={progressPercentage} className="h-2" />
        </CardHeader>

        <CardContent>
          {React.Children.map(children, (child, index) => {
            // Only render the current step
            return index + 1 === currentStep ? child : null;
          })}
        </CardContent>

        <CardFooter className="flex justify-between">
          <div>
            {currentStep > 1 ? (
              <Button variant="outline" onClick={prevStep} disabled={isSubmittingOffer}>
                <ArrowLeft className="mr-2 h-4 w-4" />
                {t("back")}
              </Button>
            ) : (
              <Button variant="outline" onClick={handleCancel} disabled={isSubmittingOffer}>
                {t("cancel")}
              </Button>
            )}
          </div>

          {!isStepComplete(currentStep) && (
            <div className="flex items-center text-amber-600 dark:text-amber-400 text-sm">
              <AlertTriangle className="h-4 w-4 mr-2" />
              {tExtP2p("please_complete_all_required_fields")}
            </div>
          )}

          <Button 
            onClick={nextStep} 
            disabled={!isStepComplete(currentStep) || (isLastStep && isSubmittingOffer)}
          >
            {isLastStep ? (
              <>
                {isSubmittingOffer ? (
                  <>
                    <div className="animate-spin mr-2 h-4 w-4 border-2 border-current border-t-transparent rounded-full"></div>
                    {t('creating_ellipsis')}...
                  </>
                ) : (
                  <>
                    {t("complete")}
                    <CheckCircle2 className="ml-2 h-4 w-4" />
                  </>
                )}
              </>
            ) : (
              <>
                {tExt("continue")}
                <ArrowRight className="ml-2 h-4 w-4" />
              </>
            )}
          </Button>
        </CardFooter>
      </Card>
    </WizardContext.Provider>
  );
}

interface WizardStepProps {
  title: string;
  children: React.ReactNode;
  helpText?: string;
}

export function WizardStep({ title, children, helpText }: WizardStepProps) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium">{title}</h3>

        {helpText && (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon">
                  <HelpCircle className="h-5 w-5 text-muted-foreground" />
                </Button>
              </TooltipTrigger>
              <TooltipContent className="max-w-sm">
                <p>{helpText}</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}
      </div>

      <div>{children}</div>
    </div>
  );
}
