"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { ImageUpload } from "@/components/ui/image-upload";
import { Loader2 } from "lucide-react";
import { $fetch } from "@/lib/api";
import { toast } from "sonner";
import { imageUploader } from "@/utils/upload";

interface PaymentMethodDialogProps {
  isOpen: boolean;
  onClose: (shouldRefresh?: boolean) => void;
  method?: any;
}

export default function PaymentMethodDialog({
  isOpen,
  onClose,
  method,
}: PaymentMethodDialogProps) {
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
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Reset form when dialog opens/closes or method changes
  useEffect(() => {
    if (isOpen) {
      if (method) {
        // Edit mode
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
        // Set the icon as string URL for existing methods
        setIconFile(method.icon || null);
      } else {
        // Create mode
        setFormData({
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
        setIconFile(null);
      }
    }
  }, [isOpen, method]);

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
        // Use existing URL
        iconUrl = iconFile;
      }

      const url = method 
        ? `/api/admin/p2p/payment-method/${method.id}`
        : "/api/admin/p2p/payment-method";
      
      const response = await $fetch({
        url,
        method: method ? "PUT" : "POST",
        body: {
          ...formData,
          icon: iconUrl, // Use the uploaded or existing URL
        },
      });

      if (response.error) {
        toast.error(response.error);
        return;
      }

      toast.success(
        method 
          ? "Payment method updated successfully"
          : "Payment method created successfully"
      );
      
      onClose(true); // Close dialog and refresh table
    } catch (error: any) {
      console.error("Error saving payment method:", error);
      toast.error(
        error.message || 
        `Failed to ${method ? "update" : "create"} payment method`
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleChange = (field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value,
    }));
  };

  return (
    <Dialog open={isOpen} onOpenChange={() => onClose()}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {method ? "Edit Payment Method" : "Create Payment Method"}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Basic Information */}
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Name *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => handleChange("name", e.target.value)}
                placeholder="e.g. PayPal, Wise, Cash"
                required
              />
            </div>

            {/* Icon Upload */}
            <div className="space-y-2">
              <Label>Icon *</Label>
              <ImageUpload
                onChange={(file) => setIconFile(file)}
                value={iconFile}
                title="Payment Method Icon"
                size="sm"
                aspectRatio="square"
                maxSize={1}
                acceptedFormats={["image/jpeg", "image/png", "image/gif", "image/webp", "image/svg+xml"]}
              />
              <p className="text-sm text-muted-foreground">
                Upload an icon for this payment method (max 1MB, recommended 128x128px)
              </p>
            </div>
          </div>

          {/* Description */}
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

          {/* Instructions */}
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

          {/* Processing Time and Fees */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="processingTime">Processing Time</Label>
              <Input
                id="processingTime"
                value={formData.processingTime}
                onChange={(e) => handleChange("processingTime", e.target.value)}
                placeholder="e.g. 5-10 minutes, Instant"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="fees">Fees</Label>
              <Input
                id="fees"
                value={formData.fees}
                onChange={(e) => handleChange("fees", e.target.value)}
                placeholder="e.g. Free, 1-2%"
              />
            </div>
          </div>

          {/* Settings */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <Label>Available</Label>
                <p className="text-sm text-muted-foreground">
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
                <p className="text-sm text-muted-foreground">
                  Available to all users (admin-managed)
                </p>
              </div>
              <Switch
                checked={formData.isGlobal}
                onCheckedChange={(checked) => handleChange("isGlobal", checked)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="popularityRank">Sort Order</Label>
              <Input
                id="popularityRank"
                type="number"
                value={formData.popularityRank}
                onChange={(e) => handleChange("popularityRank", parseInt(e.target.value) || 0)}
                placeholder="0"
                min="0"
              />
              <p className="text-sm text-muted-foreground">
                Lower numbers appear first in the list
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onClose()}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {method ? "Updating..." : "Creating..."}
                </>
              ) : (
                method ? "Update" : "Create"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}