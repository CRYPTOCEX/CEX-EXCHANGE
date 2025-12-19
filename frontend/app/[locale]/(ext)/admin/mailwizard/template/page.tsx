"use client";
import DataTable from "@/components/blocks/data-table";
import { LayoutTemplate } from "lucide-react";

import { useColumns, useFormConfig } from "./columns";
import { useTranslations } from "next-intl";
export default function MailwizardTemplatePage() {
  const t = useTranslations("ext_admin");
  const columns = useColumns();
  const formConfig = useFormConfig();
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
      pageSize={12}
      canCreate
      createLink="/admin/mailwizard/template/create"
      canEdit
      editLink="/admin/mailwizard/template/[id]"
      canDelete
      canView
      title={t("email_template_management")}
      description={t("design_and_manage_reusable_email_templates")}
      itemTitle="Template"
      columns={columns}
      formConfig={formConfig}
      design={{
        animation: "orbs",
        primaryColor: "violet",
        secondaryColor: "rose",
        icon: LayoutTemplate,
      }}
    />
  );
}
