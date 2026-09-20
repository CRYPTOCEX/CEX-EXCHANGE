"use client";

import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { useRouter } from "@/i18n/routing";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
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
  FormDescription,
} from "@/components/ui/form";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  Upload,
  ArrowLeft,
  Image as ImageIcon,
  Package,
  Save,
  Info,
  Lock,
  Rocket,
  AlertCircle,
  CheckCircle2,
  Copy,
  ExternalLink,
} from "lucide-react";
import Image from "next/image";
import { useUserStore } from "@/store/user";
import { useNftStore } from "@/store/nft/nft-store";
import { $fetch } from "@/lib/api";
import { imageUploader } from "@/utils/upload";
import { toast } from "sonner";
import { ChainBadge } from "@/app/[locale]/(ext)/nft/components/shared/chain-icon";
import { useTranslations } from "next-intl";

const editCollectionSchema = z.object({
  name: z.string().min(1, "Collection name is required").max(255),
  symbol: z.string().min(1, "Symbol is required").max(10).toUpperCase(),
  description: z.string().max(1000).optional(),
  categoryId: z.string().min(1, "Category is required"),
  maxSupply: z.number().min(1).optional(),
  mintPrice: z.number().min(0).optional(),
  royaltyPercentage: z.number().min(0).max(50),
  isPublic: z.boolean(),
});

type EditCollectionFormData = z.infer<typeof editCollectionSchema>;

interface EditCollectionClientProps {
  initialCollection: any;
}

