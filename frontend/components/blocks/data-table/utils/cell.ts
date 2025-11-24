import { cn } from "@/lib/utils";

export const getCellClasses = (
  columnId: string,
  isExpanded: boolean = false,
  isSkeleton: boolean = false
) =>
  cn(
    "py-3 px-4 border-none",
    isExpanded
      ? "first:rounded-tl-lg last:rounded-tr-lg"
      : "first:rounded-l-lg last:rounded-r-lg",
    columnId === "select" && "w-[40px]",
    columnId === "id" && "w-[120px] min-w-[120px] max-w-[120px]",
    columnId === "email" && "w-[250px]",
    !["id", "email", "select", "actions"].includes(columnId) && "w-[180px]",
    columnId === "actions" && "w-[80px]",
    "align-middle",
    "ltr:text-left rtl:text-right",
    isSkeleton && "h-16" // Add this class for skeletons
  );

export const getCellContentClasses = (isActionsColumn: boolean) =>
  cn(
    "flex items-center space-x-2",
    isActionsColumn ? "justify-center" : "truncate",
    "ltr:flex-row rtl:flex-row-reverse"
  );

export const processEndpointLink = (link: string, row: any): string => {
  return link.replace(/\[(\w+)\]/g, (_, key) => row[key] || "");
};
