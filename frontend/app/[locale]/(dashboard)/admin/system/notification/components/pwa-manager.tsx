"use client";

import { useState, useEffect, useCallback } from "react";
import { m, AnimatePresence } from "framer-motion";
import { $fetch } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Loadable } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import {
  Smartphone,
  Monitor,
  Palette,
  Image as ImageIcon,
  Plus,
  Trash2,
  Save,
  RefreshCw,
  Upload,
  Link,
  Eye,
  Settings2,
  FileJson,
  AlertCircle,
  CheckCircle2,
  Loader2,
  Check,
} from "lucide-react";
import Image from "next/image";
import { cn } from "@/lib/utils";
import { useTranslations } from "next-intl";

interface ManifestIcon {
  src: string;
  sizes: string;
  type: string;
  purpose?: string;
  density?: string;
}

interface ManifestScreenshot {
  src: string;
  sizes: string;
  type: string;
  form_factor?: "wide" | "narrow";
  label?: string;
}

interface ManifestShortcut {
  name: string;
  short_name?: string;
  description?: string;
  url: string;
  icons?: ManifestIcon[];
}

interface Manifest {
  name: string;
  short_name: string;
  description?: string;
  start_url: string;
  display: "fullscreen" | "standalone" | "minimal-ui" | "browser";
  orientation?: string;
  background_color: string;
  theme_color: string;
  scope?: string;
  lang?: string;
  dir?: "ltr" | "rtl" | "auto";
  categories?: string[];
  icons: ManifestIcon[];
  screenshots?: ManifestScreenshot[];
  shortcuts?: ManifestShortcut[];
  related_applications?: { platform: string; url: string; id?: string }[];
  prefer_related_applications?: boolean;
  gcm_sender_id?: string;
  id?: string;
}

const DEFAULT_MANIFEST: Manifest = {
  name: "App",
  short_name: "App",
  description: "",
  start_url: "/",
  display: "standalone",
  orientation: "portrait",
  background_color: "#ffffff",
  theme_color: "#000000",
  scope: "/",
  lang: "en",
  dir: "ltr",
  categories: [],
  icons: [],
  screenshots: [],
  shortcuts: [],
  related_applications: [],
  prefer_related_applications: false,
};

const DISPLAY_MODES = [
  { value: "fullscreen", label: "Fullscreen", description: "Takes up the entire screen" },
  { value: "standalone", label: "Standalone", description: "Looks like a native app" },
  { value: "minimal-ui", label: "Minimal UI", description: "Some browser UI visible" },
  { value: "browser", label: "Browser", description: "Standard browser tab" },
];

const ORIENTATIONS = [
  { value: "any", label: "Any" },
  { value: "natural", label: "Natural" },
  { value: "landscape", label: "Landscape" },
  { value: "landscape-primary", label: "Landscape Primary" },
  { value: "landscape-secondary", label: "Landscape Secondary" },
  { value: "portrait", label: "Portrait" },
  { value: "portrait-primary", label: "Portrait Primary" },
  { value: "portrait-secondary", label: "Portrait Secondary" },
];

// Crypto/Trading/Finance related categories only
const CATEGORIES = [
  "finance",
  "business",
  "productivity",
  "utilities",
  "security",
];

// Standard PWA icon configurations
const ICON_CONFIGS = [
  { key: "icon36", size: "36x36", file: "android-icon-36x36.webp", density: "0.75" },
  { key: "icon48", size: "48x48", file: "android-icon-48x48.webp", density: "1.0" },
  { key: "icon72", size: "72x72", file: "android-icon-72x72.webp", density: "1.5" },
  { key: "icon96", size: "96x96", file: "android-icon-96x96.webp", density: "2.0" },
  { key: "icon144", size: "144x144", file: "android-icon-144x144.webp", density: "3.0" },
  { key: "icon192", size: "192x192", file: "android-icon-192x192.webp", density: "4.0" },
  { key: "icon256", size: "256x256", file: "android-icon-256x256.webp", density: "5.0" },
  { key: "icon384", size: "384x384", file: "android-icon-384x384.webp", density: "6.0" },
  { key: "icon512", size: "512x512", file: "android-icon-512x512.webp", density: "8.0" },
  { key: "icon512Maskable", size: "512x512", file: "android-icon-512x512.webp", density: "8.0", purpose: "maskable" },
];

