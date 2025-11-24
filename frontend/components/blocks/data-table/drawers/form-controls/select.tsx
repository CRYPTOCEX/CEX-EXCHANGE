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

interface ApiEndpoint {
  url: string;
  method?: string;
  queryParams?: Record<string, any>;
  body?: Record<string, any>;
}

export interface Option {
  value: string;
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
  // Optionally, you can add a prop to toggle search functionality
  searchable?: boolean;
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
}: SelectFormControlProps) {
  const t = useTranslations(
    "components/blocks/data-table/drawers/form-controls/select"
  );
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
  const value = typeof field.value === "string" ? field.value : "";

  // 5. Highlight the select if there's a validation error.
  const triggerErrorClass = error ? "border border-red-500" : "";

  // 6. Handle loading & error states.
  if (loading) {
    return (
      <div className="flex items-center space-x-2">
        <Loader2 className="h-4 w-4 animate-spin" />
        <span>{t("loading_options")}.</span>
      </div>
    );
  }
  if (fetchError) {
    return (
      <div className="text-red-500">
        {t("error_loading_options")}
        {fetchError}
      </div>
    );
  }

  return (
    <div className="flex flex-col w-full">
      <Select
        disabled={isDisabled}
        value={value}
        onValueChange={field.onChange}
      >
        <SelectTrigger className={triggerErrorClass}>
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent search={searchable} className="z-[100] max-h-80" data-vaul-no-drag>
          {options.length === 0 ? (
            <div className="px-2 py-1 text-sm text-muted-foreground">
              {t("no_options_found")}.
            </div>
          ) : (
            options.map((o) => (
              <SelectItem
                key={o.value}
                value={o.value}
                disabled={o.disabled}
                className="rounded-md cursor-pointer transition-colors duration-150 hover:bg-zinc-100 dark:hover:bg-zinc-700"
              >
                {o.label}
              </SelectItem>
            ))
          )}
        </SelectContent>
      </Select>
      {error && (
        <p className="text-red-500 text-sm mt-1 leading-tight">{error}</p>
      )}
    </div>
  );
}
