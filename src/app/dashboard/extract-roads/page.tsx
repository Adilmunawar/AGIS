import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Route } from "lucide-react";

export default function ExtractRoadsPage() {
  return (
    <div className="flex items-center justify-center h-full bg-gray-100/50">
        <Card className="w-full max-w-lg text-center shadow-none border-0 bg-transparent">
            <CardHeader>
                <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-primary/20 to-primary/5">
                   <Route className="h-10 w-10 text-primary" />
                </div>
                <CardTitle className="mt-4 text-2xl font-bold">
                    Extract Roads
                </CardTitle>
                <CardDescription className="mt-2 text-lg text-muted-foreground">
                    This feature is coming soon.
                </CardDescription>
            </CardHeader>
            <CardContent>
                <p>
                    The infrastructure for the Python Web Worker is in place.
                </p>
            </CardContent>
        </Card>
    </div>
  );
}
