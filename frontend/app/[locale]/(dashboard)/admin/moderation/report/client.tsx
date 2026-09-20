"use client";

import { Flag } from "lucide-react";
import DataTable from "@/components/blocks/data-table";
import { useColumns, useFormConfig } from "./columns";

/**
 * Content reports — complaints about a comment, post, listing or profile.
 *
 * `canCreate` and `canDelete` are BOTH off, and both for the same reason: a
 * report is somebody else's statement. An operator who could write one would be
 * filing a complaint in a user's name, and one who could delete one would be
 * removing an allegation from the record — which is exactly what the model is
 * paranoid to prevent. What an operator does is READ and RULE.
 *
 * The permissions are the BLOG COMMENT ones. A new `*.moderation.report` key
 * would have to be registered in four places and only the seeder writes the
 * permission table, so on any install that upgrades without re-seeding it would
 * be ungrantable — and the gate then 403s every non-Super-Admin, silently and
 * forever. Blog comments are the surface this queue was built for and the
 * remedy lives in the tooling that key already opens.
 */
export default function ContentReportClient() {
  const columns = useColumns();
  const formConfig = useFormConfig();

  return (
    <DataTable
      apiEndpoint="/api/admin/moderation/report"
      model="contentReport"
      permissions={{
        access: "access.blog.comment",
        view: "view.blog.comment",
        create: "create.blog.comment",
        edit: "edit.blog.comment",
        delete: "delete.blog.comment",
      }}
      pageSize={12}
      canCreate={false}
      canEdit={true}
      canDelete={false}
      canView={true}
      title="Reported content"
      description="Complaints users filed about a comment, post, listing or profile. Reporting does not hide anything — the item stays up until somebody rules on it."
      itemTitle="Report"
      columns={columns}
      formConfig={formConfig}
      isParanoid={true}
      design={{ icon: Flag }}
    />
  );
}
