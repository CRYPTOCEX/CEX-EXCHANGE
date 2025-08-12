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
import { motion } from "framer-motion";
import { DynamicForm } from "../../../components/dynamic-form";
import { $fetch } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { parseKycLevel } from "@/store/level-builder-store";
import { kycDocumentUploader } from "@/utils/kyc-upload";
import { useRouter } from "@/i18n/routing";
import { useTranslations } from "next-intl";

export default function UpdateApplicationClient() {
  const t = useTranslations("dashboard");
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
        title: "Error",
        description: "Failed to load application details. Please try again.",
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

  if (isLoading) {
    return (
      <div className="container max-w-4xl py-12">
        <div className="flex flex-col gap-8 animate-pulse">
          <div className="h-8 w-64 bg-gray-200 rounded"></div>
          <div className="h-4 w-full bg-gray-200 rounded"></div>
          <div className="h-96 bg-gray-200 rounded-lg"></div>
        </div>
      </div>
    );
  }

  if (!application || !level) {
    return (
      <div className="container max-w-4xl py-12">
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
          {t("back_to_kyc_dashboard")}
        </Button>
      </div>
    );
  }

  return (
    <div className="container max-w-4xl py-12">
      <div className="flex flex-col gap-8">
        {/* Header with back button and title */}
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            className="rounded-full h-10 w-10 bg-primary/10 hover:bg-primary/20"
            onClick={() => router.push(`/user/kyc/application/${id}`)}
          >
            <ArrowLeft className="h-5 w-5" />
            <span className="sr-only">Back</span>
          </Button>
          <div>
            <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-primary to-blue-600 bg-clip-text text-transparent">
              {t("update_application")}
            </h1>
            <p className="text-muted-foreground mt-1">
              {t("provide_the_additional_your_verification")}
            </p>
          </div>
        </div>

        {/* Application status */}
        <div className="bg-orange-50 border-l-4 border-l-orange-500 p-4 rounded-r-lg">
          <div className="flex items-start">
            <div className="bg-orange-100 p-2 rounded-full mr-3">
              <AlertTriangle className="h-5 w-5 text-orange-600" />
            </div>
            <div>
              <h3 className="font-medium text-orange-800">
                {t("additional_information_required")}
              </h3>
              <p className="text-orange-700 text-sm mt-1">
                {t("your_application_needs_with_verification")}.
              </p>
            </div>
          </div>
        </div>

        {/* Admin notes */}
        {application.adminNotes && (
          <Card className="border-orange-200 bg-gradient-to-r from-orange-50 to-orange-100/50">
            <CardHeader>
              <CardTitle className="flex items-center text-orange-800">
                <Info className="h-5 w-5 mr-2 text-orange-600" />
                {t("admin_request")}
              </CardTitle>
              <CardDescription className="text-orange-700">
                {t("the_following_information_verification_team")}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="bg-white/50 p-4 rounded-lg border border-orange-200">
                <p className="text-orange-800 whitespace-pre-wrap">
                  {application.adminNotes}
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Success message */}
        {updateSuccess && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-green-50 border border-green-200 rounded-lg p-4"
          >
            <div className="flex items-center">
              <div className="bg-green-100 p-2 rounded-full mr-3">
                <CheckCircle className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <h3 className="font-medium text-green-800">
                  {t("application_updated_successfully")}
                </h3>
                <p className="text-green-700 text-sm mt-1">
                  {t("your_application_has_our_team")}.
                </p>
              </div>
            </div>
          </motion.div>
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
        <Card className="border-0 shadow-lg overflow-hidden">
          <div className="h-2 bg-gradient-to-r from-orange-500 to-amber-500"></div>
          <CardContent className="pt-6">
            <DynamicForm
              fields={formFields}
              submitLabel="Update Application"
              cancelLabel="Cancel"
              onSubmit={handleSubmit}
              onCancel={() => router.push(`/user/kyc/application/${id}`)}
              defaultValues={formData}
              showProgressBar={false}
              variant="embedded"
            />
          </CardContent>
        </Card>

        {/* Information notice */}
        <Alert className="bg-gray-50 border border-gray-200">
          <Info className="h-4 w-4 text-blue-500" />
          <AlertTitle className="text-gray-800">
            {t("important_information")}
          </AlertTitle>
          <AlertDescription className="text-gray-600">
            {t("by_updating_this_and_complete")}.{" "}
            {t("false_information_may_account_restrictions")}.
          </AlertDescription>
        </Alert>
      </div>
    </div>
  );
}
