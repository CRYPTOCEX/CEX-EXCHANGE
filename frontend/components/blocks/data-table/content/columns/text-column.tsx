import React from "react";
import { BaseColumn, BaseColumnProps } from "./base-column";

export const TextColumn: React.FC<BaseColumnProps> = ({ column, row }) => {
  return <BaseColumn column={column} row={row} />;
};
