"use client";

import { useState, useCallback } from "react";
import { useTranslations } from "next-intl";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import { Separator } from "@/components/ui/separator";
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
} from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { useNftStore } from "@/store/nft/nft-store";
import { useConfigStore } from "@/store/config";
import type { NftToken } from "@/types/nft";
import { motion, AnimatePresence } from "framer-motion";
import { Progress } from "@/components/ui/progress";
import { Card, CardContent } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

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

interface ListNFTModalProps {
  open: boolean;
  onClose: () => void;
  nft: NftToken;
}

// Chain-specific currencies mapping
const CHAIN_CURRENCIES: Record<string, { value: string; label: string; symbol: string }[]> = {
  ETH: [
    { value: "ETH", label: "Ethereum", symbol: "ETH" },
    { value: "WETH", label: "Wrapped Ethereum", symbol: "WETH" },
    { value: "USDC", label: "USD Coin", symbol: "USDC" },
    { value: "USDT", label: "Tether", symbol: "USDT" },
  ],
  ETHEREUM: [
    { value: "ETH", label: "Ethereum", symbol: "ETH" },
    { value: "WETH", label: "Wrapped Ethereum", symbol: "WETH" },
    { value: "USDC", label: "USD Coin", symbol: "USDC" },
    { value: "USDT", label: "Tether", symbol: "USDT" },
  ],
  BSC: [
    { value: "BNB", label: "BNB", symbol: "BNB" },
    { value: "WBNB", label: "Wrapped BNB", symbol: "WBNB" },
    { value: "USDC", label: "USD Coin", symbol: "USDC" },
    { value: "USDT", label: "Tether", symbol: "USDT" },
  ],
  BINANCE: [
    { value: "BNB", label: "BNB", symbol: "BNB" },
    { value: "WBNB", label: "Wrapped BNB", symbol: "WBNB" },
    { value: "USDC", label: "USD Coin", symbol: "USDC" },
    { value: "USDT", label: "Tether", symbol: "USDT" },
  ],
  POLYGON: [
    { value: "MATIC", label: "Polygon", symbol: "MATIC" },
    { value: "WMATIC", label: "Wrapped MATIC", symbol: "WMATIC" },
    { value: "USDC", label: "USD Coin", symbol: "USDC" },
    { value: "USDT", label: "Tether", symbol: "USDT" },
  ],
  MATIC: [
    { value: "MATIC", label: "Polygon", symbol: "MATIC" },
    { value: "WMATIC", label: "Wrapped MATIC", symbol: "WMATIC" },
    { value: "USDC", label: "USD Coin", symbol: "USDC" },
    { value: "USDT", label: "Tether", symbol: "USDT" },
  ],
};

// Duration presets in hours
const DURATION_PRESETS = [
  { value: "24", label: "1 Day", hours: 24 },
  { value: "72", label: "3 Days", hours: 72 },
  { value: "168", label: "7 Days", hours: 168 },
  { value: "336", label: "14 Days", hours: 336 },
  { value: "720", label: "30 Days", hours: 720 },
  { value: "custom", label: "Custom", hours: 0 },
];

