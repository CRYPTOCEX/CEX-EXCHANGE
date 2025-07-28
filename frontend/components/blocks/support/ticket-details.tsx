"use client";

import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useTranslations } from "next-intl";

interface TicketDetailsProps {
  ticket: Ticket;
}

export function TicketDetails({ ticket }: TicketDetailsProps) {
  const t = useTranslations("components/blocks/support/ticket-details");
  const getStatusStyles = (status: string) => {
    switch (status) {
      case "OPEN":
        return "bg-primary text-primary-foreground";
      case "PENDING":
        return "bg-yellow-500 text-white";
      case "REPLIED":
        return "bg-green-500 text-white";
      case "CLOSED":
        return "bg-secondary text-foreground";
      default:
        return "bg-secondary text-foreground";
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="bg-card text-card-foreground px-4 py-3 flex-none border-b rounded-t-lg">
        <CardTitle className="text-xl font-bold">
          {t("ticket_details")}
        </CardTitle>
      </CardHeader>

      <ScrollArea className="flex-1">
        <CardContent className="px-4 py-3 space-y-3">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
          >
            <Label className="text-sm font-semibold text-zinc-500 dark:text-zinc-400">
              {t("Subject")}
            </Label>
            <p className="text-base font-medium mt-1">{ticket.subject}</p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
          >
            <Label className="text-sm font-semibold text-zinc-500 dark:text-zinc-400">
              {t("Status")}
            </Label>
            <div className="mt-1">
              <Badge
                className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusStyles(ticket.status)}`}
              >
                {ticket.status}
              </Badge>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
          >
            <Label className="text-sm font-semibold text-zinc-500 dark:text-zinc-400">
              {t("Importance")}
            </Label>
            <p className="text-base font-medium mt-1">{ticket.importance}</p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
          >
            <Label className="text-sm font-semibold text-zinc-500 dark:text-zinc-400">
              {t("Created")}
            </Label>
            <p className="text-base font-medium mt-1">
              {formatDate(ticket.createdAt)}
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6 }}
          >
            <Label className="text-sm font-semibold text-zinc-500 dark:text-zinc-400">
              {t("last_updated")}
            </Label>
            <p className="text-base font-medium mt-1">
              {formatDate(ticket.updatedAt)}
            </p>
          </motion.div>
        </CardContent>
        <Separator className="my-4" />
        <CardContent className="px-4 py-3 space-y-3">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.7 }}
          >
            <Label className="text-sm font-semibold text-zinc-500 dark:text-zinc-400">
              {t("User")}
            </Label>
            <div className="flex items-center space-x-3 mt-2">
              <Avatar className="h-10 w-10">
                <AvatarFallback className="text-sm">
                  {ticket.user.firstName?.[0]}
                  {ticket.user.lastName?.[0]}
                </AvatarFallback>
              </Avatar>
              <div>
                <p className="text-base font-medium">
                  {ticket.user.firstName} {ticket.user.lastName}
                </p>
                <p className="text-sm text-zinc-500 dark:text-zinc-400">
                  {ticket.user.email}
                </p>
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.8 }}
          >
            <Label className="text-sm font-semibold text-zinc-500 dark:text-zinc-400">
              {t("assigned_agent")}
            </Label>
            <div className="flex items-center space-x-3 mt-2">
              <Avatar className="h-10 w-10">
                <AvatarFallback className="text-sm">
                  {ticket.agent.firstName[0]}
                  {ticket.agent.lastName[0]}
                </AvatarFallback>
              </Avatar>
              <div>
                <p className="text-base font-medium">
                  {ticket.agent.firstName} {ticket.agent.lastName}
                </p>
                <p className="text-sm text-zinc-500 dark:text-zinc-400">
                  {t("last_login")}
                  {formatDate(ticket.agent.lastLogin)}
                </p>
              </div>
            </div>
          </motion.div>
        </CardContent>
      </ScrollArea>
    </Card>
  );
}
