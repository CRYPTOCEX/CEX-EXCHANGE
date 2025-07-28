"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Plus,
  Trash2,
  ArrowUp,
  ArrowDown,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { LabeledSelect } from "../../structure-tab/ui-components";
import { parseListItems } from "../utils";
import type { SettingsProps } from "../settings-map";
import { useTranslations } from "next-intl";

export function ListSettings({
  element,
  settings,
  onSettingChange,
  onElementUpdate,
}: SettingsProps) {
  const t = useTranslations("dashboard");
  const listType = settings.listType || "unordered";
  const [items, setItems] = useState(() =>
    parseListItems(element.content || "")
  );

  // Generate HTML content for the nested list and update element content.
  const updateContent = (
    newItems: { id: string; text: string; level: number }[]
  ) => {
    // Store the items in the element content as JSON string
    const content = JSON.stringify(newItems);
    onElementUpdate({ ...element, content });
    setItems(newItems);
  };

  const addItem = () => {
    const newItems = [
      ...items,
      {
        id: `item-${Date.now()}`,
        text: `New item ${items.length + 1}`,
        level: 0,
      },
    ];
    updateContent(newItems);
  };

  const removeItem = (id: string) => {
    const newItems = items.filter((item) => item.id !== id);
    updateContent(newItems);
  };

  const updateItem = (id: string, text: string) => {
    const newItems = items.map((item) =>
      item.id === id ? { ...item, text } : item
    );
    updateContent(newItems);
  };

  const indentItem = (id: string) => {
    const newItems = [...items];
    const index = newItems.findIndex((item) => item.id === id);
    if (index <= 0) return;
    const prevItem = newItems[index - 1];
    const currentItem = newItems[index];
    if (currentItem.level <= prevItem.level && currentItem.level < 2) {
      newItems[index] = { ...currentItem, level: currentItem.level + 1 };
      updateContent(newItems);
    }
  };

  const outdentItem = (id: string) => {
    const newItems = [...items];
    const index = newItems.findIndex((item) => item.id === id);
    if (index === -1) return;
    const currentItem = newItems[index];
    if (currentItem.level > 0) {
      newItems[index] = { ...currentItem, level: currentItem.level - 1 };
      updateContent(newItems);
    }
  };

  const moveItemUp = (id: string) => {
    const index = items.findIndex((item) => item.id === id);
    if (index <= 0) return;
    const newItems = [...items];
    [newItems[index - 1], newItems[index]] = [
      newItems[index],
      newItems[index - 1],
    ];
    updateContent(newItems);
  };

  const moveItemDown = (id: string) => {
    const index = items.findIndex((item) => item.id === id);
    if (index === -1 || index === items.length - 1) return;
    const newItems = [...items];
    [newItems[index + 1], newItems[index]] = [
      newItems[index],
      newItems[index + 1],
    ];
    updateContent(newItems);
  };

  const canIndent = (item: { level: number }, index: number): boolean =>
    index > 0 && item.level < 2 && item.level <= items[index - 1].level;
  const canOutdent = (item: { level: number }): boolean => item.level > 0;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4">
        <LabeledSelect
          id="listType"
          label="List Type"
          value={listType}
          onValueChange={(value) => {
            onSettingChange("listType", value);
            updateContent(items);
          }}
          options={[
            { value: "unordered", label: "Unordered (Bullets)" },
            { value: "ordered", label: "Ordered (Numbers)" },
          ]}
        />
      </div>
      <div className="space-y-1 flex-1">
        <div className="flex items-center justify-between">
          <Label className="text-xs font-medium">{t("list_items")}</Label>
          <Button
            size="sm"
            variant="outline"
            onClick={addItem}
            className="h-7 text-xs gap-1"
          >
            <Plus className="h-3 w-3" />
            {t("add_item")}
          </Button>
        </div>
        <div className="border rounded-md overflow-hidden flex-1">
          <div className="max-h-[300px] overflow-y-auto">
            {items.length === 0 ? (
              <div className="p-4 text-center text-sm text-muted-foreground">
                {t("no_items")}. {t("add_an_item_to_get_started")}.
              </div>
            ) : (
              <div className="divide-y">
                {items.map((item, index) => (
                  <div
                    key={item.id}
                    className="flex items-center gap-2 p-2 hover:bg-gray-50"
                  >
                    <div className="flex items-center space-x-1">
                      {canOutdent(item) && (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => outdentItem(item.id)}
                          className="h-6 w-6 text-gray-500"
                          title="Outdent"
                        >
                          <ChevronLeft className="h-3 w-3" />
                        </Button>
                      )}
                      {canIndent(item, index) && (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => indentItem(item.id)}
                          className="h-6 w-6 text-gray-500"
                          title="Indent"
                        >
                          <ChevronRight className="h-3 w-3" />
                        </Button>
                      )}
                    </div>
                    <div className="flex-1">
                      <Input
                        value={item.text}
                        onChange={(e) => updateItem(item.id, e.target.value)}
                        className="h-7 text-xs"
                      />
                    </div>
                    <div className="flex items-center space-x-1">
                      {index > 0 && (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => moveItemUp(item.id)}
                          className="h-6 w-6 text-gray-500"
                          title="Move up"
                        >
                          <ArrowUp className="h-3 w-3" />
                        </Button>
                      )}
                      {index < items.length - 1 && (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => moveItemDown(item.id)}
                          className="h-6 w-6 text-gray-500"
                          title="Move down"
                        >
                          <ArrowDown className="h-3 w-3" />
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => removeItem(item.id)}
                        className="h-6 w-6 text-red-500"
                        title="Delete"
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
