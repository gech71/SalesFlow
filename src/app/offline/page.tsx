
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Icons } from '@/components/icons';

export default function OfflinePage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/40 p-4">
      <Card className="w-full max-w-md text-center">
        <CardHeader>
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-destructive/10">
            <Icons.wifiOff className="h-10 w-10 text-destructive" />
          </div>
          <CardTitle className="mt-4 text-2xl">You're Offline</CardTitle>
          <CardDescription>
            It seems you've lost your connection. Please check your network and try again.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            This app has offline capabilities, but you may need to reconnect to access all features.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
