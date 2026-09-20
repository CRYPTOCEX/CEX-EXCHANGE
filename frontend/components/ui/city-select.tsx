"use client";

import * as React from "react";
import { Check, ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { SkeletonText } from "@/components/ui/skeleton";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Input } from "@/components/ui/input";
import { getCities } from "@/lib/countries";
import { useTranslations } from "next-intl";

interface CitySelectProps {
  value?: string;
  onValueChange: (value: string) => void;
  countryCode?: string;
  stateName?: string;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
}

export function CitySelect({
  value,
  onValueChange,
  countryCode,
  stateName,
  placeholder = "Select city...",
  disabled = false,
  className,
}: CitySelectProps) {
  const t = useTranslations("components");
  const [open, setOpen] = React.useState(false);
  const [cities, setCities] = React.useState<string[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [hasCities, setHasCities] = React.useState(false);

  // Load cities when country or state changes
  React.useEffect(() => {
    if (countryCode && stateName) {
      setLoading(true);
      getCities(countryCode, stateName)
        .then((data) => {
          setCities(data);
          setHasCities(data.length > 0);
        })
        .finally(() => setLoading(false));
    } else {
      setCities([]);
      setHasCities(false);
    }
  }, [countryCode, stateName]);

  /* Free text when there is no state, or no city list for it. A DATA answer —
     `hasCities` only ever comes from a resolved fetch — not a loading state. */
  if (!stateName || !hasCities) {
    return (
      <Input
        value={value || ""}
        onChange={(e) => onValueChange(e.target.value)}
        placeholder={!stateName ? t("select_state_first") : placeholder}
        disabled={disabled || !stateName}
        className={className}
      />
    );
  }

  /**
   * The combobox keeps its box, its border and its chevron while re-fetching.
   *
   * The old loading branch returned a Button OUTSIDE the `<Popover>` with no
   * `role="combobox"`, no `aria-expanded` and no `ChevronsUpDown` — so changing
   * state (the only way here, since `hasCities` is still true from the previous
   * one) dropped the trailing chevron for the length of the fetch and put
   * "Loading cities…" where the selected city had been.
   */
  const pendingValue = loading && Boolean(value);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          aria-busy={loading || undefined}
          disabled={disabled || loading}
          className={cn("w-full justify-between font-normal", className)}
        >
          {pendingValue ? (
            <span>
              <SkeletonText chars={12} />
            </span>
          ) : value ? (
            <span>{value}</span>
          ) : (
            <span className="text-muted-foreground">{placeholder}</span>
          )}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-full p-0" align="start">
        <Command>
          <CommandInput placeholder={`${t("search_city")}…`} />
          <CommandList>
            <CommandEmpty>{t("no_city_found")}</CommandEmpty>
            <CommandGroup className="max-h-64 overflow-auto">
              {cities.map((city) => (
                <CommandItem
                  key={city}
                  value={city}
                  onSelect={() => {
                    onValueChange(city);
                    setOpen(false);
                  }}
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4",
                      value === city ? "opacity-100" : "opacity-0"
                    )}
                  />
                  {city}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
