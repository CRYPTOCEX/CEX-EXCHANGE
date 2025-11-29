"use client";

import type React from "react";

import { useState, useEffect, useRef } from "react";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Send,
  AlertCircle,
  Info,
  ImageIcon,
  Paperclip,
  Smile,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useToast } from "@/hooks/use-toast";
import { useTranslations } from "next-intl";
import { useUserStore } from "@/store/user";

interface Message {
  id: string;
  senderId: string;
  content: string;
  timestamp: string;
  isSystem?: boolean;
}

interface TradeChat {
  tradeId: string;
  counterparty: {
    id: string;
    name: string;
    avatar?: string;
  };
}

export function TradeChat({ tradeId, counterparty }: TradeChat) {
  const t = useTranslations("ext");
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [fetchLoading, setFetchLoading] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [wasFocused, setWasFocused] = useState(false);
  const { toast } = useToast();
  const { profile } = useUserStore();

  const currentUserId = profile?.id;

  useEffect(() => {
    const fetchMessages = async () => {
      try {
        setFetchLoading(true);
        const response = await fetch(`/api/p2p/trade/${tradeId}/message`);

        if (!response.ok) {
          throw new Error("Failed to load messages");
        }

        const data = await response.json();

        // Transform backend response to frontend format
        const transformedMessages = data.map((msg: any) => ({
          id: msg.id,
          senderId: msg.senderId,
          content: msg.message,
          timestamp: msg.createdAt,
          isSystem: false,
        }));

        setMessages(transformedMessages);
      } catch (error) {
        console.error("Error fetching messages:", error);
        toast({
          title: "Error",
          description: "Failed to load messages",
          variant: "destructive",
        });
      } finally {
        setFetchLoading(false);
      }
    };

    fetchMessages();

    // Simulate real-time updates
    const interval = setInterval(() => {
      fetchMessages();
    }, 5000);

    return () => clearInterval(interval);
  }, [tradeId, toast]);

  useEffect(() => {
    scrollToBottom();
    // Restore focus if input was previously focused
    if (wasFocused && inputRef.current && document.activeElement !== inputRef.current) {
      inputRef.current.focus();
      setWasFocused(false);
    }
  }, [messages, wasFocused]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!newMessage.trim()) return;

    setLoading(true);
    try {
      const response = await fetch(`/api/p2p/trade/${tradeId}/message`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ message: newMessage }),
      });

      if (!response.ok) {
        throw new Error("Failed to send message");
      }

      const result = await response.json();

      // Check if response has data
      if (!result.data) {
        throw new Error(result.message || "Invalid response from server");
      }

      // Transform backend response to frontend format
      const newMsg: Message = {
        id: result.data.id,
        senderId: result.data.senderId,
        content: result.data.message,
        timestamp: result.data.createdAt,
        isSystem: false,
      };

      setMessages((prev) => [...prev, newMsg]);
      setNewMessage("");
    } catch (error) {
      console.error("Error sending message:", error);
      toast({
        title: "Error",
        description: "Failed to send message",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="h-[600px] flex flex-col border-primary/10 dark:border-zinc-700/50 dark:bg-zinc-900/50">
      <CardHeader className="pb-3 border-b dark:border-zinc-700/50">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Avatar className="h-8 w-8">
              <AvatarImage
                src={
                  counterparty.avatar || "/placeholder.svg?height=40&width=40"
                }
                alt={counterparty.name}
              />
              <AvatarFallback>{counterparty.name.charAt(0)}</AvatarFallback>
            </Avatar>
            <div>
              <CardTitle className="text-base">{counterparty.name}</CardTitle>
              <div className="flex items-center">
                <Badge
                  variant="outline"
                  className="text-xs bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300"
                >
                  {t("Online")}
                </Badge>
              </div>
            </div>
          </div>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="flex items-center text-xs text-muted-foreground">
                  <Info className="h-3 w-3 mr-1" />
                  <span>
                    {t("trade_#")}
                    {tradeId}
                  </span>
                </div>
              </TooltipTrigger>
              <TooltipContent>
                <p>{t("all_messages_are_dispute_resolution")}</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </CardHeader>

      <CardContent className="flex-1 overflow-y-auto pb-0 pt-4">
        {fetchLoading ? (
          <div className="flex justify-center items-center h-full">
            <p className="text-sm text-muted-foreground dark:text-zinc-400">
              {t("loading_messages")}.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {messages.length === 0 ? (
              <div className="flex justify-center items-center h-full">
                <p className="text-sm text-muted-foreground dark:text-zinc-400">
                  {t("no_messages_yet")}. {t("start_the_conversation")}
                </p>
              </div>
            ) : (
              messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex ${message.senderId === currentUserId ? "justify-end" : "justify-start"} ${message.isSystem ? "justify-center" : ""}`}
                >
                  {message.isSystem ? (
                    <div className="bg-muted dark:bg-zinc-800/60 px-3 py-2 rounded-md text-sm text-center max-w-[80%] border border-border dark:border-zinc-700/50">
                      <AlertCircle className="h-3 w-3 inline mr-1" />
                      {message.content}
                    </div>
                  ) : message.senderId === currentUserId ? (
                    <div className="bg-primary text-primary-foreground px-3 py-2 rounded-lg rounded-tr-none max-w-[80%] shadow-sm dark:shadow-primary/10">
                      <p>{message.content}</p>
                      <p className="text-xs opacity-70 text-right mt-1">
                        {new Date(message.timestamp).toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </p>
                    </div>
                  ) : (
                    <div className="flex gap-2">
                      <Avatar className="h-8 w-8">
                        <AvatarImage
                          src={
                            counterparty.avatar ||
                            "/placeholder.svg?height=40&width=40"
                          }
                          alt={counterparty.name}
                        />
                        <AvatarFallback>
                          {counterparty.name.charAt(0)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="bg-muted dark:bg-zinc-800/80 px-3 py-2 rounded-lg rounded-tl-none max-w-[80%] shadow-sm dark:shadow-zinc-900/20">
                        <p>{message.content}</p>
                        <p className="text-xs text-muted-foreground text-right mt-1">
                          {new Date(message.timestamp).toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              ))
            )}
            <div ref={messagesEndRef} />
          </div>
        )}
      </CardContent>

      <CardFooter className="pt-3 border-t mt-auto">
        <form onSubmit={handleSendMessage} className="flex w-full gap-2">
          <div className="flex gap-1">
            <Button
              type="button"
              size="icon"
              variant="ghost"
              className="h-9 w-9"
            >
              <Paperclip className="h-4 w-4" />
            </Button>
            <Button
              type="button"
              size="icon"
              variant="ghost"
              className="h-9 w-9"
            >
              <ImageIcon className="h-4 w-4" />
            </Button>
            <Button
              type="button"
              size="icon"
              variant="ghost"
              className="h-9 w-9"
            >
              <Smile className="h-4 w-4" />
            </Button>
          </div>
          <Input
            ref={inputRef}
            placeholder="Type your message..."
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onFocus={() => setWasFocused(true)}
            onBlur={() => setWasFocused(false)}
            disabled={loading || fetchLoading}
            className="flex-1"
          />
          <Button
            type="submit"
            size="icon"
            disabled={loading || fetchLoading}
            className="h-9 w-9"
          >
            <Send className="h-4 w-4" />
          </Button>
        </form>
      </CardFooter>
    </Card>
  );
}
