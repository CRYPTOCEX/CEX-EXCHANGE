"use client";

import React, { useState, useMemo, useCallback, useRef } from "react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverTrigger,
  PopoverContent,
} from "@/components/ui/popover";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Loader2, Search, ChevronDown, X } from "lucide-react";
import { useFetchOptions } from "@/hooks/use-fetch-options";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";

interface Option {
  value: string | number | boolean;
  label: string;
  disabled?: boolean;
}

interface ApiEndpoint {
  url: string;
  method?: string;
  queryParams?: Record<string, any>;
  body?: Record<string, any>;
}

interface MultiSelectFormControlProps {
  field: any; // from react-hook-form; should be an array
  error?: string;
  placeholder: string;
  options?: Option[]; // fallback for static options
  apiEndpoint?: ApiEndpoint;
  title?: string;
  description?: string;
}

/**
 * MultiSelectFormControl:
 *  - Uses inline popover with full-width trigger
 *  - Ensures field.value is always an array
 *  - Shows selected items as badges
 */
export function MultiSelectFormControl({
  field,
  error,
  placeholder,
  options: staticOptions,
  apiEndpoint,
  title,
  description,
}: MultiSelectFormControlProps) {
  const t = useTranslations("common");
  const tComponentsBlocks = useTranslations("components_blocks");
  const {
    options: fetchedOptions,
    loading,
    error: fetchErr,
  } = useFetchOptions(apiEndpoint);
  const options: Option[] = apiEndpoint ? fetchedOptions : staticOptions || [];

  // Ensure field.value is an array (if undefined, default to an empty array)
  const fieldValue: any[] = Array.isArray(field.value) ? field.value : [];
  const selectedValues: string[] = fieldValue.map((obj) => String(obj.id));

  const [open, setOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  const popoverRef = useRef<HTMLDivElement>(null);

  const toggleItem = useCallback(
    (value: string, checked: boolean) => {
      const isSelected = selectedValues.includes(value);
      if (checked === isSelected) return;

      let newValues;
      if (checked) {
        const foundOption = options.find((opt) => opt.value === value);
        newValues = [
          ...fieldValue,
          { id: value, name: foundOption?.label || "" },
        ];
      } else {
        newValues = fieldValue.filter((obj) => String(obj.id) !== value);
      }
      field.onChange(newValues);
    },
    [field, options, selectedValues, fieldValue]
  );

  const removeItem = useCallback(
    (value: string, e: React.MouseEvent) => {
      e.stopPropagation();
      const newValues = fieldValue.filter((obj) => String(obj.id) !== value);
      field.onChange(newValues);
    },
    [field, fieldValue]
  );

  const displayContent = useMemo(() => {
    if (!fieldValue || fieldValue.length === 0) {
      return (
        <span className="text-muted-foreground font-normal">{placeholder}</span>
      );
    }

    // Show badges for selected items (max 2 visible, rest as count)
    if (fieldValue.length <= 2) {
      return (
        <div className="flex flex-wrap gap-1">
          {fieldValue.map((obj) => (
            <Badge
              key={obj.id}
              variant="secondary"
              className="text-xs font-normal px-2 py-0.5"
            >
              {obj.name}
              <span
                role="button"
                tabIndex={0}
                onClick={(e) => removeItem(obj.id, e)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    removeItem(obj.id, e as any);
                  }
                }}
                className="ml-1 hover:text-destructive focus:outline-none cursor-pointer"
              >
                <X className="h-3 w-3" />
              </span>
            </Badge>
          ))}
        </div>
      );
    }

    return (
      <div className="flex flex-wrap gap-1 items-center">
        {fieldValue.slice(0, 2).map((obj) => (
          <Badge
            key={obj.id}
            variant="secondary"
            className="text-xs font-normal px-2 py-0.5"
          >
            {obj.name}
            <span
              role="button"
              tabIndex={0}
              onClick={(e) => removeItem(obj.id, e)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  removeItem(obj.id, e as any);
                }
              }}
              className="ml-1 hover:text-destructive focus:outline-none cursor-pointer"
            >
              <X className="h-3 w-3" />
            </span>
          </Badge>
        ))}
        <Badge variant="outline" className="text-xs font-normal px-2 py-0.5">
          +{fieldValue.length - 2} more
        </Badge>
      </div>
    );
  }, [fieldValue, placeholder, removeItem]);

  const filteredOptions = useMemo(() => {
    if (!searchTerm) return options;
    const lower = searchTerm.toLowerCase();
    return options.filter((opt) => opt.label.toLowerCase().includes(lower));
  }, [options, searchTerm]);

  // Count selected items
  const selectedCount = fieldValue.length;

  return (
    <div className="flex flex-col w-full">
      {title && <label className="mb-1 text-sm font-medium">{title}</label>}
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className={cn(
              "w-full h-auto min-h-9 justify-between px-3 py-2",
              error && "border-destructive focus:ring-destructive",
              !fieldValue.length && "text-muted-foreground"
            )}
          >
            <div className="flex-1 text-left">{displayContent}</div>
            <ChevronDown
              className={cn(
                "ml-2 h-4 w-4 shrink-0 opacity-50 transition-transform duration-200",
                open && "rotate-180"
              )}
            />
          </Button>
        </PopoverTrigger>
        <PopoverContent
          ref={popoverRef}
          side="bottom"
          align="start"
          sideOffset={4}
          onInteractOutside={(e) => {
            const target = e?.detail?.originalEvent?.target as Node | null;
            if (
              popoverRef.current &&
              target &&
              popoverRef.current.contains(target)
            ) {
              e.preventDefault();
            }
          }}
          className="z-100 w-[var(--radix-popover-trigger-width)] p-0 pointer-events-auto max-h-80 overflow-hidden border rounded-md shadow-lg bg-popover text-popover-foreground"
          data-vaul-no-drag
        >
          {loading ? (
            <div className="flex items-center justify-center p-4">
              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground mr-2" />
              <span className="text-sm text-muted-foreground">
                {tComponentsBlocks("loading_options")}...
              </span>
            </div>
          ) : fetchErr ? (
            <div className="p-3 text-sm text-destructive bg-destructive/10">
              {"Error"}: {fetchErr}
            </div>
          ) : (
            <>
              {/* Search input */}
              <div className="p-2 border-b bg-muted/30">
                <Input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder={t("search")}
                  icon={Search}
                  className="h-9"
                  removeWrapper
                />
              </div>

              {/* Selected count indicator */}
              {selectedCount > 0 && (
                <div className="px-3 py-2 border-b bg-muted/20 flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">
                    {selectedCount} {t("selected")}
                  </span>
                  <button
                    type="button"
                    onClick={() => field.onChange([])}
                    className="text-xs text-muted-foreground hover:text-destructive transition-colors"
                  >
                    {t("clear_all")}
                  </button>
                </div>
              )}

              {/* Options list */}
              <div
                className="max-h-64 overflow-y-auto p-1"
                style={{
                  maxHeight: "16rem",
                  overflowY: "auto",
                  scrollbarWidth: "thin",
                }}
                onWheel={(e) => e.stopPropagation()}
              >
                {filteredOptions.length === 0 ? (
                  <div className="p-4 text-sm text-muted-foreground text-center">
                    {tComponentsBlocks("no_options_found")}
                  </div>
                ) : (
                  filteredOptions.map((opt) => {
                    const optValue = String(opt.value);
                    const isSelected = selectedValues.includes(optValue);
                    return (
                      <label
                        key={optValue}
                        htmlFor={`checkbox-${optValue}`}
                        className={cn(
                          "flex items-center gap-3 px-3 py-2 text-sm rounded-md cursor-pointer",
                          "transition-colors duration-150 hover:bg-accent",
                          isSelected && "bg-accent/50",
                          opt.disabled && "pointer-events-none opacity-50"
                        )}
                      >
                        <Checkbox
                          id={`checkbox-${optValue}`}
                          checked={isSelected}
                          disabled={opt.disabled}
                          onCheckedChange={(checked) =>
                            toggleItem(optValue, !!checked)
                          }
                          color="default"
                          size="sm"
                          radius="sm"
                        />
                        <span className="flex-1">{opt.label}</span>
                        {isSelected && (
                          <span className="text-xs text-muted-foreground">
                            {t("selected")}
                          </span>
                        )}
                      </label>
                    );
                  })
                )}
              </div>
            </>
          )}
        </PopoverContent>
      </Popover>
      {description && (
        <p className="mt-1 text-xs text-muted-foreground">{description}</p>
      )}
      {error && (
        <p className="text-destructive text-xs mt-1 leading-tight">{error}</p>
      )}
    </div>
  );
}
