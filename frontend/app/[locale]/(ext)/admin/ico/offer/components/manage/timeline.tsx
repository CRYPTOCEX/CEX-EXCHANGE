// frontend/components/OfferingTimeline.tsx
"use client";

import { useState } from "react";
import { format, formatDistanceToNow } from "date-fns";
import { motion, AnimatePresence } from "framer-motion";
import {
  CheckCircle,
  Flag,
  PauseCircle,
  PlayCircle,
  X,
  FileText,
  AlertTriangle,
  Clock,
  Filter,
  ChevronDown,
  ChevronRight,
  RefreshCw,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardFooter,
} from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useAdminOfferStore } from "@/store/ico/admin/admin-offer-store";
export function OfferingTimeline() {
  // Use the timeline events directly from the store
  const { timeline = [], fetchCurrentOffer, offering } = useAdminOfferStore();
  const [activeTab, setActiveTab] = useState("all");
  const [expandedEvents, setExpandedEvents] = useState<Record<string, boolean>>(
    {}
  );
  const toggleEventExpanded = (eventId: string) => {
    setExpandedEvents((prev) => ({
      ...prev,
      [eventId]: !prev[eventId],
    }));
  };
  const getEventIcon = (type: string) => {
    switch (type) {
      case "approval":
        return <CheckCircle className="h-6 w-6 text-white" />;
      case "rejection":
        return <X className="h-6 w-6 text-white" />;
      case "pause":
        return <PauseCircle className="h-6 w-6 text-white" />;
      case "resume":
        return <PlayCircle className="h-6 w-6 text-white" />;
      case "flag":
        return <Flag className="h-6 w-6 text-white" />;
      case "unflag":
        return <Flag className="h-6 w-6 text-white" />;
      case "note":
        return <FileText className="h-6 w-6 text-white" />;
      case "submission":
        return <FileText className="h-6 w-6 text-white" />;
      default:
        return <CheckCircle className="h-6 w-6 text-white" />;
    }
  };
  const getEventColor = (type: string) => {
    switch (type) {
      case "approval":
        return "bg-green-500";
      case "rejection":
        return "bg-red-500";
      case "pause":
        return "bg-orange-500";
      case "resume":
        return "bg-green-500";
      case "flag":
        return "bg-red-500";
      case "unflag":
        return "bg-blue-500";
      case "note":
        return "bg-slate-500";
      case "submission":
        return "bg-blue-500";
      default:
        return "bg-blue-500";
    }
  };
  const getEventTitle = (type: string) => {
    switch (type) {
      case "approval":
        return "Approved";
      case "rejection":
        return "Rejected";
      case "pause":
        return "Paused";
      case "resume":
        return "Resumed";
      case "flag":
        return "Flagged";
      case "unflag":
        return "Unflagged";
      case "note":
        return "Note Added";
      case "submission":
        return "Submitted";
      default:
        return type.charAt(0).toUpperCase() + type.slice(1);
    }
  };
  const formatDate = (dateString: string) => {
    try {
      return format(new Date(dateString), "PPP 'at' p");
    } catch (e) {
      return "Invalid date";
    }
  };
  const formatRelativeTime = (dateString: string) => {
    try {
      return formatDistanceToNow(new Date(dateString), {
        addSuffix: true,
      });
    } catch (e) {
      return "Unknown time";
    }
  };
  const filteredEvents = (timeline || []).filter((event) => {
    if (activeTab === "all") return true;
    if (activeTab === "important") return event.important;
    return event.type === activeTab;
  });
  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2 justify-between w-full">
            <div className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-muted-foreground" />
              <span>Activity Timeline</span>
            </div>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6"
                    onClick={() => fetchCurrentOffer(offering?.id)}
                  >
                    <RefreshCw className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Refresh timeline</TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        </CardTitle>
        <Tabs
          defaultValue="all"
          value={activeTab}
          onValueChange={setActiveTab}
          className="mt-2"
        >
          <div className="flex items-center justify-between">
            <TabsList>
              <TabsTrigger value="all" className="text-xs">
                All
              </TabsTrigger>
              <TabsTrigger value="important" className="text-xs">
                Important
              </TabsTrigger>
              <TabsTrigger value="approval" className="text-xs">
                Approvals
              </TabsTrigger>
              <TabsTrigger value="flag" className="text-xs">
                Flags
              </TabsTrigger>
            </TabsList>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="h-8 gap-1">
                  <Filter className="h-3.5 w-3.5" />
                  <span className="text-xs">Filter</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => setActiveTab("all")}>
                  All Events
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setActiveTab("submission")}>
                  Submissions
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setActiveTab("approval")}>
                  Approvals
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setActiveTab("rejection")}>
                  Rejections
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setActiveTab("pause")}>
                  Pauses
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setActiveTab("resume")}>
                  Resumes
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setActiveTab("flag")}>
                  Flags
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setActiveTab("note")}>
                  Notes
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </Tabs>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="space-y-0">
          <AnimatePresence>
            {filteredEvents.map((event, index) => {
              return (
                <motion.div
                  key={event.id}
                  initial={{
                    opacity: 0,
                    y: 20,
                  }}
                  animate={{
                    opacity: 1,
                    y: 0,
                  }}
                  exit={{
                    opacity: 0,
                    height: 0,
                  }}
                  transition={{
                    duration: 0.3,
                    delay: index * 0.05,
                  }}
                  className="relative"
                >
                  <div className="flex gap-4 py-4 relative">
                    {index < filteredEvents.length - 1 && (
                      <div className="absolute top-12 bottom-0 left-5 w-0.5 bg-border" />
                    )}
                    <div className="relative z-10">
                      <div
                        className={cn(
                          "flex h-10 w-10 items-center justify-center rounded-full",
                          getEventColor(event.type)
                        )}
                      >
                        {getEventIcon(event.type)}
                      </div>
                    </div>
                    <div className="flex-1 space-y-2">
                      <div
                        className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 cursor-pointer"
                        onClick={() => toggleEventExpanded(event.id)}
                      >
                        <div className="flex items-center gap-2">
                          <h4 className="font-medium">
                            {getEventTitle(event.type)}
                          </h4>
                          <Badge
                            variant="outline"
                            className={cn(
                              "text-xs",
                              event.type === "approval" &&
                                "bg-green-50 text-green-700 border-green-200",
                              event.type === "rejection" &&
                                "bg-red-50 text-red-700 border-red-200",
                              event.type === "pause" &&
                                "bg-orange-50 text-orange-700 border-orange-200",
                              event.type === "resume" &&
                                "bg-green-50 text-green-700 border-green-200",
                              event.type === "flag" &&
                                "bg-red-50 text-red-700 border-red-200",
                              event.type === "unflag" &&
                                "bg-blue-50 text-blue-700 border-blue-200",
                              event.type === "note" &&
                                "bg-slate-50 text-slate-700 border-slate-200",
                              event.type === "submission" &&
                                "bg-blue-50 text-blue-700 border-blue-200"
                            )}
                          >
                            {event.type}
                          </Badge>
                          {event.important && (
                            <Badge
                              variant="outline"
                              className="bg-orange-50 text-orange-700 border-orange-200 text-xs"
                            >
                              Important
                            </Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <span className="text-xs text-muted-foreground">
                                  {formatRelativeTime(event.timestamp)}
                                </span>
                              </TooltipTrigger>
                              <TooltipContent>
                                {formatDate(event.timestamp)}
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                          {expandedEvents[event.id] ? (
                            <ChevronDown className="h-4 w-4 text-muted-foreground" />
                          ) : (
                            <ChevronRight className="h-4 w-4 text-muted-foreground" />
                          )}
                        </div>
                      </div>
                      <p className="text-sm text-muted-foreground line-clamp-2">
                        {event.details}
                      </p>
                      <div className="flex items-center gap-2 mt-1">
                        <Avatar className="h-6 w-6">
                          <AvatarImage
                            src={event.adminAvatar || "/img/placeholder.svg"}
                            alt={event.adminName}
                          />
                          <AvatarFallback>
                            {event.adminName.charAt(0)}
                          </AvatarFallback>
                        </Avatar>
                        <span className="text-xs text-muted-foreground">
                          {event.adminName}
                        </span>
                      </div>
                      <AnimatePresence>
                        {expandedEvents[event.id] && (
                          <motion.div
                            initial={{
                              opacity: 0,
                              height: 0,
                            }}
                            animate={{
                              opacity: 1,
                              height: "auto",
                            }}
                            exit={{
                              opacity: 0,
                              height: 0,
                            }}
                            transition={{
                              duration: 0.2,
                            }}
                            className="mt-4 space-y-4"
                          >
                            <div className="rounded-md bg-muted/50 p-3">
                              <div className="text-xs text-muted-foreground mb-1">
                                Full Details:
                              </div>
                              <p className="text-sm">{event.details}</p>
                              <div className="flex flex-wrap gap-2 mt-3">
                                <div className="text-xs bg-muted rounded px-2 py-1">
                                  ID: {event.id}
                                </div>
                                <div className="text-xs bg-muted rounded px-2 py-1">
                                  Offering: {event.offeringName}
                                </div>
                                <div className="text-xs bg-muted rounded px-2 py-1">
                                  Time: {formatDate(event.timestamp)}
                                </div>
                              </div>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
          {filteredEvents.length === 0 && (
            <div className="flex flex-col items-center justify-center py-10">
              <div className="rounded-full bg-muted p-3 mb-3">
                <AlertTriangle className="h-6 w-6 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-medium">No events found</h3>
              <p className="text-sm text-muted-foreground mt-1">
                {activeTab === "all"
                  ? "There are no timeline events for this offering yet."
                  : `No ${activeTab} events found. Try changing the filter.`}
              </p>
              <Button
                variant="outline"
                size="sm"
                className="mt-4"
                onClick={() => setActiveTab("all")}
              >
                View all events
              </Button>
            </div>
          )}
        </div>
      </CardContent>
      <div className="border-t bg-muted/50 flex justify-between p-2">
        <div className="text-xs text-muted-foreground">
          Showing {filteredEvents.length} of {timeline.length} events
        </div>
      </div>
    </Card>
  );
}
