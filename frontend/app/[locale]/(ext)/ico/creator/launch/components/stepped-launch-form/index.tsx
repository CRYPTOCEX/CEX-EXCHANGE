"use client";

import type React from "react";
import { useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowRight, ArrowLeft, AlertTriangle, Check } from "lucide-react";
import { $fetch } from "@/lib/api";
import { toast } from "sonner";

// Import step components
import TokenDetailsStep from "./steps/token-details";
import TokenConfigurationStep from "./steps/token-configuration";
import TokenResourcesStep from "./steps/token-resources";
import TeamMembersStep from "./steps/team-members";
import RoadmapStep from "./steps/roadmap";
import ContactInfoStep from "./steps/contact-info";
import OfferingStructureStep from "./steps/offering-structure";
import LaunchPlanStep from "./steps/launch-plan";
import PaymentStep from "./steps/payment";
import ReviewStep from "./steps/review";
import SuccessStep from "./steps/success";
import type { FormData } from "./types";
import { imageUploader } from "@/utils/upload";
import { useUserStore } from "@/store/user";
import { useConfigStore } from "@/store/config";
import KycRequiredNotice from "@/components/blocks/kyc/kyc-required-notice";
import { useTranslations } from "next-intl";

export const INITIAL_FORM_DATA: FormData = {
  name: "",
  symbol: "",
  icon: null, // can be a File or URL
  tokenType: "",
  blockchain: "",
  totalSupply: 0,
  description: "",
  tokenDetails: {
    whitepaper: "",
    github: "",
    telegram: "",
    twitter: "",
    useOfFunds: [],
  },
  teamMembers: [
    {
      id: "1",
      name: "",
      role: "",
      bio: "",
      avatar: "", // can be a File or URL
      linkedin: "",
      twitter: "",
      github: "",
      website: "",
    },
  ],
  roadmap: [
    {
      id: "1",
      title: "",
      description: "",
      date: null,
      completed: false,
    },
  ],
  website: "",
  targetAmount: 0,
  startDate: null,
  phases: [
    {
      id: "1",
      name: "Phase 1",
      tokenPrice: 0,
      allocation: 0,
      durationDays: 0,
    },
  ],
  termsAccepted: false,
  selectedPlan: null,
  paymentComplete: false,
};

export const STEPS = [
  {
    title: "Launch Plan",
    description: "Select your launch package",
  },
  {
    title: "Token Details",
    description: "Basic information about your token",
  },
  {
    title: "Token Configuration",
    description: "Technical details and description",
  },
  {
    title: "Token Resources",
    description: "Links and resource allocation",
  },
  {
    title: "Team Members",
    description: "Information about your team",
  },
  {
    title: "Roadmap",
    description: "Your project's development plan",
  },
  {
    title: "Contact Information",
    description: "How to reach your team",
  },
  {
    title: "Offering Structure",
    description: "Phases and pricing for your token offering",
  },
  {
    title: "Payment",
    description: "Complete your payment to launch",
  },
  {
    title: "Review & Submit",
    description: "Review your information and submit",
  },
];

