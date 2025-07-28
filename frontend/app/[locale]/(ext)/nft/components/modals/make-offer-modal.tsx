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
import { Label } from "@/components/ui/label";
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
import { CalendarIcon, HandHeart, AlertCircle } from "lucide-react";
import { format, addDays } from "date-fns";
import { cn } from "@/lib/utils";
import { useNftStore } from "@/store/nft/nft-store";
import type { NftToken } from "@/types/nft";

const offerSchema = z.object({
  amount: z.number().min(0.001, "Offer amount must be greater than 0"),
  currency: z.string().min(1, "Currency is required"),
  expiresAt: z.date().min(new Date(), "Expiration date must be in the future"),
  message: z.string().optional(),
});

type OfferForm = z.infer<typeof offerSchema>;

interface MakeOfferModalProps {
  isOpen: boolean;
  onClose: () => void;
  token: NftToken;
}

const CURRENCIES = [
  { value: "ETH", label: "Ethereum (ETH)" },
  { value: "USDC", label: "USD Coin (USDC)" },
  { value: "USDT", label: "Tether (USDT)" },
];

const EXPIRY_OPTIONS = [
  { label: "1 hour", value: 1 / 24 },
  { label: "6 hours", value: 6 / 24 },
  { label: "1 day", value: 1 },
  { label: "3 days", value: 3 },
  { label: "7 days", value: 7 },
  { label: "30 days", value: 30 },
];

export default function MakeOfferModal({ isOpen, onClose, token }: MakeOfferModalProps) {
  const t = useTranslations("nft/modals/offer");
  const { makeOffer, loading } = useNftStore();

  const form = useForm<OfferForm>({
    resolver: zodResolver(offerSchema),
    defaultValues: {
      currency: "ETH",
      amount: 0,
      expiresAt: addDays(new Date(), 7),
    },
  });

  const watchedAmount = form.watch("amount");
  const watchedCurrency = form.watch("currency");

  const onSubmit = useCallback(async (data: OfferForm) => {
    try {
      await makeOffer(token.id, data);
      onClose();
      form.reset();
    } catch (error) {
      console.error("Failed to make offer:", error);
    }
  }, [makeOffer, token.id, onClose, form]);

  const handleClose = useCallback(() => {
    onClose();
    form.reset();
  }, [onClose, form]);

  const setExpiryDays = useCallback((days: number) => {
    const expiryDate = addDays(new Date(), days);
    form.setValue("expiresAt", expiryDate);
  }, [form]);

  const getFloorPrice = useCallback(() => {
    // Mock floor price - in real app this would come from the collection stats
    return token.collection?.stats?.floorPrice || 0;
  }, [token.collection?.stats?.floorPrice]);

  const isOfferBelowFloor = useCallback(() => {
    const floorPrice = getFloorPrice();
    return floorPrice > 0 && watchedAmount < floorPrice;
  }, [getFloorPrice, watchedAmount]);

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <HandHeart className="h-5 w-5" />
            {t("make_an_offer")}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* NFT Preview */}
          <div className="flex items-center gap-3 p-3 border rounded-lg">
            <div className="w-12 h-12 bg-muted rounded-lg overflow-hidden">
              {token.image && (
                <img
                  src={token.image}
                  alt={token.name}
                  className="w-full h-full object-cover"
                />
              )}
            </div>
            <div className="flex-1">
              <h3 className="font-medium text-sm">{token.name}</h3>
              <p className="text-xs text-muted-foreground">
                {token.collection?.name}
              </p>
              <Badge variant="secondary" className="text-xs">
                #{token.tokenId}
              </Badge>
            </div>
          </div>

          {/* Current Price Info */}
          {token.currentListing && (
            <div className="bg-muted/50 rounded-lg p-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">
                  {t("current_price")}
                </span>
                <span className="font-medium">
                  {token.currentListing.price} {token.currentListing.currency}
                </span>
              </div>
            </div>
          )}

          {/* Floor Price Info */}
          {getFloorPrice() > 0 && (
            <div className="bg-muted/50 rounded-lg p-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">
                  {t("collection_floor")}
                </span>
                <span className="font-medium">
                  {getFloorPrice()} ETH
                </span>
              </div>
            </div>
          )}

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              {/* Offer Amount */}
              <div className="grid grid-cols-2 gap-3">
                <FormField
                  control={form.control}
                  name="amount"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("offer_amount")}</FormLabel>
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

              {/* Warning for low offers */}
              {isOfferBelowFloor() && (
                <div className="flex items-start gap-2 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <AlertCircle className="h-4 w-4 text-yellow-600 mt-0.5" />
                  <div className="text-sm">
                    <p className="font-medium text-yellow-800">
                      {t("offer_below_floor_price")}
                    </p>
                    <p className="text-yellow-700">
                      {t("your_offer_is_below")}
                    </p>
                  </div>
                </div>
              )}

              {/* Quick Expiry Options */}
              <div className="space-y-2">
                <Label>{t("offer_expires_in")}</Label>
                <div className="grid grid-cols-3 gap-2">
                  {EXPIRY_OPTIONS.map((option) => (
                    <Button
                      key={option.label}
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setExpiryDays(option.value)}
                      className="text-xs"
                    >
                      {option.label}
                    </Button>
                  ))}
                </div>
              </div>

              {/* Custom Expiry Date */}
              <FormField
                control={form.control}
                name="expiresAt"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("custom_expiry_date")}</FormLabel>
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

              {/* Optional Message */}
              <FormField
                control={form.control}
                name="message"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("Message")} ({t("Optional")})</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder={t("add_a_personal_message_to_the_seller")}
                        rows={3}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Offer Summary */}
              <div className="bg-muted/50 rounded-lg p-4 space-y-2">
                <h4 className="font-medium text-sm">{t("offer_summary")}</h4>
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">{t("offer_amount")}</span>
                    <span className="font-medium">
                      {watchedAmount || 0} {watchedCurrency}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">{t("Expires")}</span>
                    <span>
                      {form.watch("expiresAt") 
                        ? format(form.watch("expiresAt"), "MMM dd, yyyy")
                        : "—"
                      }
                    </span>
                  </div>
                </div>
              </div>

              {/* Terms Notice */}
              <div className="text-xs text-muted-foreground bg-muted/30 rounded-lg p-3">
                <p>
                  {t("by_making_this_offer")}
                </p>
              </div>

              {/* Actions */}
              <div className="flex gap-3 pt-2">
                <Button type="button" variant="outline" onClick={handleClose} className="flex-1">
                  {t("Cancel")}
                </Button>
                <Button type="submit" disabled={loading || watchedAmount <= 0} className="flex-1">
                  {loading ? t("making_offer") : t("make_offer")}
                </Button>
              </div>
            </form>
          </Form>
        </div>
      </DialogContent>
    </Dialog>
  );
} 