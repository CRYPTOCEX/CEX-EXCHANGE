"use client";
import DataTable from "@/components/blocks/data-table";
import { columns } from "./columns";
export default function AiInvestmentDurationPage() {
  return (
    <DataTable
      apiEndpoint="/api/admin/ai/investment/duration"
      model="aiInvestmentDuration"
      permissions={{
        access: "access.ai.investment.duration",
        view: "view.ai.investment.duration",
        create: "create.ai.investment.duration",
        edit: "edit.ai.investment.duration",
        delete: "delete.ai.investment.duration",
      }}
      pageSize={10}
      canCreate
      canEdit
      canDelete
      canView
      title="AI Investment Durations"
      itemTitle="Duration"
      columns={columns}
    />
  );
}
