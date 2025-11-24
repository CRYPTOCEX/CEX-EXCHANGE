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
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Info, Shield, Users } from "lucide-react";
import { useTranslations } from "next-intl";

export function UserRequirementsStep() {
  const t = useTranslations("ext");
  const { tradeData, updateTradeData, markStepComplete, currentStep } =
    useWizard();
  const [minCompletedTrades, setMinCompletedTrades] = useState<number>(0);
  const [minSuccessRate, setMinSuccessRate] = useState<number>(0);
  const [minAccountAge, setMinAccountAge] = useState<number>(0);
  const [trustedOnly, setTrustedOnly] = useState<boolean>(false);
  const initialized = useRef(false);

  // Initialize from existing data if available
  useEffect(() => {
    if (!initialized.current) {
      if (tradeData.userRequirements) {
        setMinCompletedTrades(
          tradeData.userRequirements.minCompletedTrades || 0
        );
        setMinSuccessRate(tradeData.userRequirements.minSuccessRate || 0);
        setMinAccountAge(tradeData.userRequirements.minAccountAge || 0);
        setTrustedOnly(tradeData.userRequirements.trustedOnly || false);
      } else {
        // Initialize with empty user requirements
        updateTradeData({
          userRequirements: {
            minCompletedTrades: 0,
            minSuccessRate: 0,
            minAccountAge: 0,
            trustedOnly: false,
          },
        });
      }

      // Mark as initialized
      initialized.current = true;

      // Always mark this step as complete since all fields are optional
      markStepComplete(currentStep);
    }
  }, [tradeData, updateTradeData, markStepComplete, currentStep]);

  // Update trade data when fields change
  const updateUserRequirements = () => {
    const userRequirements = {
      minCompletedTrades,
      minSuccessRate,
      minAccountAge,
      trustedOnly,
    };

    updateTradeData({ userRequirements });
    markStepComplete(currentStep);
  };

  // Handle min completed trades change
  const handleMinCompletedTradesChange = (value: number[]) => {
    setMinCompletedTrades(value[0]);
    setTimeout(updateUserRequirements, 100);
  };

  // Handle min success rate change
  const handleMinSuccessRateChange = (value: number[]) => {
    setMinSuccessRate(value[0]);
    setTimeout(updateUserRequirements, 100);
  };

  // Handle min account age change
  const handleMinAccountAgeChange = (value: number[]) => {
    setMinAccountAge(value[0]);
    setTimeout(updateUserRequirements, 100);
  };

  // Handle trusted only change
  const handleTrustedOnlyChange = (checked: boolean) => {
    setTrustedOnly(checked);
    setTimeout(updateUserRequirements, 100);
  };

  // Format account age for display
  const formatAccountAge = (days: number) => {
    if (days === 0) return "No minimum";
    if (days < 30) return `${days} days`;
    if (days < 365) {
      const months = Math.floor(days / 30);
      return `${months} month${months > 1 ? "s" : ""}`;
    }
    const years = Math.floor(days / 365);
    return `${years} year${years > 1 ? "s" : ""}`;
  };

  return (
    <div className="space-y-6">
      <p className="text-muted-foreground">
        {t("set_requirements_for_your_offer")}.{" "}
        {t("this_helps_ensure_qualified_counterparties")}.
      </p>

      <Card className="border-primary/10">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Users className="h-4 w-4 text-primary" />
            {t("trading_experience_requirements")}
          </CardTitle>
          <CardDescription>
            {t("set_minimum_trading_potential_counterparties")}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-4">
            <div className="space-y-2">
              <div className="flex justify-between">
                <Label htmlFor="min-trades">
                  {t("minimum_completed_trades")}
                </Label>
                <Badge variant="outline">
                  {minCompletedTrades > 0 ? minCompletedTrades : "No minimum"}
                </Badge>
              </div>
              <Slider
                id="min-trades"
                min={0}
                max={50}
                step={1}
                value={[minCompletedTrades]}
                onValueChange={handleMinCompletedTradesChange}
              />
              <p className="text-xs text-muted-foreground">
                {t("require_users_to_of_trades")}
              </p>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between">
                <Label htmlFor="min-success-rate">
                  {t("minimum_success_rate")}
                </Label>
                <Badge variant="outline">
                  {minSuccessRate > 0 ? `${minSuccessRate}%` : "No minimum"}
                </Badge>
              </div>
              <Slider
                id="min-success-rate"
                min={0}
                max={100}
                step={5}
                value={[minSuccessRate]}
                onValueChange={handleMinSuccessRateChange}
              />
              <p className="text-xs text-muted-foreground">
                {t("require_users_to_successful_trades")}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="border-primary/10">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Shield className="h-4 w-4 text-primary" />
            {t("trust_&_security_requirements")}
          </CardTitle>
          <CardDescription>
            {t("set_additional_security_potential_counterparties")}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-4">
            <div className="space-y-2">
              <div className="flex justify-between">
                <Label htmlFor="min-account-age">
                  {t("minimum_account_age")}
                </Label>
                <Badge variant="outline">
                  {formatAccountAge(minAccountAge)}
                </Badge>
              </div>
              <Slider
                id="min-account-age"
                min={0}
                max={365}
                step={30}
                value={[minAccountAge]}
                onValueChange={handleMinAccountAgeChange}
              />
              <p className="text-xs text-muted-foreground">
                {t("require_users_to_of_days")}
              </p>
            </div>

            <div className="flex items-center justify-between space-x-2">
              <div className="space-y-0.5">
                <Label htmlFor="trusted-only">{t("trusted_users_only")}</Label>
                <p className="text-xs text-muted-foreground">
                  {t("only_allow_users_your_offer")}
                </p>
              </div>
              <Switch
                id="trusted-only"
                checked={trustedOnly}
                onCheckedChange={handleTrustedOnlyChange}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Alert>
        <Info className="h-4 w-4" />
        <AlertDescription>
          {t("setting_appropriate_user_problematic_trades")}.{" "}
          {t("however_setting_requirements_potential_counterparties")}.
        </AlertDescription>
      </Alert>
    </div>
  );
}
