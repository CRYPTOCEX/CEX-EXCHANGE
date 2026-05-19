"use client";

import * as React from "react";
import { Check, ChevronsUpDown, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
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

  // If no state selected or state has no city data, show input
  if (!stateName || !hasCities) {
    return (
      <Input
        value={value || ""}
        onChange={(e) => onValueChange(e.target.value)}
        placeholder={!stateName ? "Select state first" : placeholder}
        disabled={disabled || !stateName}
        className={className}
      />
    );
  }

  // Show loading state
  if (loading) {
    return (
      <Button
        variant="outline"
        disabled
        className={cn("w-full justify-between font-normal", className)}
      >
        <span className="flex items-center gap-2 text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          {t("loading_cities_ellipsis")}
        </span>
      </Button>
    );
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          disabled={disabled}
          className={cn("w-full justify-between font-normal", className)}
        >
          {value ? (
            <span>{value}</span>
          ) : (
            <span className="text-muted-foreground">{placeholder}</span>
          )}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-full p-0" align="start">
        <Command>
          <CommandInput placeholder={t("search_city_ellipsis")} />
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
