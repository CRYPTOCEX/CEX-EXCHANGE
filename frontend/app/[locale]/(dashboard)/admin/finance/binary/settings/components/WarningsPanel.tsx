"use client";

import React, { useState } from "react";
import {
  AlertTriangle,
  AlertCircle,
  Info,
  ChevronDown,
  ChevronUp,
  Lightbulb,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

import type { Warning } from "../types";
import { getWarningLevelColor } from "../settings";

interface WarningsPanelProps {
  warnings: Warning[];
}

export function WarningsPanel({ warnings }: WarningsPanelProps) {
  const [isOpen, setIsOpen] = useState(true);

  const dangerCount = warnings.filter((w) => w.level === "danger").length;
  const warningCount = warnings.filter((w) => w.level === "warning").length;
  const infoCount = warnings.filter((w) => w.level === "info").length;

  const getIcon = (level: Warning["level"]) => {
    switch (level) {
      case "danger":
        return <AlertCircle className="h-4 w-4" />;
      case "warning":
        return <AlertTriangle className="h-4 w-4" />;
      case "info":
        return <Info className="h-4 w-4" />;
    }
  };

  const getLevelLabel = (level: Warning["level"]) => {
    switch (level) {
      case "danger":
        return "Critical";
      case "warning":
        return "Warning";
      case "info":
        return "Info";
    }
  };

  return (
    <Card className={`border-2 ${dangerCount > 0 ? "border-red-500/50" : warningCount > 0 ? "border-yellow-500/50" : "border-blue-500/50"}`}>
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CollapsibleTrigger asChild>
          <div className="flex items-center justify-between p-4 cursor-pointer hover:bg-muted/50 transition-colors">
            <div className="flex items-center gap-3">
              {dangerCount > 0 ? (
                <AlertCircle className="h-5 w-5 text-red-500" />
              ) : warningCount > 0 ? (
                <AlertTriangle className="h-5 w-5 text-yellow-500" />
              ) : (
                <Info className="h-5 w-5 text-blue-500" />
              )}
              <div>
                <h3 className="font-semibold">Configuration Warnings</h3>
                <p className="text-sm text-muted-foreground">
                  {warnings.length} issue{warnings.length !== 1 ? "s" : ""} detected
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {dangerCount > 0 && (
                <Badge variant="destructive">{dangerCount} Critical</Badge>
              )}
              {warningCount > 0 && (
                <Badge variant="outline" className="text-yellow-500 border-yellow-500">
                  {warningCount} Warning
                </Badge>
              )}
              {infoCount > 0 && (
                <Badge variant="outline" className="text-blue-500 border-blue-500">
                  {infoCount} Info
                </Badge>
              )}
              {isOpen ? (
                <ChevronUp className="h-4 w-4 text-muted-foreground" />
              ) : (
                <ChevronDown className="h-4 w-4 text-muted-foreground" />
              )}
            </div>
          </div>
        </CollapsibleTrigger>

        <CollapsibleContent>
          <div className="border-t px-4 pb-4 space-y-3">
            {warnings.map((warning, index) => (
              <div
                key={index}
                className={`flex gap-3 p-3 rounded-lg border ${getWarningLevelColor(warning.level)}`}
              >
                <div className="flex-shrink-0 mt-0.5">
                  {getIcon(warning.level)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-medium text-sm">
                      {warning.category}
                    </span>
                    <Badge
                      variant="outline"
                      className={`text-xs ${getWarningLevelColor(warning.level)}`}
                    >
                      {getLevelLabel(warning.level)}
                    </Badge>
                  </div>
                  <p className="text-sm">{warning.message}</p>
                  {warning.suggestion && (
                    <div className="flex items-start gap-2 mt-2 text-sm text-muted-foreground">
                      <Lightbulb className="h-4 w-4 flex-shrink-0 mt-0.5" />
                      <span>{warning.suggestion}</span>
                    </div>
                  )}
                  {warning.field && (
                    <p className="text-xs text-muted-foreground mt-1">
                      Field: {warning.field}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
}