// Icon upload component similar to LogoField
function IconUploadField({
  config,
  onUpload,
}: {
  config: { key: string; size: string; file: string; density?: string; purpose?: string };
  onUpload: () => void;
}) {
  const t = useTranslations("dashboard_admin");
  const tCommon = useTranslations("common");
  const [isUploading, setIsUploading] = useState(false);
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [imageKey, setImageKey] = useState(Date.now());

  const imagePath = `/img/logo/${config.file}`;

  const handleFileSelect = async (file: File) => {
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      alert(tCommon("please_select_an_image_file"));
      return;
    }

    setIsUploading(true);
    setUploadSuccess(false);

    try {
      const base64File = await fileToBase64(file);

      const { error } = await $fetch({
        url: "/api/admin/system/settings/logo",
        method: "PUT",
        body: {
          logoType: config.key.replace("icon", "androidIcon"),
          file: base64File,
        },
        successMessage: t("icon_updated_successfully", { size: String(config.size) }),
      });

      if (error) {
        throw new Error(typeof error === "string" ? error : JSON.stringify(error));
      }

      setUploadSuccess(true);
      setImageKey(Date.now());
      onUpload();
      setTimeout(() => setUploadSuccess(false), 2000);
    } catch (error: any) {
      alert(t("failed_to_upload_icon", { message: String(error?.message) }));
    } finally {
      setIsUploading(false);
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragActive(false);
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      handleFileSelect(files[0]);
    }
  };

  return (
    <div className="flex flex-col">
      <div className="flex items-center justify-between gap-2 mb-2">
        <Label className="text-sm font-medium">
          {config.size}
          {config.purpose === "maskable" && (
            <Badge variant="outline" className="ml-2 text-xs">Maskable</Badge>
          )}
        </Label>
      </div>

      <m.div
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        className={cn(
          "relative flex-1 min-h-[100px] rounded-xl border-2 border-dashed transition-all cursor-pointer overflow-hidden",
          "flex items-center justify-center",
          dragActive
            ? "border-primary bg-primary/5 scale-[1.02]"
            : isUploading
              ? "border-muted-foreground/25 opacity-50 cursor-not-allowed"
              : "border-muted-foreground/25 hover:border-primary/50 hover:bg-muted/30"
        )}
        onDrop={handleDrop}
        onDragOver={(e) => { e.preventDefault(); setDragActive(true); }}
        onDragLeave={(e) => { e.preventDefault(); setDragActive(false); }}
        onClick={() => {
          if (!isUploading) {
            const input = document.getElementById(`icon-${config.key}`) as HTMLInputElement;
            if (input) {
              input.value = "";
              input.click();
            }
          }
        }}
      >
        <AnimatePresence mode="wait">
          <m.div
            key="preview"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            className="relative p-2"
          >
            <div className="w-16 h-16 rounded-lg bg-muted/50 flex items-center justify-center overflow-hidden shadow-sm border">
              <Image
                key={imageKey}
                src={`${imagePath}?v=${imageKey}`}
                alt={tCommon("icon_size", { size: String(config.size) })}
                width={64}
                height={64}
                className="max-w-full max-h-full object-contain"
                unoptimized
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = "none";
                }}
              />
            </div>

            <AnimatePresence>
              {uploadSuccess && (
                <m.div
                  initial={{ scale: 0, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0, opacity: 0 }}
                  className="absolute -bottom-1 -right-1 w-5 h-5 bg-success text-success-foreground rounded-full flex items-center justify-center shadow-lg z-10"
                >
                  <Check className="h-3 w-3" />
                </m.div>
              )}
            </AnimatePresence>

            {isUploading && (
              <div className="absolute inset-0 flex items-center justify-center bg-background/80 rounded-lg">
                <Loader2 className="h-5 w-5 animate-spin text-primary" />
              </div>
            )}
          </m.div>
        </AnimatePresence>

        <input
          id={`icon-${config.key}`}
          type="file"
          accept="image/*"
          onChange={(e) => {
            const files = e.target.files;
            if (files && files.length > 0) {
              handleFileSelect(files[0]);
            }
          }}
          disabled={isUploading}
          className="hidden"
        />
      </m.div>
    </div>
  );
}

