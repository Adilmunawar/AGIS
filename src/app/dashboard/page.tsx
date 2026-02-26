import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Map, ArrowLeft } from "lucide-react";

export default function DashboardHome() {
  return (
    <div className="flex items-center justify-center h-full bg-gray-100/50">
        <Card className="w-full max-w-lg text-center shadow-none border-0 bg-transparent">
            <CardHeader>
                <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-primary/20 to-primary/5">
                   <Map className="h-10 w-10 text-primary" />
                </div>
                <CardTitle className="mt-4 text-2xl font-bold">
                    Welcome to the GIS Dashboard
                </CardTitle>
                <CardDescription className="mt-2 text-lg text-muted-foreground">
                    Your serverless geospatial processing platform.
                </CardDescription>
            </CardHeader>
            <CardContent>
                <p className="flex items-center justify-center gap-2">
                    <ArrowLeft className="h-5 w-5 text-muted-foreground"/>
                    Select a tool from the sidebar to get started.
                </p>
            </CardContent>
        </Card>
    </div>
  );
}
