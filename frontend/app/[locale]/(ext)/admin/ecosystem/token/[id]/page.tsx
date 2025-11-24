"use client";
import React, { useEffect, useState } from "react";
import { useForm, FormProvider, SubmitHandler, Controller } from "react-hook-form";
import { useParams } from "next/navigation";
import { Link, useRouter } from "@/i18n/routing";
import { toast } from "sonner";
import { $fetch } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ImageUpload } from "@/components/ui/image-upload";
import { imageUploader } from "@/utils/upload";
import { Icon } from "@iconify/react";
import { useTranslations } from "next-intl";

interface EditTokenData {
  limits: {
    deposit: { min: number; max: number };
    withdraw: { min: number; max: number };
  };
  fee: { min: number; percentage: number };
  icon: File | string;
}

function EditTokenContent() {
  const t = useTranslations("ext");
  const router = useRouter();
  const params = useParams();
  const tokenId = params.id as string;
  const methods = useForm<EditTokenData>({
    defaultValues: {
      limits: {
        deposit: { min: 0, max: 0 },
        withdraw: { min: 0, max: 0 },
      },
      fee: { min: 0, percentage: 0 },
      icon: "",
    },
  });
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tokenData, setTokenData] = useState<any>(null);

  // Fetch the token's existing data
  useEffect(() => {
    if (!tokenId) {
      setError("Token ID is required");
      setLoading(false);
      return;
    }

    const fetchToken = async () => {
      try {
        const { data, error } = await $fetch({
          url: `/api/admin/ecosystem/token/${tokenId}`,
          method: "GET",
          silentSuccess: true,
        });
        if (error) {
          throw new Error(error);
        }
        
        setTokenData(data);
        
        // Handle null values and parse limits & fee if they're strings
        let limits;
        let fee;
        
        if (data.limits === null || data.limits === undefined) {
          // Provide default values when limits is null
          limits = {
            deposit: { min: 0, max: 0 },
            withdraw: { min: 0, max: 0 }
          };
        } else {
          limits = typeof data.limits === "string" ? JSON.parse(data.limits) : data.limits;
        }
        
        if (data.fee === null || data.fee === undefined) {
          // Provide default values when fee is null
          fee = {
            min: 0,
            percentage: 0
          };
        } else {
          fee = typeof data.fee === "string" ? JSON.parse(data.fee) : data.fee;
        }
        
        methods.reset({
          limits,
          fee,
          icon: data.icon || "",
        });
      } catch (error: any) {
        const errorMessage = error.message || "Failed to fetch token data";
        setError(errorMessage);
        toast.error(errorMessage);
      } finally {
        setLoading(false);
      }
    };
    fetchToken();
  }, [tokenId, methods]);

  const onSubmit: SubmitHandler<EditTokenData> = async (formData) => {
    setIsSubmitting(true);
    try {
      // If a new file is provided for icon, upload it
      if (formData.icon instanceof File) {
        const uploadResult = await imageUploader({
          file: formData.icon,
          dir: "ecosystemTokens",
          size: { maxWidth: 1024, maxHeight: 728 },
        });
        if (uploadResult.success) {
          formData.icon = uploadResult.url;
        } else {
          throw new Error(uploadResult.error || "Icon upload failed");
        }
      }
      // Update the token
      const { error } = await $fetch({
        url: `/api/admin/ecosystem/token/${tokenId}`,
        method: "PUT",
        body: formData,
        successMessage: "Token updated successfully!",
      });
      if (!error) {
        router.push("/admin/ecosystem/token");
      }
    } catch (err: any) {
      toast.error(err.message || "An error occurred while updating");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (error) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold">{t("edit_token")}</h1>
          <Link href="/admin/ecosystem/token">
            <Button variant="outline">
              <Icon icon="lucide:arrow-left" className="mr-2 h-4 w-4" />
              {t("Back")}
            </Button>
          </Link>
        </div>
        <Card>
          <CardContent className="pt-6">
            <div className="text-center py-8">
              <Icon icon="lucide:alert-circle" className="mx-auto h-12 w-12 text-destructive mb-4" />
              <h3 className="text-lg font-medium mb-2">
                Error Loading Token
              </h3>
              <p className="text-muted-foreground mb-4">{error}</p>
              <Button onClick={() => window.location.reload()}>
                <Icon icon="lucide:refresh-cw" className="mr-2 h-4 w-4" />
                Try Again
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold">{t("edit_token")}</h1>
          <Link href="/admin/ecosystem/token">
            <Button variant="outline" disabled>
              <Icon icon="lucide:arrow-left" className="mr-2 h-4 w-4" />
              {t("Back")}
            </Button>
          </Link>
        </div>
        <Card>
          <CardContent className="pt-6">
            <div className="text-center py-8">
              <Icon icon="lucide:loader-2" className="mx-auto h-8 w-8 animate-spin text-primary mb-4" />
              <p className="text-muted-foreground">{t("loading_token_data")}...</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <FormProvider {...methods}>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold">{t("edit_token")}</h1>
            {tokenData && (
              <p className="text-muted-foreground mt-1">
                {tokenData.name} ({tokenData.symbol}) - {tokenData.network}
              </p>
            )}
          </div>
          <Link href="/admin/ecosystem/token">
            <Button variant="outline">
              <Icon icon="lucide:arrow-left" className="mr-2 h-4 w-4" />
              {t("Back")}
            </Button>
          </Link>
        </div>

        <form onSubmit={methods.handleSubmit(onSubmit)} className="space-y-6">
          {/* Token Icon Section */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Icon icon="lucide:image" className="h-5 w-5" />
                {t("token_icon")}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ImageUpload
                value={methods.watch("icon")}
                onChange={(file) => methods.setValue("icon", file)}
                title="Upload Token Icon"
                size="sm"
              />
            </CardContent>
          </Card>

          {/* Deposit Limits Section */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Icon icon="lucide:arrow-down-circle" className="h-5 w-5" />
                Deposit Limits
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Controller
                  name="limits.deposit.min"
                  control={methods.control}
                  rules={{ required: "Minimum deposit is required", min: { value: 0, message: "Must be positive" } }}
                  render={({ field, fieldState }) => (
                    <Input
                      {...field}
                      value={field.value ?? 0}
                      type="number"
                      step="any"
                      placeholder="0.00"
                      title="Minimum Deposit Amount"
                      description="The minimum amount users can deposit"
                      icon="lucide:arrow-down"
                      error={!!fieldState.error}
                      errorMessage={fieldState.error?.message}
                      onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                    />
                  )}
                />
                <Controller
                  name="limits.deposit.max"
                  control={methods.control}
                  rules={{ required: "Maximum deposit is required", min: { value: 0, message: "Must be positive" } }}
                  render={({ field, fieldState }) => (
                    <Input
                      {...field}
                      value={field.value ?? 0}
                      type="number"
                      step="any"
                      placeholder="1000000.00"
                      title="Maximum Deposit Amount"
                      description="The maximum amount users can deposit"
                      icon="lucide:arrow-down"
                      error={!!fieldState.error}
                      errorMessage={fieldState.error?.message}
                      onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                    />
                  )}
                />
              </div>
            </CardContent>
          </Card>

          {/* Withdrawal Limits Section */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Icon icon="lucide:arrow-up-circle" className="h-5 w-5" />
                Withdrawal Limits
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Controller
                  name="limits.withdraw.min"
                  control={methods.control}
                  rules={{ required: "Minimum withdrawal is required", min: { value: 0, message: "Must be positive" } }}
                  render={({ field, fieldState }) => (
                    <Input
                      {...field}
                      value={field.value ?? 0}
                      type="number"
                      step="any"
                      placeholder="0.00"
                      title="Minimum Withdrawal Amount"
                      description="The minimum amount users can withdraw"
                      icon="lucide:arrow-up"
                      error={!!fieldState.error}
                      errorMessage={fieldState.error?.message}
                      onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                    />
                  )}
                />
                <Controller
                  name="limits.withdraw.max"
                  control={methods.control}
                  rules={{ required: "Maximum withdrawal is required", min: { value: 0, message: "Must be positive" } }}
                  render={({ field, fieldState }) => (
                    <Input
                      {...field}
                      value={field.value ?? 0}
                      type="number"
                      step="any"
                      placeholder="1000000.00"
                      title="Maximum Withdrawal Amount"
                      description="The maximum amount users can withdraw"
                      icon="lucide:arrow-up"
                      error={!!fieldState.error}
                      errorMessage={fieldState.error?.message}
                      onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                    />
                  )}
                />
              </div>
            </CardContent>
          </Card>

          {/* Fee Configuration Section */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Icon icon="lucide:percent" className="h-5 w-5" />
                Fee Configuration
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Controller
                  name="fee.min"
                  control={methods.control}
                  rules={{ required: "Minimum fee is required", min: { value: 0, message: "Must be positive" } }}
                  render={({ field, fieldState }) => (
                    <Input
                      {...field}
                      value={field.value ?? 0}
                      type="number"
                      step="any"
                      placeholder="0.01"
                      title="Minimum Fee Amount"
                      description="The minimum fee charged for transactions"
                      icon="lucide:coins"
                      error={!!fieldState.error}
                      errorMessage={fieldState.error?.message}
                      onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                    />
                  )}
                />
                <Controller
                  name="fee.percentage"
                  control={methods.control}
                  rules={{ 
                    required: "Fee percentage is required", 
                    min: { value: 0, message: "Must be positive" },
                    max: { value: 100, message: "Cannot exceed 100%" }
                  }}
                  render={({ field, fieldState }) => (
                    <Input
                      {...field}
                      value={field.value ?? 0}
                      type="number"
                      step="0.01"
                      placeholder="2.50"
                      title="Fee Percentage"
                      description="The percentage fee charged (0-100%)"
                      icon="lucide:percent"
                      postfix="%"
                      error={!!fieldState.error}
                      errorMessage={fieldState.error?.message}
                      onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                    />
                  )}
                />
              </div>
            </CardContent>
          </Card>

          {/* Submit Button */}
          <div className="flex justify-end gap-4">
            <Link href="/admin/ecosystem/token">
              <Button variant="outline" type="button" disabled={isSubmitting}>
                Cancel
              </Button>
            </Link>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Icon icon="lucide:loader-2" className="mr-2 h-4 w-4 animate-spin" />
                  Updating...
                </>
              ) : (
                <>
                  <Icon icon="lucide:save" className="mr-2 h-4 w-4" />
                  Update Token
                </>
              )}
            </Button>
          </div>
        </form>
      </div>
    </FormProvider>
  );
}

export default function EditTokenPage() {
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  if (!isClient) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold">Edit Token</h1>
          <Button variant="outline" disabled>
            <Icon icon="lucide:arrow-left" className="mr-2 h-4 w-4" />
            Back
          </Button>
        </div>
        <Card>
          <CardContent className="pt-6">
            <div className="text-center py-8">
              <Icon icon="lucide:loader-2" className="mx-auto h-8 w-8 animate-spin text-primary mb-4" />
              <p className="text-muted-foreground">Loading...</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return <EditTokenContent />;
}
