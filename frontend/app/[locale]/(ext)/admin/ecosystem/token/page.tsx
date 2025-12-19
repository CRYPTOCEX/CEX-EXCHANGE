"use client";
import DataTable from "@/components/blocks/data-table";
import { useColumns, useFormConfig } from "./columns";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { Info } from "lucide-react";
import { Coins } from "lucide-react";
import { useTranslations } from "next-intl";

export default function EcosystemTokenPage() {
  const t = useTranslations("ext_admin");
  const columns = useColumns();
  const formConfig = useFormConfig();

  // Network configuration alert
  const networkConfigAlert = (
    <Alert className="bg-blue-50/50 dark:bg-blue-950/30 border-blue-200/50 dark:border-blue-800/50 [&>svg]:text-blue-600 dark:[&>svg]:text-blue-400">
      <Info className="h-4 w-4" />
      <AlertTitle className="text-blue-900 dark:text-blue-100">
        {t("network_configuration")}
      </AlertTitle>
      <AlertDescription className="text-blue-800/90 dark:text-blue-200/80">
        <p>{t("ensure_your_environment_variables_are_properly")} {t("for_example")}:</p>
        <div className="flex flex-wrap gap-2 mt-2">
          <code className="bg-blue-100 dark:bg-blue-900/50 text-blue-900 dark:text-blue-100 px-2 py-0.5 rounded text-xs font-mono">
            BSC_NETWORK=mainnet
          </code>
          <code className="bg-blue-100 dark:bg-blue-900/50 text-blue-900 dark:text-blue-100 px-2 py-0.5 rounded text-xs font-mono">
            ETH_NETWORK=mainnet
          </code>
        </div>
        <p className="mt-2">{t("the_tokens_network_field_must_match")}</p>
      </AlertDescription>
    </Alert>
  );

  return (
    <DataTable
        apiEndpoint="/api/admin/ecosystem/token"
        model="ecosystemToken"
        permissions={{
          access: "access.ecosystem.token",
          view: "view.ecosystem.token",
          create: "create.ecosystem.token",
          edit: "edit.ecosystem.token",
          delete: "delete.ecosystem.token",
        }}
        pageSize={12}
        canCreate
        createLink="/admin/ecosystem/token/create"
        canEdit
        editLink="/admin/ecosystem/token/[id]"
        canDelete
        canView
        title={t("ecosystem_token_management")}
        description={t("manage_blockchain_tokens_and_digital_assets")}
        itemTitle="Token"
        columns={columns}
        formConfig={formConfig}
        design={{
          animation: "orbs",
          primaryColor: "blue",
          secondaryColor: "cyan",
          icon: Coins,
        }}
        alertContent={networkConfigAlert}
      />
  );
}