export function SteppedLaunchForm({
  isAdmin = false,
  onAdminSubmit,
  isAdminSubmitting,
}: {
  isAdmin?: boolean;
  onAdminSubmit?: (formData: FormData) => Promise<void>;
  isAdminSubmitting?: boolean;
}) {
  const t = useTranslations("ext");
  const { hasKyc, canAccessFeature } = useUserStore();
  const { settings } = useConfigStore();

  const [currentStep, setCurrentStep] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState<FormData>(INITIAL_FORM_DATA);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmissionComplete, setIsSubmissionComplete] = useState(false);

  // 1. Only gate if KYC is enabled globally
  const kycEnabled = settings?.kycStatus === true || settings?.kycStatus === "true";
  const hasCreateIcoAccess = hasKyc() && canAccessFeature("create_ico");

  if (kycEnabled && !hasCreateIcoAccess) {
    // Feature-specific KYC message
    return <KycRequiredNotice feature="create_ico" />;
  }

  const updateFormData = (field: keyof FormData, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    // Clear error when field is updated
    if (errors[field]) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  // Check if a specific step has validation errors
  const hasStepErrors = (step: number): boolean => {
    const tempErrors: Record<string, string> = {};

    switch (step) {
      case 0: // Launch Plan
        if (!formData.selectedPlan) {
          tempErrors.selectedPlan = "Please select a launch plan";
        }
        break;

      case 1: // Token Details
        if (!formData.name || formData.name.length < 2) {
          tempErrors.name = "Token name must be at least 2 characters";
        }
        if (
          !formData.symbol ||
          formData.symbol.length < 2 ||
          formData.symbol.length > 5
        ) {
          tempErrors.symbol = "Token symbol must be between 2 and 5 characters";
        }
        break;

      case 2: // Token Configuration
        if (!formData.tokenType) {
          tempErrors.tokenType = "Token type is required";
        }
        if (!formData.blockchain) {
          tempErrors.blockchain = "Blockchain is required";
        }
        if (!formData.totalSupply || formData.totalSupply <= 0) {
          tempErrors.totalSupply = "Total supply must be a positive number";
        }
        if (!formData.description || formData.description.length < 50) {
          tempErrors.description = "Description must be at least 50 characters";
        }
        break;

      case 3: // Token Resources
        if (!formData.tokenDetails.whitepaper) {
          tempErrors.whitepaper = "Whitepaper link is required";
        }
        if (formData.tokenDetails.useOfFunds.length === 0) {
          tempErrors.useOfFunds = "At least one use of funds is required";
        }
        break;

      case 4: {
        // Team Members
        const teamErrors: string[] = [];
        formData.teamMembers.forEach((member, index) => {
          if (!member.name) {
            teamErrors.push(`Team member ${index + 1}: Name is required`);
          }
          if (!member.role) {
            teamErrors.push(`Team member ${index + 1}: Role is required`);
          }
          if (!member.bio || member.bio.length < 20) {
            teamErrors.push(
              `Team member ${index + 1}: Bio must be at least 20 characters`
            );
          }
        });
        if (teamErrors.length > 0) {
          tempErrors.teamMembers = teamErrors.join(", ");
        }
        break;
      }

      case 5: {
        // Roadmap
        const roadmapErrors: string[] = [];
        formData.roadmap.forEach((item, index) => {
          if (!item.title) {
            roadmapErrors.push(`Roadmap item ${index + 1}: Title is required`);
          }
          if (!item.description) {
            roadmapErrors.push(
              `Roadmap item ${index + 1}: Description is required`
            );
          }
          if (!item.date) {
            roadmapErrors.push(`Roadmap item ${index + 1}: Date is required`);
          }
        });
        if (roadmapErrors.length > 0) {
          tempErrors.roadmap = roadmapErrors.join(", ");
        }
        break;
      }

      case 6: // Contact Information
        if (!formData.website || !formData.website.startsWith("http")) {
          tempErrors.website = "Please enter a valid URL";
        }
        break;

      case 7: {
        // Offering Structure
        if (!formData.targetAmount || formData.targetAmount <= 0) {
          tempErrors.targetAmount = "Target amount must be a positive number";
        }
        if (!formData.startDate) {
          tempErrors.startDate = "Start date is required";
        }

        // Validate phases
        const phaseErrors: string[] = [];
        formData.phases.forEach((phase, index) => {
          if (!phase.name) {
            phaseErrors.push(`Phase ${index + 1}: Name is required`);
          }
          if (!phase.tokenPrice || phase.tokenPrice <= 0) {
            phaseErrors.push(
              `Phase ${index + 1}: Token price must be a positive number`
            );
          }
          if (!phase.allocation || phase.allocation <= 0) {
            phaseErrors.push(
              `Phase ${index + 1}: Allocation must be a positive number`
            );
          }
          if (!phase.durationDays || phase.durationDays <= 0) {
            phaseErrors.push(
              `Phase ${index + 1}: Duration must be a positive number`
            );
          }
        });
        if (phaseErrors.length > 0) {
          tempErrors.phases = phaseErrors.join(", ");
        }
        break;
      }

      case 8: // Payment
        // Skip payment validation for admin
        if (!formData.paymentComplete && !isAdmin) {
          tempErrors.payment = "Payment must be completed before submission";
        }
        break;

      case 9: // Review & Submit
        if (!formData.termsAccepted) {
          tempErrors.termsAccepted = "You must accept the terms and conditions";
        }
        break;
    }

    return Object.keys(tempErrors).length > 0;
  };

  // Validate the current step and set errors in state
  const validateStep = (step: number): boolean => {
    const newErrors: Record<string, string> = {};

    switch (step) {
      case 0: // Launch Plan
        if (!formData.selectedPlan) {
          newErrors.selectedPlan = "Please select a launch plan";
        }
        break;

      case 1: // Token Details
        if (!formData.name || formData.name.length < 2) {
          newErrors.name = "Token name must be at least 2 characters";
        }
        if (
          !formData.symbol ||
          formData.symbol.length < 2 ||
          formData.symbol.length > 5
        ) {
          newErrors.symbol = "Token symbol must be between 2 and 5 characters";
        }
        break;

      case 2: // Token Configuration
        if (!formData.tokenType) {
          newErrors.tokenType = "Token type is required";
        }
        if (!formData.blockchain) {
          newErrors.blockchain = "Blockchain is required";
        }
        if (!formData.totalSupply || formData.totalSupply <= 0) {
          newErrors.totalSupply = "Total supply must be a positive number";
        }
        if (!formData.description || formData.description.length < 50) {
          newErrors.description = "Description must be at least 50 characters";
        }
        break;

      case 3: // Token Resources
        if (!formData.tokenDetails.whitepaper) {
          newErrors.whitepaper = "Whitepaper link is required";
        }
        if (formData.tokenDetails.useOfFunds.length === 0) {
          newErrors.useOfFunds = "At least one use of funds is required";
        }
        break;

      case 4: {
        // Team Members
        const teamErrors: string[] = [];
        formData.teamMembers.forEach((member, index) => {
          if (!member.name) {
            teamErrors.push(`Team member ${index + 1}: Name is required`);
          }
          if (!member.role) {
            teamErrors.push(`Team member ${index + 1}: Role is required`);
          }
          if (!member.bio || member.bio.length < 20) {
            teamErrors.push(
              `Team member ${index + 1}: Bio must be at least 20 characters`
            );
          }
        });
        if (teamErrors.length > 0) {
          newErrors.teamMembers = teamErrors.join(", ");
        }
        break;
      }

      case 5: {
        // Roadmap
        const roadmapErrors: string[] = [];
        formData.roadmap.forEach((item, index) => {
          if (!item.title) {
            roadmapErrors.push(`Roadmap item ${index + 1}: Title is required`);
          }
          if (!item.description) {
            roadmapErrors.push(
              `Roadmap item ${index + 1}: Description is required`
            );
          }
          if (!item.date) {
            roadmapErrors.push(`Roadmap item ${index + 1}: Date is required`);
          }
        });
        if (roadmapErrors.length > 0) {
          newErrors.roadmap = roadmapErrors.join(", ");
        }
        break;
      }

      case 6: // Contact Information
        if (!formData.website || !formData.website.startsWith("http")) {
          newErrors.website = "Please enter a valid URL";
        }
        break;

      case 7: {
        // Offering Structure
        if (!formData.targetAmount || formData.targetAmount <= 0) {
          newErrors.targetAmount = "Target amount must be a positive number";
        }
        if (!formData.startDate) {
          newErrors.startDate = "Start date is required";
        }

        // Validate phases
        const phaseErrors: string[] = [];
        formData.phases.forEach((phase, index) => {
          if (!phase.name) {
            phaseErrors.push(`Phase ${index + 1}: Name is required`);
          }
          if (!phase.tokenPrice || phase.tokenPrice <= 0) {
            phaseErrors.push(
              `Phase ${index + 1}: Token price must be a positive number`
            );
          }
          if (!phase.allocation || phase.allocation <= 0) {
            phaseErrors.push(
              `Phase ${index + 1}: Allocation must be a positive number`
            );
          }
          if (!phase.durationDays || phase.durationDays <= 0) {
            phaseErrors.push(
              `Phase ${index + 1}: Duration must be a positive number`
            );
          }
        });
        if (phaseErrors.length > 0) {
          newErrors.phases = phaseErrors.join(", ");
        }
        break;
      }

      case 8: // Payment
        // Skip payment validation for admin
        if (!formData.paymentComplete && !isAdmin) {
          newErrors.payment = "Payment must be completed before submission";
        }
        break;

      case 9: // Review & Submit
        if (!formData.termsAccepted) {
          newErrors.termsAccepted = "You must accept the terms and conditions";
        }
        break;
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Function to upload images before final submission
  const handleImageUploads = async (data: FormData): Promise<FormData> => {
    const updatedData = { ...data };

    // Upload token icon if it is a File
    if (data.icon && data.icon instanceof File) {
      const iconUpload = await imageUploader({
        file: data.icon,
        dir: "icons",
        size: { maxWidth: 1024, maxHeight: 728 },
      });
      if (iconUpload.success) {
        updatedData.icon = iconUpload.url;
      } else {
        throw new Error(iconUpload.error || "Icon upload failed");
      }
    }

    // Upload avatars for team members
    const updatedTeamMembers = await Promise.all(
      data.teamMembers.map(async (member) => {
        if (member.avatar && member.avatar instanceof File) {
          const avatarUpload = await imageUploader({
            file: member.avatar,
            dir: "team-avatars",
            size: { maxWidth: 500, maxHeight: 500 },
          });
          if (avatarUpload.success) {
            return { ...member, avatar: avatarUpload.url };
          } else {
            throw new Error(
              avatarUpload.error || "Team member avatar upload failed"
            );
          }
        }
        return member;
      })
    );
    updatedData.teamMembers = updatedTeamMembers;
    return updatedData;
  };

  const handleNext = () => {
    if (validateStep(currentStep)) {
      setCurrentStep((prev) => Math.min(prev + 1, STEPS.length - 1));
    } else {
      // Show specific step errors with step name
      const stepName = STEPS[currentStep].title;
      const errorMessages = Object.values(errors);
      toast("Validation Error", {
        description: `${stepName}: ${errorMessages.join(", ")}`,
        icon: <AlertTriangle className="w-5 h-5 mr-2 text-red-500" />,
      });
    }
  };

  const handleBack = () => {
    setCurrentStep((prev) => Math.max(prev - 1, 0));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateStep(currentStep)) {
      // Show specific step errors with step name
      const stepName = STEPS[currentStep].title;
      const errorMessages = Object.values(errors);
      toast("Validation Error", {
        description: `${stepName}: ${errorMessages.join(", ")}`,
        icon: <AlertTriangle className="w-5 h-5 mr-2 text-red-500" />,
      });
      return;
    }

    // If in admin mode, use the admin submit handler
    if (isAdmin && onAdminSubmit) {
      await onAdminSubmit(formData);
      return;
    }

    setIsSubmitting(true);

    try {
      // Upload any File objects and update the form data with the returned URLs
      const updatedFormData = await handleImageUploads(formData);

      const payload = {
        ...updatedFormData,
        selectedPlan: updatedFormData.selectedPlan
          ? updatedFormData.selectedPlan.id
          : null,
      };

      const { data, error } = await $fetch({
        url: "/api/ico/creator/launch",
        method: "POST",
        body: payload,
      });

      if (!error) {
        // Show success screen instead of resetting to step 1
        setIsSubmissionComplete(true);
      }
    } catch (uploadError: any) {
      toast("Upload Error", {
        description: uploadError.message,
        icon: <AlertTriangle className="w-5 h-5 mr-2 text-red-500" />,
      });
    }
    setIsSubmitting(false);
  };

  // Render the current step content
  const renderStepContent = () => {
    if (isSubmissionComplete) {
      return <SuccessStep name={formData.name} symbol={formData.symbol} />;
    }

    switch (currentStep) {
      case 0:
        return (
          <LaunchPlanStep updateFormData={updateFormData} errors={errors} />
        );
      case 1:
        return (
          <TokenDetailsStep
            formData={formData}
            updateFormData={updateFormData}
            errors={errors}
          />
        );
      case 2:
        return (
          <TokenConfigurationStep
            formData={formData}
            updateFormData={updateFormData}
            errors={errors}
          />
        );
      case 3:
        return (
          <TokenResourcesStep
            formData={formData}
            updateFormData={updateFormData}
            errors={errors}
          />
        );
      case 4:
        return (
          <TeamMembersStep
            formData={formData}
            updateFormData={updateFormData}
            errors={errors}
            maxTeamMembers={formData.selectedPlan?.maxTeamMembers || 999}
          />
        );
      case 5:
        return (
          <RoadmapStep
            formData={formData}
            updateFormData={updateFormData}
            errors={errors}
            maxRoadmapItems={formData.selectedPlan?.maxRoadmapItems || 999}
          />
        );
      case 6:
        return (
          <ContactInfoStep
            formData={formData}
            updateFormData={updateFormData}
            errors={errors}
          />
        );
      case 7:
        return (
          <OfferingStructureStep
            formData={formData}
            updateFormData={updateFormData}
            errors={errors}
            maxPhases={formData.selectedPlan?.maxPhases || 999}
          />
        );
      case 8:
        return (
          <PaymentStep
            formData={formData}
            updateFormData={updateFormData}
            errors={errors}
            isAdmin={isAdmin}
          />
        );
      case 9:
        return (
          <ReviewStep
            formData={formData}
            updateFormData={updateFormData}
            errors={errors}
          />
        );
      default:
        return null;
    }
  };

  return (
    <Card>
      {!isSubmissionComplete && (
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                {STEPS[currentStep].title}
                {hasStepErrors(currentStep) && (
                  <AlertTriangle className="w-4 h-4 text-red-500" />
                )}
              </CardTitle>
              <CardDescription>
                {STEPS[currentStep].description}
              </CardDescription>
            </div>
            <div className="text-sm text-muted-foreground">
              {t("Step")} {currentStep + 1} {t("of")} {STEPS.length}
            </div>
          </div>
          <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
            <div
              className={`h-full transition-all duration-300 ${
                hasStepErrors(currentStep) ? "bg-red-500" : "bg-primary"
              }`}
              style={{
                width: `${((currentStep + 1) / STEPS.length) * 100}%`,
              }}
            />
          </div>
          {/* Step indicators */}
          <div className="flex justify-between mt-4">
            {STEPS.map((step, index) => (
              <div
                key={index}
                className={`flex flex-col items-center text-xs ${
                  index === currentStep
                    ? "text-primary font-medium"
                    : index < currentStep
                    ? "text-green-600"
                    : "text-muted-foreground"
                }`}
              >
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center border-2 mb-1 ${
                    index === currentStep
                      ? hasStepErrors(currentStep)
                        ? "border-red-500 bg-red-50 text-red-500"
                        : "border-primary bg-primary/10 text-primary"
                      : index < currentStep
                      ? "border-green-600 bg-green-50 text-green-600"
                      : "border-muted-foreground/30 text-muted-foreground"
                  }`}
                >
                  {index < currentStep ? (
                    <Check className="w-4 h-4" />
                  ) : hasStepErrors(index) && index === currentStep ? (
                    <AlertTriangle className="w-4 h-4" />
                  ) : (
                    index + 1
                  )}
                </div>
                <span className="text-center max-w-16 leading-tight">
                  {step.title.split(" ")[0]}
                </span>
              </div>
            ))}
          </div>
        </CardHeader>
      )}
      <CardContent>{renderStepContent()}</CardContent>
      {!isSubmissionComplete && (
        <CardFooter className="flex justify-between">
          <Button
            type="button"
            variant="outline"
            onClick={handleBack}
            disabled={currentStep === 0}
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            {t("Back")}
          </Button>
          {currentStep === STEPS.length - 1 ? (
            <Button
              onClick={handleSubmit}
              disabled={isAdmin ? isAdminSubmitting : isSubmitting}
            >
              {isAdmin
                ? isAdminSubmitting
                  ? "Creating..."
                  : "Create Offering"
                : isSubmitting
                  ? "Submitting..."
                  : "Submit Application"}
            </Button>
          ) : (
            <Button onClick={handleNext}>
              {t("Next")}
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          )}
        </CardFooter>
      )}
    </Card>
  );
}

export default SteppedLaunchForm;
