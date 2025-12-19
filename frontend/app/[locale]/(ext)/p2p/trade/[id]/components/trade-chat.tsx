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
  Smile,
  Shield,
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
import { Lightbox } from "@/components/ui/lightbox";

interface Message {
  id: string;
  senderId: string;
  senderName?: string;
  content: string;
  timestamp: string;
  isSystem?: boolean;
  isAdminMessage?: boolean;
}

interface TradeChatProps {
  tradeId: string;
  counterparty: {
    id: string;
    name: string;
    avatar?: string;
  };
  wsMessages?: Message[];
  onNewMessage?: (message: Message) => void;
}

// Helper function to render message content with images using Lightbox
function MessageContent({ content }: { content: string }) {
  // Safety check for undefined/null content
  if (!content) {
    return null;
  }

  // Check if content contains markdown image syntax ![alt](url)
  const imageRegex = /!\[([^\]]*)\]\(([^)]+)\)/g;

  const parts: React.ReactNode[] = [];
  let lastIndex = 0;
  let match;

  // Process images with Lightbox
  while ((match = imageRegex.exec(content)) !== null) {
    // Add text before the image
    if (match.index > lastIndex) {
      parts.push(
        <span key={`text-${lastIndex}`}>{content.slice(lastIndex, match.index)}</span>
      );
    }

    // Add the image with Lightbox for preview
    const [, alt, src] = match;
    parts.push(
      <div key={`img-${match.index}`} className="my-2 max-w-xs">
        <Lightbox
          src={src}
          alt={alt || "Shared image"}
          className="max-w-full max-h-48 rounded-lg border border-border object-cover"
          wrapperClassName="inline-block"
        />
      </div>
    );

    lastIndex = match.index + match[0].length;
  }

  // If we found images, add remaining text
  if (parts.length > 0) {
    if (lastIndex < content.length) {
      parts.push(<span key={`text-${lastIndex}`}>{content.slice(lastIndex)}</span>);
    }
    return <>{parts}</>;
  }

  // If no special content found, return the original content
  return <>{content}</>;
}

// Common emojis for quick access
const COMMON_EMOJIS = [
  "😀", "😃", "😄", "😁", "😅", "😂", "🤣", "😊",
  "😍", "🥰", "😘", "😗", "😋", "😛", "😜", "🤪",
  "👍", "👎", "👌", "✌️", "🤞", "🤝", "🙏", "💪",
  "❤️", "🧡", "💛", "💚", "💙", "💜", "🖤", "💔",
  "🔥", "⭐", "✨", "💯", "💰", "💵", "💳", "📈",
  "✅", "❌", "⚠️", "📌", "📎", "🔗", "📧", "📞",
];

