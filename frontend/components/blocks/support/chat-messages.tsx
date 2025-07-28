"use client";

import React, { useRef, useEffect, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Icon } from "@iconify/react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Tooltip,
  TooltipProvider,
  TooltipTrigger,
  TooltipContent,
} from "@/components/ui/tooltip";
import { Lightbox } from "@/components/ui/lightbox";

interface ChatMessagesProps {
  messages: MessageType[];
  isReplying?: boolean;
  isSupport: boolean;
}

export function ChatMessages({
  messages,
  isReplying,
  isSupport,
}: ChatMessagesProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [showScrollButton, setShowScrollButton] = useState(false);
  const [displayedMessages, setDisplayedMessages] = useState<MessageType[]>([]);
  const [isInitialLoad, setIsInitialLoad] = useState(true);

  const scrollToBottom = useCallback((behavior: ScrollBehavior = "smooth") => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior, block: "end" });
    }
    setShowScrollButton(false);
  }, []);

  useEffect(() => {
    if (isInitialLoad && messages.length > 0) {
      setDisplayedMessages(messages.slice(-20));
      setTimeout(() => scrollToBottom("instant"), 100);
      setIsInitialLoad(false);
    }
  }, [messages, isInitialLoad, scrollToBottom]);

  useEffect(() => {
    if (!isInitialLoad && messages.length > displayedMessages.length) {
      const newMessages = messages.slice(displayedMessages.length);
      setDisplayedMessages((prev) => [...prev, ...newMessages]);
      setTimeout(() => scrollToBottom(), 100);
    }
  }, [messages, displayedMessages.length, isInitialLoad, scrollToBottom]);

  const isOwnMessage = (messageType: string) =>
    (isSupport && messageType === "agent") ||
    (!isSupport && messageType === "client");

  const formatMessageTime = (time: string) => {
    return new Date(time).toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
  };

  const formatDateLabel = (date: Date) => {
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === today.toDateString()) {
      return "Today";
    } else if (date.toDateString() === yesterday.toDateString()) {
      return "Yesterday";
    } else {
      return date.toLocaleDateString("en-US", {
        month: "long",
        day: "numeric",
      });
    }
  };

  const shouldShowDate = (currentMsg: MessageType, prevMsg?: MessageType) => {
    if (!prevMsg) return true;
    const currentDate = new Date(currentMsg.time).toDateString();
    const prevDate = new Date(prevMsg.time).toDateString();
    return currentDate !== prevDate;
  };

  const getMessageStyles = (isOwn: boolean) => {
    return isOwn
      ? "bg-indigo-500 text-primary"
      : "bg-secondary text-foreground";
  };

  return (
    <TooltipProvider>
      <ScrollArea className="h-full relative">
        <div className="flex flex-col space-y-3 p-3">
          {displayedMessages.map((message, index) => {
            const uniqueKey = `${message.id}-${index}`;
            const ownMessage = isOwnMessage(message.type);
            const hasText = Boolean(message.text?.trim());
            const hasImage = Boolean(message.attachment);

            return (
              <div key={uniqueKey} className="space-y-2">
                {shouldShowDate(message, displayedMessages[index - 1]) && (
                  <motion.div
                    key={`date-${uniqueKey}`}
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex justify-center"
                  >
                    <div className="px-3 py-1 rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 text-xs font-medium shadow-2xs">
                      {formatDateLabel(new Date(message.time))}
                    </div>
                  </motion.div>
                )}

                <motion.div
                  key={`message-${uniqueKey}`}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.2 }}
                  className={`flex ${ownMessage ? "justify-end" : "justify-start"} w-full`}
                >
                  <div
                    className={`flex items-start space-x-2 max-w-[70%] ${
                      ownMessage ? "flex-row-reverse space-x-reverse" : ""
                    }`}
                  >
                    {/* Avatar and tooltip code remains unchanged */}
                    {/* ... */}
                    <div className="space-y-1">
                      <motion.div
                        className={
                          hasImage && !hasText
                            ? "bg-transparent"
                            : `p-2 rounded-lg shadow-2xs ${getMessageStyles(ownMessage)}`
                        }
                        whileHover={{ scale: 1.02 }}
                        transition={{
                          type: "spring",
                          stiffness: 400,
                          damping: 10,
                        }}
                      >
                        {hasText && (
                          <p className="text-sm leading-normal">
                            {message.text}
                          </p>
                        )}
                        {hasImage && (
                          <div className={hasText ? "mt-2" : ""}>
                            <Lightbox
                              src={message.attachment!}
                              alt="Chat attachment"
                              className="w-48 h-48 object-cover"
                              wrapperClassName="block overflow-hidden rounded-lg border border-zinc-200 shadow-2xs transition-shadow hover:shadow-md"
                            />
                          </div>
                        )}
                      </motion.div>
                      <div
                        className={`text-xs text-muted-foreground ${
                          ownMessage ? "text-right" : "text-left"
                        }`}
                      >
                        {formatMessageTime(message.time)}
                      </div>
                    </div>
                  </div>
                </motion.div>
              </div>
            );
          })}

          {isReplying && (
            <motion.div
              key="replying-indicator"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex justify-start"
            >
              <div className="bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 p-2 rounded-lg shadow-2xs">
                <motion.div
                  animate={{
                    scale: [1, 1.2, 1],
                    transition: { repeat: Infinity, duration: 1 },
                  }}
                >
                  <Icon
                    icon="eos-icons:three-dots-loading"
                    className="w-5 h-5"
                  />
                </motion.div>
              </div>
            </motion.div>
          )}

          <div ref={messagesEndRef} />
        </div>

        <AnimatePresence>
          {showScrollButton && (
            <motion.div
              key="scroll-button"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              className="absolute bottom-4 right-4"
            >
              <Button
                onClick={() => scrollToBottom()}
                className="rounded-full bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg"
                size="icon"
              >
                <Icon icon="mdi:arrow-down" className="w-5 h-5" />
              </Button>
            </motion.div>
          )}
        </AnimatePresence>
      </ScrollArea>
    </TooltipProvider>
  );
}