// Screenshot upload component
function ScreenshotUploadCard({
  screenshot,
  index,
  onUpdate,
  onRemove,
  onUpload,
}: {
  screenshot: ManifestScreenshot;
  index: number;
  onUpdate: (field: keyof ManifestScreenshot, value: string) => void;
  onRemove: () => void;
  onUpload: (file: File) => Promise<void>;
}) {
  const t = useTranslations("dashboard_admin");
  const tCommon = useTranslations("common");
  const [isUploading, setIsUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);

  const handleFileSelect = async (file: File) => {
    if (!file) return;
    setIsUploading(true);
    try {
      await onUpload(file);
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <m.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: "auto" }}
      exit={{ opacity: 0, height: 0 }}
      className="p-4 border rounded-lg"
    >
      <div className="flex items-start gap-4">
        {/* Upload Area */}
        <div
          className={cn(
            "w-40 h-24 bg-muted rounded-lg flex items-center justify-center overflow-hidden relative cursor-pointer transition-all",
            dragActive ? "ring-2 ring-primary" : "",
            isUploading ? "opacity-50" : "hover:bg-muted/80"
          )}
          onDrop={(e) => {
            e.preventDefault();
            setDragActive(false);
            const files = e.dataTransfer.files;
            if (files.length > 0) handleFileSelect(files[0]);
          }}
          onDragOver={(e) => { e.preventDefault(); setDragActive(true); }}
          onDragLeave={(e) => { e.preventDefault(); setDragActive(false); }}
          onClick={() => {
            if (!isUploading) {
              const input = document.getElementById(`screenshot-input-${index}`) as HTMLInputElement;
              if (input) {
                input.value = "";
                input.click();
              }
            }
          }}
        >
          {screenshot.src ? (
            <img
              src={screenshot.src}
              alt={screenshot.label || `Screenshot ${index + 1}`}
              className="w-full h-full object-cover"
              onError={(e) => {
                (e.target as HTMLImageElement).style.display = "none";
              }}
            />
          ) : (
            <div className="text-center">
              <Upload className="h-6 w-6 mx-auto text-muted-foreground mb-1" />
              <p className="text-xs text-muted-foreground">{t("click_or_drag")}</p>
            </div>
          )}

          {isUploading && (
            <div className="absolute inset-0 flex items-center justify-center bg-background/80">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          )}

          <input
            id={`screenshot-input-${index}`}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const files = e.target.files;
              if (files && files.length > 0) handleFileSelect(files[0]);
            }}
          />
        </div>

        {/* Form Fields */}
        <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <Label className="text-xs">{t("form_factor")}</Label>
            <Select
              value={screenshot.form_factor || "wide"}
              onValueChange={(v) => onUpdate("form_factor", v)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="wide">Wide (Desktop)</SelectItem>
                <SelectItem value="narrow">Narrow (Mobile)</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs">Label</Label>
            <Input
              value={screenshot.label || ""}
              onChange={(e) => onUpdate("label", e.target.value)}
              placeholder={"e.g." + ", " + tCommon("dashboard")}
            />
          </div>
          {screenshot.src && (
            <div className="md:col-span-2">
              <Label className="text-xs text-muted-foreground">Path</Label>
              <p className="text-xs text-muted-foreground truncate">{screenshot.src}</p>
            </div>
          )}
        </div>

        <Button
          variant="ghost"
          size="icon"
          onClick={onRemove}
          className="text-destructive hover:text-destructive shrink-0"
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
    </m.div>
  );
}

