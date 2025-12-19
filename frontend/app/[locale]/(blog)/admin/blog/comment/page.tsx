"use client";
import DataTable from "@/components/blocks/data-table";
import { MessageSquare } from "lucide-react";
import { useColumns, useFormConfig } from "./columns";
import { useAnalytics } from "./analytics";
import { useTranslations } from "next-intl";

export default function CommentPage() {
  const t = useTranslations("blog_admin");
  const columns = useColumns();
  const formConfig = useFormConfig();
  const analytics = useAnalytics();

  return (
    <DataTable
      apiEndpoint="/api/admin/blog/comment"
      model="comment"
      permissions={{
        access: "access.blog.comment",
        view: "view.blog.comment",
        create: "create.blog.comment",
        edit: "edit.blog.comment",
        delete: "delete.blog.comment",
      }}
      pageSize={12}
      canEdit
      canDelete
      canView
      title={t("comment_management")}
      description={t("moderate_and_manage_reader_comments_on_blog_posts")}
      itemTitle="Comment"
      columns={columns}
      formConfig={formConfig}
      analytics={analytics}
      design={{
        animation: "orbs",
        icon: MessageSquare,
      }}
    />
  );
}
