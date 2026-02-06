"use client";

import { useState, useCallback, useEffect } from "react";
import { useRouter } from "@/i18n/routing";
import { useTranslations } from "next-intl";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
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
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  CalendarIcon,
  DollarSign,
  Gavel,
  TrendingUp,
  ArrowRight,
  ArrowLeft,
  Sparkles,
  Info,
  Clock,
  Target,
  Zap,
  CheckCircle2,
  AlertCircle,
  ShoppingBag,
  X,
  Home,
} from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { useNftStore } from "@/store/nft/nft-store";
import { motion, AnimatePresence } from "framer-motion";
import { Progress } from "@/components/ui/progress";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import LoadingSpinner from "@/components/ui/loading-spinner";
import { toast } from "sonner";
import { useWalletStore } from "@/store/nft/wallet-store";
import { WalletButton } from "@/app/[locale]/(ext)/nft/components/shared/WalletButton";

const listingSchema = z.object({
  type: z.enum(["FIXED_PRICE", "AUCTION"]),
  price: z.number().positive("Price must be greater than 0"),
  currency: z.string().min(1, "Currency is required"),
  reservePrice: z.number().positive().optional(),
  buyNowPrice: z.number().positive().optional(),
  minBidIncrement: z.number().positive().optional(),
  duration: z.string().optional(),
  startTime: z.date().optional(),
  endTime: z.date().optional(),
  description: z.string().optional(),
});

type ListingForm = z.infer<typeof listingSchema>;

interface ListNFTPageClientProps {
  tokenId: string;
}

// Duration presets in hours
const DURATION_PRESETS = [
  { value: "24", label: "1 Day", hours: 24 },
  { value: "72", label: "3 Days", hours: 72 },
  { value: "168", label: "7 Days", hours: 168 },
  { value: "336", label: "14 Days", hours: 336 },
  { value: "720", label: "30 Days", hours: 720 },
  { value: "custom", label: "Custom", hours: 0 },
];

