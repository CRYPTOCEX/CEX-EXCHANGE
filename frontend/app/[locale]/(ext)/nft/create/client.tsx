"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "@/i18n/routing";
import { useTranslations } from "next-intl";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
} from "@/components/ui/form";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { 
  Upload, 
  X, 
  Plus, 
  Image as ImageIcon,
  Loader2,
  CheckCircle,
  Sparkles,
  Palette,
  Settings,
  Eye,
  Zap,
  Info,
  AlertCircle,
  FileText,
  Link,
  DollarSign,
  Wand2,
  Play,
  Download,
  Share2,
  Heart,
  Star,
  Layers,
  Camera,
  Film,
  Music,
  Gamepad2,
  ChevronRight
} from "lucide-react";
import { useUserStore } from "@/store/user";
import { useNftStore } from "@/store/nft/nft-store";
import { imageUploader } from "@/utils/upload";
import Image from "next/image";
import { AuthModal } from "@/components/auth/auth-modal";
import { toast } from "sonner";
import { GasEstimator } from "@/components/nft/gas-estimator";
import { useGasEstimation } from "@/hooks/use-gas-estimation";
import { $fetch } from "@/lib/api";

const createNFTSchema = z.object({
  name: z.string().min(1, "Name is required").max(255, "Name too long"),
  description: z.string().optional(),
  collectionId: z.string().min(1, "Collection is required"),
  image: z.string().min(1, "Image is required"),
  animationUrl: z.string().url().optional().or(z.literal("")),
  externalUrl: z.string().url().optional().or(z.literal("")),
  attributes: z.array(z.object({
    trait_type: z.string().min(1, "Trait type is required"),
    value: z.string().min(1, "Value is required"),
    display_type: z.string().optional(),
  })).optional(),
  royaltyPercentage: z.number().min(0).max(50).optional(),
  isLazyMinted: z.boolean().default(true),
  mintToBlockchain: z.boolean().default(false),
  recipientAddress: z.string().optional(),
  chain: z.string().default("ETH"),
  category: z.string().optional(),
  tags: z.array(z.string()).optional(),
  unlockableContent: z.string().optional(),
  isExplicitContent: z.boolean().default(false),
  isSensitiveContent: z.boolean().default(false),
});

type CreateNFTForm = z.infer<typeof createNFTSchema>;

const NFT_CATEGORIES = [
  { value: "art", label: "Art", icon: Palette },
  { value: "photography", label: "Photography", icon: Camera },
  { value: "music", label: "Music", icon: Music },
  { value: "video", label: "Video", icon: Film },
  { value: "gaming", label: "Gaming", icon: Gamepad2 },
  { value: "collectibles", label: "Collectibles", icon: Star },
  { value: "utility", label: "Utility", icon: Layers },
];

const ATTRIBUTE_DISPLAY_TYPES = [
  { value: "", label: "Text" },
  { value: "number", label: "Number" },
  { value: "boost_percentage", label: "Boost Percentage" },
  { value: "boost_number", label: "Boost Number" },
  { value: "date", label: "Date" },
];

