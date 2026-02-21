'use client';

import * as React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useDropzone } from 'react-dropzone';
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
import { Loader2, User as UserIcon, UploadCloud } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

// Schema for form validation - updated photoURL schema to accept data URIs
const accountSchema = z.object({
  displayName: z
    .string()
    .min(2, { message: 'Name must be at least 2 characters.' })
    .max(50, { message: 'Name cannot be longer than 50 characters.' }),
  photoURL: z.string(), // Accept any string (URL or data URI)
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
  
  // Dropzone logic to handle file upload and convert to data URI
  const onDrop = React.useCallback(
    (acceptedFiles: File[]) => {
      const file = acceptedFiles[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = (e) => {
          const dataUrl = e.target?.result as string;
          form.setValue('photoURL', dataUrl, { shouldValidate: true });
        };
        reader.readAsDataURL(file);
      }
    },
    [form]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/jpeg': ['.jpeg', '.jpg'],
      'image/png': ['.png'],
      'image/webp': ['.webp'],
    },
    multiple: false,
  });


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
             <div className="space-y-4">
               <FormLabel>Profile Picture</FormLabel>
                <div className="flex items-center gap-4">
                    <Avatar className="h-20 w-20">
                        <AvatarImage src={form.watch('photoURL')} />
                        <AvatarFallback className="bg-primary/10 text-primary font-semibold text-2xl">
                        {form.watch('displayName')?.charAt(0).toUpperCase() ??
                            user?.email?.charAt(0).toUpperCase() ??
                            'A'}
                        </AvatarFallback>
                    </Avatar>
                    
                    <div
                        {...getRootProps()}
                        className={`
                        flex-1 h-20 flex flex-col items-center justify-center
                        p-4 text-center cursor-pointer rounded-lg 
                        border-2 border-dashed border-border
                        transition-colors duration-200 ease-in-out
                        ${isDragActive ? 'bg-accent border-primary' : 'bg-background hover:bg-accent/50'}
                        `}
                    >
                        <input {...getInputProps()} />
                        <UploadCloud className="h-6 w-6 text-muted-foreground mb-1" />
                        <p className="text-xs text-muted-foreground">
                            {isDragActive ? 'Drop the image here...' : "Drag & drop or click to upload"}
                        </p>
                    </div>
                </div>
            </div>

            <FormField
              control={form.control}
              name="displayName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Display Name</FormLabel>
                  <FormControl>
                    <Input placeholder="Developer" {...field} />
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
