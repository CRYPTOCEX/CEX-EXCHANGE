"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
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
  const [isUploading, setIsUploading] = useState(false);
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [imageKey, setImageKey] = useState(Date.now());

  const imagePath = `/img/logo/${config.file}`;

  const handleFileSelect = async (file: File) => {
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      alert("Please select an image file");
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
        successMessage: `Icon ${config.size} updated successfully!`,
      });

      if (error) {
        throw new Error(typeof error === "string" ? error : JSON.stringify(error));
      }

      setUploadSuccess(true);
      setImageKey(Date.now());
      onUpload();
      setTimeout(() => setUploadSuccess(false), 2000);
    } catch (error: any) {
      alert(`Failed to upload icon: ${error?.message}`);
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

      <motion.div
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
          <motion.div
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
                alt={`Icon ${config.size}`}
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
                <motion.div
                  initial={{ scale: 0, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0, opacity: 0 }}
                  className="absolute -bottom-1 -right-1 w-5 h-5 bg-emerald-500 text-white rounded-full flex items-center justify-center shadow-lg z-10"
                >
                  <Check className="h-3 w-3" />
                </motion.div>
              )}
            </AnimatePresence>

            {isUploading && (
              <div className="absolute inset-0 flex items-center justify-center bg-background/80 rounded-lg">
                <Loader2 className="h-5 w-5 animate-spin text-primary" />
              </div>
            )}
          </motion.div>
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
      </motion.div>
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
    <motion.div
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
              <p className="text-xs text-muted-foreground">Click or drag</p>
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
            <Label className="text-xs">Form Factor</Label>
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
              placeholder="e.g., Dashboard"
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
    </motion.div>
  );
}

