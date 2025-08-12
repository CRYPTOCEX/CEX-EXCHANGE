"use client";

import { motion } from "framer-motion";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Edit, Trash2 } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Icon } from "@iconify/react";
import { useTranslations } from "next-intl";

type TeamMemberListItemProps = {
  member: icoTeamMemberAttributes;
  index: number;
  onEdit: () => void;
  onDelete: () => void;
};

export default function TeamMemberListItem({
  member,
  index,
  onEdit,
  onDelete,
}: TeamMemberListItemProps) {
  const t = useTranslations("ext");
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.3, delay: index * 0.05 }}
    >
      <Card className="overflow-hidden hover:shadow-md transition-all duration-300 group">
        <div className="flex flex-col md:flex-row p-4 gap-4">
          <div className="flex-shrink-0 flex justify-center">
            <div className="h-20 w-20 md:h-24 md:w-24 rounded-full overflow-hidden border-4 border-background shadow-md">
              <img
                src={member.avatar || "/img/placeholder.svg"}
                alt={member.name}
                className="h-full w-full object-cover"
              />
            </div>
          </div>
          <div className="flex-grow">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-2">
              <div>
                <h3 className="text-lg font-semibold">{member.name}</h3>
                <p className="text-primary font-medium">{member.role}</p>
              </div>
              <div className="flex items-center gap-2">
                <div className="flex space-x-1">
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
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 rounded-full"
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
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 rounded-full"
                            >
                              <Icon
                                icon="mdi:linkedin"
                                width="24"
                                height="24"
                              />
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
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 rounded-full"
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
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 rounded-full"
                            >
                              <Icon icon="mdi:github" width="24" height="24" />
                            </Button>
                          </a>
                        </TooltipTrigger>
                        <TooltipContent>{t("GitHub")}</TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  )}
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 rounded-full"
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
                      <Trash2 className="h-4 w-4 mr-2 text-destructive" />{" "}
                      {t("Delete")}
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
            <p className="text-sm mt-2 line-clamp-2">{member.bio}</p>
          </div>
        </div>
      </Card>
    </motion.div>
  );
}
