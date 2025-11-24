"use client";

import { AlertTitle } from "@/components/ui/alert";

import { useState, useEffect, useRef } from "react";
import {
  ArrowLeft,
  AlertTriangle,
  Info,
  Shield,
  Clock,
  FileCheck,
  LockKeyhole,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { $fetch } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { motion } from "framer-motion";
import { DynamicForm } from "../../components/dynamic-form";
import { useRouter } from "@/i18n/routing";
import { parseKycLevel } from "@/store/level-builder-store";
import { useParams } from "next/navigation";
import { kycDocumentUploader } from "@/utils/kyc-upload";
import { useTranslations } from "next-intl";

export function KycApplicationClient() {
  const t = useTranslations("dashboard");
  const router = useRouter();
  const { id } = useParams() as { id: string };
  const { toast } = useToast();
  const [level, setLevel] = useState<KycLevel | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [formData, setFormData] = useState<Record<string, any>>({});
  const [formFields, setFormFields] = useState<KycField[]>([]);
  const [steps, setSteps] = useState<{ title: string; fields: KycField[] }[]>([
    // Default empty step to prevent undefined errors
    { title: "Loading...", fields: [] },
  ]);
  const [formError, setFormError] = useState<string | null>(null);
  const formRef = useRef<HTMLDivElement>(null);

  const fetchLevel = async () => {
    try {
      // First try to fetch from user-specific endpoint
      let levelData: KycLevel | null = null;

      try {
        const { data, error } = await $fetch({
          url: `/api/user/kyc/level/${id}`,
          silentSuccess: true,
        });

        if (data) {
          levelData = data;
        }
      } catch (err) {
        console.warn(
          "Error fetching from user endpoint, trying admin endpoint:",
          err
        );
      }

      if (!levelData) {
        throw new Error("Failed to load KYC level details");
      }

      const parsedLevelData = parseKycLevel(levelData);
      setLevel(parsedLevelData);

      // Convert KYC fields to form fields
      if (parsedLevelData.fields && Array.isArray(parsedLevelData.fields)) {
        const convertedFields = convertKycFieldsToFormFields(
          parsedLevelData.fields
        );
        setFormFields(convertedFields);

        // Put all fields in a single step if there are no sections
        const sectionFields = convertedFields.filter(
          (field: KycField) => field.type === "SECTION"
        );

        if (sectionFields.length === 0) {
          // All fields in one step
          setSteps([
            {
              title: "Basic Information",
              fields: convertedFields,
            },
          ]);
        } else {
          // Group fields by sections
          const groupedSteps = groupFieldsIntoSteps(convertedFields);
          setSteps(groupedSteps);
        }
      } else {
        // Set default step if no fields
        setSteps([
          {
            title: "Basic Information",
            fields: [],
          },
        ]);
      }

      setIsLoading(false);
    } catch (error) {
      console.error("Error fetching KYC level:", error);
      toast({
        title: "Error",
        description: "Failed to load KYC level details. Please try again.",
        variant: "destructive",
      });

      // Set default step even on error
      setSteps([
        {
          title: "Error",
          fields: [],
        },
      ]);

      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchLevel();
  }, []);

  const convertKycFieldsToFormFields = (kycFields: any[]): KycField[] => {
    if (!Array.isArray(kycFields)) return [];

    return kycFields.map((field, index) => {
      const formField: KycField = {
        id: field.id || `field_${index}`,
        type: field.type,
        label: field.label || `Field ${index + 1}`,
        description: field.description,
        placeholder: field.placeholder,
        required: field.required || false,
        order: index,
        options: field.options
          ? field.options.map((opt: any) => ({
              label: opt.label || opt.value || "Option",
              value: opt.value || opt.label || `option_${index}`,
            }))
          : undefined,
        validation: field.validation
          ? {
              minLength: field.validation.minLength,
              maxLength: field.validation.maxLength,
              pattern: field.validation.pattern,
            }
          : undefined,
        accept: field.accept,
      };

      return formField;
    });
  };

  const groupFieldsIntoSteps = (
    fields: KycField[]
  ): { title: string; fields: KycField[] }[] => {
    if (!Array.isArray(fields) || fields.length === 0) {
      return [{ title: "Basic Information", fields: [] }];
    }

    // Find section fields first
    const sectionFields = fields.filter(
      (field: KycField) => field.type === "SECTION"
    );

    if (sectionFields.length > 0) {
      // Use sections as steps
      const steps: { title: string; fields: KycField[] }[] = [];
      let currentSectionIndex = -1;

      fields.forEach((field) => {
        if (field.type === "SECTION") {
          steps.push({
            title: field.label || `Section ${steps.length + 1}`,
            fields: [],
          });
          currentSectionIndex++;
        } else if (currentSectionIndex >= 0) {
          steps[currentSectionIndex].fields.push(field);
        } else {
          // Fields before any section
          if (steps.length === 0) {
            steps.push({
              title: "Basic Information",
              fields: [],
            });
          }
          steps[0].fields.push(field);
        }
      });

      return steps;
    } else {
      // All fields in one step
      return [
        {
          title: "Basic Information",
          fields: fields,
        },
      ];
    }
  };

  /**
   * Recursively finds all File objects within a data object and returns them
   * along with the nested path at which they're found.
   */
  function findFileFields(
    obj: any,
    path: string[] = []
  ): { path: string[]; file: File }[] {
    let results: { path: string[]; file: File }[] = [];

    // If this is a File, return it with the current path
    if (obj instanceof File) {
      results.push({ path, file: obj });
      return results;
    }

    // If it's a nested object or array, walk it
    if (obj && typeof obj === "object") {
      for (const key of Object.keys(obj)) {
        results = results.concat(findFileFields(obj[key], [...path, key]));
      }
    }

    return results;
  }

  const handleStepSubmit = async (data: Record<string, any>) => {
    try {
      setFormError(null);

      // 1) Recursively find all nested File fields
      const fileFields = findFileFields(data);

      // 2) Upload them all concurrently
      const uploadPromises = fileFields.map(async ({ path, file }) => {
        const uploadResult = await kycDocumentUploader({
          file,
          dir: "kyc-documents",
        });
        if (!uploadResult.success) {
          throw new Error(
            `File upload failed at path [${path.join(".")}]: ${uploadResult.error}`
          );
        }
        return { path, url: uploadResult.url };
      });

      // 3) Wait for all uploads
      const uploadedFiles = await Promise.all(uploadPromises);

      // 4) Merge the returned URLs back into the nested data structure
      //    at the same path the File was found
      uploadedFiles.forEach(({ path, url }) => {
        // e.g. path = ['identity-verification','passport-scan']
        // So we walk `data` until the second-last item
        let target = data;
        for (let i = 0; i < path.length - 1; i++) {
          target = target[path[i]];
        }
        // Then set the final property to the URL
        target[path[path.length - 1]] = url;
      });

      // 5) Merge into your "formData" state if needed
      const updatedFormData = { ...formData, ...data };
      setFormData(updatedFormData);

      // 6) Continue steps or finalize
      if (currentStep < steps.length - 1) {
        setCurrentStep(currentStep + 1);
        window.scrollTo(0, 0);
      } else {
        await handleFinalSubmit(updatedFormData);
      }
    } catch (error) {
      console.error("Error in form submission:", error);
      setFormError(
        error instanceof Error
          ? error.message
          : "An error occurred while submitting the form"
      );
    }
  };

  const handleFinalSubmit = async (formData: Record<string, any>) => {
    setIsSubmitting(true);
    setFormError(null);

    try {
      // Submit the application
      const { data, error } = await $fetch({
        url: "/api/user/kyc/application",
        method: "POST",
        body: {
          levelId: id,
          fields: formData,
        },
      });

      if (error) {
        setFormError(error);
        return;
      }

      if (!data?.application?.id) {
        setFormError("Invalid response from server. Please try again.");
        return;
      }

      router.push(`/user/kyc/application/${data.application.id}`);
    } catch (error) {
      console.error("Error submitting KYC application:", error);
      setFormError(
        error instanceof Error
          ? error.message
          : "An error occurred while submitting the application"
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePreviousStep = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
      window.scrollTo(0, 0);
    }
  };

  if (isLoading) {
    return (
      <div className="container max-w-4xl py-12 dark:bg-zinc-950">
        <div className="flex flex-col gap-8 animate-pulse">
          <div className="h-8 w-64 bg-gray-200 dark:bg-zinc-800 rounded"></div>
          <div className="h-4 w-full bg-gray-200 dark:bg-zinc-800 rounded"></div>
          <div className="h-96 bg-gray-200 dark:bg-zinc-800 rounded-lg"></div>
        </div>
      </div>
    );
  }

  if (!level) {
    return (
      <div className="container max-w-4xl py-12 dark:bg-zinc-950">
        <Alert
          variant="destructive"
          className="dark:bg-red-950 dark:border-red-800"
        >
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle className="dark:text-red-200">Error</AlertTitle>
          <AlertDescription className="dark:text-red-300">
            {t("the_requested_kyc_level_could_not_be_found")}.{" "}
            {t("please_go_back_and_try_again")}.
          </AlertDescription>
        </Alert>
        <Button className="mt-6" onClick={() => router.push("/user/kyc")}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          {t("back_to_kyc_dashboard")}
        </Button>
      </div>
    );
  }

  // Ensure currentStep is within bounds
  const safeCurrentStep = Math.min(Math.max(0, currentStep), steps.length - 1);
  if (safeCurrentStep !== currentStep) {
    setCurrentStep(safeCurrentStep);
  }

  const currentStepData = steps[safeCurrentStep] || {
    title: "Information",
    fields: [],
  };
  const progress = ((safeCurrentStep + 1) / steps.length) * 100;

  // Get next step title if available
  const nextStepTitle =
    safeCurrentStep < steps.length - 1
      ? steps[safeCurrentStep + 1]?.title
      : null;

  return (
    <div className="container max-w-4xl py-12 dark:bg-zinc-950">
      <div className="flex flex-col gap-8">
        {/* Header with back button and title */}
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            className="rounded-full h-10 w-10 bg-primary/10 hover:bg-primary/20 dark:bg-primary/20 dark:hover:bg-primary/30"
            onClick={() => router.push("/user/kyc")}
          >
            <ArrowLeft className="h-5 w-5" />
            <span className="sr-only">Back</span>
          </Button>
          <div>
            <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-primary to-blue-600 bg-clip-text text-transparent dark:from-primary dark:to-blue-400">
              {t("Level")}{" "}
              {level.level}: {level.name}
            </h1>
            <p className="text-muted-foreground dark:text-zinc-400 mt-1">
              {t("complete_your_verification_additional_features")}
            </p>
          </div>
        </div>

        {/* Progress indicator - only show if there are multiple steps */}
        {steps.length > 1 && (
          <div className="bg-gradient-to-r from-primary/10 to-blue-500/10 dark:from-primary/20 dark:to-blue-500/20 p-6 rounded-xl dark:bg-zinc-900/50">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="space-y-2 flex-1">
                <h3 className="font-semibold text-lg flex items-center gap-2 dark:text-zinc-100">
                  <Clock className="h-5 w-5 text-primary" />
                  <span>{t("verification_progress")}</span>
                </h3>
                <div className="flex justify-between text-sm mb-1">
                  <span className="font-medium dark:text-zinc-200">
                    {t("Step")}
                    {safeCurrentStep + 1}
                    {t("of")}
                    {steps.length}
                  </span>
                  <span className="text-primary font-semibold dark:text-primary-400">
                    {Math.round(progress)}
                    {t("%_complete")}
                  </span>
                </div>
                <Progress value={progress} className="h-2.5 bg-background" />
              </div>

              <div className="flex flex-col gap-1 md:items-end">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-primary"></div>
                  <span className="text-sm dark:text-zinc-300">
                    {t("current")}
                    {currentStepData.title}
                  </span>
                </div>
                {nextStepTitle && (
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-muted-foreground"></div>
                    <span className="text-sm text-muted-foreground dark:text-zinc-400">
                      {t("next")}
                      {nextStepTitle}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Security assurance */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-white dark:bg-zinc-900 rounded-xl p-4 shadow-sm border dark:border-zinc-800 flex items-center gap-3"
          >
            <div className="bg-green-100 dark:bg-green-950 p-2 rounded-full">
              <Shield className="h-5 w-5 text-green-600 dark:text-green-400" />
            </div>
            <div>
              <h3 className="font-medium text-sm dark:text-zinc-200">
                {t("secure_process")}
              </h3>
              <p className="text-xs text-muted-foreground dark:text-zinc-400">
                {t("your_data_is_encrypted_and_protected")}
              </p>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-white dark:bg-zinc-900 rounded-xl p-4 shadow-sm border dark:border-zinc-800 flex items-center gap-3"
          >
            <div className="bg-blue-100 dark:bg-blue-950 p-2 rounded-full">
              <LockKeyhole className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <h3 className="font-medium text-sm dark:text-zinc-200">
                {t("privacy_focused")}
              </h3>
              <p className="text-xs text-muted-foreground dark:text-zinc-400">
                {t("we_only_collect_whats_required")}
              </p>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="bg-white dark:bg-zinc-900 rounded-xl p-4 shadow-sm border dark:border-zinc-800 flex items-center gap-3"
          >
            <div className="bg-purple-100 dark:bg-purple-950 p-2 rounded-full">
              <FileCheck className="h-5 w-5 text-purple-600 dark:text-purple-400" />
            </div>
            <div>
              <h3 className="font-medium text-sm dark:text-zinc-200">
                {t("quick_verification")}
              </h3>
              <p className="text-xs text-muted-foreground dark:text-zinc-400">
                {t("most_applications_reviewed_within_24h")}
              </p>
            </div>
          </motion.div>
        </div>

        {/* Form error message */}
        {formError && (
          <Alert
            variant="destructive"
            className="dark:bg-red-950 dark:border-red-800"
          >
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle className="dark:text-red-200">Error</AlertTitle>
            <AlertDescription className="dark:text-red-300">
              {formError}
            </AlertDescription>
          </Alert>
        )}

        {/* Current step form */}
        <motion.div
          key={`step-${safeCurrentStep}`}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          transition={{ duration: 0.3 }}
        >
          <Card className="border-0 shadow-lg overflow-hidden dark:bg-zinc-900 dark:border-zinc-800">
            <div className="h-2 bg-gradient-to-r from-primary to-blue-600 dark:from-primary dark:to-blue-400"></div>
            <CardContent className="pt-6 dark:bg-zinc-900">
              <div ref={formRef as any}>
                <DynamicForm
                  fields={currentStepData.fields}
                  submitLabel={
                    safeCurrentStep === steps.length - 1
                      ? "Submit Application"
                      : "Continue"
                  }
                  cancelLabel="Previous"
                  onSubmit={handleStepSubmit}
                  onCancel={
                    safeCurrentStep > 0 ? handlePreviousStep : undefined
                  }
                  defaultValues={formData}
                  showProgressBar={false}
                  variant="embedded"
                />
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Information notice */}
        <Alert className="bg-gray-50 dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800">
          <Info className="h-4 w-4 text-blue-500 dark:text-blue-400" />
          <AlertTitle className="text-gray-800 dark:text-zinc-200">
            {t("important_information")}
          </AlertTitle>
          <AlertDescription className="text-gray-600 dark:text-zinc-400">
            {t("by_submitting_this_and_complete")}.{" "}
            {t("false_information_may_account_restrictions")}.
          </AlertDescription>
        </Alert>
      </div>
    </div>
  );
}
