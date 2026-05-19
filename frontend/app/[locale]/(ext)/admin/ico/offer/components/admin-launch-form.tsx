"use client";

import { useState } from "react";
import { SteppedLaunchForm } from "@/app/[locale]/(ext)/ico/creator/launch/components/stepped-launch-form";
import { $fetch } from "@/lib/api";
import { useRouter } from "@/i18n/routing";
import { useUserStore } from "@/store/user";
import { imageUploader } from "@/utils/upload";
// 1) Import the icons you need for toasts
import { AlertCircle, Check } from "lucide-react";
// 2) Import Sonner's toast function
import { toast } from "sonner";

export function AdminLaunchForm() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { user } = useUserStore();

  // Function to upload images before final submission
  const handleImageUploads = async (data: any): Promise<any> => {
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
      data.teamMembers.map(async (member: any) => {
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

  // Custom submit handler for admin submissions
  const handleAdminSubmit = async (formData: any) => {
    setIsSubmitting(true);

    try {
      // Upload any File objects and update the form data with the returned URLs
      const updatedFormData = await handleImageUploads(formData);

      // Prepare the payload with proper data types
      const payload = {
        ...updatedFormData,
        // Add required fields
        userId: user?.id || "admin", // Use actual user ID or fallback to "admin"
        selectedPlan: updatedFormData.selectedPlan
          ? updatedFormData.selectedPlan.id
          : null,
        // Add admin-specific fields
        status: "PENDING", // Start as pending by default (uppercase)
        submittedAt: new Date().toISOString(),
        submittedBy: user?.id || "admin",
      };

      // Use admin API endpoint instead of the user one
      const { data, error } = await $fetch({
        url: "/api/admin/ico/offer/create",
        method: "POST",
        body: payload,
        successMessage: "Offering created successfully!",
      });

      if (error) {
        // Show an error toast
        toast("Error", {
          description: error,
          icon: <AlertCircle className="h-5 w-5 text-red-500" />,
        });
      } else {
        // Show a success toast
        toast("Success", {
          description:
            "The token offering has been created and is now pending approval.",
          icon: <Check className="h-5 w-5 text-green-500" />,
        });

        // Redirect to the pending offerings page
        router.push("/admin/ico/offer/status/pending");
      }
    } catch (error: any) {
      toast("Error", {
        description: error.message || "An unexpected error occurred. Please try again.",
        icon: <AlertCircle className="h-5 w-5 text-red-500" />,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <SteppedLaunchForm
      isAdmin={true}
      onAdminSubmit={handleAdminSubmit}
      isAdminSubmitting={isSubmitting}
    />
  );
}
