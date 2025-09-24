import React, { useState, useMemo, useCallback, useRef } from "react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverTrigger,
  PopoverContent,
} from "@/components/ui/popover";

import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Loader2, Search } from "lucide-react";
import { useFetchOptions } from "@/hooks/use-fetch-options";
import { useTranslations } from "next-intl";

interface Option {
  value: string;
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
}

/**
 * MultiSelectFormControl:
 *  - Uses inline popover.
 *  - Ensures field.value is always an array.
 */
export function MultiSelectFormControl({
  field,
  error,
  placeholder,
  options: staticOptions,
  apiEndpoint,
}: MultiSelectFormControlProps) {
  const t = useTranslations(
    "components/blocks/data-table/drawers/form-controls/multi-select-form-control"
  );
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

  const displayText = useMemo(() => {
    if (!fieldValue || fieldValue.length === 0) {
      return placeholder;
    }
    const names = fieldValue.map((obj) => obj.name);
    if (names.length <= 2) return names.join(", ");
    return `${names[0]}, ${names[1]}, +${names.length - 2} more`;
  }, [fieldValue, placeholder]);

  const filteredOptions = useMemo(() => {
    if (!searchTerm) return options;
    const lower = searchTerm.toLowerCase();
    return options.filter((opt) => opt.label.toLowerCase().includes(lower));
  }, [options, searchTerm]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" className="w-full justify-between" size="md">
          {displayText}
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
        className="z-[100] w-[var(--radix-popover-trigger-width)] p-0 pointer-events-auto max-h-80 overflow-hidden border rounded-md shadow-md bg-popover text-popover-foreground"
        data-vaul-no-drag
      >
        {loading ? (
          <div className="flex items-center space-x-2 p-2">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span>{t("loading_options")}.</span>
          </div>
        ) : fetchErr ? (
          <div className="p-2 text-red-500">
            {t("error")}
            {fetchErr}
          </div>
        ) : (
          <>
            <div className="p-2 border-b">
              <Input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search..."
                icon={Search}
              />
            </div>
            <div 
              className="max-h-64 overflow-y-auto p-1" 
              style={{ 
                maxHeight: '16rem',
                overflowY: 'auto',
                scrollbarWidth: 'thin'
              }}
              onWheel={(e) => e.stopPropagation()}
            >
              {filteredOptions.length === 0 ? (
                <div className="p-2 text-sm text-muted-foreground">
                  {t("no_options_found")}.
                </div>
              ) : (
                filteredOptions.map((opt) => {
                  const isSelected = selectedValues.includes(opt.value);
                  return (
                    <label
                      key={opt.value}
                      htmlFor={`checkbox-${opt.value}`}
                      className={[
                        "flex items-center gap-2 px-2 py-1.5 text-sm rounded-md cursor-pointer",
                        "transition-colors duration-150 hover:bg-zinc-100 dark:hover:bg-zinc-700",
                        opt.disabled ? "pointer-events-none opacity-50" : "",
                      ].join(" ")}
                    >
                      <Checkbox
                        id={`checkbox-${opt.value}`}
                        checked={isSelected}
                        disabled={opt.disabled}
                        onCheckedChange={(checked) =>
                          toggleItem(opt.value, !!checked)
                        }
                        color="default"
                        size="sm"
                        radius="sm"
                      />
                      <span>{opt.label}</span>
                    </label>
                  );
                })
              )}
            </div>
          </>
        )}
      </PopoverContent>
    </Popover>
  );
}
