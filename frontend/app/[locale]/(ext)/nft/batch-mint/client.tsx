"use client";

import { useState, useCallback, useRef } from "react";
import { useRouter, Link } from "@/i18n/routing";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { StatusBadge } from "@/components/ui/status-badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { 
  Upload, 
  X, 
  Plus, 
  Loader2,
  CheckCircle,
  AlertCircle,
  Download,
  FileSpreadsheet,
  Image as ImageIcon,
  Layers,
  Package,
  Zap,
  DollarSign,
  Copy,
  Trash2,
  Save,
  Send,
  ArrowLeft
} from "lucide-react";
import { useUserStore } from "@/store/user";
import { useKycGate } from "@/hooks/use-kyc-gate";
import KycRequiredNotice from "@/components/blocks/kyc/kyc-required-notice";
import { useNftStore } from "@/store/nft/nft-store";
import { imageUploader } from "@/utils/upload";
import { toast } from "sonner";
import { $fetch } from "@/lib/api";
import * as XLSX from "xlsx";
import {
  ChainBadge,
  CurrencyIcon,
  chainNativeCurrency,
} from "@/app/[locale]/(ext)/nft/components/shared/chain-icon";
import { CollectionAvatar } from "@/app/[locale]/(ext)/nft/components/shared/collection-avatar";

interface BatchToken {
  id: string;
  name: string;
  description: string;
  image: string;
  imageFile?: File;
  attributes: Array<{ trait_type: string; value: string }>;
  category?: string;
  tags?: string[];
  royaltyPercentage?: number;
  status: "pending" | "uploading" | "ready" | "minting" | "success" | "error";
  error?: string;
}

