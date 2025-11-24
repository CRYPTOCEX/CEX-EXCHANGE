"use client";

import React, { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { ChatHeader } from "./chat-header";
import { ChatMessages } from "./chat-messages";
import { ChatInput } from "./chat-input";
import { TicketDetails } from "./ticket-details";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Icon } from "@iconify/react";
import { useRouter } from "@/i18n/routing";
import { useTranslations } from "next-intl";

interface SupportChatProps {
  ticket: Ticket;
  isSupport?: boolean;
  onStatusChange: (status: TicketStatus) => void;
  onSendMessage: (message: string) => void;
  onFileUpload: (file: File) => void;
  isReplying?: boolean;
}

export function SupportChat({
  ticket,
  isSupport = false,
  onStatusChange,
  onSendMessage,
  onFileUpload,
  isReplying,
}: SupportChatProps) {
  const t = useTranslations("components/blocks/support/support-chat");
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<MessageType[]>(
    ticket.messages || []
  );
  const router = useRouter();

  useEffect(() => {
    setMessages(ticket.messages || []);
  }, [ticket.messages]);

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (input.trim()) {
      onSendMessage(input);
      setInput("untitled");
      const newMessage: MessageType = {
        id: Date.now().toString(),
        type: isSupport ? "agent" : "client",
        text: input,
        time: new Date().toISOString(),
        userId: isSupport ? ticket.agentId : ticket.userId,
      };
      setMessages((prev) => [...prev, newMessage]);
    }
  };

  const handleFileUpload = async (file: File) => {
    onFileUpload(file);
    const newMessage: MessageType = {
      id: Date.now().toString(),
      type: isSupport ? "agent" : "client",
      text: "",
      time: new Date().toISOString(),
      userId: isSupport ? ticket.agentId : ticket.userId,
      attachment: URL.createObjectURL(file),
    };
    setMessages((prev) => [...prev, newMessage]);
  };

  return (
    <div className="flex flex-col h-full max-h-[calc(100vh-14rem)]">
      {/* Header */}
      <header className="flex items-center justify-between pb-3">
        <div className="flex items-center">
          <h1 className="text-lg font-bold">{t("support_chat")}</h1>
          <span className="ml-2 hidden lg:inline-block text-sm text-zinc-500 dark:text-zinc-400">
            {t("ticket_id")}
            {ticket.id}
          </span>
        </div>
        <Button
          variant="outline"
          onClick={() => router.back()}
          className="flex items-center space-x-2"
        >
          <Icon icon="mdi:arrow-left" className="w-5 h-5" />
          <span>{t("Back")}</span>
        </Button>
      </header>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="grid grid-cols-1 md:grid-cols-3 gap-4 h-[calc(100vh-8rem)] min-h-0"
      >
        {/* Left column for ticket details */}
        <motion.div
          className="md:col-span-1 h-full overflow-hidden"
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          <TicketDetails ticket={ticket} />
        </motion.div>

        {/* Main chat card */}
        <Card className="md:col-span-2 flex flex-col h-full overflow-hidden">
          <ChatHeader
            isSupport={isSupport}
            ticketStatus={ticket.status}
            onStatusChange={onStatusChange}
          />
          <div className="flex-1 overflow-hidden">
            <ChatMessages
              messages={messages}
              isReplying={isReplying}
              isSupport={isSupport}
            />
          </div>
          <ChatInput
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onSubmit={handleSubmit}
            onFileSelect={handleFileUpload}
            isReplying={isReplying}
            ticketClosed={ticket.status === "CLOSED"}
          />
        </Card>
      </motion.div>
    </div>
  );
}
