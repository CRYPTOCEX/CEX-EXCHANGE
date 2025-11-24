import React from "react";
import { Card, CardContent } from "@/components/ui/card";
export const LoadingState: React.FC = () => {
  return (
    <div className="flex items-center justify-center min-h-[600px]">
      <Card>
        <CardContent className="flex flex-col items-center justify-center p-6">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mb-4" />
          <p className="text-muted-foreground">Loading analytics data...</p>
        </CardContent>
      </Card>
    </div>
  );
};
