"use client";

import { useEffect, useRef, useState } from "react";
import { Send, X, ZoomIn, Image as ImageIcon, Shield, User } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";
import { format } from "date-fns";

interface Message {
  id?: string;
  sender: string;
  senderId?: string;
  content: string;
  timestamp: string;
  avatar?: string;
  senderAvatar?: string;
  senderInitials?: string;
  isAdmin?: boolean;
  attachments?: string[];
}

interface AdminChatTabProps {
  messages: Message[];
  buyerId?: string;
  sellerId?: string;
  // Admin message form props
  messageText: string;
  setMessageText: (value: string) => void;
  handleSendMessage: () => Promise<void>;
  isSendingMessage?: boolean;
  // WebSocket status
  isConnected?: boolean;
}

// Helper to extract images from message content
function extractImages(content: string): { text: string; images: string[] } {
  if (!content) return { text: "", images: [] };
  const images: string[] = [];
  let text = content;

  // 1. Extract markdown image format: ![alt](url)
  const markdownImageRegex = /!\[([^\]]*)\]\(([^)]+)\)/gi;
  text = text.replace(markdownImageRegex, (match, alt, url) => {
    images.push(url);
    return "";
  });

  // 2. Extract plain image URLs
  const plainUrlRegex = /(https?:\/\/[^\s]+\.(jpg|jpeg|png|gif|webp|bmp|svg))/gi;
  text = text.replace(plainUrlRegex, (match) => {
    if (!images.includes(match)) images.push(match);
    return "";
  });

  // 3. Extract relative paths
  const relativePathRegex = /(\/uploads\/[^\s]+\.(jpg|jpeg|png|gif|webp|bmp|svg))/gi;
  text = text.replace(relativePathRegex, (match) => {
    if (!images.includes(match)) images.push(match);
    return "";
  });

  return { text: text.trim(), images };
}

function formatTimestamp(timestamp: string): string {
  try {
    return format(new Date(timestamp), "MMM d, yyyy 'at' h:mm a");
  } catch {
    return timestamp;
  }
}

