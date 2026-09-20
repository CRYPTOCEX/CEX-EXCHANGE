"use client";
import DataTable from "@/components/blocks/data-table";
import { Newspaper } from "lucide-react";
import { useColumns, useViewConfig } from "./columns";
import { useAnalytics } from "./analytics";
import { useTranslations } from "next-intl";

export default function PostPage() {
  const t = useTranslations("blog_admin");
  const columns = useColumns();
  const analytics = useAnalytics();
  const viewConfig = useViewConfig();

  return (
    <DataTable
      apiEndpoint="/api/admin/blog/post"
      model="post"
      permissions={{
        access: "access.blog.post",
        view: "view.blog.post",
        create: "create.blog.post",
        edit: "edit.blog.post",
        delete: "delete.blog.post",
      }}
      pageSize={12}
      canCreate
      canEdit
      canDelete
      canView
      isParanoid={true}
      title={t("post_management")}
      description={t("create_edit_and_publish_blog_posts")}
      itemTitle="Post"
      columns={columns}
      viewConfig={viewConfig}
      analytics={analytics}
      // A post is a document, not a row: the inline table form put a WYSIWYG
      // body, a cover image and a tag list into the same narrow column as the
      // slug. Create and edit are full pages now — the same editor the author
      // side mounts (`components/blocks/blog/post-editor.tsx`).
      //
      // `formConfig` is deliberately NOT passed with it. Both entry points into
      // the inline form (`HeaderCreateButton`, the row edit action) check these
      // links first, so a form config here would be config nobody can reach —
      // the kind that gets edited later and silently changes nothing.
      createLink="/admin/blog/post/create"
      editLink="/admin/blog/post/[id]/edit"
      design={{
        icon: Newspaper,
      }}
    />
  );
}
