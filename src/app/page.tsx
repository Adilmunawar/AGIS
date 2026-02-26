'use client';

import { useUser, useAuth } from '@/firebase';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { Loader2, LogOut, User as UserIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { initiateSignOut } from '@/firebase/non-blocking-login';
import { useToast } from '@/hooks/use-toast';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';

export default function HomePage() {
  const { user, isUserLoading } = useUser();
  const auth = useAuth();
  const router = useRouter();
  const { toast } = useToast();

  useEffect(() => {
    if (!isUserLoading && !user) {
      router.replace('/login');
    }
  }, [user, isUserLoading, router]);

  const handleSignOut = () => {
    initiateSignOut(auth);
    toast({
      title: 'Signed Out',
      description: 'You have been successfully signed out.',
    });
  };

  if (isUserLoading || !user) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="flex h-screen w-full flex-col items-center justify-center bg-secondary/40 p-4">
       <div className="w-full max-w-md rounded-lg p-1 animated-gradient">
        <Card className="w-full border-0 shadow-2xl">
          <CardHeader className="text-center">
            <Avatar className="mx-auto h-24 w-24 border-4 border-primary/20">
              <AvatarImage src={user.photoURL ?? ''} alt={user.displayName ?? 'User'} />
              <AvatarFallback>
                <UserIcon className="h-12 w-12 text-muted-foreground" />
              </AvatarFallback>
            </Avatar>
          </CardHeader>
          <CardContent className="text-center">
              <CardTitle className="text-3xl">Welcome to AGIS</CardTitle>
              <CardDescription className="mt-2 text-lg">
                  You are logged in as
              </CardDescription>
              <p className="mt-1 font-semibold text-lg text-foreground">
                  {user.displayName || user.email}
              </p>
          </CardContent>
          <CardFooter>
              <Button onClick={handleSignOut} className="w-full" variant="secondary">
                  <LogOut className="mr-2 h-4 w-4" />
                  Sign Out
              </Button>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}
