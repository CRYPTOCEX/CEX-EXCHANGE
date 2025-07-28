"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { useTranslations } from "next-intl";

interface Message {
  sender: string;
  content: string;
  timestamp: string;
  avatar?: string;
  isAdmin?: boolean;
}

interface TradeMessagesViewProps {
  messages: Message[];
}

export function TradeMessagesView({ messages }: TradeMessagesViewProps) {
  const t = useTranslations("ext");
  if (!messages || messages.length === 0) {
    return (
      <div className="flex items-center justify-center p-8 text-center">
        <p className="text-muted-foreground dark:text-slate-400">
          {t("no_messages_exchanged_yet")}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {messages.map((message, index) => (
        <div key={index}>
          <div className="flex gap-3">
            <Avatar className="h-8 w-8">
              <AvatarImage
                src={message.avatar || "/placeholder.svg?height=32&width=32"}
                alt={message.sender}
              />
              <AvatarFallback>{message.sender.charAt(0)}</AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <div className="flex items-baseline justify-between">
                <p className="font-medium">{message.sender}</p>
                <p className="text-xs text-muted-foreground dark:text-slate-400">
                  {message.timestamp}
                </p>
              </div>
              <div
                className={`mt-1 p-3 rounded-md ${
                  message.isAdmin
                    ? "bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800/30"
                    : "bg-muted dark:bg-slate-800/50 border border-transparent dark:border-slate-700/30"
                }`}
              >
                <p>{message.content}</p>
              </div>
            </div>
          </div>
          {index < messages.length - 1 && (
            <Separator className="my-4 dark:bg-slate-700/50" />
          )}
        </div>
      ))}
    </div>
  );
}
