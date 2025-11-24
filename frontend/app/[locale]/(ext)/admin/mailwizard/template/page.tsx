"use client";
import DataTable from "@/components/blocks/data-table";
import { columns } from "./columns";
export default function MailwizardTemplatePage() {
  return (
    <DataTable
      apiEndpoint="/api/admin/mailwizard/template"
      model="mailwizardTemplate"
      permissions={{
        access: "access.mailwizard.template",
        view: "view.mailwizard.template",
        create: "create.mailwizard.template",
        edit: "edit.mailwizard.template",
        delete: "delete.mailwizard.template",
      }}
      pageSize={10}
      canCreate
      createLink="/admin/mailwizard/template/create"
      canEdit
      editLink="/admin/mailwizard/template/[id]"
      canDelete
      canView
      title="Mailwizard Templates"
      itemTitle="Template"
      columns={columns}
    />
  );
}
