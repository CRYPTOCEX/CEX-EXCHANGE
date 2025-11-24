"use client";
import DataTable from "@/components/blocks/data-table";
import { columns } from "./columns";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Icon } from "@iconify/react";

export default function EcosystemTokenPage() {
  return (
    <div className="space-y-6">
      {/* Network Configuration Guide */}
      <Alert className="bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800">
        <Icon icon="lucide:info" className="h-4 w-4 text-blue-600 dark:text-blue-400" />
        <AlertDescription className="text-blue-900 dark:text-blue-100">
          <strong>Network Configuration:</strong> Ensure your environment variables are properly configured for each chain. 
          For example: <code className="bg-blue-100 dark:bg-blue-800 px-1 rounded">BSC_NETWORK=mainnet</code>, 
          <code className="bg-blue-100 dark:bg-blue-800 px-1 rounded ml-2">ETH_NETWORK=mainnet</code>. 
          The token's network field must match these environment values for proper functionality.
        </AlertDescription>
      </Alert>

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
        pageSize={10}
        canCreate
        createLink="/admin/ecosystem/token/create"
        canEdit
        editLink="/admin/ecosystem/token/[id]"
        canDelete
        canView
        title="Ecosystem Tokens"
        itemTitle="Token"
        columns={columns}
      />
    </div>
  );
}
