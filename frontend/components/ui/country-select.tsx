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
import {
  loadCountriesIndex,
  formatPhoneCode,
  type Country,
} from "@/lib/countries";
import Image from "next/image";
import { useTranslations } from "next-intl";

interface CountrySelectProps {
  value?: string;
  onValueChange: (value: string, phoneCode?: string) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
}

export function CountrySelect({
  value,
  onValueChange,
  placeholder = "Select country...",
  disabled = false,
  className,
}: CountrySelectProps) {
  const t = useTranslations("components");
  const [open, setOpen] = React.useState(false);
  const [countries, setCountries] = React.useState<Country[]>([]);
  const [loading, setLoading] = React.useState(true);

  // Load countries on mount
  React.useEffect(() => {
    loadCountriesIndex()
      .then((data) => setCountries(data))
      .finally(() => setLoading(false));
  }, []);

  const selectedCountry = value
    ? countries.find((c) => c.iso2 === value)
    : null;

  if (loading) {
    return (
      <Button
        variant="outline"
        disabled
        className={cn("w-full justify-between font-normal", className)}
      >
        <span className="flex items-center gap-2 text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          {t("loading_countries_ellipsis")}
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
          {selectedCountry ? (
            <span className="flex items-center gap-2">
              <Image
                src={`/img/flag/${selectedCountry.iso2.toLowerCase()}.webp`}
                alt={selectedCountry.name}
                width={20}
                height={15}
                className="rounded-sm object-cover"
              />
              {selectedCountry.name}
              <span className="text-muted-foreground text-xs">
                ({formatPhoneCode(selectedCountry.phonecode)})
              </span>
            </span>
          ) : (
            <span className="text-muted-foreground">{placeholder}</span>
          )}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-full p-0" align="start">
        <Command>
          <CommandInput placeholder={t("search_country_ellipsis")} />
          <CommandList>
            <CommandEmpty>{t("no_country_found")}</CommandEmpty>
            <CommandGroup className="max-h-64 overflow-auto">
              {countries.map((country) => (
                <CommandItem
                  key={country.iso2}
                  value={country.name}
                  onSelect={() => {
                    onValueChange(country.iso2, country.phonecode);
                    setOpen(false);
                  }}
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4",
                      value === country.iso2 ? "opacity-100" : "opacity-0"
                    )}
                  />
                  <Image
                    src={`/img/flag/${country.iso2.toLowerCase()}.webp`}
                    alt={country.name}
                    width={20}
                    height={15}
                    className="mr-2 rounded-sm object-cover"
                  />
                  <span className="flex-1">{country.name}</span>
                  <span className="text-muted-foreground text-xs ml-2">
                    {formatPhoneCode(country.phonecode)}
                  </span>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
