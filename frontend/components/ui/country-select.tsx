"use client";

import * as React from "react";
import { Check, ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { SkeletonBlock, SkeletonText } from "@/components/ui/skeleton";
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

  /**
   * A CONTROL KEEPS ITS BOX. Only the selected value waits.
   * ==========================================================================
   *
   * This used to return a different Button entirely while the ~250KB country
   * index loaded: no `role="combobox"`, no `aria-expanded`, outside the
   * `<Popover>` altogether, and — the visible part — no `ChevronsUpDown` on the
   * trailing edge. So the affordance that says "this opens a list" was absent
   * for the whole of the fetch and then appeared, and the label went from
   * "Loading countries…" to a flag plus a name plus a dial code, which is a
   * different string at a different width in a different colour.
   *
   * It also meant a screen reader met a plain disabled button where a combobox
   * was about to be, and an assistive-tech user tabbing through a signup form
   * during the fetch had no way to know the field was a select at all.
   *
   * One tree now. The button, its border, its chevron and its role are all
   * knowable before the index lands; `disabled` absorbs the wait, so clicking
   * still does nothing, exactly as before.
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
          ) : pendingValue ? (
            /* A `value` is set but the index that turns it into a name has not
               arrived, so we know THREE things are coming — flag, name, dial
               code — and can reserve all three in the row they will occupy. The
               flag is the one part with no text metrics (a 20x15 `next/image`),
               so it is the one part sized by hand, with the real element's own
               numbers. */
            <span className="flex items-center gap-2">
              <SkeletonBlock className="h-[15px] w-5 rounded-sm" />
              <SkeletonText chars={11} />
              <span className="text-muted-foreground text-xs">
                (<SkeletonText chars={3} />)
              </span>
            </span>
          ) : (
            /* No value selected: the placeholder is a prop we already have, so
               it renders immediately in both states rather than being replaced
               by a spinner and a different sentence. */
            <span className="text-muted-foreground">{placeholder}</span>
          )}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-full p-0" align="start">
        <Command>
          <CommandInput placeholder={`${t("search_country")}…`} />
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
