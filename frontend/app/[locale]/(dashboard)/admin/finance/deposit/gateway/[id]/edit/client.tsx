"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { useTranslations } from "next-intl";

import { useToast } from "@/hooks/use-toast";
import { useRouter } from "@/i18n/routing";
import { $fetch } from "@/lib/api";
import { imageUploader } from "@/utils/upload";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

import { EditHeader } from "./components/edit-header";
import { GatewayEditForm } from "./components/gateway-edit-form";

export function AdminGatewayEditClient() {
  const t = useTranslations("admin");
  const params = useParams();
  const router = useRouter();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [showUnsavedDialog, setShowUnsavedDialog] = useState(false);
  const [formData, setFormData] = useState<any>(null);
  const [originalData, setOriginalData] = useState<any>(null);
  const [hasChanges, setHasChanges] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load gateway data
  useEffect(() => {
    if (params.id) {
      loadGateway();
    }
  }, [params.id]);

  const loadGateway = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      const response = await $fetch({
        url: `/api/admin/finance/deposit/gateway/${params.id}`,
        method: "GET",
        silent: true,
      });
      
      if (response.data) {
        // Parse currencies if they come as JSON string
        const parsedData = { ...response.data };
        if (typeof parsedData.currencies === 'string') {
          try {
            parsedData.currencies = JSON.parse(parsedData.currencies);
          } catch (e) {
            // If parsing fails, treat as empty array
            parsedData.currencies = [];
          }
        }
        // Ensure currencies is always an array
        if (!Array.isArray(parsedData.currencies)) {
          parsedData.currencies = [];
        }
        
        setFormData(parsedData);
        setOriginalData(parsedData);
      } else {
        throw new Error("Gateway not found");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load gateway");
    } finally {
      setIsLoading(false);
    }
  };

  const handleFieldChange = (field: string, value: any) => {
    setFormData((prev) => {
      const updated = { ...prev, [field]: value };
      
      // Check if there are changes
      const hasChanges = JSON.stringify(updated) !== JSON.stringify(originalData);
      setHasChanges(hasChanges);
      
      return updated;
    });
  };

  const handleSave = async () => {
    if (!formData) return;

    setIsSubmitting(true);

    try {
      // Validate required fields
      if (!formData.title || !formData.description) {
        throw new Error("Please fill in all required fields");
      }

      // Step 1: Handle image upload if there's a new image file
      let imageUrl = formData.image; // Keep existing image URL by default
      
      if (formData.imageFile instanceof File) {
        const uploadResult = await imageUploader({
          file: formData.imageFile,
          dir: "gateways",
          size: {
            width: 200,
            height: 100,
            maxWidth: 400,
            maxHeight: 200
          },
          oldPath: typeof formData.image === 'string' ? formData.image : ""
        });

        if (uploadResult.success && uploadResult.url) {
          imageUrl = uploadResult.url;
        } else {
          throw new Error(`Failed to upload image: ${uploadResult.error}`);
        }
      }

      // Step 2: Prepare clean payload
      const payload = {
        title: formData.title,
        description: formData.description,
        image: imageUrl,
        alias: formData.alias,
        currencies: Array.isArray(formData.currencies) ? formData.currencies : [],
        fixedFee: formData.fixedFee,
        percentageFee: formData.percentageFee,
        minAmount: formData.minAmount,
        maxAmount: formData.maxAmount,
        status: formData.status,
      };

      // Debug logging to see exact payload structure
      console.log('=== PAYLOAD DEBUG ===');
      console.log('Full payload:', JSON.stringify(payload, null, 2));
      console.log('Currencies:', payload.currencies, 'Type:', typeof payload.currencies, 'IsArray:', Array.isArray(payload.currencies));
      console.log('===================');

      // Step 3: Save to API
      const response = await $fetch({
        url: `/api/admin/finance/deposit/gateway/${params.id}`,
        method: "PUT",
        body: payload,
      });

      if (response.data) {
        toast({
          title: t("gateway_updated"),
          description: t("successfully_updated_payment_gateway"),
        });

        setHasChanges(false);
        setOriginalData({ ...formData, image: imageUrl });
        router.push("/admin/finance/deposit/gateway");
      }
    } catch (err) {
      toast({
        title: 'Error',
        description: `${t("failed_to_update_gateway")}: ${err instanceof Error ? err.message : "Unknown error"}`,
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    if (hasChanges) {
      setShowUnsavedDialog(true);
    } else {
      router.push("/admin/finance/deposit/gateway");
    }
  };

  const handleConfirmCancel = () => {
    setShowUnsavedDialog(false);
    router.push("/admin/finance/deposit/gateway");
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <EditHeader
          gatewayId={params.id as string}
          gatewayName="Loading..."
          isLoading={true}
          onSave={() => {}}
          onCancel={() => {}}
        />
        <div className="flex items-center justify-center p-8">
          <p className="text-muted-foreground">{t("loading_gateway_details")}...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <EditHeader
          gatewayId={params.id as string}
          gatewayName="Error"
          isLoading={false}
          onSave={() => {}}
          onCancel={() => router.push("/admin/finance/deposit/gateway")}
        />
        <div className="rounded-md bg-destructive/10 p-4 dark:bg-destructive/20">
          <h3 className="font-medium text-destructive dark:text-destructive-foreground">
            {t("error_loading_gateway")}
          </h3>
          <p className="text-sm text-destructive/80 dark:text-destructive-foreground/80">
            {error}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <EditHeader
        gatewayId={params.id as string}
        gatewayName={formData?.name || formData?.title || "Unknown Gateway"}
        isLoading={isSubmitting}
        hasChanges={hasChanges}
        onSave={handleSave}
        onCancel={handleCancel}
      />

      <GatewayEditForm gateway={formData} onChange={handleFieldChange} />

      <AlertDialog open={showUnsavedDialog} onOpenChange={setShowUnsavedDialog}>
        <AlertDialogContent className="dark:border-slate-700 dark:bg-slate-900">
          <AlertDialogHeader>
            <AlertDialogTitle>{t("unsaved_changes")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("you_have_unsaved_changes")}. {t("are_you_sure_you_want_to_leave")}.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="dark:bg-slate-800 dark:hover:bg-slate-700">
              {t("continue_editing")}
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmCancel}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {t("discard_changes")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
