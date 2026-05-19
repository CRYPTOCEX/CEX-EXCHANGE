"use client";

import React from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2 } from "lucide-react";
import { useFetchOptions } from "@/hooks/use-fetch-options";
import { useWatch } from "react-hook-form";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";

interface ApiEndpoint {
  url: string;
  method?: string;
  queryParams?: Record<string, any>;
  body?: Record<string, any>;
}

export interface Option {
  value: string | number | boolean;
  label: string;
  disabled?: boolean;
}

export interface DynamicSelectConfig {
  refreshOn: string; // Field name to watch for dynamic selects
  endpointBuilder: (dependentValue: any) => ApiEndpoint | null;
  disableWhenEmpty?: boolean;
}

export interface SelectFormControlProps {
  field: any; // from react-hook-form
  error?: string;
  placeholder: string;
  apiEndpoint?:
    | ApiEndpoint
    | ((values: Record<string, any>) => ApiEndpoint | null);
  options?: Option[];
  dynamicSelect?: DynamicSelectConfig;
  control: any; // react-hook-form control
  searchable?: boolean;
  title?: string;
  description?: string;
}

export function SelectFormControl({
  field,
  error,
  placeholder,
  options: staticOptions,
  apiEndpoint,
  dynamicSelect,
  control,
  searchable = true,
  title,
  description,
}: SelectFormControlProps) {
  const t = useTranslations("components_blocks");
  // 1. Determine the effective endpoint (dynamic or static).
  let effectiveEndpoint: ApiEndpoint | null = null;

  if (dynamicSelect) {
    const depValue = useWatch({ control, name: dynamicSelect.refreshOn });
    effectiveEndpoint = dynamicSelect.endpointBuilder(depValue);
  } else if (typeof apiEndpoint === "function") {
    const formValues = useWatch({ control });
    effectiveEndpoint = apiEndpoint(formValues);
  } else {
    effectiveEndpoint = apiEndpoint || null;
  }

  // 2. Disable the select if dynamicSelect is active but the dependent field is empty.
  const depValue = dynamicSelect
    ? useWatch({ control, name: dynamicSelect.refreshOn })
    : null;
  const isDisabled =
    dynamicSelect && dynamicSelect.disableWhenEmpty && !depValue;

  // 3. Fetch options or fall back to static.
  const {
    options: fetchedOptions,
    loading,
    error: fetchError,
  } = useFetchOptions(effectiveEndpoint) as {
    options: Option[];
    loading: boolean;
    error?: string;
  };
  const options = effectiveEndpoint ? fetchedOptions : staticOptions || [];

  // 4. The current value from react-hook-form (ensure it's a string).
  // Convert numbers to strings for proper Select comparison
  const value = field.value != null ? String(field.value) : "";

  // 5. Handle loading & error states.
  if (loading) {
    return (
      <div className="flex flex-col w-full">
        {title && (
          <label className="mb-1 text-sm font-medium">{title}</label>
        )}
        <div className="flex items-center justify-center h-9 w-full rounded-md border border-input bg-background px-3">
          <Loader2 className="h-4 w-4 animate-spin text-muted-foreground mr-2" />
          <span className="text-sm text-muted-foreground">
            {t("loading_options")}...
          </span>
        </div>
        {description && (
          <p className="mt-1 text-xs text-muted-foreground">{description}</p>
        )}
      </div>
    );
  }
  if (fetchError) {
    return (
      <div className="flex flex-col w-full">
        {title && (
          <label className="mb-1 text-sm font-medium">{title}</label>
        )}
        <div className="flex items-center h-9 w-full rounded-md border border-destructive/50 bg-destructive/10 px-3">
          <span className="text-sm text-destructive">
            {t("error_loading_options")}: {fetchError}
          </span>
        </div>
        {description && (
          <p className="mt-1 text-xs text-muted-foreground">{description}</p>
        )}
      </div>
    );
  }

  // Only show search when there are more than 6 options
  const shouldShowSearch = searchable && options.length > 6;

  return (
    <div className="flex flex-col w-full">
      <Select
        disabled={isDisabled}
        value={value}
        onValueChange={field.onChange}
      >
        <SelectTrigger
          title={title}
          description={description}
          error={!!error}
          errorMessage={error}
          className={cn("w-full h-9")}
        >
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent
          search={shouldShowSearch}
          className="z-100 max-h-80"
          data-vaul-no-drag
        >
          {options.length === 0 ? (
            <div className="px-3 py-2 text-sm text-muted-foreground text-center">
              {t("no_options_found")}
            </div>
          ) : (
            options.map((o) => (
              <SelectItem
                key={String(o.value)}
                value={String(o.value)}
                disabled={o.disabled}
                className="rounded-md cursor-pointer transition-colors duration-150 hover:bg-accent"
              >
                {o.label}
              </SelectItem>
            ))
          )}
        </SelectContent>
      </Select>
    </div>
  );
}