export default function CreateNFTClient() {
  const t = useTranslations("nft/create");
  const router = useRouter();
  const { user } = useUserStore();
  const { 
    collections, 
    createToken, 
    fetchCollections, 
    loading 
  } = useNftStore();

  const [uploadingImage, setUploadingImage] = useState(false);
  const [previewImage, setPreviewImage] = useState<string>("");
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [attributes, setAttributes] = useState<Array<{
    trait_type: string;
    value: string;
    display_type?: string;
  }>>([]);
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState("");
  const [currentStep, setCurrentStep] = useState(1);
  const [dragActive, setDragActive] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const totalSteps = 4;

  const form = useForm<CreateNFTForm>({
    resolver: zodResolver(createNFTSchema),
    defaultValues: {
      name: "",
      description: "",
      collectionId: "",
      image: "",
      animationUrl: "",
      externalUrl: "",
      attributes: [],
      royaltyPercentage: 2.5,
      isLazyMinted: true,
      mintToBlockchain: false,
      recipientAddress: "",
      chain: "ETH",
      category: "",
      tags: [],
      unlockableContent: "",
      isExplicitContent: false,
      isSensitiveContent: false,
    },
  });

  // Gas estimation for blockchain minting (after form is initialized)
  const mintToBlockchain = form.watch("mintToBlockchain");
  const chain = form.watch("chain");
  const { estimate: gasEstimate, loading: gasLoading, canAfford } = useGasEstimation({
    operation: "mint",
    chain,
    enabled: mintToBlockchain
  });

  // Calculate progress based on actual completion
  const getStepProgress = () => {
    let completedSteps = 0;
    
    // Step 1: Image uploaded
    if (previewImage) completedSteps++;
    
    // Step 2: Basic info filled
    const name = form.watch("name");
    const collectionId = form.watch("collectionId");
    if (name && collectionId) completedSteps++;
    
    // Step 3: Properties configured (check if user has visited/configured anything)
    const hasAttributes = attributes.length > 0;
    const hasRoyalty = form.watch("royaltyPercentage") !== 2.5; // Changed from default
    const hasUnlockableContent = !!form.watch("unlockableContent");
    const hasContentFlags = form.watch("isExplicitContent") || form.watch("isSensitiveContent");
    const hasLazyMintingSetting = form.watch("isLazyMinted") !== true; // Changed from default
    
    if (hasAttributes || hasRoyalty || hasUnlockableContent || hasContentFlags || hasLazyMintingSetting) {
      completedSteps++;
    }
    
    // Step 4: Ready to create (if previous required steps are done)
    if (previewImage && name && collectionId) completedSteps++;
    
    return (completedSteps / totalSteps) * 100;
  };
  
  const progress = getStepProgress();
  
  // Check if user can proceed to next step
  const canProceedToStep = (step: number) => {
    const name = form.watch("name");
    const collectionId = form.watch("collectionId");
    
    switch (step) {
      case 1:
        return true; // Can always go to step 1
      case 2:
        return !!previewImage; // Need image to proceed to step 2
      case 3:
        return !!previewImage && !!name && !!collectionId; // Need basic info
      case 4:
        return !!previewImage && !!name && !!collectionId; // Only need required steps (Properties is optional)
      default:
        return false;
    }
  };
  
  // Check if Properties step has any configuration
  const isPropertiesConfigured = () => {
    const hasAttributes = attributes.length > 0;
    const hasRoyalty = form.watch("royaltyPercentage") !== 2.5;
    const hasUnlockableContent = !!form.watch("unlockableContent");
    const hasContentFlags = form.watch("isExplicitContent") || form.watch("isSensitiveContent");
    const hasLazyMintingSetting = form.watch("isLazyMinted") !== true;
    
    return hasAttributes || hasRoyalty || hasUnlockableContent || hasContentFlags || hasLazyMintingSetting;
  };
  
  const goToStep = (step: number) => {
    if (canProceedToStep(step)) {
      setCurrentStep(step);
    }
  };

  const handleFetchCollections = useCallback(async () => {
    if (user) {
      try {
        await fetchCollections({ creatorId: user.id });
      } catch (error) {
        console.error("Failed to fetch collections:", error);
      }
    }
  }, [user, fetchCollections]);

  useEffect(() => {
    handleFetchCollections();
  }, [handleFetchCollections]);

  const handleImageUpload = useCallback(async (file: File) => {
    if (!file.type.startsWith('image/')) {
      toast.error("Please select an image file");
      return;
    }

    if (file.size > 10 * 1024 * 1024) { // 10MB limit
      toast.error("File size must be less than 10MB");
      return;
    }

    setUploadingImage(true);
    try {
      const result = await imageUploader({
        file,
        dir: "nft",
        size: { maxWidth: 1024, maxHeight: 1024 }
      });

      if (result.success) {
        form.setValue("image", result.url);
        setPreviewImage(result.url);
        toast.success("Image uploaded successfully!");
      } else {
        toast.error(result.error || "Upload failed");
      }
    } catch (error) {
      console.error("Upload error:", error);
      toast.error("Upload failed. Please try again.");
    } finally {
      setUploadingImage(false);
    }
  }, [form]);

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleImageUpload(e.dataTransfer.files[0]);
    }
  }, [handleImageUpload]);

  const addTag = useCallback(() => {
    if (tagInput.trim() && !tags.includes(tagInput.trim()) && tags.length < 10) {
      const newTags = [...tags, tagInput.trim()];
      setTags(newTags);
      form.setValue("tags", newTags);
      setTagInput("");
    }
  }, [tagInput, tags, form]);

  const removeTag = useCallback((tagToRemove: string) => {
    const newTags = tags.filter(tag => tag !== tagToRemove);
    setTags(newTags);
    form.setValue("tags", newTags);
  }, [tags, form]);

  const handleTagInputKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      addTag();
    }
  }, [addTag]);

  const addAttribute = useCallback(() => {
    setAttributes([...attributes, { trait_type: "", value: "" }]);
  }, [attributes]);

  const updateAttribute = useCallback((index: number, field: string, value: string) => {
    const updated = [...attributes];
    updated[index] = { ...updated[index], [field]: value };
    setAttributes(updated);
    form.setValue("attributes", updated);
  }, [attributes, form]);

  const removeAttribute = useCallback((index: number) => {
    const updated = attributes.filter((_, i) => i !== index);
    setAttributes(updated);
    form.setValue("attributes", updated);
  }, [attributes, form]);

  const onSubmit = useCallback(async (data: CreateNFTForm) => {
    try {
      // Check balance if minting to blockchain
      if (data.mintToBlockchain && gasEstimate && !canAfford) {
        toast.error("Insufficient balance to cover gas fees for blockchain minting");
        return;
      }

      const nftData = {
        ...data,
        attributes: attributes.length > 0 ? attributes : undefined,
        tags: tags.length > 0 ? tags : undefined,
        creatorId: user?.id,
      };

      if (data.isLazyMinted) {
        // Use lazy minting endpoint with blockchain option
        const { data: result, error } = await $fetch({
          url: "/api/nft/token/lazy-mint",
          method: "POST",
          body: nftData,
          successMessage: data.mintToBlockchain ? "NFT created and minted to blockchain!" : "NFT created successfully!"
        });

        if (error) {
          throw new Error(error);
        }
      } else {
        // Use direct minting endpoint
        const { data: result, error } = await $fetch({
          url: "/api/nft/token/mint",
          method: "POST", 
          body: nftData,
          successMessage: "NFT minted to blockchain successfully!"
        });

        if (error) {
          throw new Error(error);
        }
      }
      
      router.push("/nft/dashboard");
    } catch (error) {
      console.error("Failed to create NFT:", error);
      toast.error("Failed to create NFT. Please try again.");
    }
  }, [attributes, tags, user?.id, gasEstimate, canAfford, router]);

  const handleClearImage = useCallback(() => {
    setPreviewImage("");
    form.setValue("image", "");
  }, [form]);

  if (!user) {
    return (
      <div className="container mx-auto py-12 px-4 text-center">
        <h1 className="text-2xl font-bold mb-4">{t("create_nft")}</h1>
        <p className="text-muted-foreground mb-6">
          {t("please_sign_in_to_create_nfts")}
        </p>
        <Button onClick={() => setIsAuthModalOpen(true)}>
          {t("sign_in")}
        </Button>
        <AuthModal
          isOpen={isAuthModalOpen}
          onClose={() => setIsAuthModalOpen(false)}
          initialView="login"
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20">
      {/* Hero Header */}
      <div className="relative overflow-hidden bg-gradient-to-r from-purple-600/10 via-blue-600/10 to-cyan-600/10 border-b">
        <div className="absolute inset-0 bg-grid-white/[0.02] bg-[size:60px_60px]" />
        <div className="relative container mx-auto px-4 py-16">
          <div className="text-center max-w-3xl mx-auto">
            <div className="inline-flex items-center gap-2 bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent mb-4">
              <Sparkles className="h-6 w-6 text-purple-600" />
              <span className="text-sm font-medium uppercase tracking-wider">Create Your Masterpiece</span>
            </div>
            <h1 className="text-4xl md:text-6xl font-bold mb-6 bg-gradient-to-r from-gray-900 via-gray-800 to-gray-700 dark:from-white dark:via-gray-100 dark:to-gray-300 bg-clip-text text-transparent">
              {t("create_new_nft")}
            </h1>
            <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
              {t("create_and_mint_your_unique_digital_asset")}
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
                <span className={previewImage ? "text-green-600" : ""}>
                  {previewImage ? "✓" : "○"} Upload
                </span>
                <span className={form.watch("name") && form.watch("collectionId") ? "text-green-600" : ""}>
                  {form.watch("name") && form.watch("collectionId") ? "✓" : "○"} Details
                </span>
                <span className={isPropertiesConfigured() ? "text-green-600" : ""}>
                  {isPropertiesConfigured() ? "✓" : "○"} Properties
                </span>
                <span className={canProceedToStep(4) ? "text-green-600" : ""}>
                  {canProceedToStep(4) ? "✓" : "○"} Ready
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-12 max-w-7xl">

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
                  <Upload className="h-4 w-4" />
                  <span className="hidden sm:inline">Upload</span>
                  {previewImage && <CheckCircle className="h-3 w-3 text-green-500" />}
                </TabsTrigger>
                <TabsTrigger 
                  value="step-2" 
                  onClick={() => goToStep(2)}
                  className="flex items-center gap-2"
                  disabled={!canProceedToStep(2)}
                >
                  <FileText className="h-4 w-4" />
                  <span className="hidden sm:inline">Details</span>
                  {form.watch("name") && form.watch("collectionId") && <CheckCircle className="h-3 w-3 text-green-500" />}
                </TabsTrigger>
                <TabsTrigger 
                  value="step-3" 
                  onClick={() => goToStep(3)}
                  className="flex items-center gap-2"
                  disabled={!canProceedToStep(3)}
                >
                  <Settings className="h-4 w-4" />
                  <span className="hidden sm:inline">Properties</span>
                  {isPropertiesConfigured() && <CheckCircle className="h-3 w-3 text-green-500" />}
                </TabsTrigger>
                <TabsTrigger 
                  value="step-4" 
                  onClick={() => goToStep(4)}
                  className="flex items-center gap-2"
                  disabled={!canProceedToStep(4)}
                >
                  <Eye className="h-4 w-4" />
                  <span className="hidden sm:inline">Preview</span>
                  {canProceedToStep(4) && <CheckCircle className="h-3 w-3 text-green-500" />}
                </TabsTrigger>
              </TabsList>

              {/* Step 1: Upload Artwork */}
              <TabsContent value="step-1" className="space-y-8">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                  {/* Upload Area */}
                  <div className="lg:col-span-2">
                    <Card className="border-2 border-dashed border-muted-foreground/25 hover:border-muted-foreground/50 transition-colors">
                      <CardContent className="p-8">
                        <FormField
                          control={form.control}
                          name="image"
                          render={() => (
                            <FormItem>
                              <FormControl>
                                <div 
                                  className={`space-y-6 ${dragActive ? 'bg-primary/5' : ''}`}
                                  onDragEnter={handleDrag}
                                  onDragLeave={handleDrag}
                                  onDragOver={handleDrag}
                                  onDrop={handleDrop}
                                >
                                  {previewImage ? (
                                    <div className="relative">
                                      <div className="relative aspect-square max-w-md mx-auto bg-muted rounded-2xl overflow-hidden shadow-2xl">
                                        <Image
                                          src={previewImage}
                                          alt="NFT Preview"
                                          fill
                                          className="object-cover"
                                        />
                                        <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent" />
                                        <Button
                                          type="button"
                                          variant="secondary"
                                          size="sm"
                                          className="absolute top-4 right-4 shadow-lg"
                                          onClick={handleClearImage}
                                        >
                                          <X className="h-4 w-4" />
                                        </Button>
                                      </div>
                                      <div className="text-center mt-6">
                                        <p className="text-sm text-muted-foreground">
                                          Your artwork looks amazing! Continue to add details.
                                        </p>
                                        <Button
                                          type="button"
                                          variant="outline"
                                          className="mt-4"
                                          onClick={() => fileInputRef.current?.click()}
                                        >
                                          <Upload className="h-4 w-4 mr-2" />
                                          Change Image
                                        </Button>
                                      </div>
                                    </div>
                                  ) : (
                                    <div className="text-center py-12">
                                      <div className="mx-auto w-20 h-20 mb-6 rounded-full bg-gradient-to-r from-purple-600 to-blue-600 p-5 shadow-lg">
                                        <ImageIcon className="w-full h-full text-white" />
                                      </div>
                                      <h3 className="text-2xl font-semibold mb-4">
                                        Upload Your Masterpiece
                                      </h3>
                                      <p className="text-muted-foreground mb-6 max-w-md mx-auto">
                                        {t("drag_and_drop_your_image_here_or_click_to_browse")}
                                      </p>
                                      
                                      <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
                                        <Button 
                                          type="button" 
                                          size="lg"
                                          className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white"
                                          onClick={() => fileInputRef.current?.click()}
                                          disabled={uploadingImage}
                                        >
                                          {uploadingImage ? (
                                            <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                                          ) : (
                                            <Upload className="h-5 w-5 mr-2" />
                                          )}
                                          {uploadingImage ? t("uploading") : t("choose_file")}
                                        </Button>
                                        
                                        <div className="text-sm text-muted-foreground">
                                          or drag and drop
                                        </div>
                                      </div>
                                      
                                      <div className="mt-8 grid grid-cols-2 md:grid-cols-4 gap-4 max-w-md mx-auto">
                                        <div className="text-center p-3 rounded-lg bg-muted/50">
                                          <ImageIcon className="h-6 w-6 mx-auto mb-1 text-muted-foreground" />
                                          <p className="text-xs">Images</p>
                                        </div>
                                        <div className="text-center p-3 rounded-lg bg-muted/50">
                                          <Film className="h-6 w-6 mx-auto mb-1 text-muted-foreground" />
                                          <p className="text-xs">Videos</p>
                                        </div>
                                        <div className="text-center p-3 rounded-lg bg-muted/50">
                                          <Music className="h-6 w-6 mx-auto mb-1 text-muted-foreground" />
                                          <p className="text-xs">Audio</p>
                                        </div>
                                        <div className="text-center p-3 rounded-lg bg-muted/50">
                                          <FileText className="h-6 w-6 mx-auto mb-1 text-muted-foreground" />
                                          <p className="text-xs">3D Models</p>
                                        </div>
                                      </div>
                                    </div>
                                  )}
                                  
                                  <input
                                    ref={fileInputRef}
                                    type="file"
                                    accept="image/*,video/*,audio/*,.glb,.gltf"
                                    onChange={(e) => {
                                      const file = e.target.files?.[0];
                                      if (file) handleImageUpload(file);
                                    }}
                                    className="hidden"
                                  />
                                </div>
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </CardContent>
                    </Card>
                    
                    {/* Upload Tips */}
                    <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="flex items-start gap-3 p-4 rounded-lg bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800">
                        <Info className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
                        <div>
                          <p className="font-medium text-blue-900 dark:text-blue-100 text-sm">
                            High Quality
                          </p>
                          <p className="text-blue-700 dark:text-blue-300 text-xs">
                            Use high-resolution images for best results
                          </p>
                        </div>
                      </div>
                      
                      <div className="flex items-start gap-3 p-4 rounded-lg bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800">
                        <Zap className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
                        <div>
                          <p className="font-medium text-green-900 dark:text-green-100 text-sm">
                            Fast Upload
                          </p>
                          <p className="text-green-700 dark:text-green-300 text-xs">
                            Optimized for quick processing
                          </p>
                        </div>
                      </div>
                      
                      <div className="flex items-start gap-3 p-4 rounded-lg bg-purple-50 dark:bg-purple-950/20 border border-purple-200 dark:border-purple-800">
                        <Heart className="h-5 w-5 text-purple-600 mt-0.5 flex-shrink-0" />
                        <div>
                          <p className="font-medium text-purple-900 dark:text-purple-100 text-sm">
                            Your Art
                          </p>
                          <p className="text-purple-700 dark:text-purple-300 text-xs">
                            Only upload original artwork you own
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                
                <div className="flex justify-end">
                  <Button 
                    type="button" 
                    onClick={() => goToStep(2)}
                    disabled={!canProceedToStep(2)}
                    size="lg"
                  >
                    {t("Continue")}
                    <ChevronRight className="h-4 w-4 ml-2" />
                  </Button>
                </div>
              </TabsContent>

              {/* Step 2: NFT Details */}
              <TabsContent value="step-2" className="space-y-8">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                  {/* Basic Information */}
                  <Card className="lg:col-span-2">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <FileText className="h-5 w-5" />
                        {t("basic_information")}
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-4">
                        <FormField
                          control={form.control}
                          name="name"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>{t("Name")} *</FormLabel>
                              <FormControl>
                                <Input placeholder={t("enter_nft_name")} {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="collectionId"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>{t("Collection")} *</FormLabel>
                              <Select value={field.value} onValueChange={field.onChange} disabled={loading}>
                                <FormControl>
                                  <SelectTrigger>
                                    <SelectValue placeholder={
                                      loading 
                                        ? t("loading_collections") 
                                        : t("select_a_collection")
                                    } />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  {Array.isArray(collections) && collections.length > 0 ? (
                                    collections.map((collection) => (
                                      <SelectItem key={collection.id} value={collection.id}>
                                        {collection.name}
                                      </SelectItem>
                                    ))
                                  ) : (
                                    <div className="px-2 py-1.5 text-sm text-muted-foreground">
                                      {loading ? t("loading") : t("no_collections_available")}
                                    </div>
                                  )}
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="category"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Category</FormLabel>
                              <Select value={field.value} onValueChange={field.onChange}>
                                <FormControl>
                                  <SelectTrigger>
                                    <SelectValue placeholder="Select category" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  {NFT_CATEGORIES.map((category) => (
                                    <SelectItem key={category.value} value={category.value}>
                                      <div className="flex items-center gap-2">
                                        <category.icon className="h-4 w-4" />
                                        {category.label}
                                      </div>
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>

                      <div className="space-y-4">
                        <FormField
                          control={form.control}
                          name="description"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>{t("Description")}</FormLabel>
                              <FormControl>
                                <Textarea 
                                  placeholder={t("describe_your_nft")}
                                  rows={6}
                                  {...field}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        {/* Tags */}
                        <div className="space-y-2">
                          <Label>Tags</Label>
                          <div className="flex gap-2">
                            <Input
                              placeholder="Add tags"
                              value={tagInput}
                              onChange={(e) => setTagInput(e.target.value)}
                              onKeyDown={handleTagInputKeyDown}
                            />
                            <Button type="button" variant="outline" onClick={addTag}>
                              <Plus className="h-4 w-4" />
                            </Button>
                          </div>
                          {tags.length > 0 && (
                            <div className="flex flex-wrap gap-2 mt-2">
                              {tags.map((tag, index) => (
                                <Badge key={index} variant="secondary" className="flex items-center gap-1">
                                  {tag}
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    className="h-auto p-0 hover:bg-transparent"
                                    onClick={() => removeTag(tag)}
                                  >
                                    <X className="h-3 w-3" />
                                  </Button>
                                </Badge>
                              ))}
                            </div>
                          )}
                          <p className="text-xs text-muted-foreground">
                            Add up to 10 tags to help people discover your NFT
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Additional URLs */}
                  <Card className="lg:col-span-2">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Link className="h-5 w-5" />
                        {t("additional_urls")}
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <FormField
                        control={form.control}
                        name="animationUrl"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>{t("animation_url")}</FormLabel>
                            <FormControl>
                              <Input 
                                placeholder="https://example.com/animation.mp4"
                                {...field}
                              />
                            </FormControl>
                            <p className="text-xs text-muted-foreground">
                              Link to animation or video file
                            </p>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="externalUrl"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>{t("external_url")}</FormLabel>
                            <FormControl>
                              <Input 
                                placeholder="https://example.com"
                                {...field}
                              />
                            </FormControl>
                            <p className="text-xs text-muted-foreground">
                              Link to external website or resource
                            </p>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </CardContent>
                  </Card>
                </div>
                
                <div className="flex justify-between">
                  <Button 
                    type="button" 
                    variant="outline"
                    onClick={() => goToStep(1)}
                  >
                    {t("Back")}
                  </Button>
                  <Button 
                    type="button" 
                    onClick={() => goToStep(3)}
                    disabled={!canProceedToStep(3)}
                  >
                    {t("Continue")}
                    <ChevronRight className="h-4 w-4 ml-2" />
                  </Button>
                </div>
              </TabsContent>

              {/* Step 3: Properties & Settings */}
              <TabsContent value="step-3" className="space-y-8">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                  {/* Attributes */}
                  <Card className="lg:col-span-2">
                    <CardHeader>
                      <CardTitle className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Layers className="h-5 w-5" />
                          {t("Attributes")}
                        </div>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={addAttribute}
                        >
                          <Plus className="h-4 w-4 mr-2" />
                          {t("add_attribute")}
                        </Button>
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      {attributes.length === 0 ? (
                        <div className="text-center py-8">
                          <Layers className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                          <p className="text-muted-foreground mb-4">
                            {t("no_attributes_added_yet")}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {t("attributes_help_define_the")}
                          </p>
                        </div>
                      ) : (
                        <div className="space-y-4">
                          {attributes.map((attribute, index) => (
                            <div key={index} className="grid grid-cols-1 md:grid-cols-4 gap-4 p-4 border rounded-lg">
                              <Input
                                placeholder={t("trait_type")}
                                value={attribute.trait_type}
                                onChange={(e) => updateAttribute(index, "trait_type", e.target.value)}
                              />
                              <Input
                                placeholder={t("Value")}
                                value={attribute.value}
                                onChange={(e) => updateAttribute(index, "value", e.target.value)}
                              />
                              <Select
                                value={attribute.display_type || ""}
                                onValueChange={(value) => updateAttribute(index, "display_type", value)}
                              >
                                <SelectTrigger>
                                  <SelectValue placeholder="Display Type" />
                                </SelectTrigger>
                                <SelectContent>
                                  {ATTRIBUTE_DISPLAY_TYPES.map((type) => (
                                    <SelectItem key={type.value} value={type.value}>
                                      {type.label}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => removeAttribute(index)}
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            </div>
                          ))}
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  {/* Settings */}
                  <Card className="lg:col-span-2">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Settings className="h-5 w-5" />
                        {t("Settings")}
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-4">
                        <FormField
                          control={form.control}
                          name="royaltyPercentage"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="flex items-center gap-2">
                                <DollarSign className="h-4 w-4" />
                                {t("royalty_percentage")}
                              </FormLabel>
                              <FormControl>
                                <Input
                                  type="number"
                                  min="0"
                                  max="50"
                                  step="0.1"
                                  placeholder="2.5"
                                  {...field}
                                  onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                                />
                              </FormControl>
                              <p className="text-xs text-muted-foreground">
                                {t("percentage_youll_receive_from_secondary_sales")}
                              </p>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="unlockableContent"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="flex items-center gap-2">
                                <Wand2 className="h-4 w-4" />
                                {t("unlockable_content")}
                              </FormLabel>
                              <FormControl>
                                <Textarea 
                                  placeholder={t("secret_message_download_link")}
                                  rows={3}
                                  {...field}
                                />
                              </FormControl>
                              <p className="text-xs text-muted-foreground">
                                {t("content_only_visible_to_the_owner_of_this_nft")}
                              </p>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>

                      <div className="space-y-4">
                        <FormField
                          control={form.control}
                          name="isLazyMinted"
                          render={({ field }) => (
                            <FormItem className="flex items-center justify-between p-4 border rounded-lg">
                              <div>
                                <FormLabel className="flex items-center gap-2">
                                  <Zap className="h-4 w-4" />
                                  {t("lazy_minting")}
                                </FormLabel>
                                <p className="text-xs text-muted-foreground mt-1">
                                  {t("mint_on-demand_to_save_gas_fees")}
                                </p>
                              </div>
                              <FormControl>
                                <Switch
                                  checked={field.value}
                                  onCheckedChange={field.onChange}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        {form.watch("isLazyMinted") && (
                          <FormField
                            control={form.control}
                            name="mintToBlockchain"
                            render={({ field }) => (
                              <FormItem className="flex items-center justify-between p-4 border rounded-lg bg-muted/30">
                                <div>
                                  <FormLabel className="flex items-center gap-2">
                                    <ChevronRight className="h-4 w-4" />
                                    {t("mint_to_blockchain")}
                                  </FormLabel>
                                  <p className="text-xs text-muted-foreground mt-1">
                                    {t("immediately_mint_to_blockchain_on_creation")}
                                  </p>
                                </div>
                                <FormControl>
                                  <Switch
                                    checked={field.value}
                                    onCheckedChange={field.onChange}
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        )}

                        {mintToBlockchain && (
                          <>
                            <FormField
                              control={form.control}
                              name="chain"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel className="flex items-center gap-2">
                                    <Layers className="h-4 w-4" />
                                    {t("blockchain_network")}
                                  </FormLabel>
                                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                                    <FormControl>
                                      <SelectTrigger>
                                        <SelectValue placeholder={t("select_network")} />
                                      </SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                      <SelectItem value="ETH">Ethereum (ETH)</SelectItem>
                                      <SelectItem value="BSC">Binance Smart Chain (BSC)</SelectItem>
                                      <SelectItem value="POLYGON">Polygon (MATIC)</SelectItem>
                                    </SelectContent>
                                  </Select>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />

                            <FormField
                              control={form.control}
                              name="recipientAddress"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel className="flex items-center gap-2">
                                    <Link className="h-4 w-4" />
                                    {t("recipient_address")}
                                  </FormLabel>
                                  <FormControl>
                                    <Input
                                      placeholder={t("wallet_address_optional")}
                                      {...field}
                                    />
                                  </FormControl>
                                  <p className="text-xs text-muted-foreground">
                                    {t("leave_empty_to_mint_to_your_address")}
                                  </p>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />

                            {gasEstimate && (
                              <Card className="bg-blue-50 border-blue-200">
                                <CardContent className="p-4">
                                  <GasEstimator
                                    operation="mint"
                                    chain={chain}
                                    showHeader={false}
                                  />
                                </CardContent>
                              </Card>
                            )}
                          </>
                        )}

                        <FormField
                          control={form.control}
                          name="isExplicitContent"
                          render={({ field }) => (
                            <FormItem className="flex items-center justify-between p-4 border rounded-lg">
                              <div>
                                <FormLabel className="flex items-center gap-2">
                                  <AlertCircle className="h-4 w-4" />
                                  {t("explicit_content")}
                                </FormLabel>
                                <p className="text-xs text-muted-foreground mt-1">
                                  {t("mark_if_this_nft_contains_explicit_content")}
                                </p>
                              </div>
                              <FormControl>
                                <Switch
                                  checked={field.value}
                                  onCheckedChange={field.onChange}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="isSensitiveContent"
                          render={({ field }) => (
                            <FormItem className="flex items-center justify-between p-4 border rounded-lg">
                              <div>
                                <FormLabel className="flex items-center gap-2">
                                  <Eye className="h-4 w-4" />
                                  {t("sensitive_content")}
                                </FormLabel>
                                <p className="text-xs text-muted-foreground mt-1">
                                  {t("mark_if_this_nft_contains_sensitive_content")}
                                </p>
                              </div>
                              <FormControl>
                                <Switch
                                  checked={field.value}
                                  onCheckedChange={field.onChange}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                    </CardContent>
                  </Card>
                </div>
                
                <div className="flex justify-between">
                  <Button 
                    type="button" 
                    variant="outline"
                    onClick={() => goToStep(2)}
                  >
                    {t("Back")}
                  </Button>
                  <Button 
                    type="button" 
                    onClick={() => goToStep(4)}
                    disabled={!canProceedToStep(4)}
                  >
                    {t("Preview")}
                    <Eye className="h-4 w-4 ml-2" />
                  </Button>
                </div>
              </TabsContent>

              {/* Step 4: Preview & Create */}
              <TabsContent value="step-4" className="space-y-8">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                  {/* NFT Preview */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Eye className="h-5 w-5" />
                        {t("nft_preview")}
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        {previewImage && (
                          <div className="relative aspect-square bg-muted rounded-xl overflow-hidden shadow-lg">
                            <Image
                              src={previewImage}
                              alt="NFT Preview"
                              fill
                              className="object-cover"
                            />
                          </div>
                        )}
                        
                        <div className="space-y-2">
                          <h3 className="font-semibold text-lg">
                            {form.watch("name") || t("untitled_nft")}
                          </h3>
                          {form.watch("description") && (
                            <p className="text-muted-foreground text-sm">
                              {form.watch("description")}
                            </p>
                          )}
                          
                          {tags.length > 0 && (
                            <div className="flex flex-wrap gap-1">
                              {tags.map((tag, index) => (
                                <Badge key={index} variant="secondary" className="text-xs">
                                  {tag}
                                </Badge>
                              ))}
                            </div>
                          )}
                        </div>

                        {attributes.length > 0 && (
                          <div className="space-y-2">
                            <h4 className="font-medium">{t("Attributes")}</h4>
                            <div className="grid grid-cols-2 gap-2">
                              {attributes.map((attr, index) => (
                                <div key={index} className="p-2 bg-muted rounded-lg">
                                  <p className="text-xs text-muted-foreground">{attr.trait_type}</p>
                                  <p className="font-medium text-sm">{attr.value}</p>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>

                  {/* Creation Summary */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <CheckCircle className="h-5 w-5" />
                        {t("creation_summary")}
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="space-y-3">
                        <div className="flex justify-between items-center">
                          <span className="text-sm">{t("minting_fee")}</span>
                          <Badge variant="secondary">
                            {form.watch("isLazyMinted") ? t("free_(lazy_mint)") : '~$5-10'}
                          </Badge>
                        </div>
                        
                        <div className="flex justify-between items-center">
                          <span className="text-sm">{t("Royalty")}</span>
                          <span className="text-sm font-medium">
                            {form.watch("royaltyPercentage") || 0}%
                          </span>
                        </div>
                        
                        <div className="flex justify-between items-center">
                          <span className="text-sm">{t("Blockchain")}</span>
                          <Badge>Ethereum</Badge>
                        </div>
                        
                        <Separator />
                        
                        <div className="space-y-2">
                          <h4 className="font-medium">{t("what_happens_next")}</h4>
                          <ul className="text-sm text-muted-foreground space-y-1">
                            <li>• {t("your_nft_will_be_created_on_the_blockchain")}</li>
                            <li>• {t("it_will_appear_in_your_dashboard")}</li>
                            <li>• {t("you_can_list_it_for_sale_anytime")}</li>
                          </ul>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
                
                <div className="flex justify-between">
                  <Button 
                    type="button" 
                    variant="outline"
                    onClick={() => goToStep(3)}
                  >
                    {t("Back")}
                  </Button>
                  <div className="flex gap-4">
                    <Button type="button" variant="outline" onClick={() => router.back()}>
                      {t("Cancel")}
                    </Button>
                    <Button 
                      type="submit" 
                      disabled={loading || uploadingImage}
                      size="lg"
                      className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white"
                    >
                      {loading ? (
                        <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                      ) : (
                        <Sparkles className="h-5 w-5 mr-2" />
                      )}
                      {loading ? t("creating") : t("create_nft")}
                    </Button>
                  </div>
                </div>
              </TabsContent>
            </Tabs>
          </form>
        </Form>
      </div>
    </div>
  );
} 