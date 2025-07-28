"use client";

import React from "react";
import { Icon } from "@iconify/react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { useCampaignStore } from "./store";

const CampaignStatus = {
  PENDING: "warning",
  ACTIVE: "default",
  PAUSED: "info",
  COMPLETED: "success",
  CANCELLED: "destructive",
  STOPPED: "destructive",
} as const;

const statusText = (status: string) => {
  const texts = {
    PENDING: "Pending",
    ACTIVE: "Active",
    PAUSED: "Paused",
    COMPLETED: "Completed",
    CANCELLED: "Canceled",
    STOPPED: "Stopped",
  };
  return texts[status as keyof typeof texts] || "Pending";
};

export type Target = {
  id: string;
  avatar: string;
  email: string;
  firstName: string;
  lastName: string;
  status: string;
};

interface TargetCardProps {
  item: Target;
}

export function TargetCard({ item }: TargetCardProps) {
  const { handleRemoveTarget } = useCampaignStore();

  return (
    <Card className="relative border-zinc-200 dark:border-zinc-700 hover:shadow-lg transition-shadow rounded-md">
      {item.status === "PENDING" && (
        <div className="absolute -top-1 -right-1">
          <Button
            color="destructive"
            size="icon-xs"
            onClick={() => handleRemoveTarget(item.id)}
            aria-label="Remove Target"
          >
            <Icon icon="lucide:x" className="h-4 w-4" />
          </Button>
        </div>
      )}
      <CardHeader>
        <div className="flex items-start justify-between pb-2 gap-2">
          <div className="flex items-center gap-3">
            <Avatar className="h-10 w-10">
              <AvatarImage
                src={item.avatar || "/img/avatars/placeholder.webp"}
              />
              <AvatarFallback>{item.firstName?.[0] ?? "U"}</AvatarFallback>
            </Avatar>
            <div>
              <h4 className="text-sm font-semibold">{item.email}</h4>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                {item.firstName} {item.lastName}
              </p>
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <Badge
          color={CampaignStatus[item.status as keyof typeof CampaignStatus]}
          variant="soft"
        >
          {statusText(item.status)}
        </Badge>
      </CardContent>
    </Card>
  );
}
