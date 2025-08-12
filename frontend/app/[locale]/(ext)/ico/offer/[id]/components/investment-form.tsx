"use client";

import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { toast } from "sonner";
import { useIcoTransactionStore } from "@/store/ico/offer/transaction-store";
import { formatCurrency } from "@/lib/ico/utils";
import { useConfigStore } from "@/store/config";
import { useTranslations } from "next-intl";

interface InvestmentFormProps {
  offering: {
    id: string;
    name: string;
    tokenPrice: number;
    targetAmount: number;
    symbol: string;
  };
}

const InvestmentFormSchema = (minInvestment: number) =>
  z.object({
    amount: z.coerce
      .number({
        invalid_type_error: "Amount must be a number",
      })
      .min(
        minInvestment,
        `Minimum investment is ${formatCurrency(minInvestment)}`
      ),
    walletAddress: z.string().min(1, "Wallet address is required"),
  });

export function InvestmentForm({ offering }: InvestmentFormProps) {
  const t = useTranslations("ext");
  const { purchase } = useIcoTransactionStore();
  const { settings } = useConfigStore();
  const minInvestment = settings["icoMinInvestmentAmount"];
  const {
    register,
    control,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
    reset,
  } = useForm<z.infer<ReturnType<typeof InvestmentFormSchema>>>({
    resolver: zodResolver(InvestmentFormSchema(minInvestment)),
    defaultValues: {
      amount: minInvestment,
      walletAddress: "",
    },
  });

  const watchedAmount = watch("amount");
  const tokenAmount = watchedAmount / offering.tokenPrice;
  const platformFee = watchedAmount * 0.02;
  const totalAmount = watchedAmount * 1.02;

  const onSubmit = async (
    data: z.infer<ReturnType<typeof InvestmentFormSchema>>
  ) => {
    if (data.amount < minInvestment) {
      toast("Invalid amount", {
        description: `Minimum investment is ${formatCurrency(minInvestment)}`,
      });
      return;
    }

    await purchase(offering.id, data.amount, data.walletAddress);
    reset();
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          {t("invest_in")}
          {offering.name}
        </CardTitle>
        <CardDescription>
          {t("purchase_tokens_at_the_current_offering_price")}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {/* Investment Amount Field */}
          <div className="space-y-2">
            <Label htmlFor="amount">{t("investment_amount_(usd)")}</Label>
            <div className="flex items-center space-x-2">
              <span className="text-sm">/ $</span>
              <Input
                id="amount"
                type="number"
                step="10"
                {...register("amount", { valueAsNumber: true })}
              />
            </div>
            {errors.amount && (
              <p className="text-xs text-destructive">
                {errors.amount.message}
              </p>
            )}
            <Controller
              control={control}
              name="amount"
              render={({ field: { onChange, value } }) => (
                <Slider
                  defaultValue={[minInvestment]}
                  min={minInvestment}
                  max={offering.targetAmount * 0.1}
                  step={10}
                  value={[Number(value)]}
                  onValueChange={(val) => onChange(val[0])}
                  className="mt-2"
                />
              )}
            />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>
                min
                {formatCurrency(minInvestment)}
              </span>
              <span>
                {t("max")}
                {formatCurrency(offering.targetAmount * 0.1)}
              </span>
            </div>
          </div>

          {/* Computed Values */}
          <div className="space-y-2 pt-2">
            <div className="flex justify-between text-sm">
              <span>{t("token_price")}</span>
              <span>{formatCurrency(offering.tokenPrice)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span>{t("tokens_to_receive")}</span>
              <span>
                {tokenAmount.toLocaleString(undefined, {
                  maximumFractionDigits: 2,
                })}{" "}
                {offering.symbol}
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span>{t("platform_fee")}</span>
              <span>{formatCurrency(platformFee)}</span>
            </div>
            <div className="flex justify-between font-medium pt-2 border-t">
              <span>{t("total")}</span>
              <span>{formatCurrency(totalAmount)}</span>
            </div>
          </div>

          {/* Wallet Address Field */}
          <div className="space-y-2">
            <Label htmlFor="walletAddress">{t("wallet_address")}</Label>
            <Input
              id="walletAddress"
              type="text"
              placeholder="Enter your wallet address"
              {...register("walletAddress")}
            />
            {errors.walletAddress && (
              <p className="text-xs text-destructive">
                {errors.walletAddress.message}
              </p>
            )}
          </div>

          <Button type="submit" className="w-full" disabled={isSubmitting}>
            {isSubmitting ? "Processing..." : "Invest Now"}
          </Button>
        </form>
      </CardContent>
      <CardFooter className="flex flex-col space-y-2 text-xs text-muted-foreground">
        <p>{t("by_investing_you_privacy_policy")}.</p>
        <p>{t("investments_in_token_your_investment")}.</p>
      </CardFooter>
    </Card>
  );
}