export function PwaManager() {
  const t = useTranslations("dashboard_admin");
  const tCommon = useTranslations("common");
  const { toast } = useToast();
  const [manifest, setManifest] = useState<Manifest>(DEFAULT_MANIFEST);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [activeTab, setActiveTab] = useState("general");
  const [showJsonPreview, setShowJsonPreview] = useState(false);
  const [iconVersion, setIconVersion] = useState(Date.now());

  const fetchManifest = useCallback(async () => {
    setIsLoading(true);
    try {
      const { data, error } = await $fetch({
        url: "/api/admin/system/pwa",
        silent: true,
      });

      if (error) {
        toast({
          title: tCommon("error"),
          description: error || t("failed_to_load_pwa_manifest"),
          variant: "destructive",
        });
      } else {
        setManifest({ ...DEFAULT_MANIFEST, ...data.manifest });
        setHasChanges(false);
      }
    } catch (err) {
      toast({
        title: tCommon("error"),
        description: t("failed_to_load_pwa_manifest"),
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchManifest();
  }, [fetchManifest]);

  const handleChange = (key: keyof Manifest, value: any) => {
    setManifest((prev) => ({ ...prev, [key]: value }));
    setHasChanges(true);
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      // Build icons array from standard configurations
      const icons: ManifestIcon[] = ICON_CONFIGS.map((config) => ({
        src: `/img/logo/${config.file}`,
        sizes: config.size,
        type: "image/png",
        ...(config.density && { density: config.density }),
        ...(config.purpose && { purpose: config.purpose }),
      }));

      const manifestToSave = {
        ...manifest,
        icons,
      };

      const { error } = await $fetch({
        url: "/api/admin/system/pwa",
        method: "PUT",
        body: { manifest: manifestToSave },
      });

      if (error) {
        toast({
          title: tCommon("error"),
          description: error || t("failed_to_save_pwa_manifest"),
          variant: "destructive",
        });
      } else {
        toast({
          title: tCommon("success"),
          description: t("pwa_manifest_saved_successfully"),
        });
        setHasChanges(false);
      }
    } catch (err) {
      toast({
        title: tCommon("error"),
        description: t("failed_to_save_pwa_manifest"),
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const addScreenshot = () => {
    const newScreenshot: ManifestScreenshot = {
      src: "",
      sizes: "1280x720",
      type: "image/png",
      form_factor: "wide",
      label: "",
    };
    handleChange("screenshots", [...(manifest.screenshots || []), newScreenshot]);
  };

  const updateScreenshot = (
    index: number,
    field: keyof ManifestScreenshot,
    value: string
  ) => {
    const newScreenshots = [...(manifest.screenshots || [])];
    newScreenshots[index] = { ...newScreenshots[index], [field]: value };
    handleChange("screenshots", newScreenshots);
  };

  const removeScreenshot = async (index: number) => {
    const screenshot = manifest.screenshots?.[index];
    if (screenshot?.src) {
      // Delete the file from server
      try {
        await $fetch({
          url: "/api/admin/system/pwa/screenshot",
          method: "DELETE",
          body: { path: screenshot.src },
          silent: true,
        });
      } catch (err) {
        // Ignore delete errors
      }
    }
    handleChange(
      "screenshots",
      (manifest.screenshots || []).filter((_, i) => i !== index)
    );
  };

  const handleScreenshotUpload = async (index: number, file: File) => {
    const reader = new FileReader();
    reader.onload = async (event) => {
      const base64 = event.target?.result as string;

      try {
        const { data, error } = await $fetch({
          url: "/api/admin/system/pwa/screenshot",
          method: "POST",
          body: {
            file: base64,
            type: "screenshot",
            name: `screenshot-${Date.now()}`,
            formFactor: manifest.screenshots?.[index]?.form_factor || "wide",
          },
        });

        if (error) {
          toast({
            title: tCommon("error"),
            description: error || t("failed_to_upload_screenshot"),
            variant: "destructive",
          });
        } else {
          const newScreenshots = [...(manifest.screenshots || [])];
          newScreenshots[index] = {
            ...newScreenshots[index],
            src: data.path,
            sizes: data.sizes,
          };
          handleChange("screenshots", newScreenshots);
          toast({
            title: tCommon("success"),
            description: t("screenshot_uploaded_successfully"),
          });
        }
      } catch (err) {
        toast({
          title: tCommon("error"),
          description: t("failed_to_upload_screenshot"),
          variant: "destructive",
        });
      }
    };
    reader.readAsDataURL(file);
  };

  const addShortcut = () => {
    const newShortcut: ManifestShortcut = {
      name: "New Shortcut",
      url: "/",
    };
    handleChange("shortcuts", [...(manifest.shortcuts || []), newShortcut]);
  };

  const updateShortcut = (
    index: number,
    field: keyof ManifestShortcut,
    value: string
  ) => {
    const newShortcuts = [...(manifest.shortcuts || [])];
    newShortcuts[index] = { ...newShortcuts[index], [field]: value };
    handleChange("shortcuts", newShortcuts);
  };

  const removeShortcut = (index: number) => {
    handleChange(
      "shortcuts",
      (manifest.shortcuts || []).filter((_, i) => i !== index)
    );
  };

  /**
   * THE MANAGER RENDERS IMMEDIATELY. Almost none of it depended on the fetch.
   * ==========================================================================
   *
   * What was here:
   *
   *     if (isLoading) {
   *       return (
   *         <div className="flex items-center justify-center h-64">
   *           <Loader2 className="h-8 w-8 animate-spin text-primary" />
   *         </div>
   *       );
   *     }
   *
   * A 256px box holding a 32px spinner, standing in for a two-column page that
   * is well over 900px tall — a five-tab bar, four cards of labelled form
   * fields, a ten-slot icon grid and a 384px phone mock in the sidebar. So the
   * pending state reserved roughly a quarter of the height it was about to
   * need, and every pixel of the difference arrived as shift, on a route the
   * operator lands on directly from the notification tabs.
   *
   * None of that structure is unknown while `/api/admin/system/pwa` is in
   * flight. The tab bar, the section titles, the field labels and their helper
   * text, the icon uploaders (which read files off `/img/logo`, not the
   * manifest), the JSON toggle and the phone mock's frame are all knowable
   * before the request is even sent. What is unknown is fourteen field VALUES.
   *
   * THE FIELDS ARE `disabled` RATHER THAN SKELETONED, and that is deliberate.
   * `manifest` is seeded with `DEFAULT_MANIFEST` so the inputs are never
   * uncontrolled, but "App" / "/" / "#ffffff" are placeholders, not the
   * platform's settings — and `fetchManifest` overwrites the whole object and
   * resets `hasChanges` when it lands. An editable box during that window would
   * silently discard whatever was typed into it. Emptying the value and
   * disabling the control keeps the box at exactly its resolved height (an
   * `<Input>` is fixed-height in both states) while saying plainly that it is
   * not yours to type in yet — the same trade the template editor next door
   * makes.
   */
  const pending = isLoading;

  /**
   * Empty is a CONCLUSION: the manifest arrived and it lists no screenshots /
   * shortcuts. `DEFAULT_MANIFEST` starts both arrays empty, so without this the
   * pending state announced "No screenshots configured" — an answer — and then
   * replaced it with a list. Named booleans rather than an inline
   * `!isLoading && …` because the inline spelling is the `hidden-while-loading`
   * shape the scanner flags, and because the two states are worth deciding in
   * one place.
   */
  const screenshotCount = (manifest.screenshots || []).length;
  const shortcutCount = (manifest.shortcuts || []).length;
  const showNoScreenshots = !pending && screenshotCount === 0;
  const showScreenshotGuidelines = !pending && screenshotCount > 0;
  const showNoShortcuts = !pending && shortcutCount === 0;

  return (
    <div className="space-y-6" aria-busy={isLoading}>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <Smartphone className="h-5 w-5 text-primary" />
            {t("pwa_manifest_manager")}
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            {t("configure_your_progressive_web_app_settings")}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowJsonPreview(!showJsonPreview)}
          >
            <FileJson className="h-4 w-4 mr-2" />
            {showJsonPreview ? tCommon("hide_detail") : tCommon("show")} JSON
          </Button>
          {/* `disabled` while the first fetch is in flight PRESERVES the old
              behaviour rather than changing it: under the spinner this button
              did not exist, so it could not be pressed. It is one element in
              both states — icon and label unchanged — so nothing moves. */}
          <Button
            variant="outline"
            size="sm"
            onClick={fetchManifest}
            disabled={isLoading}
          >
            <RefreshCw className={cn("h-4 w-4 mr-2", isLoading && "animate-spin")} />
            Reload
          </Button>
          <Button
            size="sm"
            onClick={handleSave}
            disabled={!hasChanges || isSaving}
          >
            {isSaving ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Save className="h-4 w-4 mr-2" />
            )}
            {tCommon("save_changes")}
          </Button>
        </div>
      </div>

      {hasChanges && (
        <m.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-2 p-3 bg-warning/10 border border-warning/20 rounded-lg"
        >
          <AlertCircle className="h-4 w-4 text-warning" />
          <span className="text-sm text-warning">
            {tCommon("you_have_unsaved_changes")}
          </span>
        </m.div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-5">
              <TabsTrigger value="general" className="gap-2">
                <Settings2 className="h-4 w-4" />
                <span className="hidden sm:inline">General</span>
              </TabsTrigger>
              <TabsTrigger value="appearance" className="gap-2">
                <Palette className="h-4 w-4" />
                <span className="hidden sm:inline">Appearance</span>
              </TabsTrigger>
              <TabsTrigger value="icons" className="gap-2">
                <ImageIcon className="h-4 w-4" />
                <span className="hidden sm:inline">Icons</span>
              </TabsTrigger>
              <TabsTrigger value="screenshots" className="gap-2">
                <Monitor className="h-4 w-4" />
                <span className="hidden sm:inline">Screenshots</span>
              </TabsTrigger>
              <TabsTrigger value="shortcuts" className="gap-2">
                <Link className="h-4 w-4" />
                <span className="hidden sm:inline">Shortcuts</span>
              </TabsTrigger>
            </TabsList>

            {/* General Tab */}
            <TabsContent value="general" className="space-y-4 mt-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">{t("app_identity")}</CardTitle>
                  <CardDescription>
                    Basic information about your PWA (defaults from environment variables)
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="name">{t("app_name")}</Label>
                      {/* Label above, helper text below, input between — all
                          three render in both states. Only the VALUE waits. */}
                      <Input
                        id="name"
                        value={pending ? "" : manifest.name}
                        onChange={(e) => handleChange("name", e.target.value)}
                        placeholder={t("my_awesome_app")}
                        disabled={pending}
                      />
                      <p className="text-xs text-muted-foreground">
                        {t("full_name_displayed_in_app_stores")}
                      </p>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="short_name">{t("short_name")}</Label>
                      <Input
                        id="short_name"
                        value={pending ? "" : manifest.short_name}
                        onChange={(e) => handleChange("short_name", e.target.value)}
                        placeholder="App"
                        maxLength={12}
                        disabled={pending}
                      />
                      <p className="text-xs text-muted-foreground">
                        Used on home screen (max 12 chars)
                      </p>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="description">Description</Label>
                    {/* `rows={3}` fixes the box in both states, so the tallest
                        field on the tab cannot be the one that moves. */}
                    <Textarea
                      id="description"
                      value={pending ? "" : manifest.description || ""}
                      onChange={(e) => handleChange("description", e.target.value)}
                      placeholder={`${t("a_brief_description_of_your_app")}…`}
                      rows={3}
                      disabled={pending}
                    />
                  </div>

                  <Separator />

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="start_url">{t("start_url")}</Label>
                      <Input
                        id="start_url"
                        value={pending ? "" : manifest.start_url}
                        onChange={(e) => handleChange("start_url", e.target.value)}
                        placeholder="/"
                        disabled={pending}
                      />
                      <p className="text-xs text-muted-foreground">
                        {t("url_that_loads_when_app_launches")}
                      </p>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="scope">Scope</Label>
                      <Input
                        id="scope"
                        value={pending ? "" : manifest.scope || ""}
                        onChange={(e) => handleChange("scope", e.target.value)}
                        placeholder="/"
                        disabled={pending}
                      />
                      <p className="text-xs text-muted-foreground">
                        {t("navigation_scope_of_the_app")}
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="lang">Language</Label>
                      <Input
                        id="lang"
                        value={pending ? "" : manifest.lang || ""}
                        onChange={(e) => handleChange("lang", e.target.value)}
                        placeholder="en"
                        disabled={pending}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="dir">{t("text_direction")}</Label>
                      {/* A `Select` keeps its VALUE while pending instead of
                          being emptied: a Radix trigger with no value renders
                          an empty line box, which is a different height from
                          one carrying a word. The trigger is disabled instead,
                          so the settle here is a word inside a fixed box. */}
                      <Select
                        value={manifest.dir || "ltr"}
                        onValueChange={(v) => handleChange("dir", v)}
                        disabled={pending}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="ltr">{t("left_to_right")}</SelectItem>
                          <SelectItem value="rtl">{t("right_to_left")}</SelectItem>
                          <SelectItem value="auto">Auto</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="id">{t("app_id")}</Label>
                    <Input
                      id="id"
                      value={pending ? "" : manifest.id || ""}
                      onChange={(e) => handleChange("id", e.target.value)}
                      placeholder="/?source=pwa"
                      disabled={pending}
                    />
                    <p className="text-xs text-muted-foreground">
                      Unique identifier for your PWA (helps with updates)
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label>Categories</Label>
                    <p className="text-xs text-muted-foreground mb-2">
                      {t("select_categories_relevant_to_cryptocurrency_and")}
                    </p>
                    {/* The five chips are a CONSTANT, so the row renders at its
                        final size in both states; only which of them are filled
                        waits, and a fill is paint, not layout. They are inert
                        while pending for the same reason the fields are
                        disabled — a selection made here would be overwritten by
                        the response. */}
                    <div className="flex flex-wrap gap-2">
                      {CATEGORIES.map((cat) => (
                        <Badge
                          key={cat}
                          variant={
                            manifest.categories?.includes(cat)
                              ? "default"
                              : "outline"
                          }
                          aria-disabled={pending}
                          className={cn(
                            "capitalize",
                            pending
                              ? "pointer-events-none opacity-50"
                              : "cursor-pointer"
                          )}
                          onClick={() => {
                            const cats = manifest.categories || [];
                            if (cats.includes(cat)) {
                              handleChange(
                                "categories",
                                cats.filter((c) => c !== cat)
                              );
                            } else {
                              handleChange("categories", [...cats, cat]);
                            }
                          }}
                        >
                          {cat}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Appearance Tab */}
            <TabsContent value="appearance" className="space-y-4 mt-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">{tCommon("display_settings")}</CardTitle>
                  <CardDescription>
                    {t("control_how_your_pwa_appears_when_installed")}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label>{t("display_mode")}</Label>
                    {/* Four fixed cards with fixed copy — the grid is the same
                        size before and after the fetch. The only thing that
                        moves is the `CheckCircle2`, which sits inline in a flex
                        row and pushes its own label sideways within one line
                        box; horizontal settle inside a line box is not what CLS
                        measures and not what a reader sees as a jump. */}
                    <div className="grid grid-cols-2 gap-3">
                      {DISPLAY_MODES.map((mode) => (
                        <div
                          key={mode.value}
                          className={cn(
                            "p-4 rounded-lg border-2 transition-all",
                            manifest.display === mode.value
                              ? "border-primary bg-primary/5"
                              : "border-muted hover:border-primary/50",
                            pending
                              ? "pointer-events-none opacity-50"
                              : "cursor-pointer"
                          )}
                          aria-disabled={pending}
                          onClick={() => handleChange("display", mode.value)}
                        >
                          <div className="flex items-center gap-2">
                            {manifest.display === mode.value && (
                              <CheckCircle2 className="h-4 w-4 text-primary" />
                            )}
                            <span className="font-medium">{mode.label}</span>
                          </div>
                          <p className="text-xs text-muted-foreground mt-1">
                            {mode.description}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="orientation">Orientation</Label>
                    <Select
                      value={manifest.orientation || "any"}
                      onValueChange={(v) => handleChange("orientation", v)}
                      disabled={pending}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {ORIENTATIONS.map((o) => (
                          <SelectItem key={o.value} value={o.value}>
                            {o.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <Separator />

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="theme_color">{t("theme_color")}</Label>
                      {/* The swatch keeps its value while pending — an
                          `<input type="color">` cannot hold an empty string
                          (browsers coerce it to #000000, which is a different
                          lie), and it is a fixed 64x40 box either way. The hex
                          field beside it empties like every other text input. */}
                      <div className="flex gap-2">
                        <Input
                          type="color"
                          value={manifest.theme_color}
                          onChange={(e) => handleChange("theme_color", e.target.value)}
                          className="w-16 h-10 p-1 cursor-pointer"
                          disabled={pending}
                        />
                        <Input
                          value={pending ? "" : manifest.theme_color}
                          onChange={(e) => handleChange("theme_color", e.target.value)}
                          placeholder="#000000"
                          disabled={pending}
                        />
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Browser UI color (toolbar, status bar)
                      </p>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="background_color">{t("background_color")}</Label>
                      <div className="flex gap-2">
                        <Input
                          type="color"
                          value={manifest.background_color}
                          onChange={(e) =>
                            handleChange("background_color", e.target.value)
                          }
                          className="w-16 h-10 p-1 cursor-pointer"
                          disabled={pending}
                        />
                        <Input
                          value={pending ? "" : manifest.background_color}
                          onChange={(e) =>
                            handleChange("background_color", e.target.value)
                          }
                          placeholder="#ffffff"
                          disabled={pending}
                        />
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {t("splash_screen_background_color")}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Icons Tab - Updated with upload fields like platform settings */}
            <TabsContent value="icons" className="space-y-4 mt-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">{t("app_icons")}</CardTitle>
                  <CardDescription>
                    {t("upload_icons_for_different_device_sizes")}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                    {ICON_CONFIGS.map((config) => (
                      <IconUploadField
                        key={config.key}
                        config={config}
                        onUpload={() => setIconVersion(Date.now())}
                      />
                    ))}
                  </div>

                  <div className="mt-6 p-4 bg-muted/50 rounded-lg">
                    <h4 className="text-sm font-medium mb-2">{t("icon_requirements")}</h4>
                    <ul className="text-xs text-muted-foreground space-y-1">
                      <li>{t("use_square_png_or_webp_images")}</li>
                      <li>{t("the_512x512_icon_is_used_for")}</li>
                      <li>• Maskable icons should have important content within the safe zone (center 80%)</li>
                      <li>{t("icons_are_saved_to_img_logo")}</li>
                    </ul>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Screenshots Tab - Updated to require upload only */}
            <TabsContent value="screenshots" className="space-y-4 mt-4">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <div>
                    <CardTitle className="text-lg">Screenshots</CardTitle>
                    <CardDescription>
                      {t("upload_screenshots_shown_during_pwa_installation")}
                    </CardDescription>
                  </div>
                  <Button size="sm" onClick={addScreenshot} disabled={pending}>
                    <Plus className="h-4 w-4 mr-2" />
                    {t("add_screenshot")}
                  </Button>
                </CardHeader>
                <CardContent className="space-y-4">
                  <AnimatePresence mode="popLayout">
                    {(manifest.screenshots || []).map((screenshot, index) => (
                      <ScreenshotUploadCard
                        key={index}
                        screenshot={screenshot}
                        index={index}
                        onUpdate={(field, value) => updateScreenshot(index, field, value)}
                        onRemove={() => removeScreenshot(index)}
                        onUpload={(file) => handleScreenshotUpload(index, file)}
                      />
                    ))}
                  </AnimatePresence>

                  {/* Neither of these two is reachable while the manifest is in
                      flight — see `showNoScreenshots` above. A list whose
                      length is unknown reserves nothing, but it must not
                      announce a length it does not have. */}
                  {showNoScreenshots && (
                    <div className="text-center py-8 text-muted-foreground">
                      <Monitor className="h-12 w-12 mx-auto mb-3 opacity-50" />
                      <p>{t("no_screenshots_configured")}</p>
                      <p className="text-sm mt-1">
                        {t("screenshots_are_shown_during_pwa_installation")}
                      </p>
                      <Button
                        variant="outline"
                        size="sm"
                        className="mt-4"
                        onClick={addScreenshot}
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        {t("add_your_first_screenshot")}
                      </Button>
                    </div>
                  )}

                  {showScreenshotGuidelines && (
                    <div className="p-4 bg-muted/50 rounded-lg">
                      <h4 className="text-sm font-medium mb-2">{t("screenshot_guidelines")}</h4>
                      <ul className="text-xs text-muted-foreground space-y-1">
                        <li>{t("wide_screenshots_16_9_1280x720_or")}</li>
                        <li>{t("narrow_screenshots_9_16_720x1280_or")}</li>
                        <li>{t("add_labels_to_describe_each_screenshot")}</li>
                        <li>{t("include_at_least_one_wide_and")}</li>
                      </ul>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Shortcuts Tab */}
            <TabsContent value="shortcuts" className="space-y-4 mt-4">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <div>
                    <CardTitle className="text-lg">{t("app_shortcuts")}</CardTitle>
                    <CardDescription>
                      {t("quick_actions_accessible_from_app_icon")}
                    </CardDescription>
                  </div>
                  <Button size="sm" onClick={addShortcut} disabled={pending}>
                    <Plus className="h-4 w-4 mr-2" />
                    {t("add_shortcut")}
                  </Button>
                </CardHeader>
                <CardContent>
                  <AnimatePresence mode="popLayout">
                    {(manifest.shortcuts || []).map((shortcut, index) => (
                      <m.div
                        key={index}
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        className="p-4 border rounded-lg mb-3"
                      >
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                          <div>
                            <Label className="text-xs">Name</Label>
                            <Input
                              value={shortcut.name}
                              onChange={(e) =>
                                updateShortcut(index, "name", e.target.value)
                              }
                              placeholder={t("open_dashboard")}
                            />
                          </div>
                          <div>
                            <Label className="text-xs">{t("short_name")}</Label>
                            <Input
                              value={shortcut.short_name || ""}
                              onChange={(e) =>
                                updateShortcut(index, "short_name", e.target.value)
                              }
                              placeholder="Dashboard"
                            />
                          </div>
                          <div>
                            <Label className="text-xs">URL</Label>
                            <Input
                              value={shortcut.url}
                              onChange={(e) =>
                                updateShortcut(index, "url", e.target.value)
                              }
                              placeholder="/dashboard"
                            />
                          </div>
                        </div>
                        <div className="mt-3">
                          <Label className="text-xs">Description</Label>
                          <Input
                            value={shortcut.description || ""}
                            onChange={(e) =>
                              updateShortcut(index, "description", e.target.value)
                            }
                            placeholder={t("open_the_main_dashboard")}
                          />
                        </div>
                        <div className="mt-3 flex justify-end">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => removeShortcut(index)}
                            className="text-destructive hover:text-destructive"
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Remove
                          </Button>
                        </div>
                      </m.div>
                    ))}
                  </AnimatePresence>

                  {showNoShortcuts && (
                    <div className="text-center py-8 text-muted-foreground">
                      <Link className="h-12 w-12 mx-auto mb-3 opacity-50" />
                      <p>{t("no_shortcuts_configured")}</p>
                      <p className="text-sm">
                        {t("shortcuts_appear_when_long_pressing_the_app_icon")}
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Preview Card */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Eye className="h-4 w-4" />
                Preview
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {/* Mock Phone */}
                <div className="relative mx-auto w-48 h-96 bg-surface-2 rounded-3xl p-2 shadow-xl">
                  <div className="w-full h-full rounded-2xl overflow-hidden"
                    style={{ backgroundColor: manifest.background_color }}
                  >
                    {/* Status Bar */}
                    <div
                      className="h-6 flex items-center justify-between px-4 text-xs"
                      style={{
                        backgroundColor: manifest.theme_color,
                        color: isLightColor(manifest.theme_color) ? "#000" : "#fff",
                      }}
                    >
                      <span>9:41</span>
                      <span>100%</span>
                    </div>
                    {/* Content */}
                    <div className="flex flex-col items-center justify-center h-full pb-10">
                      <div className="w-16 h-16 bg-card/20 rounded-xl mb-4 flex items-center justify-center overflow-hidden">
                        <Image
                          key={iconVersion}
                          src={`/img/logo/android-icon-192x192.webp?v=${iconVersion}`}
                          alt={t("app_icon")}
                          width={48}
                          height={48}
                          className="object-contain"
                          unoptimized
                          onError={(e) => {
                            (e.target as HTMLImageElement).style.display = "none";
                          }}
                        />
                      </div>
                      {/* The mock phone is a fixed 192x384 frame and the icon
                          comes off `/img/logo`, not the manifest — so the only
                          part of this preview that waits is the app's name,
                          and it waits INSIDE the `text-sm font-medium` element
                          that will hold it. */}
                      <p
                        className="font-medium text-sm"
                        style={{
                          color: isLightColor(manifest.background_color)
                            ? "#000"
                            : "#fff",
                        }}
                      >
                        <Loadable loading={pending} placeholder={t("app_name")}>
                          {manifest.name}
                        </Loadable>
                      </p>
                    </div>
                  </div>
                </div>

                {/* Info */}
                <div className="space-y-2 text-sm">
                  {/* Four label/value rows. The labels are constants and the
                      icon count is `ICON_CONFIGS.length`, a module-level array —
                      knowable before the page mounts, so it never skeletons.
                      The three that come off the manifest do, in place. */}
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">{tCommon("display")}:</span>
                    <Badge variant="outline">
                      <Loadable
                        loading={pending}
                        placeholder="standalone"
                        radius="rounded-xs"
                      >
                        {manifest.display}
                      </Loadable>
                    </Badge>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">{t("icons")}:</span>
                    <span>{ICON_CONFIGS.length}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">{t("screenshots")}:</span>
                    <span className="font-mono tabular-nums">
                      <Loadable loading={pending} chars={1}>
                        {manifest.screenshots?.length || 0}
                      </Loadable>
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">{t("shortcuts")}:</span>
                    <span className="font-mono tabular-nums">
                      <Loadable loading={pending} chars={1}>
                        {manifest.shortcuts?.length || 0}
                      </Loadable>
                    </span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* JSON Preview */}
          <AnimatePresence>
            {showJsonPreview && (
              <m.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
              >
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <FileJson className="h-4 w-4" />
                      manifest.json
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <pre className="text-xs bg-muted p-4 rounded-lg overflow-auto max-h-96">
                      {JSON.stringify(
                        {
                          ...manifest,
                          icons: ICON_CONFIGS.map((c) => ({
                            src: `/img/logo/${c.file}`,
                            sizes: c.size,
                            type: "image/png",
                            ...(c.density && { density: c.density }),
                            ...(c.purpose && { purpose: c.purpose }),
                          })),
                        },
                        null,
                        2
                      )}
                    </pre>
                  </CardContent>
                </Card>
              </m.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}

// Helper function to determine if a color is light or dark
function isLightColor(color: string): boolean {
  const hex = color.replace("#", "");
  const r = parseInt(hex.substr(0, 2), 16);
  const g = parseInt(hex.substr(2, 2), 16);
  const b = parseInt(hex.substr(4, 2), 16);
  const brightness = (r * 299 + g * 587 + b * 114) / 1000;
  return brightness > 155;
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject("Error reading file");
    reader.readAsDataURL(file);
  });
}
