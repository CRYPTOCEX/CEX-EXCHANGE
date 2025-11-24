"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  ArrowRight,
  ArrowLeft,
  Check,
  Wallet,
  CreditCard,
  Landmark,
  DollarSign,
  Smartphone,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import { motion, AnimatePresence } from "framer-motion";
import { useTranslations } from "next-intl";

export function GuidedMatchingWizard() {
  const t = useTranslations("ext");
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    tradeType: "buy",
    cryptocurrency: "bitcoin",
    amount: "0.1",
    paymentMethods: ["bank_transfer"],
    pricePreference: "best_price",
    traderPreference: "all",
  });

  const totalSteps = 4;
  const progress = (step / totalSteps) * 100;

  const handleNext = () => {
    if (step < totalSteps) {
      setStep(step + 1);
    }
  };

  const handleBack = () => {
    if (step > 1) {
      setStep(step - 1);
    }
  };

  const handleChange = (field: string, value: any) => {
    setFormData({
      ...formData,
      [field]: value,
    });
  };

  const handlePaymentMethodToggle = (method: string) => {
    const currentMethods = [...formData.paymentMethods];
    if (currentMethods.includes(method)) {
      handleChange(
        "paymentMethods",
        currentMethods.filter((m) => m !== method)
      );
    } else {
      handleChange("paymentMethods", [...currentMethods, method]);
    }
  };

  const handleFindMatches = () => {
    // In a real app, this would navigate to filtered results
    // For now, we'll just reset the wizard
    setStep(1);
  };

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <div className="flex justify-between text-sm">
          <span>
            {t("Step")}
            {step}
            {t("of")}
            {totalSteps}
          </span>
          <span>
            {Math.round(progress)}
            {t("%_complete")}
          </span>
        </div>
        <Progress value={progress} className="h-2" />
      </div>

      <AnimatePresence mode="wait">
        {step === 1 && (
          <motion.div
            key="step1"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.3 }}
          >
            <div className="space-y-4">
              <h3 className="text-lg font-medium">
                {t("what_would_you_like_to_do")}
              </h3>

              <RadioGroup
                value={formData.tradeType}
                onValueChange={(value) => handleChange("tradeType", value)}
                className="grid grid-cols-1 md:grid-cols-2 gap-4"
              >
                <div>
                  <RadioGroupItem
                    value="buy"
                    id="buy"
                    className="peer sr-only"
                  />
                  <Label
                    htmlFor="buy"
                    className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary"
                  >
                    <Wallet className="mb-3 h-6 w-6 text-primary" />
                    <div className="text-center space-y-1">
                      <h3 className="font-medium">{t("buy_cryptocurrency")}</h3>
                      <p className="text-sm text-muted-foreground">
                        {t("i_want_to_buy_crypto_with_my_local_currency")}
                      </p>
                    </div>
                  </Label>
                </div>

                <div>
                  <RadioGroupItem
                    value="sell"
                    id="sell"
                    className="peer sr-only"
                  />
                  <Label
                    htmlFor="sell"
                    className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary"
                  >
                    <DollarSign className="mb-3 h-6 w-6 text-primary" />
                    <div className="text-center space-y-1">
                      <h3 className="font-medium">
                        {t("sell_cryptocurrency")}
                      </h3>
                      <p className="text-sm text-muted-foreground">
                        {t("i_want_to_sell_crypto_for_local_currency")}
                      </p>
                    </div>
                  </Label>
                </div>
              </RadioGroup>
            </div>
          </motion.div>
        )}

        {step === 2 && (
          <motion.div
            key="step2"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.3 }}
          >
            <div className="space-y-4">
              <h3 className="text-lg font-medium">
                {t("select_cryptocurrency_and_amount")}
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <Label>{t("Cryptocurrency")}</Label>
                  <Select
                    value={formData.cryptocurrency}
                    onValueChange={(value) =>
                      handleChange("cryptocurrency", value)
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select cryptocurrency" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="bitcoin">
                        {t("bitcoin_(btc)")}
                      </SelectItem>
                      <SelectItem value="ethereum">
                        {t("ethereum_(eth)")}
                      </SelectItem>
                      <SelectItem value="tether">
                        {t("tether_(usdt)")}
                      </SelectItem>
                      <SelectItem value="binancecoin">
                        {t("binance_coin_(bnb)")}
                      </SelectItem>
                      <SelectItem value="solana">
                        {t("solana_(sol)")}
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-4">
                  <Label htmlFor="amount">{t("Amount")}</Label>
                  <Input
                    id="amount"
                    type="number"
                    placeholder="0.00"
                    value={formData.amount}
                    onChange={(e) => handleChange("amount", e.target.value)}
                    min="0.001"
                    step="0.001"
                  />
                </div>
              </div>

              <div className="pt-2">
                <Label className="mb-2 block">{t("quick_select_amount")}</Label>
                <Slider
                  defaultValue={[0.1]}
                  max={1}
                  step={0.01}
                  onValueChange={(values) =>
                    handleChange("amount", values[0].toString())
                  }
                />
                <div className="flex justify-between text-xs text-muted-foreground mt-1">
                  <span>
                    0. 01
                  </span>
                  <span>
                    0. / 5
                  </span>
                  <span>
                    1:. 0
                  </span>
                </div>
              </div>

              <Card className="bg-muted/30 border-primary/10">
                <CardContent className="p-4 flex justify-between items-center">
                  <div>
                    <p className="text-sm font-medium">
                      {t("estimated_value")}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {t("based_on_current_market_price")}
                    </p>
                  </div>
                  <div className="text-xl font-bold">
                    / $
                    {formData.cryptocurrency === "bitcoin"
                      ? (
                          Number.parseFloat(formData.amount) * 42356.78
                        ).toLocaleString(undefined, {
                          maximumFractionDigits: 2,
                        })
                      : formData.cryptocurrency === "ethereum"
                        ? (
                            Number.parseFloat(formData.amount) * 2356.42
                          ).toLocaleString(undefined, {
                            maximumFractionDigits: 2,
                          })
                        : (
                            Number.parseFloat(formData.amount) * 100
                          ).toLocaleString(undefined, {
                            maximumFractionDigits: 2,
                          })}
                  </div>
                </CardContent>
              </Card>
            </div>
          </motion.div>
        )}

        {step === 3 && (
          <motion.div
            key="step3"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.3 }}
          >
            <div className="space-y-4">
              <h3 className="text-lg font-medium">
                {t("select_payment_methods")}
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                <div className="flex items-start space-x-2">
                  <Checkbox
                    id="bank_transfer"
                    checked={formData.paymentMethods.includes("bank_transfer")}
                    onCheckedChange={() =>
                      handlePaymentMethodToggle("bank_transfer")
                    }
                  />
                  <div className="grid gap-1.5 leading-none">
                    <Label
                      htmlFor="bank_transfer"
                      className="flex items-center gap-1.5"
                    >
                      <Landmark className="h-4 w-4 text-primary" />
                      {t("bank_transfer")}
                    </Label>
                    <p className="text-xs text-muted-foreground">
                      {t("traditional_bank_transfers")}
                    </p>
                  </div>
                </div>

                <div className="flex items-start space-x-2">
                  <Checkbox
                    id="credit_card"
                    checked={formData.paymentMethods.includes("credit_card")}
                    onCheckedChange={() =>
                      handlePaymentMethodToggle("credit_card")
                    }
                  />
                  <div className="grid gap-1.5 leading-none">
                    <Label
                      htmlFor="credit_card"
                      className="flex items-center gap-1.5"
                    >
                      <CreditCard className="h-4 w-4 text-primary" />
                      {t("credit_card")}
                    </Label>
                    <p className="text-xs text-muted-foreground">
                      {t("visa_mastercard_etc")}.
                    </p>
                  </div>
                </div>

                <div className="flex items-start space-x-2">
                  <Checkbox
                    id="paypal"
                    checked={formData.paymentMethods.includes("paypal")}
                    onCheckedChange={() => handlePaymentMethodToggle("paypal")}
                  />
                  <div className="grid gap-1.5 leading-none">
                    <Label
                      htmlFor="paypal"
                      className="flex items-center gap-1.5"
                    >
                      <Wallet className="h-4 w-4 text-primary" />
                      PayPal
                    </Label>
                    <p className="text-xs text-muted-foreground">
                      {t("paypal_payments")}
                    </p>
                  </div>
                </div>

                <div className="flex items-start space-x-2">
                  <Checkbox
                    id="venmo"
                    checked={formData.paymentMethods.includes("venmo")}
                    onCheckedChange={() => handlePaymentMethodToggle("venmo")}
                  />
                  <div className="grid gap-1.5 leading-none">
                    <Label
                      htmlFor="venmo"
                      className="flex items-center gap-1.5"
                    >
                      <Smartphone className="h-4 w-4 text-primary" />
                      {t("Venmo")}
                    </Label>
                    <p className="text-xs text-muted-foreground">
                      {t("venmo_mobile_payments")}
                    </p>
                  </div>
                </div>

                <div className="flex items-start space-x-2">
                  <Checkbox
                    id="cash_app"
                    checked={formData.paymentMethods.includes("cash_app")}
                    onCheckedChange={() =>
                      handlePaymentMethodToggle("cash_app")
                    }
                  />
                  <div className="grid gap-1.5 leading-none">
                    <Label
                      htmlFor="cash_app"
                      className="flex items-center gap-1.5"
                    >
                      <DollarSign className="h-4 w-4 text-primary" />
                      {t("cash_app")}
                    </Label>
                    <p className="text-xs text-muted-foreground">
                      {t("cash_app_payments")}
                    </p>
                  </div>
                </div>
              </div>

              <div className="pt-2">
                <div className="flex gap-2 flex-wrap">
                  {formData.paymentMethods.map((method) => (
                    <Badge
                      key={method}
                      variant="outline"
                      className="bg-primary/10"
                    >
                      {method
                        .replace("_", " ")
                        .replace(/\b\w/g, (l) => l.toUpperCase())}
                    </Badge>
                  ))}
                  {formData.paymentMethods.length === 0 && (
                    <p className="text-sm text-muted-foreground">
                      {t("no_payment_methods_selected")}
                    </p>
                  )}
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {step === 4 && (
          <motion.div
            key="step4"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.3 }}
          >
            <div className="space-y-4">
              <h3 className="text-lg font-medium">
                {t("additional_preferences")}
              </h3>

              <div className="space-y-6">
                <div className="space-y-3">
                  <Label>{t("price_preference")}</Label>
                  <Tabs
                    value={formData.pricePreference}
                    onValueChange={(value) =>
                      handleChange("pricePreference", value)
                    }
                    className="w-full"
                  >
                    <TabsList className="grid w-full grid-cols-3">
                      <TabsTrigger value="best_price">
                        {t("best_price")}
                      </TabsTrigger>
                      <TabsTrigger value="market_price">
                        {t("market_price")}
                      </TabsTrigger>
                      <TabsTrigger value="any_price">
                        {t("any_price")}
                      </TabsTrigger>
                    </TabsList>
                  </Tabs>
                </div>

                <div className="space-y-3">
                  <Label>{t("trader_preference")}</Label>
                  <Tabs
                    value={formData.traderPreference}
                    onValueChange={(value) =>
                      handleChange("traderPreference", value)
                    }
                    className="w-full"
                  >
                    <TabsList className="grid w-full grid-cols-3">
                      <TabsTrigger value="all">{t("all_traders")}</TabsTrigger>
                      <TabsTrigger value="verified">
                        {t("verified_only")}
                      </TabsTrigger>
                      <TabsTrigger value="top_rated">
                        {t("top_rated")}
                      </TabsTrigger>
                    </TabsList>
                  </Tabs>
                </div>
              </div>

              <Card className="bg-muted/30 border-primary/10">
                <CardContent className="p-4">
                  <h4 className="font-medium mb-2">{t("Summary")}</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">
                        {t("trade_type")}
                      </span>
                      <span className="font-medium capitalize">
                        {formData.tradeType}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">
                        {t("cryptocurrency")}
                      </span>
                      <span className="font-medium capitalize">
                        {formData.cryptocurrency}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">
                        {t("amount")}
                      </span>
                      <span className="font-medium">
                        {formData.amount}{" "}
                        {formData.cryptocurrency === "bitcoin"
                          ? "BTC"
                          : formData.cryptocurrency === "ethereum"
                            ? "ETH"
                            : "Crypto"}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">
                        {t("payment_methods")}
                      </span>
                      <span className="font-medium">
                        {formData.paymentMethods.length > 0
                          ? formData.paymentMethods.length > 1
                            ? `${formData.paymentMethods.length} methods selected`
                            : formData.paymentMethods[0]
                                .replace("_", " ")
                                .replace(/\b\w/g, (l) => l.toUpperCase())
                          : "None selected"}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">
                        {t("price_preference")}
                      </span>
                      <span className="font-medium capitalize">
                        {formData.pricePreference.replace("_", " ")}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">
                        {t("trader_preference")}
                      </span>
                      <span className="font-medium capitalize">
                        {formData.traderPreference.replace("_", " ")}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex justify-between pt-2">
        <Button
          variant="outline"
          onClick={handleBack}
          disabled={step === 1}
          className="gap-2"
        >
          <ArrowLeft className="h-4 w-4" />
          {t("Back")}
        </Button>

        {step < totalSteps ? (
          <Button onClick={handleNext} className="gap-2">
            {t("Next")}
            <ArrowRight className="h-4 w-4" />
          </Button>
        ) : (
          <Button onClick={handleFindMatches} className="gap-2">
            {t("find_matches")}
            <Check className="h-4 w-4" />
          </Button>
        )}
      </div>
    </div>
  );
}
