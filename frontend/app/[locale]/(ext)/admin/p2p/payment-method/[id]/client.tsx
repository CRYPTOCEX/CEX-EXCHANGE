"use client";

import { useState, useEffect } from "react";
import { useRouter } from "@/i18n/routing";
import { PAGE_PADDING } from "@/app/[locale]/(dashboard)/theme-config";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ImageUpload } from "@/components/ui/image-upload";
import { Loader2, Plus, X, ArrowLeft, Save, Trash2 } from "lucide-react";
import { $fetch } from "@/lib/api";
import { toast } from "sonner";
import { imageUploader } from "@/utils/upload";
import { useTranslations } from "next-intl";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

interface PaymentMethodEditClientProps {
  id: string;
}

export default function PaymentMethodEditClient({ id }: PaymentMethodEditClientProps) {
  const t = useTranslations("common");
  const router = useRouter();
  const isNew = id === "new";

  const [isLoading, setIsLoading] = useState(!isNew);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const [formData, setFormData] = useState({
    name: "",
    icon: "",
    description: "",
    instructions: "",
    processingTime: "",
    fees: "",
    available: true,
    isGlobal: true,
    popularityRank: 0,
  });

  const [iconFile, setIconFile] = useState<File | string | null>(null);
  const [metadataFields, setMetadataFields] = useState<Array<{ key: string; value: string }>>([]);

  // Load existing payment method data
  useEffect(() => {
    if (!isNew) {
      loadPaymentMethod();
    }
  }, [id, isNew]);

  const loadPaymentMethod = async () => {
    try {
      setIsLoading(true);
      const { data, error } = await $fetch({
        url: `/api/admin/p2p/payment-method/${id}`,
        method: "GET",
        silentSuccess: true,
      });

      if (error || !data) {
        toast.error(error || "Failed to load payment method");
        router.push("/admin/p2p/payment-method");
        return;
      }

      const method = data;
      setFormData({
        name: method.name || "",
        icon: method.icon || "",
        description: method.description || "",
        instructions: method.instructions || "",
        processingTime: method.processingTime || "",
        fees: method.fees || "",
        available: method.available ?? true,
        isGlobal: method.isGlobal ?? true,
        popularityRank: method.popularityRank || 0,
      });
      setIconFile(method.icon || null);

      // Parse metadata
      if (method.metadata) {
        const metadata = typeof method.metadata === "string"
          ? JSON.parse(method.metadata)
          : method.metadata;
        const fields = Object.entries(metadata).map(([key, value]) => ({
          key,
          value: String(value),
        }));
        setMetadataFields(fields);
      }
    } catch (error: any) {
      toast.error(error.message || "Failed to load payment method");
      router.push("/admin/p2p/payment-method");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      let iconUrl = formData.icon;

      // If a new file is selected, upload it
      if (iconFile instanceof File) {
        try {
          const uploadResult = await imageUploader({
            file: iconFile,
            dir: "p2p/payment-methods",
            size: { maxWidth: 128, maxHeight: 128 },
          });

          if (uploadResult.success && uploadResult.url) {
            iconUrl = uploadResult.url;
          } else {
            throw new Error("Image upload failed");
          }
        } catch (uploadError) {
          console.error("Error uploading icon:", uploadError);
          toast.error("Failed to upload icon image");
          setIsSubmitting(false);
          return;
        }
      } else if (typeof iconFile === "string") {
        iconUrl = iconFile;
      }

      // Convert metadata fields array to object
      const metadata: Record<string, string> = {};
      for (const field of metadataFields) {
        if (field.key.trim()) {
          metadata[field.key.trim()] = field.value;
        }
      }

      const url = isNew
        ? "/api/admin/p2p/payment-method"
        : `/api/admin/p2p/payment-method/${id}`;

      const response = await $fetch({
        url,
        method: isNew ? "POST" : "PUT",
        body: {
          ...formData,
          icon: iconUrl,
          metadata: Object.keys(metadata).length > 0 ? metadata : null,
        },
      });

      if (response.error) {
        toast.error(response.error);
        return;
      }

      toast.success(
        isNew
          ? "Payment method created successfully"
          : "Payment method updated successfully"
      );

      router.push("/admin/p2p/payment-method");
    } catch (error: any) {
      console.error("Error saving payment method:", error);
      toast.error(
        error.message ||
        `Failed to ${isNew ? "create" : "update"} payment method`
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      const response = await $fetch({
        url: `/api/admin/p2p/payment-method/${id}`,
        method: "DELETE",
      });

      if (response.error) {
        toast.error(response.error);
        return;
      }

      toast.success("Payment method deleted successfully");
      router.push("/admin/p2p/payment-method");
    } catch (error: any) {
      toast.error(error.message || "Failed to delete payment method");
    } finally {
      setIsDeleting(false);
    }
  };

  const handleChange = (field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleAddMetadataField = () => {
    setMetadataFields(prev => [...prev, { key: "", value: "" }]);
  };

  const handleRemoveMetadataField = (index: number) => {
    setMetadataFields(prev => prev.filter((_, i) => i !== index));
  };

  const handleMetadataFieldChange = (index: number, field: "key" | "value", value: string) => {
    setMetadataFields(prev => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className={`container ${PAGE_PADDING} space-y-6`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => router.push("/admin/p2p/payment-method")}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold">
              {isNew ? "Create Payment Method" : "Edit Payment Method"}
            </h1>
            <p className="text-sm text-muted-foreground">
              {isNew
                ? "Add a new payment method for P2P trading"
                : "Update payment method details and settings"}
            </p>
          </div>
        </div>
        {!isNew && (
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive" disabled={isDeleting}>
                {isDeleting ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <Trash2 className="h-4 w-4 mr-2" />
                )}
                Delete
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete Payment Method?</AlertDialogTitle>
                <AlertDialogDescription>
                  This action cannot be undone. This will permanently delete this
                  payment method and remove it from all offers.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={handleDelete}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                >
                  Delete
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        )}
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Info */}
          <div className="lg:col-span-2 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Basic Information</CardTitle>
                <CardDescription>
                  General details about the payment method
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">{t("name")} *</Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) => handleChange("name", e.target.value)}
                      placeholder="e.g., PayPal, Bank Transfer"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="popularityRank">{t("sort_order")}</Label>
                    <Input
                      id="popularityRank"
                      type="number"
                      value={formData.popularityRank}
                      onChange={(e) => handleChange("popularityRank", parseInt(e.target.value) || 0)}
                      placeholder="0"
                      min="0"
                    />
                    <p className="text-xs text-muted-foreground">
                      Lower numbers appear first
                    </p>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => handleChange("description", e.target.value)}
                    placeholder="Brief description of this payment method"
                    rows={2}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="instructions">Instructions</Label>
                  <Textarea
                    id="instructions"
                    value={formData.instructions}
                    onChange={(e) => handleChange("instructions", e.target.value)}
                    placeholder="Detailed instructions for users on how to use this payment method"
                    rows={3}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="processingTime">{t("processing_time")}</Label>
                    <Input
                      id="processingTime"
                      value={formData.processingTime}
                      onChange={(e) => handleChange("processingTime", e.target.value)}
                      placeholder="e.g., 5-10 minutes, Instant"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="fees">Fees</Label>
                    <Input
                      id="fees"
                      value={formData.fees}
                      onChange={(e) => handleChange("fees", e.target.value)}
                      placeholder="e.g., Free, 1%"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Payment Details (Metadata) */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Payment Details</CardTitle>
                    <CardDescription>
                      Custom fields for payment information (e.g., Account Number, Email, Phone)
                    </CardDescription>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleAddMetadataField}
                  >
                    <Plus className="h-4 w-4 mr-1" />
                    Add Field
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {metadataFields.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <p>No payment details configured.</p>
                    <p className="text-sm">Click "Add Field" to add custom payment details like account numbers, emails, etc.</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {metadataFields.map((field, index) => (
                      <div key={index} className="flex gap-2 items-start">
                        <div className="flex-1">
                          <Input
                            placeholder="Field Name (e.g., Account Number)"
                            value={field.key}
                            onChange={(e) => handleMetadataFieldChange(index, "key", e.target.value)}
                          />
                        </div>
                        <div className="flex-1">
                          <Input
                            placeholder="Value"
                            value={field.value}
                            onChange={(e) => handleMetadataFieldChange(index, "value", e.target.value)}
                          />
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => handleRemoveMetadataField(index)}
                          className="text-destructive hover:text-destructive/80 flex-shrink-0"
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Icon</CardTitle>
                <CardDescription>
                  Upload an icon for this payment method
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ImageUpload
                  onChange={(file) => setIconFile(file)}
                  value={iconFile}
                  title="Payment Method Icon"
                  size="md"
                  aspectRatio="square"
                  maxSize={1}
                  acceptedFormats={["image/jpeg", "image/png", "image/gif", "image/webp", "image/svg+xml"]}
                />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Settings</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Available</Label>
                    <p className="text-xs text-muted-foreground">
                      Users can select this payment method
                    </p>
                  </div>
                  <Switch
                    checked={formData.available}
                    onCheckedChange={(checked) => handleChange("available", checked)}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label>Global</Label>
                    <p className="text-xs text-muted-foreground">
                      Available to all users (admin managed)
                    </p>
                  </div>
                  <Switch
                    checked={formData.isGlobal}
                    onCheckedChange={(checked) => handleChange("isGlobal", checked)}
                  />
                </div>
              </CardContent>
            </Card>

            <Button type="submit" className="w-full" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {isNew ? "Creating..." : "Saving..."}
                </>
              ) : (
                <>
                  <Save className="mr-2 h-4 w-4" />
                  {isNew ? "Create Payment Method" : "Save Changes"}
                </>
              )}
            </Button>
          </div>
        </div>
      </form>
    </div>
  );
}