export function BatchMintClient() {
  const tExtNft = useTranslations("ext_nft");
  const t = useTranslations("ext_nft");
  const tCommon = useTranslations("common");
  const tExt = useTranslations("ext");
  const router = useRouter();
  const { user } = useUserStore();
  const gate = useKycGate("create_nft");
  const { collections, fetchCollections, loading: collectionsLoading } = useNftStore();
  
  const [selectedCollection, setSelectedCollection] = useState("");
  const [tokens, setTokens] = useState<BatchToken[]>([]);
  const [uploadMethod, setUploadMethod] = useState<"manual" | "csv" | "folder">("manual");
  const [isMinting, setIsMinting] = useState(false);
  const [mintToBlockchain, setMintToBlockchain] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);
  const [uploadProgress, setUploadProgress] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const folderInputRef = useRef<HTMLInputElement>(null);

  // Template for CSV
  const csvTemplate = `name,description,image_url,category,tags,trait_type_1,trait_value_1,trait_type_2,trait_value_2
Cool NFT #1,An amazing NFT,https://example.com/image1.jpg,Art,"tag1,tag2",Background,Blue,Eyes,Green
Cool NFT #2,Another NFT,https://example.com/image2.jpg,Art,"tag3,tag4",Background,Red,Eyes,Brown`;

  const addToken = () => {
    const newToken: BatchToken = {
      id: `token-${Date.now()}-${Math.random()}`,
      name: "",
      description: "",
      image: "",
      attributes: [],
      status: "pending"
    };
    setTokens([...tokens, newToken]);
  };

  const updateToken = (id: string, updates: Partial<BatchToken>) => {
    setTokens(tokens.map(token => 
      token.id === id ? { ...token, ...updates } : token
    ));
  };

  const removeToken = (id: string) => {
    setTokens(tokens.filter(token => token.id !== id));
  };

  const duplicateToken = (id: string) => {
    const token = tokens.find(t => t.id === id);
    if (token) {
      const newToken = {
        ...token,
        id: `token-${Date.now()}-${Math.random()}`,
        name: `${token.name} (Copy)`,
        status: "pending" as const
      };
      setTokens([...tokens, newToken]);
    }
  };

  const handleImageUpload = async (tokenId: string, file: File) => {
    try {
      updateToken(tokenId, { status: "uploading" });
      
      const result = await imageUploader({
          file,
          dir: 'nft-tokens',
          size: { maxWidth: 2048, maxHeight: 2048 }
        });

      if (result.success && result.url) {
        updateToken(tokenId, {
          image: result.url,
          imageFile: file,
          status: "ready"
        });
      } else {
        throw new Error(result.error || "Upload failed");
      }
    } catch (error) {
      updateToken(tokenId, {
        status: "error",
        error: tCommon("failed_to_upload_image")
      });
      toast.error(tCommon("failed_to_upload_image"));
    }
  };

  const handleCSVUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const reader = new FileReader();
      reader.onload = async (event) => {
        const text = event.target?.result as string;
        const rows = text.split("\n").map(row => row.split(","));
        const headers = rows[0];
        
        const newTokens: BatchToken[] = [];
        
        for (let i = 1; i < rows.length; i++) {
          const row = rows[i];
          if (row.length < 3) continue;
          
          const token: BatchToken = {
            id: `token-${Date.now()}-${i}`,
            name: row[0] || `NFT #${i}`,
            description: row[1] || "",
            image: row[2] || "",
            category: row[3] || "",
            tags: row[4]?.split(";") || [],
            attributes: [],
            status: "ready"
          };
          
          // Parse attributes
          for (let j = 5; j < row.length; j += 2) {
            if (row[j] && row[j + 1]) {
              token.attributes.push({
                trait_type: row[j],
                value: row[j + 1]
              });
            }
          }
          
          newTokens.push(token);
        }
        
        setTokens(newTokens);
        toast.success(tExtNft("loaded_tokens_from_csv", { length: newTokens.length }));
      };
      
      reader.readAsText(file);
    } catch (error) {
      toast.error(tExtNft("failed_to_parse_csv_file"));
    }
  };

  const handleFolderUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const imageFiles = files.filter(file => 
      file.type.startsWith("image/")
    );
    
    if (imageFiles.length === 0) {
      toast.error(tExtNft("no_image_files_found_in_folder"));
      return;
    }
    
    const newTokens: BatchToken[] = [];
    
    for (let i = 0; i < imageFiles.length; i++) {
      const file = imageFiles[i];
      const name = file.name.replace(/\.[^/.]+$/, ""); // Remove extension
      
      newTokens.push({
        id: `token-${Date.now()}-${i}`,
        name: name,
        description: "",
        image: "",
        imageFile: file,
        attributes: [],
        status: "pending"
      });
    }
    
    setTokens(newTokens);
    toast.success(tExtNft("loaded_images", { length: newTokens.length }));
    
    // Upload all images
    for (const token of newTokens) {
      if (token.imageFile) {
        await handleImageUpload(token.id, token.imageFile);
      }
    }
  };

  const downloadTemplate = () => {
    const blob = new Blob([csvTemplate], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "nft-batch-template.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  const validateTokens = (): boolean => {
    if (!selectedCollection) {
      toast.error(tExtNft("please_select_a_collection"));
      return false;
    }
    
    if (tokens.length === 0) {
      toast.error(tExtNft("please_add_at_least_one_token"));
      return false;
    }
    
    for (const token of tokens) {
      if (!token.name) {
        toast.error(tExtNft("token_is_missing_a_name", { id: String(token.id) }));
        return false;
      }
      if (!token.image && !token.imageFile) {
        toast.error(tExtNft("token_is_missing_an_image", { name: String(token.name) }));
        return false;
      }
    }
    
    return true;
  };

  const handleBatchMint = async () => {
    if (!validateTokens()) return;
    
    setIsMinting(true);
    setUploadProgress(0);
    
    try {
      // Upload any pending images
      const tokensToUpload = tokens.filter(t => t.imageFile && !t.image);
      for (let i = 0; i < tokensToUpload.length; i++) {
        const token = tokensToUpload[i];
        if (token.imageFile) {
          await handleImageUpload(token.id, token.imageFile);
        }
        setUploadProgress((i + 1) / tokensToUpload.length * 50);
      }
      
      // Prepare batch mint request
      const mintRequest = {
        collectionId: selectedCollection,
        tokens: tokens.map(t => ({
          name: t.name,
          description: t.description,
          image: t.image,
          attributes: t.attributes,
          category: t.category,
          tags: t.tags,
          royaltyPercentage: t.royaltyPercentage
        })),
        mintToBlockchain,
        recipientAddress: user?.walletAddress
      };
      
      // Call batch mint API
      const response = await $fetch({
        url: "/api/nft/token/batch-mint",
        method: "POST",
        body: mintRequest
      });
      
      if (response.data) {
        const { successfulMints, failedMints, tokens: results } = response.data;
        
        // Update token statuses
        results.forEach((result: any, index: number) => {
          updateToken(tokens[index].id, {
            status: result.success ? "success" : "error",
            error: result.error
          });
        });
        
        toast.success(tExtNft("batch_mint_completed_successful_failed", { successfulMints: String(successfulMints), failedMints: String(failedMints) }));
        
        if (successfulMints > 0) {
          setTimeout(() => {
            router.push("/nft/creator?tab=nfts");
          }, 2000);
        }
      }
    } catch (error) {
      toast.error(tExtNft("batch_mint_failed"));
      console.error(error);
    } finally {
      setIsMinting(false);
    }
  };

  // Only the copy stays local — the hue comes from the one status table.
  const statusLabels: Record<BatchToken["status"], string> = {
    pending: "Pending",
    uploading: `${tCommon("uploading")}…`,
    ready: "Ready",
    minting: `${tCommon("minting")}…`,
    success: "Success",
    error: tCommon("error")
  };

  const getStatusBadge = (status: BatchToken["status"]) => (
    <StatusBadge status={status} label={statusLabels[status]} />
  );

  // Filter deployed collections
  const deployedCollections = collections.filter(
    (c: any) => c.contractAddress && c.status === "ACTIVE"
  );

  /** See the note at the warning itself: a claim, not chrome. */
  const showNoCollectionsWarning =
    !collectionsLoading && deployedCollections.length === 0;

  // Gas is quoted in the coin of the chain the chosen collection lives on.
  const mintChain = deployedCollections.find(
    (c: any) => c.id === selectedCollection
  )?.chain;
  const gasCurrency = chainNativeCurrency(mintChain);

  // Batch minting is the same `create_nft` action as the single-mint page, so it
  // carries the same gate. The page has no sign-in prompt of its own, so
  // "anonymous" renders nothing rather than a KYC notice.
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
    <div className="container py-8">
      {/* Back Button */}
      <div className="mb-6">
        <Button
          variant="ghost"
          onClick={() => router.push("/nft/creator?tab=nfts")}
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          {t("back_to_nfts")}
        </Button>
      </div>

      {/*
        No Deployed Collections Warning.

        `deployedCollections` is derived from `collections`, which the store
        starts EMPTY and fills from a fetch — so `length === 0` was true on every
        single visit for as long as that request took, and this 68px amber alert
        told creators with a dozen live collections that they had none and should
        go make one. Then it removed itself, moving the page heading, the
        three-step progress bar and the whole wizard up by 92px.

        `showNoCollectionsWarning` is a named claim about the account, and it can
        only be made once the account's collections are actually known. There is
        no faithful pending shape for a warning that may not apply: the honest
        pending state is to assert nothing.
      */}
      {showNoCollectionsWarning && (
        <Alert className="mb-6 border-warning/20 bg-warning/5 dark:bg-warning/20">
          <AlertCircle className="h-4 w-4 text-warning" />
          <AlertDescription className="text-warning">
            {t("you_need_at_least_one_deployed")}{" "}
            <Link href="/nft/collection/create" className="font-medium underline">
              {t("create_a_collection")}
            </Link>{" "}
            {t("first_then_deploy_it_to_the_blockchain")}
          </AlertDescription>
        </Alert>
      )}

      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">{t("batch_mint_nfts")}</h1>
        <p className="text-muted-foreground">
          {t("create_multiple_nfts_at_once_maximum")}
        </p>
      </div>

      {/* Progress Steps */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          {[
            { step: 1, label: tExtNft("select_collection") },
            { step: 2, label: tExtNft("add_tokens") },
            { step: 3, label: tExtNft("review_mint") }
          ].map(({ step, label }) => (
            <div key={step} className="flex items-center flex-1">
              <div className={`
                flex items-center justify-center w-10 h-10 rounded-full
                ${currentStep >= step ? "bg-primary text-primary-foreground" : "bg-muted"}
              `}>
                {currentStep > step ? <CheckCircle className="h-5 w-5" /> : step}
              </div>
              <span className={`ml-2 ${currentStep >= step ? "font-medium" : "text-muted-foreground"}`}>
                {label}
              </span>
              {step < 3 && (
                <div className={`flex-1 h-1 mx-4 ${currentStep > step ? "bg-primary" : "bg-muted"}`} />
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Step 1: Collection Selection */}
      {currentStep === 1 && (
        <Card>
          <CardHeader>
            <CardTitle>{t("select_collection")}</CardTitle>
            <CardDescription>
              {t("choose_which_collection_these_nfts_will_belong_to")}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Select value={selectedCollection} onValueChange={setSelectedCollection}>
              <SelectTrigger>
                <SelectValue placeholder={t("select_a_collection")} />
              </SelectTrigger>
              <SelectContent>
                {deployedCollections.length > 0 ? (
                  deployedCollections.map((collection: any) => (
                    <SelectItem key={collection.id} value={collection.id}>
                      <div className="flex items-center gap-2">
                        <CollectionAvatar
                          src={collection.logoImage}
                          name={collection.name}
                          size={20}
                        />
                        {collection.name}
                        <ChainBadge chain={collection.chain} variant="outline" className="ml-2" />
                        <Badge variant="outline">
                          {collection.tokenCount || 0}/{collection.maxSupply || "∞"}
                        </Badge>
                      </div>
                    </SelectItem>
                  ))
                ) : (
                  <div className="p-4 text-sm text-muted-foreground text-center">
                    {t("no_deployed_collections_available")}
                  </div>
                )}
              </SelectContent>
            </Select>
            
            <div className="flex justify-end gap-2">
              <Button
                onClick={() => setCurrentStep(2)}
                disabled={!selectedCollection}
              >
                Next
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 2: Add Tokens */}
      {currentStep === 2 && (
        <div className="space-y-6">
          {/* Upload Method Selection */}
          <Card>
            <CardHeader>
              <CardTitle>{t("upload_method")}</CardTitle>
            </CardHeader>
            <CardContent>
              <Tabs value={uploadMethod} onValueChange={(v: any) => setUploadMethod(v)}>
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="manual">{t("manual_entry")}</TabsTrigger>
                  <TabsTrigger value="csv">{t("csv_upload")}</TabsTrigger>
                  <TabsTrigger value="folder">{t("folder_upload")}</TabsTrigger>
                </TabsList>
                
                <TabsContent value="manual" className="space-y-4">
                  <Button onClick={addToken} className="w-full">
                    <Plus className="h-4 w-4 mr-2" />
                    {t("add_token")}
                  </Button>
                </TabsContent>
                
                <TabsContent value="csv" className="space-y-4">
                  <div className="border-2 border-dashed rounded-lg p-8 text-center">
                    <FileSpreadsheet className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                    <p className="mb-4">{t("upload_a_csv_file_with_your_nft_data")}</p>
                    <div className="flex gap-2 justify-center">
                      <Button variant="outline" onClick={downloadTemplate}>
                        <Download className="h-4 w-4 mr-2" />
                        {tCommon("download_template")}
                      </Button>
                      <Button onClick={() => fileInputRef.current?.click()}>
                        <Upload className="h-4 w-4 mr-2" />
                        {t("upload_csv")}
                      </Button>
                    </div>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".csv"
                      className="hidden"
                      onChange={handleCSVUpload}
                    />
                  </div>
                </TabsContent>
                
                <TabsContent value="folder" className="space-y-4">
                  <div className="border-2 border-dashed rounded-lg p-8 text-center">
                    <Layers className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                    <p className="mb-4">{t("select_a_folder_with_images_to_create_nfts")}</p>
                    <Button onClick={() => folderInputRef.current?.click()}>
                      <Upload className="h-4 w-4 mr-2" />
                      {t("select_folder")}
                    </Button>
                    <input
                      ref={folderInputRef}
                      type="file"
                      multiple
                      accept="image/*"
                      className="hidden"
                      onChange={handleFolderUpload}
                    />
                  </div>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>

          {/* Tokens List */}
          {tokens.length > 0 && (
            <Card>
              <CardHeader>
                <div className="flex justify-between items-center">
                  <CardTitle>Tokens ({tokens.length})</CardTitle>
                  <Badge variant="outline">
                    {tokens.filter(t => t.status === "ready" || t.status === "success").length} Ready
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4 max-h-[500px] overflow-y-auto">
                  {tokens.map((token, index) => (
                    <Card key={token.id} className="p-4">
                      <div className="flex gap-4">
                        {/* Image */}
                        <div className="relative w-24 h-24 bg-muted rounded-lg overflow-hidden">
                          {token.image ? (
                            <img src={token.image} alt={token.name} className="w-full h-full object-cover" />
                          ) : (
                            <label className="flex items-center justify-center w-full h-full cursor-pointer hover:bg-muted/80">
                              <ImageIcon className="h-8 w-8 text-muted-foreground" />
                              <input
                                type="file"
                                accept="image/*"
                                className="hidden"
                                onChange={(e) => {
                                  const file = e.target.files?.[0];
                                  if (file) handleImageUpload(token.id, file);
                                }}
                              />
                            </label>
                          )}
                        </div>
                        
                        {/* Details */}
                        <div className="flex-1 space-y-2">
                          <div className="flex gap-2">
                            <Input
                              placeholder="Token Name"
                              value={token.name}
                              onChange={(e) => updateToken(token.id, { name: e.target.value })}
                              className="flex-1"
                            />
                            {getStatusBadge(token.status)}
                          </div>
                          <Textarea
                            placeholder="Description (optional)"
                            value={token.description}
                            onChange={(e) => updateToken(token.id, { description: e.target.value })}
                            rows={2}
                          />
                        </div>
                        
                        {/* Actions */}
                        <div className="flex flex-col gap-1">
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => duplicateToken(token.id)}
                          >
                            <Copy className="h-4 w-4" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => removeToken(token.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                      
                      {token.error && (
                        <Alert variant="destructive" className="mt-2">
                          <AlertCircle className="h-4 w-4" />
                          <AlertDescription>{token.error}</AlertDescription>
                        </Alert>
                      )}
                    </Card>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Navigation */}
          <div className="flex justify-between">
            <Button variant="outline" onClick={() => setCurrentStep(1)}>
              Back
            </Button>
            <Button
              onClick={() => setCurrentStep(3)}
              disabled={tokens.length === 0}
            >
              Next
            </Button>
          </div>
        </div>
      )}

      {/* Step 3: Review & Mint */}
      {currentStep === 3 && (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>{t("review_mint")}</CardTitle>
              <CardDescription>
                {t("review_your_batch_and_configure_minting_options")}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Summary */}
              <div className="grid grid-cols-3 gap-4">
                <Card>
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-xs font-medium text-muted-foreground">{tExt("total_tokens")}</p>
                        <p className="text-2xl font-semibold leading-tight tracking-tight text-foreground font-mono tabular-nums">{tokens.length}</p>
                      </div>
                      <span className="grid h-7 w-7 shrink-0 place-items-center rounded-sm bg-surface-3 text-muted-foreground">
                        <Package className="h-3.5 w-3.5" />
                      </span>
                    </div>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-xs font-medium text-muted-foreground">{t("ready_to_mint")}</p>
                        <p className="text-2xl font-semibold leading-tight tracking-tight text-foreground font-mono tabular-nums">
                          {tokens.filter(t => t.status === "ready").length}
                        </p>
                      </div>
                      <span className="grid h-7 w-7 shrink-0 place-items-center rounded-sm bg-success/15 text-success">
                        <CheckCircle className="h-3.5 w-3.5" />
                      </span>
                    </div>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-xs font-medium text-muted-foreground">{t("est_gas_cost")}</p>
                        <p className="text-2xl font-semibold leading-tight tracking-tight text-foreground flex items-center gap-1.5">
                          <CurrencyIcon currency={gasCurrency} size={20} />
                          <span className="font-mono tabular-nums">
                            {mintToBlockchain ? `~${tokens.length * 0.005}` : "0"}
                          </span>{" "}
                          {gasCurrency}
                        </p>
                      </div>
                      <span className="grid h-7 w-7 shrink-0 place-items-center rounded-sm bg-warning/15 text-warning">
                        <Zap className="h-3.5 w-3.5" />
                      </span>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Minting Options */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <Label>{t("mint_to_blockchain")}</Label>
                    <p className="text-sm text-muted-foreground">
                      {t("mint_tokens_immediately_to_the_blockchain")}
                    </p>
                  </div>
                  <Switch
                    checked={mintToBlockchain}
                    onCheckedChange={setMintToBlockchain}
                  />
                </div>
              </div>

              {/* Progress */}
              {isMinting && (
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>{t("minting_progress")}</span>
                    <span>{Math.round(uploadProgress)}%</span>
                  </div>
                  <Progress value={uploadProgress} />
                </div>
              )}

              {/* Actions */}
              <div className="flex justify-between">
                <Button variant="outline" onClick={() => setCurrentStep(2)} disabled={isMinting}>
                  Back
                </Button>
                <Button onClick={handleBatchMint} disabled={isMinting}>
                  {isMinting ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      {tCommon("minting")}…
                    </>
                  ) : (
                    <>
                      <Send className="h-4 w-4 mr-2" />
                      Mint {tokens.length} NFTs
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Minted Tokens Status */}
          {tokens.some(t => t.status === "success" || t.status === "error") && (
            <Card>
              <CardHeader>
                <CardTitle>{t("minting_results")}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {tokens.map(token => (
                    <div key={token.id} className="flex items-center justify-between p-2 rounded-lg bg-muted/50">
                      <span className="font-medium">{token.name}</span>
                      {token.status === "success" ? (
                        <StatusBadge
                          status={token.status}
                          label="Success"
                          icon={<CheckCircle className="h-3 w-3 mr-1" />}
                        />
                      ) : token.status === "error" ? (
                        <StatusBadge
                          status={token.status}
                          label="Failed"
                          icon={<X className="h-3 w-3 mr-1" />}
                        />
                      ) : (
                        <StatusBadge
                          status={token.status}
                          label={statusLabels[token.status]}
                          icon={<Loader2 className="h-3 w-3 mr-1 animate-spin" />}
                        />
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}