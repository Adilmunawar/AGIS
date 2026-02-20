'use client';

import * as React from 'react';
import {
  LogOut,
  Bot,
  PenSquare,
  Server,
  ChevronLeft,
  Menu,
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
import { Avatar, AvatarFallback } from '@/components/ui/avatar';

export type ActiveTool = 'detection' | 'digitize';

type ControlsSidebarProps = {
  activeTool: ActiveTool;
  setActiveTool: (tool: ActiveTool) => void;
  isCollapsed: boolean;
  setIsCollapsed: (collapsed: boolean) => void;
  onOpenSettings: () => void;
};

// A more intelligent button that handles collapsed/expanded state
function SidebarButton({
  icon,
  label,
  isCollapsed,
  ...props
}: {
  icon: React.ReactNode;
  label: string;
  isCollapsed: boolean;
  [key: string]: any;
}) {
  if (isCollapsed) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant={props.isActive ? 'secondary' : 'ghost'}
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

  return (
    <Button
      variant={props.isActive ? 'secondary' : 'ghost'}
      className="h-12 w-full justify-start px-4"
      {...props}
    >
      <div className="mr-4 shrink-0">{icon}</div>
      <span className="truncate">{label}</span>
    </Button>
  );
}

export function ControlsSidebar({
  activeTool,
  setActiveTool,
  isCollapsed,
  setIsCollapsed,
  onOpenSettings,
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
          'flex h-full shrink-0 flex-col border-r bg-card shadow-lg z-10 transition-all duration-300 ease-in-out',
          isCollapsed ? 'w-20' : 'w-64'
        )}
      >
        {/* Header/Toggle */}
        <div
          className={cn(
            'flex h-16 items-center border-b px-4',
            isCollapsed ? 'justify-center' : 'justify-between'
          )}
        >
          {!isCollapsed && (
            <span className="text-lg font-semibold">Tools</span>
          )}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="shrink-0"
          >
            {isCollapsed ? <Menu size={20} /> : <ChevronLeft size={20} />}
          </Button>
        </div>

        {/* Tool Switcher */}
        <nav className="flex flex-col gap-2 p-2 flex-grow">
          <SidebarButton
            icon={<Bot size={24} />}
            label="Auto-Detection"
            isCollapsed={isCollapsed}
            isActive={activeTool === 'detection'}
            onClick={() => setActiveTool('detection')}
          />
          <SidebarButton
            icon={<PenSquare size={24} />}
            label="Manual Parceling"
            isCollapsed={isCollapsed}
            isActive={activeTool === 'digitize'}
            onClick={() => setActiveTool('digitize')}
          />
        </nav>

        {/* Footer actions */}
        <div className="flex flex-col gap-2 p-2 border-t">
           <SidebarButton
            icon={<Server size={24} />}
            label="Backend Settings"
            isCollapsed={isCollapsed}
            onClick={onOpenSettings}
          />

          <div className={cn("p-2 rounded-lg", isCollapsed ? 'flex justify-center' : 'flex items-center gap-3 hover:bg-secondary')}>
             <Avatar className="h-10 w-10">
                <AvatarFallback>
                  {user?.email?.charAt(0).toUpperCase() ?? 'U'}
                </AvatarFallback>
              </Avatar>
              {!isCollapsed && (
                <div className="flex-1 truncate">
                  <p className="truncate text-sm font-medium">
                    {user?.email}
                  </p>
                </div>
              )}
          </div>

          <SidebarButton
            icon={<LogOut size={24} />}
            label="Sign Out"
            isCollapsed={isCollapsed}
            onClick={handleSignOut}
          />
        </div>
      </aside>
    </TooltipProvider>
  );
}
