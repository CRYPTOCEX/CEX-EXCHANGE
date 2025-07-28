import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

export default function PoolLoading() {
  return (
    <div className="animate-in fade-in-50 duration-500">
      <div className="mb-8">
        <div className="flex flex-col md:flex-row justify-start items-center gap-4">
          <Button variant="outline" size="icon" disabled>
            <ArrowLeft className="h-5 w-5 text-muted-foreground" />
          </Button>
          <div className="flex items-center">
            <div className="w-16 h-16 rounded-full bg-primary/10 mr-4 flex items-center justify-center">
              <div className="w-14 h-14 rounded-full bg-muted animate-pulse"></div>
            </div>
            <div>
              <div className="h-8 w-48 bg-muted rounded animate-pulse mb-2"></div>
              <div className="h-4 w-32 bg-muted rounded animate-pulse"></div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2">
          <div className="h-10 w-full bg-muted rounded animate-pulse mb-6"></div>
          <div className="space-y-6">
            <Card>
              <CardHeader className="pb-2">
                <div className="h-6 w-32 bg-muted rounded animate-pulse mb-2"></div>
                <div className="h-4 w-48 bg-muted rounded animate-pulse"></div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="flex flex-col space-y-2">
                      <div className="h-4 w-24 bg-muted rounded animate-pulse"></div>
                      <div className="h-8 w-16 bg-muted rounded animate-pulse"></div>
                    </div>
                  ))}
                </div>
                <Separator className="my-6" />
                <div className="space-y-4">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <div key={i} className="flex justify-between">
                      <div className="h-4 w-24 bg-muted rounded animate-pulse"></div>
                      <div className="h-4 w-16 bg-muted rounded animate-pulse"></div>
                    </div>
                  ))}
                </div>
                <Separator className="my-6" />
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <div className="h-4 w-24 bg-muted rounded animate-pulse"></div>
                    <div className="h-4 w-16 bg-muted rounded animate-pulse"></div>
                  </div>
                  <div className="h-2 w-full bg-muted rounded animate-pulse"></div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <div className="h-6 w-32 bg-muted rounded animate-pulse"></div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {[1, 2, 3].map((i) => (
                    <div
                      key={i}
                      className="h-4 w-full bg-muted rounded animate-pulse"
                    ></div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        <div>
          <div className="sticky top-20">
            <Card>
              <CardHeader>
                <div className="h-6 w-32 bg-muted rounded animate-pulse"></div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <div className="h-4 w-full bg-muted rounded animate-pulse"></div>
                  <div className="h-10 w-full bg-muted rounded animate-pulse"></div>
                </div>
                <div className="space-y-2">
                  <div className="h-4 w-full bg-muted rounded animate-pulse"></div>
                  <div className="h-10 w-full bg-muted rounded animate-pulse"></div>
                </div>
                <div className="h-10 w-full bg-muted rounded animate-pulse"></div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
