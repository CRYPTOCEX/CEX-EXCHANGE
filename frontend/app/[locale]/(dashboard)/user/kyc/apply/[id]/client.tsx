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
import { Label } from "@/components/ui/label";
import { Loadable, SkeletonBlock, SkeletonText } from "@/components/ui/skeleton";
import { $fetch } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { m } from "framer-motion";
import { DynamicForm } from "../../components/dynamic-form";
import { useRouter } from "@/i18n/routing";
import { parseKycLevel } from "@/store/level-builder-store";
import { useParams } from "next/navigation";
import { kycDocumentUploader } from "@/utils/kyc-upload";
import { useTranslations } from "next-intl";

/**
 * The form's rows while the level's field list is still in flight.
 *
 * A field list has no knowable length or shape before it arrives — this page
 * renders whatever the admin configured for the level — so the honest thing is
 * a FIXED SMALL COUNT of rows inside the form's real box, and to let the count
 * settle when the real fields land. Three is a reservation, not a prediction —
 * reserve the container, not the exact number of children.
 *
 * Each row is the real `<Label>` carrying the exact class string
 * `DynamicForm` puts on its own labels, so the placeholder is measured by the
 * same text layout that will run on the real label. The control beneath is a
 * `SkeletonBlock` given the Input's own `h-9 w-full rounded-md`, because a text
 * input is a BOX with no text metrics of its own to measure.
 */
function PendingFormFields() {
  return (
    <>
      {[16, 11, 21].map((chars, i) => (
        <div key={i} className="relative mb-4">
          <Label className="text-sm font-medium mb-1.5 block text-foreground">
            <SkeletonText chars={chars} />
          </Label>
          <SkeletonBlock className="h-9 w-full rounded-md" />
        </div>
      ))}
    </>
  );
}

