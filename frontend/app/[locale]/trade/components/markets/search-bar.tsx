"use client";

import { Search } from "lucide-react";

interface SearchBarProps {
  placeholder: string;
  value: string;
  onChange: (value: string) => void;
}

export function SearchBar({ placeholder, value, onChange }: SearchBarProps) {
  return (
    <div className="p-1.5 border-b border-zinc-200 dark:border-zinc-800">
      <div className="relative">
        <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 h-3 w-3 text-muted-foreground dark:text-zinc-500" />
        <input
          type="text"
          placeholder={placeholder}
          className="w-full bg-muted dark:bg-zinc-900 border border-border dark:border-zinc-800 rounded-sm text-xs pl-7 pr-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-primary dark:focus:ring-emerald-500"
          value={value}
          onChange={(e) => onChange(e.target.value)}
        />
      </div>
    </div>
  );
}
