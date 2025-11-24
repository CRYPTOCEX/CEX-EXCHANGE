import React from "react";
import { TableCell } from "@/components/ui/table";
import { BaseColumnProps } from "./base-column";
import { format } from "date-fns";

export const DateColumn: React.FC<BaseColumnProps> = ({ column, row }) => {
  const date = row[column.key];
  return (
    <TableCell>
      {date ? format(new Date(date), column.render?.format || "PPP") : ""}
    </TableCell>
  );
};