export function PwaManager() {
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
          title: "Error",
          description: error.message || "Failed to load PWA manifest",
          variant: "destructive",
        });
      } else {
        setManifest({ ...DEFAULT_MANIFEST, ...data.manifest });
        setHasChanges(false);
      }
    } catch (err) {
      toast({
        title: "Error",
        description: "Failed to load PWA manifest",
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
          title: "Error",
          description: error.message || "Failed to save PWA manifest",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Success",
          description: "PWA manifest saved successfully",
        });
        setHasChanges(false);
      }
    } catch (err) {
      toast({
        title: "Error",
        description: "Failed to save PWA manifest",
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
            title: "Error",
            description: error.message || "Failed to upload screenshot",
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
            title: "Success",
            description: "Screenshot uploaded successfully",
          });
        }
      } catch (err) {
        toast({
          title: "Error",
          description: "Failed to upload screenshot",
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

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <Smartphone className="h-5 w-5 text-primary" />
            PWA Manifest Manager
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            Configure your Progressive Web App settings, icons, and features
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowJsonPreview(!showJsonPreview)}
          >
            <FileJson className="h-4 w-4 mr-2" />
            {showJsonPreview ? "Hide" : "Show"} JSON
          </Button>
          <Button variant="outline" size="sm" onClick={fetchManifest}>
            <RefreshCw className="h-4 w-4 mr-2" />
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
            Save Changes
          </Button>
        </div>
      </div>

      {hasChanges && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-2 p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-lg"
        >
          <AlertCircle className="h-4 w-4 text-yellow-500" />
          <span className="text-sm text-yellow-500">
            You have unsaved changes
          </span>
        </motion.div>
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
                  <CardTitle className="text-lg">App Identity</CardTitle>
                  <CardDescription>
                    Basic information about your PWA (defaults from environment variables)
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="name">App Name</Label>
                      <Input
                        id="name"
                        value={manifest.name}
                        onChange={(e) => handleChange("name", e.target.value)}
                        placeholder="My Awesome App"
                      />
                      <p className="text-xs text-muted-foreground">
                        Full name displayed in app stores and install prompts
                      </p>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="short_name">Short Name</Label>
                      <Input
                        id="short_name"
                        value={manifest.short_name}
                        onChange={(e) => handleChange("short_name", e.target.value)}
                        placeholder="App"
                        maxLength={12}
                      />
                      <p className="text-xs text-muted-foreground">
                        Used on home screen (max 12 chars)
                      </p>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="description">Description</Label>
                    <Textarea
                      id="description"
                      value={manifest.description || ""}
                      onChange={(e) => handleChange("description", e.target.value)}
                      placeholder="A brief description of your app..."
                      rows={3}
                    />
                  </div>

                  <Separator />

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="start_url">Start URL</Label>
                      <Input
                        id="start_url"
                        value={manifest.start_url}
                        onChange={(e) => handleChange("start_url", e.target.value)}
                        placeholder="/"
                      />
                      <p className="text-xs text-muted-foreground">
                        URL that loads when app launches
                      </p>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="scope">Scope</Label>
                      <Input
                        id="scope"
                        value={manifest.scope || ""}
                        onChange={(e) => handleChange("scope", e.target.value)}
                        placeholder="/"
                      />
                      <p className="text-xs text-muted-foreground">
                        Navigation scope of the app
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="lang">Language</Label>
                      <Input
                        id="lang"
                        value={manifest.lang || ""}
                        onChange={(e) => handleChange("lang", e.target.value)}
                        placeholder="en"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="dir">Text Direction</Label>
                      <Select
                        value={manifest.dir || "ltr"}
                        onValueChange={(v) => handleChange("dir", v)}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="ltr">Left to Right</SelectItem>
                          <SelectItem value="rtl">Right to Left</SelectItem>
                          <SelectItem value="auto">Auto</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="id">App ID</Label>
                    <Input
                      id="id"
                      value={manifest.id || ""}
                      onChange={(e) => handleChange("id", e.target.value)}
                      placeholder="/?source=pwa"
                    />
                    <p className="text-xs text-muted-foreground">
                      Unique identifier for your PWA (helps with updates)
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label>Categories</Label>
                    <p className="text-xs text-muted-foreground mb-2">
                      Select categories relevant to cryptocurrency and trading platforms
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {CATEGORIES.map((cat) => (
                        <Badge
                          key={cat}
                          variant={
                            manifest.categories?.includes(cat)
                              ? "default"
                              : "outline"
                          }
                          className="cursor-pointer capitalize"
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
                  <CardTitle className="text-lg">Display Settings</CardTitle>
                  <CardDescription>
                    Control how your PWA appears when installed
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label>Display Mode</Label>
                    <div className="grid grid-cols-2 gap-3">
                      {DISPLAY_MODES.map((mode) => (
                        <div
                          key={mode.value}
                          className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
                            manifest.display === mode.value
                              ? "border-primary bg-primary/5"
                              : "border-muted hover:border-primary/50"
                          }`}
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
                      <Label htmlFor="theme_color">Theme Color</Label>
                      <div className="flex gap-2">
                        <Input
                          type="color"
                          value={manifest.theme_color}
                          onChange={(e) => handleChange("theme_color", e.target.value)}
                          className="w-16 h-10 p-1 cursor-pointer"
                        />
                        <Input
                          value={manifest.theme_color}
                          onChange={(e) => handleChange("theme_color", e.target.value)}
                          placeholder="#000000"
                        />
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Browser UI color (toolbar, status bar)
                      </p>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="background_color">Background Color</Label>
                      <div className="flex gap-2">
                        <Input
                          type="color"
                          value={manifest.background_color}
                          onChange={(e) =>
                            handleChange("background_color", e.target.value)
                          }
                          className="w-16 h-10 p-1 cursor-pointer"
                        />
                        <Input
                          value={manifest.background_color}
                          onChange={(e) =>
                            handleChange("background_color", e.target.value)
                          }
                          placeholder="#ffffff"
                        />
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Splash screen background color
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
                  <CardTitle className="text-lg">App Icons</CardTitle>
                  <CardDescription>
                    Upload icons for different device sizes. Click on any icon to upload a new one.
                    Icons are automatically resized for PWA compatibility.
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
                    <h4 className="text-sm font-medium mb-2">Icon Requirements</h4>
                    <ul className="text-xs text-muted-foreground space-y-1">
                      <li>• Use square PNG or WebP images with transparent backgrounds</li>
                      <li>• The 512x512 icon is used for splash screens and app stores</li>
                      <li>• Maskable icons should have important content within the safe zone (center 80%)</li>
                      <li>• Icons are saved to /img/logo/ and referenced in the manifest</li>
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
                      Upload screenshots shown during PWA installation. Use high-quality images.
                    </CardDescription>
                  </div>
                  <Button size="sm" onClick={addScreenshot}>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Screenshot
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

                  {(manifest.screenshots || []).length === 0 && (
                    <div className="text-center py-8 text-muted-foreground">
                      <Monitor className="h-12 w-12 mx-auto mb-3 opacity-50" />
                      <p>No screenshots configured</p>
                      <p className="text-sm mt-1">
                        Screenshots are shown during PWA installation to preview your app
                      </p>
                      <Button
                        variant="outline"
                        size="sm"
                        className="mt-4"
                        onClick={addScreenshot}
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        Add Your First Screenshot
                      </Button>
                    </div>
                  )}

                  {(manifest.screenshots || []).length > 0 && (
                    <div className="p-4 bg-muted/50 rounded-lg">
                      <h4 className="text-sm font-medium mb-2">Screenshot Guidelines</h4>
                      <ul className="text-xs text-muted-foreground space-y-1">
                        <li>• Wide screenshots (16:9): 1280x720 or larger for desktop</li>
                        <li>• Narrow screenshots (9:16): 720x1280 or larger for mobile</li>
                        <li>• Add labels to describe each screenshot</li>
                        <li>• Include at least one wide and one narrow screenshot for best results</li>
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
                    <CardTitle className="text-lg">App Shortcuts</CardTitle>
                    <CardDescription>
                      Quick actions accessible from app icon context menu
                    </CardDescription>
                  </div>
                  <Button size="sm" onClick={addShortcut}>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Shortcut
                  </Button>
                </CardHeader>
                <CardContent>
                  <AnimatePresence mode="popLayout">
                    {(manifest.shortcuts || []).map((shortcut, index) => (
                      <motion.div
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
                              placeholder="Open Dashboard"
                            />
                          </div>
                          <div>
                            <Label className="text-xs">Short Name</Label>
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
                            placeholder="Open the main dashboard"
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
                      </motion.div>
                    ))}
                  </AnimatePresence>

                  {(manifest.shortcuts || []).length === 0 && (
                    <div className="text-center py-8 text-muted-foreground">
                      <Link className="h-12 w-12 mx-auto mb-3 opacity-50" />
                      <p>No shortcuts configured</p>
                      <p className="text-sm">
                        Shortcuts appear when long-pressing the app icon
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
                <div className="relative mx-auto w-48 h-96 bg-gray-900 rounded-3xl p-2 shadow-xl">
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
                      <div className="w-16 h-16 bg-white/20 rounded-xl mb-4 flex items-center justify-center overflow-hidden">
                        <Image
                          key={iconVersion}
                          src={`/img/logo/android-icon-192x192.webp?v=${iconVersion}`}
                          alt="App Icon"
                          width={48}
                          height={48}
                          className="object-contain"
                          unoptimized
                          onError={(e) => {
                            (e.target as HTMLImageElement).style.display = "none";
                          }}
                        />
                      </div>
                      <p
                        className="font-medium text-sm"
                        style={{
                          color: isLightColor(manifest.background_color)
                            ? "#000"
                            : "#fff",
                        }}
                      >
                        {manifest.name}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Info */}
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Display:</span>
                    <Badge variant="outline">{manifest.display}</Badge>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Icons:</span>
                    <span>{ICON_CONFIGS.length}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Screenshots:</span>
                    <span>{manifest.screenshots?.length || 0}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Shortcuts:</span>
                    <span>{manifest.shortcuts?.length || 0}</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* JSON Preview */}
          <AnimatePresence>
            {showJsonPreview && (
              <motion.div
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
              </motion.div>
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
