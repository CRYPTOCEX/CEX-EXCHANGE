"use client";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, ExternalLink } from "lucide-react";
import { Link } from "@/i18n/routing";
import { useTranslations } from "next-intl";

interface TopBarProps {
  extension: {
    title: string;
    status: boolean;
    link?: string;
  };
}

export function TopBar({ extension }: TopBarProps) {
  const t = useTranslations("dashboard");
  return (
    <div className="flex justify-between items-center mb-8">
      <div className="flex items-center space-x-4">
        <Link href="/admin/system/extension">
          <Button variant="outline" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <h1 className="text-3xl font-bold">{extension.title}</h1>
        <Badge
          color={extension.status ? "success" : "secondary"}
          variant="soft"
        >
          {extension.status ? "Active" : "Inactive"}
        </Badge>
      </div>
      {extension.link && (
        <a href={extension.link} target="_blank" rel="noopener noreferrer">
          <Button variant="outline">
            {t("learn_more")}
            <ExternalLink className="ml-2 h-4 w-4" />
          </Button>
        </a>
      )}
    </div>
  );
}