export default function ListNFTModal({ open, onClose, nft }: ListNFTModalProps) {
  const t = useTranslations("ext");
  const { listToken, loading } = useNftStore();
  const { settings } = useConfigStore();
  const [step, setStep] = useState(1);
  const totalSteps = 3;

  // Check trading settings
  const fixedPriceEnabled = settings?.nftEnableFixedPriceSales ?? true;
  const auctionsEnabled = settings?.nftEnableAuctions ?? true;

  // Get chain-specific native currency
  const chain = nft?.collection?.chain?.toUpperCase() || "ETH";
  const chainCurrency =
    chain === "BSC" || chain === "BINANCE" ? "BNB" :
    chain === "POLYGON" || chain === "MATIC" ? "MATIC" :
    "ETH";

  const form = useForm<ListingForm>({
    // @ts-ignore - Complex Zod type inference causing build issues
    resolver: zodResolver(listingSchema),
    defaultValues: {
      type: fixedPriceEnabled ? "FIXED_PRICE" : auctionsEnabled ? "AUCTION" : "FIXED_PRICE",
      currency: chainCurrency,
      price: 0,
      duration: "168",
    },
  });

  const listingType = form.watch("type");
  const selectedDuration = form.watch("duration");
  const watchedPrice = form.watch("price");

  const onSubmit = useCallback(async (data: ListingForm) => {
    try {
      await listToken(nft.id, data);
      onClose();
      form.reset();
      setStep(1);
    } catch (error) {
      console.error("Failed to list NFT:", error);
    }
  }, [listToken, nft.id, onClose, form]);

  const handleClose = useCallback(() => {
    onClose();
    form.reset();
    setStep(1);
  }, [onClose, form]);

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
  const royaltyFee = watchedPrice * ((nft.collection?.royaltyPercentage || 0) / 100);
  const youReceive = watchedPrice - platformFee - royaltyFee;

  const slideVariants = {
    enter: (direction: number) => ({
      x: direction > 0 ? 300 : -300,
      opacity: 0,
    }),
    center: {
      x: 0,
      opacity: 1,
    },
    exit: (direction: number) => ({
      x: direction < 0 ? 300 : -300,
      opacity: 0,
    }),
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-3xl max-h-[95vh] overflow-hidden p-0">
        <div className="relative">
          {/* Header with gradient */}
          <div className="bg-gradient-to-r from-primary/10 via-primary/5 to-background p-6 border-b">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-3 text-2xl">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <ShoppingBag className="h-6 w-6 text-primary" />
                </div>
                List NFT for Sale
              </DialogTitle>
              <p className="text-sm text-muted-foreground mt-2">
                List your NFT on the marketplace and start earning
              </p>
            </DialogHeader>

            {/* Progress Bar */}
            <div className="mt-6">
              <div className="flex justify-between mb-3">
                {["Choose Type", "Set Price", "Review"].map((label, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <div
                      className={cn(
                        "w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold transition-all",
                        step > index + 1
                          ? "bg-green-500 text-white"
                          : step === index + 1
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted text-muted-foreground"
                      )}
                    >
                      {step > index + 1 ? <CheckCircle2 className="h-4 w-4" /> : index + 1}
                    </div>
                    <span
                      className={cn(
                        "text-sm font-medium hidden sm:block",
                        step === index + 1 ? "text-foreground" : "text-muted-foreground"
                      )}
                    >
                      {label}
                    </span>
                  </div>
                ))}
              </div>
              <Progress value={(step / totalSteps) * 100} className="h-1" />
            </div>
          </div>

          {/* Content */}
          <div className="p-6 overflow-y-auto max-h-[calc(95vh-280px)]">
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
                  className="space-y-6"
                >
                  {/* NFT Preview Card */}
                  <Card className="overflow-hidden border-2">
                    <CardContent className="p-0">
                      <div className="flex items-center gap-4 p-4">
                        <div className="relative w-20 h-20 rounded-xl overflow-hidden bg-gradient-to-br from-primary/20 to-primary/5">
                          {nft.image && (
                            <img
                              src={nft.image}
                              alt={nft.name}
                              className="w-full h-full object-cover"
                            />
                          )}
                          <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent" />
                        </div>
                        <div className="flex-1">
                          <h3 className="font-bold text-lg">{nft.name}</h3>
                          <p className="text-sm text-muted-foreground flex items-center gap-2">
                            {nft.collection?.name}
                          </p>
                          <Badge variant="secondary" className="mt-1">
                            Token #{nft.tokenId}
                          </Badge>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <div className="space-y-4">
                    <div className="flex items-center gap-2 mb-4">
                      <Sparkles className="h-5 w-5 text-primary" />
                      <h3 className="text-lg font-semibold">Choose Listing Type</h3>
                    </div>

                    {!fixedPriceEnabled && !auctionsEnabled ? (
                      <Alert variant="destructive">
                        <AlertCircle className="h-4 w-4" />
                        <AlertTitle>Listings Disabled</AlertTitle>
                        <AlertDescription>
                          NFT listings are currently disabled by the marketplace administrator. Please contact support for more information.
                        </AlertDescription>
                      </Alert>
                    ) : (
                      <Form {...form}>
                        <FormField
                          control={form.control}
                          name="type"
                          render={({ field }) => (
                            <FormItem>
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {/* Fixed Price */}
                                {fixedPriceEnabled && (
                                  <motion.div
                                whileHover={{ scale: 1.02 }}
                                whileTap={{ scale: 0.98 }}
                                className={cn(
                                  "relative border-2 rounded-xl p-6 cursor-pointer transition-all",
                                  field.value === "FIXED_PRICE"
                                    ? "border-primary bg-primary/5 shadow-lg shadow-primary/20"
                                    : "border-muted hover:border-primary/50 hover:bg-muted/50"
                                )}
                                onClick={() => field.onChange("FIXED_PRICE")}
                              >
                                {field.value === "FIXED_PRICE" && (
                                  <div className="absolute top-3 right-3">
                                    <CheckCircle2 className="h-5 w-5 text-primary" />
                                  </div>
                                )}
                                <div className="flex flex-col gap-3">
                                  <div className="p-3 bg-primary/10 rounded-lg w-fit">
                                    <DollarSign className="h-6 w-6 text-primary" />
                                  </div>
                                  <div>
                                    <h4 className="font-bold text-lg">Fixed Price</h4>
                                    <p className="text-sm text-muted-foreground mt-1">
                                      List at a set price. Buyers can purchase instantly.
                                    </p>
                                  </div>
                                  <div className="flex items-center gap-2 mt-2">
                                    <Zap className="h-4 w-4 text-yellow-500" />
                                    <span className="text-xs font-medium text-yellow-600 dark:text-yellow-500">
                                      Instant Sale
                                    </span>
                                  </div>
                                </div>
                              </motion.div>
                                )}

                              {/* Auction */}
                              {auctionsEnabled && (
                                <motion.div
                                whileHover={{ scale: 1.02 }}
                                whileTap={{ scale: 0.98 }}
                                className={cn(
                                  "relative border-2 rounded-xl p-6 cursor-pointer transition-all",
                                  field.value === "AUCTION"
                                    ? "border-primary bg-primary/5 shadow-lg shadow-primary/20"
                                    : "border-muted hover:border-primary/50 hover:bg-muted/50"
                                )}
                                onClick={() => field.onChange("AUCTION")}
                              >
                                {field.value === "AUCTION" && (
                                  <div className="absolute top-3 right-3">
                                    <CheckCircle2 className="h-5 w-5 text-primary" />
                                  </div>
                                )}
                                <div className="flex flex-col gap-3">
                                  <div className="p-3 bg-primary/10 rounded-lg w-fit">
                                    <Gavel className="h-6 w-6 text-primary" />
                                  </div>
                                  <div>
                                    <h4 className="font-bold text-lg">Timed Auction</h4>
                                    <p className="text-sm text-muted-foreground mt-1">
                                      Sell to the highest bidder. Set reserve price.
                                    </p>
                                  </div>
                                  <div className="flex items-center gap-2 mt-2">
                                    <TrendingUp className="h-4 w-4 text-green-500" />
                                    <span className="text-xs font-medium text-green-600 dark:text-green-500">
                                      Maximize Value
                                    </span>
                                  </div>
                                </div>
                              </motion.div>
                              )}
                            </div>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </Form>
                    )}
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
                  className="space-y-6"
                >
                  <Form {...form}>
                    <div className="space-y-6">
                      {/* Price Input */}
                      <FormField
                        control={form.control}
                        name="price"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-base font-semibold flex items-center gap-2">
                              <Target className="h-4 w-4 text-primary" />
                              {listingType === "AUCTION" ? "Starting Price" : "Sale Price"}
                            </FormLabel>
                            <FormDescription>
                              {listingType === "AUCTION"
                                ? "Set the minimum starting bid for your auction"
                                : "Set your listing price. Buyers will pay this amount to purchase."}
                            </FormDescription>
                            <div className="flex gap-3 mt-3">
                              <FormControl>
                                <Input
                                  type="number"
                                  step="0.001"
                                  placeholder="0.00"
                                  {...field}
                                  onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                                  className="flex-1 text-2xl h-14 font-bold"
                                />
                              </FormControl>
                              <div className="flex items-center justify-center px-6 bg-primary/10 border-2 border-primary/20 rounded-lg min-w-[100px]">
                                <span className="font-bold text-lg text-primary">{chainCurrency}</span>
                              </div>
                            </div>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      {/* Duration */}
                      <FormField
                        control={form.control}
                        name="duration"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-base font-semibold flex items-center gap-2">
                              <Clock className="h-4 w-4 text-primary" />
                              Listing Duration
                            </FormLabel>
                            <FormDescription>
                              How long your NFT will be listed on the marketplace
                            </FormDescription>
                            <Select value={field.value} onValueChange={field.onChange}>
                              <FormControl>
                                <SelectTrigger className="h-12 text-base">
                                  <SelectValue />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {DURATION_PRESETS.map((duration) => (
                                  <SelectItem
                                    key={duration.value}
                                    value={duration.value}
                                    className="text-base py-3"
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

                      {/* Auction-specific fields */}
                      {listingType === "AUCTION" && (
                        <div className="space-y-4 p-4 bg-muted/50 rounded-lg border">
                          <h4 className="font-semibold flex items-center gap-2">
                            <Gavel className="h-4 w-4" />
                            Auction Settings
                          </h4>

                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <FormField
                              control={form.control}
                              name="reservePrice"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel className="text-sm">Reserve Price</FormLabel>
                                  <FormControl>
                                    <Input
                                      type="number"
                                      step="0.001"
                                      placeholder="Optional"
                                      {...field}
                                      onChange={(e) => field.onChange(parseFloat(e.target.value) || undefined)}
                                    />
                                  </FormControl>
                                  <FormDescription className="text-xs">
                                    Minimum to accept
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
                                  <FormLabel className="text-sm">Buy Now Price</FormLabel>
                                  <FormControl>
                                    <Input
                                      type="number"
                                      step="0.001"
                                      placeholder="Optional"
                                      {...field}
                                      onChange={(e) => field.onChange(parseFloat(e.target.value) || undefined)}
                                    />
                                  </FormControl>
                                  <FormDescription className="text-xs">
                                    Instant purchase
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
                                  <FormLabel className="text-sm">Min Bid Step</FormLabel>
                                  <FormControl>
                                    <Input
                                      type="number"
                                      step="0.001"
                                      placeholder="0.01"
                                      {...field}
                                      onChange={(e) => field.onChange(parseFloat(e.target.value) || undefined)}
                                    />
                                  </FormControl>
                                  <FormDescription className="text-xs">
                                    Bid increment
                                  </FormDescription>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                          </div>

                          {/* Custom Date/Time */}
                          {selectedDuration === "custom" && (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4 pt-4 border-t">
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
                                              "w-full pl-3 text-left font-normal",
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
                                              "w-full pl-3 text-left font-normal",
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
                        </div>
                      )}

                      {/* Description */}
                      <FormField
                        control={form.control}
                        name="description"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-base font-semibold flex items-center gap-2">
                              <Info className="h-4 w-4 text-primary" />
                              Description (Optional)
                            </FormLabel>
                            <FormDescription>
                              Add additional details about your listing
                            </FormDescription>
                            <FormControl>
                              <Textarea
                                placeholder="E.g., Accepting offers, willing to negotiate..."
                                {...field}
                                rows={3}
                                className="resize-none"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
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
                  className="space-y-6"
                >
                  <div className="flex items-center gap-2 mb-4">
                    <CheckCircle2 className="h-5 w-5 text-primary" />
                    <h3 className="text-lg font-semibold">Review Your Listing</h3>
                  </div>

                  {/* Listing Summary */}
                  <Card className="border-2">
                    <CardContent className="p-6 space-y-4">
                      <div className="flex items-start gap-4">
                        <div className="w-24 h-24 rounded-xl overflow-hidden bg-gradient-to-br from-primary/20 to-primary/5">
                          {nft.image && (
                            <img
                              src={nft.image}
                              alt={nft.name}
                              className="w-full h-full object-cover"
                            />
                          )}
                        </div>
                        <div className="flex-1">
                          <h4 className="font-bold text-xl">{nft.name}</h4>
                          <p className="text-sm text-muted-foreground">{nft.collection?.name}</p>
                          <div className="flex gap-2 mt-2">
                            <Badge variant="secondary">#{nft.tokenId}</Badge>
                            <Badge variant="outline">
                              {listingType === "FIXED_PRICE" ? "Fixed Price" : "Auction"}
                            </Badge>
                          </div>
                        </div>
                      </div>

                      <Separator />

                      <div className="space-y-3">
                        <div className="flex justify-between items-center">
                          <span className="text-muted-foreground">Listing Type</span>
                          <span className="font-semibold flex items-center gap-2">
                            {listingType === "FIXED_PRICE" ? (
                              <>
                                <DollarSign className="h-4 w-4" />
                                Fixed Price
                              </>
                            ) : (
                              <>
                                <Gavel className="h-4 w-4" />
                                Auction
                              </>
                            )}
                          </span>
                        </div>

                        <div className="flex justify-between items-center">
                          <span className="text-muted-foreground">
                            {listingType === "AUCTION" ? "Starting Price" : "Price"}
                          </span>
                          <span className="font-bold text-xl text-primary">
                            {watchedPrice} {chainCurrency}
                          </span>
                        </div>

                        <div className="flex justify-between items-center">
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
                    <Card className="border-2 bg-gradient-to-br from-muted/30 to-muted/10">
                      <CardContent className="p-6 space-y-4">
                        <h4 className="font-semibold flex items-center gap-2">
                          <DollarSign className="h-4 w-4" />
                          Fee Breakdown
                        </h4>

                        <div className="space-y-3">
                          <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">Listing Price</span>
                            <span className="font-medium">{watchedPrice.toFixed(4)} {chainCurrency}</span>
                          </div>

                          <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground flex items-center gap-1">
                              Platform Fee (2.5%)
                              <Info className="h-3 w-3" />
                            </span>
                            <span className="font-medium text-orange-600 dark:text-orange-500">
                              - {platformFee.toFixed(4)} {chainCurrency}
                            </span>
                          </div>

                          {(nft.collection?.royaltyPercentage ?? 0) > 0 && (
                            <div className="flex justify-between text-sm">
                              <span className="text-muted-foreground flex items-center gap-1">
                                Creator Royalty ({nft.collection?.royaltyPercentage}%)
                                <Info className="h-3 w-3" />
                              </span>
                              <span className="font-medium text-orange-600 dark:text-orange-500">
                                - {royaltyFee.toFixed(4)} {chainCurrency}
                              </span>
                            </div>
                          )}

                          <Separator />

                          <div className="flex justify-between items-center pt-2">
                            <span className="font-semibold text-base">You'll Receive</span>
                            <span className="font-bold text-2xl text-green-600 dark:text-green-500">
                              {youReceive.toFixed(4)} {chainCurrency}
                            </span>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  )}

                  {/* Important Notice */}
                  <Card className="border-2 border-yellow-500/20 bg-yellow-500/5">
                    <CardContent className="p-4">
                      <div className="flex gap-3">
                        <AlertCircle className="h-5 w-5 text-yellow-600 dark:text-yellow-500 flex-shrink-0 mt-0.5" />
                        <div className="space-y-1">
                          <h5 className="font-semibold text-sm">Important</h5>
                          <p className="text-xs text-muted-foreground">
                            Once listed, your NFT will be locked in a smart contract. You can cancel the listing at any time, but you'll need to pay gas fees. Make sure all details are correct before confirming.
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Footer Actions */}
          <div className="border-t bg-muted/30 p-6">
            <div className="flex justify-between items-center">
              <Button
                type="button"
                variant="outline"
                onClick={step === 1 ? handleClose : prevStep}
                disabled={loading}
                className="min-w-[100px]"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                {step === 1 ? "Cancel" : "Back"}
              </Button>

              <div className="flex gap-3">
                {step < totalSteps ? (
                  <Button
                    onClick={nextStep}
                    disabled={!canProceed()}
                    className="min-w-[120px]"
                  >
                    Continue
                    <ArrowRight className="h-4 w-4 ml-2" />
                  </Button>
                ) : (
                  <Button
                    onClick={form.handleSubmit(onSubmit)}
                    disabled={loading || watchedPrice <= 0}
                    className="min-w-[140px] bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70"
                  >
                    {loading ? (
                      <>
                        <motion.div
                          animate={{ rotate: 360 }}
                          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                          className="mr-2"
                        >
                          <Sparkles className="h-4 w-4" />
                        </motion.div>
                        Listing...
                      </>
                    ) : (
                      <>
                        <Sparkles className="h-4 w-4 mr-2" />
                        Confirm Listing
                      </>
                    )}
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
