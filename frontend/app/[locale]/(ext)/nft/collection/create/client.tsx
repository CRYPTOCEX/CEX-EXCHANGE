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
import { useNftStore } from "@/store/nft/nft-store";
import { $fetch } from "@/lib/api";
import { imageUploader } from "@/utils/upload";
import { toast } from "sonner";

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
  const router = useRouter();
  const { user } = useUserStore();
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

  const form = useForm<CollectionFormData>({
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
      toast.error("Please upload an image file");
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
        toast.success("Logo uploaded successfully");
      } else {
        toast.error("Failed to upload logo");
      }
    } catch (error) {
      toast.error("Error uploading logo");
    } finally {
      setUploadingLogo(false);
    }
  };

  const handleBannerUpload = async (file: File) => {
    if (!file.type.startsWith("image/")) {
      toast.error("Please upload an image file");
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
        toast.success("Banner uploaded successfully");
      } else {
        toast.error("Failed to upload banner");
      }
    } catch (error) {
      toast.error("Error uploading banner");
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
      toast.error("Please upload a logo image");
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
          currency: "ETH",
        },
      });

      if (error) {
        toast.error(error);
        return;
      }

      toast.success("Collection created successfully!");
      router.push("/nft/creator");
    } catch (error) {
      toast.error("Failed to create collection");
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20">
      {/* Hero Header */}
      <div className={`relative overflow-hidden bg-gradient-to-r from-blue-600/10 via-purple-600/10 to-pink-600/10 border-b`}>
        <div className="absolute inset-0 bg-grid-white/[0.02] bg-[size:60px_60px]" />
        <div className="relative container py-16">
          {/* Centered Content */}
          <div className="text-center max-w-3xl mx-auto">
            <div className={`inline-flex items-center gap-2 bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-4`}>
              <Package className="h-6 w-6 text-blue-600" />
              <span className="text-sm font-medium uppercase tracking-wider">Create Collection</span>
            </div>

            <h1 className="text-4xl md:text-6xl font-bold mb-6 bg-gradient-to-r from-gray-900 via-gray-800 to-gray-700 dark:from-white dark:via-gray-100 dark:to-gray-300 bg-clip-text text-transparent">
              Launch Your NFT Collection
            </h1>

            <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
              Create a stunning collection to organize and showcase your NFTs on the blockchain
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
                <span className={logoImage ? "text-green-600" : ""}>
                  {logoImage ? "✓" : "○"} Images
                </span>
                <span className={form.watch("name") && form.watch("symbol") && form.watch("categoryId") ? "text-green-600" : ""}>
                  {form.watch("name") && form.watch("symbol") && form.watch("categoryId") ? "✓" : "○"} Info
                </span>
                <span className={form.watch("chain") ? "text-green-600" : ""}>
                  {form.watch("chain") ? "✓" : "○"} Chain
                </span>
                <span>○ Settings</span>
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
                  {logoImage && <CheckCircle className="h-3 w-3 text-green-500" />}
                </TabsTrigger>
                <TabsTrigger
                  value="step-2"
                  onClick={() => goToStep(2)}
                  className="flex items-center gap-2"
                  disabled={!canProceedToStep(2)}
                >
                  <FileText className="h-4 w-4" />
                  <span className="hidden sm:inline">Details</span>
                  {form.watch("name") && form.watch("symbol") && <CheckCircle className="h-3 w-3 text-green-500" />}
                </TabsTrigger>
                <TabsTrigger
                  value="step-3"
                  onClick={() => goToStep(3)}
                  className="flex items-center gap-2"
                  disabled={!canProceedToStep(3)}
                >
                  <Globe className="h-4 w-4" />
                  <span className="hidden sm:inline">Blockchain</span>
                  {form.watch("chain") && <CheckCircle className="h-3 w-3 text-green-500" />}
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
                      Collection Images
                    </CardTitle>
                    <CardDescription>
                      Upload a logo and banner to represent your collection
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    {/* Logo Upload */}
                    <div>
                      <FormLabel className="text-base font-semibold mb-3 block">
                        Logo Image *
                      </FormLabel>
                      <div
                        className={`relative border-2 border-dashed rounded-xl transition-all ${
                          dragActiveLogo
                            ? "border-primary bg-primary/5"
                            : logoImage
                            ? "border-green-500"
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
                                alt="Collection Logo"
                                fill
                                className="object-cover"
                              />
                              <div className="absolute inset-0 bg-black/50 opacity-0 hover:opacity-100 transition-opacity flex items-center justify-center">
                                <Button
                                  type="button"
                                  variant="secondary"
                                  size="sm"
                                  onClick={() => logoInputRef.current?.click()}
                                >
                                  Change Logo
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
                                  {uploadingLogo ? "Uploading..." : "Upload Logo"}
                                </p>
                                <p className="text-sm text-muted-foreground">
                                  Drag & drop or click to browse
                                </p>
                                <p className="text-xs text-muted-foreground mt-2">
                                  Recommended: 512x512px, PNG/JPG
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
                            ? "border-green-500"
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
                                alt="Collection Banner"
                                fill
                                className="object-cover"
                              />
                              <div className="absolute inset-0 bg-black/50 opacity-0 hover:opacity-100 transition-opacity flex items-center justify-center">
                                <Button
                                  type="button"
                                  variant="secondary"
                                  size="sm"
                                  onClick={() => bannerInputRef.current?.click()}
                                >
                                  Change Banner
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
                                  {uploadingBanner ? "Uploading..." : "Upload Banner"}
                                </p>
                                <p className="text-sm text-muted-foreground">
                                  Drag & drop or click to browse
                                </p>
                                <p className="text-xs text-muted-foreground mt-2">
                                  Recommended: 1920x400px, PNG/JPG
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
                    className={`bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white`}
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
                      Collection Information
                    </CardTitle>
                    <CardDescription>
                      Provide basic information about your collection
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <FormField
                      control={form.control}
                      name="name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-base">Collection Name *</FormLabel>
                          <FormControl>
                            <Input
                              placeholder="e.g., Awesome Art Collection"
                              className="text-base"
                              {...field}
                            />
                          </FormControl>
                          <FormDescription>
                            Choose a unique and memorable name for your collection
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
                          <FormLabel className="text-base">Symbol *</FormLabel>
                          <FormControl>
                            <Input
                              placeholder="e.g., AAC"
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
                              placeholder="Describe your collection, its theme, and what makes it unique..."
                              className="min-h-32 text-base"
                              {...field}
                            />
                          </FormControl>
                          <FormDescription>
                            Help collectors understand what your collection is about
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
                          <FormLabel className="text-base">Category *</FormLabel>
                          <Select
                            value={field.value}
                            onValueChange={field.onChange}
                          >
                            <FormControl>
                              <SelectTrigger className="text-base">
                                <SelectValue placeholder="Select a category" />
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
                            Choose the category that best represents your collection
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
                    className={`bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white`}
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
                      Blockchain Configuration
                    </CardTitle>
                    <CardDescription>
                      Choose the blockchain where your collection will be deployed
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <FormField
                      control={form.control}
                      name="chain"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-base">Blockchain *</FormLabel>
                          {loadingChains ? (
                            <div className="flex items-center justify-center py-12">
                              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                            </div>
                          ) : supportedChains.length === 0 ? (
                            <div className="text-center py-12 border-2 border-dashed rounded-xl">
                              <p className="text-muted-foreground">No blockchains configured yet.</p>
                              <p className="text-sm text-muted-foreground mt-2">
                                Please contact support to enable blockchain support.
                              </p>
                            </div>
                          ) : (
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-2">
                              {supportedChains.map((chain) => (
                                <div
                                  key={chain.chain}
                                  className={`relative p-6 border-2 rounded-xl cursor-pointer transition-all ${
                                    field.value === chain.chain
                                      ? "border-primary bg-primary/5 shadow-lg"
                                      : "border-border hover:border-primary/50"
                                  }`}
                                  onClick={() => {
                                    field.onChange(chain.chain);
                                    form.setValue("network", chain.network);
                                  }}
                                >
                                  <div className="text-center">
                                    <div className="mb-3 flex justify-center">
                                      {chain.icon?.startsWith("/") ? (
                                        <img
                                          src={chain.icon}
                                          alt={chain.name}
                                          className="w-12 h-12 object-contain"
                                          onError={(e) => {
                                            (e.target as HTMLImageElement).style.display = 'none';
                                          }}
                                        />
                                      ) : (
                                        <span className="text-4xl">{chain.icon || "⚡"}</span>
                                      )}
                                    </div>
                                    <h3 className="font-semibold text-lg mb-1">{chain.name}</h3>
                                    <p className="text-sm text-muted-foreground capitalize">
                                      {chain.network}
                                    </p>
                                  </div>
                                  {field.value === chain.chain && (
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

                    <div className="bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900/50 rounded-lg p-4">
                      <div className="flex gap-3">
                        <Info className="h-5 w-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
                        <div className="text-sm">
                          <p className="font-medium text-blue-900 dark:text-blue-100 mb-1">
                            Blockchain Choice
                          </p>
                          <p className="text-blue-700 dark:text-blue-300">
                            This determines which network your collection will use. Consider gas fees,
                            transaction speed, and where your audience is most active.
                          </p>
                        </div>
                      </div>
                    </div>

                    <FormField
                      control={form.control}
                      name="standard"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-base">Token Standard *</FormLabel>
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
                    className={`bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white`}
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
                      Collection Settings
                    </CardTitle>
                    <CardDescription>
                      Configure advanced options for your collection
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
                            Royalty Percentage
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
                            Limit the total number of NFTs in this collection. Leave empty for unlimited.
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
                              <span className="text-muted-foreground font-medium">
                                {(() => {
                                  const chain = form.watch("chain");
                                  switch(chain) {
                                    case "BSC": return "BNB";
                                    case "ETH": return "ETH";
                                    case "POLYGON": return "MATIC";
                                    case "ARBITRUM": return "ETH";
                                    case "OPTIMISM": return "ETH";
                                    case "AVALANCHE": return "AVAX";
                                    case "FANTOM": return "FTM";
                                    default: return "ETH";
                                  }
                                })()}
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
                              Public Collection
                            </FormLabel>
                            <FormDescription>
                              Make this collection visible in the marketplace
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
                <Card className="border-2 border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Eye className="h-5 w-5 text-primary" />
                      Review & Create
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm text-muted-foreground">Collection Name</p>
                        <p className="font-medium">{form.watch("name") || "Not set"}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Symbol</p>
                        <p className="font-medium">{form.watch("symbol") || "Not set"}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Blockchain</p>
                        <p className="font-medium">
                          {Array.isArray(supportedChains) ? supportedChains.find(c => c.chain === form.watch("chain"))?.name || form.watch("chain") : form.watch("chain") || "Not selected"}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Standard</p>
                        <p className="font-medium">{form.watch("standard") || "Not selected"}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Royalty</p>
                        <p className="font-medium">{form.watch("royaltyPercentage")}%</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Visibility</p>
                        <p className="font-medium">{form.watch("isPublic") ? "Public" : "Private"}</p>
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
                    className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white"
                  >
                    {isSubmitting ? (
                      <>
                        <Sparkles className="h-4 w-4 mr-2 animate-spin" />
                        Creating Collection...
                      </>
                    ) : (
                      <>
                        <Sparkles className="h-4 w-4 mr-2" />
                        Create Collection
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
