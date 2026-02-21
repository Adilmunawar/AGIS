'use client';

import * as React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { useUser, useAuth } from '@/firebase';
import { updateProfile } from 'firebase/auth';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Loader2, User as UserIcon } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

// Schema for form validation
const accountSchema = z.object({
  displayName: z
    .string()
    .min(2, { message: 'Name must be at least 2 characters.' })
    .max(50, { message: 'Name cannot be longer than 50 characters.' }),
  photoURL: z.string().url({ message: 'Please enter a valid URL.' }).or(z.literal('')),
});

// Props for the dialog
type AccountSettingsDialogProps = {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
};

export function AccountSettingsDialog({
  isOpen,
  onOpenChange,
}: AccountSettingsDialogProps) {
  const { user } = useUser();
  const auth = useAuth();
  const { toast } = useToast();
  const [isSaving, setIsSaving] = React.useState(false);

  const form = useForm<z.infer<typeof accountSchema>>({
    resolver: zodResolver(accountSchema),
    defaultValues: {
      displayName: user?.displayName ?? '',
      photoURL: user?.photoURL ?? '',
    },
  });

  // Reset form when user data changes or dialog opens
  React.useEffect(() => {
    if (user && isOpen) {
      form.reset({
        displayName: user.displayName ?? '',
        photoURL: user.photoURL ?? '',
      });
    }
  }, [user, isOpen, form]);

  const onSubmit = async (values: z.infer<typeof accountSchema>) => {
    if (!auth.currentUser) return;
    setIsSaving(true);
    try {
      await updateProfile(auth.currentUser, {
        displayName: values.displayName,
        photoURL: values.photoURL,
      });
      toast({
        title: 'Account Updated',
        description: 'Your profile has been successfully updated.',
      });
      onOpenChange(false); // Close dialog on success
    } catch (error) {
      console.error('Error updating profile: ', error);
      toast({
        variant: 'destructive',
        title: 'Update Failed',
        description: 'An error occurred while updating your profile.',
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 mb-2">
            <UserIcon className="h-7 w-7 text-primary" />
          </div>
          <DialogTitle className="text-center text-xl">
            Account Settings
          </DialogTitle>
          <DialogDescription className="text-center">
            Manage your public profile information.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(onSubmit)}
            className="space-y-6 pt-4"
          >
            <div className="flex items-center gap-4">
              <Avatar className="h-20 w-20">
                <AvatarImage src={form.watch('photoURL')} />
                <AvatarFallback className="bg-primary/10 text-primary font-semibold text-2xl">
                  {form.watch('displayName')?.charAt(0).toUpperCase() ??
                    user?.email?.charAt(0).toUpperCase() ??
                    'A'}
                </AvatarFallback>
              </Avatar>
              <div className="w-full space-y-2">
                <FormField
                  control={form.control}
                  name="photoURL"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Profile Picture URL</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="https://example.com/image.png"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            <FormField
              control={form.control}
              name="displayName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Display Name</FormLabel>
                  <FormControl>
                    <Input placeholder="John Doe" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button type="submit" disabled={isSaving} className="w-full h-11 text-base">
                {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Save Changes
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
