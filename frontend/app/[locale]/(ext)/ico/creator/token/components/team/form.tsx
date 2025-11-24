"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  AlertCircle,
  Loader2,
  User,
  Briefcase,
  FileText,
  Image,
  Link2,
} from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ImageUpload } from "@/components/ui/image-upload";
import { useTeamMemberStore } from "@/store/ico/creator/team-member-store";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { imageUploader } from "@/utils/upload";
type TeamMemberFormProps = {
  tokenId: string;
  member?: icoTeamMemberAttributes;
  onSuccess?: () => void;
  onCancel?: () => void;
};

// Form validation schema
const formSchema = z.object({
  name: z
    .string()
    .min(2, "Name must be at least 2 characters")
    .max(50, "Name must be less than 50 characters"),
  role: z
    .string()
    .min(2, "Role must be at least 2 characters")
    .max(50, "Role must be less than 50 characters"),
  bio: z
    .string()
    .min(10, "Bio must be at least 10 characters")
    .max(500, "Bio must be less than 500 characters"),
  avatar: z.string().optional(),
  linkedin: z
    .string()
    .url("Must be a valid URL")
    .or(z.string().length(0))
    .optional(),
  twitter: z
    .string()
    .url("Must be a valid URL")
    .or(z.string().length(0))
    .optional(),
  website: z
    .string()
    .url("Must be a valid URL")
    .or(z.string().length(0))
    .optional(),
  github: z
    .string()
    .url("Must be a valid URL")
    .or(z.string().length(0))
    .optional(),
});
export function TeamMemberForm({
  tokenId,
  member,
  onSuccess,
  onCancel,
}: TeamMemberFormProps) {
  const {
    addTeamMember,
    updateTeamMember,
    isSubmitting,
    error: submitError,
  } = useTeamMemberStore();
  const [activeTab, setActiveTab] = useState("basic");
  const [isUploading, setIsUploading] = useState(false);

  // Initialize form with react-hook-form
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: member?.name || "",
      role: member?.role || "",
      bio: member?.bio || "",
      avatar: member?.avatar || "",
      linkedin: member?.linkedin || "",
      twitter: member?.twitter || "",
      website: member?.website || "",
      github: member?.github || "",
    },
  });
  const handleImageUploadChange = async (file: File | null) => {
    if (!file) {
      form.setValue("avatar", "");
      return;
    }
    setIsUploading(true);
    try {
      const uploadResult = await imageUploader({
        file,
        dir: "team/avatars",
        size: {
          maxWidth: 500,
          maxHeight: 500,
        },
        oldPath: form.getValues("avatar"),
      });
      if (uploadResult.success) {
        form.setValue("avatar", uploadResult.url);
      } else {
        console.error("Image upload failed:", uploadResult.error);
      }
    } catch (error) {
      console.error("Error during image upload:", error);
    } finally {
      setIsUploading(false);
    }
  };
  const handleSubmit = async (values: z.infer<typeof formSchema>) => {
    try {
      if (member?.id) {
        // Editing an existing team member
        await updateTeamMember(tokenId, {
          ...member,
          ...values,
        });
      } else {
        // Adding a new team member
        await addTeamMember(tokenId, values);
      }

      // If there's no error, call onSuccess
      if (onSuccess) {
        onSuccess();
      }
    } catch (error) {
      console.error("Error submitting team member:", error);
    }
  };
  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(handleSubmit)}
        className="space-y-6 px-5 pb-8"
      >
        {submitError && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{submitError}</AlertDescription>
          </Alert>
        )}

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="basic">Basic Info</TabsTrigger>
            <TabsTrigger value="social">Social Links</TabsTrigger>
          </TabsList>

          <TabsContent value="basic" className="space-y-4 mt-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => {
                return (
                  <FormItem>
                    <FormLabel className="flex items-center gap-2">
                      <User className="h-4 w-4 text-muted-foreground" />
                      Name
                    </FormLabel>
                    <FormControl>
                      <Input placeholder="John Doe" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                );
              }}
            />

            <FormField
              control={form.control}
              name="role"
              render={({ field }) => {
                return (
                  <FormItem>
                    <FormLabel className="flex items-center gap-2">
                      <Briefcase className="h-4 w-4 text-muted-foreground" />
                      Role
                    </FormLabel>
                    <FormControl>
                      <Input placeholder="CEO, Developer, etc." {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                );
              }}
            />

            <FormField
              control={form.control}
              name="bio"
              render={({ field }) => {
                return (
                  <FormItem>
                    <FormLabel className="flex items-center gap-2">
                      <FileText className="h-4 w-4 text-muted-foreground" />
                      Bio
                    </FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Brief description about this team member..."
                        rows={4}
                        {...field}
                      />
                    </FormControl>
                    <FormDescription>
                      Highlight their experience, expertise, and achievements.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                );
              }}
            />

            <FormField
              control={form.control}
              name="avatar"
              render={({ field }) => {
                return (
                  <FormItem>
                    <FormLabel className="flex items-center gap-2">
                      <Image className="h-4 w-4 text-muted-foreground" />
                      Profile Image
                    </FormLabel>
                    <FormControl>
                      <ImageUpload
                        onChange={handleImageUploadChange}
                        value={field.value || ""}
                        loading={isUploading}
                      />
                    </FormControl>
                    <FormDescription className="text-center">
                      Upload a professional photo (recommended size: 500x500px)
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                );
              }}
            />
          </TabsContent>

          <TabsContent value="social" className="space-y-4 mt-4">
            <FormField
              control={form.control}
              name="linkedin"
              render={({ field }) => {
                return (
                  <FormItem>
                    <FormLabel className="flex items-center gap-2">
                      <svg
                        className="h-4 w-4 text-muted-foreground"
                        viewBox="0 0 24 24"
                        fill="none"
                        xmlns="http://www.w3.org/2000/svg"
                      >
                        <path
                          d="M16 8C17.5913 8 19.1174 8.63214 20.2426 9.75736C21.3679 10.8826 22 12.4087 22 14V21H18V14C18 13.4696 17.7893 12.9609 17.4142 12.5858C17.0391 12.2107 16.5304 12 16 12C15.4696 12 14.9609 12.2107 14.5858 12.5858C14.2107 12.9609 14 13.4696 14 14V21H10V14C10 12.4087 10.6321 10.8826 11.7574 9.75736C12.8826 8.63214 14.4087 8 16 8Z"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                        <path
                          d="M6 9H2V21H6V9Z"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                        <path
                          d="M4 6C5.10457 6 6 5.10457 6 4C6 2.89543 5.10457 2 4 2C2.89543 2 2 2.89543 2 4C2 5.10457 2.89543 6 4 6Z"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                      LinkedIn URL
                    </FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Link2 className="absolute left-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          className="pl-8"
                          placeholder="https://linkedin.com/in/username"
                          {...field}
                        />
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                );
              }}
            />

            <FormField
              control={form.control}
              name="twitter"
              render={({ field }) => {
                return (
                  <FormItem>
                    <FormLabel className="flex items-center gap-2">
                      <svg
                        className="h-4 w-4 text-muted-foreground"
                        viewBox="0 0 24 24"
                        fill="none"
                        xmlns="http://www.w3.org/2000/svg"
                      >
                        <path
                          d="M22 4C22 4 21.3 6.1 20 7.4C21.6 17.4 10.6 24.7 2 19C4.2 19.1 6.4 18.4 8 17C3 15.5 0.5 9.6 3 5C5.2 7.6 8.6 9.1 12 9C11.1 4.8 16 2.4 19 5.2C20.1 5.2 22 4 22 4Z"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                      Twitter URL
                    </FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Link2 className="absolute left-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          className="pl-8"
                          placeholder="https://twitter.com/username"
                          {...field}
                        />
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                );
              }}
            />

            <FormField
              control={form.control}
              name="website"
              render={({ field }) => {
                return (
                  <FormItem>
                    <FormLabel className="flex items-center gap-2">
                      <svg
                        className="h-4 w-4 text-muted-foreground"
                        viewBox="0 0 24 24"
                        fill="none"
                        xmlns="http://www.w3.org/2000/svg"
                      >
                        <path
                          d="M12 22C17.5228 22 22 17.5228 22 12C22 6.47715 17.5228 2 12 2C6.47715 2 2 6.47715 2 12C2 17.5228 6.47715 22 12 22Z"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                        <path
                          d="M2 12H22"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                        <path
                          d="M12 2C14.5013 4.73835 15.9228 8.29203 16 12C15.9228 15.708 14.5013 19.2616 12 22C9.49872 19.2616 8.07725 15.708 8 12C8.07725 8.29203 9.49872 4.73835 12 2Z"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                      Website URL
                    </FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Link2 className="absolute left-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          className="pl-8"
                          placeholder="https://example.com"
                          {...field}
                        />
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                );
              }}
            />

            <FormField
              control={form.control}
              name="github"
              render={({ field }) => {
                return (
                  <FormItem>
                    <FormLabel className="flex items-center gap-2">
                      <svg
                        className="h-4 w-4 text-muted-foreground"
                        viewBox="0 0 24 24"
                        fill="none"
                        xmlns="http://www.w3.org/2000/svg"
                      >
                        <path
                          d="M9 19C4.7 20.4 4.7 16.5 3 16M15 21V17.5C15 16.5 15.1 16.1 14.5 15.5C17.3 15.2 20 14.1 20 9.5C19.9988 8.30564 19.5325 7.15585 18.7 6.3C19.0905 5.26136 19.0545 4.11686 18.6 3.1C18.6 3.1 17.5 2.8 15.6 4C14.0396 3.55051 12.3604 3.55051 10.8 4C8.9 2.8 7.8 3.1 7.8 3.1C7.34548 4.11686 7.30951 5.26136 7.7 6.3C6.86745 7.15585 6.40123 8.30564 6.4 9.5C6.4 14.1 9.1 15.2 11.9 15.5C11.3 16.1 11.1 16.7 11.1 17.5V21"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                      GitHub URL
                    </FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Link2 className="absolute left-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          className="pl-8"
                          placeholder="https://github.com/username"
                          {...field}
                        />
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                );
              }}
            />
          </TabsContent>
        </Tabs>

        {/* Form Actions */}
        <div className="flex justify-end space-x-2 pt-4">
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button
            type="submit"
            disabled={isSubmitting || isUploading || !form.formState.isValid}
            className="min-w-[120px]"
          >
            {(isSubmitting || isUploading) && (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            )}
            {member ? "Update" : "Add"} Team Member
          </Button>
        </div>
      </form>
    </Form>
  );
}
