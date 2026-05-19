import React from "react";
import { TableCell } from "@/components/ui/table";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { BaseColumnProps } from "./base-column";

interface MetaConfig {
  icon?: React.ComponentType<React.SVGProps<SVGSVGElement>>;
  render?: (value: any) => React.ReactNode;
  key: string;
}

export const CompoundColumn: React.FC<BaseColumnProps> = ({ column, row }) => {
  const config = column.render?.config;
  if (!config) return null;

  return (
    <TableCell>
      <div className="flex items-center gap-4">
        {config.image && (
          <Avatar>
            <AvatarImage src={row[config.image.key]} />
            <AvatarFallback>{config.image.fallback}</AvatarFallback>
          </Avatar>
        )}
        <div className="flex flex-col">
          {config.primary && (
            <div className="font-medium">
              {Array.isArray(config.primary.key)
                ? config.primary.key.map((k: string) => row[k]).join(" ")
                : row[config.primary.key]}
            </div>
          )}
          {config.secondary && (
            <div className="text-sm text-muted-foreground">
              {row[config.secondary.key]}
            </div>
          )}
          {config.metadata && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              {config.metadata.map((meta: MetaConfig, index: number) => (
                <div key={index} className="flex items-center gap-1">
                  {meta.icon && <meta.icon className="h-3 w-3" />}
                  {meta.render ? meta.render(row[meta.key]) : row[meta.key]}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </TableCell>
  );
};
