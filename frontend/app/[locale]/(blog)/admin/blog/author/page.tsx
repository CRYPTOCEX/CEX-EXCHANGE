"use client";
import React from "react";
import DataTable from "@/components/blocks/data-table";
import { columns } from "./columns";
import { authorAnalytics } from "./analytics";
export default function AuthorPage(): React.JSX.Element {
  return (
    <DataTable
      apiEndpoint="/api/admin/blog/author"
      model="author"
      permissions={{
        access: "access.blog.author",
        view: "view.blog.author",
        create: "create.blog.author",
        edit: "edit.blog.author",
        delete: "delete.blog.author",
      }}
      pageSize={10}
      canCreate={false}
      canEdit
      canDelete
      canView
      title="Author Management"
      itemTitle="Author"
      columns={columns}
      analytics={authorAnalytics}
    />
  );
}
