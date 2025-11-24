"use client";

import type React from "react";

import { useState, useEffect } from "react";
import { useRouter } from "@/i18n/routing";
import { useBlogStore } from "@/store/blog/user";
import RichTextEditor from "@/components/ui/editor";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  AlertCircle,
  Save,
  ArrowLeft,
  Eye,
  ImageIcon,
  FileText,
  Tag,
  Layers,
  Settings,
  CheckCircle2,
} from "lucide-react";
import { $fetch } from "@/lib/api";
import { ImageUpload } from "@/components/ui/image-upload";
import { imageUploader } from "@/utils/upload";
import { useConfigStore } from "@/store/config";
import { TagInput } from "@/components/ui/tag-input";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useTranslations } from "next-intl";

interface PostEditorProps {
  postId?: string;
}

interface PostFormData {
  title: string;
  description: string;
  content: string;
  categoryId: string;
  status: string;
  image: string;
  tagNames: string[]; // Store tag names as strings for the UI
  tagIds: string[]; // Store tag IDs for submission
}

export function PostEditor({ postId }: PostEditorProps) {
  const t = useTranslations("blog");
  const router = useRouter();
  const { categories, fetchCategories } = useBlogStore();
  const { settings } = useConfigStore();

  const [post, setPost] = useState<any>(null);
  const [formData, setFormData] = useState<PostFormData>({
    title: "",
    description: "",
    content: "",
    categoryId: "",
    status: "DRAFT",
    image: "",
    tagNames: [],
    tagIds: [],
  });

  // New state for image upload
  const [featuredImage, setFeaturedImage] = useState<File | string | null>(
    null
  );
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("content");

  // Store all available tags
  const [availableTags, setAvailableTags] = useState<Tag[]>([]);

  const isEditing = !!postId;

  // Load categories and post data if editing
  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      setError(null);

      try {
        // Load settings and categories
        await fetchCategories();

        // If editing, load post data
        if (isEditing && postId) {
          try {
            const response = await fetch(`/api/blog/author/manage/${postId}`);

            if (!response.ok) {
              const errorData = await response.json().catch(() => ({}));
              throw new Error(
                errorData.error || `Failed to load post: ${response.status}`
              );
            }

            const postData = await response.json();
            setPost(postData);

            // Extract tag names and IDs from the response
            const tagNames = postData.tags
              ? postData.tags.map((tag: Tag) => tag.name)
              : [];
            const tagIds = postData.tags
              ? postData.tags.map((tag: Tag) => tag.id)
              : [];

            // Store all available tags for reference
            if (postData.tags) {
              setAvailableTags(postData.tags);
            }

            // Set form data from post
            setFormData({
              title: postData.title || "",
              description: postData.description || "",
              content: postData.content || "",
              categoryId: postData.categoryId
                ? postData.categoryId.toString()
                : "",
              status: postData.status || "DRAFT",
              image: postData.image || "",
              tagNames: tagNames,
              tagIds: tagIds,
            });

            // Set featured image if it exists
            if (postData.image) {
              setFeaturedImage(postData.image);
            }
          } catch (err: any) {
            console.error("Error loading post:", err);
            setError(`Failed to load post: ${err.message}`);
          }
        }
      } catch (err: any) {
        console.error("Error loading data:", err);
        setError(err.message || "Failed to load data");
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, [fetchCategories, isEditing, postId]);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleContentChange = (content: string) => {
    setFormData((prev) => ({ ...prev, content }));
  };

  const handleSelectChange = (name: string, value: string) => {
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleTagsChange = (tagNames: string[]) => {
    // Update the tag names in the form
    setFormData((prev) => ({
      ...prev,
      tagNames,
      // Keep existing tag IDs for tags that still exist in the tagNames array
      tagIds: prev.tagIds.filter(
        (_, index) =>
          index < prev.tagNames.length &&
          tagNames.includes(prev.tagNames[index])
      ),
    }));
  };

  const handleImageChange = async (fileOrNull: File | null) => {
    setFeaturedImage(fileOrNull);
    setUploadError(null);

    if (fileOrNull === null) {
      // Image was removed
      setFormData((prev) => ({ ...prev, image: "" }));
      return;
    }

    // We'll upload the image when the form is submitted
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setError(null);
    setUploadError(null);

    try {
      // If we have a new image file, upload it first
      let imageUrl = formData.image;

      if (featuredImage instanceof File) {
        setIsUploading(true);

        const uploadResult = await imageUploader({
          file: featuredImage,
          dir: "blog-posts",
          size: { maxWidth: 1200, maxHeight: 800 },
          oldPath: isEditing ? formData.image : "",
        });

        setIsUploading(false);

        if (!uploadResult.success) {
          setUploadError(uploadResult.error || "Failed to upload image");
          setIsSaving(false);
          return;
        }

        imageUrl = uploadResult.url;
      }

      // Prepare tags for submission
      // For existing tags, use their IDs
      // For new tags, just send the names (backend will create them)
      const tagData = formData.tagNames.map((tagName, index) => {
        // Check if this tag exists in availableTags
        const existingTag = availableTags.find((tag) => tag.name === tagName);
        if (existingTag) {
          return { id: existingTag.id };
        } else {
          // New tag, just send the name
          return { name: tagName };
        }
      });

      // Update form data with the new image URL and prepared tags
      const updatedFormData = {
        ...formData,
        image: imageUrl,
        tags: tagData, // Send the prepared tag data
      };

      // Remove tagNames and tagIds from the submission as they're just for UI
      delete (updatedFormData as any).tagNames;
      delete (updatedFormData as any).tagIds;

      if (isEditing && postId) {
        // Update existing post
        const { error } = await $fetch({
          url: `/api/blog/author/manage/${postId}`,
          method: "PUT",
          body: updatedFormData,
        });

        if (error) throw new Error(error);
      } else {
        // Create new post
        const { error } = await $fetch({
          url: "/api/admin/blog/author/manage",
          method: "POST",
          body: updatedFormData,
        });

        if (error) throw new Error(error);
      }

      // Redirect to posts list
      router.push("/blog/author/manage");
    } catch (err: any) {
      console.error("Error saving post:", err);
      setError(err.message || "Failed to save post");
      setIsSaving(false);
    }
  };

  const handlePreview = () => {
    // Open a new window with the post content
    const previewWindow = window.open("", "_blank");
    if (previewWindow) {
      previewWindow.document.write(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>${formData.title || "Post Preview"}</title>
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <style>
            body {
              font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
              line-height: 1.6;
              max-width: 800px;
              margin: 0 auto;
              padding: 20px;
              color: #333;
            }
            img {
              max-width: 100%;
              height: auto;
            }
            h1 {
              font-size: 2.5rem;
              margin-bottom: 1rem;
            }
            .description {
              font-size: 1.2rem;
              color: #666;
              margin-bottom: 2rem;
              font-style: italic;
            }
            .content {
              margin-top: 2rem;
            }
            .preview-banner {
              background: #f0f0f0;
              padding: 10px;
              text-align: center;
              margin-bottom: 20px;
              border-radius: 4px;
            }
            .tags {
              display: flex;
              flex-wrap: wrap;
              gap: 8px;
              margin-top: 1rem;
            }
            .tag {
              background: #f0f0f0;
              padding: 4px 10px;
              border-radius: 16px;
              font-size: 0.85rem;
            }
            @media (prefers-color-scheme: dark) {
              body {
                background-color: #18181b;
                color: #e4e4e7;
              }
              .preview-banner {
                background: #27272a;
                color: #e4e4e7;
              }
              .description {
                color: #a1a1aa;
              }
              .tag {
                background: #27272a;
                color: #e4e4e7;
              }
            }
          </style>
        </head>
        <body>
          <div class="preview-banner">Preview Mode</div>
          <h1>${formData.title || "Untitled Post"}</h1>
          <div class="description">${formData.description || ""}</div>
          ${
            formData.tagNames.length > 0
              ? `
            <div class="tags">
              ${formData.tagNames.map((tag) => `<span class="tag">${tag}</span>`).join("")}
            </div>
          `
              : ""
          }
          <div class="content">${formData.content || ""}</div>
        </body>
        </html>
      `);
      previewWindow.document.close();
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <Skeleton className="h-10 w-1/3" />
          <Skeleton className="h-10 w-32" />
        </div>
        <Card className="dark:bg-zinc-800 dark:border-zinc-700">
          <CardHeader>
            <Skeleton className="h-8 w-1/4 mb-2" />
            <Skeleton className="h-4 w-2/3" />
          </CardHeader>
          <CardContent className="space-y-6">
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-64 w-full" />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
            </div>
            <Skeleton className="h-40 w-full" />
          </CardContent>
          <CardFooter>
            <Skeleton className="h-10 w-32" />
          </CardFooter>
        </Card>
      </div>
    );
  }

  const getStatusColor = (status: string) => {
    return status === "PUBLISHED"
      ? "bg-green-100 text-green-800 dark:bg-green-950/30 dark:text-green-300"
      : "bg-amber-100 text-amber-800 dark:bg-amber-950/30 dark:text-amber-300";
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-8 pb-24">
      {error && (
        <Alert
          variant="destructive"
          className="animate-in fade-in-50 slide-in-from-top-5"
        >
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-4">
          <Button
            type="button"
            variant="secondary"
            size="icon"
            onClick={() => router.push("/blog/author/manage")}
            className="dark:bg-zinc-800 dark:text-zinc-100 dark:hover:bg-zinc-700"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
              {isEditing ? "Edit Post" : "Create New Post"}
            </h1>
            <p className="text-muted-foreground mt-1 dark:text-zinc-400">
              {isEditing
                ? "Update your existing post"
                : "Share your thoughts with the world"}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2">
            <div
              className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium border ${getStatusColor(formData.status)}}`}
            >
              {formData.status === "PUBLISHED" ? (
                <CheckCircle2 className="h-3.5 w-3.5 text-green-500 dark:text-green-400" />
              ) : (
                <FileText className="h-3.5 w-3.5 text-amber-500 dark:text-amber-400" />
              )}
              {formData.status === "PUBLISHED" ? "Published" : "Draft"}
            </div>
          </div>
          <Button
            type="button"
            variant="outline"
            onClick={handlePreview}
            className="flex-1 sm:flex-none dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-700"
          >
            <Eye className="mr-2 h-4 w-4" />
            {t("Preview")}
          </Button>
          <Button
            type="submit"
            disabled={isSaving || isUploading}
            className="flex-1 sm:flex-none"
          >
            <Save className="mr-2 h-4 w-4" />
            {isSaving ? "Saving..." : isEditing ? "Update Post" : "Create Post"}
          </Button>
        </div>
      </div>

      <Tabs
        value={activeTab}
        onValueChange={setActiveTab}
        className="w-full space-y-4"
      >
        <TabsList className="w-full flex gap-4 dark:bg-zinc-800">
          <TabsTrigger
            value="content"
            className="w-full dark:data-[state=active]:bg-zinc-700 dark:text-zinc-300 dark:data-[state=active]:text-zinc-100"
          >
            <FileText className="h-4 w-4 mr-2" />
            {t("Content")}
          </TabsTrigger>
          <TabsTrigger
            value="media"
            className="w-full dark:data-[state=active]:bg-zinc-700 dark:text-zinc-300 dark:data-[state=active]:text-zinc-100"
          >
            <ImageIcon className="h-4 w-4 mr-2" />
            {t("Media")}
          </TabsTrigger>
          <TabsTrigger
            value="metadata"
            className="w-full dark:data-[state=active]:bg-zinc-700 dark:text-zinc-300 dark:data-[state=active]:text-zinc-100"
          >
            <Layers className="h-4 w-4 mr-2" />
            {t("Metadata")}
          </TabsTrigger>
          <TabsTrigger
            value="settings"
            className="w-full dark:data-[state=active]:bg-zinc-700 dark:text-zinc-300 dark:data-[state=active]:text-zinc-100"
          >
            <Settings className="h-4 w-4 mr-2" />
            {t("Settings")}
          </TabsTrigger>
        </TabsList>

        <Card className="overflow-hidden border-none shadow-lg dark:bg-zinc-800">
          <CardContent className="p-0">
            <TabsContent value="content" className="m-0 p-6 space-y-6">
              {/* Title */}
              <div>
                <Label
                  htmlFor="title"
                  className="text-base font-medium text-zinc-900 dark:text-zinc-100"
                >
                  {t("Title")}
                </Label>
                <Input
                  id="title"
                  name="title"
                  value={formData.title}
                  onChange={handleChange}
                  placeholder="Enter a compelling title..."
                  className="mt-1.5 h-12 text-lg font-medium dark:bg-zinc-900 dark:border-zinc-700 dark:text-zinc-100 dark:placeholder:text-zinc-500"
                  required
                />
              </div>

              {/* Description */}
              <div>
                <Label
                  htmlFor="description"
                  className="text-base font-medium text-zinc-900 dark:text-zinc-100"
                >
                  {t("Description")}
                </Label>
                <Textarea
                  id="description"
                  name="description"
                  value={formData.description}
                  onChange={handleChange}
                  placeholder="Write a brief description of your post..."
                  className="mt-1.5 dark:bg-zinc-900 dark:border-zinc-700 dark:text-zinc-100 dark:placeholder:text-zinc-500"
                  rows={3}
                />
              </div>

              {/* Content */}
              <div>
                <Label
                  htmlFor="content"
                  className="text-base font-medium text-zinc-900 dark:text-zinc-100"
                >
                  {t("Content")}
                </Label>
                <div className="mt-1.5 overflow-hidden">
                  <RichTextEditor
                    value={formData.content}
                    onChange={handleContentChange}
                    placeholder="Write your post content here..."
                    uploadDir="blog-posts"
                  />
                </div>
              </div>
            </TabsContent>

            <TabsContent value="media" className="m-0 p-6 space-y-6">
              {/* Featured Image */}
              <div>
                <Label
                  htmlFor="image"
                  className="text-base font-medium text-zinc-900 dark:text-zinc-100"
                >
                  {t("featured_image")}
                </Label>
                <p className="text-sm text-muted-foreground mb-3 dark:text-zinc-400">
                  {t("this_image_will_media_previews")}.
                </p>
                <div className="mt-1.5">
                  <ImageUpload
                    value={featuredImage}
                    onChange={handleImageChange}
                    title="Featured Image"
                    error={!!uploadError}
                    errorMessage={uploadError || ""}
                    loading={isUploading}
                  />
                </div>
              </div>
            </TabsContent>

            <TabsContent value="metadata" className="m-0 p-6 space-y-6">
              {/* Tags */}
              <div>
                <div className="flex items-center gap-2 mb-1.5">
                  <Label
                    htmlFor="tags"
                    className="text-base font-medium text-zinc-900 dark:text-zinc-100"
                  >
                    {t("Tags")}
                  </Label>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div className="cursor-help text-muted-foreground dark:text-zinc-500">
                          <Tag className="h-4 w-4" />
                        </div>
                      </TooltipTrigger>
                      <TooltipContent className="dark:bg-zinc-700 dark:text-zinc-100">
                        <p>{t("tags_help_readers_discover_your_content")}</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
                {settings && (
                  <p className="text-sm text-muted-foreground mb-3 dark:text-zinc-400">
                    {t("you_can_add_up_to")}
                    {settings.maxTagsPerPost}
                    {t("tags_to_your_post")}.{" "}
                    {t("type_and_press_comma_or_enter_to_add_a_tag")}.
                  </p>
                )}
                <TagInput
                  value={formData.tagNames}
                  onChange={handleTagsChange}
                  placeholder="Add tags (separate with comma)..."
                  maxTags={settings?.maxTagsPerPost}
                  className="mt-1.5 dark:bg-zinc-900 dark:border-zinc-700 dark:text-zinc-100"
                />
              </div>
            </TabsContent>

            <TabsContent value="settings" className="m-0 p-6 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Category */}
                <div>
                  <Label
                    htmlFor="category"
                    className="text-base font-medium text-zinc-900 dark:text-zinc-100"
                  >
                    {t("Category")}
                  </Label>
                  <p className="text-sm text-muted-foreground mb-3 dark:text-zinc-400">
                    {t("select_the_category_that_best_fits_your_post")}.
                  </p>
                  <Select
                    value={formData.categoryId}
                    onValueChange={(value) =>
                      handleSelectChange("categoryId", value)
                    }
                  >
                    <SelectTrigger
                      id="category"
                      className="w-full dark:bg-zinc-900 dark:border-zinc-700 dark:text-zinc-100"
                    >
                      <SelectValue placeholder="Select a category" />
                    </SelectTrigger>
                    <SelectContent className="dark:bg-zinc-800 dark:border-zinc-700">
                      {categories &&
                        categories.map((category: any) => (
                          <SelectItem
                            key={category.id}
                            value={category.id.toString()}
                            className="dark:text-zinc-100 dark:focus:bg-zinc-700"
                          >
                            {category.name}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Status */}
                <div>
                  <Label
                    htmlFor="status"
                    className="text-base font-medium text-zinc-900 dark:text-zinc-100"
                  >
                    {t("Status")}
                  </Label>
                  <p className="text-sm text-muted-foreground mb-3 dark:text-zinc-400">
                    {t("set_as_draft_it_live")}.
                  </p>
                  <Select
                    value={formData.status}
                    onValueChange={(value) =>
                      handleSelectChange("status", value)
                    }
                  >
                    <SelectTrigger
                      id="status"
                      className="w-full dark:bg-zinc-900 dark:border-zinc-700 dark:text-zinc-100"
                    >
                      <SelectValue placeholder="Select status" />
                    </SelectTrigger>
                    <SelectContent className="dark:bg-zinc-800 dark:border-zinc-700">
                      <SelectItem
                        value="DRAFT"
                        className="dark:text-zinc-100 dark:focus:bg-zinc-700"
                      >
                        {t("Draft")}
                      </SelectItem>
                      <SelectItem
                        value="PUBLISHED"
                        className="dark:text-zinc-100 dark:focus:bg-zinc-700"
                      >
                        {t("Published")}
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </TabsContent>
          </CardContent>
        </Card>
      </Tabs>
    </form>
  );
}
