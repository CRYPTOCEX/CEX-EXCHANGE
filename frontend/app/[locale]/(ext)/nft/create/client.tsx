"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter, Link as RouterLink } from "@/i18n/routing";
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
  FormDescription,
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
  ChevronRight,
  Package,
  Wallet,
  LogOut,
  ArrowLeft,
  Globe
} from "lucide-react";
import { useUserStore } from "@/store/user";
import { useNftStore } from "@/store/nft/nft-store";
import { useAppKit, useAppKitAccount, useAppKitNetwork, useDisconnect } from '@reown/appkit/react';
import { useSwitchChain } from 'wagmi';
import { imageUploader } from "@/utils/upload";
import Image from "next/image";
import { AuthModal } from "@/components/auth/auth-modal";
import { toast } from "sonner";
import { GasEstimator } from "@/app/[locale]/(ext)/nft/components/shared/gas-estimator";
import { useGasEstimation } from "@/hooks/use-gas-estimation";
import { $fetch } from "@/lib/api";
import { IPFSUploadGuide } from "@/app/[locale]/(ext)/nft/components/create/ipfs-upload-guide";
import { IPFSUrlInput } from "@/app/[locale]/(ext)/nft/components/create/ipfs-url-input";

const createNFTSchema = z.object({
  name: z.string().min(1, "Name is required").max(255, "Name too long"),
  description: z.string().optional(),
  collectionId: z.string().min(1, "Collection is required"),
  image: z.string().min(1, "Image is required"), // IPFS image URL
  ipfsImageUrl: z.string().optional(), // User-provided IPFS image URL
  ipfsMetadataUrl: z.string().optional(), // User-provided IPFS metadata URL (optional - auto-generated if not provided)
  attributes: z.array(z.object({
    trait_type: z.string().min(1, "Trait type is required"),
    value: z.string().min(1, "Value is required"),
    display_type: z.string().optional(),
  })).optional(),
  rarity: z.enum(["COMMON", "UNCOMMON", "RARE", "EPIC", "LEGENDARY"]).optional(),
  royaltyPercentage: z.number().min(0).max(50).optional(),
  recipientAddress: z.string().optional(),
  chain: z.string().default("ETH"),
  category: z.string().optional(),
  tags: z.array(z.string()).optional(),
  unlockableContent: z.string().optional(),
  isExplicitContent: z.boolean().default(false),
  isSensitiveContent: z.boolean().default(false),
});

type CreateNFTForm = z.infer<typeof createNFTSchema>;

const ATTRIBUTE_DISPLAY_TYPES = [
  { value: "text", label: "Text" },
  { value: "number", label: "Number" },
  { value: "boost_percentage", label: "Boost Percentage" },
  { value: "boost_number", label: "Boost Number" },
  { value: "date", label: "Date" },
];

