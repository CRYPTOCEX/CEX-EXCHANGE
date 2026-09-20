"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { ArrowLeft, AlertTriangle, Info, CheckCircle } from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Label } from "@/components/ui/label";
import { SkeletonBlock, SkeletonText } from "@/components/ui/skeleton";
import { m } from "framer-motion";
import { DynamicForm } from "../../../components/dynamic-form";
import { $fetch } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { parseKycLevel } from "@/store/level-builder-store";
import { kycDocumentUploader } from "@/utils/kyc-upload";
import { useRouter } from "@/i18n/routing";
import { useTranslations } from "next-intl";

/**
 * The form's rows while the application's field list is in flight.
 *
 * The fields are whatever the admin configured for this KYC level, so their
 * number and kind are unknowable before the fetch resolves: reserve the
 * container and a FIXED SMALL COUNT of rows, and accept that the count settles.
 *
 * The label is the real `<Label>` carrying the exact class string `DynamicForm`
 * puts on its own labels, so the placeholder is laid out by the same text
 * layout that will run on the real label. The control below is a
 * `SkeletonBlock` given the Input's own `h-9 w-full rounded-md` — a text input
 * is a box, and a box has no text metrics to measure itself by.
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

export default function UpdateApplicationClient() {
  const t = useTranslations("dashboard_user");
  const tCommon = useTranslations("common");
  const tDashboard = useTranslations("dashboard");
  const { id } = useParams() as { id: string };
  const router = useRouter();
  const { toast } = useToast();

  const [application, setApplication] = useState<any>(null);
  const [level, setLevel] = useState<any>(null);
  const [formFields, setFormFields] = useState<any[]>([]);
  const [formData, setFormData] = useState<Record<string, any>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [updateSuccess, setUpdateSuccess] = useState(false);

  const fetchApplication = async () => {
    try {
      setIsLoading(true);

      const { data, error } = await $fetch({
        url: `/api/user/kyc/application/${id}`,
        silentSuccess: true,
      });

      if (error) {
        throw new Error(error);
      }

      // Parse application data
      const { level: fetchedLevel, ...fetchedApplication } = data;

      // Parse JSON strings
      const parsedData =
        typeof fetchedApplication.data === "string"
          ? JSON.parse(fetchedApplication.data)
          : fetchedApplication.data;

      const parsedLevel = parseKycLevel(fetchedLevel);

      setApplication({
        ...fetchedApplication,
        data: parsedData,
      });

      setLevel(parsedLevel);
      setFormData(parsedData || {});

      // Convert KYC fields to form fields
      if (parsedLevel.fields && Array.isArray(parsedLevel.fields)) {
        const convertedFields = convertKycFieldsToFormFields(
          parsedLevel.fields,
          parsedData
        );
        setFormFields(convertedFields);
      }

      setIsLoading(false);
    } catch (error) {
      console.error("Error fetching application:", error);
      toast({
        title: tCommon("error"),
        description: t("failed_to_load_application_details_please"),
        variant: "destructive",
      });
      setIsLoading(false);
    }
  };

  // Fetch application data - only run once on mount
  useEffect(() => {
    fetchApplication();
  }, []);

  // Convert KYC fields to form fields
  const convertKycFieldsToFormFields = (
    kycFields: any[],
    existingData: any = {}
  ): any[] => {
    if (!Array.isArray(kycFields)) return [];

    return kycFields.map((field, index) => {
      // For IDENTITY type fields, we need special handling
      if (field.type === "IDENTITY") {
        // Get the selected identity type from existing data
        const identityData = existingData[field.id] || {};
        const identityType =
          identityData.type || field.defaultType || "passport";

        // Create a form field for the identity type
        return {
          id: field.id,
          type: field.type,
          label: field.label || `Field ${index + 1}`,
          description: field.description,
          required: field.required || false,
          order: index,
          identityTypes: field.identityTypes,
          defaultType: identityType,
          // Pass the entire identity data object directly
          // This ensures all existing file URLs are preserved
          value: identityData,
        };
      }

      // For regular fields
      return {
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
    });
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

  // Handle form submission
  const handleSubmit = async (data: Record<string, any>) => {
    try {
      setFormError(null);
      setIsSubmitting(true);

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

      // 5) Merge with existing data
      const updatedFormData = { ...application.data, ...data };

      // 6) Submit the updated application
      const { data: responseData, error } = await $fetch({
        url: `/api/user/kyc/application/${id}`,
        method: "PUT",
        body: {
          fields: updatedFormData,
        },
      });

      if (error) {
        throw new Error(error);
      }

      setUpdateSuccess(true);

      // Redirect after a short delay to show success message
      setTimeout(() => {
        router.push(`/user/kyc/application/${id}`);
      }, 2000);
    } catch (error) {
      console.error("Error updating application:", error);
      setFormError(
        error instanceof Error
          ? error.message
          : "An error occurred while updating the application"
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  /*
    LOADING IS NOT NOT-FOUND, AND THIS FILE PROVED IT THE HARD WAY.

    Two component-level bail-outs used to sit here. The first,
    `if (isLoading) return <three grey rectangles/>`, was a second copy of the
    layout that matched it nowhere: an `h-8` bar for a 36px heading, an `h-4`
    bar for a paragraph, and one `h-96` rectangle standing in for the amber
    notice, the admin-notes card, the form and the footer alert. Every one of
    those moved when the fetch landed.

    The second, `if (!application || !level)`, is the same expression the whole
    page is about — but it is only TRUE-as-an-answer once the request is done.
    Dropping the loading swap without splitting them would have flashed
    "could not be found" at every visitor for the length of the request. The
    not-found state is now a banner inside this page's own frame.
  */
  const applicationNotFound = !isLoading && (!application || !level);

  return (
    <div className="container max-w-4xl py-12">
      <div className="flex flex-col gap-8">
        {/* Header with back button and title */}
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            className="rounded-full bg-primary/10 hover:bg-primary/20"
            onClick={() => router.push(`/user/kyc/application/${id}`)}
          >
            <ArrowLeft className="h-5 w-5" />
            <span className="sr-only">Back</span>
          </Button>
          <div>
            {/* Was a `from-primary to-primary` gradient clipped to the text —
                two identical stops, so it only ever painted flat `--primary`
                while costing a `text-transparent` that hides the heading
                outright anywhere the background-clip is unsupported. */}
            <h1 className="text-3xl font-bold tracking-tight text-primary">
              {tCommon("update_application")}
            </h1>
            <p className="text-muted-foreground mt-1">
              {t("provide_the_additional_your_verification")}
            </p>
          </div>
        </div>

        {/* Application status.
            Every notice on this page painted a SOLID `bg-warning` / `bg-success`
            and then inked it `text-warning` / `text-success` — the same token on
            itself, so the copy and the glyphs were invisible in both themes.
            A notice ground is a TINT (`/10`) and its ink is the derived on-tint
            `--{tone}-ink`, which is what `<Alert tone>` uses. */}
        <div className="bg-warning/10 border-l-4 border-l-warning p-4 rounded-r-lg">
          <div className="flex items-start">
            <div className="bg-warning/15 p-2 rounded-full mr-3">
              <AlertTriangle className="h-5 w-5 text-warning-ink" />
            </div>
            <div>
              <h3 className="font-medium text-warning-ink">
                {tDashboard("additional_information_required")}
              </h3>
              <p className="text-warning-ink text-sm mt-1">
                {t("your_application_needs_with_verification")}.
              </p>
            </div>
          </div>
        </div>

        {/* The not-found path: a banner inside this page's frame, not a
            replacement for it. `applicationNotFound` is deliberately false
            while the fetch is in flight — see above. */}
        {applicationNotFound && (
          <div>
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>Error</AlertTitle>
              <AlertDescription>
                {t("the_requested_application_could_not_be_found")}.{" "}
                {t("please_go_back_and_try_again")}.
              </AlertDescription>
            </Alert>
            <Button className="mt-6" onClick={() => router.push("/user/kyc")}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              {tCommon("back_to_kyc_dashboard")}
            </Button>
          </div>
        )}

        {/* Admin notes.
            `?.` because `application` is null until the fetch lands — this
            whole subtree used to be unreachable before then and is not any
            more. The card stays gated on the DATA rather than being reserved
            while loading: `adminNotes` is optional on the decision endpoint, so
            reserving a card that may never come would trade a growth for an
            equal-sized shrink. */}
        {application?.adminNotes && (
          <Card className="border-warning/30 bg-warning/10">
            <CardHeader>
              <CardTitle className="flex items-center text-warning-ink">
                <Info className="h-5 w-5 mr-2 text-warning-ink" />
                {t("admin_request")}
              </CardTitle>
              <CardDescription className="text-warning-ink">
                {t("the_following_information_verification_team")}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="bg-card/50 p-4 rounded-lg border border-warning/30">
                <p className="text-warning-ink whitespace-pre-wrap">
                  {application.adminNotes}
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Success message */}
        {updateSuccess && (
          <m.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-success/10 border border-success/30 rounded-lg p-4"
          >
            <div className="flex items-center">
              <div className="bg-success/15 p-2 rounded-full mr-3">
                <CheckCircle className="h-5 w-5 text-success-ink" />
              </div>
              <div>
                <h3 className="font-medium text-success-ink">
                  {t("application_updated_successfully")}
                </h3>
                <p className="text-success-ink text-sm mt-1">
                  {t("your_application_has_our_team")}.
                </p>
              </div>
            </div>
          </m.div>
        )}

        {/* Form error message */}
        {formError && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{formError}</AlertDescription>
          </Alert>
        )}

        {/* Update form */}
        <Card className="border-0 overflow-hidden">
          {/* A 2px accent rule, not a gradient: both stops were `warning`. */}
          <div className="h-2 bg-warning"></div>
          <CardContent className="pt-6">
            {/* Pending rows sit ABOVE the form inside its own box rather than
                replacing it, so the submit/cancel row — which is knowable
                chrome — keeps its place instead of appearing late and pushing
                the footer notice down. */}
            {isLoading && <PendingFormFields />}
            <DynamicForm
              /*
                THE KEY IS LOAD-BEARING, not decoration.

                `DynamicForm` seeds its internal `formData` from `defaultValues`
                with `useState(defaultValues)` — i.e. ONCE, at mount, with no
                effect syncing it afterwards. Now that the form renders while
                the fetch is in flight it would mount against `{}` and keep it,
                so every previously-submitted value the user is here to CORRECT
                would come up blank. Keying on the application id remounts it
                exactly once, when the data arrives, and the prefill works as it
                did when the form only existed after the fetch.
              */
              key={application?.id ?? "pending"}
              fields={formFields}
              submitLabel="Update Application"
              cancelLabel="Cancel"
              onSubmit={handleSubmit}
              onCancel={() => router.push(`/user/kyc/application/${id}`)}
              defaultValues={formData}
              showProgressBar={false}
              variant="embedded"
              /* Inert until there is something to submit: a zero-field form
                 validates clean, and `handleSubmit` reads `application.data`,
                 which is null until the fetch lands. `isPreview` disables the
                 submit button without changing its box. */
              isPreview={isLoading || applicationNotFound}
            />
          </CardContent>
        </Card>

        {/* Information notice */}
        <Alert className="bg-muted border border-border">
          <Info className="h-4 w-4 text-primary" />
          <AlertTitle className="text-foreground">
            {tCommon("important_information")}
          </AlertTitle>
          <AlertDescription className="text-muted-foreground">
            {t("by_updating_this_and_complete")}.{" "}
            {t("false_information_may_account_restrictions")}.
          </AlertDescription>
        </Alert>
      </div>
    </div>
  );
}
