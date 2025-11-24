import React from "react";
import { TableCell } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { BaseColumnProps } from "./base-column";

export const BadgeColumn: React.FC<BaseColumnProps> = ({ column, row }) => {
  const value = row[column.key];
  return (
    <TableCell>
      <Badge variant={column.render?.config.variant(value)}>{value}</Badge>
    </TableCell>
  );
};
