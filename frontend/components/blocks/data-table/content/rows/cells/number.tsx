import React from "react";
import { CellRendererProps } from "./cell-renderer-props";

interface NumberCellProps extends CellRendererProps<number> {
  format?: Intl.NumberFormatOptions;
}

export function NumberCell({ value, row, format }: NumberCellProps) {
  // row is available if needed
  const formatter = new Intl.NumberFormat(undefined, format);
  return <span className="font-mono">{formatter.format(value)}</span>;
}
