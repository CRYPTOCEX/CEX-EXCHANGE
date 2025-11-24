"use client";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { ArrowLeft, ArrowRight } from "lucide-react";
import type { Column, Row, Section } from "@/types/builder";
import { useBuilderStore } from "@/store/builder-store";
import { useTranslations } from "next-intl";

interface ColumnSettingsProps {
  column: Column;
  row: Row;
  section: Section;
}

export const ColumnSettings = ({
  column,
  row,
  section,
}: ColumnSettingsProps) => {
  const t = useTranslations("dashboard");
  const handleWidthChange = (width: number) => {
    const formattedWidth = Number.parseFloat(width.toFixed(2));
    useBuilderStore.getState().updateColumn(section.id, row.id, column.id, {
      ...column,
      width: formattedWidth,
    });
  };

  return (
    <div className="space-y-3">
      <div className="space-y-1">
        <div className="flex items-center justify-between">
          <Label className="text-xs">{t("width_(%)")}</Label>
          <span className="text-xs font-normal text-muted-foreground">
            {column?.width.toFixed(2)}%
          </span>
        </div>

        <div className="flex items-center gap-2">
          <Slider
            min={10}
            max={100}
            step={1}
            value={[column?.width || 100]}
            onValueChange={(values) => handleWidthChange(values[0])}
            className="flex-1"
          />
          <Input
            type="number"
            value={column?.width.toFixed(2)}
            onChange={(e) => handleWidthChange(Number(e.target.value))}
            className="h-7 w-16 text-xs"
          />
        </div>
      </div>

      <div className="space-y-1">
        <Label className="text-xs">{t("column_position")}</Label>
        <div className="grid grid-cols-2 gap-2">
          <Button
            variant="outline"
            size="sm"
            className="h-auto py-2 text-xs flex flex-col items-center gap-1"
            onClick={() => {
              if (column && row) {
                const columnIndex = row.columns.findIndex(
                  (c) => c.id === column.id
                );
                if (columnIndex > 0) {
                  useBuilderStore
                    .getState()
                    .reorderColumn(
                      column.id,
                      section.id,
                      row.id,
                      undefined,
                      "up"
                    );
                }
              }
            }}
            disabled={
              column && row
                ? row.columns.findIndex((c) => c.id === column.id) === 0
                : false
            }
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            <span>{t("move_left")}</span>
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="h-auto py-2 text-xs flex flex-col items-center gap-1"
            onClick={() => {
              if (column && row) {
                const columnIndex = row.columns.findIndex(
                  (c) => c.id === column.id
                );
                if (columnIndex < row.columns.length - 1) {
                  useBuilderStore
                    .getState()
                    .reorderColumn(
                      column.id,
                      section.id,
                      row.id,
                      undefined,
                      "down"
                    );
                }
              }
            }}
            disabled={
              column && row
                ? row.columns.findIndex((c) => c.id === column.id) ===
                  row.columns.length - 1
                : false
            }
          >
            <ArrowRight className="h-3.5 w-3.5" />
            <span>{t("move_right")}</span>
          </Button>
        </div>
      </div>
    </div>
  );
};
