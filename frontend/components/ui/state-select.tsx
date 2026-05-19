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

  // If no country selected or country has no state data, show input
  if (!countryCode || !hasStates) {
    return (
      <Input
        value={value || ""}
        onChange={(e) => onValueChange(e.target.value)}
        placeholder={!countryCode ? "Select country first" : placeholder}
        disabled={disabled || !countryCode}
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
          {t("loading_states_ellipsis")}
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
          <CommandInput placeholder={t("search_state_ellipsis")} />
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
