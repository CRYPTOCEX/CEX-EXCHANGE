"use client";
import React from "react";
import Image from "next/image";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Linkedin, Twitter, Globe } from "lucide-react";
export function TeamMembers({
  members,
}: {
  members: icoTeamMemberAttributes[] | null;
}) {
  if (!members) return null;
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {members.map((member) => (
        <Card key={member.id} className={"bg-white dark:bg-zinc-900 border-teal-200 dark:border-teal-700 border"}>
          <CardHeader className="flex flex-row items-center gap-4">
            <Image
              src={member.avatar || "/img/placeholder.svg"}
              alt={member.name}
              width={48}
              height={48}
              className="rounded-full"
            />
            <div>
              <CardTitle className="text-base">{member.name}</CardTitle>
              <CardDescription>{member.role}</CardDescription>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">{member.bio}</p>
          </CardContent>
          {(member.linkedin || member.twitter || member.website) && (
            <CardFooter className="flex gap-2">
              {member.linkedin && (
                <a
                  href={member.linkedin}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={"text-muted-foreground hover:text-teal-600 dark:hover:text-teal-400"}
                >
                  <Linkedin className="h-4 w-4" />
                  <span className="sr-only">LinkedIn</span>
                </a>
              )}
              {member.twitter && (
                <a
                  href={member.twitter}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={"text-muted-foreground hover:text-teal-600 dark:hover:text-teal-400"}
                >
                  <Twitter className="h-4 w-4" />
                  <span className="sr-only">Twitter</span>
                </a>
              )}
              {member.website && (
                <a
                  href={member.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={"text-muted-foreground hover:text-teal-600 dark:hover:text-teal-400"}
                >
                  <Globe className="h-4 w-4" />
                  <span className="sr-only">Website</span>
                </a>
              )}
            </CardFooter>
          )}
        </Card>
      ))}
    </div>
  );
}
