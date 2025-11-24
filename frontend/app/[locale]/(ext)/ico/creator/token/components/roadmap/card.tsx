"use client";

import { motion } from "framer-motion";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  CardFooter,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  ChevronDown,
  ChevronUp,
  CheckCircle,
  CalendarDays,
  AlertTriangle,
  Clock,
  Edit,
  Trash2,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { useTranslations } from "next-intl";

type RoadmapCardProps = {
  item: icoRoadmapItemAttributes;
  index: number;
  isExpanded: boolean;
  toggleExpansion: () => void;
  handleToggleComplete: () => void;
  handleEdit: () => void;
  itemVariants: any;
};

export default function RoadmapCard({
  item,
  index,
  isExpanded,
  toggleExpansion,
  handleToggleComplete,
  handleEdit,
  itemVariants,
}: RoadmapCardProps) {
  const t = useTranslations("ext");
  const isCompleted = !!item.completed;

  const getDaysFromNow = (dateString: string) => {
    const itemDate = new Date(dateString);
    const today = new Date();
    const diffTime = itemDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    if (diffDays < 0) return "Overdue";
    if (diffDays === 0) return "Today";
    if (diffDays === 1) return "Tomorrow";
    return `${diffDays} days from now`;
  };

  const daysInfo = !isCompleted ? getDaysFromNow(item.date) : null;
  const isOverdue = daysInfo === "Overdue";

  const getStatusBadge = (completed: boolean) => {
    if (completed) {
      return (
        <Badge className="bg-green-500/90 hover:bg-green-500 text-white transition-colors">
          <CheckCircle className="h-3 w-3 mr-1" />
          {t("Completed")}
        </Badge>
      );
    }
    return (
      <Badge
        variant="secondary"
        className="bg-gray-500/90 hover:bg-gray-500 text-white transition-colors"
      >
        <CalendarDays className="h-3 w-3 mr-1" />
        {t("Upcoming")}
      </Badge>
    );
  };

  return (
    <motion.div variants={itemVariants} layout exit={{ opacity: 0, y: -20 }}>
      <Card
        className={cn(
          "overflow-hidden transition-all duration-300 relative",
          isCompleted ? "border-l-4 border-l-green-500" : "",
          isOverdue && !isCompleted ? "border-l-4 border-l-amber-500" : "",
          isExpanded ? "shadow-md" : "hover:shadow-md"
        )}
      >
        {/* Timeline dot */}
        <div className="absolute left-4 top-6 h-8 w-8 rounded-full z-10 hidden md:flex items-center justify-center">
          {isCompleted ? (
            <motion.div
              className="h-8 w-8 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center"
              initial={{ scale: 0.8 }}
              animate={{ scale: 1 }}
              transition={{ duration: 0.3 }}
            >
              <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400" />
            </motion.div>
          ) : (
            <motion.div
              className={cn(
                "h-8 w-8 rounded-full flex items-center justify-center",
                isOverdue
                  ? "bg-amber-100 dark:bg-amber-900/30"
                  : "bg-gray-100 dark:bg-gray-800"
              )}
            >
              {isOverdue ? (
                <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-400" />
              ) : (
                <CalendarDays className="h-5 w-5 text-gray-600 dark:text-gray-400" />
              )}
            </motion.div>
          )}
        </div>
        <CardHeader className="md:pl-16 pb-2">
          <div className="flex justify-between items-start">
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <CardTitle className="text-lg">{item.title}</CardTitle>
                {getStatusBadge(isCompleted)}
                {!isCompleted && isOverdue && (
                  <Badge
                    variant="outline"
                    className="text-amber-600 border-amber-300 bg-amber-50 dark:bg-amber-900/20 dark:border-amber-800"
                  >
                    <AlertTriangle className="h-3 w-3 mr-1" />
                    {t("Overdue")}
                  </Badge>
                )}
              </div>
              <CardDescription className="mt-1 flex items-center gap-2">
                <Clock className="h-3.5 w-3.5" />
                {new Date(item.date).toLocaleDateString("en-US", {
                  year: "numeric",
                  month: "short",
                  day: "numeric",
                })}
                {!isCompleted && daysInfo && (
                  <span
                    className={cn(
                      "text-xs px-2 py-0.5 rounded-full",
                      isOverdue
                        ? "bg-amber-50 text-amber-700 dark:bg-amber-900/20 dark:text-amber-400"
                        : "bg-muted text-muted-foreground"
                    )}
                  >
                    {daysInfo}
                  </span>
                )}
              </CardDescription>
            </div>
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={toggleExpansion}
              >
                {isExpanded ? (
                  <ChevronUp className="h-4 w-4" />
                ) : (
                  <ChevronDown className="h-4 w-4" />
                )}
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-8 w-8">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className="lucide lucide-more-vertical"
                    >
                      <circle cx="12" cy="12" r="1" />
                      <circle cx="12" cy="5" r="1" />
                      <circle cx="12" cy="19" r="1" />
                    </svg>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={handleToggleComplete}>
                    {isCompleted ? (
                      <>
                        <CalendarDays className="h-4 w-4 mr-2" />
                        {t("mark_as_upcoming")}
                      </>
                    ) : (
                      <>
                        <CheckCircle className="h-4 w-4 mr-2 text-green-600" />{" "}
                        {t("mark_as_completed")}
                      </>
                    )}
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={handleEdit}>
                    <Edit className="h-4 w-4 mr-2" />
                    {t("Edit")}
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    className="text-destructive"
                    onSelect={handleEdit}
                  >
                    <Trash2 className="h-4 w-4 mr-2 text-destructive" />
                    {t("Delete")}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </CardHeader>
        <CardContent
          className={cn(
            "md:pl-16 transition-all duration-300",
            isExpanded ? "pb-4" : "pb-0"
          )}
        >
          <AnimatePresence>
            {(isExpanded || index === 0) && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.3 }}
              >
                <p className="text-sm mb-4">{item.description}</p>
              </motion.div>
            )}
          </AnimatePresence>
        </CardContent>
        {isExpanded && (
          <CardFooter className="md:pl-16 pt-0 pb-4 flex justify-end">
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={handleEdit}>
                <Edit className="h-3.5 w-3.5 mr-1" />
                {t("Edit")}
              </Button>
              <Button
                variant={isCompleted ? "outline" : "default"}
                size="sm"
                onClick={handleToggleComplete}
              >
                {isCompleted ? (
                  <>
                    <CalendarDays className="h-3.5 w-3.5 mr-1" />
                    {t("mark_as_upcoming")}
                  </>
                ) : (
                  <>
                    <CheckCircle className="h-3.5 w-3.5 mr-1" />
                    {t("mark_as_completed")}
                  </>
                )}
              </Button>
            </div>
          </CardFooter>
        )}
      </Card>
    </motion.div>
  );
}
