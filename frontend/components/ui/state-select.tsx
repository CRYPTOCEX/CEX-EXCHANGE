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
import { getStates, type State } from "@/lib/countries";
import { useTranslations } from "next-intl";

interface StateSelectProps {
  value?: string;
  onValueChange: (value: string) => void;
  countryCode?: string;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
}

export function StateSelect({
  value,
  onValueChange,
  countryCode,
  placeholder = "Select state...",
  disabled = false,
  className,
}: StateSelectProps) {
  const t = useTranslations("components");
  const [open, setOpen] = React.useState(false);
  const [states, setStates] = React.useState<State[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [hasStates, setHasStates] = React.useState(false);

  // Load states when country changes
  React.useEffect(() => {
    if (countryCode) {
      setLoading(true);
      getStates(countryCode)
        .then((data) => {
          setStates(data);
          setHasStates(data.length > 0);
        })
        .finally(() => setLoading(false));
    } else {
      setStates([]);
      setHasStates(false);
    }
  }, [countryCode]);

  /* If no country selected, or this country ships no state list, the field is
     free text. That is a DATA answer and not a loading state — `hasStates` is
     only ever set from a resolved fetch — so it stays ahead of everything else. */
  if (!countryCode || !hasStates) {
    return (
      <Input
        value={value || ""}
        onChange={(e) => onValueChange(e.target.value)}
        placeholder={!countryCode ? t("select_country_first") : placeholder}
        disabled={disabled || !countryCode}
        className={className}
      />
    );
  }

  /**
   * The combobox keeps its box, its border and its chevron while re-fetching.
   *
   * The old loading branch returned a Button OUTSIDE the `<Popover>` with no
   * `role="combobox"`, no `aria-expanded` and no `ChevronsUpDown` — so switching
   * country (the only way to reach this state, since `hasStates` is still true
   * from the previous country) made the trailing chevron vanish and come back,
   * and swapped the selected state's name for "Loading states…", a 16-character
   * muted sentence where a 5-to-20-character value had been.
   *
   * Only the value is genuinely unknown, and only while a value exists to be
   * unknown: with nothing selected the `placeholder` is a prop we already hold.
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
          <CommandInput placeholder={`${t("search_state")}…`} />
          <CommandList>
            <CommandEmpty>{t("no_state_found")}</CommandEmpty>
            <CommandGroup className="max-h-64 overflow-auto">
              {states.map((state) => (
                <CommandItem
                  key={state.name}
                  value={state.name}
                  onSelect={() => {
                    onValueChange(state.name);
                    setOpen(false);
                  }}
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4",
                      value === state.name ? "opacity-100" : "opacity-0"
                    )}
                  />
                  {state.name}
                  {state.code && (
                    <span className="text-muted-foreground text-xs ml-2">
                      ({state.code})
                    </span>
                  )}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
