"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter, Link as RouterLink } from "@/i18n/routing";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from "@/components/ui/form";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Loadable, SkeletonBlock } from "@/components/ui/skeleton";
import {
  Upload,
  ArrowLeft,
  Sparkles,
  Image as ImageIcon,
  Package,
  Settings,
  CheckCircle,
  Palette,
  Layers,
  DollarSign,
  Shield,
  Globe,
  Info,
  ChevronRight,
  FileText,
  Coins,
  Eye
} from "lucide-react";
import Image from "next/image";
import { useUserStore } from "@/store/user";
import { useKycGate } from "@/hooks/use-kyc-gate";
import KycRequiredNotice from "@/components/blocks/kyc/kyc-required-notice";
import { useNftStore } from "@/store/nft/nft-store";
import { $fetch } from "@/lib/api";
import { imageUploader } from "@/utils/upload";
import { toast } from "sonner";
import {
  ChainIcon,
  CurrencyIcon,
  chainNativeCurrency,
} from "@/app/[locale]/(ext)/nft/components/shared/chain-icon";
import { useTranslations } from "next-intl";

interface SupportedChain {
  chain: string;
  network: string;
  currency: string;
  name: string;
  icon: string;
}

const TOKEN_STANDARDS = [
  {
    value: "ERC721",
    label: "ERC-721",
    description: "Each token is unique (best for 1/1 NFTs)",
    icon: Palette
  },
  {
    value: "ERC1155",
    label: "ERC-1155",
    description: "Multi-edition support (best for editions)",
    icon: Layers
  },
];

const collectionSchema = z.object({
  name: z.string().min(1, "Collection name is required").max(255),
  symbol: z.string().min(1, "Symbol is required").max(10).toUpperCase(),
  description: z.string().max(1000).optional(),
  categoryId: z.string().min(1, "Category is required"),
  chain: z.string().min(1, "Blockchain is required"),
  network: z.string().min(1, "Network is required"),
  standard: z.enum(["ERC721", "ERC1155"]),
  maxSupply: z.number().min(1).optional(),
  mintPrice: z.number().min(0).optional(),
  royaltyPercentage: z.number().min(0).max(50).default(2.5),
  isPublic: z.boolean().default(true),
});

type CollectionFormData = z.infer<typeof collectionSchema>;

