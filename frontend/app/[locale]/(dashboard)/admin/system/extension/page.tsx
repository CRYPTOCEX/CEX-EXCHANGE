"use client";
import { useEffect, useMemo } from "react";
import { TopBar } from "./top-bar";
import { ExtensionTable } from "./table";
import { useExtensionStore } from "@/store/extension";
import { Card, CardContent } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle, Download } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function ExtensionsPage() {
  const { extensions, fetchExtensions } = useExtensionStore();
  
  useEffect(() => {
    if (extensions.length === 0) {
      fetchExtensions();
    }
  }, [extensions.length]);

  // Calculate update statistics
  const updateStats = useMemo(() => {
    if (!extensions || !Array.isArray(extensions)) {
      return {
        total: 0,
        withUpdates: 0,
        extensions: []
      };
    }
    
    const extensionsWithUpdates = extensions.filter(ext => ext.hasLicenseUpdate);
    return {
      total: extensions.length,
      withUpdates: extensionsWithUpdates.length,
      extensions: extensionsWithUpdates
    };
  }, [extensions]);

  return (
    <div className="space-y-6">
      <TopBar />
      
      {/* Update Summary Alert */}
      {updateStats.withUpdates > 0 && (
        <Alert className="border-orange-200 bg-orange-50 dark:border-orange-800 dark:bg-orange-950/20">
          <AlertCircle className="h-4 w-4 text-orange-600 dark:text-orange-400" />
          <AlertDescription className="flex items-center justify-between w-full">
            <div>
              <span className="font-medium text-orange-800 dark:text-orange-200">
                {updateStats.withUpdates} extension{updateStats.withUpdates !== 1 ? 's' : ''} 
              </span>
              <span className="text-orange-700 dark:text-orange-300 ml-1">
                {updateStats.withUpdates === 1 ? 'has' : 'have'} updates available from the license system
              </span>
            </div>
            <Button 
              variant="outline" 
              size="sm"
              className="border-orange-300 text-orange-700 hover:bg-orange-100 dark:border-orange-700 dark:text-orange-300 dark:hover:bg-orange-900/20"
              onClick={() => {
                // Scroll to table or refresh
                fetchExtensions();
              }}
            >
              <Download className="h-4 w-4 mr-2" />
              Refresh
            </Button>
          </AlertDescription>
        </Alert>
      )}

      <Card>
        <ExtensionTable />
      </Card>
    </div>
  );
}
