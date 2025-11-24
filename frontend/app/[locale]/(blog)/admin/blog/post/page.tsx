"use client";
import DataTable from "@/components/blocks/data-table";
import { columns } from "./columns";
import { postAnalytics } from "./analytics";
export default function PostPage() {
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
      pageSize={10}
      canCreate
      canEdit
      canDelete
      canView
      title="Post Management"
      itemTitle="Post"
      columns={columns}
      analytics={postAnalytics}
    />
  );
}