export default function CreateCollectionClient() {
  const t = useTranslations("ext_nft");
  const tCommon = useTranslations("common");
  const tExt = useTranslations("ext");
  const router = useRouter();
  const { user } = useUserStore();
  const gate = useKycGate("create_nft");
  const { categories, fetchCategories } = useNftStore();

  const [logoImage, setLogoImage] = useState<string>("");
  const [bannerImage, setBannerImage] = useState<string>("");
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [uploadingBanner, setUploadingBanner] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);
  const [dragActiveLogo, setDragActiveLogo] = useState(false);
  const [dragActiveBanner, setDragActiveBanner] = useState(false);
  const [supportedChains, setSupportedChains] = useState<SupportedChain[]>([]);
  const [loadingChains, setLoadingChains] = useState(true);
  const logoInputRef = useRef<HTMLInputElement>(null);
  const bannerInputRef = useRef<HTMLInputElement>(null);

  /*
    "No blockchains configured yet. Please contact support" is a hard,
    actionable claim, and it becomes true for the whole of the chain request
    the moment the picker renders during load — `supportedChains` starts `[]`.
    Naming the predicate makes the `!loadingChains` half deliberate instead of
    something that reads like it could be dropped.
  */
  const showNoChains = !loadingChains && supportedChains.length === 0;

  /*
    The tiles to paint. Three because the grid is `md:grid-cols-3`, so three
    stand-ins fill exactly one row at the breakpoint where this step is
    normally used — reserving the container, which is what SKELETONS.md asks
    for on a list of unknowable length, without inventing a second or third
    row that would then collapse.
  */
  const chainTiles: (SupportedChain | null)[] = loadingChains
    ? [null, null, null]
    : supportedChains;

  const form = useForm<z.input<typeof collectionSchema>, any, z.output<typeof collectionSchema>>({
    // @ts-ignore - Complex Zod type inference causing build issues
    resolver: zodResolver(collectionSchema),
    defaultValues: {
      name: "",
      symbol: "",
      description: "",
      categoryId: "",
      chain: "",
      network: "mainnet",
      standard: "ERC721",
      maxSupply: undefined,
      mintPrice: undefined,
      royaltyPercentage: 2.5,
      isPublic: true,
    },
  });

  useEffect(() => {
    if (user) {
      fetchCategories();
    }
  }, [user, fetchCategories]);

  useEffect(() => {
    // Fetch supported blockchains from API
    const fetchSupportedChains = async () => {
      setLoadingChains(true);
      try {
        const { data, error } = await $fetch({
          url: "/api/nft/chains",
          method: "GET",
          silent: true,
        });

        if (!error && data) {
          // Check if data has a nested data property (API response format)
          const chains = Array.isArray(data) ? data : (data.data || []);
          setSupportedChains(chains);
        } else {
          console.error("Failed to fetch supported chains:", error);
          // Fallback to empty array if fetch fails
          setSupportedChains([]);
        }
      } catch (error) {
        console.error("Error fetching chains:", error);
        setSupportedChains([]);
      } finally {
        setLoadingChains(false);
      }
    };

    fetchSupportedChains();
  }, []);

  const handleLogoUpload = async (file: File) => {
    if (!file.type.startsWith("image/")) {
      toast.error(tExt("please_upload_an_image_file"));
      return;
    }

    setUploadingLogo(true);
    try {
      const result = await imageUploader({
        file,
        dir: "collections/logos",
        size: { maxWidth: 512, maxHeight: 512 },
      });

      if (result.success) {
        setLogoImage(result.url);
        toast.success(t("logo_uploaded_successfully"));
      } else {
        toast.error(t("failed_to_upload_logo"));
      }
    } catch (error) {
      toast.error(t("error_uploading_logo"));
    } finally {
      setUploadingLogo(false);
    }
  };

  const handleBannerUpload = async (file: File) => {
    if (!file.type.startsWith("image/")) {
      toast.error(tExt("please_upload_an_image_file"));
      return;
    }

    setUploadingBanner(true);
    try {
      const result = await imageUploader({
        file,
        dir: "collections/banners",
        size: { maxWidth: 1920, maxHeight: 400 },
      });

      if (result.success) {
        setBannerImage(result.url);
        toast.success(t("banner_uploaded_successfully"));
      } else {
        toast.error(t("failed_to_upload_banner"));
      }
    } catch (error) {
      toast.error(t("error_uploading_banner"));
    } finally {
      setUploadingBanner(false);
    }
  };

  const handleDrag = (e: React.DragEvent, type: 'logo' | 'banner') => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      if (type === 'logo') setDragActiveLogo(true);
      else setDragActiveBanner(true);
    } else if (e.type === "dragleave") {
      if (type === 'logo') setDragActiveLogo(false);
      else setDragActiveBanner(false);
    }
  };

  const handleDrop = (e: React.DragEvent, type: 'logo' | 'banner') => {
    e.preventDefault();
    e.stopPropagation();
    if (type === 'logo') setDragActiveLogo(false);
    else setDragActiveBanner(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      if (type === 'logo') {
        handleLogoUpload(e.dataTransfer.files[0]);
      } else {
        handleBannerUpload(e.dataTransfer.files[0]);
      }
    }
  };

  const onSubmit = async (data: CollectionFormData) => {
    if (!logoImage) {
      toast.error(t("please_upload_a_logo_image"));
      setCurrentStep(1);
      return;
    }

    setIsSubmitting(true);

    try {
      const { data: result, error } = await $fetch({
        url: "/api/nft/collection",
        method: "POST",
        body: {
          ...data,
          logoImage,
          bannerImage,
          /*
            THE CHAIN'S OWN COIN, NOT A LITERAL "ETH".

            This posted `currency: "ETH"` for every collection on every chain,
            while the form's own summary two screens up renders
            `chainNativeCurrency(form.watch("chain"))` — so a creator who picked
            BSC was shown "BNB" and sent "ETH". The chain field is required
            (`chain: z.string().min(1)`), so there was always a real answer
            available.

            This is not a display defect. `nft/collection/index.post.ts:185,330`
            PERSISTS the client's value, and that currency then labels the
            collection's floor price, its volume and every listing under it. A
            Polygon collection stored as ETH mislabels every figure it ever
            carries, and no later fix to a component can recover it — the row is
            wrong.
          */
          currency: chainNativeCurrency(data.chain),
        },
      });

      if (error) {
        toast.error(error);
        return;
      }

      toast.success(t("collection_created_successfully"));
      router.push("/nft/creator");
    } catch (error) {
      toast.error(t("failed_to_create_collection"));
    } finally {
      setIsSubmitting(false);
    }
  };

  const calculateProgress = useCallback(() => {
    let completed = 0;

    // Step 1: Images uploaded
    if (logoImage) completed += 25;

    // Step 2: Basic info filled
    if (form.watch("name") && form.watch("symbol") && form.watch("categoryId")) completed += 25;

    // Step 3: Blockchain selected
    if (form.watch("chain")) completed += 25;

    // Step 4: All steps completed (ready to submit)
    if (logoImage && form.watch("name") && form.watch("symbol") && form.watch("categoryId") && form.watch("chain")) completed += 25;

    return completed;
  }, [logoImage, form]);

  const progress = calculateProgress();

  const canProceedToStep = (step: number): boolean => {
    switch (step) {
      case 1:
        return true;
      case 2:
        return !!logoImage;
      case 3:
        return !!logoImage && !!form.watch("name") && !!form.watch("symbol");
      case 4:
        return !!logoImage && !!form.watch("name") && !!form.watch("symbol") && !!form.watch("categoryId") && !!form.watch("chain");
      default:
        return false;
    }
  };

  const goToStep = (step: number) => {
    if (canProceedToStep(step)) {
      setCurrentStep(step);
    }
  };

  // Creating a collection is the `create_nft` action, so the gate covers the
  // whole builder. The page has no sign-in prompt of its own, so "anonymous"
  // renders nothing rather than a KYC notice.
  if (gate.state === "loading" || gate.state === "anonymous") {
    return null;
  }
  if (!gate.allowed) {
    return (
      <KycRequiredNotice
        feature="create_nft"
        requirement={gate.requirement ?? "verification"}
      />
    );
  }

  return (
    <div className="min-h-screen bg-linear-to-br from-background via-background to-muted/20">
      {/* Hero Header */}
      <div className={`relative overflow-hidden bg-primary/10 border-b`}>
        <div className="absolute inset-0 bg-grid-white/[0.02] bg-[size:60px_60px]" />
        <div className="relative container py-16">
          {/* Centered Content */}
          <div className="text-center max-w-3xl mx-auto">
            <div className={`inline-flex items-center gap-2 text-primary-ink mb-4`}>
              <Package className="h-6 w-6 text-primary" />
              <span className="text-sm font-medium uppercase tracking-wider">{t("create_collection")}</span>
            </div>

            <h1 className="text-4xl md:text-6xl font-bold mb-6 text-foreground">
              {t("launch_your_nft_collection")}
            </h1>

            <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
              {t("create_a_stunning_collection_to_organize")}
            </p>

            {/* Progress Indicator */}
            <div className="max-w-md mx-auto">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">Progress</span>
                <span className="text-sm text-muted-foreground">
                  {Math.round(progress)}% Complete
                </span>
              </div>
              <Progress value={progress} className="h-2" />
              <div className="flex justify-between mt-2 text-xs text-muted-foreground">
                <span className={logoImage ? "text-success" : ""}>
                  {logoImage ? "✓" : "○"} Images
                </span>
                <span className={form.watch("name") && form.watch("symbol") && form.watch("categoryId") ? "text-success" : ""}>
                  {form.watch("name") && form.watch("symbol") && form.watch("categoryId") ? "✓" : "○"} Info
                </span>
                <span className={form.watch("chain") ? "text-success" : ""}>
                  {form.watch("chain") ? "✓" : "○"} Chain
                </span>
                <span>{t("settings")}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="container py-12">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
            <Tabs value={`step-${currentStep}`} className="w-full">
              <TabsList className="grid w-full grid-cols-4 mb-8">
                <TabsTrigger
                  value="step-1"
                  onClick={() => goToStep(1)}
                  className="flex items-center gap-2"
                  disabled={!canProceedToStep(1)}
                >
                  <ImageIcon className="h-4 w-4" />
                  <span className="hidden sm:inline">Images</span>
                  {logoImage && <CheckCircle className="h-3 w-3 text-success" />}
                </TabsTrigger>
                <TabsTrigger
                  value="step-2"
                  onClick={() => goToStep(2)}
                  className="flex items-center gap-2"
                  disabled={!canProceedToStep(2)}
                >
                  <FileText className="h-4 w-4" />
                  <span className="hidden sm:inline">Details</span>
                  {form.watch("name") && form.watch("symbol") && <CheckCircle className="h-3 w-3 text-success" />}
                </TabsTrigger>
                <TabsTrigger
                  value="step-3"
                  onClick={() => goToStep(3)}
                  className="flex items-center gap-2"
                  disabled={!canProceedToStep(3)}
                >
                  <Globe className="h-4 w-4" />
                  <span className="hidden sm:inline">Blockchain</span>
                  {form.watch("chain") && <CheckCircle className="h-3 w-3 text-success" />}
                </TabsTrigger>
                <TabsTrigger
                  value="step-4"
                  onClick={() => goToStep(4)}
                  className="flex items-center gap-2"
                  disabled={!canProceedToStep(4)}
                >
                  <Settings className="h-4 w-4" />
                  <span className="hidden sm:inline">Configure</span>
                </TabsTrigger>
              </TabsList>

              {/* Step 1: Upload Images */}
              <TabsContent value="step-1" className="space-y-6">
                <Card className="border-2 hover:border-primary/50 transition-all">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <ImageIcon className="h-5 w-5 text-primary" />
                      {t("collection_images")}
                    </CardTitle>
                    <CardDescription>
                      {t("upload_a_logo_and_banner_to")}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    {/* Logo Upload */}
                    <div>
                      <FormLabel className="text-base font-semibold mb-3 block">
                        {t("logo_image")} *
                      </FormLabel>
                      <div
                        className={`relative border-2 border-dashed rounded-xl transition-all ${
                          dragActiveLogo
                            ? "border-primary bg-primary/5"
                            : logoImage
                            ? "border-success"
                            : "border-border hover:border-primary/50"
                        } ${uploadingLogo ? "opacity-50" : ""}`}
                        onDragEnter={(e) => handleDrag(e, 'logo')}
                        onDragLeave={(e) => handleDrag(e, 'logo')}
                        onDragOver={(e) => handleDrag(e, 'logo')}
                        onDrop={(e) => handleDrop(e, 'logo')}
                      >
                        <input
                          ref={logoInputRef}
                          type="file"
                          accept="image/*"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) handleLogoUpload(file);
                          }}
                          className="hidden"
                        />

                        {logoImage ? (
                          <div className="aspect-square max-w-xs mx-auto p-6">
                            <div className="relative w-full h-full rounded-lg overflow-hidden">
                              <Image
                                src={logoImage}
                                alt={tExt("collection_logo")}
                                fill
                                className="object-cover"
                              />
                              <div className="absolute inset-0 bg-overlay/50 opacity-0 hover:opacity-100 transition-opacity flex items-center justify-center">
                                <Button
                                  type="button"
                                  variant="secondary"
                                  size="sm"
                                  onClick={() => logoInputRef.current?.click()}
                                >
                                  {t("change_logo")}
                                </Button>
                              </div>
                            </div>
                          </div>
                        ) : (
                          <div
                            className="aspect-square max-w-xs mx-auto p-12 cursor-pointer"
                            onClick={() => logoInputRef.current?.click()}
                          >
                            <div className="flex flex-col items-center justify-center h-full text-center space-y-4">
                              <div className="p-6 bg-primary/10 rounded-full">
                                <Upload className="h-12 w-12 text-primary" />
                              </div>
                              <div>
                                <p className="text-lg font-semibold mb-2">
                                  {uploadingLogo ? `${tCommon("uploading")}…` : tCommon("upload_logo")}
                                </p>
                                <p className="text-sm text-muted-foreground">
                                  {t("drag_drop_or_click_to_browse")}
                                </p>
                                <p className="text-xs text-muted-foreground mt-2">
                                  {t("recommended_512x512px_png_jpg")}
                                </p>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Banner Upload */}
                    <div>
                      <FormLabel className="text-base font-semibold mb-3 block">
                        Banner Image (Optional)
                      </FormLabel>
                      <div
                        className={`relative border-2 border-dashed rounded-xl transition-all ${
                          dragActiveBanner
                            ? "border-primary bg-primary/5"
                            : bannerImage
                            ? "border-success"
                            : "border-border hover:border-primary/50"
                        } ${uploadingBanner ? "opacity-50" : ""}`}
                        onDragEnter={(e) => handleDrag(e, 'banner')}
                        onDragLeave={(e) => handleDrag(e, 'banner')}
                        onDragOver={(e) => handleDrag(e, 'banner')}
                        onDrop={(e) => handleDrop(e, 'banner')}
                      >
                        <input
                          ref={bannerInputRef}
                          type="file"
                          accept="image/*"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) handleBannerUpload(file);
                          }}
                          className="hidden"
                        />

                        {bannerImage ? (
                          <div className="aspect-[4/1] max-w-full p-6">
                            <div className="relative w-full h-full rounded-lg overflow-hidden">
                              <Image
                                src={bannerImage}
                                alt={tExt("collection_banner")}
                                fill
                                className="object-cover"
                              />
                              <div className="absolute inset-0 bg-overlay/50 opacity-0 hover:opacity-100 transition-opacity flex items-center justify-center">
                                <Button
                                  type="button"
                                  variant="secondary"
                                  size="sm"
                                  onClick={() => bannerInputRef.current?.click()}
                                >
                                  {t("change_banner")}
                                </Button>
                              </div>
                            </div>
                          </div>
                        ) : (
                          <div
                            className="aspect-[4/1] max-w-full p-12 cursor-pointer"
                            onClick={() => bannerInputRef.current?.click()}
                          >
                            <div className="flex flex-col items-center justify-center h-full text-center space-y-4">
                              <div className="p-6 bg-primary/10 rounded-full">
                                <ImageIcon className="h-12 w-12 text-primary" />
                              </div>
                              <div>
                                <p className="text-lg font-semibold mb-2">
                                  {uploadingBanner ? `${tCommon("uploading")}…` : t("upload_banner")}
                                </p>
                                <p className="text-sm text-muted-foreground">
                                  {t("drag_drop_or_click_to_browse")}
                                </p>
                                <p className="text-xs text-muted-foreground mt-2">
                                  {t("recommended_1920x400px_png_jpg")}
                                </p>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <div className="flex justify-end">
                  <Button
                    type="button"
                    onClick={() => goToStep(2)}
                    disabled={!canProceedToStep(2)}
                    size="lg"
                    className={`bg-primary text-primary-foreground`}
                  >
                    Continue
                    <ChevronRight className="h-4 w-4 ml-2" />
                  </Button>
                </div>
              </TabsContent>

              {/* Step 2: Collection Details */}
              <TabsContent value="step-2" className="space-y-6">
                <Card className="border-2">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <FileText className="h-5 w-5 text-primary" />
                      {tExt("collection_information")}
                    </CardTitle>
                    <CardDescription>
                      {t("provide_basic_information_about_your_collection")}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <FormField
                      control={form.control}
                      name="name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-base">{tExt("collection_name")} *</FormLabel>
                          <FormControl>
                            <Input
                              placeholder={"e.g." + ", " + t("awesome_art_collection")}
                              className="text-base"
                              {...field}
                            />
                          </FormControl>
                          <FormDescription>
                            {t("choose_a_unique_and_memorable_name")}
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="symbol"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-base">{tCommon("symbol")} *</FormLabel>
                          <FormControl>
                            <Input
                              placeholder={"e.g." + ", " + t("aac")}
                              className="text-base uppercase"
                              maxLength={10}
                              {...field}
                              onChange={(e) => field.onChange(e.target.value.toUpperCase())}
                            />
                          </FormControl>
                          <FormDescription>
                            A short identifier (2-10 characters, automatically uppercase)
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="description"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-base">Description</FormLabel>
                          <FormControl>
                            <Textarea
                              placeholder={`${t("describe_your_collection_its_theme_and")}…`}
                              className="min-h-32 text-base"
                              {...field}
                            />
                          </FormControl>
                          <FormDescription>
                            {t("help_collectors_understand_what_your_collection")}
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="categoryId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-base">{tCommon("category")} *</FormLabel>
                          <Select
                            value={field.value}
                            onValueChange={field.onChange}
                          >
                            <FormControl>
                              <SelectTrigger className="text-base">
                                <SelectValue placeholder={tCommon("select_a_category")} />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {Array.isArray(categories) && categories.map((category: any) => (
                                <SelectItem key={category.id} value={category.id}>
                                  {category.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormDescription>
                            {t("choose_the_category_that_best_represents")}
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </CardContent>
                </Card>

                <div className="flex justify-between">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => goToStep(1)}
                    size="lg"
                  >
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    Back
                  </Button>
                  <Button
                    type="button"
                    onClick={() => goToStep(3)}
                    disabled={!canProceedToStep(3)}
                    size="lg"
                    className={`bg-primary hover:bg-primary text-primary-foreground`}
                  >
                    Continue
                    <ChevronRight className="h-4 w-4 ml-2" />
                  </Button>
                </div>
              </TabsContent>

              {/* Step 3: Blockchain Selection */}
              <TabsContent value="step-3" className="space-y-6">
                <Card className="border-2">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Globe className="h-5 w-5 text-primary" />
                      {tExt("blockchain_configuration")}
                    </CardTitle>
                    <CardDescription>
                      {t("choose_the_blockchain_where_your_collection")}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <FormField
                      control={form.control}
                      name="chain"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-base">{tExt("blockchain")} *</FormLabel>
                          {/*
                            The chain picker is a 3-column grid of ~168px
                            tiles. The old pending state was a 32px ring in a
                            `py-12` box — about 128px tall against a row of
                            tiles nearer 170px, and one column wide against
                            three — so the step's "Blockchain Choice" note and
                            the Token Standard field below it both jumped when
                            the chains arrived, in the middle of a wizard the
                            user is reading top-to-bottom.

                            The tiles render from the start now: their frame,
                            padding and border are constants, and each tile
                            waits only on its icon, name and network. A `null`
                            entry IS a pending tile, which keeps this one grid
                            rather than a second copy to maintain.
                          */}
                          {showNoChains ? (
                            <div className="text-center py-12 border-2 border-dashed rounded-xl">
                              <p className="text-muted-foreground">{t("no_blockchains_configured_yet")}</p>
                              <p className="text-sm text-muted-foreground mt-2">
                                {t("please_contact_support_to_enable_blockchain")}
                              </p>
                            </div>
                          ) : (
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-2">
                              {chainTiles.map((chain, i) => (
                                <div
                                  key={chain?.chain ?? `pending-${i}`}
                                  className={`relative p-6 border-2 rounded-xl transition-all ${
                                    chain ? "cursor-pointer" : "cursor-default"
                                  } ${
                                    chain && field.value === chain.chain
                                      ? "border-primary bg-primary/5 shadow-lg"
                                      : "border-border hover:border-primary/50"
                                  }`}
                                  onClick={() => {
                                    // A pending tile is not selectable — there
                                    // is no chain id to write into the form.
                                    if (!chain) return;
                                    field.onChange(chain.chain);
                                    form.setValue("network", chain.network);
                                  }}
                                >
                                  <div className="text-center">
                                    {/* The API only carries an icon for chains it
                                        knows; the old fallback hid the image
                                        entirely, leaving a blank tile. */}
                                    <div className="mb-3 flex justify-center">
                                      {chain ? (
                                        <ChainIcon chain={chain.chain} size={48} className="w-12 h-12" />
                                      ) : (
                                        // Same `w-12 h-12` the real mark
                                        // carries — a block with no text
                                        // metrics has to be told its size.
                                        <SkeletonBlock className="w-12 h-12 rounded-full" />
                                      )}
                                    </div>
                                    <h3 className="font-semibold text-lg mb-1">
                                      <Loadable loading={!chain} placeholder="Ethereum">
                                        {chain?.name}
                                      </Loadable>
                                    </h3>
                                    <p className="text-sm text-muted-foreground capitalize">
                                      <Loadable loading={!chain} placeholder="mainnet">
                                        {chain?.network}
                                      </Loadable>
                                    </p>
                                  </div>
                                  {chain && field.value === chain.chain && (
                                    <div className="absolute top-2 right-2">
                                      <div className="bg-primary text-primary-foreground rounded-full p-1">
                                        <CheckCircle className="h-4 w-4" />
                                      </div>
                                    </div>
                                  )}
                                </div>
                              ))}
                            </div>
                          )}
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <div className="bg-primary/5 dark:bg-primary/20 border border-primary/20 dark:border-primary/50 rounded-lg p-4">
                      <div className="flex gap-3">
                        <Info className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                        <div className="text-sm">
                          <p className="font-medium text-primary mb-1">
                            {t("blockchain_choice")}
                          </p>
                          <p className="text-primary">
                            {t("this_determines_which_network_your_collection")}
                          </p>
                        </div>
                      </div>
                    </div>

                    <FormField
                      control={form.control}
                      name="standard"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-base">{tExt("token_standard")} *</FormLabel>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
                            {TOKEN_STANDARDS.map((standard) => {
                              const Icon = standard.icon;
                              return (
                                <div
                                  key={standard.value}
                                  className={`relative p-6 border-2 rounded-xl cursor-pointer transition-all ${
                                    field.value === standard.value
                                      ? "border-primary bg-primary/5 shadow-lg"
                                      : "border-border hover:border-primary/50"
                                  }`}
                                  onClick={() => field.onChange(standard.value)}
                                >
                                  <div className="flex items-start gap-4">
                                    <div className="p-3 bg-primary/10 rounded-lg">
                                      <Icon className="h-6 w-6 text-primary" />
                                    </div>
                                    <div className="flex-1">
                                      <h3 className="font-semibold text-lg mb-1">{standard.label}</h3>
                                      <p className="text-sm text-muted-foreground">
                                        {standard.description}
                                      </p>
                                    </div>
                                  </div>
                                  {field.value === standard.value && (
                                    <div className="absolute top-2 right-2">
                                      <div className="bg-primary text-primary-foreground rounded-full p-1">
                                        <CheckCircle className="h-4 w-4" />
                                      </div>
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </CardContent>
                </Card>

                <div className="flex justify-between">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => goToStep(2)}
                    size="lg"
                  >
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    Back
                  </Button>
                  <Button
                    type="button"
                    onClick={() => goToStep(4)}
                    disabled={!canProceedToStep(4)}
                    size="lg"
                    className={`bg-primary hover:bg-primary text-primary-foreground`}
                  >
                    Continue
                    <ChevronRight className="h-4 w-4 ml-2" />
                  </Button>
                </div>
              </TabsContent>

              {/* Step 4: Configuration */}
              <TabsContent value="step-4" className="space-y-6">
                <Card className="border-2">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Settings className="h-5 w-5 text-primary" />
                      {t("collection_settings")}
                    </CardTitle>
                    <CardDescription>
                      {t("configure_advanced_options_for_your_collection")}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <FormField
                      control={form.control}
                      name="royaltyPercentage"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-base flex items-center gap-2">
                            <DollarSign className="h-4 w-4" />
                            {t("royalty_percentage")}
                          </FormLabel>
                          <FormControl>
                            <div className="flex items-center gap-4">
                              <Input
                                type="number"
                                min={0}
                                max={50}
                                step={0.1}
                                className="text-base"
                                {...field}
                                onChange={(e) => field.onChange(parseFloat(e.target.value))}
                              />
                              <span className="text-muted-foreground">%</span>
                            </div>
                          </FormControl>
                          <FormDescription>
                            Earn this percentage on all secondary sales (0-50%)
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="maxSupply"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-base flex items-center gap-2">
                            <Layers className="h-4 w-4" />
                            Maximum Supply (Optional)
                          </FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              min={1}
                              placeholder="Unlimited"
                              className="text-base"
                              {...field}
                              onChange={(e) => field.onChange(e.target.value ? parseInt(e.target.value) : undefined)}
                              value={field.value || ""}
                            />
                          </FormControl>
                          <FormDescription>
                            {t("limit_the_total_number_of_nfts")}
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="mintPrice"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-base flex items-center gap-2">
                            <Coins className="h-4 w-4" />
                            Mint Price (Optional)
                          </FormLabel>
                          <FormControl>
                            <div className="flex items-center gap-4">
                              <Input
                                type="number"
                                min={0}
                                step="0.0001"
                                placeholder="0.0000"
                                className="text-base"
                                {...field}
                                onChange={(e) => {
                                  const value = e.target.value;
                                  if (value === "" || value === null) {
                                    field.onChange(undefined);
                                  } else {
                                    const parsed = parseFloat(value);
                                    field.onChange(isNaN(parsed) ? undefined : parsed);
                                  }
                                }}
                                value={field.value ?? ""}
                              />
                              <span className="text-muted-foreground font-medium flex items-center gap-1.5">
                                <CurrencyIcon currency={chainNativeCurrency(form.watch("chain"))} size={16} />
                                {chainNativeCurrency(form.watch("chain"))}
                              </span>
                            </div>
                          </FormControl>
                          <FormDescription>
                            Set a fixed price for minting NFTs from this collection (supports values like 0.0001)
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="isPublic"
                      render={({ field }) => (
                        <FormItem className="flex items-center justify-between rounded-lg border p-4">
                          <div className="space-y-0.5">
                            <FormLabel className="text-base flex items-center gap-2">
                              <Shield className="h-4 w-4" />
                              {t("public_collection")}
                            </FormLabel>
                            <FormDescription>
                              {t("make_this_collection_visible_in_the_marketplace")}
                            </FormDescription>
                          </div>
                          <FormControl>
                            <Switch
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                  </CardContent>
                </Card>

                {/* Review Summary */}
                <Card className="border-2 border-primary/20 bg-linear-to-br from-primary/5 to-transparent">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Eye className="h-5 w-5 text-primary" />
                      {tExt("review_create")}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm text-muted-foreground">{tExt("collection_name")}</p>
                        <p className="font-medium">{form.watch("name") || tCommon("not_set")}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Symbol</p>
                        <p className="font-medium">{form.watch("symbol") || tCommon("not_set")}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Blockchain</p>
                        <p className="font-medium flex items-center gap-1.5">
                          {form.watch("chain") && <ChainIcon chain={form.watch("chain")} size={16} />}
                          {Array.isArray(supportedChains) ? supportedChains.find(c => c.chain === form.watch("chain"))?.name || form.watch("chain") : form.watch("chain") || t("not_selected")}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Standard</p>
                        <p className="font-medium">{form.watch("standard") || t("not_selected")}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Royalty</p>
                        <p className="font-medium">{form.watch("royaltyPercentage")}%</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Visibility</p>
                        <p className="font-medium">{form.watch("isPublic") ? tCommon("public") : tCommon("private")}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <div className="flex justify-between">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => goToStep(3)}
                    size="lg"
                  >
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    Back
                  </Button>
                  <Button
                    type="submit"
                    disabled={isSubmitting || !logoImage}
                    size="lg"
                    className="bg-success text-success-foreground"
                  >
                    {isSubmitting ? (
                      <>
                        <Sparkles className="h-4 w-4 mr-2 animate-spin" />
                        {t("creating_collection")}…
                      </>
                    ) : (
                      <>
                        <Sparkles className="h-4 w-4 mr-2" />
                        {t("create_collection")}
                      </>
                    )}
                  </Button>
                </div>
              </TabsContent>
            </Tabs>
          </form>
        </Form>
      </div>
    </div>
  );
}
