"use client";
import DataTable from "@/components/blocks/data-table";
import { columns } from "./columns";
import { sliderAnalytics } from "./analytics";
export default function SliderPage() {
  return (
    <DataTable
      apiEndpoint="/api/admin/slider"
      model="slider"
      permissions={{
        access: "access.slider",
        view: "view.slider",
        create: "create.slider",
        edit: "edit.slider",
        delete: "delete.slider",
      }}
      pageSize={10}
      canCreate
      canEdit
      canDelete
      canView
      title="Slider Management"
      itemTitle="Slider"
      columns={columns}
      analytics={sliderAnalytics}
    />
  );
}
