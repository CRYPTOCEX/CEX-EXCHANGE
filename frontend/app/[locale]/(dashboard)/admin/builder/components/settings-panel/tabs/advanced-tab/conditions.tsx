"use client";

import { useState } from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { ComponentProps, Condition } from "./types";
import { RemoveButton, inputClass } from "./utils";
const ConditionRow = ({
  condition,
  index,
  onChange,
  onRemove,
}: {
  condition: Condition;
  index: number;
  onChange: (index: number, field: "type" | "value", value: string) => void;
  onRemove: (index: number) => void;
}) => {
  return (
    <div className="flex items-center gap-2">
      <Select
        value={condition.type}
        onValueChange={(value) => onChange(index, "type", value)}
      >
        <SelectTrigger className={`${inputClass} flex-1`}>
          <SelectValue placeholder="Condition type" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="device">Device</SelectItem>
          <SelectItem value="user">User</SelectItem>
          <SelectItem value="date">Date</SelectItem>
          <SelectItem value="custom">Custom</SelectItem>
        </SelectContent>
      </Select>
      {condition.type === "device" ? (
        <Select
          value={condition.value}
          onValueChange={(value) => onChange(index, "value", value)}
        >
          <SelectTrigger className={`${inputClass} flex-1`}>
            <SelectValue placeholder="Select device" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="desktop">Desktop</SelectItem>
            <SelectItem value="tablet">Tablet</SelectItem>
            <SelectItem value="mobile">Mobile</SelectItem>
          </SelectContent>
        </Select>
      ) : (
        <Input
          value={condition.value}
          onChange={(e) => onChange(index, "value", e.target.value)}
          placeholder="Condition value"
          className={`${inputClass} flex-1`}
        />
      )}
      <RemoveButton onRemove={() => onRemove(index)} />
    </div>
  );
};
export function Conditions({ settings, onSettingChange }: ComponentProps) {
  const [conditions, setConditions] = useState<Condition[]>(
    settings.conditions || []
  );
  const handleConditionChange = (
    index: number,
    field: "type" | "value",
    value: string
  ) => {
    const newConditions = [...conditions];
    newConditions[index][field] = value;
    setConditions(newConditions);
    onSettingChange("conditions", newConditions);
  };
  const addCondition = () => {
    const newConditions = [
      ...conditions,
      {
        type: "device",
        value: "desktop",
      },
    ];
    setConditions(newConditions);
    onSettingChange("conditions", newConditions);
  };
  const removeCondition = (index: number) => {
    const newConditions = conditions.filter((_, i) => i !== index);
    setConditions(newConditions);
    onSettingChange("conditions", newConditions);
  };
  return (
    <div className="space-y-3">
      <div className="space-y-1">
        <Label className="text-xs">Display Conditions</Label>
        <div className="space-y-2">
          {conditions.map((condition, index) => (
            <ConditionRow
              key={index}
              condition={condition}
              index={index}
              onChange={handleConditionChange}
              onRemove={removeCondition}
            />
          ))}
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={addCondition}
          className="mt-2 h-7 text-xs w-full"
        >
          <Plus className="h-3 w-3 mr-1" /> Add Condition
        </Button>
        <p className="text-xs text-muted-foreground mt-1">
          Set conditions for when this element should be displayed
        </p>
      </div>
    </div>
  );
}