export function AdminChatTab({
  messages,
  buyerId,
  sellerId,
  messageText,
  setMessageText,
  handleSendMessage,
  isSendingMessage = false,
  isConnected,
}: AdminChatTabProps) {
  const t = useTranslations("ext_admin");
  const tExt = useTranslations("ext");
  const tCommon = useTranslations("common");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);
  const [isSending, setIsSending] = useState(false);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

  const handleSend = async () => {
    if (!messageText?.trim() || isSending || isSendingMessage) return;
    setIsSending(true);
    try {
      await handleSendMessage();
    } finally {
      setIsSending(false);
    }
  };

  const isSubmitting = isSending || isSendingMessage;

  const renderMessages = () => {
    if (!messages || messages.length === 0) {
      return (
        <div className="flex flex-col items-center justify-center h-full text-center">
          <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
            <ImageIcon className="h-8 w-8 text-muted-foreground" />
          </div>
          <p className="text-muted-foreground dark:text-slate-400">
            {t("no_messages_exchanged_yet")}
          </p>
          <p className="text-sm text-muted-foreground/60 mt-1">
            {t("messages_between_buyer_and_seller_will_appear_here")}
          </p>
        </div>
      );
    }

    return messages.map((message, index) => {
      const { text, images } = extractImages(message.content || "");
      const isAdminMessage = message.isAdmin || message.sender === "Admin";
      const isBuyer = message.senderId === buyerId;
      const isSeller = message.senderId === sellerId;

      return (
        <div
          key={message.id || index}
          className={cn(
            "flex gap-3 animate-in fade-in slide-in-from-bottom-2 duration-300",
            isAdminMessage && "pl-4 border-l-2 border-blue-500"
          )}
        >
          <Avatar className="h-10 w-10 shrink-0 ring-2 ring-background shadow-sm">
            <AvatarImage
              src={message.avatar || message.senderAvatar || "/img/placeholder.svg"}
              alt={message.sender || "User"}
            />
            <AvatarFallback className={cn(
              "text-xs font-medium",
              isAdminMessage ? "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300" :
              isBuyer ? "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300" :
              isSeller ? "bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-300" :
              "bg-muted"
            )}>
              {message.senderInitials || message.sender?.charAt(0)?.toUpperCase() || "?"}
            </AvatarFallback>
          </Avatar>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className="font-medium text-sm truncate">
                {message.sender || "Unknown"}
              </span>
              {isAdminMessage && (
                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300">
                  <Shield className="h-3 w-3" />
                  Admin
                </span>
              )}
              {isBuyer && !isAdminMessage && (
                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-300">
                  <User className="h-3 w-3" />
                  Buyer
                </span>
              )}
              {isSeller && !isAdminMessage && (
                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-orange-100 text-orange-700 dark:bg-orange-900/50 dark:text-orange-300">
                  <User className="h-3 w-3" />
                  Seller
                </span>
              )}
              <span className="text-[10px] text-muted-foreground ml-auto shrink-0">
                {formatTimestamp(message.timestamp)}
              </span>
            </div>

            <div
              className={cn(
                "rounded-lg px-3 py-2 text-sm",
                isAdminMessage
                  ? "bg-blue-50 dark:bg-blue-950/50 border border-blue-200 dark:border-blue-800/50"
                  : "bg-muted/80 dark:bg-slate-800/50"
              )}
            >
              {/* Text content */}
              {text && (
                <p className="whitespace-pre-wrap break-words">{text}</p>
              )}

              {/* Image attachments */}
              {images.length > 0 && (
                <div className={cn("flex flex-wrap gap-2", text && "mt-2")}>
                  {images.map((img, imgIndex) => (
                    <button
                      key={imgIndex}
                      onClick={() => setLightboxImage(img)}
                      className="relative group rounded-lg overflow-hidden border bg-background hover:ring-2 hover:ring-primary transition-all"
                    >
                      <img
                        src={img}
                        alt={`Attachment ${imgIndex + 1}`}
                        className="h-24 w-auto max-w-[200px] object-cover"
                        onError={(e) => {
                          (e.target as HTMLImageElement).style.display = "none";
                        }}
                      />
                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-center justify-center">
                        <ZoomIn className="h-6 w-6 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                      </div>
                    </button>
                  ))}
                </div>
              )}

              {/* Additional attachments */}
              {message.attachments && message.attachments.length > 0 && (
                <div className={cn("flex flex-wrap gap-2", (text || images.length > 0) && "mt-2")}>
                  {message.attachments.map((attachment, attIndex) => (
                    <button
                      key={attIndex}
                      onClick={() => setLightboxImage(attachment)}
                      className="relative group rounded-lg overflow-hidden border bg-background hover:ring-2 hover:ring-primary transition-all"
                    >
                      <img
                        src={attachment}
                        alt={`Attachment ${attIndex + 1}`}
                        className="h-24 w-auto max-w-[200px] object-cover"
                        onError={(e) => {
                          (e.target as HTMLImageElement).style.display = "none";
                        }}
                      />
                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-center justify-center">
                        <ZoomIn className="h-6 w-6 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      );
    });
  };

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>{tCommon("chat")}</CardTitle>
              <CardDescription>
                {t("communication_between_participants")}
              </CardDescription>
            </div>
            <div className={`flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium ${
              isConnected
                ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                : "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
            }`}>
              {isConnected ? (
                <>
                  <span className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
                  {tCommon("live")}
                </>
              ) : (
                <>
                  <span className="h-2 w-2 rounded-full bg-red-500" />
                  {tExt("offline")}
                </>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="h-[400px] overflow-y-auto border rounded-lg bg-gradient-to-b from-muted/20 to-background p-4 space-y-4">
            {renderMessages()}
            <div ref={messagesEndRef} />
          </div>

          {/* Admin message form */}
          <div className="border-t pt-4 space-y-3">
            <h3 className="text-sm font-medium flex items-center gap-2">
              <Send className="h-4 w-4" />
              {t("send_admin_message")}
            </h3>
            <div className="flex gap-2">
              <textarea
                className="flex-1 min-h-[80px] rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 resize-none"
                placeholder={t("type_your_message_to_both_participants_ellipsis")}
                value={messageText}
                onChange={(e) => setMessageText(e.target.value)}
                disabled={isSubmitting}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
                    handleSend();
                  }
                }}
              />
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">
                {t("press_ctrl_enter_to_send")}
              </span>
              <Button
                size="sm"
                onClick={handleSend}
                disabled={isSubmitting || !messageText?.trim()}
              >
                <Send className="mr-2 h-4 w-4" />
                {isSubmitting ? t("sending") : t("send_message")}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Lightbox Modal */}
      {lightboxImage && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm animate-in fade-in duration-200"
          onClick={() => setLightboxImage(null)}
        >
          <button
            onClick={() => setLightboxImage(null)}
            className="absolute top-4 right-4 p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"
          >
            <X className="h-6 w-6" />
          </button>
          <img
            src={lightboxImage}
            alt={tExt("full_size")}
            className="max-h-[90vh] max-w-[90vw] object-contain rounded-lg shadow-2xl animate-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </>
  );
}
