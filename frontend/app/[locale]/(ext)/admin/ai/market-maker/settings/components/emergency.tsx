"use client";

import { useState } from "react";
import { $fetch } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Icon } from "@iconify/react";
import { toast } from "sonner";
import { useTranslations } from "next-intl";

interface EmergencySettingsSectionProps {
  onStatusChange?: () => void;
}

export default function EmergencySettingsSection({
  onStatusChange,
}: EmergencySettingsSectionProps) {
  const t = useTranslations("ext");
  const [stopping, setStopping] = useState(false);
  const [pausing, setPausing] = useState(false);
  const [resuming, setResuming] = useState(false);

  const handleEmergencyStop = async () => {
    if (!confirm("This will STOP ALL AI trading operations immediately and cancel all pending orders. Are you sure?")) {
      return;
    }

    setStopping(true);
    try {
      await $fetch({
        url: "/api/admin/ai/market-maker/emergency/stop",
        method: "POST",
      });
      toast.success("Emergency stop executed successfully");
      onStatusChange?.();
    } catch (err: any) {
      toast.error(err.message || "Failed to execute emergency stop");
    } finally {
      setStopping(false);
    }
  };

  const handlePauseAll = async () => {
    if (!confirm("This will PAUSE all active AI trading markets. Are you sure?")) {
      return;
    }

    setPausing(true);
    try {
      await $fetch({
        url: "/api/admin/ai/market-maker/emergency/pause",
        method: "POST",
      });
      toast.success("All markets paused successfully");
      onStatusChange?.();
    } catch (err: any) {
      toast.error(err.message || "Failed to pause markets");
    } finally {
      setPausing(false);
    }
  };

  const handleResumeAll = async () => {
    if (!confirm("This will RESUME all paused AI trading markets. Are you sure?")) {
      return;
    }

    setResuming(true);
    try {
      await $fetch({
        url: "/api/admin/ai/market-maker/emergency/resume",
        method: "POST",
      });
      toast.success("All markets resumed successfully");
      onStatusChange?.();
    } catch (err: any) {
      toast.error(err.message || "Failed to resume markets");
    } finally {
      setResuming(false);
    }
  };

  return (
    <Card className="border-danger-500/20">
      <CardContent className="space-y-6 pt-6">
        {/* Warning Banner */}
        <div className="bg-danger-500/10 border border-danger-500/20 rounded-lg p-4">
          <div className="flex gap-3">
            <div className="shrink-0">
              <Icon icon="mdi:alert-octagon" className="w-6 h-6 text-danger-500" />
            </div>
            <div>
              <h5 className="text-sm font-medium text-danger-700 dark:text-danger-300">{t("emergency_controls")}</h5>
              <p className="text-xs text-danger-600 dark:text-danger-400 mt-1">
                {t("these_actions_have_immediate_effect_on")} {t("use_with_caution")} {t("emergency_stop_will_cancel_all_pending")}
              </p>
            </div>
          </div>
        </div>

        {/* Emergency Actions */}
        <div className="space-y-4">
          {/* Emergency Stop */}
          <div className="border border-danger-500/30 rounded-lg p-5 bg-danger-500/5">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-lg bg-danger-500/10 flex items-center justify-center shrink-0">
                  <Icon icon="mdi:stop-circle" className="w-6 h-6 text-danger-500" />
                </div>
                <div>
                  <h4 className="font-semibold text-danger-600 dark:text-danger-400">
                    {t("emergency_stop_all_trading")}
                  </h4>
                  <p className="text-sm text-muted-500 mt-1">
                    {t("immediately_stop_all_ai_market_maker_operations")} {t("this_action_cannot_be_undone_automatically")}
                  </p>
                </div>
              </div>
              <Button
                variant="destructive"
                onClick={handleEmergencyStop}
                disabled={stopping}
                className="shrink-0"
              >
                {stopping ? (
                  <Icon icon="mdi:loading" className="w-5 h-5 mr-2 animate-spin" />
                ) : (
                  <Icon icon="mdi:stop-circle" className="w-5 h-5 mr-2" />
                )}
                {stopping ? "Stopping..." : "Emergency Stop"}
              </Button>
            </div>
          </div>

          {/* Pause All */}
          <div className="border rounded-lg p-5">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-lg bg-warning-500/10 flex items-center justify-center shrink-0">
                  <Icon icon="mdi:pause-circle" className="w-6 h-6 text-warning-500" />
                </div>
                <div>
                  <h4 className="font-semibold text-muted-800 dark:text-muted-100">
                    {t("pause_all_markets")}
                  </h4>
                  <p className="text-sm text-muted-500 mt-1">
                    {t("pause_all_active_markets_without_stopping_them")} {t("no_new_orders_will_be_placed")} {t("markets_can_be_resumed_later")}
                  </p>
                </div>
              </div>
              <Button
                variant="outline"
                onClick={handlePauseAll}
                disabled={pausing}
                className="shrink-0 border-warning-500 text-warning-600 hover:bg-warning-500/10"
              >
                {pausing ? (
                  <Icon icon="mdi:loading" className="w-5 h-5 mr-2 animate-spin" />
                ) : (
                  <Icon icon="mdi:pause-circle" className="w-5 h-5 mr-2" />
                )}
                {pausing ? "Pausing..." : "Pause All"}
              </Button>
            </div>
          </div>

          {/* Resume All */}
          <div className="border rounded-lg p-5">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-lg bg-success-500/10 flex items-center justify-center shrink-0">
                  <Icon icon="mdi:play-circle" className="w-6 h-6 text-success-500" />
                </div>
                <div>
                  <h4 className="font-semibold text-muted-800 dark:text-muted-100">
                    {t("resume_all_markets")}
                  </h4>
                  <p className="text-sm text-muted-500 mt-1">
                    {t("resume_all_paused_markets")} {t("trading_activity_will_restart_according_to")}
                  </p>
                </div>
              </div>
              <Button
                variant="outline"
                onClick={handleResumeAll}
                disabled={resuming}
                className="shrink-0 border-success-500 text-success-600 hover:bg-success-500/10"
              >
                {resuming ? (
                  <Icon icon="mdi:loading" className="w-5 h-5 mr-2 animate-spin" />
                ) : (
                  <Icon icon="mdi:play-circle" className="w-5 h-5 mr-2" />
                )}
                {resuming ? "Resuming..." : "Resume All"}
              </Button>
            </div>
          </div>
        </div>

        {/* Info Box */}
        <div className="bg-muted-100 dark:bg-muted-800/50 rounded-lg p-4">
          <h5 className="text-sm font-medium text-muted-700 dark:text-muted-300 mb-2">
            {t("what_happens_during_emergency_stop")}
          </h5>
          <ul className="text-xs text-muted-500 space-y-1 list-disc list-inside">
            <li>{t("all_active_bots_will_be_immediately_terminated")}</li>
            <li>{t("all_pending_orders_will_be_cancelled")}</li>
            <li>{t("all_markets_will_be_set_to_stopped_status")}</li>
            <li>{t("no_new_trading_activity_will_occur")}</li>
            <li>{t("existing_positions_and_balances_are_preserved")}</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}
