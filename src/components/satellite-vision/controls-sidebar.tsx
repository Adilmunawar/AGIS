'use client';

import * as React from 'react';
import {
  LogOut,
  User as UserIcon,
  Bot,
  PenSquare,
  Server,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { useAuth, useUser } from '@/firebase';
import { initiateSignOut } from '@/firebase/non-blocking-login';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

export type ActiveTool = 'detection' | 'digitize';

type ControlsSidebarProps = {
  activeTool: ActiveTool;
  setActiveTool: (tool: ActiveTool) => void;
  onOpenSettings: () => void;
};

// Simple icon button with a tooltip
function SidebarButton({
  icon,
  label,
  isActive,
  ...props
}: {
  icon: React.ReactNode;
  label: string;
  isActive?: boolean;
  [key: string]: any;
}) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          variant={isActive ? 'secondary' : 'ghost'}
          size="icon"
          className="h-12 w-12 shrink-0 rounded-lg"
          aria-label={label}
          {...props}
        >
          {icon}
        </Button>
      </TooltipTrigger>
      <TooltipContent side="right" sideOffset={5}>
        <p>{label}</p>
      </TooltipContent>
    </Tooltip>
  );
}

export function ControlsSidebar({
  activeTool,
  setActiveTool,
  onOpenSettings
}: ControlsSidebarProps) {
  const auth = useAuth();
  const { user } = useUser();
  const { toast } = useToast();

  const handleSignOut = () => {
    initiateSignOut(auth);
    toast({
      title: 'Signed Out',
      description: 'You have been successfully signed out.',
    });
  };

  return (
    <TooltipProvider delayDuration={100}>
      <aside
        className={cn(
          'flex h-full shrink-0 flex-col items-center gap-y-4 border-r border-border bg-card p-2 shadow-lg z-10'
        )}
      >

        {/* Tool Switcher */}
        <nav className="flex flex-col items-center gap-2 mt-4">
          <SidebarButton
            icon={<Bot size={24}/>}
            label="Auto-Detection"
            isActive={activeTool === 'detection'}
            onClick={() => setActiveTool('detection')}
          />
          <SidebarButton
            icon={<PenSquare size={24}/>}
            label="Manual Parceling"
            isActive={activeTool === 'digitize'}
            onClick={() => setActiveTool('digitize')}
          />
        </nav>

        {/* Spacer to push footer to bottom */}
        <div className="mt-auto flex flex-col items-center gap-2">
             <SidebarButton
                icon={<Server size={24}/>}
                label="Backend Settings"
                onClick={onOpenSettings}
            />
            <SidebarButton
              icon={<UserIcon size={24}/>}
              label={user?.email ?? 'User'}
            />
            <SidebarButton
              icon={<LogOut size={24}/>}
              label="Sign Out"
              onClick={handleSignOut}
            />
        </div>
      </aside>
    </TooltipProvider>
  );
}
