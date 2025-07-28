import React from "react";
import { TextCell } from "./text";
import { NumberCell } from "./number";
import { DateCell } from "./date";
import { BadgeCell } from "./badge";
import { TagsCell } from "./tags";
import { BooleanCell } from "./boolean";
import { CompoundCell } from "./compound";
import { ToggleCell, ToggleConfig } from "./toggle";
import { ImageCell } from "./image";
import Rating from "./rating";
import { Link } from "@/i18n/routing";

export type CellRenderType =
  | { type: "text" }
  | { type: "textarea" }
  | { type: "number"; format?: Intl.NumberFormatOptions }
  | { type: "rating" }
  | { type: "date"; format?: string; fullDate?: boolean }
  | { type: "badge"; config: any }
  | { type: "tags"; config: { maxDisplay?: number } }
  | { type: "multiselect"; config: { maxDisplay?: number } }
  | { type: "boolean"; labels?: { true: string; false: string } }
  | { type: "custom"; render: (value: any, row: any) => React.ReactNode }
  | { type: "compound"; config: any }
  | { type: "select" }
  | { type: "toggle"; config: ToggleConfig }
  | { type: "image"; size?: "sm" | "md" | "lg" | "xl" }
  | { type: "link"; config: { target?: string } };

interface CellRendererProps {
  renderType?: CellRenderType | ((value: any, row: any) => React.ReactNode);
  value: any;
  row?: any;
  breakText?: boolean;
  cropText?: boolean;
}

export function CellRenderer({
  renderType,
  value,
  row,
  breakText = false,
  cropText = false,
}: CellRendererProps) {
  if (typeof renderType === "function") {
    return <>{renderType(value, row)}</>;
  }

  if (!renderType) {
    if (typeof value === "boolean") {
      return <BooleanCell value={value} row={row} />;
    }
    return <TextCell value={String(value)} row={row} breakText={breakText} />;
  }

  switch (renderType.type) {
    case "text":
      return <TextCell value={String(value)} row={row} breakText={breakText} />;
    case "textarea":
      return (
        <TextCell
          value={String(value)}
          row={row}
          breakText={breakText}
          cropText={cropText}
        />
      );
    case "number":
      return (
        <NumberCell
          value={Number(value)}
          row={row}
          format={renderType.format}
        />
      );
    case "rating":
      return <Rating rating={value} />;
    case "date":
      return (
        <DateCell
          value={value}
          row={row}
          formatString={renderType.format}
          fullDate={renderType.fullDate}
        />
      );
    case "badge":
      return (
        <BadgeCell value={String(value)} row={row} config={renderType.config} />
      );
    case "tags":
    case "multiselect":
      return (
        <TagsCell
          value={value}
          row={row}
          maxDisplay={renderType.config?.maxDisplay ?? 3}
        />
      );
    case "boolean":
      return (
        <BooleanCell
          value={Boolean(value)}
          row={row}
          labels={renderType.labels}
        />
      );
    case "custom":
      return <>{renderType.render(value, row)}</>;
    case "image": {
      const imageSize =
        renderType.size ||
        (row?.columnSize as "sm" | "md" | "lg" | "xl") ||
        "md";
      const fallback = (renderType as any).fallback;
      return (
        <ImageCell
          value={String(value)}
          row={row}
          size={imageSize}
          fallback={fallback}
        />
      );
    }
    case "compound":
      return (
        <CompoundCell value={value} row={row} config={renderType.config} />
      );
    case "select":
      return (
        <TextCell
          value={value?.name || String(value)}
          row={row}
          breakText={breakText}
        />
      );
    case "toggle":
      return (
        <ToggleCell value={!!value} row={row} config={renderType.config} />
      );
    case "link":
      if (!value) {
        return <TextCell value="N/A" row={row} breakText={breakText} />;
      }
      return (
        <Link
          href={String(value)}
          target={renderType.config.target || "_self"}
          rel="noopener noreferrer"
          className="text-primary hover:underline"
        >
          {String(value)}
        </Link>
      );
    default:
      return <TextCell value={String(value)} row={row} breakText={breakText} />;
  }
}
