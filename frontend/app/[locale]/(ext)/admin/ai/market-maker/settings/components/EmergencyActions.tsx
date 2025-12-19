"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  AlertTriangle,
  StopCircle,
  PauseCircle,
  PlayCircle,
  XCircle,
  RefreshCw,
  Trash2,
  Power,
  Loader2,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { CustomComponentProps } from "@/components/admin/settings";
import { toast } from "sonner";
import $fetch from "@/lib/api";
import { useTranslations } from "next-intl";

interface EmergencyAction {
  id: string;
  title: string;
  description: string;
  icon: React.ElementType;
  variant: "default" | "destructive" | "outline" | "secondary";
  danger: boolean;
  endpoint: string;
  successMessage: string;
  confirmTitle: string;
  confirmDescription: string;
  buttonColor?: string;
}

const EMERGENCY_ACTIONS: EmergencyAction[] = [
  {
    id: "emergency_stop",
    title: "Emergency Stop All Trading",
    description: "Immediately stop all AI market maker operations and cancel all pending orders",
    icon: StopCircle,
    variant: "destructive",
    danger: true,
    endpoint: "/api/admin/ai/market-maker/emergency/stop",
    successMessage: "Emergency stop executed successfully",
    confirmTitle: "Emergency Stop All Trading?",
    confirmDescription:
      "This will STOP ALL AI trading operations immediately and cancel all pending orders. This action cannot be undone automatically.",
  },
  {
    id: "pause_all",
    title: "Pause All Markets",
    description: "Pause all active markets without stopping them. No new orders will be placed.",
    icon: PauseCircle,
    variant: "outline",
    danger: false,
    endpoint: "/api/admin/ai/market-maker/emergency/pause",
    successMessage: "All markets paused successfully",
    confirmTitle: "Pause All Markets?",
    confirmDescription:
      "This will PAUSE all active AI trading markets. No new orders will be placed. Markets can be resumed later.",
    buttonColor: "border-yellow-500 text-yellow-600 hover:bg-yellow-500/10",
  },
  {
    id: "resume_all",
    title: "Resume All Markets",
    description: "Resume all paused markets. Trading activity will restart according to bot configurations.",
    icon: PlayCircle,
    variant: "outline",
    danger: false,
    endpoint: "/api/admin/ai/market-maker/emergency/resume",
    successMessage: "All markets resumed successfully",
    confirmTitle: "Resume All Markets?",
    confirmDescription:
      "This will RESUME all paused AI trading markets. Trading activity will restart according to each bot's configuration.",
    buttonColor: "border-green-500 text-green-600 hover:bg-green-500/10",
  },
  {
    id: "cancel_all_orders",
    title: "Cancel All Orders",
    description: "Cancel all pending orders across all bots",
    icon: XCircle,
    variant: "destructive",
    danger: true,
    endpoint: "/api/admin/ai/market-maker/emergency/cancel-all-orders",
    successMessage: "All orders have been cancelled",
    confirmTitle: "Cancel All Orders?",
    confirmDescription:
      "This will cancel all pending orders for all AI trading bots. This may result in unrealized losses. This action cannot be undone.",
  },
  {
    id: "reset_positions",
    title: "Reset All Positions",
    description: "Close all open positions and reset bot states",
    icon: RefreshCw,
    variant: "destructive",
    danger: true,
    endpoint: "/api/admin/ai/market-maker/emergency/reset-positions",
    successMessage: "All positions have been reset",
    confirmTitle: "Reset All Positions?",
    confirmDescription:
      "This will close all open positions at market price and reset all bot states. This may result in significant losses. This action cannot be undone.",
  },
  {
    id: "clear_queue",
    title: "Clear Trading Queue",
    description: "Clear all pending trades from the queue",
    icon: Trash2,
    variant: "outline",
    danger: false,
    endpoint: "/api/admin/ai/market-maker/emergency/clear-queue",
    successMessage: "Trading queue has been cleared",
    confirmTitle: "Clear Trading Queue?",
    confirmDescription:
      "This will remove all pending trades from the queue. Bots will continue to generate new trades if active.",
  },
  {
    id: "restart_system",
    title: "Restart Trading System",
    description: "Gracefully restart the AI trading system",
    icon: Power,
    variant: "secondary",
    danger: false,
    endpoint: "/api/admin/ai/market-maker/emergency/restart-system",
    successMessage: "Trading system is restarting",
    confirmTitle: "Restart Trading System?",
    confirmDescription:
      "This will gracefully restart the AI trading system. Active trades will be preserved. The system will be unavailable for a few seconds.",
  },
];

