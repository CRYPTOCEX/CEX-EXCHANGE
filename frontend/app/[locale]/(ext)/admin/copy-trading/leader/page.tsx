"use client";
import DataTable from "@/components/blocks/data-table";
import {
  Award,
  CheckCircle2,
  XCircle,
  Pause,
  Play,
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
import { toast } from "sonner";

export default function LeaderPage() {
  const t = useTranslations("ext_admin");
  const tCommon = useTranslations("common");
  const columns = useColumns();
  const formConfig = useFormConfig();
  const viewConfig = useViewConfig();
  const analytics = useAnalytics();

  const handleAction = async (
    leaderId: string,
    action: string,
    reason?: string,
    refresh?: () => void
  ) => {
    const { error } = await $fetch({
      url: `/api/admin/copy-trading/leader/${leaderId}/${action}`,
      method: "POST",
      body: reason ? { reason } : undefined,
    });

    if (!error) {
      toast.success(t("leader_action_success"));
      refresh?.();
    }
  };

  return (
    <DataTable
      apiEndpoint="/api/admin/copy-trading/leader"
      model="copyTradingLeader"
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
      viewLink="/admin/copy-trading/leader/[id]"
      isParanoid={true}
      title={t("leaders_management")}
      description={t("view_and_manage_copy_trading_leaders")}
      itemTitle="Leader"
      columns={columns}
      formConfig={formConfig}
      viewConfig={viewConfig}
      analytics={analytics}
      design={{
        icon: Award,
      }}
      expandedButtons={(row: any, refresh?: () => void) => (
        <>
          {row.status === "PENDING" && (
            <>
              <Button
                variant="outline"
                size="sm"
                className="gap-2 text-success border-success/50 hover:bg-success/10 hover:text-success-ink"
                onClick={() => handleAction(row.id, "approve", undefined, refresh)}
              >
                <CheckCircle2 className="h-4 w-4" />
                {tCommon("approve")}
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="gap-2 text-destructive border-destructive/50 hover:bg-destructive/10 hover:text-destructive-ink"
                onClick={() => {
                  const reason = prompt(tCommon("enter_rejection_reason"));
                  if (reason) handleAction(row.id, "reject", reason, refresh);
                }}
              >
                <XCircle className="h-4 w-4" />
                {tCommon("reject")}
              </Button>
            </>
          )}
          {row.status === "ACTIVE" && (
            <Button
              variant="outline"
              size="sm"
              className="gap-2 text-warning border-warning/50 hover:bg-warning/10 hover:text-warning-ink"
              onClick={() => {
                const reason = prompt(t("enter_suspension_reason"));
                if (reason) handleAction(row.id, "suspend", reason, refresh);
              }}
            >
              <Pause className="h-4 w-4" />
              {tCommon("suspend")}
            </Button>
          )}
          {row.status === "SUSPENDED" && (
            <Button
              variant="outline"
              size="sm"
              className="gap-2 text-success border-success/50 hover:bg-success/10 hover:text-success-ink"
              onClick={() => handleAction(row.id, "activate", undefined, refresh)}
            >
              <Play className="h-4 w-4" />
              {tCommon("reactivate")}
            </Button>
          )}
        </>
      )}
      extraRowActions={(row: any, { canEdit, refresh }) => !canEdit ? null : (
        <>
          {row.status === "PENDING" && (
            <>
              <DropdownMenuItem
                onClick={() => handleAction(row.id, "approve", undefined, refresh)}
              >
                <CheckCircle2 className="mr-2 h-4 w-4 text-success" />
                {tCommon("approve")}
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => {
                  const reason = prompt(tCommon("enter_rejection_reason"));
                  if (reason) handleAction(row.id, "reject", reason, refresh);
                }}
              >
                <XCircle className="mr-2 h-4 w-4 text-destructive" />
                {tCommon("reject")}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
            </>
          )}
          {row.status === "ACTIVE" && (
            <DropdownMenuItem
              onClick={() => {
                const reason = prompt(t("enter_suspension_reason"));
                if (reason) handleAction(row.id, "suspend", reason, refresh);
              }}
            >
              <Pause className="mr-2 h-4 w-4 text-warning" />
              {tCommon("suspend")}
            </DropdownMenuItem>
          )}
          {row.status === "SUSPENDED" && (
            <DropdownMenuItem
              onClick={() => handleAction(row.id, "activate", undefined, refresh)}
            >
              <Play className="mr-2 h-4 w-4 text-success" />
              {tCommon("reactivate")}
            </DropdownMenuItem>
          )}
        </>
      )}
    />
  );
}
