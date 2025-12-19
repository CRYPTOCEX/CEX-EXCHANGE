"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useTranslations } from "next-intl";

interface LeaderSettingsProps {
  settings: {
    MinLeaderTrades: number;
    MinLeaderWinRate: number;
    MinLeaderAccountAge: number;
    MaxFollowersPerLeader: number;
    MaxProfitSharePercent: number;
    EnableProfitShare: boolean;
    AutoApproveLeaders: boolean;
  };
  onUpdate: (key: string, value: any) => void;
}

export default function LeaderSettingsSection({
  settings,
  onUpdate,
}: LeaderSettingsProps) {
  const t = useTranslations("ext_admin");
  const tCommon = useTranslations("common");
  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("leader_settings")}</CardTitle>
        <CardDescription>
          {t("configure_requirements_and_limits_for_copy")}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Leader Requirements */}
        <div>
          <h4 className="text-sm font-medium mb-4">{t("leader_requirements")}</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="minTrades">{t("minimum_trades")}</Label>
              <Input
                id="minTrades"
                type="number"
                value={settings.MinLeaderTrades}
                onChange={(e) => onUpdate("MinLeaderTrades", parseInt(e.target.value) || 0)}
                min={0}
              />
              <p className="text-xs text-muted-foreground">
                {t("minimum_number_of_trades_required_to")}
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="minWinRate">{`${t("minimum_win_rate")} (%)`}</Label>
              <Input
                id="minWinRate"
                type="number"
                value={settings.MinLeaderWinRate}
                onChange={(e) => onUpdate("MinLeaderWinRate", parseInt(e.target.value) || 0)}
                min={0}
                max={100}
              />
              <p className="text-xs text-muted-foreground">
                {t("minimum_win_rate_percentage_required_to")}
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="minAccountAge">{`${tCommon("minimum_account_age_days")} (days)`}</Label>
              <Input
                id="minAccountAge"
                type="number"
                value={settings.MinLeaderAccountAge}
                onChange={(e) => onUpdate("MinLeaderAccountAge", parseInt(e.target.value) || 0)}
                min={0}
              />
              <p className="text-xs text-muted-foreground">
                {t("minimum_account_age_in_days_required")}
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="maxFollowers">{t("max_followers_per_leader")}</Label>
              <Input
                id="maxFollowers"
                type="number"
                value={settings.MaxFollowersPerLeader}
                onChange={(e) => onUpdate("MaxFollowersPerLeader", parseInt(e.target.value) || 0)}
                min={1}
              />
              <p className="text-xs text-muted-foreground">
                {t("maximum_number_of_followers_a_leader_can_have")}
              </p>
            </div>
          </div>
        </div>

        {/* Approval Settings */}
        <div className="space-y-4">
          <h4 className="text-sm font-medium">{t("approval_settings")}</h4>

          <div className="flex items-center justify-between border p-4 rounded-lg">
            <div className="space-y-0.5">
              <span className="text-sm font-medium">{t("auto_approve_leader_applications")}</span>
              <p className="text-xs text-muted-foreground">
                {t("automatically_approve_leader_applications_without_manual_review")}
              </p>
            </div>
            <Switch
              checked={settings.AutoApproveLeaders}
              onCheckedChange={(checked) => onUpdate("AutoApproveLeaders", checked)}
            />
          </div>
        </div>

        {/* Profit Sharing */}
        <div className="space-y-4">
          <h4 className="text-sm font-medium">{t("profit_sharing")}</h4>

          <div className="flex items-center justify-between border p-4 rounded-lg">
            <div className="space-y-0.5">
              <span className="text-sm font-medium">{t("enable_profit_sharing")}</span>
              <p className="text-xs text-muted-foreground">
                {t("allow_leaders_to_earn_a_percentage")}
              </p>
            </div>
            <Switch
              checked={settings.EnableProfitShare}
              onCheckedChange={(checked) => onUpdate("EnableProfitShare", checked)}
            />
          </div>

          <div className="space-y-2">
            <div className="flex justify-between">
              <Label>{t("max_profit_share_percentage")}</Label>
              <span className="text-sm font-medium">{settings.MaxProfitSharePercent}%</span>
            </div>
            <Slider
              value={[settings.MaxProfitSharePercent]}
              onValueChange={([value]) => onUpdate("MaxProfitSharePercent", value)}
              min={0}
              max={50}
              step={1}
              disabled={!settings.EnableProfitShare}
            />
            <p className="text-xs text-muted-foreground">
              {t("maximum_profit_share_percentage_a_leader_can_set")}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
