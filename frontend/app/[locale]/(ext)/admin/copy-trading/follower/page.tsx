"use client";
import DataTable from "@/components/blocks/data-table";
import {
  Users,
  Pause,
  Play,
  XCircle,
  ExternalLink,
} from "lucide-react";
import { useColumns, useFormConfig } from "./columns";
import { useAnalytics } from "./analytics";
import { useTranslations } from "next-intl";
import {
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { $fetch } from "@/lib/api";
import { useRouter } from "@/i18n/routing";
import { toast } from "sonner";

export default function FollowerPage() {
  const t = useTranslations("ext_admin");
  const tCommon = useTranslations("common");
  const tExt = useTranslations("ext");
  const router = useRouter();
  const columns = useColumns();
  const formConfig = useFormConfig();
  const analytics = useAnalytics();

  const handleAction = async (
    subscriptionId: string,
    action: string,
    reason?: string,
    refresh?: () => void
  ) => {
    const { error } = await $fetch({
      url: `/api/admin/copy-trading/follower/${subscriptionId}/${action}`,
      method: "POST",
      body: reason ? { reason } : undefined,
    });

    if (!error) {
      toast.success(t("subscription_action_success"));
      refresh?.();
    }
  };

  return (
    <DataTable
      apiEndpoint="/api/admin/copy-trading/follower"
      model="copyTradingFollower"
      permissions={{
        access: "access.copy_trading",
        view: "view.copy_trading",
        create: "create.copy_trading",
        edit: "edit.copy_trading",
        delete: "delete.copy_trading",
      }}
      pageSize={20}
      canCreate={false}
      canEdit={false}
      canDelete={false}
      canView
      viewLink="/admin/copy-trading/follower/[id]"
      title={t("subscriptions_management")}
      description={t("view_and_manage_copy_trading_subscriptions")}
      itemTitle="Subscription"
      columns={columns}
      formConfig={formConfig}
      analytics={analytics}
      design={{
        animation: "orbs",
        primaryColor: "violet",
        secondaryColor: "indigo",
        icon: Users,
      }}
      expandedButtons={(row: any, refresh?: () => void) => (
        <>
          {row.leader?.id && (
            <Button
              variant="outline"
              size="sm"
              className="gap-2 text-indigo-600 border-indigo-600/50 hover:bg-indigo-600/10"
              onClick={() =>
                router.push(`/admin/copy-trading/leader/${row.leader.id}`)
              }
            >
              <ExternalLink className="h-4 w-4" />
              {tExt("view_leader")}
            </Button>
          )}
          {row.status === "ACTIVE" && (
            <Button
              variant="outline"
              size="sm"
              className="gap-2 text-yellow-600 border-yellow-600/50 hover:bg-yellow-600/10"
              onClick={() => {
                const reason = prompt(t("enter_pause_reason"));
                if (reason) handleAction(row.id, "pause", reason, refresh);
              }}
            >
              <Pause className="h-4 w-4" />
              {tCommon("pause")}
            </Button>
          )}
          {row.status === "PAUSED" && (
            <Button
              variant="outline"
              size="sm"
              className="gap-2 text-green-600 border-green-600/50 hover:bg-green-600/10"
              onClick={() => handleAction(row.id, "resume", undefined, refresh)}
            >
              <Play className="h-4 w-4" />
              {tCommon("resume")}
            </Button>
          )}
          {row.status !== "STOPPED" && (
            <Button
              variant="outline"
              size="sm"
              className="gap-2 text-red-600 border-red-600/50 hover:bg-red-600/10"
              onClick={() => {
                const reason = prompt(t("enter_stop_reason"));
                if (reason) handleAction(row.id, "stop", reason, refresh);
              }}
            >
              <XCircle className="h-4 w-4" />
              {tCommon("stop")}
            </Button>
          )}
        </>
      )}
      extraRowActions={(row: any, refresh?: () => void) => (
        <>
          {row.leader?.id && (
            <>
              <DropdownMenuItem
                onClick={() =>
                  router.push(`/admin/copy-trading/leader/${row.leader.id}`)
                }
              >
                <ExternalLink className="mr-2 h-4 w-4 text-indigo-500" />
                {tExt("view_leader")}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
            </>
          )}
          {row.status === "ACTIVE" && (
            <DropdownMenuItem
              onClick={() => {
                const reason = prompt(t("enter_pause_reason"));
                if (reason) handleAction(row.id, "pause", reason, refresh);
              }}
            >
              <Pause className="mr-2 h-4 w-4 text-yellow-500" />
              {tCommon("pause")}
            </DropdownMenuItem>
          )}
          {row.status === "PAUSED" && (
            <DropdownMenuItem
              onClick={() => handleAction(row.id, "resume", undefined, refresh)}
            >
              <Play className="mr-2 h-4 w-4 text-green-500" />
              {tCommon("resume")}
            </DropdownMenuItem>
          )}
          {row.status !== "STOPPED" && (
            <DropdownMenuItem
              onClick={() => {
                const reason = prompt(t("enter_stop_reason"));
                if (reason) handleAction(row.id, "stop", reason, refresh);
              }}
              className="text-red-600"
            >
              <XCircle className="mr-2 h-4 w-4" />
              {tCommon("stop")}
            </DropdownMenuItem>
          )}
        </>
      )}
    />
  );
}
