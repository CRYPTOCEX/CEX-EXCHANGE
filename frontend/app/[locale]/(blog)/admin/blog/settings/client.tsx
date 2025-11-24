"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Slider } from "@/components/ui/slider";
import {
  AlertCircle,
  Save,
  RotateCcw,
  Users,
  FileText,
  Layout,
  Search,
  CheckCircle2,
  Info,
} from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { motion } from "framer-motion";
import { Textarea } from "@/components/ui/textarea";
import { $fetch } from "@/lib/api";
import { useConfigStore } from "@/store/config";

// Shadcn UI Dialog components
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { useTranslations } from "next-intl";

// Default settings to use when none are found
const defaultSettings = {
  enableAuthorApplications: true,
  autoApproveAuthors: false,
  maxPostsPerAuthor: 0,
  maxTagsPerPost: 5,
  maxCategoriesPerPost: 3,
  enableComments: true,
  moderateComments: true,
  postsPerPage: 10,
  showAuthorBio: true,
  showRelatedPosts: true,
  defaultMetaDescription: "Your blog's default meta description",
  defaultMetaKeywords: "blog, articles, content",
};

export function SettingsClient() {
  const t = useTranslations("blog");
  const { settings, setSettings } = useConfigStore();

  // Merge defaults with any existing settings (parse strings -> booleans/numbers)
  const mergedSettings = {
    ...defaultSettings,
    enableAuthorApplications:
      settings?.enableAuthorApplications === undefined
        ? defaultSettings.enableAuthorApplications
        : settings.enableAuthorApplications === "true" ||
          settings.enableAuthorApplications === true,
    autoApproveAuthors:
      settings?.autoApproveAuthors === undefined
        ? defaultSettings.autoApproveAuthors
        : settings.autoApproveAuthors === "true" ||
          settings.autoApproveAuthors === true,
    maxPostsPerAuthor: Number(
      settings?.maxPostsPerAuthor ?? defaultSettings.maxPostsPerAuthor
    ),
    maxTagsPerPost: Number(
      settings?.maxTagsPerPost ?? defaultSettings.maxTagsPerPost
    ),
    maxCategoriesPerPost: Number(
      settings?.maxCategoriesPerPost ?? defaultSettings.maxCategoriesPerPost
    ),
    enableComments:
      settings?.enableComments === undefined
        ? defaultSettings.enableComments
        : settings.enableComments === "true" ||
          settings.enableComments === true,
    moderateComments:
      settings?.moderateComments === undefined
        ? defaultSettings.moderateComments
        : settings.moderateComments === "true" ||
          settings.moderateComments === true,
    postsPerPage: Number(
      settings?.postsPerPage ?? defaultSettings.postsPerPage
    ),
    showAuthorBio:
      settings?.showAuthorBio === undefined
        ? defaultSettings.showAuthorBio
        : settings.showAuthorBio === "true" || settings.showAuthorBio === true,
    showRelatedPosts:
      settings?.showRelatedPosts === undefined
        ? defaultSettings.showRelatedPosts
        : settings.showRelatedPosts === "true" ||
          settings.showRelatedPosts === true,
    defaultMetaDescription:
      settings?.defaultMetaDescription ??
      defaultSettings.defaultMetaDescription,
    defaultMetaKeywords:
      settings?.defaultMetaKeywords ?? defaultSettings.defaultMetaKeywords,
  };

  // Local state for the form
  const [localSettings, setLocalSettings] = useState(mergedSettings);
  const [activeTab, setActiveTab] = useState("authors");
  const [isSaving, setIsSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [error, setError] = useState("");

  // Dialog state for resetting
  const [openResetDialog, setOpenResetDialog] = useState(false);

  // Re-merge if config store changes externally
  useEffect(() => {
    const updated = { ...defaultSettings, ...mergedSettings };
    setLocalSettings(updated);
  }, [settings]);

  // Compare local to store to see if changes exist
  useEffect(() => {
    const changed =
      JSON.stringify(localSettings) !== JSON.stringify(mergedSettings);
    setHasChanges(changed);
  }, [localSettings, mergedSettings]);

  // Clear success message after 3s
  useEffect(() => {
    if (saveSuccess) {
      const timer = setTimeout(() => setSaveSuccess(false), 3000);
      return () => clearTimeout(timer);
    }
  }, [saveSuccess]);

  // Switch toggler
  const handleSwitchChange = (field: keyof typeof localSettings) => {
    setLocalSettings((prev) => ({ ...prev, [field]: !prev[field] }));
  };

  // Slider = always numeric
  const handleSliderChange = (
    field: keyof typeof localSettings,
    value: number[]
  ) => {
    setLocalSettings((prev) => ({ ...prev, [field]: value[0] }));
  };

  // Input fields
  const handleInputChange = (
    field: keyof typeof localSettings,
    value: string
  ) => {
    setLocalSettings((prev) => ({ ...prev, [field]: value }));
  };

  // Save with PUT
  const handleSave = async () => {
    setIsSaving(true);
    // Convert booleans/numbers to strings if your API expects them that way
    const bodyToSave = {
      ...localSettings,
      enableAuthorApplications: String(localSettings.enableAuthorApplications),
      autoApproveAuthors: String(localSettings.autoApproveAuthors),
      enableComments: String(localSettings.enableComments),
      moderateComments: String(localSettings.moderateComments),
      showAuthorBio: String(localSettings.showAuthorBio),
      showRelatedPosts: String(localSettings.showRelatedPosts),
    };

    const { error } = await $fetch({
      url: "/api/admin/system/settings",
      method: "PUT",
      body: bodyToSave,
    });
    if (!error) {
      setSaveSuccess(true);
      setHasChanges(false);
      // Merge with existing settings to avoid overwriting other extensions' settings
      const mergedSettings = { ...settings, ...bodyToSave };
      setSettings(mergedSettings);
      // Don't set bodyToSave to localSettings since types are different (strings vs booleans)
      // localSettings should keep its original boolean values
    }
    setIsSaving(false);
  };

  // Confirmed reset
  const handleReset = async () => {
    setIsSaving(true);
    const { error: resetError } = await $fetch({
      url: "/api/admin/system/settings",
      method: "PUT",
      body: defaultSettings,
    });
    setIsSaving(false);
    setOpenResetDialog(false);

    if (!resetError) {
      // Merge with existing settings to avoid overwriting other extensions' settings
      const mergedSettings = { ...settings, ...defaultSettings };
      setSettings(mergedSettings);
      setLocalSettings(defaultSettings);
      setHasChanges(false);
    }
  };

  if (error) {
    return (
      <Alert variant="destructive" className="animate-in fade-in-50">
        <AlertCircle className="h-5 w-5" />
        <AlertTitle className="text-lg font-semibold">
          {t("error_loading_settings")}
        </AlertTitle>
        <AlertDescription className="mt-2">
          <p>{error}</p>
          <Button
            className="mt-4"
            variant="outline"
            onClick={() => window.location.reload()}
          >
            {t("try_again")}
          </Button>
        </AlertDescription>
      </Alert>
    );
  }

  const getTabIcon = (tab: string) => {
    switch (tab) {
      case "authors":
        return <Users className="h-5 w-5" />;
      case "content":
        return <FileText className="h-5 w-5" />;
      case "display":
        return <Layout className="h-5 w-5" />;
      case "seo":
        return <Search className="h-5 w-5" />;
      default:
        return null;
    }
  };

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="space-y-6"
      >
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">
              {t("blog_settings")}
            </h1>
            <p className="text-muted-foreground">
              {t("configure_your_blog_settings_and_preferences")}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {hasChanges && (
              <Badge
                variant="outline"
                className="bg-warning/10 text-warning border-warning/20"
              >
                <Info className="h-3.5 w-3.5 mr-1" />
                {t("unsaved_changes")}
              </Badge>
            )}
            {saveSuccess && (
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0 }}
              >
                <Badge
                  variant="outline"
                  className="bg-success/10 text-success border-success/20"
                >
                  <CheckCircle2 className="h-3.5 w-3.5 mr-1" />
                  {t("saved_successfully")}
                </Badge>
              </motion.div>
            )}
          </div>
        </div>

        <Tabs
          value={activeTab}
          onValueChange={setActiveTab}
          className="space-y-6"
        >
          <TabsList className="grid w-full grid-cols-4 lg:w-auto">
            {["authors", "content", "display", "seo"].map((tab) => (
              <TabsTrigger
                key={tab}
                value={tab}
                className="flex items-center gap-2"
              >
                {getTabIcon(tab)}
                <span className="hidden sm:inline">
                  {tab.charAt(0).toUpperCase() + tab.slice(1)}
                </span>
              </TabsTrigger>
            ))}
          </TabsList>

          {/* Authors Settings */}
          <TabsContent value="authors" className="space-y-6">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.3 }}
            >
              <Card>
                <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/20 dark:to-indigo-950/20 rounded-t-lg">
                  <CardTitle className="flex items-center gap-2">
                    <Users className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                    {t("author_settings")}
                  </CardTitle>
                  <CardDescription>
                    {t("configure_how_authors_interact_with_your_blog")}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6 pt-6">
                  <div className="flex items-center justify-between p-4 rounded-lg bg-muted/30 dark:bg-zinc-900/40">
                    <div className="space-y-0.5">
                      <Label
                        htmlFor="enableAuthorApplications"
                        className="text-base font-medium"
                      >
                        {t("enable_author_applications")}
                      </Label>
                      <p className="text-sm text-muted-foreground">
                        {t("allow_users_to_your_blog")}
                      </p>
                    </div>
                    <Switch
                      id="enableAuthorApplications"
                      checked={localSettings.enableAuthorApplications}
                      onCheckedChange={() =>
                        handleSwitchChange("enableAuthorApplications")
                      }
                    />
                  </div>

                  <div className="flex items-center justify-between p-4 rounded-lg bg-muted/30 dark:bg-zinc-900/40">
                    <div className="space-y-0.5">
                      <Label
                        htmlFor="autoApproveAuthors"
                        className="text-base font-medium"
                      >
                        {t("auto-approve_author_applications")}
                      </Label>
                      <p className="text-sm text-muted-foreground">
                        {t("automatically_approve_all_without_review")}
                      </p>
                    </div>
                    <Switch
                      id="autoApproveAuthors"
                      checked={localSettings.autoApproveAuthors}
                      onCheckedChange={() =>
                        handleSwitchChange("autoApproveAuthors")
                      }
                      disabled={!localSettings.enableAuthorApplications}
                    />
                  </div>

                  <div className="space-y-3 p-4 rounded-lg bg-muted/30 dark:bg-zinc-900/40">
                    <div>
                      <Label
                        htmlFor="maxPostsPerAuthor"
                        className="text-base font-medium"
                      >
                        {t("maximum_posts_per_author")}
                      </Label>
                      <p className="text-sm text-muted-foreground">
                        {t("limit_the_number_=_unlimited)")}
                      </p>
                    </div>
                    <div className="flex items-center gap-4">
                      <Slider
                        id="maxPostsPerAuthor"
                        value={[Number(localSettings.maxPostsPerAuthor ?? 0)]}
                        onValueChange={(value) =>
                          handleSliderChange("maxPostsPerAuthor", value)
                        }
                        min={0}
                        max={50}
                        step={1}
                        className="flex-1"
                      />
                      <span className="w-12 text-center font-medium bg-background dark:bg-zinc-800 border rounded-md py-1 px-2">
                        {Number(localSettings.maxPostsPerAuthor) === 0
                          ? "∞"
                          : localSettings.maxPostsPerAuthor}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </TabsContent>

          {/* Content Settings */}
          <TabsContent value="content" className="space-y-6">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.3 }}
            >
              <Card>
                <CardHeader className="bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-emerald-950/20 dark:to-teal-950/20 rounded-t-lg">
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                    {t("content_settings")}
                  </CardTitle>
                  <CardDescription>
                    {t("configure_content_creation_and_management")}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6 pt-6">
                  <div className="space-y-3 p-4 rounded-lg bg-muted/30 dark:bg-zinc-900/40">
                    <div>
                      <Label
                        htmlFor="maxTagsPerPost"
                        className="text-base font-medium"
                      >
                        {t("maximum_tags_per_post")}
                      </Label>
                      <p className="text-sm text-muted-foreground">
                        {t("limit_the_number_a_post")}
                      </p>
                    </div>
                    <div className="flex items-center gap-4">
                      <Slider
                        id="maxTagsPerPost"
                        value={[Number(localSettings.maxTagsPerPost)]}
                        onValueChange={(value) =>
                          handleSliderChange("maxTagsPerPost", value)
                        }
                        min={1}
                        max={20}
                        step={1}
                        className="flex-1"
                      />
                      <span className="w-12 text-center font-medium bg-background dark:bg-zinc-800 border rounded-md py-1 px-2">
                        {localSettings.maxTagsPerPost}
                      </span>
                    </div>
                  </div>

                  <div className="space-y-3 p-4 rounded-lg bg-muted/30 dark:bg-zinc-900/40">
                    <div>
                      <Label
                        htmlFor="maxCategoriesPerPost"
                        className="text-base font-medium"
                      >
                        {t("maximum_categories_per_post")}
                      </Label>
                      <p className="text-sm text-muted-foreground">
                        {t("limit_the_number_a_post")}
                      </p>
                    </div>
                    <div className="flex items-center gap-4">
                      <Slider
                        id="maxCategoriesPerPost"
                        value={[Number(localSettings.maxCategoriesPerPost)]}
                        onValueChange={(value) =>
                          handleSliderChange("maxCategoriesPerPost", value)
                        }
                        min={1}
                        max={5}
                        step={1}
                        className="flex-1"
                      />
                      <span className="w-12 text-center font-medium bg-background dark:bg-zinc-800 border rounded-md py-1 px-2">
                        {localSettings.maxCategoriesPerPost}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between p-4 rounded-lg bg-muted/30 dark:bg-zinc-900/40">
                    <div className="space-y-0.5">
                      <Label
                        htmlFor="enableComments"
                        className="text-base font-medium"
                      >
                        {t("enable_comments")}
                      </Label>
                      <p className="text-sm text-muted-foreground">
                        {t("allow_users_to_comment_on_blog_posts")}
                      </p>
                    </div>
                    <Switch
                      id="enableComments"
                      checked={localSettings.enableComments}
                      onCheckedChange={() =>
                        handleSwitchChange("enableComments")
                      }
                    />
                  </div>

                  <div className="flex items-center justify-between p-4 rounded-lg bg-muted/30 dark:bg-zinc-900/40">
                    <div className="space-y-0.5">
                      <Label
                        htmlFor="moderateComments"
                        className="text-base font-medium"
                      >
                        {t("moderate_comments")}
                      </Label>
                      <p className="text-sm text-muted-foreground">
                        {t("review_and_approve_are_published")}
                      </p>
                    </div>
                    <Switch
                      id="moderateComments"
                      checked={localSettings.moderateComments}
                      onCheckedChange={() =>
                        handleSwitchChange("moderateComments")
                      }
                      disabled={!localSettings.enableComments}
                    />
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </TabsContent>

          {/* Display Settings */}
          <TabsContent value="display" className="space-y-6">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.3 }}
            >
              <Card>
                <CardHeader className="bg-gradient-to-r from-purple-50 to-violet-50 dark:from-purple-950/20 dark:to-violet-950/20 rounded-t-lg">
                  <CardTitle className="flex items-center gap-2">
                    <Layout className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                    {t("display_settings")}
                  </CardTitle>
                  <CardDescription>
                    {t("configure_how_content_is_displayed_on_your_blog")}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6 pt-6">
                  <div className="space-y-3 p-4 rounded-lg bg-muted/30 dark:bg-zinc-900/40">
                    <div>
                      <Label
                        htmlFor="postsPerPage"
                        className="text-base font-medium"
                      >
                        {t("posts_per_page")}
                      </Label>
                      <p className="text-sm text-muted-foreground">
                        {t("number_of_posts_to_display_per_page_in_listings")}
                      </p>
                    </div>
                    <div className="flex items-center gap-4">
                      <Slider
                        id="postsPerPage"
                        value={[Number(localSettings.postsPerPage)]}
                        onValueChange={(value) =>
                          handleSliderChange("postsPerPage", value)
                        }
                        min={5}
                        max={50}
                        step={5}
                        className="flex-1"
                      />
                      <span className="w-12 text-center font-medium bg-background dark:bg-zinc-800 border rounded-md py-1 px-2">
                        {localSettings.postsPerPage}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between p-4 rounded-lg bg-muted/30 dark:bg-zinc-900/40">
                    <div className="space-y-0.5">
                      <Label
                        htmlFor="showAuthorBio"
                        className="text-base font-medium"
                      >
                        {t("show_author_bio")}
                      </Label>
                      <p className="text-sm text-muted-foreground">
                        {t("display_author_biography_on_post_pages")}
                      </p>
                    </div>
                    <Switch
                      id="showAuthorBio"
                      checked={localSettings.showAuthorBio}
                      onCheckedChange={() =>
                        handleSwitchChange("showAuthorBio")
                      }
                    />
                  </div>

                  <div className="flex items-center justify-between p-4 rounded-lg bg-muted/30 dark:bg-zinc-900/40">
                    <div className="space-y-0.5">
                      <Label
                        htmlFor="showRelatedPosts"
                        className="text-base font-medium"
                      >
                        {t("show_related_posts")}
                      </Label>
                      <p className="text-sm text-muted-foreground">
                        {t("display_related_posts_at_the_end_of_each_article")}
                      </p>
                    </div>
                    <Switch
                      id="showRelatedPosts"
                      checked={localSettings.showRelatedPosts}
                      onCheckedChange={() =>
                        handleSwitchChange("showRelatedPosts")
                      }
                    />
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </TabsContent>

          {/* SEO Settings */}
          <TabsContent value="seo" className="space-y-6">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.3 }}
            >
              <Card>
                <CardHeader className="bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-950/20 dark:to-orange-950/20 rounded-t-lg">
                  <CardTitle className="flex items-center gap-2">
                    <Search className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                    {t("seo_settings")}
                  </CardTitle>
                  <CardDescription>
                    {t("configure_search_engine_optimization_settings")}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6 pt-6">
                  <div className="space-y-3 p-4 rounded-lg bg-muted/30 dark:bg-zinc-900/40">
                    <Label
                      htmlFor="defaultMetaDescription"
                      className="text-base font-medium"
                    >
                      {t("default_meta_description")}
                    </Label>
                    <Textarea
                      id="defaultMetaDescription"
                      value={localSettings.defaultMetaDescription}
                      onChange={(e) =>
                        handleInputChange(
                          "defaultMetaDescription",
                          e.target.value
                        )
                      }
                      placeholder="Enter default meta description"
                      className="resize-none"
                      rows={3}
                    />
                    <p className="text-xs text-muted-foreground">
                      {t("used_when_a_specific_description")}.{" "}
                      {t("recommended_length_150-160_characters")}.
                    </p>
                  </div>
                  <div className="space-y-3 p-4 rounded-lg bg-muted/30 dark:bg-zinc-900/40">
                    <Label
                      htmlFor="defaultMetaKeywords"
                      className="text-base font-medium"
                    >
                      {t("default_meta_keywords")}
                    </Label>
                    <Input
                      id="defaultMetaKeywords"
                      value={localSettings.defaultMetaKeywords}
                      onChange={(e) =>
                        handleInputChange("defaultMetaKeywords", e.target.value)
                      }
                      placeholder="Enter default meta keywords"
                    />
                    <p className="text-xs text-muted-foreground">
                      {t("comma-separated_keywords_used_for_seo")}.{" "}
                      {t("example_blog_articles_content")}
                    </p>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </TabsContent>
        </Tabs>

        <div className="flex justify-between">
          <Button
            variant="outline"
            onClick={() => setOpenResetDialog(true)}
            disabled={isSaving}
            className="gap-2"
          >
            <RotateCcw className="h-4 w-4" />
            {t("reset_to_defaults")}
          </Button>
          <Button onClick={handleSave} disabled={isSaving || !hasChanges}>
            {isSaving ? (
              <>
                <span className="animate-spin h-4 w-4 border-2 border-current border-t-transparent rounded-full" />
                {t("Saving")}.
              </>
            ) : (
              <>
                <Save className="h-4 w-4" />
                {t("save_settings")}
              </>
            )}
          </Button>
        </div>
      </motion.div>

      {/* Reset Confirmation Dialog */}
      <Dialog open={openResetDialog} onOpenChange={setOpenResetDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("reset_to_defaults")}</DialogTitle>
            <DialogDescription>
              {t("are_you_sure_be_undone")}.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpenResetDialog(false)}>
              {t("Cancel")}
            </Button>
            <Button variant="destructive" onClick={handleReset}>
              {t("yes_reset")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
