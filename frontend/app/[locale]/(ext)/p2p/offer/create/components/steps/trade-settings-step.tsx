"use client";

import { useEffect, useState, useRef } from "react";
import { useWizard } from "../trading-wizard";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Clock, Eye, EyeOff, AlertCircle, Info } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Badge } from "@/components/ui/badge";
import type * as React from "react";
import { useTranslations } from "next-intl";

export function TradeSettingsStep() {
  const t = useTranslations("ext");
  const { tradeData, updateTradeData, markStepComplete, currentStep } =
    useWizard();
  const [autoCancelEnabled, setAutoCancelEnabled] = useState(true);
  const [autoCancelDuration, setAutoCancelDuration] = useState("60");
  const [isHiddenOffer, setIsHiddenOffer] = useState(false);
  const [tradeTerms, setTradeTerms] = useState("");
  const [tradeInstructions, setTradeInstructions] = useState("");
  const initialized = useRef(false);

  // Validate step completion based on required fields
  useEffect(() => {
    // Only mark step complete if terms of trade are provided
    if (tradeTerms.trim()) {
      markStepComplete(currentStep);
    }
  }, [tradeTerms, markStepComplete, currentStep]);

  useEffect(() => {
    // Initialize default values if needed
    if (!initialized.current) {
      const updates: Record<string, any> = {};
      let shouldUpdate = false;

      // Initialize tradeSettings object if it doesn't exist
      if (!tradeData.tradeSettings) {
        updates.tradeSettings = {
          autoCancel: 60,
          kycRequired: true, // Add kycRequired with default value true
          visibility: "PUBLIC",
          termsOfTrade: "",
          additionalNotes: "",
        };
        shouldUpdate = true;
      } else if (!tradeData.tradeSettings.kycRequired) {
        // Ensure kycRequired is set if tradeSettings exists but kycRequired is missing
        if (!updates.tradeSettings)
          updates.tradeSettings = { ...(tradeData.tradeSettings || {}) };
        updates.tradeSettings.kycRequired = true;
        shouldUpdate = true;
      }

      // Set default values only if they don't exist
      if (tradeData.autoCancelEnabled === undefined) {
        setAutoCancelEnabled(true);
        if (!updates.tradeSettings)
          updates.tradeSettings = { ...(tradeData.tradeSettings || {}) };
        updates.tradeSettings.autoCancel = 60;
        shouldUpdate = true;
      } else {
        setAutoCancelEnabled(tradeData.autoCancelEnabled);
      }

      if (!tradeData.tradeSettings?.autoCancel) {
        setAutoCancelDuration("60");
        if (!updates.tradeSettings)
          updates.tradeSettings = { ...(tradeData.tradeSettings || {}) };
        updates.tradeSettings.autoCancel = 60;
        shouldUpdate = true;
      } else {
        setAutoCancelDuration(String(tradeData.tradeSettings.autoCancel));
      }

      if (tradeData.isHiddenOffer === undefined) {
        setIsHiddenOffer(false);
        if (!updates.tradeSettings)
          updates.tradeSettings = { ...(tradeData.tradeSettings || {}) };
        updates.tradeSettings.visibility = "PUBLIC";
        shouldUpdate = true;
      } else {
        setIsHiddenOffer(tradeData.isHiddenOffer);
        if (!updates.tradeSettings)
          updates.tradeSettings = { ...(tradeData.tradeSettings || {}) };
        updates.tradeSettings.visibility = tradeData.isHiddenOffer
          ? "PRIVATE"
          : "PUBLIC"; // Use PRIVATE instead of HIDDEN
        shouldUpdate = true;
      }

      if (!tradeData.tradeSettings?.termsOfTrade) {
        setTradeTerms("");
        if (!updates.tradeSettings)
          updates.tradeSettings = { ...(tradeData.tradeSettings || {}) };
        updates.tradeSettings.termsOfTrade = "";
        shouldUpdate = true;
      } else {
        setTradeTerms(tradeData.tradeSettings.termsOfTrade);
      }

      if (!tradeData.tradeSettings?.additionalNotes) {
        setTradeInstructions("");
        if (!updates.tradeSettings)
          updates.tradeSettings = { ...(tradeData.tradeSettings || {}) };
        updates.tradeSettings.additionalNotes = "";
        shouldUpdate = true;
      } else {
        setTradeInstructions(tradeData.tradeSettings.additionalNotes);
      }

      // Only update if we have changes to make
      if (shouldUpdate) {
        updateTradeData(updates);
      }

      // Set initialized to true to prevent this from running again
      initialized.current = true;

      // Don't automatically mark step complete during initialization
      // Let the validation useEffect handle this based on tradeTerms
    }
  }, [tradeData, updateTradeData, markStepComplete, currentStep]);

  // Replace the state change handlers with these versions that update tradeData directly
  const handleAutoCancelEnabledChange = (checked: boolean) => {
    setAutoCancelEnabled(checked);

    // Update the tradeSettings object
    const tradeSettings = {
      ...(tradeData.tradeSettings || {}),
      autoCancel: checked ? Number(autoCancelDuration) : 0,
      kycRequired: tradeData.tradeSettings?.kycRequired || true, // Ensure kycRequired is set
    };

    updateTradeData({
      autoCancelEnabled: checked,
      tradeSettings,
    });

    // Only mark step complete if terms of trade are provided
    if (tradeTerms.trim()) {
      markStepComplete(currentStep);
    }
  };

  const handleAutoCancelDurationChange = (value: string) => {
    setAutoCancelDuration(value);

    // Update the tradeSettings object
    const tradeSettings = {
      ...(tradeData.tradeSettings || {}),
      autoCancel: Number(value),
      kycRequired: tradeData.tradeSettings?.kycRequired || true, // Ensure kycRequired is set
    };

    updateTradeData({
      tradeSettings,
    });

    // Only mark step complete if terms of trade are provided
    if (tradeTerms.trim()) {
      markStepComplete(currentStep);
    }
  };

  const handleHiddenOfferChange = (value: string) => {
    const isHidden = value === "hidden";
    setIsHiddenOffer(isHidden);

    // Update the tradeSettings object
    const tradeSettings = {
      ...(tradeData.tradeSettings || {}),
      visibility: isHidden ? "PRIVATE" : "PUBLIC", // Use PRIVATE instead of HIDDEN
      kycRequired: tradeData.tradeSettings?.kycRequired || true, // Ensure kycRequired is set
    };

    updateTradeData({
      isHiddenOffer: isHidden,
      tradeSettings,
    });

    // Only mark step complete if terms of trade are provided
    if (tradeTerms.trim()) {
      markStepComplete(currentStep);
    }
  };

  const handleTradeTermsChange = (
    e: React.ChangeEvent<HTMLTextAreaElement>
  ) => {
    setTradeTerms(e.target.value);

    // Update the tradeSettings object
    const tradeSettings = {
      ...(tradeData.tradeSettings || {}),
      termsOfTrade: e.target.value,
      kycRequired: tradeData.tradeSettings?.kycRequired || true, // Ensure kycRequired is set
    };

    updateTradeData({
      tradeSettings,
    });

    // Only mark step complete if terms are provided
    if (e.target.value.trim()) {
      markStepComplete(currentStep);
    }
  };

  const handleTradeNotesChange = (
    e: React.ChangeEvent<HTMLTextAreaElement>
  ) => {
    setTradeInstructions(e.target.value);

    // Update the tradeSettings object
    const tradeSettings = {
      ...(tradeData.tradeSettings || {}),
      additionalNotes: e.target.value,
      kycRequired: tradeData.tradeSettings?.kycRequired || true, // Ensure kycRequired is set
    };

    updateTradeData({
      tradeSettings,
    });

    // Only mark step complete if terms of trade are provided
    if (tradeTerms.trim()) {
      markStepComplete(currentStep);
    }
  };

  // Handle auto-cancel duration change
  const formatDuration = (minutes: number) => {
    if (minutes < 60) {
      return `${minutes} minutes`;
    } else if (minutes === 60) {
      return "1 hour";
    } else if (minutes < 1440) {
      const hours = minutes / 60;
      return `${hours} hours`;
    } else {
      const days = minutes / 1440;
      return `${days} days`;
    }
  };

  return (
    <div className="space-y-6">
      <p className="text-muted-foreground">
        {t("configure_additional_settings_your_preferences")}.
      </p>

      {!tradeTerms.trim() && (
        <Alert className="border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-950/30">
          <AlertCircle className="h-4 w-4 text-red-600 dark:text-red-400" />
          <AlertDescription className="text-red-600 dark:text-red-400">
            {t("trade_terms_are_required")}
          </AlertDescription>
        </Alert>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="border-primary/10">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                <Clock className="h-4 w-4 text-primary" />
                {t("Auto-Cancellation")}
              </CardTitle>
              <Switch
                checked={autoCancelEnabled}
                onCheckedChange={handleAutoCancelEnabledChange}
              />
            </div>
            <CardDescription>
              {t("automatically_cancel_the_specified_time")}
            </CardDescription>
          </CardHeader>
          <CardContent
            className={
              !autoCancelEnabled ? "opacity-50 pointer-events-none" : ""
            }
          >
            <div className="space-y-4">
              <div className="space-y-2">
                <div className="flex justify-between">
                  <Label>{t("auto-cancel_duration")}</Label>
                  <Badge variant="outline">
                    {formatDuration(Number.parseInt(autoCancelDuration))}
                  </Badge>
                </div>
                <Select
                  value={autoCancelDuration}
                  onValueChange={handleAutoCancelDurationChange}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select duration" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="15">{t("15_minutes")}</SelectItem>
                    <SelectItem value="30">{t("30_minutes")}</SelectItem>
                    <SelectItem value="60">{t("1_hour")}</SelectItem>
                    <SelectItem value="120">{t("2_hours")}</SelectItem>
                    <SelectItem value="360">{t("6_hours")}</SelectItem>
                    <SelectItem value="720">{t("12_hours")}</SelectItem>
                    <SelectItem value="1440">{t("1_day")}</SelectItem>
                    <SelectItem value="2880">{t("2_days")}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <p className="text-sm text-muted-foreground">
                {t("if_the_counterparty_be_returned")}.
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-primary/10">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                {isHiddenOffer ? (
                  <EyeOff className="h-4 w-4 text-primary" />
                ) : (
                  <Eye className="h-4 w-4 text-primary" />
                )}
                {t("offer_visibility")}
              </CardTitle>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Info className="h-4 w-4 text-muted-foreground" />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p className="max-w-xs">
                      {t("control_who_can_see_and_access_your_trade_offer")}
                    </p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
            <CardDescription>
              {t("control_the_visibility_the_marketplace")}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <Tabs
                defaultValue="public"
                value={isHiddenOffer ? "hidden" : "public"}
                onValueChange={handleHiddenOfferChange}
              >
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="public">{t("public_offer")}</TabsTrigger>
                  <TabsTrigger value="hidden">{t("private_offer")}</TabsTrigger>
                </TabsList>

                <TabsContent value="public" className="space-y-4 pt-4">
                  <p className="text-sm text-muted-foreground">
                    {t("your_offer_will_the_marketplace")}.{" "}
                    {t("anyone_can_find_and_accept_your_offer")}.
                  </p>
                </TabsContent>

                <TabsContent value="hidden" className="space-y-4 pt-4">
                  <p className="text-sm text-muted-foreground">
                    {t("your_offer_will_public_marketplace")}.{" "}
                    {t("only_users_with_accept_it")}.
                  </p>
                  <Alert className="bg-blue-50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-800">
                    <Info className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                    <AlertDescription className="text-blue-600 dark:text-blue-400">
                      {t("youll_receive_a_the_offer")}.{" "}
                      {t("this_is_useful_specific_individuals")}.
                    </AlertDescription>
                  </Alert>
                </TabsContent>
              </Tabs>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="border-primary/10">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <AlertCircle className="h-4 w-4 text-primary" />
            {t("trade_terms_&_instructions")}
          </CardTitle>
          <CardDescription>
            {t("provide_additional_terms_the_trade")}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="trade-terms" className="flex items-center gap-1">
                {t("trade_terms")} <span className="text-red-500">*</span>
              </Label>
              <Textarea
                id="trade-terms"
                placeholder="Specify terms and conditions for this trade (required)..."
                value={tradeTerms}
                onChange={handleTradeTermsChange}
                rows={3}
                className={!tradeTerms.trim() ? "border-red-300 focus:border-red-500" : ""}
              />
              <p className="text-xs text-muted-foreground">
                {t("these_terms_will_your_offer")}
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="trade-instructions">
                {t("additional_notes_(optional)")}
              </Label>
              <Textarea
                id="trade-instructions"
                placeholder="Add any additional notes or requirements for this trade..."
                value={tradeInstructions}
                onChange={handleTradeNotesChange}
                rows={3}
              />
              <p className="text-xs text-muted-foreground">
                {t("these_notes_will_trade_process")}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Alert>
        <Info className="h-4 w-4" />
        <AlertDescription>
          {t("these_settings_help_for_counterparties")}.{" "}
          {t("well-configured_settings_can_fewer_disputes")}.
        </AlertDescription>
      </Alert>
    </div>
  );
}