export function KycApplicationClient() {
  const t = useTranslations("dashboard_user");
  const tCommon = useTranslations("common");
  const tDashboard = useTranslations("dashboard");
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
    { title: `${tCommon("loading")}…`, fields: [] },
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

      // Check if level has fields - redirect if not configured
      if (
        !parsedLevelData.fields ||
        !Array.isArray(parsedLevelData.fields) ||
        parsedLevelData.fields.length === 0
      ) {
        toast({
          title: t("level_not_configured"),
          description:
            t("this_verification_level_is_not_yet"),
          variant: "destructive",
        });
        router.push("/user/kyc");
        return;
      }

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
              title: tCommon("basic_information"),
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
            title: tCommon("basic_information"),
            fields: [],
          },
        ]);
      }

      setIsLoading(false);
    } catch (error) {
      console.error("Error fetching KYC level:", error);
      toast({
        title: tCommon("error"),
        description: t("failed_to_load_kyc_level_details_please_try_again"),
        variant: "destructive",
      });

      // Set default step even on error
      setSteps([
        {
          title: tCommon("error"),
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
              label: opt.label || opt.value || tDashboard("option"),
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
      return [{ title: tCommon("basic_information"), fields: [] }];
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
              title: tCommon("basic_information"),
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
          title: tCommon("basic_information"),
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

  /*
    LOADING AND NOT-FOUND ARE DIFFERENT ANSWERS.

    This used to be two component-level bail-outs stacked on top of each other:
    `if (isLoading) return <three grey rectangles/>` followed by
    `if (!level) return <Alert/>`. Both threw the page away.

    The first was a second copy of the layout that agreed with it nowhere — an
    `h-8` bar for a `text-3xl` heading whose line box is 36px, an `h-4` bar for
    a paragraph, and one `h-96` rectangle standing in for the progress panel,
    three security tiles, a form of unknown length and a footer notice.
    Everything on the page moved when the level arrived.

    The second is a real state and stays, but it is a CONCLUSION — "we asked and
    there is no such level" — and it can only be drawn once the fetch is done.
    Naming it separately is what keeps the pending path silent instead of
    flashing "could not be found" at every visitor for the length of a request.
    It now renders as a banner inside the page's own frame rather than as a
    different page.
  */
  const levelNotFound = !isLoading && !level;

  // Ensure currentStep is within bounds
  const safeCurrentStep = Math.min(Math.max(0, currentStep), steps.length - 1);
  if (safeCurrentStep !== currentStep) {
    setCurrentStep(safeCurrentStep);
  }

  const currentStepData = steps[safeCurrentStep] || {
    title: tCommon("information"),
    fields: [],
  };
  const progress = ((safeCurrentStep + 1) / steps.length) * 100;

  // Get next step title if available
  const nextStepTitle =
    safeCurrentStep < steps.length - 1
      ? steps[safeCurrentStep + 1]?.title
      : null;

  return (
    <div className="container max-w-4xl py-12">
      <div className="flex flex-col gap-8">
        {/* Header with back button and title */}
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            className="rounded-full bg-primary/10 hover:bg-primary/20 dark:bg-primary/20 dark:hover:bg-primary/30"
            onClick={() => router.push("/user/kyc")}
          >
            <ArrowLeft className="h-5 w-5" />
            <span className="sr-only">Back</span>
          </Button>
          <div>
            {/* Identical gradient stops clipped to text — flat `--primary` at
                the cost of a `text-transparent` that can hide the heading.

                The heading renders in every state; only the level's number and
                name wait, inside the `text-3xl` element so the placeholder is
                measured at the heading's own size. When the level genuinely
                does not exist the page still has a title — the generic one —
                rather than an empty `<h1>` that collapses the header row. */}
            <h1 className="text-3xl font-bold tracking-tight text-primary">
              <Loadable
                loading={isLoading}
                placeholder={t("level_1_identity_verification")}
              >
                {level
                  ? `${tCommon("level")} ${level.level}: ${level.name}`
                  : tCommon("identity_verification")}
              </Loadable>
            </h1>
            <p className="text-muted-foreground mt-1">
              {t("complete_your_verification_additional_features")}
            </p>
          </div>
        </div>

        {/* The not-found path: a banner inside this page's frame, not a
            replacement for it. See `levelNotFound` above — it is deliberately
            false while the fetch is in flight. */}
        {levelNotFound && (
          <div>
            {/* `variant="destructive"` already paints `bg-destructive` with
                `text-destructive-foreground`, and the variant inks the
                description through its own descendant selector. Re-inking title
                and description `text-destructive` put the same token on top of
                itself, so both lines were invisible; the extra `bg-destructive`
                was a no-op duplicate. */}
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>Error</AlertTitle>
              <AlertDescription>
                {t("the_requested_kyc_level_could_not_be_found")}.{" "}
                {t("please_go_back_and_try_again")}.
              </AlertDescription>
            </Alert>
            <Button className="mt-6" onClick={() => router.push("/user/kyc")}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              {tCommon("back_to_kyc_dashboard")}
            </Button>
          </div>
        )}

        {/* Progress indicator — only shown when there are multiple steps.
            The wrapper below is a flat tint: both gradient stops were
            `primary/10` (and `/20` in dark), so it was never a gradient. */}
        {steps.length > 1 && (
          <div className="bg-primary/10 dark:bg-primary/20 p-6 rounded-xl">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="space-y-2 flex-1">
                <h3 className="font-semibold text-lg flex items-center gap-2 text-foreground">
                  <Clock className="h-5 w-5 text-primary" />
                  <span>{tCommon("verification_progress")}</span>
                </h3>
                <div className="flex justify-between text-sm mb-1">
                  <span className="font-medium text-foreground">
                    {tCommon("step")}
                    {safeCurrentStep + 1}
                    {tCommon("of")}
                    {steps.length}
                  </span>
                  <span className="text-primary font-semibold">
                    {Math.round(progress)}% {tCommon("complete")}
                  </span>
                </div>
                <Progress value={progress} className="h-2.5 bg-background" />
              </div>

              <div className="flex flex-col gap-1 md:items-end">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-primary"></div>
                  <span className="text-sm text-muted-foreground">
                    {tCommon("current")}
                    {currentStepData.title}
                  </span>
                </div>
                {nextStepTitle && (
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-muted-foreground"></div>
                    <span className="text-sm text-muted-foreground">
                      {tCommon("next")}
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
          <m.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-card rounded-lg p-4 border border-border flex items-center gap-3"
          >
            {/* Tint + token glyph, matching the sibling tile below. Solid
                `bg-success` under a `text-success` glyph was an invisible icon. */}
            <div className="bg-success/15 p-2 rounded-full">
              <Shield className="h-5 w-5 text-success" />
            </div>
            <div>
              <h3 className="font-medium text-sm text-foreground">
                {t("secure_process")}
              </h3>
              <p className="text-xs text-muted-foreground">
                {t("your_data_is_encrypted_and_protected")}
              </p>
            </div>
          </m.div>

          <m.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-card rounded-lg p-4 border border-border flex items-center gap-3"
          >
            <div className="bg-primary/15 p-2 rounded-full">
              <LockKeyhole className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h3 className="font-medium text-sm text-foreground">
                {t("privacy_focused")}
              </h3>
              <p className="text-xs text-muted-foreground">
                {t("we_only_collect_whats_required")}
              </p>
            </div>
          </m.div>

          <m.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="bg-card rounded-lg p-4 border border-border flex items-center gap-3"
          >
            <div className="bg-primary/15 p-2 rounded-full">
              <FileCheck className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h3 className="font-medium text-sm text-foreground">
                {t("quick_verification")}
              </h3>
              <p className="text-xs text-muted-foreground">
                {t("most_applications_reviewed_within_24h")}
              </p>
            </div>
          </m.div>
        </div>

        {/* Form error message. As above, the Alert variant owns the fill and
            both inks, so no local colour classes are needed. */}
        {formError && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>
              {formError}
            </AlertDescription>
          </Alert>
        )}

        {/* Current step form */}
        <m.div
          key={`step-${safeCurrentStep}`}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          transition={{ duration: 0.3 }}
        >
          <Card className="border-0 overflow-hidden border-border">
            {/* An accent rule, not a gradient: both stops were `primary`. */}
            <div className="h-2 bg-primary"></div>
            <CardContent className="pt-6">
              <div ref={formRef as any}>
                {/* Pending rows go ABOVE the form, inside its own box, rather
                    than replacing it: the submit/cancel row is knowable chrome
                    — its labels are literals in this file — so it renders in
                    both states instead of appearing late and pushing the footer
                    notice down. */}
                {isLoading && <PendingFormFields />}
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
                  /* The submit button now renders while the fields are still in
                     flight, so it has to be INERT until they arrive — a form
                     with zero fields validates clean, and submitting it would
                     POST an empty application. Same for a level that does not
                     exist. `isPreview` is the prop that already disables
                     submission without changing the button's box, which is
                     exactly the property needed here. */
                  isPreview={isLoading || levelNotFound}
                />
              </div>
            </CardContent>
          </Card>
        </m.div>

        {/* Information notice */}
        <Alert className="bg-muted border border-border">
          <Info className="h-4 w-4 text-primary" />
          <AlertTitle className="text-foreground">
            {tCommon("important_information")}
          </AlertTitle>
          <AlertDescription className="text-muted-foreground">
            {t("by_submitting_this_and_complete")}.{" "}
            {t("false_information_may_account_restrictions")}.
          </AlertDescription>
        </Alert>
      </div>
    </div>
  );
}
