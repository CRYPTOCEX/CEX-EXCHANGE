"use client";
import DataTable from "@/components/blocks/data-table";
import {
  Users,
  Play,
  XCircle,
  ExternalLink,
} from "lucide-react";
import { useColumns, useFormConfig, useViewConfig } from "./columns";
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
  const viewConfig = useViewConfig();
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
      isParanoid={false}
      title={t("subscriptions_management")}
      description={t("view_and_manage_copy_trading_subscriptions")}
      itemTitle="Subscription"
      columns={columns}
      formConfig={formConfig}
      viewConfig={viewConfig}
      analytics={analytics}
      design={{
        icon: Users,
      }}
      expandedButtons={(row: any, refresh?: () => void) => (
        <>
          {row.leader?.id && (
            <Button
              variant="outline"
              size="sm"
              className="gap-2 text-primary border-primary/50 hover:bg-primary/10 hover:text-primary-ink"
              onClick={() =>
                router.push(`/admin/copy-trading/leader/${row.leader.id}`)
              }
            >
              <ExternalLink className="h-4 w-4" />
              {tExt("view_leader")}
            </Button>
          )}
          {row.status === "PAUSED" && (
            <Button
              variant="outline"
              size="sm"
              className="gap-2 text-success border-success/50 hover:bg-success/10 hover:text-success-ink"
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
              className="gap-2 text-destructive border-destructive/50 hover:bg-destructive/10 hover:text-destructive-ink"
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
      /* "View leader" is navigation, not a mutation, so it stays ungated —
         only resume/stop are behind `canEdit`. */
      extraRowActions={(row: any, { canEdit, refresh }) => (
        <>
          {row.leader?.id && (
            <>
              <DropdownMenuItem
                onClick={() =>
                  router.push(`/admin/copy-trading/leader/${row.leader.id}`)
                }
              >
                <ExternalLink className="mr-2 h-4 w-4 text-primary" />
                {tExt("view_leader")}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
            </>
          )}
          {canEdit && row.status === "PAUSED" && (
            <DropdownMenuItem
              onClick={() => handleAction(row.id, "resume", undefined, refresh)}
            >
              <Play className="mr-2 h-4 w-4 text-success" />
              {tCommon("resume")}
            </DropdownMenuItem>
          )}
          {canEdit && row.status !== "STOPPED" && (
            <DropdownMenuItem
              onClick={() => {
                const reason = prompt(t("enter_stop_reason"));
                if (reason) handleAction(row.id, "stop", reason, refresh);
              }}
              className="text-destructive"
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
