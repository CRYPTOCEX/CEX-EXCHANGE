import { ArrowLeft, Shield, Zap, User, Clock } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { PAGE_PADDING } from "@/app/[locale]/(dashboard)/theme-config";

export default function Loading() {
  return (
    <div className={`container ${PAGE_PADDING}`}>
      {/* Back Button */}
      <div className="mb-6">
        <Button variant="outline" className="gap-2" disabled>
          <ArrowLeft className="h-4 w-4" />
          Back to Support
        </Button>
      </div>

      <div className="flex flex-col h-full overflow-hidden flex-1">
        {/* Enhanced Header */}
        <div className="mb-4">
          <Card className="border-0 bg-gradient-to-r from-white via-blue-50/50 to-indigo-50/30 dark:from-zinc-900 dark:via-blue-950/20 dark:to-indigo-950/10 shadow-xl backdrop-blur-sm rounded-2xl overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-r from-blue-600/5 to-indigo-600/5 dark:from-blue-400/5 dark:to-indigo-400/5"></div>
            <CardHeader className="relative bg-white/50 dark:bg-zinc-900/50 backdrop-blur-sm p-4 md:p-6">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3 flex-1">
                  {/* Icon */}
                  <div className="p-2 md:p-3 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-xl shadow-lg">
                    <Shield className="h-5 w-5 md:h-6 md:w-6 text-white" />
                  </div>

                  {/* Title and Info */}
                  <div className="flex-1 min-w-0">
                    <CardTitle className="text-lg md:text-2xl text-zinc-900 dark:text-zinc-100 mb-1 md:mb-2">
                      <Skeleton className="h-8 w-64" />
                    </CardTitle>
                    <CardDescription className="text-zinc-600 dark:text-zinc-400 text-sm">
                      <div className="flex flex-wrap items-center gap-2 md:gap-4">
                        <Skeleton className="h-4 w-20" />
                        <span className="hidden md:inline">•</span>
                        <Skeleton className="h-4 w-32 hidden md:inline" />
                        <div className="flex items-center gap-2">
                          <Avatar className="h-4 w-4 md:h-5 md:w-5">
                            <AvatarFallback className="text-xs bg-zinc-200 dark:bg-zinc-700">
                              <Skeleton className="h-full w-full" />
                            </AvatarFallback>
                          </Avatar>
                          <Skeleton className="h-4 w-24" />
                        </div>
                        <div className="flex items-center gap-1 md:gap-2">
                          <Zap className="h-3 w-3 md:h-4 md:w-4 text-green-500" />
                          <Skeleton className="h-4 w-20" />
                        </div>
                      </div>
                    </CardDescription>
                  </div>
                </div>

                {/* Status Badges */}
                <div className="flex flex-col md:flex-row gap-2 md:gap-3 items-end md:items-start ml-2">
                  <div className="flex gap-2">
                    <Skeleton className="h-6 w-16" />
                    <Skeleton className="h-6 w-16" />
                  </div>
                  <div className="flex gap-2">
                    <Skeleton className="h-8 w-32" />
                  </div>
                </div>
              </div>
            </CardHeader>
          </Card>
        </div>

        {/* Responsive Layout */}
        <div className="flex-1 flex flex-col lg:grid lg:grid-cols-4 gap-4 md:gap-8 min-h-0">
          {/* Mobile Tabs - Hidden on Desktop */}
          <div className="lg:hidden flex flex-col flex-1 min-h-0">
            <div className="flex gap-2 mb-4">
              <Skeleton className="h-10 flex-1" />
              <Skeleton className="h-10 flex-1" />
              <Skeleton className="h-10 flex-1" />
            </div>

            {/* Mobile Chat Area */}
            <Card className="flex flex-col flex-1 min-h-0 border-0 bg-white/80 dark:bg-zinc-900/80 backdrop-blur-sm shadow-xl rounded-2xl overflow-hidden">
              <CardHeader className="pb-3 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/50 dark:to-indigo-950/50 backdrop-blur-sm p-4">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                    <Shield className="h-4 w-4 text-blue-500" />
                    Admin Conversation
                  </CardTitle>
                </div>
              </CardHeader>
              <CardContent className="flex-1 overflow-y-auto space-y-4 p-4">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="flex gap-3">
                    <Skeleton className="h-8 w-8 rounded-full" />
                    <div className="flex-1 space-y-2">
                      <Skeleton className="h-4 w-24" />
                      <Skeleton className="h-20 w-full" />
                    </div>
                  </div>
                ))}
              </CardContent>
              <div className="p-4 border-t border-zinc-200 dark:border-zinc-800">
                <Skeleton className="h-16 w-full" />
              </div>
            </Card>
          </div>

          {/* Desktop Layout - Enhanced Chat Area */}
          <div className="hidden lg:block lg:col-span-3 min-h-0">
            <Card className="flex flex-col h-full border-0 bg-white/80 dark:bg-zinc-900/80 backdrop-blur-sm shadow-xl rounded-2xl overflow-hidden">
              <CardHeader className="pb-4 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/50 dark:to-indigo-950/50 backdrop-blur-sm">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                    <Shield className="h-5 w-5 text-blue-500" />
                    Admin Conversation
                  </CardTitle>
                  <div className="flex items-center gap-2 text-sm text-zinc-600 dark:text-zinc-400">
                    <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
                    <span>Live conversation</span>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="flex-1 overflow-y-auto space-y-6 p-6">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="flex gap-4">
                    <Skeleton className="h-10 w-10 rounded-full" />
                    <div className="flex-1 space-y-2">
                      <Skeleton className="h-4 w-32" />
                      <Skeleton className="h-24 w-full" />
                    </div>
                  </div>
                ))}
              </CardContent>
              <div className="p-6 border-t border-zinc-200 dark:border-zinc-800">
                <Skeleton className="h-20 w-full" />
              </div>
            </Card>
          </div>

          {/* Desktop Sidebar - Hidden on Mobile */}
          <div className="hidden lg:block lg:col-span-1 min-h-0 overflow-auto">
            <div className="space-y-6 h-full">
              {/* Customer Info */}
              <Card className="border-0 bg-gradient-to-br from-white to-blue-50/30 dark:from-zinc-900 dark:to-blue-950/20 shadow-xl backdrop-blur-sm rounded-2xl overflow-hidden">
                <CardHeader className="pb-4">
                  <CardTitle className="text-base text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                    <User className="h-5 w-5 text-blue-500" />
                    Customer Info
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center gap-4">
                    <Skeleton className="h-12 w-12 rounded-full" />
                    <div className="flex-1 space-y-2">
                      <Skeleton className="h-4 w-24" />
                      <Skeleton className="h-3 w-32" />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <Skeleton className="h-16 w-full" />
                    <Skeleton className="h-16 w-full" />
                  </div>
                </CardContent>
              </Card>

              {/* Agent Info */}
              <Card className="border-0 bg-gradient-to-br from-white to-blue-50/30 dark:from-zinc-900 dark:to-blue-950/20 shadow-xl backdrop-blur-sm rounded-2xl overflow-hidden">
                <CardHeader className="pb-4">
                  <CardTitle className="text-base text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                    <Shield className="h-5 w-5 text-blue-500" />
                    Assigned Agent
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center gap-4">
                    <Skeleton className="h-12 w-12 rounded-full" />
                    <div className="flex-1 space-y-2">
                      <Skeleton className="h-4 w-24" />
                      <Skeleton className="h-3 w-32" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Status Timeline */}
              <Card className="border-0 bg-white/80 dark:bg-zinc-900/80 shadow-xl backdrop-blur-sm rounded-2xl">
                <CardHeader>
                  <CardTitle className="text-base text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                    <Clock className="h-5 w-5 text-blue-500" />
                    Progress Timeline
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="flex items-center gap-3">
                      <Skeleton className="w-3 h-3 rounded-full" />
                      <div className="flex-1 space-y-1">
                        <Skeleton className="h-4 w-20" />
                        <Skeleton className="h-3 w-32" />
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
