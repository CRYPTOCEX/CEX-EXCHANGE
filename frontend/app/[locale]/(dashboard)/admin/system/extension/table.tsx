"use client";

import { useExtensionStore } from "@/store/extension";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";
import { Link } from "@/i18n/routing";
import { Switch } from "@/components/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Lightbox } from "@/components/ui/lightbox";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
export function ExtensionTable() {
  const { filteredExtensions, isLoading, error, toggleExtension, fetchExtensions } =
    useExtensionStore();
  if (error) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Error</AlertTitle>
        <AlertDescription className="flex items-center justify-between">
          <span>{error}</span>
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => {
              // Clear error and retry
              useExtensionStore.setState({ error: null });
              fetchExtensions();
            }}
          >
            Retry
          </Button>
        </AlertDescription>
      </Alert>
    );
  }
  if (isLoading) {
    return (
      <div className="space-y-4">
        {[...Array(5)].map((_, index) => (
          <div
            key={index}
            className="flex items-center space-x-4 p-4 bg-background rounded-lg shadow-2xs"
          >
            <Skeleton className="h-12 w-12 rounded-full" />
            <div className="space-y-2 flex-1">
              <Skeleton className="h-4 w-1/4" />
              <Skeleton className="h-4 w-3/4" />
            </div>
            <Skeleton className="h-8 w-24" />
          </div>
        ))}
      </div>
    );
  }
  return (
    <div className="relative">
      <Table>
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            <TableHead className="w-[60%]">Extension</TableHead>
            <TableHead className="w-[20%]">Version</TableHead>
            <TableHead className="w-[20%]">Status</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {filteredExtensions && Array.isArray(filteredExtensions) ? filteredExtensions.map((extension) => {
            return (
              <TableRow key={extension.id} className="group cursor-pointer hover:bg-muted/50">
                <TableCell className="py-4 w-full" onClick={() => window.location.href = `/admin/system/extension/${extension.productId}`}>
                  <div className="flex items-center space-x-4">
                    <Lightbox
                      src={extension.image || "/img/placeholder.svg"}
                      alt={extension.title}
                      className="h-24 min-w-48"
                    />
                    <div className="min-w-0">
                      <h3 className="font-semibold truncate text-foreground">
                        {extension.title}
                      </h3>
                      <p className="text-sm text-zinc-500 dark:text-zinc-400 line-clamp-1">
                        {extension.description}
                      </p>
                    </div>
                  </div>
                </TableCell>
                <TableCell className="font-medium" onClick={() => window.location.href = `/admin/system/extension/${extension.productId}`}>
                  <div className="flex items-center gap-2">
                    <span>{extension.version}</span>
                    {extension.hasLicenseUpdate && (
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger>
                            <div className="flex items-center gap-1 px-2 py-1 bg-orange-100 dark:bg-orange-900/20 text-orange-700 dark:text-orange-400 rounded-full text-xs font-medium">
                              <AlertCircle className="h-3 w-3" />
                              Update
                            </div>
                          </TooltipTrigger>
                          <TooltipContent>
                            <div className="text-sm">
                              <div className="font-medium">New version available: {extension.licenseVersion}</div>
                              {extension.licenseSummary && (
                                <div className="text-muted-foreground mt-1">{extension.licenseSummary}</div>
                              )}
                              {extension.licenseReleaseDate && (
                                <div className="text-muted-foreground text-xs mt-1">
                                  Released: {new Date(extension.licenseReleaseDate).toLocaleDateString()}
                                </div>
                              )}
                            </div>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    )}
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex items-center space-x-2">
                    {!extension.status && parseFloat(extension.version) <= 4 ? (
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <div>
                              <Switch
                                checked={extension.status}
                                onCheckedChange={() => {}}
                                color="success"
                                disabled
                              />
                            </div>
                          </TooltipTrigger>
                          <TooltipContent>
                            <span className="text-xs">
                              You need to activate and install the extension to
                              the latest version before enabling it.
                            </span>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    ) : (
                      <Switch
                        checked={extension.status}
                        onCheckedChange={() => toggleExtension(extension.id)}
                        color="success"
                      />
                    )}
                  </div>
                </TableCell>
              </TableRow>
            );
          }) : (
            <TableRow>
              <TableCell colSpan={3} className="text-center py-8 text-muted-foreground">
                No extensions available
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}