export default function EmergencyActionsField({
  formValues,
  handleChange,
}: CustomComponentProps) {
  const t = useTranslations("ext_admin");
  const [loadingAction, setLoadingAction] = useState<string | null>(null);
  const [completedAction, setCompletedAction] = useState<string | null>(null);

  const handleExecuteAction = async (action: EmergencyAction) => {
    setLoadingAction(action.id);
    setCompletedAction(null);

    try {
      const { error } = await $fetch({
        url: action.endpoint,
        method: "POST",
      });

      if (error) {
        toast.error(typeof error === "string" ? error : "Failed to execute emergency action");
        return;
      }

      setCompletedAction(action.id);
      toast.success(action.successMessage);

      // Clear completed state after 3 seconds
      setTimeout(() => {
        setCompletedAction(null);
      }, 3000);
    } catch (err: any) {
      toast.error(err.message || "Failed to execute emergency action. Please try again.");
    } finally {
      setLoadingAction(null);
    }
  };

  const isGlobalPaused = formValues.aiMarketMakerGlobalPauseEnabled === true;
  const isMaintenanceMode = formValues.aiMarketMakerMaintenanceMode === true;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-md bg-red-500/10">
            <AlertTriangle className="w-4 h-4 text-red-500" />
          </div>
          <div>
            <Label className="text-sm font-medium">{t("emergency_controls")}</Label>
            <p className="text-xs text-muted-foreground">
              {t("execute_emergency_controls_for_the_ai_trading_system")}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {isGlobalPaused && (
            <Badge variant="secondary" className="bg-yellow-500/10 text-yellow-600 border-yellow-500/20">
              Paused
            </Badge>
          )}
          {isMaintenanceMode && (
            <Badge variant="secondary" className="bg-orange-500/10 text-orange-600 border-orange-500/20">
              Maintenance
            </Badge>
          )}
        </div>
      </div>

      {/* Warning Banner */}
      <div className="p-4 rounded-lg bg-red-500/10 border border-red-500/20">
        <div className="flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-500 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-red-600 dark:text-red-400">
              {t("emergency_controls")}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              {t("these_actions_have_immediate_effect_on")} {t("use_with_caution")} {t("emergency_stop_will_cancel_all_pending")}
            </p>
          </div>
        </div>
      </div>

      {/* Emergency Action Buttons */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {EMERGENCY_ACTIONS.map((action) => {
          const Icon = action.icon;
          const isLoading = loadingAction === action.id;
          const isCompleted = completedAction === action.id;

          return (
            <div
              key={action.id}
              className={`p-4 rounded-xl border-2 transition-all ${
                action.danger
                  ? "border-red-500/20 bg-red-500/5"
                  : "border-border bg-muted/30"
              }`}
            >
              <div className="flex items-start gap-3">
                <div
                  className={`p-2 rounded-lg ${
                    action.danger
                      ? "bg-red-500/10"
                      : action.id === "pause_all"
                      ? "bg-yellow-500/10"
                      : action.id === "resume_all"
                      ? "bg-green-500/10"
                      : "bg-muted"
                  }`}
                >
                  <Icon
                    className={`w-5 h-5 ${
                      action.danger
                        ? "text-red-500"
                        : action.id === "pause_all"
                        ? "text-yellow-500"
                        : action.id === "resume_all"
                        ? "text-green-500"
                        : "text-muted-foreground"
                    }`}
                  />
                </div>
                <div className="flex-1">
                  <h4 className="font-medium text-sm">{action.title}</h4>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {action.description}
                  </p>
                  <div className="mt-3">
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button
                          variant={action.variant}
                          size="sm"
                          disabled={isLoading}
                          className={`w-full ${action.buttonColor || ""}`}
                        >
                          {isLoading ? (
                            <>
                              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                              Executing...
                            </>
                          ) : isCompleted ? (
                            <>
                              <CheckCircle2 className="w-4 h-4 mr-2" />
                              Completed
                            </>
                          ) : (
                            <>
                              <Icon className="w-4 h-4 mr-2" />
                              Execute
                            </>
                          )}
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle className="flex items-center gap-2">
                            {action.danger && (
                              <AlertTriangle className="w-5 h-5 text-red-500" />
                            )}
                            {action.confirmTitle}
                          </AlertDialogTitle>
                          <AlertDialogDescription>
                            {action.confirmDescription}
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => handleExecuteAction(action)}
                            className={
                              action.danger
                                ? "bg-red-500 hover:bg-red-600"
                                : ""
                            }
                          >
                            Confirm
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* What happens during emergency stop */}
      <div className="p-4 rounded-lg bg-muted/50 border">
        <h5 className="text-sm font-medium mb-2">
          {t("what_happens_during_emergency_stop")}
        </h5>
        <ul className="text-xs text-muted-foreground space-y-1 list-disc list-inside">
          <li>{t("all_active_bots_will_be_immediately_terminated")}</li>
          <li>{t("all_pending_orders_will_be_cancelled")}</li>
          <li>{t("all_markets_will_be_set_to_stopped_status")}</li>
          <li>{t("no_new_trading_activity_will_occur")}</li>
          <li>{t("existing_positions_and_balances_are_preserved")}</li>
        </ul>
      </div>

      {/* Note */}
      <div className="p-3 rounded-lg bg-muted/50 border">
        <p className="text-xs text-muted-foreground">
          <strong>Note:</strong> Emergency actions are logged and audited. All
          actions require confirmation before execution. For routine
          maintenance, use the switches in the Trading tab instead.
        </p>
      </div>
    </div>
  );
}
