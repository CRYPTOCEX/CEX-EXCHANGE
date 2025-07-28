// components/DataTableFilters.tsx
import React from "react";
import { useTableStore } from "../../store";
import { TextFilter } from "./text-filter";
import { DateFilter } from "./date-filter";
import { SelectFilter } from "./select-filter";
import { SwitchFilter } from "./switch-filter";
import { RangeFilter } from "./range-filter";
import { MultiSelectFilter } from "./multi-select-filter";
import { cn } from "@/lib/utils";
import { debounce } from "@/utils/debounce";

export function DataTableFilters() {
  const columns = useTableStore((state) => state.columns);
  const filters = useTableStore((state) => state.filters);
  const updateFilter = useTableStore((state) => state.updateFilter);
  const updateFilterImmediate = useTableStore(
    (state) => state.updateFilterImmediate
  );
  const visibleColumns = useTableStore((state) => state.visibleColumns);
  const db = useTableStore((state) => state.db);

  const debouncedUpdateFilter = React.useMemo(
    () => debounce(updateFilter, 50),
    [updateFilter]
  );

  // Render filter for compound columns with optional parent prefix
  const renderCompoundFilters = (column: ColumnDefinition) => {
    if (column.render?.type !== "compound") return null;

    const config = column.render.config;
    const primary = config.primary;
    const secondary = config.secondary;

    return (
      <>
        {primary &&
          (Array.isArray(primary.key) ? (
            (primary.key as string[]).map((subKey: string, index: number) => (
              <TextFilter
                key={`${column.key}-${subKey}`}
                label={`${column.title} (${
                  Array.isArray(primary.title)
                    ? primary.title[index]
                    : primary.title
                })`}
                // If disablePrefixSort is true, use the subKey as is
                columnKey={
                  column.disablePrefixSort ? subKey : `${column.key}.${subKey}`
                }
                icon={primary.icon}
                description={
                  Array.isArray(primary.description)
                    ? primary.description[index]
                    : primary.description
                }
                onChange={(fieldKey, value, operator) =>
                  updateFilter(fieldKey, { value, operator })
                }
                columnFilters={Object.entries(filters).map(([id, val]) => ({
                  id,
                  value: val,
                }))}
                db={db}
              />
            ))
          ) : (
            <TextFilter
              key={`${column.key}-primary`}
              label={`${column.title} (${primary.title})`}
              columnKey={
                column.disablePrefixSort
                  ? primary.key
                  : `${column.key}.${primary.key}`
              }
              icon={primary.icon}
              description={primary.description}
              onChange={(fieldKey, value, operator) =>
                updateFilter(fieldKey, { value, operator })
              }
              columnFilters={Object.entries(filters).map(([id, val]) => ({
                id,
                value: val,
              }))}
              db={db}
            />
          ))}
        {secondary && (
          <TextFilter
            key={`${column.key}-${secondary.key}`}
            label={`${column.title} (${secondary.title})`}
            columnKey={
              column.disablePrefixSort
                ? secondary.key
                : `${column.key}.${secondary.key}`
            }
            icon={secondary.icon}
            description={secondary.description}
            onChange={(fieldKey, value, operator) =>
              updateFilter(fieldKey, { value, operator })
            }
            columnFilters={Object.entries(filters).map(([id, val]) => ({
              id,
              value: val,
            }))}
            db={db}
          />
        )}
      </>
    );
  };

  const renderFilter = (column: ColumnDefinition) => {
    if (column.type === "compound") {
      return renderCompoundFilters(column);
    }

    switch (column.type) {
      case "date":
        return (
          <DateFilter
            key={column.key}
            label={column.title}
            columnKey={column.key}
            description={column.description}
            onChange={(fieldKey, value) =>
              updateFilterImmediate(fieldKey, value)
            }
          />
        );
      case "select":
        return (
          <SelectFilter
            key={column.key}
            label={column.title}
            columnKey={column.key}
            options={column.options || []}
            description={column.description}
            onChange={(fieldKey, value) =>
              updateFilterImmediate(fieldKey, value)
            }
          />
        );
      case "boolean":
        return (
          <SwitchFilter
            key={column.key}
            label={column.title}
            columnKey={column.key}
            description={column.description}
            value={filters[column.key]?.value}
            onChange={(fieldKey, value) =>
              updateFilterImmediate(fieldKey, value)
            }
          />
        );
      case "number":
        return (
          <RangeFilter
            key={column.key}
            label={column.title}
            columnKey={column.key}
            description={column.description}
            onChange={(fieldKey, value, operator) =>
              debouncedUpdateFilter(fieldKey, { value, operator })
            }
            min={column.min ?? 0}
            max={column.max ?? 100000}
            db={db}
          />
        );
      case "tags":
        return (
          <MultiSelectFilter
            key={column.key}
            label={column.title}
            columnKey={column.key}
            options={column.options || []}
            description={column.description}
            onChange={(fieldKey, value) =>
              updateFilterImmediate(fieldKey, value)
            }
          />
        );
      default:
        return (
          <TextFilter
            key={column.key}
            label={column.title}
            columnKey={column.key}
            icon={column.icon}
            description={column.description}
            onChange={(fieldKey, value, operator) =>
              debouncedUpdateFilter(fieldKey, { value, operator })
            }
            columnFilters={Object.entries(filters).map(([id, val]) => ({
              id,
              value: val,
            }))}
            db={db}
          />
        );
    }
  };

  return (
    <div
      className={cn(
        "grid gap-4 p-4 border rounded-md md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4",
        "ltr:text-left rtl:text-right"
      )}
    >
      {columns
        .filter((col) => col.filterable && visibleColumns.includes(col.key))
        .map((col) => (
          <React.Fragment key={col.key}>{renderFilter(col)}</React.Fragment>
        ))}
    </div>
  );
}
