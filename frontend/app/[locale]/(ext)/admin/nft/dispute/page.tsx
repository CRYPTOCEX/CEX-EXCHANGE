import { DisputeManagementClient } from "./client";
import { PAGE_PADDING } from "@/app/[locale]/(dashboard)/theme-config";

export default function DisputeManagementPage() {
  return (
    <div className={`container ${PAGE_PADDING}`}>
      <DisputeManagementClient />
    </div>
  );
}