"use client";

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { CalendarIcon, Trash2 } from "lucide-react";
import { format } from "date-fns";
import { useTranslations } from "next-intl";

interface RoadmapItem {
  id: string | number;
  title: string;
  description: string;
  date: Date | undefined | null;
  completed: boolean;
}

interface RoadmapItemFormProps {
  item: RoadmapItem;
  index: number;
  canRemove: boolean;
  onUpdate: (id: string | number, field: string, value: any) => void;
  onRemove: (id: string | number) => void;
}

export default function RoadmapItemForm({
  item,
  index,
  canRemove,
  onUpdate,
  onRemove,
}: RoadmapItemFormProps) {
  const t = useTranslations("ext_ico");
  const tCommon = useTranslations("common");
  const tExt = useTranslations("ext");
  return (
    <div className="space-y-4 p-4 border rounded-md">
      <div className="flex items-center justify-between">
        <h5 className="font-medium">
          {t("milestone")}
          {index + 1}
        </h5>
        {canRemove && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => onRemove(item.id)}
            className="text-destructive hover:text-destructive/90 hover:bg-destructive/10"
          >
            <Trash2 className="h-4 w-4 mr-1" />
            {tCommon("remove")}
          </Button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <label className="text-sm font-medium">{tCommon("title")}</label>
          <Input
            placeholder={t("e_g_beta_launch_mainnet_release")}
            value={item.title}
            onChange={(e) => onUpdate(item.id, "title", e.target.value)}
          />
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium">{t("target_date")}</label>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant={"outline"}
                className="w-full justify-start text-left font-normal"
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {item.date ? (
                  format(item.date, "PPP")
                ) : (
                  <span>{tExt("pick_a_date")}</span>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={item.date || undefined}
                onSelect={(date) => onUpdate(item.id, "date", date)}
                initialFocus
              />
            </PopoverContent>
          </Popover>
        </div>
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium">{tCommon("description")}</label>
        <Textarea
          placeholder={t("describe_what_will_be_accomplished_in")}
          className="min-h-[80px]"
          value={item.description}
          onChange={(e) => onUpdate(item.id, "description", e.target.value)}
        />
      </div>

      <div className="flex items-center space-x-2">
        <Checkbox
          id={`completed-${item.id}`}
          checked={item.completed}
          onCheckedChange={(checked) =>
            onUpdate(item.id, "completed", checked === true)
          }
        />
        <label htmlFor={`completed-${item.id}`} className="text-sm font-medium">
          {tCommon("already_completed")}
        </label>
      </div>
    </div>
  );
}
