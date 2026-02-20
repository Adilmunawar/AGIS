'use client';

import * as React from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Link, Server } from 'lucide-react';

type ConnectServerDialogProps = {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  colabUrl: string;
  setColabUrl: (url: string) => void;
  onSave: () => void;
};

export function ConnectServerDialog({
  isOpen,
  onOpenChange,
  colabUrl,
  setColabUrl,
  onSave,
}: ConnectServerDialogProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 mb-2">
            <Server className="h-7 w-7 text-primary" />
          </div>
          <DialogTitle className="text-center text-xl">
            Backend Server Settings
          </DialogTitle>
          <DialogDescription className="text-center text-muted-foreground px-2">
            Paste your remote backend URL to enable AI processing.
          </DialogDescription>
        </DialogHeader>
        <div className="py-2">
          <Label htmlFor="colab-url" className="text-left mb-2 block font-medium">
              Server URL
          </Label>
          <div className="relative">
            <Link className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
            <Input
              id="colab-url"
              value={colabUrl}
              onChange={(e) => setColabUrl(e.target.value)}
              className="pl-10 h-11"
              placeholder="https://...ngrok-free.app"
            />
          </div>
        </div>
        <DialogFooter>
          <Button onClick={onSave} className="w-full h-11 text-base">Save & Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
