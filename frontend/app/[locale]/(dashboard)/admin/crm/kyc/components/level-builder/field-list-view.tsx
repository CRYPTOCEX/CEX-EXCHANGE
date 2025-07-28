"use client";

import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  TooltipProvider,
  Tooltip,
  TooltipTrigger,
  TooltipContent,
} from "@/components/ui/tooltip";
import {
  Type,
  AlignLeft,
  List,
  CheckSquare,
  Calendar,
  Upload,
  Hash,
  Mail,
  Phone,
  MapPin,
  Edit,
  Copy,
  Trash2,
  GripVertical,
  ArrowDownUp,
  CreditCard,
} from "lucide-react";

// Add this helper function to get the appropriate color for each field type
const getFieldTypeColor = (type: string): string => {
  switch (type) {
    case "TEXT":
    case "TEXTAREA":
    case "NUMBER":
      return "blue";
    case "SELECT":
    case "MULTISELECT":
    case "CHECKBOX":
    case "RADIO":
      return "purple";
    case "DATE":
    case "FILE":
      return "amber";
    case "EMAIL":
    case "PHONE":
    case "ADDRESS":
      return "emerald";
    default:
      return "gray";
  }
};
interface FieldListViewProps {
  filteredFields: KycField[];
  selectedField: KycField | null;
  setSelectedField: (field: KycField | null) => void;
  handleDuplicateField: (fieldId: string) => void;
  handleRemoveField: (fieldId: string) => void;
  handleReorderFields: (sourceIndex: number, destinationIndex: number) => void;
}
export function FieldListView({
  filteredFields,
  selectedField,
  setSelectedField,
  handleDuplicateField,
  handleRemoveField,
  handleReorderFields,
}: FieldListViewProps) {
  // State to track dragging
  const [draggedIndex, setDraggedIndex] = React.useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = React.useState<number | null>(null);
  const [dragDirection, setDragDirection] = React.useState<
    "up" | "down" | null
  >(null);

  // Function to handle drag start
  const handleDragStart = (e: React.DragEvent, index: number) => {
    setDraggedIndex(index);

    // Create a ghost image that's positioned off-screen to prevent layout shifts
    const ghostElement = document.createElement("div");
    ghostElement.style.position = "fixed";
    ghostElement.style.top = "-1000px";
    ghostElement.style.left = "-1000px";
    ghostElement.style.width = "0";
    ghostElement.style.height = "0";
    ghostElement.style.opacity = "0";
    ghostElement.style.pointerEvents = "none";
    document.body.appendChild(ghostElement);
    e.dataTransfer.setDragImage(ghostElement, 0, 0);
    e.dataTransfer.effectAllowed = "move";

    // Clean up the ghost element after drag starts
    requestAnimationFrame(() => {
      document.body.removeChild(ghostElement);
    });
  };

  // Function to handle drag over
  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (draggedIndex === null) return;
    if (dragOverIndex === index) return;

    // Determine drag direction
    if (draggedIndex !== null) {
      if (draggedIndex < index) {
        setDragDirection("down");
      } else {
        setDragDirection("up");
      }
    }
    setDragOverIndex(index);
  };

  // Function to handle drop
  const handleDrop = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (draggedIndex === null) return;
    if (draggedIndex === index) return;
    handleReorderFields(draggedIndex, index);
    setDraggedIndex(null);
    setDragOverIndex(null);
    setDragDirection(null);
  };

  // Function to handle drag end
  const handleDragEnd = () => {
    setDraggedIndex(null);
    setDragOverIndex(null);
    setDragDirection(null);
  };
  return (
    <div className="space-y-2">
      {filteredFields.map((field, index) => {
        return (
          <div key={field.id} className="relative" data-field-id={field.id}>
            {/* Drop indicator - appears above the item when dragging upward */}
            {dragOverIndex === index && dragDirection === "up" && (
              <div className="absolute left-4 right-4 pointer-events-none z-50">
                <div className="w-full h-1 bg-gradient-to-r from-transparent via-primary to-transparent relative">
                  <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-primary dark:bg-primary text-white dark:text-zinc-900 rounded-full p-2 shadow-lg">
                    <ArrowDownUp className="h-4 w-4" />
                  </div>
                </div>
              </div>
            )}

            <div
              draggable
              onDragStart={(e) => handleDragStart(e, index)}
              onDragOver={(e) => handleDragOver(e, index)}
              onDrop={(e) => handleDrop(e, index)}
              onDragEnd={handleDragEnd}
              className="transition-all duration-200"
            >
              <Card
                className={`border transition-all ${
                  // Always prioritize the dragged state over the selected state
                  draggedIndex === index
                    ? "border-dashed border-primary/70 bg-primary/5 dark:bg-primary/10 shadow-[0_0_15px_rgba(0,0,0,0.1)]"
                    : selectedField?.id === field.id
                      ? "border-primary shadow-md dark:bg-zinc-800"
                      : "hover:border-muted-foreground/50 hover:shadow-sm border-muted dark:border-zinc-700 dark:bg-zinc-900"
                }`}
                onClick={() => {
                  const freshField = JSON.parse(JSON.stringify(field));
                  setSelectedField(freshField);
                }}
              >
                <CardContent className="p-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div
                      className={`flex items-center justify-center h-8 w-8 rounded-md bg-${getFieldTypeColor(field.type)}-100 dark:bg-${getFieldTypeColor(field.type)}-900/40 text-${getFieldTypeColor(field.type)}-600 dark:text-${getFieldTypeColor(field.type)}-300`}
                    >
                      {field.type === "TEXT" && <Type className="h-4 w-4" />}
                      {field.type === "TEXTAREA" && (
                        <AlignLeft className="h-4 w-4" />
                      )}
                      {field.type === "SELECT" && <List className="h-4 w-4" />}
                      {field.type === "CHECKBOX" && (
                        <CheckSquare className="h-4 w-4" />
                      )}
                      {field.type === "RADIO" && (
                        <CheckSquare className="h-4 w-4" />
                      )}
                      {field.type === "DATE" && (
                        <Calendar className="h-4 w-4" />
                      )}
                      {field.type === "FILE" && <Upload className="h-4 w-4" />}
                      {field.type === "NUMBER" && <Hash className="h-4 w-4" />}
                      {field.type === "EMAIL" && <Mail className="h-4 w-4" />}
                      {field.type === "PHONE" && <Phone className="h-4 w-4" />}
                      {field.type === "ADDRESS" && (
                        <MapPin className="h-4 w-4" />
                      )}
                      {field.type === "IDENTITY" && (
                        <CreditCard className="h-4 w-4" />
                      )}
                    </div>
                    <div>
                      <div className="font-medium dark:text-zinc-200">
                        {field.label}
                      </div>
                      <div className="text-xs text-muted-foreground dark:text-zinc-400">
                        {field.type}{" "}
                        {field.required && (
                          <span className="text-red-500 dark:text-red-400">
                            *
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedField(
                                JSON.parse(JSON.stringify(field))
                              );
                            }}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Edit field</p>
                        </TooltipContent>
                      </Tooltip>

                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDuplicateField(field.id);
                            }}
                          >
                            <Copy className="h-4 w-4" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Duplicate field</p>
                        </TooltipContent>
                      </Tooltip>

                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-red-500 hover:text-red-600"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleRemoveField(field.id);
                            }}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Delete field</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>

                    <div className="cursor-move p-1 rounded-md hover:bg-muted dark:hover:bg-zinc-800">
                      <GripVertical className="h-4 w-4 text-muted-foreground dark:text-zinc-500" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Drop indicator - appears below the item when dragging downward */}
            {dragOverIndex === index && dragDirection === "down" && (
              <div className="absolute left-4 right-4 pointer-events-none z-50">
                <div className="w-full h-1 bg-gradient-to-r from-transparent via-primary to-transparent relative">
                  <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-primary dark:bg-primary text-white dark:text-zinc-900 rounded-full p-2 shadow-lg">
                    <ArrowDownUp className="h-4 w-4" />
                  </div>
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