export function TradeChat({ tradeId, counterparty, wsMessages, onNewMessage }: TradeChatProps) {
  const t = useTranslations("ext_p2p");
  const tCommon = useTranslations("common");
  const [localMessages, setLocalMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [initialLoadDone, setInitialLoadDone] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const shouldMaintainFocusRef = useRef(false);
  const isNearBottomRef = useRef(true);
  const isInitialScrollDoneRef = useRef(false);
  const previousMessageCountRef = useRef(0);
  const { toast } = useToast();
  const { user } = useUserStore();

  const currentUserId = user?.id;

  // Use WebSocket messages if provided, otherwise use local messages
  const messages = wsMessages && wsMessages.length > 0 ? wsMessages : localMessages;

  const insertEmoji = (emoji: string) => {
    setNewMessage((prev) => prev + emoji);
    setShowEmojiPicker(false);
    inputRef.current?.focus();
  };

  // Fetch messages only if WebSocket messages are not provided (fallback)
  const fetchMessages = async (isInitialLoad = false) => {
    // Skip if we're using WebSocket messages
    if (wsMessages && wsMessages.length > 0) {
      setInitialLoadDone(true);
      return;
    }

    try {
      const response = await fetch(`/api/p2p/trade/${tradeId}/message`);

      if (!response.ok) {
        throw new Error("Failed to load messages");
      }

      const data = await response.json();

      // Transform backend response to frontend format
      const transformedMessages = data.map((msg: any) => ({
        id: msg.id,
        senderId: msg.senderId,
        senderName: msg.senderName,
        content: msg.message,
        timestamp: msg.createdAt,
        isSystem: false,
        isAdminMessage: msg.isAdminMessage || false,
      }));

      setLocalMessages((prevMessages) => {
        // Only update if messages have actually changed to prevent flickering
        const prevIds = prevMessages.map(m => m.id).join(',');
        const newIds = transformedMessages.map((m: Message) => m.id).join(',');
        if (prevIds !== newIds) {
          return transformedMessages;
        }
        return prevMessages;
      });
    } catch (error) {
      console.error("Error fetching messages:", error);
      if (isInitialLoad) {
        toast({
          title: "Error",
          description: "Failed to load messages",
          variant: "destructive",
        });
      }
    } finally {
      setInitialLoadDone(true);
    }
  };

  // Only fetch messages initially if WebSocket messages are not available
  useEffect(() => {
    if (!wsMessages || wsMessages.length === 0) {
      fetchMessages(true);
    } else {
      setInitialLoadDone(true);
    }
  }, [tradeId, wsMessages]);

  // Check if user is near the bottom of the chat (within 100px)
  const checkIfNearBottom = () => {
    const container = messagesContainerRef.current;
    if (!container) return true;

    const threshold = 100; // pixels from bottom
    const isNear = container.scrollHeight - container.scrollTop - container.clientHeight < threshold;
    isNearBottomRef.current = isNear;
    return isNear;
  };

  // Handle scroll events to track if user is near bottom
  const handleScroll = () => {
    checkIfNearBottom();
  };

  // Scroll to bottom - used for initial load and when user is near bottom
  const scrollToBottom = (behavior: ScrollBehavior = "smooth") => {
    messagesEndRef.current?.scrollIntoView({ behavior });
  };

  // Effect for handling auto-scroll on message changes
  useEffect(() => {
    const messageCount = messages.length;
    const isNewMessage = messageCount > previousMessageCountRef.current;

    // Update previous count
    previousMessageCountRef.current = messageCount;

    // Initial scroll - scroll to bottom immediately when messages first load
    if (initialLoadDone && !isInitialScrollDoneRef.current && messageCount > 0) {
      isInitialScrollDoneRef.current = true;
      // Use instant scroll for initial load
      setTimeout(() => {
        scrollToBottom("instant");
      }, 50);
      return;
    }

    // For new messages, only scroll if user is near bottom
    if (isNewMessage && isNearBottomRef.current) {
      scrollToBottom("smooth");
    }

    // Restore focus if input was previously focused and should be maintained
    if (shouldMaintainFocusRef.current && inputRef.current) {
      inputRef.current.focus();
    }
  }, [messages, initialLoadDone]);

  const handleFileUpload = async (file: File) => {
    try {
      setLoading(true);
      // When user uploads a file, always scroll to show it
      isNearBottomRef.current = true;

      // Convert file to base64
      const reader = new FileReader();
      const base64Promise = new Promise<string>((resolve, reject) => {
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
      });
      reader.readAsDataURL(file);
      const base64Data = await base64Promise;

      const response = await fetch(`/api/p2p/trade/${tradeId}/message/upload`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          file: base64Data,
          filename: file.name,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to upload file");
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
        content: result.data.message || `![Attachment](${result.data.attachment?.url || ""})`,
        timestamp: result.data.createdAt,
        isSystem: false,
      };

      // WebSocket will broadcast the message - add locally only if not using WebSocket
      if (!onNewMessage) {
        setLocalMessages((prev) => [...prev, newMsg]);
      }

      toast({
        title: "Success",
        description: "Image uploaded successfully",
      });
    } catch (error) {
      console.error("Error uploading file:", error);
      toast({
        title: "Error",
        description: "Failed to upload image",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!newMessage.trim()) return;

    // Mark that we should maintain focus after state updates
    shouldMaintainFocusRef.current = true;
    // When user sends a message, always scroll to show it
    isNearBottomRef.current = true;

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

      // Clear input immediately
      setNewMessage("");

      // Transform backend response to frontend format
      const newMsg: Message = {
        id: result.data.id,
        senderId: result.data.senderId,
        content: result.data.message,
        timestamp: result.data.createdAt,
        isSystem: false,
      };

      // WebSocket will broadcast the message - add locally only if not using WebSocket
      if (!onNewMessage) {
        setLocalMessages((prev) => [...prev, newMsg]);
      }

      // Maintain focus will be handled by useEffect
    } catch (error) {
      console.error("Error sending message:", error);
      toast({
        title: "Error",
        description: "Failed to send message",
        variant: "destructive",
      });
      shouldMaintainFocusRef.current = false;
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
                  {tCommon("online")}
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
                    {tCommon("trade")}
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

      <CardContent
        ref={messagesContainerRef}
        className="flex-1 overflow-y-auto pb-0 pt-4"
        onScroll={handleScroll}
      >
        {!initialLoadDone ? (
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
                  className={`flex ${message.isAdminMessage ? "justify-center" : message.senderId === currentUserId ? "justify-end" : "justify-start"} ${message.isSystem ? "justify-center" : ""}`}
                >
                  {message.isSystem ? (
                    <div className="bg-muted dark:bg-zinc-800/60 px-3 py-2 rounded-md text-sm text-center max-w-[80%] border border-border dark:border-zinc-700/50">
                      <AlertCircle className="h-3 w-3 inline mr-1" />
                      {message.content}
                    </div>
                  ) : message.isAdminMessage ? (
                    <div className="bg-amber-100 dark:bg-amber-900/30 border border-amber-300 dark:border-amber-700 px-4 py-2 rounded-lg max-w-[85%] shadow-sm">
                      <div className="flex items-center gap-2 mb-1">
                        <Shield className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                        <span className="text-xs font-semibold text-amber-700 dark:text-amber-400">
                          {t("admin_message")}
                        </span>
                      </div>
                      <div className="text-amber-900 dark:text-amber-100">
                        <MessageContent content={message.content} />
                      </div>
                      <p className="text-xs text-amber-600 dark:text-amber-400 text-right mt-1">
                        {message.senderName && <span className="mr-2">{message.senderName}</span>}
                        {new Date(message.timestamp).toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </p>
                    </div>
                  ) : message.senderId === currentUserId ? (
                    <div className="bg-primary text-primary-foreground px-3 py-2 rounded-lg rounded-tr-none max-w-[80%] shadow-sm dark:shadow-primary/10">
                      <div><MessageContent content={message.content} /></div>
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
                        <div><MessageContent content={message.content} /></div>
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
          <input
            ref={fileInputRef}
            type="file"
            className="hidden"
            accept="image/*"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) {
                handleFileUpload(file);
              }
              // Reset input so same file can be selected again
              e.target.value = "";
            }}
          />
          <div className="flex gap-1">
            <Button
              type="button"
              size="icon"
              variant="ghost"
              className="h-9 w-9"
              onClick={() => fileInputRef.current?.click()}
              disabled={loading}
              title={t("attach_image")}
            >
              <ImageIcon className="h-4 w-4" />
            </Button>
            <div className="relative">
              <Button
                type="button"
                size="icon"
                variant="ghost"
                className="h-9 w-9"
                onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                disabled={loading}
                title={t("insert_emoji")}
              >
                <Smile className="h-4 w-4" />
              </Button>
              {showEmojiPicker && (
                <div className="absolute bottom-12 left-0 bg-background border border-border rounded-lg shadow-lg p-2 z-50 w-64">
                  <div className="grid grid-cols-8 gap-1 max-h-48 overflow-y-auto">
                    {COMMON_EMOJIS.map((emoji, index) => (
                      <button
                        key={index}
                        type="button"
                        className="hover:bg-muted rounded p-1 text-lg transition-colors"
                        onClick={() => insertEmoji(emoji)}
                      >
                        {emoji}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
          <Input
            ref={inputRef}
            placeholder={tCommon("type_your_message_ellipsis")}
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onFocus={() => {
              shouldMaintainFocusRef.current = true;
            }}
            onBlur={() => {
              // Small delay to allow form submission to complete
              setTimeout(() => {
                shouldMaintainFocusRef.current = false;
              }, 100);
            }}
            disabled={loading}
            className="flex-1"
          />
          <Button
            type="submit"
            size="icon"
            disabled={loading}
            className="h-9 w-9"
          >
            <Send className="h-4 w-4" />
          </Button>
        </form>
      </CardFooter>
    </Card>
  );
}
