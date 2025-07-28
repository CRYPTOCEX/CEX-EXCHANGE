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
} from "@/components/ui/form";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { CalendarIcon, DollarSign, Gavel, TrendingUp } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { useNftStore } from "@/store/nft/nft-store";
import type { NftToken } from "@/types/nft";

const listingSchema = z.object({
  type: z.enum(["FIXED_PRICE", "AUCTION"]),
  price: z.number().min(0.001, "Price must be greater than 0"),
  currency: z.string().min(1, "Currency is required"),
  reservePrice: z.number().optional(),
  buyNowPrice: z.number().optional(),
  startTime: z.date().optional(),
  endTime: z.date().optional(),
  description: z.string().optional(),
});

type ListingForm = z.infer<typeof listingSchema>;

interface ListNFTModalProps {
  isOpen: boolean;
  onClose: () => void;
  token: NftToken;
}

const CURRENCIES = [
  { value: "ETH", label: "Ethereum (ETH)" },
  { value: "USDC", label: "USD Coin (USDC)" },
  { value: "USDT", label: "Tether (USDT)" },
];

export default function ListNFTModal({ isOpen, onClose, token }: ListNFTModalProps) {
  const t = useTranslations("nft/modals/list");
  const { listToken, loading } = useNftStore();
  const [step, setStep] = useState(1);

  const form = useForm<ListingForm>({
    resolver: zodResolver(listingSchema),
    defaultValues: {
      type: "FIXED_PRICE",
      currency: "ETH",
      price: 0,
    },
  });

  const listingType = form.watch("type");

  const onSubmit = useCallback(async (data: ListingForm) => {
    try {
      await listToken(token.id, data);
      onClose();
      form.reset();
      setStep(1);
    } catch (error) {
      console.error("Failed to list NFT:", error);
    }
  }, [listToken, token.id, onClose, form]);

  const handleClose = useCallback(() => {
    onClose();
    form.reset();
    setStep(1);
  }, [onClose, form]);

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            {t("list_nft_for_sale")}
          </DialogTitle>
        </DialogHeader>

        {step === 1 && (
          <div className="space-y-6">
            {/* NFT Preview */}
            <div className="flex items-center gap-4 p-4 border rounded-lg">
              <div className="w-16 h-16 bg-muted rounded-lg overflow-hidden">
                {token.image && (
                  <img
                    src={token.image}
                    alt={token.name}
                    className="w-full h-full object-cover"
                  />
                )}
              </div>
              <div>
                <h3 className="font-semibold">{token.name}</h3>
                <p className="text-sm text-muted-foreground">
                  {token.collection?.name}
                </p>
                <Badge variant="secondary">#{token.tokenId}</Badge>
              </div>
            </div>

            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                {/* Listing Type */}
                <FormField
                  control={form.control}
                  name="type"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("listing_type")}</FormLabel>
                      <div className="grid grid-cols-2 gap-4">
                        <div
                          className={cn(
                            "border-2 rounded-lg p-4 cursor-pointer transition-colors",
                            field.value === "FIXED_PRICE"
                              ? "border-primary bg-primary/5"
                              : "border-muted hover:border-primary/50"
                          )}
                          onClick={() => field.onChange("FIXED_PRICE")}
                        >
                          <div className="flex items-center gap-3">
                            <DollarSign className="h-5 w-5" />
                            <div>
                              <h4 className="font-medium">{t("fixed_price")}</h4>
                              <p className="text-sm text-muted-foreground">
                                {t("sell_at_a_fixed_price")}
                              </p>
                            </div>
                          </div>
                        </div>

                        <div
                          className={cn(
                            "border-2 rounded-lg p-4 cursor-pointer transition-colors",
                            field.value === "AUCTION"
                              ? "border-primary bg-primary/5"
                              : "border-muted hover:border-primary/50"
                          )}
                          onClick={() => field.onChange("AUCTION")}
                        >
                          <div className="flex items-center gap-3">
                            <Gavel className="h-5 w-5" />
                            <div>
                              <h4 className="font-medium">{t("Auction")}</h4>
                              <p className="text-sm text-muted-foreground">
                                {t("sell_to_highest_bidder")}
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Price and Currency */}
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="price"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>
                          {listingType === "AUCTION" ? t("starting_price") : t("Price")}
                        </FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            step="0.001"
                            placeholder="0.00"
                            {...field}
                            onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="currency"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t("Currency")}</FormLabel>
                        <Select value={field.value} onValueChange={field.onChange}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {CURRENCIES.map((currency) => (
                              <SelectItem key={currency.value} value={currency.value}>
                                {currency.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                {/* Auction-specific fields */}
                {listingType === "AUCTION" && (
                  <>
                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="reservePrice"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>{t("reserve_price")} ({t("Optional")})</FormLabel>
                            <FormControl>
                              <Input
                                type="number"
                                step="0.001"
                                placeholder="0.00"
                                {...field}
                                onChange={(e) => field.onChange(parseFloat(e.target.value) || undefined)}
                              />
                            </FormControl>
                            <p className="text-xs text-muted-foreground">
                              {t("minimum_price_to_accept")}
                            </p>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="buyNowPrice"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>{t("buy_now_price")} ({t("Optional")})</FormLabel>
                            <FormControl>
                              <Input
                                type="number"
                                step="0.001"
                                placeholder="0.00"
                                {...field}
                                onChange={(e) => field.onChange(parseFloat(e.target.value) || undefined)}
                              />
                            </FormControl>
                            <p className="text-xs text-muted-foreground">
                              {t("price_for_instant_purchase")}
                            </p>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    {/* Auction Duration */}
                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="startTime"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>{t("start_time")} ({t("Optional")})</FormLabel>
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
                                      <span>{t("pick_a_date")}</span>
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
                            <FormLabel>{t("end_time")}</FormLabel>
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
                                      <span>{t("pick_a_date")}</span>
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
                  </>
                )}

                {/* Description */}
                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("Description")} ({t("Optional")})</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder={t("add_details_about_your_listing")}
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Actions */}
                <div className="flex justify-end gap-3 pt-4">
                  <Button type="button" variant="outline" onClick={handleClose}>
                    {t("Cancel")}
                  </Button>
                  <Button type="submit" disabled={loading}>
                    {loading ? t("listing") : t("list_nft")}
                  </Button>
                </div>
              </form>
            </Form>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
} 