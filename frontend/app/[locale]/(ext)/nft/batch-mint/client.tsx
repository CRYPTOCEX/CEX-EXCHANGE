"use client";

import { useState, useCallback, useRef } from "react";
import { useRouter } from "@/i18n/routing";
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
  Send
} from "lucide-react";
import { useUserStore } from "@/store/user";
import { useNftStore } from "@/store/nft/nft-store";
import { imageUploader } from "@/utils/upload";
import { toast } from "sonner";
import { $fetch } from "@/lib/api";
import * as XLSX from "xlsx";

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
  const t = useTranslations("nft.batchMint");
  const router = useRouter();
  const { user } = useUserStore();
  const { collections, fetchCollections } = useNftStore();
  
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
      
      const uploadedUrl = await imageUploader(file);
      
      updateToken(tokenId, {
        image: uploadedUrl,
        imageFile: file,
        status: "ready"
      });
    } catch (error) {
      updateToken(tokenId, {
        status: "error",
        error: "Failed to upload image"
      });
      toast.error("Failed to upload image");
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
        toast.success(`Loaded ${newTokens.length} tokens from CSV`);
      };
      
      reader.readAsText(file);
    } catch (error) {
      toast.error("Failed to parse CSV file");
    }
  };

  const handleFolderUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const imageFiles = files.filter(file => 
      file.type.startsWith("image/")
    );
    
    if (imageFiles.length === 0) {
      toast.error("No image files found in folder");
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
    toast.success(`Loaded ${newTokens.length} images`);
    
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
      toast.error("Please select a collection");
      return false;
    }
    
    if (tokens.length === 0) {
      toast.error("Please add at least one token");
      return false;
    }
    
    for (const token of tokens) {
      if (!token.name) {
        toast.error(`Token ${token.id} is missing a name`);
        return false;
      }
      if (!token.image && !token.imageFile) {
        toast.error(`Token "${token.name}" is missing an image`);
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
        
        toast.success(`Batch mint completed: ${successfulMints} successful, ${failedMints} failed`);
        
        if (successfulMints > 0) {
          setTimeout(() => {
            router.push("/nft/dashboard");
          }, 2000);
        }
      }
    } catch (error) {
      toast.error("Batch mint failed");
      console.error(error);
    } finally {
      setIsMinting(false);
    }
  };

  const getStatusBadge = (status: BatchToken["status"]) => {
    const badges = {
      pending: <Badge variant="outline">Pending</Badge>,
      uploading: <Badge variant="outline" className="bg-blue-50">Uploading...</Badge>,
      ready: <Badge variant="outline" className="bg-green-50">Ready</Badge>,
      minting: <Badge variant="outline" className="bg-yellow-50">Minting...</Badge>,
      success: <Badge variant="outline" className="bg-green-100">Success</Badge>,
      error: <Badge variant="destructive">Error</Badge>
    };
    return badges[status];
  };

  return (
    <div className="container mx-auto py-8 max-w-7xl">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Batch Mint NFTs</h1>
        <p className="text-muted-foreground">
          Create multiple NFTs at once. Maximum 100 tokens per batch.
        </p>
      </div>

      {/* Progress Steps */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          {[
            { step: 1, label: "Select Collection" },
            { step: 2, label: "Add Tokens" },
            { step: 3, label: "Review & Mint" }
          ].map(({ step, label }) => (
            <div key={step} className="flex items-center flex-1">
              <div className={`
                flex items-center justify-center w-10 h-10 rounded-full
                ${currentStep >= step ? "bg-primary text-white" : "bg-muted"}
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
            <CardTitle>Select Collection</CardTitle>
            <CardDescription>
              Choose which collection these NFTs will belong to
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Select value={selectedCollection} onValueChange={setSelectedCollection}>
              <SelectTrigger>
                <SelectValue placeholder="Select a collection" />
              </SelectTrigger>
              <SelectContent>
                {collections.map(collection => (
                  <SelectItem key={collection.id} value={collection.id}>
                    <div className="flex items-center gap-2">
                      <Package className="h-4 w-4" />
                      {collection.name}
                      <Badge variant="outline" className="ml-2">
                        {collection.totalSupply}/{collection.maxSupply || "∞"}
                      </Badge>
                    </div>
                  </SelectItem>
                ))}
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
              <CardTitle>Upload Method</CardTitle>
            </CardHeader>
            <CardContent>
              <Tabs value={uploadMethod} onValueChange={(v: any) => setUploadMethod(v)}>
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="manual">Manual Entry</TabsTrigger>
                  <TabsTrigger value="csv">CSV Upload</TabsTrigger>
                  <TabsTrigger value="folder">Folder Upload</TabsTrigger>
                </TabsList>
                
                <TabsContent value="manual" className="space-y-4">
                  <Button onClick={addToken} className="w-full">
                    <Plus className="h-4 w-4 mr-2" />
                    Add Token
                  </Button>
                </TabsContent>
                
                <TabsContent value="csv" className="space-y-4">
                  <div className="border-2 border-dashed rounded-lg p-8 text-center">
                    <FileSpreadsheet className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                    <p className="mb-4">Upload a CSV file with your NFT data</p>
                    <div className="flex gap-2 justify-center">
                      <Button variant="outline" onClick={downloadTemplate}>
                        <Download className="h-4 w-4 mr-2" />
                        Download Template
                      </Button>
                      <Button onClick={() => fileInputRef.current?.click()}>
                        <Upload className="h-4 w-4 mr-2" />
                        Upload CSV
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
                    <p className="mb-4">Select a folder with images to create NFTs</p>
                    <Button onClick={() => folderInputRef.current?.click()}>
                      <Upload className="h-4 w-4 mr-2" />
                      Select Folder
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
              <CardTitle>Review & Mint</CardTitle>
              <CardDescription>
                Review your batch and configure minting options
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Summary */}
              <div className="grid grid-cols-3 gap-4">
                <Card>
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-muted-foreground">Total Tokens</p>
                        <p className="text-2xl font-bold">{tokens.length}</p>
                      </div>
                      <Package className="h-8 w-8 text-muted-foreground" />
                    </div>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-muted-foreground">Ready to Mint</p>
                        <p className="text-2xl font-bold">
                          {tokens.filter(t => t.status === "ready").length}
                        </p>
                      </div>
                      <CheckCircle className="h-8 w-8 text-green-500" />
                    </div>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-muted-foreground">Est. Gas Cost</p>
                        <p className="text-2xl font-bold">
                          {mintToBlockchain ? `~${tokens.length * 0.005} ETH` : "0 ETH"}
                        </p>
                      </div>
                      <Zap className="h-8 w-8 text-yellow-500" />
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Minting Options */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Mint to Blockchain</Label>
                    <p className="text-sm text-muted-foreground">
                      Mint tokens immediately to the blockchain (requires gas fees)
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
                    <span>Minting progress</span>
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
                      Minting...
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
                <CardTitle>Minting Results</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {tokens.map(token => (
                    <div key={token.id} className="flex items-center justify-between p-2 rounded-lg bg-muted/50">
                      <span className="font-medium">{token.name}</span>
                      {token.status === "success" ? (
                        <Badge className="bg-green-100 text-green-800">
                          <CheckCircle className="h-3 w-3 mr-1" />
                          Success
                        </Badge>
                      ) : token.status === "error" ? (
                        <Badge variant="destructive">
                          <X className="h-3 w-3 mr-1" />
                          Failed
                        </Badge>
                      ) : (
                        <Badge variant="outline">
                          <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                          Processing
                        </Badge>
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