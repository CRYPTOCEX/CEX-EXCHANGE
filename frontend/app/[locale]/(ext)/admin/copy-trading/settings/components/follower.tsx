"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useTranslations } from "next-intl";

interface FollowerSettingsProps {
  settings: {
    MaxLeadersPerFollower: number;
    MinAllocationAmount: number;
    MaxAllocationPercent: number;
  };
  onUpdate: (key: string, value: any) => void;
}

export default function FollowerSettingsSection({
  settings,
  onUpdate,
}: FollowerSettingsProps) {
  const t = useTranslations("ext_admin");
  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("follower_settings")}</CardTitle>
        <CardDescription>
          {t("configure_limits_and_requirements_for_copy")}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="maxLeaders">{t("max_leaders_per_follower")}</Label>
            <Input
              id="maxLeaders"
              type="number"
              value={settings.MaxLeadersPerFollower}
              onChange={(e) => onUpdate("MaxLeadersPerFollower", parseInt(e.target.value) || 0)}
              min={1}
            />
            <p className="text-xs text-muted-foreground">
              {t("maximum_number_of_leaders_a_follower")}
            </p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="minAllocation">{t("minimum_allocation")} ($)</Label>
            <Input
              id="minAllocation"
              type="number"
              value={settings.MinAllocationAmount}
              onChange={(e) => onUpdate("MinAllocationAmount", parseFloat(e.target.value) || 0)}
              min={0}
              step={0.01}
            />
            <p className="text-xs text-muted-foreground">
              {t("minimum_amount_a_follower_must_allocate")}
            </p>
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex justify-between">
            <Label>{t("max_allocation_percent_of_wallet")}</Label>
            <span className="text-sm font-medium">{settings.MaxAllocationPercent}%</span>
          </div>
          <Slider
            value={[settings.MaxAllocationPercent]}
            onValueChange={([value]) => onUpdate("MaxAllocationPercent", value)}
            min={10}
            max={100}
            step={5}
          />
          <p className="text-xs text-muted-foreground">
            {t("maximum_percentage_of_wallet_balance_a")}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