export default function ListNFTPageClient({ tokenId }: ListNFTPageClientProps) {
  const router = useRouter();
  const { selectedToken, loading: nftLoading, fetchTokenById, listToken, loading } = useNftStore();
  const { isConnected } = useWalletStore();
  const [step, setStep] = useState(1);
  const totalSteps = 3;
  const [isApproving, setIsApproving] = useState(false);
  const [needsApproval, setNeedsApproval] = useState(false);
  const [approvalError, setApprovalError] = useState<string | null>(null);
  const [checkingApproval, setCheckingApproval] = useState(true); // Start with true to prevent flash

  // Check approval status on page load
  useEffect(() => {
    const checkApprovalStatus = async () => {
      if (!selectedToken?.collection?.contractAddress || !selectedToken?.tokenId) return;

      setCheckingApproval(true);
      try {
        // Check if wallet is connected first
        const { config } = await import("@/config/wallet");
        const { getConnectorClient } = await import("wagmi/actions");

        let connectorClient;
        try {
          connectorClient = await getConnectorClient(config);
        } catch (error: any) {
          // Wallet not connected - show banner anyway to prompt connection
          if (error.message?.includes("Connector not connected")) {
            console.log("[APPROVAL CHECK] Wallet not connected, assuming approval needed");
            setNeedsApproval(true);
            setApprovalError("Connect your wallet to check approval status.");
            setCheckingApproval(false);
            return;
          }
          throw error;
        }

        if (!connectorClient || !connectorClient.account) {
          console.log("[APPROVAL CHECK] No wallet account, assuming approval needed");
          setNeedsApproval(true);
          setApprovalError("Connect your wallet to check approval status.");
          setCheckingApproval(false);
          return;
        }

        const { checkNFTApproval } = await import("@/utils/nft-web3");

        // Get the marketplace contract address for this chain
        const chain = selectedToken.collection.chain?.toUpperCase() || "BSC";
        const marketplaceResponse = await fetch(`/api/nft/marketplace/contract?chain=${chain}`);

        if (!marketplaceResponse.ok) {
          console.error("[APPROVAL CHECK] Failed to get marketplace contract");
          // Assume approval needed if we can't check
          setNeedsApproval(true);
          setApprovalError("Unable to verify approval status.");
          setCheckingApproval(false);
          return;
        }

        const marketplaceData = await marketplaceResponse.json();
        const marketplaceAddress = marketplaceData[chain]?.contractAddress;

        if (!marketplaceAddress) {
          console.error("[APPROVAL CHECK] No marketplace contract found for chain:", chain);
          setNeedsApproval(true);
          setApprovalError(`No marketplace deployed for ${chain}.`);
          setCheckingApproval(false);
          return;
        }

        const isApproved = await checkNFTApproval({
          contractAddress: selectedToken.collection.contractAddress,
          tokenId: selectedToken.tokenId.toString(),
          operatorAddress: marketplaceAddress, // Use the actual marketplace address
        });

        if (!isApproved) {
          setNeedsApproval(true);
          setApprovalError("This NFT needs to be approved for marketplace operations before listing.");
        } else {
          setNeedsApproval(false);
          setApprovalError(null);
        }
      } catch (error: any) {
        console.error("Failed to check approval status:", error);
        // On error, assume approval is needed to be safe
        setNeedsApproval(true);
        setApprovalError("Unable to verify approval status. Please approve to continue.");
      } finally {
        setCheckingApproval(false);
      }
    };

    if (selectedToken) {
      checkApprovalStatus();
    }
  }, [selectedToken, isConnected]);

  useEffect(() => {
    if (tokenId) {
      fetchTokenById(tokenId);
    }
  }, [tokenId, fetchTokenById]);

  // Get chain-specific native currency
  const chain = selectedToken?.collection?.chain?.toUpperCase() || "ETH";
  const chainCurrency =
    chain === "BSC" || chain === "BINANCE" ? "BNB" :
    chain === "POLYGON" || chain === "MATIC" ? "MATIC" :
    "ETH";

  const form = useForm<ListingForm>({
    // @ts-ignore - Complex Zod type inference causing build issues
    resolver: zodResolver(listingSchema),
    defaultValues: {
      type: "FIXED_PRICE",
      currency: chainCurrency,
      price: 0,
      duration: "168",
    },
  });

  const listingType = form.watch("type");
  const selectedDuration = form.watch("duration");
  const watchedPrice = form.watch("price");

  const handleApprove = useCallback(async () => {
    if (!selectedToken?.collection?.contractAddress || !selectedToken?.tokenId) {
      toast.error("Missing NFT contract information");
      return;
    }

    setIsApproving(true);
    setApprovalError(null);

    try {
      // Check if wallet is connected first
      const { config } = await import("@/config/wallet");
      const { getConnectorClient } = await import("wagmi/actions");

      let connectorClient;
      try {
        connectorClient = await getConnectorClient(config);
      } catch (error: any) {
        // Wallet not connected
        if (error.message?.includes("Connector not connected")) {
          setIsApproving(false);
          toast.error("Please connect your wallet using the button in the header, then try again.");
          return;
        }
        throw error;
      }

      if (!connectorClient || !connectorClient.account) {
        setIsApproving(false);
        toast.error("Please connect your wallet using the button in the header, then try again.");
        return;
      }

      const { approveNFTForMarketplace } = await import("@/utils/nft-web3");

      // Get the marketplace contract address for this chain
      toast.info("Getting marketplace contract...");

      const chain = selectedToken.collection.chain?.toUpperCase() || "BSC";
      const marketplaceResponse = await fetch(`/api/nft/marketplace/contract?chain=${chain}`);

      if (!marketplaceResponse.ok) {
        throw new Error("Failed to get marketplace contract address");
      }

      const marketplaceData = await marketplaceResponse.json();
      const marketplaceAddress = marketplaceData[chain]?.contractAddress;

      if (!marketplaceAddress) {
        throw new Error(`No marketplace contract deployed for ${chain}. Please contact support.`);
      }

      toast.info("Opening MetaMask... Approve marketplace for this collection.");

      // Approve the marketplace contract for all NFTs in this collection
      // This is a one-time approval - you won't need to approve again for other NFTs from this collection
      const result = await approveNFTForMarketplace({
        contractAddress: selectedToken.collection.contractAddress,
        operatorAddress: marketplaceAddress, // Approve the marketplace contract
        approveAll: true, // Approve all NFTs in this collection (current and future)
      });

      if (result.success) {
        toast.success("Collection approved! You can now list any NFT from this collection.", { duration: 5000 });
        setNeedsApproval(false);
        setApprovalError(null);
      } else {
        throw new Error(result.error || "Approval failed");
      }
    } catch (error: any) {
      console.error("Approval error:", error);
      const errorMsg = error?.message || "Failed to approve NFT";

      // Don't show duplicate error if we already showed wallet connection error
      if (!errorMsg.includes("Connector not connected")) {
        setApprovalError(errorMsg);
        toast.error(errorMsg);
      }
    } finally {
      setIsApproving(false);
    }
  }, [selectedToken]);

  const onSubmit = useCallback(async (data: ListingForm) => {
    if (!selectedToken) return;

    const result = await listToken(selectedToken.id, data);

    // Check if there was an error
    if (result && result.error) {
      console.error("Failed to list NFT:", result.error);

      // Check if error is due to missing approval
      const errorMessage = result.error.toLowerCase();

      console.log("Error check - errorMessage:", errorMessage);

      if (errorMessage.includes("not approved") || errorMessage.includes("please approve")) {
        setNeedsApproval(true);
        setApprovalError(result.error);
        toast.error("Please approve your NFT first using the button above.", { duration: 8000 });
      } else {
        toast.error(`Failed to list NFT: ${result.error}`, { duration: 8000 });
      }

      // DO NOT redirect on error - stay on the page
      return;
    }

    // Success - show success message and redirect
    toast.success("NFT listed successfully!", { duration: 5000 });
    // Wait a bit before redirecting to let user see the success message
    setTimeout(() => {
      router.push(`/nft/token/${selectedToken.id}`);
    }, 1500);
  }, [listToken, selectedToken, router]);

  const handleCancel = useCallback(() => {
    router.back();
  }, [router]);

  const nextStep = () => {
    if (step < totalSteps) setStep(step + 1);
  };

  const prevStep = () => {
    if (step > 1) setStep(step - 1);
  };

  const canProceed = () => {
    if (step === 1) return listingType !== undefined;
    if (step === 2) return watchedPrice > 0;
    return true;
  };

  // Calculate fees
  const platformFee = watchedPrice * 0.025;
  const royaltyFee = watchedPrice * ((selectedToken?.collection?.royaltyPercentage || 0) / 100);
  const youReceive = watchedPrice - platformFee - royaltyFee;

  // Format crypto amounts with appropriate precision
  const formatCrypto = (amount: number) => {
    if (amount === 0) return "0";
    // For very small amounts, show up to 8 decimal places
    if (amount < 0.0001) return amount.toFixed(8).replace(/\.?0+$/, '');
    // For normal amounts, show up to 4 decimal places
    return amount.toFixed(4).replace(/\.?0+$/, '');
  };

  const slideVariants = {
    enter: (direction: number) => ({
      x: direction > 0 ? 100 : -100,
      opacity: 0,
    }),
    center: {
      x: 0,
      opacity: 1,
    },
    exit: (direction: number) => ({
      x: direction < 0 ? 100 : -100,
      opacity: 0,
    }),
  };

  // Only show simple spinner when we don't have token data yet
  if (!selectedToken) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background relative">
      {/* Loading Overlay */}
      {loading && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center">
          <Card className="w-full max-w-md mx-4">
            <CardContent className="p-8">
              <div className="flex flex-col items-center gap-4 text-center">
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                >
                  <Sparkles className="h-12 w-12 text-primary" />
                </motion.div>
                <div className="space-y-2">
                  <h3 className="text-lg font-semibold">Creating Your Listing</h3>
                  <p className="text-sm text-muted-foreground">
                    Please wait while we create your NFT listing on the marketplace...
                  </p>
                </div>
                <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
                  <motion.div
                    className="h-full bg-primary"
                    initial={{ width: "0%" }}
                    animate={{ width: "100%" }}
                    transition={{ duration: 2, repeat: Infinity }}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Header */}
      <div className="sticky top-0 z-50 border-b bg-background">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between max-w-4xl mx-auto">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="icon"
                onClick={handleCancel}
              >
                <X className="h-5 w-5" />
              </Button>
              <div>
                <h1 className="text-xl font-bold flex items-center gap-2">
                  <ShoppingBag className="h-5 w-5 text-primary" />
                  List NFT for Sale
                </h1>
                <p className="text-sm text-muted-foreground">
                  List your NFT on the marketplace and start earning
                </p>
              </div>
            </div>
            <Button
              variant="outline"
              onClick={() => router.push("/")}
              className="hidden sm:flex"
            >
              <Home className="h-4 w-4 mr-2" />
              Home
            </Button>
          </div>
        </div>
      </div>

      {/* Progress Steps */}
      <div className="border-b bg-muted/20">
        <div className="container mx-auto px-4 py-6">
          <div className="max-w-4xl mx-auto">
            <div className="flex justify-between mb-4">
              {["Choose Type", "Set Price", "Review"].map((label, index) => (
                <div key={index} className="flex items-center gap-3">
                  <div
                    className={cn(
                      "w-10 h-10 rounded-full flex items-center justify-center text-sm font-semibold transition-all",
                      step > index + 1
                        ? "bg-green-500 text-white"
                        : step === index + 1
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted text-muted-foreground"
                    )}
                  >
                    {step > index + 1 ? <CheckCircle2 className="h-5 w-5" /> : index + 1}
                  </div>
                  <span
                    className={cn(
                      "text-sm font-medium",
                      step === index + 1 ? "text-foreground" : "text-muted-foreground"
                    )}
                  >
                    {label}
                  </span>
                </div>
              ))}
            </div>
            <Progress value={(step / totalSteps) * 100} className="h-2" />
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <AnimatePresence mode="wait">
            {/* Step 1: Choose Listing Type */}
            {step === 1 && (
              <motion.div
                key="step1"
                variants={slideVariants}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{ duration: 0.3 }}
                className="space-y-8"
              >
                {/* Approval Status - Show loading or banner */}
                {checkingApproval ? (
                  <Card className="border-2 border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/20">
                    <CardContent className="p-4">
                      <div className="flex items-center gap-3">
                        <LoadingSpinner className="h-5 w-5 text-gray-600" />
                        <p className="text-sm text-gray-700 dark:text-gray-300">
                          Checking approval status...
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                ) : needsApproval ? (
                  <Card className="border-2 border-blue-500 bg-blue-50 dark:bg-blue-950/20">
                    <CardContent className="p-4">
                      <div className="flex items-start gap-3">
                        <AlertCircle className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
                        <div className="flex-1">
                          <h4 className="font-semibold text-sm text-blue-900 dark:text-blue-100 mb-1">
                            {!isConnected ? "Wallet Connection Required" : "Approval Required"}
                          </h4>
                          <div className="text-xs text-blue-800 dark:text-blue-200 mb-2 space-y-1">
                            <p>
                              {!isConnected
                                ? "Connect your wallet to approve this collection for marketplace listing."
                                : `Approve marketplace to manage all NFTs in the "${selectedToken.collection?.name || 'this'}" collection. One-time approval for current and future NFTs.`}
                            </p>
                            {isConnected && (
                              <p className="italic">
                                Note: MetaMask may show "Withdrawal request" - this is normal. You're only giving permission to list NFTs for sale.
                              </p>
                            )}
                          </div>
                          {!isConnected ? (
                            <WalletButton className="h-8 text-xs" />
                          ) : (
                            <Button
                              onClick={handleApprove}
                              disabled={isApproving}
                              size="sm"
                              className="bg-blue-600 hover:bg-blue-700 h-8 text-xs text-white"
                            >
                              {isApproving ? (
                                <>
                                  <CheckCircle2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                                  Approving...
                                </>
                              ) : (
                                <>
                                  <CheckCircle2 className="h-3.5 w-3.5 mr-1.5" />
                                  Approve Collection
                                </>
                              )}
                            </Button>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ) : null}

                {/* NFT Preview Card */}
                <Card className="overflow-hidden border">
                  <CardContent className="p-0">
                    <div className="flex items-center gap-6 p-6">
                      <div className="relative w-24 h-24 rounded-xl overflow-hidden bg-muted flex-shrink-0">
                        {selectedToken.image && (
                          <img
                            src={selectedToken.image}
                            alt={selectedToken.name}
                            className="w-full h-full object-cover"
                          />
                        )}
                      </div>
                      <div className="flex-1">
                        <h2 className="font-bold text-xl mb-1">{selectedToken.name}</h2>
                        <p className="text-sm text-muted-foreground mb-2">
                          {selectedToken.collection?.name}
                        </p>
                        <div className="flex gap-2">
                          <Badge variant="secondary" className="text-xs">
                            Token #{selectedToken.tokenId}
                          </Badge>
                          <Badge variant="outline" className="text-xs">
                            {selectedToken.collection?.chain || "ETH"}
                          </Badge>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <div className="space-y-6">
                  <div className="flex items-center gap-3">
                    <Sparkles className="h-5 w-5 text-primary" />
                    <h3 className="text-lg font-bold">Choose Listing Type</h3>
                  </div>

                  <Form {...form}>
                    <FormField
                      control={form.control}
                      name="type"
                      render={({ field }) => (
                        <FormItem>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {/* Fixed Price */}
                            <motion.div
                              whileHover={{ scale: 1.01 }}
                              whileTap={{ scale: 0.99 }}
                              className={cn(
                                "relative border-2 rounded-xl p-6 cursor-pointer transition-all",
                                field.value === "FIXED_PRICE"
                                  ? "border-primary bg-primary/5"
                                  : "border-border hover:border-primary/50 hover:bg-muted/30"
                              )}
                              onClick={() => field.onChange("FIXED_PRICE")}
                            >
                              {field.value === "FIXED_PRICE" && (
                                <div className="absolute top-4 right-4">
                                  <CheckCircle2 className="h-6 w-6 text-primary" />
                                </div>
                              )}
                              <div className="flex flex-col gap-4">
                                <div className="p-4 bg-primary/10 rounded-xl w-fit">
                                  <DollarSign className="h-8 w-8 text-primary" />
                                </div>
                                <div>
                                  <h4 className="font-bold text-lg mb-2">Fixed Price</h4>
                                  <p className="text-sm text-muted-foreground">
                                    List at a set price. Buyers can purchase instantly without waiting.
                                  </p>
                                </div>
                                <div className="flex items-center gap-2 mt-2 pt-4 border-t">
                                  <Zap className="h-5 w-5 text-yellow-500" />
                                  <span className="text-sm font-semibold text-yellow-600 dark:text-yellow-500">
                                    Instant Sale • Best for quick sales
                                  </span>
                                </div>
                              </div>
                            </motion.div>

                            {/* Auction */}
                            <motion.div
                              whileHover={{ scale: 1.01 }}
                              whileTap={{ scale: 0.99 }}
                              className={cn(
                                "relative border-2 rounded-xl p-6 cursor-pointer transition-all",
                                field.value === "AUCTION"
                                  ? "border-primary bg-primary/5"
                                  : "border-border hover:border-primary/50 hover:bg-muted/30"
                              )}
                              onClick={() => field.onChange("AUCTION")}
                            >
                              {field.value === "AUCTION" && (
                                <div className="absolute top-4 right-4">
                                  <CheckCircle2 className="h-6 w-6 text-primary" />
                                </div>
                              )}
                              <div className="flex flex-col gap-4">
                                <div className="p-4 bg-primary/10 rounded-xl w-fit">
                                  <Gavel className="h-8 w-8 text-primary" />
                                </div>
                                <div>
                                  <h4 className="font-bold text-lg mb-2">Timed Auction</h4>
                                  <p className="text-sm text-muted-foreground">
                                    Sell to the highest bidder. Set a reserve price and watch bids compete.
                                  </p>
                                </div>
                                <div className="flex items-center gap-2 mt-2 pt-4 border-t">
                                  <TrendingUp className="h-5 w-5 text-green-500" />
                                  <span className="text-sm font-semibold text-green-600 dark:text-green-500">
                                    Maximize Value • Best for rare items
                                  </span>
                                </div>
                              </div>
                            </motion.div>
                          </div>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </Form>
                </div>
              </motion.div>
            )}

            {/* Step 2: Set Price & Duration */}
            {step === 2 && (
              <motion.div
                key="step2"
                variants={slideVariants}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{ duration: 0.3 }}
                className="space-y-8"
              >
                <Form {...form}>
                  <div className="space-y-8">
                    {/* Price Input */}
                    <Card className="border-2">
                      <CardContent className="p-6">
                        <FormField
                          control={form.control}
                          name="price"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-sm font-semibold flex items-center gap-2 mb-1.5">
                                <Target className="h-4 w-4 text-primary" />
                                {listingType === "AUCTION" ? "Starting Price" : "Sale Price"}
                              </FormLabel>
                              <FormDescription className="text-xs mb-2">
                                {listingType === "AUCTION"
                                  ? "Set the minimum starting bid for your auction"
                                  : "Set your listing price. Buyers will pay this amount to purchase."}
                              </FormDescription>
                              <div className="flex gap-3">
                                <FormControl>
                                  <Input
                                    type="number"
                                    step="0.001"
                                    placeholder="0.00"
                                    {...field}
                                    onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                                    className="flex-1 text-base h-10 font-semibold"
                                  />
                                </FormControl>
                                <div className="flex items-center justify-center px-4 bg-primary/10 border-2 border-primary/20 rounded-lg min-w-[80px]">
                                  <span className="font-semibold text-sm text-primary">{chainCurrency}</span>
                                </div>
                              </div>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </CardContent>
                    </Card>

                    {/* Duration */}
                    <Card className="border-2">
                      <CardContent className="p-6">
                        <FormField
                          control={form.control}
                          name="duration"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-sm font-semibold flex items-center gap-2 mb-1.5">
                                <Clock className="h-4 w-4 text-primary" />
                                Listing Duration
                              </FormLabel>
                              <FormDescription className="text-xs mb-2">
                                How long your NFT will be listed on the marketplace
                              </FormDescription>
                              <Select value={field.value} onValueChange={field.onChange}>
                                <FormControl>
                                  <SelectTrigger className="h-10 text-sm">
                                    <SelectValue />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  {DURATION_PRESETS.map((duration) => (
                                    <SelectItem
                                      key={duration.value}
                                      value={duration.value}
                                      className="text-sm py-2"
                                    >
                                      <div className="flex items-center gap-2">
                                        <Clock className="h-4 w-4" />
                                        {duration.label}
                                      </div>
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </CardContent>
                    </Card>

                    {/* Auction-specific fields */}
                    {listingType === "AUCTION" && (
                      <Card className="border-2 bg-muted/30">
                        <CardContent className="p-6">
                          <h4 className="font-semibold text-sm flex items-center gap-2 mb-3">
                            <Gavel className="h-4 w-4" />
                            Auction Settings (Optional)
                          </h4>

                          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            <FormField
                              control={form.control}
                              name="reservePrice"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Reserve Price</FormLabel>
                                  <FormControl>
                                    <Input
                                      type="number"
                                      step="0.001"
                                      placeholder="Optional"
                                      {...field}
                                      onChange={(e) => field.onChange(parseFloat(e.target.value) || undefined)}
                                      className="h-12"
                                    />
                                  </FormControl>
                                  <FormDescription>
                                    Minimum price to accept
                                  </FormDescription>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />

                            <FormField
                              control={form.control}
                              name="buyNowPrice"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Buy Now Price</FormLabel>
                                  <FormControl>
                                    <Input
                                      type="number"
                                      step="0.001"
                                      placeholder="Optional"
                                      {...field}
                                      onChange={(e) => field.onChange(parseFloat(e.target.value) || undefined)}
                                      className="h-12"
                                    />
                                  </FormControl>
                                  <FormDescription>
                                    Instant purchase price
                                  </FormDescription>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />

                            <FormField
                              control={form.control}
                              name="minBidIncrement"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Min Bid Step</FormLabel>
                                  <FormControl>
                                    <Input
                                      type="number"
                                      step="0.001"
                                      placeholder="0.01"
                                      {...field}
                                      onChange={(e) => field.onChange(parseFloat(e.target.value) || undefined)}
                                      className="h-12"
                                    />
                                  </FormControl>
                                  <FormDescription>
                                    Minimum bid increment
                                  </FormDescription>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                          </div>

                          {/* Custom Date/Time */}
                          {selectedDuration === "custom" && (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6 pt-6 border-t">
                              <FormField
                                control={form.control}
                                name="startTime"
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel>Start Time (Optional)</FormLabel>
                                    <Popover>
                                      <PopoverTrigger asChild>
                                        <FormControl>
                                          <Button
                                            variant="outline"
                                            className={cn(
                                              "w-full pl-3 text-left font-normal h-12",
                                              !field.value && "text-muted-foreground"
                                            )}
                                          >
                                            {field.value ? (
                                              format(field.value, "PPP")
                                            ) : (
                                              <span>Pick a date</span>
                                            )}
                                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                          </Button>
                                        </FormControl>
                                      </PopoverTrigger>
                                      <PopoverContent className="w-auto p-0" align="start">
                                        <Calendar
                                          mode="single"
                                          selected={field.value}
                                          onSelect={field.onChange}
                                          disabled={(date) => date < new Date()}
                                          initialFocus
                                        />
                                      </PopoverContent>
                                    </Popover>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />

                              <FormField
                                control={form.control}
                                name="endTime"
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel>End Time</FormLabel>
                                    <Popover>
                                      <PopoverTrigger asChild>
                                        <FormControl>
                                          <Button
                                            variant="outline"
                                            className={cn(
                                              "w-full pl-3 text-left font-normal h-12",
                                              !field.value && "text-muted-foreground"
                                            )}
                                          >
                                            {field.value ? (
                                              format(field.value, "PPP")
                                            ) : (
                                              <span>Pick a date</span>
                                            )}
                                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                          </Button>
                                        </FormControl>
                                      </PopoverTrigger>
                                      <PopoverContent className="w-auto p-0" align="start">
                                        <Calendar
                                          mode="single"
                                          selected={field.value}
                                          onSelect={field.onChange}
                                          disabled={(date) => date < new Date()}
                                          initialFocus
                                        />
                                      </PopoverContent>
                                    </Popover>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    )}

                    {/* Description */}
                    <Card className="border-2">
                      <CardContent className="p-6">
                        <FormField
                          control={form.control}
                          name="description"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-sm font-semibold flex items-center gap-2 mb-1.5">
                                <Info className="h-4 w-4 text-primary" />
                                Description (Optional)
                              </FormLabel>
                              <FormDescription className="text-xs mb-2">
                                Add additional details about your listing
                              </FormDescription>
                              <FormControl>
                                <Textarea
                                  placeholder="E.g., Accepting offers, willing to negotiate, special conditions..."
                                  {...field}
                                  rows={4}
                                  className="resize-none text-sm"
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </CardContent>
                    </Card>
                  </div>
                </Form>
              </motion.div>
            )}

            {/* Step 3: Review & Confirm */}
            {step === 3 && (
              <motion.div
                key="step3"
                variants={slideVariants}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{ duration: 0.3 }}
                className="space-y-8"
              >
                <div className="flex items-center gap-2 mb-4">
                  <CheckCircle2 className="h-4 w-4 text-primary" />
                  <h3 className="text-base font-semibold">Review Your Listing</h3>
                </div>

                {/* Approval Status */}
                {checkingApproval ? (
                  <Card className="border-2 border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/20">
                    <CardContent className="p-4">
                      <div className="flex items-center gap-3">
                        <LoadingSpinner className="h-5 w-5 text-gray-600" />
                        <p className="text-sm text-gray-700 dark:text-gray-300">
                          Checking approval status...
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                ) : needsApproval ? (
                  <Card className="border-2 border-blue-500 bg-blue-50 dark:bg-blue-950/20">
                    <CardContent className="p-4">
                      <div className="flex items-start gap-3">
                        <AlertCircle className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
                        <div className="flex-1">
                          <h4 className="font-semibold text-sm text-blue-900 dark:text-blue-100 mb-1">
                            {!isConnected ? "Wallet Connection Required" : "Approval Required"}
                          </h4>
                          <div className="text-xs text-blue-800 dark:text-blue-200 mb-2 space-y-1">
                            <p>
                              {!isConnected
                                ? "Connect your wallet to approve this collection for marketplace listing."
                                : `Approve marketplace to manage all NFTs in the "${selectedToken.collection?.name || 'this'}" collection. One-time approval for current and future NFTs.`}
                            </p>
                            {isConnected && (
                              <p className="italic">
                                Note: MetaMask may show "Withdrawal request" - this is normal. You're only giving permission to list NFTs for sale.
                              </p>
                            )}
                          </div>
                          {!isConnected ? (
                            <WalletButton className="h-8 text-xs" />
                          ) : (
                            <Button
                              onClick={handleApprove}
                              disabled={isApproving}
                              size="sm"
                              className="bg-blue-600 hover:bg-blue-700 h-8 text-xs text-white"
                            >
                              {isApproving ? (
                                <>
                                  <CheckCircle2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                                  Approving...
                                </>
                              ) : (
                                <>
                                  <CheckCircle2 className="h-3.5 w-3.5 mr-1.5" />
                                  Approve Collection
                                </>
                              )}
                            </Button>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ) : null}

                {/* Listing Summary */}
                <Card className="border-2">
                  <CardContent className="p-6">
                    <div className="flex items-start gap-4 mb-4">
                      <div className="w-24 h-24 rounded-xl overflow-hidden bg-gradient-to-br from-primary/20 to-primary/5 flex-shrink-0">
                        {selectedToken.image && (
                          <img
                            src={selectedToken.image}
                            alt={selectedToken.name}
                            className="w-full h-full object-cover"
                          />
                        )}
                      </div>
                      <div className="flex-1">
                        <h4 className="font-semibold text-base mb-1">{selectedToken.name}</h4>
                        <p className="text-xs text-muted-foreground mb-2">{selectedToken.collection?.name}</p>
                        <div className="flex gap-2">
                          <Badge variant="secondary" className="text-xs px-2 py-0.5">
                            #{selectedToken.tokenId}
                          </Badge>
                          <Badge variant="outline" className="text-xs px-2 py-0.5">
                            {listingType === "FIXED_PRICE" ? "Fixed Price" : "Auction"}
                          </Badge>
                        </div>
                      </div>
                    </div>

                    <Separator className="my-4" />

                    <div className="space-y-3">
                      <div className="flex justify-between items-center text-sm">
                        <span className="text-muted-foreground">Listing Type</span>
                        <span className="font-medium flex items-center gap-1.5">
                          {listingType === "FIXED_PRICE" ? (
                            <>
                              <DollarSign className="h-3.5 w-3.5" />
                              Fixed Price
                            </>
                          ) : (
                            <>
                              <Gavel className="h-3.5 w-3.5" />
                              Auction
                            </>
                          )}
                        </span>
                      </div>

                      <div className="flex justify-between items-center">
                        <span className="text-muted-foreground text-sm">
                          {listingType === "AUCTION" ? "Starting Price" : "Price"}
                        </span>
                        <span className="font-bold text-lg text-primary">
                          {watchedPrice} {chainCurrency}
                        </span>
                      </div>

                      <div className="flex justify-between items-center text-sm">
                        <span className="text-muted-foreground">Duration</span>
                        <span className="font-medium">
                          {DURATION_PRESETS.find(d => d.value === selectedDuration)?.label || "Custom"}
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Fee Breakdown */}
                {watchedPrice > 0 && (
                  <Card className="border-2 bg-gradient-to-br from-muted/50 to-muted/20">
                    <CardContent className="p-6">
                      <h4 className="font-semibold text-sm flex items-center gap-2 mb-3">
                        <DollarSign className="h-4 w-4" />
                        Fee Breakdown
                      </h4>

                      <div className="space-y-2.5">
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Listing Price</span>
                          <span className="font-medium">{formatCrypto(watchedPrice)} {chainCurrency}</span>
                        </div>

                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground flex items-center gap-1.5">
                            Platform Fee (2.5%)
                            <Info className="h-3.5 w-3.5" />
                          </span>
                          <span className="font-medium text-orange-600 dark:text-orange-500">
                            - {formatCrypto(platformFee)} {chainCurrency}
                          </span>
                        </div>

                        {(selectedToken.collection?.royaltyPercentage ?? 0) > 0 && (
                          <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground flex items-center gap-1.5">
                              Creator Royalty ({selectedToken.collection?.royaltyPercentage}%)
                              <Info className="h-3.5 w-3.5" />
                            </span>
                            <span className="font-medium text-orange-600 dark:text-orange-500">
                              - {formatCrypto(royaltyFee)} {chainCurrency}
                            </span>
                          </div>
                        )}

                        <Separator className="my-2" />

                        <div className="flex justify-between items-center pt-1">
                          <span className="font-semibold text-sm">You'll Receive</span>
                          <span className="font-bold text-lg text-green-600 dark:text-green-500">
                            {formatCrypto(youReceive)} {chainCurrency}
                          </span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Important Notice */}
                <Card className="border-2 border-yellow-500/30 bg-yellow-500/10">
                  <CardContent className="p-6">
                    <div className="flex gap-4">
                      <AlertCircle className="h-5 w-5 text-yellow-600 dark:text-yellow-500 flex-shrink-0 mt-0.5" />
                      <div className="space-y-2">
                        <h5 className="font-bold text-sm">Important Notice</h5>
                        <p className="text-xs text-muted-foreground leading-relaxed">
                          Once listed, your NFT will be locked in a smart contract until the listing expires or is cancelled.
                          You can cancel the listing at any time, but you'll need to pay gas fees for the cancellation transaction.
                          Please ensure all details are correct before confirming.
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Footer Actions */}
          <div className="sticky bottom-0 mt-8 border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 -mx-4 px-4 py-6">
            <div className="max-w-4xl mx-auto flex justify-between items-center">
              <Button
                type="button"
                variant="outline"
                onClick={step === 1 ? handleCancel : prevStep}
                disabled={loading}
                size="lg"
                className="min-w-[120px]"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                {step === 1 ? "Cancel" : "Back"}
              </Button>

              <div className="flex gap-3">
                {step < totalSteps ? (
                  <Button
                    onClick={nextStep}
                    disabled={!canProceed()}
                    size="lg"
                    className="min-w-[140px]"
                  >
                    Continue
                    <ArrowRight className="h-4 w-4 ml-2" />
                  </Button>
                ) : (
                  <>
                    {needsApproval && isConnected && (
                      <Button
                        onClick={handleApprove}
                        disabled={isApproving}
                        size="lg"
                        className="min-w-[160px] bg-blue-600 hover:bg-blue-700 text-white"
                      >
                        {isApproving ? (
                          <>
                            <motion.div
                              animate={{ rotate: 360 }}
                              transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                              className="mr-2"
                            >
                              <CheckCircle2 className="h-5 w-5" />
                            </motion.div>
                            Approving...
                          </>
                        ) : (
                          <>
                            <CheckCircle2 className="h-5 w-5 mr-2" />
                            Approve NFT
                          </>
                        )}
                      </Button>
                    )}
                    <Button
                      onClick={form.handleSubmit(onSubmit)}
                      disabled={loading || watchedPrice <= 0 || needsApproval}
                      size="lg"
                      className="min-w-[160px] bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70"
                      title={needsApproval ? "Please approve your NFT first" : ""}
                    >
                      {loading ? (
                        <>
                          <motion.div
                            animate={{ rotate: 360 }}
                            transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                            className="mr-2"
                          >
                            <Sparkles className="h-5 w-5" />
                          </motion.div>
                          Listing...
                        </>
                      ) : (
                        <>
                          <Sparkles className="h-5 w-5 mr-2" />
                          Confirm Listing
                        </>
                      )}
                    </Button>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
