"use client";

import { useEffect } from "react";
import { CheckCircle, X, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

interface ExportNotificationProps {
  show: boolean;
  message: string;
  type: "success" | "error";
  onClose: () => void;
}

export function ExportNotification({
  show,
  message,
  type,
  onClose,
}: ExportNotificationProps) {
  useEffect(() => {
    if (show) {
      const timer = setTimeout(() => {
        onClose();
      }, 5000); // Auto-close after 5 seconds

      return () => clearTimeout(timer);
    }
  }, [show, onClose]);

  if (!show) return null;

  return (
    <div className="fixed top-4 right-4 z-50 animate-in slide-in-from-top-2 duration-300">
      <Card
        className={`border-0 shadow-xl ${
          type === "success"
            ? "bg-gradient-to-r from-green-500 to-emerald-500 text-white"
            : "bg-gradient-to-r from-red-500 to-rose-500 text-white"
        }`}
      >
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white/20 rounded-lg">
              {type === "success" ? (
                <CheckCircle className="h-5 w-5" />
              ) : (
                <Download className="h-5 w-5" />
              )}
            </div>
            <div className="flex-1">
              <p className="font-medium">{message}</p>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              className="h-8 w-8 text-white hover:bg-white/20"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
