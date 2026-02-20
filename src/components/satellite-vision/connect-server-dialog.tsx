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
          <DialogTitle>Backend Server Settings</DialogTitle>
          <DialogDescription>
            Connect to your remote processing backend. Paste the public URL
            provided by Google Colab (via ngrok) here.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="colab-url" className="text-right">
              Server URL
            </Label>
            <Input
              id="colab-url"
              value={colabUrl}
              onChange={(e) => setColabUrl(e.target.value)}
              className="col-span-3"
              placeholder="https://...ngrok-free.app"
            />
          </div>
        </div>
        <DialogFooter>
          <Button onClick={onSave}>Save & Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
