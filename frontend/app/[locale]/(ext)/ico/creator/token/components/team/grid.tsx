"use client";

import { motion } from "framer-motion";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Edit, Trash2 } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Icon } from "@iconify/react";
import { useTranslations } from "next-intl";

type TeamMemberGridItemProps = {
  member: icoTeamMemberAttributes;
  itemVariants: any;
  onEdit: () => void;
  onDelete: () => void;
};

export default function TeamMemberGridItem({
  member,
  itemVariants,
  onEdit,
  onDelete,
}: TeamMemberGridItemProps) {
  const t = useTranslations("ext");
  return (
    <motion.div
      variants={itemVariants}
      layout
      exit={{ opacity: 0, scale: 0.8 }}
      className="h-full"
    >
      <Card className="h-full overflow-hidden hover:shadow-md transition-all duration-300 flex flex-col group">
        <CardHeader className="pb-2 relative">
          <div className="absolute top-3 right-3 z-10">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 rounded-full bg-background/80 backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-opacity duration-200"
                >
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
                  >
                    <circle cx="12" cy="12" r="1" />
                    <circle cx="12" cy="5" r="1" />
                    <circle cx="12" cy="19" r="1" />
                  </svg>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={onEdit}>
                  <Edit className="h-4 w-4 mr-2" />
                  {t("Edit")}
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  className="text-destructive"
                  onSelect={onDelete}
                >
                  <Trash2 className="h-4 w-4 mr-2 text-destructive" />
                  {t("Delete")}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
          <div className="flex flex-col items-center text-center">
            <div className="relative mb-3 group-hover:scale-105 transition-transform duration-300">
              <div className="h-24 w-24 rounded-full overflow-hidden border-4 border-background shadow-md">
                <img
                  src={member.avatar || "/img/placeholder.svg"}
                  alt={member.name}
                  className="h-full w-full object-cover"
                />
              </div>
            </div>
            <CardTitle className="text-xl">{member.name}</CardTitle>
            <CardDescription className="text-md font-medium text-primary">
              {member.role}
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent className="flex-grow">
          <p className="text-sm text-center mb-4 line-clamp-4">{member.bio}</p>
        </CardContent>
        <CardFooter className="flex justify-center gap-3 pt-0 pb-4">
          {member.twitter && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <a
                    href={member.twitter}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <Button
                      variant="outline"
                      size="icon"
                      className="rounded-full h-9 w-9"
                    >
                      <Icon icon="mdi:twitter" width="24" height="24" />
                    </Button>
                  </a>
                </TooltipTrigger>
                <TooltipContent>Twitter</TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
          {member.linkedin && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <a
                    href={member.linkedin}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <Button
                      variant="outline"
                      size="icon"
                      className="rounded-full h-9 w-9"
                    >
                      <Icon icon="mdi:linkedin" width="24" height="24" />
                    </Button>
                  </a>
                </TooltipTrigger>
                <TooltipContent>{t("LinkedIn")}</TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
          {member.website && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <a
                    href={member.website}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <Button
                      variant="outline"
                      size="icon"
                      className="rounded-full h-9 w-9"
                    >
                      <Icon icon="mdi:web" width="24" height="24" />
                    </Button>
                  </a>
                </TooltipTrigger>
                <TooltipContent>{t("Website")}</TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
          {member.github && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <a
                    href={member.github}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <Button
                      variant="outline"
                      size="icon"
                      className="rounded-full h-9 w-9"
                    >
                      <Icon icon="mdi:github" width="24" height="24" />
                    </Button>
                  </a>
                </TooltipTrigger>
                <TooltipContent>{t("GitHub")}</TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
        </CardFooter>
      </Card>
    </motion.div>
  );
}
