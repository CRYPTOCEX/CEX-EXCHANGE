"use client";

import { useEffect, useRef, useState } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useTranslations } from "next-intl";
import { X, ZoomIn, Image as ImageIcon, Shield, User } from "lucide-react";
import { cn } from "@/lib/utils";

interface Message {
  id?: string;
  sender: string;
  senderId?: string;
  content: string;
  timestamp: string;
  avatar?: string;
  isAdmin?: boolean;
  attachments?: string[];
}

interface TradeMessagesViewProps {
  messages: Message[];
  buyerId?: string;
  sellerId?: string;
}

// Helper to extract images from message content
// Handles: markdown format ![alt](url), plain URLs, and relative paths
function extractImages(content: string): { text: string; images: string[] } {
  const images: string[] = [];
  let text = content;

  // 1. Extract markdown image format: ![alt](url) or ![Image](url)
  const markdownImageRegex = /!\[([^\]]*)\]\(([^)]+)\)/gi;
  text = text.replace(markdownImageRegex, (match, alt, url) => {
    // Handle relative URLs (add origin if needed)
    const imageUrl = url.startsWith('/') ? url : url;
    images.push(imageUrl);
    return "";
  });

  // 2. Extract plain image URLs (https://... ending with image extension)
  const plainUrlRegex = /(https?:\/\/[^\s]+\.(jpg|jpeg|png|gif|webp|bmp|svg))/gi;
  text = text.replace(plainUrlRegex, (match) => {
    if (!images.includes(match)) {
      images.push(match);
    }
    return "";
  });

  // 3. Extract relative image paths like /uploads/...
  const relativePathRegex = /(\/uploads\/[^\s]+\.(jpg|jpeg|png|gif|webp|bmp|svg))/gi;
  text = text.replace(relativePathRegex, (match) => {
    if (!images.includes(match)) {
      images.push(match);
    }
    return "";
  });

  return { text: text.trim(), images };
}

export function TradeMessagesView({ messages, buyerId, sellerId }: TradeMessagesViewProps) {
  const t = useTranslations("ext");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);

  // Auto-scroll to bottom on mount and when messages change
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

  if (!messages || messages.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-[400px] text-center border rounded-lg bg-muted/30">
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

  return (
    <>
      {/* Messages container with fixed height and scroll */}
      <div
        ref={containerRef}
        className="h-[400px] overflow-y-auto border rounded-lg bg-gradient-to-b from-muted/20 to-background p-4 space-y-4"
      >
        {messages.map((message, index) => {
          const { text, images } = extractImages(message.content);
          const isAdminMessage = message.isAdmin;
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
                  src={message.avatar || "/img/placeholder.svg"}
                  alt={message.sender}
                />
                <AvatarFallback className={cn(
                  "text-xs font-medium",
                  isAdminMessage ? "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300" :
                  isBuyer ? "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300" :
                  isSeller ? "bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-300" :
                  "bg-muted"
                )}>
                  {message.sender?.charAt(0)?.toUpperCase() || "?"}
                </AvatarFallback>
              </Avatar>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-medium text-sm truncate">
                    {message.sender}
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
                    {message.timestamp}
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

                  {/* Additional attachments from message */}
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
        })}

        {/* Scroll anchor */}
        <div ref={messagesEndRef} />
      </div>

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
            alt={t("full_size")}
            className="max-h-[90vh] max-w-[90vw] object-contain rounded-lg shadow-2xl animate-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </>
  );
}
