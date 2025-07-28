"use client";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

interface ActionMessageProps {
  actionMessage: {
    type: "success" | "error";
    message: string;
  } | null;
}

export function ActionMessage({ actionMessage }: ActionMessageProps) {
  if (!actionMessage) return null;

  return (
    <Alert
      variant={actionMessage.type === "success" ? "default" : "destructive"}
    >
      <AlertTitle>
        {actionMessage.type === "success" ? "Success" : "Error"}
      </AlertTitle>
      <AlertDescription>{actionMessage.message}</AlertDescription>
    </Alert>
  );
}
