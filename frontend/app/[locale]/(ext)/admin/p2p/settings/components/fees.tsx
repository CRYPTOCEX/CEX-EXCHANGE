"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { useTranslations } from "next-intl";

interface P2PFeesSettingsSectionProps {
  settings?: {
    MakerFee?: number;
    TakerFee?: number;
    DisputeFeePercent?: number;
    EscrowReleaseTime?: string;
  };
  onUpdate: (key: string, value: any) => void;
}

export default function P2PFeesSettingsSection({
  settings = {},
  onUpdate,
}: P2PFeesSettingsSectionProps) {
  const t = useTranslations("ext");
  const safeSettings = {
    MakerFee: settings.MakerFee ?? 0.1,
    TakerFee: settings.TakerFee ?? 0.2,
    DisputeFeePercent: settings.DisputeFeePercent ?? 1,
    EscrowReleaseTime: settings.EscrowReleaseTime ?? "00:00",
  };

  return (
    <Card>
      <CardContent className="space-y-6 pt-6">
        {/* Row for Fee Settings */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <Label htmlFor="makerFee">{t("maker_fee_(%)")}</Label>
            <Input
              id="makerFee"
              type="number"
              value={safeSettings.MakerFee}
              onChange={(e) => onUpdate("MakerFee", Number(e.target.value))}
              placeholder="Enter maker fee percentage"
              min="0"
              max="100"
              step="0.01"
            />
            <p className="text-xs text-muted-foreground">
              {t("fee_charged_to_users_who_create_offers_(makers)")}.
            </p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="takerFee">{t("taker_fee_(%)")}</Label>
            <Input
              id="takerFee"
              type="number"
              value={safeSettings.TakerFee}
              onChange={(e) => onUpdate("TakerFee", Number(e.target.value))}
              placeholder="Enter taker fee percentage"
              min="0"
              max="100"
              step="0.01"
            />
            <p className="text-xs text-muted-foreground">
              {t("fee_charged_to_users_who_accept_offers_(takers)")}.
            </p>
          </div>
        </div>

        {/* Row for Additional Fee Settings */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <Label htmlFor="disputeFeePercent">{t("dispute_fee_(%)")}</Label>
            <Input
              id="disputeFeePercent"
              type="number"
              value={safeSettings.DisputeFeePercent}
              onChange={(e) =>
                onUpdate("DisputeFeePercent", Number(e.target.value))
              }
              placeholder="Enter dispute fee percentage"
              min="0"
              max="100"
              step="0.01"
            />
            <p className="text-xs text-muted-foreground">
              {t("fee_charged_when_a_user_loses_a_dispute_case")}.
            </p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="escrowReleaseTime">
              {t("escrow_release_time")}
            </Label>
            <Input
              id="escrowReleaseTime"
              type="time"
              value={safeSettings.EscrowReleaseTime}
              onChange={(e) => onUpdate("EscrowReleaseTime", e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              {t("the_time_when_processed_daily")}.
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
