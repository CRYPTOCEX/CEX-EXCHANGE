"use client";
import DataTable from "@/components/blocks/data-table";
import {
  Award,
  CheckCircle2,
  XCircle,
  Pause,
  Play,
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
import { toast } from "sonner";

export default function LeaderPage() {
  const t = useTranslations("ext_admin");
  const tCommon = useTranslations("common");
  const columns = useColumns();
  const formConfig = useFormConfig();
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
      title={t("leaders_management")}
      description={t("view_and_manage_copy_trading_leaders")}
      itemTitle="Leader"
      columns={columns}
      formConfig={formConfig}
      analytics={analytics}
      design={{
        animation: "orbs",
        primaryColor: "indigo",
        secondaryColor: "violet",
        icon: Award,
      }}
      expandedButtons={(row: any, refresh?: () => void) => (
        <>
          {row.status === "PENDING" && (
            <>
              <Button
                variant="outline"
                size="sm"
                className="gap-2 text-green-600 border-green-600/50 hover:bg-green-600/10"
                onClick={() => handleAction(row.id, "approve", undefined, refresh)}
              >
                <CheckCircle2 className="h-4 w-4" />
                {tCommon("approve")}
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="gap-2 text-red-600 border-red-600/50 hover:bg-red-600/10"
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
              className="gap-2 text-yellow-600 border-yellow-600/50 hover:bg-yellow-600/10"
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
              className="gap-2 text-green-600 border-green-600/50 hover:bg-green-600/10"
              onClick={() => handleAction(row.id, "activate", undefined, refresh)}
            >
              <Play className="h-4 w-4" />
              {tCommon("reactivate")}
            </Button>
          )}
        </>
      )}
      extraRowActions={(row: any, refresh?: () => void) => (
        <>
          {row.status === "PENDING" && (
            <>
              <DropdownMenuItem
                onClick={() => handleAction(row.id, "approve", undefined, refresh)}
              >
                <CheckCircle2 className="mr-2 h-4 w-4 text-green-500" />
                {tCommon("approve")}
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => {
                  const reason = prompt(tCommon("enter_rejection_reason"));
                  if (reason) handleAction(row.id, "reject", reason, refresh);
                }}
              >
                <XCircle className="mr-2 h-4 w-4 text-red-500" />
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
              <Pause className="mr-2 h-4 w-4 text-yellow-500" />
              {tCommon("suspend")}
            </DropdownMenuItem>
          )}
          {row.status === "SUSPENDED" && (
            <DropdownMenuItem
              onClick={() => handleAction(row.id, "activate", undefined, refresh)}
            >
              <Play className="mr-2 h-4 w-4 text-green-500" />
              {tCommon("reactivate")}
            </DropdownMenuItem>
          )}
        </>
      )}
    />
  );
}
