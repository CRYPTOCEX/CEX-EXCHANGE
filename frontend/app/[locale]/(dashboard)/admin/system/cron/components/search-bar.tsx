"use client";

import { useCronStore } from "@/store/cron";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, X } from "lucide-react";
import { useState, useEffect } from "react";
import { useDebounce } from "@/hooks/use-debounce";

export function SearchBar() {
  const { setSearchQuery } = useCronStore();
  const [search, setSearch] = useState("");
  const [debouncedSearch] = useDebounce(search, 300);

  useEffect(() => {
    setSearchQuery(debouncedSearch);
  }, [debouncedSearch, setSearchQuery]);

  return (
    <div className="relative w-full sm:max-w-sm">
      <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
      <Input
        placeholder="Search cron jobs..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="pl-8 pr-8 text-sm"
      />
      {search && (
        <Button
          variant="ghost"
          size="icon"
          className="absolute right-1 top-1 h-6 w-6"
          onClick={() => setSearch("")}
        >
          <X className="h-3 w-3" />
        </Button>
      )}
    </div>
  );
}