export default function CreateNFTClient() {
  const t = useTranslations("ext_nft");
  const tCommon = useTranslations("common");
  const tDashboardAdmin = useTranslations("dashboard_admin");
  const tExt = useTranslations("ext");
  const router = useRouter();
  const { user } = useUserStore();

  const {
    collections,
    categories,
    createToken,
    fetchCollections,
    fetchCategories,
    loading
  } = useNftStore();

  // Use AppKit hooks from Reown - much simpler!
  const { isConnected, address } = useAppKitAccount();
  const { open: openAppKit } = useAppKit();
  const { disconnect } = useDisconnect();
  const { chainId } = useAppKitNetwork();
  const { switchChain } = useSwitchChain();

  // State declarations
  const [uploadingImage, setUploadingImage] = useState(false);
  const [previewImage, setPreviewImage] = useState<string>("");
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [showIPFSGuide, setShowIPFSGuide] = useState(false);
  const [showIPFSInput, setShowIPFSInput] = useState(true);
  const [ipfsImageUrl, setIpfsImageUrl] = useState("");
  const [ipfsMetadataUrl, setIpfsMetadataUrl] = useState("");
  const [ipfsImageValidated, setIpfsImageValidated] = useState(false);
  const [hasVisitedPreview, setHasVisitedPreview] = useState(false);

  // Connect wallet - triggers AppKit modal
  const connectWallet = () => {
    setIsConnecting(true);
    openAppKit({ view: "Connect" });
  };

  // Disconnect wallet
  const disconnectWallet = async () => {
    try {
      await disconnect();
    } catch (error) {
      console.error("Error disconnecting wallet:", error);
    }
  };

  // Clear connecting state when wallet connects
  useEffect(() => {
    if (isConnected) {
      setIsConnecting(false);
    }
  }, [isConnected]);

  // Get wallet balance using wagmi
  const getBalance = useCallback(async (): Promise<string | null> => {
    if (!address || !chainId) return null;

    try {
      // Use wagmi's getBalance action
      const { getBalance: wagmiGetBalance } = await import("wagmi/actions");
      const { config } = await import("@/config/wallet");

      const balance = await wagmiGetBalance(config, {
        address: address as `0x${string}`,
        chainId: Number(chainId),
      });

      const balanceEth = Number(balance.value) / Math.pow(10, balance.decimals);
      return balanceEth.toFixed(6);
    } catch (error) {
      console.error("Error fetching balance:", error);
      return null;
    }
  }, [address, chainId]);
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
  const [selectedCollection, setSelectedCollection] = useState<any>(null);
  const [walletBalance, setWalletBalance] = useState<string | null>(null);
  const [loadingBalance, setLoadingBalance] = useState(false);
  const [wrongNetwork, setWrongNetwork] = useState(false);

  const totalSteps = 6;

  const form = useForm<CreateNFTForm>({
    // @ts-ignore - Complex Zod type inference causing build issues
    resolver: zodResolver(createNFTSchema),
    defaultValues: {
      name: "",
      description: "",
      collectionId: "",
      image: "",
      attributes: [],
      royaltyPercentage: 2.5,
      recipientAddress: "",
      chain: "ETH",
      category: "",
      tags: [],
      unlockableContent: "",
      isExplicitContent: false,
      isSensitiveContent: false,
    },
  });

  // Always mint to blockchain - check gas estimation
  const chain = form.watch("chain");
  const { estimate: gasEstimate, loading: gasLoading, canAfford } = useGasEstimation({
    operation: "mint",
    chain
  });

  // Calculate progress based on actual completion (6 steps)
  // Fixed: Progress now starts at 0% instead of 17%
  const getStepProgress = () => {
    let completedSteps = 0;

    // Step 1: Collection selected
    const collectionId = form.watch("collectionId");
    const step1 = !!(collectionId && selectedCollection);
    if (step1) completedSteps++;

    // Step 2: Wallet connected and on correct network (only count if collection is selected)
    const step2 = !!(selectedCollection && isConnected && address && !wrongNetwork);
    if (step2) completedSteps++;

    // Step 3: IPFS image validated
    const step3 = ipfsImageValidated;
    if (step3) completedSteps++;

    // Step 4: Basic info filled
    const name = form.watch("name");
    const step4 = !!(name && collectionId);
    if (step4) completedSteps++;

    // Step 5: Properties configured (optional - count if any configured)
    const hasAttributes = attributes.length > 0;
    const royaltyValue = form.watch("royaltyPercentage");
    const hasRoyalty = royaltyValue !== 2.5 && royaltyValue !== undefined;
    const hasUnlockableContent = !!form.watch("unlockableContent");
    const hasContentFlags = form.watch("isExplicitContent") || form.watch("isSensitiveContent");
    const step5 = hasAttributes || hasRoyalty || hasUnlockableContent || hasContentFlags;
    if (step5) {
      completedSteps++;
    }

    // Step 6: Ready to mint (all required steps done)
    const step6 = !!(collectionId && isConnected && !wrongNetwork && previewImage && name && walletBalance && parseFloat(walletBalance) > 0);
    if (step6) {
      completedSteps++;
    }

    return completedSteps > 0 ? (completedSteps / totalSteps) * 100 : 0;
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
        return !!collectionId && !!selectedCollection; // Need collection selected
      case 3:
        return !!collectionId && !!selectedCollection && isConnected && !wrongNetwork; // Need wallet connected on correct network
      case 4:
        return !!collectionId && isConnected && !wrongNetwork && ipfsImageValidated; // Need IPFS image validated
      case 5:
        return !!collectionId && isConnected && !wrongNetwork && ipfsImageValidated && !!name; // Need basic details
      case 6:
        return !!collectionId && isConnected && !wrongNetwork && ipfsImageValidated && !!name; // Ready for preview (properties optional)
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

    return hasAttributes || hasRoyalty || hasUnlockableContent || hasContentFlags;
  };
  
  const goToStep = (step: number) => {
    if (canProceedToStep(step)) {
      setCurrentStep(step);
      // Track when user visits preview step
      if (step === 6) {
        setHasVisitedPreview(true);
      }
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

  // Filter only deployed collections (have contractAddress and are ACTIVE)
  const deployedCollections = Array.isArray(collections)
    ? collections.filter(c => c.contractAddress && c.status === "ACTIVE")
    : [];

  const undeployedCollections = Array.isArray(collections)
    ? collections.filter(c => !c.contractAddress || c.status !== "ACTIVE")
    : [];

  useEffect(() => {
    handleFetchCollections();
    fetchCategories();
  }, [handleFetchCollections, fetchCategories]);

  // Auto-update chain and selected collection when collection is selected
  useEffect(() => {
    const collectionId = form.watch("collectionId");
    if (collectionId && Array.isArray(collections)) {
      const collection = collections.find(c => c.id === collectionId);
      if (collection) {
        setSelectedCollection(collection);
        if (collection.chain) {
          form.setValue("chain", collection.chain);
        }
      }
    } else {
      setSelectedCollection(null);
    }
  }, [form.watch("collectionId"), collections, form]);

  // Check if wallet is on correct network
  useEffect(() => {
    if (!isConnected || !selectedCollection || !chainId) {
      setWrongNetwork(false);
      return;
    }

    try {
      // Map chain names to chain IDs
      const chainIdMap: Record<string, number> = {
        "ETH": 1,
        "BSC": 56,
        "POLYGON": 137,
        "MATIC": 137,
        "ARBITRUM": 42161,
        "OPTIMISM": 10,
        "SEPOLIA": 11155111,
      };

      const expectedChainId = chainIdMap[selectedCollection.chain.toUpperCase()];
      const isCorrectNetwork = chainId === expectedChainId;
      setWrongNetwork(!isCorrectNetwork);

    } catch (error) {
      console.error("Error checking network:", error);
      setWrongNetwork(false);
    }
  }, [isConnected, selectedCollection, chainId]);

  // Fetch wallet balance when wallet is connected
  useEffect(() => {
    const fetchWalletBalance = async () => {
      if (!isConnected || !address) {
        setWalletBalance(null);
        return;
      }

      setLoadingBalance(true);
      try {
        // Get balance directly from MetaMask
        const balance = await getBalance();
        setWalletBalance(balance || "0");
      } catch (error) {
        console.error("Error fetching wallet balance:", error);
        setWalletBalance(null);
      } finally {
        setLoadingBalance(false);
      }
    };

    fetchWalletBalance();
  }, [isConnected, address, getBalance]);

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
    setAttributes([...attributes, { trait_type: "", value: "", display_type: "text" }]);
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
      // Check if wallet is connected
      if (!isConnected || !address) {
        toast.error("Please connect your wallet first");
        return;
      }

      // Check wallet balance
      if (!walletBalance || parseFloat(walletBalance) === 0) {
        toast.error("Insufficient balance in wallet. Please add funds to your wallet.");
        return;
      }

      // Check if can afford gas fees
      if (gasEstimate && !canAfford) {
        toast.error(`Insufficient balance to cover gas fees. Required: ${gasEstimate.gasCostEth}, Available: ${walletBalance}`);
        return;
      }

      // Get selected collection to get contract address and mint price
      const selectedCollection = collections.find(c => c.id === data.collectionId);
      if (!selectedCollection) {
        toast.error("Please select a collection");
        return;
      }

      if (!selectedCollection.contractAddress) {
        toast.error("Collection contract not deployed. Please deploy the collection contract first.");
        return;
      }

      // Show minting toast
      const mintingToast = toast.loading("Preparing transaction...");

      try {
        // Import Web3 utility first
        const { mintNFTViaWeb3 } = await import("@/utils/nft-web3");

        // Determine the tokenURI to use FIRST
        // Priority: User-provided IPFS metadata > Auto-generated metadata > IPFS image only
        let tokenURI = data.image; // Fallback

        if (data.ipfsMetadataUrl) {
          // User provided complete metadata JSON on IPFS - use directly
          tokenURI = data.ipfsMetadataUrl;
        } else {
          // For now, use the image URL as tokenURI
          // Backend should handle metadata generation
          tokenURI = data.ipfsImageUrl || data.image;
        }

        // Validate tokenURI is a proper IPFS URL
        const isValidIPFS = tokenURI.includes('ipfs://') ||
                           tokenURI.includes('/ipfs/') ||
                           tokenURI.startsWith('https://') && tokenURI.includes('ipfs');

        if (!isValidIPFS) {
          toast.dismiss(mintingToast);
          toast.error(
            `❌ Invalid IPFS URL!\n\n` +
            `The URL must be a valid IPFS link.\n\n` +
            `Examples:\n` +
            `✅ https://gateway.pinata.cloud/ipfs/bafxxx...\n` +
            `✅ ipfs://bafxxx...\n\n` +
            `❌ /uploads/nft/image.webp (local path)\n` +
            `❌ http://localhost/image.jpg (local URL)\n\n` +
            `Please upload your image to Pinata or another IPFS provider.`,
            { duration: 10000 }
          );
          return;
        }

        // NOW check if this tokenURI has already been minted in this collection
        console.log("[NFT CREATE] Checking for duplicate:", tokenURI);
        console.log("[NFT CREATE] Collection ID:", data.collectionId);

        try {
          const { data: checkResult } = await $fetch({
            url: `/api/nft/check-duplicate?collectionId=${data.collectionId}&metadataUri=${encodeURIComponent(tokenURI)}`,
            method: "GET",
            silent: true,
          });

          console.log("[NFT CREATE] Duplicate check result:", checkResult);

          if (checkResult?.exists) {
            toast.dismiss(mintingToast);
            toast.error(
              `🚫 DUPLICATE DETECTED!\n\n` +
              `This IPFS URL was already minted as:\n` +
              `"${checkResult.name}" (Token #${checkResult.blockchainTokenId})\n\n` +
              `❌ You cannot mint the same IPFS URL twice!\n\n` +
              `✅ SOLUTION:\n` +
              `1. Upload a DIFFERENT image to Pinata/IPFS\n` +
              `2. Get a NEW IPFS CID (bafxxx...)\n` +
              `3. Paste the NEW URL in Step 3\n` +
              `4. Try minting again`,
              { duration: 10000 }
            );
            return;
          }
        } catch (checkError: any) {
          // If check fails, continue anyway (backend validation will catch it)
          console.error("[NFT CREATE] Duplicate check failed:", checkError);
          console.error("[NFT CREATE] Error details:", checkError.message);
        }

        // Update toast before requesting signature
        toast.loading("Please sign the transaction in your wallet...", { id: mintingToast });

        // Debug: Log the mint price
        console.log("[NFT CREATE] Collection mintPrice:", selectedCollection.mintPrice);
        console.log("[NFT CREATE] Converted mintPrice:", selectedCollection.mintPrice?.toString() || "0");

        // Mint NFT via Web3 (user signs transaction)
        const mintResult = await mintNFTViaWeb3({
          contractAddress: selectedCollection.contractAddress,
          recipientAddress: address,
          tokenURI: tokenURI,
          mintPrice: selectedCollection.mintPrice?.toString() || "0",
          chain: selectedCollection.chain
        });

        if (!mintResult.success) {
          // Dismiss the loading toast before throwing error
          toast.dismiss(mintingToast);
          throw new Error(mintResult.error || "Failed to mint NFT");
        }

        // Update toast
        toast.loading("Transaction confirmed! Saving NFT data...", { id: mintingToast });

        // Record the mint transaction on backend
        // Backend will automatically update user's wallet address if needed
        // Helper to validate if URL is a real external URL (not localhost, not current page)
        const isValidExternalUrl = (url: string | undefined) => {
          if (!url || url.trim() === '') return false;
          if (!url.startsWith('http://') && !url.startsWith('https://')) return false;
          if (url.includes('localhost')) return false;
          if (url.includes('127.0.0.1')) return false;
          if (url === window.location.href) return false;
          return true;
        };

        const nftData = {
          collectionId: data.collectionId,
          tokenId: mintResult.tokenId,
          transactionHash: mintResult.transactionHash,
          blockNumber: mintResult.blockNumber,
          gasUsed: mintResult.gasUsed,
          recipientAddress: address,
          name: data.name,
          description: data.description,
          image: data.image, // IPFS image URL
          metadataUri: data.ipfsMetadataUrl, // IPFS metadata JSON URL (if user provided it)
          attributes: attributes.length > 0 ? attributes : undefined,
          rarity: data.rarity || "COMMON",
          royaltyPercentage: data.royaltyPercentage,
          unlockableContent: data.unlockableContent,
          isExplicit: data.isExplicitContent,
          categoryId: data.category,
          currency: "ETH",
        };

        const { data: result, error } = await $fetch({
          url: "/api/nft/token/mint-web3",
          method: "POST",
          body: nftData,
          silent: true,
        });

        if (error) {
          throw new Error(error);
        }

        // Success!
        toast.success("NFT minted to blockchain successfully!", { id: mintingToast });
        router.push("/nft/creator");

      } catch (mintError: any) {
        console.error("Minting error:", mintError);
        toast.error(mintError.message || "Failed to mint NFT", { id: mintingToast });
      }

    } catch (error) {
      console.error("Failed to create NFT:", error);
      toast.error("Failed to create NFT. Please try again.");
    }
  }, [attributes, tags, user?.id, gasEstimate, canAfford, router, isConnected, address, walletBalance, collections]);

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
          {tCommon("sign_in")}
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
      <div className={`relative overflow-hidden bg-gradient-to-b from-primary/5 via-purple-600/5 to-background border-b`}>
        {/* Animated Background Elements */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute -top-1/2 -left-1/2 w-full h-full bg-gradient-to-br from-primary/10 to-transparent rounded-full blur-3xl animate-pulse" />
          <div className={`absolute -bottom-1/2 -right-1/2 w-full h-full bg-gradient-to-tl from-purple-600/10 to-transparent rounded-full blur-3xl animate-pulse`} style={{ animationDelay: '1s' }} />
        </div>

        <div className="relative container mx-auto px-4 pt-20 pb-16">
          {/* Hero Content */}
          <div className="text-center max-w-4xl mx-auto">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-primary/10 border border-primary/30 rounded-full mb-6">
              <Sparkles className="h-4 w-4 text-primary animate-pulse" />
              <span className="text-sm font-semibold text-primary">Create Your Masterpiece</span>
            </div>

            <h1 className={`text-4xl md:text-5xl lg:text-6xl font-bold mb-6 bg-gradient-to-r from-foreground via-primary to-purple-600 bg-clip-text text-transparent`}>
              {t("create_new_nft")}
            </h1>

            <p className="text-lg text-muted-foreground mb-10 max-w-2xl mx-auto">
              {t("create_and_mint_your_unique_digital_asset")}
            </p>

            {/* Progress Indicator */}
            <div className="max-w-3xl mx-auto">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm font-semibold">Progress</span>
                <span className="text-sm font-semibold text-primary">
                  {Math.round(progress)}% Complete
                </span>
              </div>
              <Progress value={progress} className="h-2 mb-6" />

              {/* Progress Steps */}
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 md:gap-6">
                <div className={`text-center transition-all duration-300 ${currentStep > 1 ? "scale-105" : ""}`}>
                  <div className={`w-10 h-10 rounded-full mx-auto mb-2 flex items-center justify-center font-semibold text-sm transition-all ${
                    currentStep > 1
                      ? "bg-green-500 dark:bg-green-600 text-white"
                      : currentStep === 1
                      ? "bg-primary text-primary-foreground ring-2 ring-primary ring-offset-2 ring-offset-background"
                      : "bg-muted text-muted-foreground"
                  }`}>
                    {currentStep > 1 ? "✓" : "1"}
                  </div>
                  <span className="text-xs font-medium block">Collection</span>
                </div>

                <div className={`text-center transition-all duration-300 ${currentStep > 2 ? "scale-105" : ""}`}>
                  <div className={`w-10 h-10 rounded-full mx-auto mb-2 flex items-center justify-center font-semibold text-sm transition-all ${
                    currentStep > 2
                      ? "bg-green-500 dark:bg-green-600 text-white"
                      : currentStep === 2
                      ? "bg-primary text-primary-foreground ring-2 ring-primary ring-offset-2 ring-offset-background"
                      : "bg-muted text-muted-foreground"
                  }`}>
                    {currentStep > 2 ? "✓" : "2"}
                  </div>
                  <span className="text-xs font-medium block">Wallet</span>
                </div>

                <div className={`text-center transition-all duration-300 ${currentStep > 3 ? "scale-105" : ""}`}>
                  <div className={`w-10 h-10 rounded-full mx-auto mb-2 flex items-center justify-center font-semibold text-sm transition-all ${
                    currentStep > 3
                      ? "bg-green-500 dark:bg-green-600 text-white"
                      : currentStep === 3
                      ? "bg-primary text-primary-foreground ring-2 ring-primary ring-offset-2 ring-offset-background"
                      : "bg-muted text-muted-foreground"
                  }`}>
                    {currentStep > 3 ? "✓" : "3"}
                  </div>
                  <span className="text-xs font-medium block">Upload</span>
                </div>

                <div className={`text-center transition-all duration-300 ${currentStep > 4 ? "scale-105" : ""}`}>
                  <div className={`w-10 h-10 rounded-full mx-auto mb-2 flex items-center justify-center font-semibold text-sm transition-all ${
                    currentStep > 4
                      ? "bg-green-500 dark:bg-green-600 text-white"
                      : currentStep === 4
                      ? "bg-primary text-primary-foreground ring-2 ring-primary ring-offset-2 ring-offset-background"
                      : "bg-muted text-muted-foreground"
                  }`}>
                    {currentStep > 4 ? "✓" : "4"}
                  </div>
                  <span className="text-xs font-medium block">Details</span>
                </div>

                <div className={`text-center transition-all duration-300 ${currentStep > 5 ? "scale-105" : ""}`}>
                  <div className={`w-10 h-10 rounded-full mx-auto mb-2 flex items-center justify-center font-semibold text-sm transition-all ${
                    currentStep > 5
                      ? "bg-green-500 dark:bg-green-600 text-white"
                      : currentStep === 5
                      ? "bg-primary text-primary-foreground ring-2 ring-primary ring-offset-2 ring-offset-background"
                      : "bg-muted text-muted-foreground"
                  }`}>
                    {currentStep > 5 ? "✓" : "5"}
                  </div>
                  <span className="text-xs font-medium block">Properties</span>
                </div>

                <div className={`text-center transition-all duration-300 ${currentStep > 6 ? "scale-105" : ""}`}>
                  <div className={`w-10 h-10 rounded-full mx-auto mb-2 flex items-center justify-center font-semibold text-sm transition-all ${
                    currentStep > 6
                      ? "bg-green-500 dark:bg-green-600 text-white"
                      : currentStep === 6
                      ? "bg-primary text-primary-foreground ring-2 ring-primary ring-offset-2 ring-offset-background"
                      : "bg-muted text-muted-foreground"
                  }`}>
                    {currentStep > 6 ? "✓" : "6"}
                  </div>
                  <span className="text-xs font-medium block">Preview</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-12 max-w-7xl">

        {/* No Deployed Collection Warning */}
        {!loading && deployedCollections.length === 0 && (
          <Card className="mb-8 border-amber-200 dark:border-amber-900/50 bg-amber-50 dark:bg-amber-950/20">
            <CardContent className="p-6">
              <div className="flex items-start gap-4">
                <div className="p-3 bg-amber-100 dark:bg-amber-900/30 rounded-full">
                  <AlertCircle className="h-6 w-6 text-amber-600 dark:text-amber-400" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-amber-900 dark:text-amber-100 mb-2">
                    {Array.isArray(collections) && collections.length === 0
                      ? "Create a Collection First"
                      : "Deploy Your Collection to Blockchain"}
                  </h3>
                  <p className="text-sm text-amber-800 dark:text-amber-200 mb-4">
                    {Array.isArray(collections) && collections.length === 0
                      ? "Before creating an NFT, you need to create a collection. Collections help organize your NFTs and define which blockchain they'll be on (ETH, BSC, Polygon, etc.)."
                      : `You have ${undeployedCollections.length} collection(s) that need to be deployed to the blockchain before you can mint NFTs. Deployment makes your collection permanent and immutable on the blockchain.`}
                  </p>
                  {Array.isArray(collections) && collections.length === 0 ? (
                    <RouterLink href="/nft/collection/create">
                      <Button className="bg-amber-600 hover:bg-amber-700 text-white">
                        <Plus className="h-4 w-4 mr-2" />
                        Create Collection Now
                      </Button>
                    </RouterLink>
                  ) : (
                    <RouterLink href="/nft/collection">
                      <Button className="bg-amber-600 hover:bg-amber-700 text-white">
                        <Package className="h-4 w-4 mr-2" />
                        View & Deploy Collections
                      </Button>
                    </RouterLink>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Collection Full Warning */}
        {!loading && deployedCollections.length > 0 && selectedCollection && selectedCollection.maxSupply && selectedCollection.totalSupply >= selectedCollection.maxSupply && (
          <Card className="mb-8 border-red-200 dark:border-red-900/50 bg-red-50 dark:bg-red-950/20">
            <CardContent className="p-6">
              <div className="flex items-start gap-4">
                <div className="p-3 bg-red-100 dark:bg-red-900/30 rounded-full">
                  <AlertCircle className="h-6 w-6 text-red-600 dark:text-red-400" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-red-900 dark:text-red-100 mb-2">
                    Collection Maximum Supply Reached
                  </h3>
                  <p className="text-sm text-red-800 dark:text-red-200 mb-4">
                    The selected collection "{selectedCollection.name}" has reached its maximum supply of {selectedCollection.maxSupply} NFTs.
                    You cannot mint more NFTs in this collection. Please create a new collection or select a different one.
                  </p>
                  <div className="flex gap-2">
                    <RouterLink href="/nft/collection/create">
                      <Button className="bg-red-600 hover:bg-red-700 text-white">
                        <Plus className="h-4 w-4 mr-2" />
                        Create New Collection
                      </Button>
                    </RouterLink>
                    <Button
                      variant="outline"
                      onClick={() => {
                        form.setValue("collectionId", "");
                        setSelectedCollection(null);
                      }}
                    >
                      Select Different Collection
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
            <Tabs value={`step-${currentStep}`} className="w-full">
              <TabsList className="grid w-full grid-cols-6 mb-8 gap-1 bg-muted/50 p-1">
                {/* Step 1: Collection Selection */}
                <TabsTrigger
                  value="step-1"
                  onClick={() => goToStep(1)}
                  className="flex flex-col sm:flex-row items-center gap-1 sm:gap-2 text-xs sm:text-sm p-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
                  disabled={!canProceedToStep(1)}
                >
                  <Package className="h-4 w-4" />
                  <span className="hidden md:inline">Collection</span>
                  <span className="md:hidden">Select</span>
                  {selectedCollection && <CheckCircle className="h-3 w-3 text-green-500 dark:text-green-400" />}
                </TabsTrigger>

                {/* Step 2: Wallet Connection */}
                <TabsTrigger
                  value="step-2"
                  onClick={() => goToStep(2)}
                  className="flex flex-col sm:flex-row items-center gap-1 sm:gap-2 text-xs sm:text-sm p-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
                  disabled={!canProceedToStep(2)}
                >
                  <Wallet className="h-4 w-4" />
                  <span className="hidden md:inline">Wallet</span>
                  <span className="md:hidden">Connect</span>
                  {selectedCollection && isConnected && !wrongNetwork && <CheckCircle className="h-3 w-3 text-green-500 dark:text-green-400" />}
                </TabsTrigger>

                {/* Step 3: Upload Artwork */}
                <TabsTrigger
                  value="step-3"
                  onClick={() => goToStep(3)}
                  className="flex flex-col sm:flex-row items-center gap-1 sm:gap-2 text-xs sm:text-sm p-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
                  disabled={!canProceedToStep(3)}
                >
                  <Upload className="h-4 w-4" />
                  <span className="hidden md:inline">Upload</span>
                  <span className="md:hidden">Image</span>
                  {previewImage && <CheckCircle className="h-3 w-3 text-green-500 dark:text-green-400" />}
                </TabsTrigger>

                {/* Step 4: Details */}
                <TabsTrigger
                  value="step-4"
                  onClick={() => goToStep(4)}
                  className="flex flex-col sm:flex-row items-center gap-1 sm:gap-2 text-xs sm:text-sm p-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
                  disabled={!canProceedToStep(4)}
                >
                  <FileText className="h-4 w-4" />
                  <span className="hidden md:inline">Details</span>
                  <span className="md:hidden">Info</span>
                  {form.watch("name") && <CheckCircle className="h-3 w-3 text-green-500 dark:text-green-400" />}
                </TabsTrigger>

                {/* Step 5: Properties */}
                <TabsTrigger
                  value="step-5"
                  onClick={() => goToStep(5)}
                  className="flex flex-col sm:flex-row items-center gap-1 sm:gap-2 text-xs sm:text-sm p-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
                  disabled={!canProceedToStep(5)}
                >
                  <Settings className="h-4 w-4" />
                  <span className="hidden md:inline">Properties</span>
                  <span className="md:hidden">Props</span>
                  {isPropertiesConfigured() && <CheckCircle className="h-3 w-3 text-green-500 dark:text-green-400" />}
                </TabsTrigger>

                {/* Step 6: Preview & Mint */}
                <TabsTrigger
                  value="step-6"
                  onClick={() => goToStep(6)}
                  className="flex flex-col sm:flex-row items-center gap-1 sm:gap-2 text-xs sm:text-sm p-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
                  disabled={!canProceedToStep(6)}
                >
                  <Eye className="h-4 w-4" />
                  <span className="hidden md:inline">Preview</span>
                  <span className="md:hidden">Mint</span>
                  {hasVisitedPreview && canProceedToStep(6) && <CheckCircle className="h-3 w-3 text-green-500 dark:text-green-400" />}
                </TabsTrigger>
              </TabsList>

              {/* Step 1: Collection Selection */}
              <TabsContent value="step-1" className="space-y-8">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Package className="h-5 w-5" />
                      Select Collection
                    </CardTitle>
                    <p className="text-sm text-muted-foreground">
                      Choose which collection this NFT will belong to. Collections must be deployed to the blockchain before you can mint NFTs.
                    </p>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <FormField
                      control={form.control}
                      name="collectionId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-base">Collection *</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger className="h-auto">
                                <SelectValue placeholder="Choose a deployed collection" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {deployedCollections.length > 0 ? (
                                deployedCollections.map((collection) => (
                                  <SelectItem key={collection.id} value={collection.id}>
                                    <div className="flex items-center gap-3 py-2">
                                      {collection.logoImage && (
                                        <Image
                                          src={collection.logoImage}
                                          alt={collection.name}
                                          width={32}
                                          height={32}
                                          className="rounded-full object-cover"
                                        />
                                      )}
                                      <div className="flex-1">
                                        <div className="flex items-center gap-2 mb-1">
                                          <span className="font-semibold">{collection.name}</span>
                                          {collection.symbol && (
                                            <span className="text-xs text-muted-foreground">({collection.symbol})</span>
                                          )}
                                        </div>
                                        <div className="flex items-center gap-2 text-xs">
                                          <Badge variant="outline">{collection.chain}</Badge>
                                          <span className="text-muted-foreground">{collection.standard}</span>
                                          <Badge className="bg-green-500 text-white">Deployed</Badge>
                                        </div>
                                      </div>
                                    </div>
                                  </SelectItem>
                                ))
                              ) : (
                                <div className="px-4 py-3 text-sm text-muted-foreground text-center">
                                  {loading ? "Loading collections..." : "No deployed collections available"}
                                </div>
                              )}
                              {undeployedCollections.length > 0 && (
                                <div className="border-t mt-2 pt-2">
                                  <div className="px-4 py-2 text-xs font-semibold text-amber-600">
                                    ⚠️ Undeployed Collections (Cannot mint)
                                  </div>
                                  {undeployedCollections.map((collection) => (
                                    <div key={collection.id} className="px-4 py-2 opacity-50 cursor-not-allowed">
                                      <div className="flex items-center gap-2 text-sm">
                                        <span className="truncate">{collection.name}</span>
                                        <Badge variant="outline" className="text-xs">{collection.chain}</Badge>
                                        <Badge variant="secondary" className="text-xs bg-amber-500">Not Deployed</Badge>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {selectedCollection && (
                      <div className="p-4 border rounded-lg bg-muted/30 space-y-3">
                        <h4 className="font-semibold text-sm">Selected Collection Details</h4>
                        <div className="grid grid-cols-2 gap-3 text-sm">
                          <div>
                            <span className="text-muted-foreground">Chain:</span>
                            <div className="font-medium mt-1">
                              <Badge>{selectedCollection.chain}</Badge>
                            </div>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Standard:</span>
                            <div className="font-medium mt-1">{selectedCollection.standard}</div>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Contract:</span>
                            <div className="font-mono text-xs mt-1">
                              {selectedCollection.contractAddress ?
                                `${selectedCollection.contractAddress.slice(0, 6)}...${selectedCollection.contractAddress.slice(-4)}` :
                                'Not deployed'
                              }
                            </div>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Supply:</span>
                            <div className="font-medium mt-1">
                              {selectedCollection.totalSupply || 0} / {selectedCollection.maxSupply || '∞'}
                            </div>
                            {selectedCollection.maxSupply && selectedCollection.totalSupply >= selectedCollection.maxSupply && (
                              <div className="text-xs text-red-600 dark:text-red-400 mt-1 flex items-center gap-1">
                                <AlertCircle className="h-3 w-3" />
                                Max supply reached
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    )}

                    <div className="flex justify-between pt-4">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => router.push("/nft/collection/create")}
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        Create New Collection
                      </Button>
                      <Button
                        type="button"
                        onClick={() => goToStep(2)}
                        disabled={!canProceedToStep(2)}
                      >
                        Next: Connect Wallet
                        <ChevronRight className="h-4 w-4 ml-2" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Step 2: Wallet Connection & Network Validation */}
              <TabsContent value="step-2" className="space-y-8">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Wallet className="h-5 w-5" />
                      Connect Wallet & Verify Network
                    </CardTitle>
                    <p className="text-sm text-muted-foreground">
                      Connect your wallet and ensure you're on the correct network ({selectedCollection?.chain}) to mint your NFT.
                    </p>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    {!selectedCollection ? (
                      <div className="text-center py-12">
                        <div className="mx-auto w-16 h-16 bg-amber-500/10 rounded-full flex items-center justify-center mb-4">
                          <AlertCircle className="h-8 w-8 text-amber-500" />
                        </div>
                        <h3 className="text-lg font-semibold mb-2">Select Collection First</h3>
                        <p className="text-muted-foreground mb-6 max-w-md mx-auto">
                          Please go back and select a collection before connecting your wallet. This ensures we connect to the correct blockchain network.
                        </p>
                        <Button
                          variant="outline"
                          onClick={() => goToStep(1)}
                        >
                          <ChevronRight className="h-4 w-4 mr-2 rotate-180" />
                          Back to Select Collection
                        </Button>
                      </div>
                    ) : !isConnected ? (
                      <div className="text-center py-12">
                        <div className="mx-auto w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mb-4">
                          <Wallet className="h-8 w-8 text-primary" />
                        </div>
                        <h3 className="text-lg font-semibold mb-2">Connect Your Wallet</h3>
                        <p className="text-muted-foreground mb-2 max-w-md mx-auto">
                          Connect your wallet to mint NFTs to the <Badge className="mx-1">{selectedCollection?.chain}</Badge> blockchain
                        </p>
                        <p className="text-sm text-muted-foreground mb-6">
                          Make sure your wallet is set to the <strong>{selectedCollection?.chain}</strong> network before connecting.
                        </p>
                        <Button
                          onClick={connectWallet}
                          disabled={isConnecting}
                          size="lg"
                        >
                          {isConnecting ? (
                            <>
                              <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                              Connecting...
                            </>
                          ) : (
                            <>
                              <Wallet className="h-5 w-5 mr-2" />
                              Connect Wallet
                            </>
                          )}
                        </Button>
                      </div>
                    ) : wrongNetwork ? (
                      <div className="text-center py-12">
                        <div className="mx-auto w-16 h-16 bg-amber-500/10 rounded-full flex items-center justify-center mb-4">
                          <AlertCircle className="h-8 w-8 text-amber-500" />
                        </div>
                        <h3 className="text-lg font-semibold mb-2">Wrong Network</h3>
                        <p className="text-muted-foreground mb-2">
                          Please switch to <Badge className="mx-1">{selectedCollection?.chain}</Badge> network
                        </p>
                        <p className="text-sm text-muted-foreground mb-6">
                          Your wallet is connected to a different network. Switch networks in your wallet to continue.
                        </p>
                        <div className="flex gap-3 justify-center">
                          <Button variant="outline" onClick={disconnectWallet}>
                            <LogOut className="h-4 w-4 mr-2" />
                            Disconnect
                          </Button>
                          <Button onClick={async () => {
                            try {
                              if (!selectedCollection?.chain) {
                                toast.info("Please switch network in your wallet");
                                return;
                              }

                              // Map chain names to network IDs (decimal)
                              const chainIdMap: Record<string, number> = {
                                "ETH": 1,
                                "BSC": 56,
                                "POLYGON": 137,
                                "MATIC": 137,
                                "ARBITRUM": 42161,
                                "OPTIMISM": 10,
                                "SEPOLIA": 11155111,
                              };

                              const targetChainId = chainIdMap[selectedCollection.chain.toUpperCase()];
                              if (!targetChainId) {
                                toast.error("Unsupported network");
                                return;
                              }

                              const toastId = toast.loading("Switching network...");

                              try {
                                // Use Wagmi's switchChain - no reload needed!
                                await switchChain({ chainId: targetChainId });
                                toast.success(`Switched to ${selectedCollection.chain} network`, { id: toastId });
                                // Network state updates automatically via hooks
                              } catch (switchError: any) {
                                // This error code indicates that the chain has not been added to wallet
                                if (switchError.code === 4902 || switchError.message?.includes('Unrecognized chain')) {
                                  toast.error("Please add this network to your wallet first", { id: toastId });
                                } else {
                                  throw switchError;
                                }
                              }
                            } catch (error: any) {
                              console.error("Failed to switch network:", error);
                              toast.error(error.message || "Failed to switch network. Please switch manually in your wallet.");
                            }
                          }}>
                            Switch Network
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-6">
                        <div className="flex items-center justify-between p-4 border rounded-lg bg-green-50 dark:bg-green-950/20">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-green-500 rounded-full flex items-center justify-center">
                              <CheckCircle className="h-6 w-6 text-white" />
                            </div>
                            <div>
                              <p className="font-semibold">Wallet Connected</p>
                              <p className="text-sm text-muted-foreground font-mono">
                                {address?.slice(0, 8)}...{address?.slice(-6)}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className="bg-green-100 dark:bg-green-900/30 border-green-200 dark:border-green-800 text-green-700 dark:text-green-300">
                              {selectedCollection?.chain}
                            </Badge>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={disconnectWallet}
                              className="h-8 px-2"
                            >
                              <LogOut className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="p-4 border rounded-lg">
                            <div className="flex justify-between items-center mb-2">
                              <span className="text-sm text-muted-foreground">Wallet Balance</span>
                              {loadingBalance && <Loader2 className="h-4 w-4 animate-spin" />}
                            </div>
                            <p className="text-2xl font-bold">
                              {walletBalance ? `${parseFloat(walletBalance).toFixed(4)}` : '0.0000'}
                            </p>
                            <p className="text-sm text-muted-foreground mt-1">{selectedCollection?.chain || 'ETH'}</p>
                            {walletBalance && parseFloat(walletBalance) === 0 && (
                              <p className="text-xs text-amber-600 mt-2 flex items-center gap-1">
                                <AlertCircle className="h-3 w-3" />
                                Your wallet has no balance. You'll need funds for gas fees.
                              </p>
                            )}
                          </div>

                          <div className="p-4 border rounded-lg">
                            <span className="text-sm text-muted-foreground">Network Status</span>
                            <p className="text-2xl font-bold flex items-center gap-2 mt-2">
                              <span className="w-3 h-3 bg-green-500 rounded-full animate-pulse" />
                              Connected
                            </p>
                            <p className="text-sm text-muted-foreground mt-1">Correct Network</p>
                          </div>
                        </div>

                        <div className="flex justify-between pt-4">
                          <Button
                            type="button"
                            variant="outline"
                            onClick={() => goToStep(1)}
                          >
                            <ChevronRight className="h-4 w-4 mr-2 rotate-180" />
                            Back
                          </Button>
                          <Button
                            type="button"
                            onClick={() => goToStep(3)}
                            disabled={!canProceedToStep(3)}
                          >
                            Next: Upload Image
                            <ChevronRight className="h-4 w-4 ml-2" />
                          </Button>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Step 3: IPFS Upload Guide & Input */}
              <TabsContent value="step-3" className="space-y-8">
                {showIPFSGuide ? (
                  <IPFSUploadGuide
                    onComplete={() => {
                      setShowIPFSGuide(false);
                      setShowIPFSInput(true);
                    }}
                  />
                ) : showIPFSInput ? (
                  <IPFSUrlInput
                    onImageValidated={(url, isValid) => {
                      if (isValid) {
                        setIpfsImageUrl(url);
                        setIpfsImageValidated(true);
                        setPreviewImage(url); // Set preview image for Step 6
                        form.setValue("ipfsImageUrl", url);
                        form.setValue("image", url); // Use IPFS URL as image
                      } else {
                        setIpfsImageValidated(false);
                      }
                    }}
                    onMetadataValidated={(url, metadata) => {
                      if (url && metadata) {
                        setIpfsMetadataUrl(url);
                        form.setValue("ipfsMetadataUrl", url);
                      }
                    }}
                    onComplete={() => goToStep(4)}
                    onShowGuide={() => {
                      setShowIPFSGuide(true);
                      setShowIPFSInput(false);
                    }}
                  />
                ) : null}

                {/* Navigation Buttons - Only show when not in guide/input flow */}
                {!showIPFSGuide && !showIPFSInput && (
                  <div className="flex justify-between">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        setShowIPFSGuide(true);
                        setShowIPFSInput(false);
                      }}
                    >
                      {tCommon("back")}
                    </Button>
                    <Button
                      type="button"
                      onClick={() => goToStep(4)}
                      disabled={!canProceedToStep(4)}
                      size="lg"
                    >
                      {tExt("continue")}
                      <ChevronRight className="h-4 w-4 ml-2" />
                    </Button>
                  </div>
                )}
              </TabsContent>

              {/* Step 4: NFT Details */}
              <TabsContent value="step-4" className="space-y-8">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                  {/* Basic Information */}
                  <Card className="lg:col-span-2">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <FileText className="h-5 w-5" />
                        {tDashboardAdmin("basic_information")}
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-6">
                      {/* First Row: Category and Name */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
                                  {Array.isArray(categories) && categories.length > 0 ? (
                                    categories.map((category: any) => (
                                      <SelectItem key={category.id} value={category.id}>
                                        {category.name}
                                      </SelectItem>
                                    ))
                                  ) : (
                                    <div className="px-2 py-1.5 text-sm text-muted-foreground">
                                      {loading ? "Loading..." : "No categories available"}
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
                          name="name"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>{tCommon("name")} *</FormLabel>
                              <FormControl>
                                <Input placeholder={t("enter_nft_name")} {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>

                      {/* Second Row: Description */}
                      <FormField
                        control={form.control}
                        name="description"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>{tCommon("description")}</FormLabel>
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

                      {/* Third Row: Tags */}
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
                    </CardContent>
                  </Card>
                </div>
                
                <div className="flex justify-between">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => goToStep(3)}
                  >
                    {tCommon("back")}
                  </Button>
                  <Button
                    type="button"
                    onClick={() => goToStep(5)}
                    disabled={!canProceedToStep(5)}
                  >
                    {tExt("continue")}
                    <ChevronRight className="h-4 w-4 ml-2" />
                  </Button>
                </div>
              </TabsContent>

              {/* Step 5: Properties & Settings */}
              <TabsContent value="step-5" className="space-y-8">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                  {/* Attributes */}
                  <Card className="lg:col-span-2">
                    <CardHeader>
                      <CardTitle className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Layers className="h-5 w-5" />
                          {t("attributes")}
                        </div>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={addAttribute}
                        >
                          <Plus className="h-4 w-4 mr-2" />
                          {tCommon("add_attribute")}
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
                                placeholder={tCommon("value")}
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
                        {tCommon("settings")}
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
                    onClick={() => goToStep(4)}
                  >
                    {tCommon("back")}
                  </Button>
                  <Button
                    type="button"
                    onClick={() => goToStep(6)}
                    disabled={!canProceedToStep(6)}
                  >
                    {tCommon("preview")}
                    <Eye className="h-4 w-4 ml-2" />
                  </Button>
                </div>
              </TabsContent>

              {/* Step 6: Preview & Mint */}
              <TabsContent value="step-6" className="space-y-8">
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
                            <h4 className="font-medium">{t("attributes")}</h4>
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
                          <span className="text-sm">{tExt("blockchain")}</span>
                          <Badge>
                            {selectedCollection?.chain || "Not selected"}
                          </Badge>
                        </div>

                        <div className="flex justify-between items-center">
                          <span className="text-sm">{tCommon("royalty")}</span>
                          <span className="text-sm font-medium">
                            {form.watch("royaltyPercentage") || 0}%
                          </span>
                        </div>

                        <Separator />

                        {/* Wallet Connection */}
                        <div className="space-y-2">
                          <h4 className="font-medium text-sm">Wallet Connection</h4>
                          {isConnected && address ? (
                            <div className="space-y-2 p-3 border rounded-lg bg-muted/30">
                              <div className="flex items-center justify-between">
                                <span className="text-xs text-muted-foreground">Address:</span>
                                <code className="text-xs bg-background px-2 py-1 rounded">
                                  {address.slice(0, 6)}...{address.slice(-4)}
                                </code>
                              </div>
                              <div className="flex items-center justify-between">
                                <span className="text-xs text-muted-foreground">Balance:</span>
                                <div className="flex items-center gap-2">
                                  {loadingBalance ? (
                                    <Loader2 className="h-3 w-3 animate-spin" />
                                  ) : (
                                    <span className="text-xs font-medium">
                                      {walletBalance ? `${parseFloat(walletBalance).toFixed(4)} ${selectedCollection?.chain || 'ETH'}` : "0.0000"}
                                    </span>
                                  )}
                                </div>
                              </div>
                              {walletBalance && parseFloat(walletBalance) === 0 && (
                                <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400 text-xs">
                                  <AlertCircle className="h-3 w-3" />
                                  <span>Insufficient balance for gas fees</span>
                                </div>
                              )}
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={disconnectWallet}
                                className="w-full h-7 text-xs"
                              >
                                Disconnect Wallet
                              </Button>
                            </div>
                          ) : (
                            <Button
                              type="button"
                              variant="default"
                              size="sm"
                              onClick={connectWallet}
                              disabled={isConnecting}
                              className="w-full"
                            >
                              {isConnecting ? (
                                <>
                                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                  Connecting...
                                </>
                              ) : (
                                <>
                                  <Wallet className="h-4 w-4 mr-2" />
                                  Connect Wallet
                                </>
                              )}
                            </Button>
                          )}
                        </div>

                        <Separator />

                        {/* Gas Estimate */}
                        {isConnected && (
                          <div className="space-y-2">
                            <h4 className="font-medium text-sm">Gas Estimate</h4>
                            <GasEstimator
                              operation="mint"
                              chain={selectedCollection?.chain || 'BSC'}
                              showDetails={false}
                            />
                          </div>
                        )}

                        <Separator />

                        <div className="space-y-2">
                          <h4 className="font-medium text-sm">{tCommon("what_happens_next")}</h4>
                          <ul className="text-xs text-muted-foreground space-y-1">
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
                    onClick={() => goToStep(5)}
                  >
                    {tCommon("back")}
                  </Button>
                  <div className="flex gap-4">
                    <Button type="button" variant="outline" onClick={() => router.back()}>
                      {tCommon("cancel")}
                    </Button>
                    <Button
                      type="submit"
                      disabled={loading || uploadingImage || !isConnected || !walletBalance || parseFloat(walletBalance) === 0 || !!(gasEstimate && !canAfford)}
                      size="lg"
                      className={`bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white`}
                    >
                      {loading ? (
                        <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                      ) : (
                        <Sparkles className="h-5 w-5 mr-2" />
                      )}
                      {!isConnected ? "Connect Wallet to Mint" : !walletBalance || parseFloat(walletBalance) === 0 ? "Insufficient Balance" : loading ? tCommon('creating_ellipsis') : "Mint NFT"}
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