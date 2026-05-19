import React from "react";
import { TableCell } from "@/components/ui/table";

export interface BaseColumnProps {
  column: ColumnDefinition;
  row: any;
}

export const BaseColumn: React.FC<BaseColumnProps> = ({ column, row }) => {
  return <TableCell>{row[column.key]}</TableCell>;
};