export default function EditCollectionClient({ initialCollection }: EditCollectionClientProps) {
  const t = useTranslations("ext_nft");
  const tCommon = useTranslations("common");
  const tExt = useTranslations("ext");
  const router = useRouter();
  const { user } = useUserStore();
  const { categories, fetchCategories } = useNftStore();

  /**
   * The list offered for selection, plus this collection's own category when
   * that has since been retired.
   *
   * The options endpoint returns active categories only, which is right for
   * choosing one — a retired category should not take new work. But an EDIT
   * form also has to show what the record already says, and without this the
   * trigger falls back to its "Select a category" placeholder, so a collection
   * that does have a category reads as though it has none.
   */
  const categoryOptions = useMemo(() => {
    const list = Array.isArray(categories) ? categories : [];
    const current = initialCollection.category;
    if (current?.id && !list.some((c: any) => c.id === current.id)) {
      return [...list, { ...current, retired: true }];
    }
    return list;
  }, [categories, initialCollection.category]);

  const [logoImage, setLogoImage] = useState<string>(initialCollection.logoImage || "");
  const [bannerImage, setBannerImage] = useState<string>(initialCollection.bannerImage || "");
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [uploadingBanner, setUploadingBanner] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [dragActiveLogo, setDragActiveLogo] = useState(false);
  const [dragActiveBanner, setDragActiveBanner] = useState(false);
  const [isDeploying, setIsDeploying] = useState(false);
  const [isEnablingMint, setIsEnablingMint] = useState(false);
  const [publicMintEnabled, setPublicMintEnabled] = useState(
    Boolean(initialCollection.isPublicMint)
  );

  /**
   * Turn on public minting for a deployed collection.
   *
   * The on-chain toggle is onlyOwner (enablePublicMint verifies that before
   * sending), and the DB flag is updated afterwards so the two stop diverging —
   * the contract is the source of truth, the column is what the UI reads.
   */
  const handleEnablePublicMint = useCallback(async () => {
    if (!initialCollection.contractAddress) return;
    setIsEnablingMint(true);
    try {
      const { enablePublicMint } = await import("@/utils/enable-public-mint");
      const result = await enablePublicMint(initialCollection.contractAddress);

      if (!result.success) {
        toast.error(result.error || t("failed_to_enable_public_minting"));
        return;
      }

      // Persist to the DB so the marketplace reflects it without re-reading chain.
      const { error } = await $fetch({
        url: `/api/nft/collection/${initialCollection.id}`,
        method: "PUT",
        body: { isPublicMint: true },
      });

      setPublicMintEnabled(true);
      toast.success(
        error
          ? t("public_minting_enabled_on_chain_but")
          : t("public_minting_enabled")
      );
    } finally {
      setIsEnablingMint(false);
    }
  }, [initialCollection.contractAddress, initialCollection.id]);
  const logoInputRef = useRef<HTMLInputElement>(null);
  const bannerInputRef = useRef<HTMLInputElement>(null);

  const form = useForm<EditCollectionFormData>({
    // @ts-ignore - Complex type inference causing build issues
    resolver: zodResolver(editCollectionSchema),
    defaultValues: {
      name: initialCollection.name || "",
      symbol: initialCollection.symbol || "",
      description: initialCollection.description || "",
      categoryId: initialCollection.categoryId || initialCollection.category?.id || "",
      maxSupply: initialCollection.maxSupply || undefined,
      mintPrice: initialCollection.mintPrice ? parseFloat(initialCollection.mintPrice) : undefined,
      royaltyPercentage: initialCollection.royaltyPercentage ? parseFloat(initialCollection.royaltyPercentage) : 2.5,
      isPublic: initialCollection.isPublic ?? true,
    },
  });

  useEffect(() => {
    if (user) {
      fetchCategories();
    }
  }, [user, fetchCategories]);

  const handleImageUpload = useCallback(async (
    file: File,
    type: "logo" | "banner"
  ) => {
    if (!file.type.startsWith("image/")) {
      toast.error(tCommon("please_select_an_image_file"));
      return;
    }

    const setUploading = type === "logo" ? setUploadingLogo : setUploadingBanner;
    const setImage = type === "logo" ? setLogoImage : setBannerImage;

    setUploading(true);
    try {
      const result = await imageUploader({ file, dir: 'nft-collections', size: { maxWidth: 1200, maxHeight: 1200 } });
      if (result?.success && result.url) {
        setImage(result.url);
        toast.success(`${type === "logo" ? tCommon("logo") : tExt("banner")} uploaded successfully`);
      } else {
        toast.error(result?.error || tCommon("failed_to_upload_image"));
      }
    } catch (error) {
      console.error("Error uploading image:", error);
      toast.error(tCommon("failed_to_upload_image"));
    } finally {
      setUploading(false);
    }
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent, type: "logo" | "banner") => {
      e.preventDefault();
      const setDragActive = type === "logo" ? setDragActiveLogo : setDragActiveBanner;
      setDragActive(false);

      const file = e.dataTransfer.files[0];
      if (file) {
        handleImageUpload(file, type);
      }
    },
    [handleImageUpload]
  );

  const onSubmit = async (data: EditCollectionFormData) => {
    if (!logoImage) {
      toast.error(t("please_upload_a_logo_image"));
      return;
    }

    setIsSubmitting(true);
    try {
      const { error } = await $fetch({
        url: `/api/nft/collection/${initialCollection.id}`,
        method: "PUT",
        body: {
          ...data,
          logoImage,
          bannerImage,
        },
      });

      if (error) {
        toast.error(typeof error === 'string' ? error : t("failed_to_update_collection"));
        return;
      }

      toast.success(t("collection_updated_successfully"));
      router.push("/nft/creator");
    } catch (error) {
      console.error("Error updating collection:", error);
      toast.error(t("failed_to_update_collection"));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeployCollection = async () => {
    if (!initialCollection) return;

    setIsDeploying(true);
    try {
      const response = await $fetch({
        url: "/api/nft/contract/deploy",
        method: "POST",
        body: {
          collectionId: initialCollection.id,
          chain: initialCollection.chain,
          standard: initialCollection.standard || "ERC721",
          name: initialCollection.name,
          symbol: initialCollection.symbol,
          baseURI: initialCollection.baseURI,
          maxSupply: initialCollection.maxSupply,
          royaltyPercentage: initialCollection.royaltyPercentage,
          mintPrice: initialCollection.mintPrice,
          isPublicMint: initialCollection.isPublicMint
        }
      });

      if (response.data) {
        toast.success(t("collection_deployed_successfully_contract", { contractAddress: String(response.data.contractAddress) }));
        // Refresh collection data
        window.location.reload();
      }
    } catch (error: any) {
      console.error("Error deploying collection:", error);
      toast.error(error.message || t("failed_to_deploy_collection"));
    } finally {
      setIsDeploying(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success(tCommon("copied_to_clipboard"));
  };

  return (
    <div className="min-h-screen bg-muted py-8">
      <div className="container max-w-4xl">
        <Button
          variant="ghost"
          onClick={() => router.back()}
          className="mb-6"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          {t("back_to_collections")}
        </Button>

        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2">{tExt("edit_collection")}</h1>
          <p className="text-muted-foreground">
            {t("update_your_collection_details_and_settings")}
          </p>
        </div>

        {/* Deployment Status Banner */}
        {initialCollection.contractAddress ? (
          <Card className="mb-6 border-success/20 dark:border-success/50 bg-success/5 dark:bg-success/20">
            <CardContent className="p-6">
              <div className="flex items-start gap-4">
                <div className="p-3 bg-success/10 dark:bg-success/30 rounded-full">
                  <CheckCircle2 className="h-6 w-6 text-success" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-success mb-2">
                    {t("collection_deployed_to_blockchain")}
                  </h3>
                  <p className="text-sm text-success mb-3">
                    This collection is permanently deployed on the {initialCollection.chain} blockchain.
                    Contract details below are immutable and cannot be changed.
                  </p>
                  <div className="flex flex-col sm:flex-row gap-3">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold text-success">{tCommon("contract")}:</span>
                      <code className="text-xs bg-success/10 dark:bg-success/50 px-2 py-1 rounded text-success-ink">
                        {initialCollection.contractAddress.slice(0, 10)}...{initialCollection.contractAddress.slice(-8)}
                      </code>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-6 w-6 p-0"
                        onClick={() => copyToClipboard(initialCollection.contractAddress)}
                      >
                        <Copy className="h-3 w-3" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-6 w-6 p-0"
                        onClick={() => window.open(`https://etherscan.io/address/${initialCollection.contractAddress}`, "_blank")}
                      >
                        <ExternalLink className="h-3 w-3" />
                      </Button>
                    </div>

                    {/* Public minting toggle — owner-only, verified before sending */}
                    {publicMintEnabled ? (
                      <div className="flex items-center gap-2 text-xs font-semibold text-success">
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        {t("public_minting_enabled")}
                      </div>
                    ) : (
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={isEnablingMint}
                        onClick={handleEnablePublicMint}
                      >
                        {isEnablingMint ? `${t("enabling")}…` : t("enable_public_mint")}
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card className="mb-6 border-warning/20 dark:border-warning/50 bg-warning/5 dark:bg-warning/20">
            <CardContent className="p-6">
              <div className="flex items-start gap-4">
                <div className="p-3 bg-warning/10 dark:bg-warning/30 rounded-full">
                  <AlertCircle className="h-6 w-6 text-warning" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-warning mb-2">
                    {t("collection_not_yet_deployed")}
                  </h3>
                  <p className="text-sm text-warning mb-4">
                    {t("this_collection_exists_only_in_the")}
                  </p>
                  <Button
                    onClick={handleDeployCollection}
                    loading={isDeploying}
                    className={`bg-primary hover:bg-primary text-primary-foreground`}
                  >
                    {isDeploying ? (
                      `${tExt("deploying")}…`
                    ) : (
                      <>
                        <Rocket className="h-4 w-4 mr-2" />
                        {t("deploy_to_blockchain")}
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
            {/* Images */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ImageIcon className="h-5 w-5" />
                  {t("collection_images")}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Logo Image */}
                <div>
                  <FormLabel className="text-base mb-3 block">{t("logo_image")} *</FormLabel>
                  <div
                    onDragOver={(e) => {
                      e.preventDefault();
                      setDragActiveLogo(true);
                    }}
                    onDragLeave={() => setDragActiveLogo(false)}
                    onDrop={(e) => handleDrop(e, "logo")}
                    className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                      dragActiveLogo
                        ? "border-primary bg-primary/5"
                        : "border-border"
                    }`}
                  >
                    {logoImage ? (
                      <div className="space-y-4">
                        <div className="relative w-48 h-48 mx-auto">
                          <Image
                            src={logoImage}
                            alt={tCommon("logo_preview")}
                            fill
                            className="object-cover rounded-lg"
                          />
                        </div>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => logoInputRef.current?.click()}
                          loading={uploadingLogo}
                        >
                          {uploadingLogo ? (
                            `${tCommon("uploading")}…`
                          ) : (
                            <>
                              <Upload className="h-4 w-4 mr-2" />
                              {t("change_logo")}
                            </>
                          )}
                        </Button>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        <Upload className="h-12 w-12 mx-auto text-muted-foreground" />
                        <div>
                          <Button
                            type="button"
                            variant="outline"
                            onClick={() => logoInputRef.current?.click()}
                            loading={uploadingLogo}
                          >
                            {uploadingLogo ? (
                              `${tCommon("uploading")}…`
                            ) : (
                              <>
                                <Upload className="h-4 w-4 mr-2" />
                                {tCommon("upload_logo")}
                              </>
                            )}
                          </Button>
                          <p className="text-xs text-muted-foreground mt-2">
                            {t("recommended_500x500px_max_5mb")}
                          </p>
                        </div>
                      </div>
                    )}
                    <input
                      ref={logoInputRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) handleImageUpload(file, "logo");
                      }}
                    />
                  </div>
                </div>

                {/* Banner Image */}
                <div>
                  <FormLabel className="text-base mb-3 block">Banner Image (Optional)</FormLabel>
                  <div
                    onDragOver={(e) => {
                      e.preventDefault();
                      setDragActiveBanner(true);
                    }}
                    onDragLeave={() => setDragActiveBanner(false)}
                    onDrop={(e) => handleDrop(e, "banner")}
                    className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                      dragActiveBanner
                        ? "border-primary bg-primary/5"
                        : "border-border"
                    }`}
                  >
                    {bannerImage ? (
                      <div className="space-y-4">
                        <div className="relative w-full h-48 mx-auto">
                          <Image
                            src={bannerImage}
                            alt={t("banner_preview")}
                            fill
                            className="object-cover rounded-lg"
                          />
                        </div>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => bannerInputRef.current?.click()}
                          loading={uploadingBanner}
                        >
                          {uploadingBanner ? (
                            `${tCommon("uploading")}…`
                          ) : (
                            <>
                              <Upload className="h-4 w-4 mr-2" />
                              {t("change_banner")}
                            </>
                          )}
                        </Button>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        <Upload className="h-12 w-12 mx-auto text-muted-foreground" />
                        <div>
                          <Button
                            type="button"
                            variant="outline"
                            onClick={() => bannerInputRef.current?.click()}
                            loading={uploadingBanner}
                          >
                            {uploadingBanner ? (
                              `${tCommon("uploading")}…`
                            ) : (
                              <>
                                <Upload className="h-4 w-4 mr-2" />
                                {t("upload_banner")}
                              </>
                            )}
                          </Button>
                          <p className="text-xs text-muted-foreground mt-2">
                            {t("recommended_1400x400px_max_10mb")}
                          </p>
                        </div>
                      </div>
                    )}
                    <input
                      ref={bannerInputRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) handleImageUpload(file, "banner");
                      }}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Basic Information */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Package className="h-5 w-5" />
                  {tCommon("basic_information")}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-base flex items-center gap-2">
                        {tExt("collection_name")} *
                        {initialCollection.contractAddress && (
                          <Badge variant="secondary" className="text-xs">
                            <Lock className="h-3 w-3 mr-1" />
                            Immutable
                          </Badge>
                        )}
                      </FormLabel>
                      <FormControl>
                        <Input
                          placeholder={"e.g." + ", " + t("my_awesome_collection")}
                          {...field}
                          disabled={!!initialCollection.contractAddress}
                        />
                      </FormControl>
                      {initialCollection.contractAddress && (
                        <FormDescription className="text-warning">
                          {t("cannot_be_changed_after_deployment_to_blockchain")}
                        </FormDescription>
                      )}
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="symbol"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-base flex items-center gap-2">
                        {tCommon("symbol")} *
                        {initialCollection.contractAddress && (
                          <Badge variant="secondary" className="text-xs">
                            <Lock className="h-3 w-3 mr-1" />
                            Immutable
                          </Badge>
                        )}
                      </FormLabel>
                      <FormControl>
                        <Input
                          placeholder={"e.g." + ", " + t("mac")}
                          {...field}
                          maxLength={10}
                          disabled={!!initialCollection.contractAddress}
                        />
                      </FormControl>
                      <FormDescription>
                        Short identifier for your collection (2-10 characters)
                        {initialCollection.contractAddress && (
                          <span className="block text-warning mt-1">
                            {t("cannot_be_changed_after_deployment_to_blockchain")}
                          </span>
                        )}
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
                          placeholder={`${t("describe_your_collection")}…`}
                          rows={4}
                          {...field}
                        />
                      </FormControl>
                      <FormDescription>
                        {t("tell_collectors_what_makes_your_collection_special")}
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
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder={tCommon("select_a_category")} />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {categoryOptions.length > 0 ? (
                            categoryOptions.map((category: any) => (
                              <SelectItem key={category.id} value={category.id}>
                                {category.name}
                                {category.retired ? "(" + tCommon("retired") + ")" : ""}
                              </SelectItem>
                            ))
                          ) : (
                            <div className="px-2 py-1.5 text-sm text-muted-foreground">
                              {t("no_categories_available")}
                            </div>
                          )}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>

            {/* Blockchain Info (Read-only) */}
            <Card className="border-border-strong">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Lock className="h-5 w-5" />
                  Blockchain Information (Immutable)
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
                  <span className="text-sm font-medium">{tExt("blockchain")}:</span>
                  <ChainBadge chain={initialCollection.chain} variant="secondary" />
                </div>
                <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
                  <span className="text-sm font-medium">{tCommon("network")}:</span>
                  <Badge variant="secondary">{initialCollection.network}</Badge>
                </div>
                <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
                  <span className="text-sm font-medium">{tExt("token_standard")}:</span>
                  <Badge variant="secondary">{initialCollection.standard}</Badge>
                </div>
                {initialCollection.contractAddress && (
                  <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
                    <span className="text-sm font-medium">{tExt("contract_address")}:</span>
                    <code className="text-xs bg-muted px-2 py-1 rounded">
                      {initialCollection.contractAddress.slice(0, 6)}...{initialCollection.contractAddress.slice(-4)}
                    </code>
                  </div>
                )}
                <div className="flex items-center gap-2 text-xs text-muted-foreground p-2">
                  <Info className="h-4 w-4" />
                  <span>{t("these_blockchain_properties_cannot_be_changed")}</span>
                </div>
              </CardContent>
            </Card>

            {/* Collection Settings */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Package className="h-5 w-5" />
                  {t("collection_settings")}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <FormField
                  control={form.control}
                  name="royaltyPercentage"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-base">Creator Royalty (%)</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          step="0.1"
                          min="0"
                          max="50"
                          placeholder="2.5"
                          {...field}
                          onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                        />
                      </FormControl>
                      <FormDescription>
                        Percentage of sales you'll receive on secondary markets (0-50%)
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
                        Maximum Supply (Optional)
                        {initialCollection.contractAddress && (
                          <Badge variant="secondary" className="text-xs">
                            <Lock className="h-3 w-3 mr-1" />
                            Immutable
                          </Badge>
                        )}
                      </FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min="1"
                          placeholder={t("leave_empty_for_unlimited")}
                          {...field}
                          value={field.value || ""}
                          onChange={(e) => field.onChange(e.target.value ? parseInt(e.target.value) : undefined)}
                          disabled={!!initialCollection.contractAddress}
                        />
                      </FormControl>
                      <FormDescription>
                        {t("maximum_number_of_nfts_that_can")}
                        {initialCollection.contractAddress && (
                          <span className="block text-warning mt-1">
                            {t("cannot_be_changed_after_deployment_to_blockchain")}
                          </span>
                        )}
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
                      <FormLabel className="text-base">Mint Price (Optional)</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          step="0.0001"
                          min="0"
                          placeholder="0.0001"
                          {...field}
                          value={field.value || ""}
                          onChange={(e) => field.onChange(e.target.value ? parseFloat(e.target.value) : undefined)}
                        />
                      </FormControl>
                      <FormDescription>
                        {t("price_to_mint_each_nft_in")} {initialCollection.currency || t("native_currency")})
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="isPublic"
                  render={({ field }) => (
                    <FormItem className="flex items-center justify-between p-4 border rounded-lg">
                      <div>
                        <FormLabel className="text-base">{t("public_collection")}</FormLabel>
                        <FormDescription className="mt-1">
                          {t("make_this_collection_visible_to_everyone")}
                        </FormDescription>
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
              </CardContent>
            </Card>

            {/* Submit Button */}
            <div className="flex gap-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => router.back()}
                disabled={isSubmitting}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                loading={isSubmitting}
                disabled={uploadingLogo || uploadingBanner}
                className="flex-1"
              >
                {isSubmitting ? (
                  `${tCommon("updating")}…`
                ) : (
                  <>
                    <Save className="h-4 w-4 mr-2" />
                    {t("update_collection")}
                  </>
                )}
              </Button>
            </div>
          </form>
        </Form>
      </div>
    </div>
  );
}
