"use client";
import DataTable from "@/components/blocks/data-table";
import { columns } from "./columns";
import { commentAnalytics } from "./analytics";
export default function CommentPage() {
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
      pageSize={10}
      canEdit
      canDelete
      canView
      title="Comment Management"
      itemTitle="Comment"
      columns={columns}
      analytics={commentAnalytics}
    />
  );
}
