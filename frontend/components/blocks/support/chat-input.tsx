"use client";

import React, { useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CardFooter } from "@/components/ui/card";
import { Icon } from "@iconify/react";
import { motion } from "framer-motion";

// Import the Shadcn tooltip components
import {
  TooltipProvider,
  Tooltip,
  TooltipTrigger,
  TooltipContent,
} from "@/components/ui/tooltip";

interface ChatInputProps {
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onSubmit: (e: React.FormEvent<HTMLFormElement>) => void;
  onFileSelect: (file: File) => void;
  isReplying?: boolean;
  ticketClosed?: boolean; // New prop to indicate if ticket is closed
}

export function ChatInput({
  value,
  onChange,
  onSubmit,
  onFileSelect,
  isReplying,
  ticketClosed,
}: ChatInputProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onFileSelect(file);
    }
  };

  // Disable interactions if the ticket is closed or if currently replying
  const isDisabled = ticketClosed || isReplying;

  // Show different tooltip messages based on why it's disabled
  const tooltipMessage = ticketClosed
    ? "Cannot reply to a closed ticket"
    : "Please wait... sending your message";

  return (
    <CardFooter className="p-4 border-t bg-card text-card-foreground">
      <TooltipProvider>
        <form
          onSubmit={(e) => {
            // If disabled, prevent the form from actually submitting
            if (isDisabled) {
              e.preventDefault();
              return;
            }
            onSubmit(e);
          }}
          className="flex w-full space-x-2"
        >
          {/* Input Field */}
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="grow">
                <Input
                  value={value}
                  onChange={onChange}
                  placeholder="Type your message..."
                  className="text-sm bg-input text-foreground placeholder:text-muted-foreground w-full"
                  disabled={isDisabled}
                />
              </div>
            </TooltipTrigger>
            {isDisabled && <TooltipContent>{tooltipMessage}</TooltipContent>}
          </Tooltip>

          {/* Hidden File Input */}
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            className="hidden"
            accept="image/*"
            disabled={isDisabled}
          />

          {/* Attach File Button */}
          <Tooltip>
            <TooltipTrigger asChild>
              <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}>
                <Button
                  type="button"
                  variant="outline"
                  className="h-10 w-10 p-2"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isDisabled}
                >
                  <Icon icon="mdi:paperclip" className="w-5 h-5" />
                </Button>
              </motion.div>
            </TooltipTrigger>
            {isDisabled && <TooltipContent>{tooltipMessage}</TooltipContent>}
          </Tooltip>

          {/* Send Button */}
          <Tooltip>
            <TooltipTrigger asChild>
              <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}>
                <Button
                  type="submit"
                  className="h-10 w-10 p-2 bg-primary hover:bg-primary/90 text-primary-foreground"
                  disabled={isDisabled}
                >
                  <Icon icon="mdi:send" className="w-5 h-5" />
                </Button>
              </motion.div>
            </TooltipTrigger>
            {isDisabled && <TooltipContent>{tooltipMessage}</TooltipContent>}
          </Tooltip>
        </form>
      </TooltipProvider>
    </CardFooter>
  );
}
