"use client";

import { MessageSquare } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { useTranslations } from "next-intl";

interface MessagesTabProps {
  dispute: any;
  messageText: string;
  setMessageText: (value: string) => void;
  handleSendMessage: () => Promise<void>;
}

export function MessagesTab({
  dispute,
  messageText,
  setMessageText,
  handleSendMessage,
}: MessagesTabProps) {
  const t = useTranslations("ext");
  return (
    <Card className="dark:border-slate-700/50 dark:bg-slate-900/30">
      <CardHeader>
        <CardTitle>{t("communication_history")}</CardTitle>
        <CardDescription>
          {t("messages_between_parties_and_admin")}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {dispute.messages && dispute.messages.length > 0 ? (
            dispute.messages.map((message: any, index: number) => (
              <div
                key={index}
                className={`rounded-md ${
                  message.sender === "Admin"
                    ? "bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800/30"
                    : "bg-muted dark:bg-slate-800/50 border border-transparent dark:border-slate-700/30"
                } p-3`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Avatar className="h-8 w-8">
                      <AvatarImage
                        src={message.senderAvatar || "/placeholder.svg"}
                        alt={message.sender}
                      />
                      <AvatarFallback>
                        {message.senderInitials || message.sender.charAt(0)}
                      </AvatarFallback>
                    </Avatar>
                    <span className="font-medium">{message.sender}</span>
                  </div>
                  <span className="text-xs text-muted-foreground dark:text-slate-400">
                    {message.timestamp}
                  </span>
                </div>
                <p className="mt-2 text-sm">{message.content}</p>
              </div>
            ))
          ) : (
            <div className="rounded-md border border-dashed p-4 text-center text-muted-foreground dark:text-slate-400 dark:border-slate-700/50">
              {t("no_messages_yet")}
            </div>
          )}

          <Separator className="dark:bg-slate-700/50" />

          <div>
            <h3 className="mb-2 text-sm font-medium">
              {t("send_message_to_both_parties")}
            </h3>
            <Textarea
              placeholder="Type your message here..."
              className="min-h-[100px] dark:bg-slate-800/50 dark:border-slate-700/50"
              value={messageText}
              onChange={(e) => setMessageText(e.target.value)}
            />
            <Button
              onClick={handleSendMessage}
              className="mt-2"
              disabled={!messageText.trim()}
            >
              <MessageSquare className="mr-2 h-4 w-4" />
              {t("send_message")}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
