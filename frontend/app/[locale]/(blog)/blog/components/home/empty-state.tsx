"use client";

import type React from "react";
import { Link } from "@/i18n/routing";
import { ChevronRight, Inbox } from "lucide-react";
import { Button } from "@/components/ui/button";

interface EmptyStateProps {
  title: string;
  description: string;
  icon?: React.ElementType;
  actionText?: string;
  actionLink?: string;
}

export function EmptyState({
  title,
  description,
  icon: Icon = Inbox,
  actionText,
  actionLink,
}: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <div className="flex h-20 w-20 items-center justify-center rounded-full bg-indigo-100 dark:bg-indigo-950/50 mb-6">
        <Icon className="h-10 w-10 text-indigo-600 dark:text-indigo-400" />
      </div>
      <h3 className="text-xl font-medium text-zinc-900 dark:text-zinc-100 mb-2">
        {title}
      </h3>
      <p className="text-zinc-500 dark:text-zinc-400 max-w-md mb-6">
        {description}
      </p>
      {actionText && actionLink && (
        <Link href={actionLink} className="rounded-full">
          <Button variant="outline">
            {actionText} <ChevronRight className="ml-1 h-4 w-4" />
          </Button>
        </Link>
      )}
    </div>
  );
}
