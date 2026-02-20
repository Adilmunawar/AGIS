'use client';

import * as React from 'react';
import {
  LogOut,
  Bot,
  PenSquare,
  Server,
  ChevronLeft,
  ChevronRight,
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
import { Separator } from '@/components/ui/separator';

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
  const activeClass = 'bg-accent text-accent-foreground';
  
  // Add smooth transitions and a hover "lift" and "grow" effect for inactive buttons
  const interactionClasses = 'transition-all duration-200 ease-in-out transform hover:-translate-y-1 hover:scale-105';

  if (isCollapsed) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className={cn(
              'h-12 w-12 shrink-0 rounded-lg',
              props.isActive ? activeClass : interactionClasses // Apply effects only if inactive
            )}
            aria-label={label}
            {...props}
          >
            {icon}
          </Button>
        </TooltipTrigger>
        <TooltipContent side="right" sideOffset={8} className="bg-popover text-popover-foreground border-border rounded-lg shadow-xl">
            <p className="font-semibold">{label}</p>
        </TooltipContent>
      </Tooltip>
    );
  }

  return (
    <Button
      variant="ghost"
      className={cn(
        'h-12 w-full justify-start px-4',
        props.isActive ? activeClass : interactionClasses // Apply effects only if inactive
      )}
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
          'relative flex h-full shrink-0 flex-col bg-card shadow-2xl z-10 transition-all duration-300 ease-in-out rounded-tr-[2.5rem] rounded-br-[2.5rem]',
          isCollapsed ? 'w-20' : 'w-64'
        )}
      >
        {/* Tool Switcher */}
        <nav className="flex flex-col gap-2 p-4 flex-grow">
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

        {!isCollapsed && <Separator className="mx-4 my-2 bg-border" />}

        {/* Footer actions */}
        <div className="flex flex-col gap-2 p-2">
           <SidebarButton
            icon={<Server size={24} />}
            label="Backend Settings"
            isCollapsed={isCollapsed}
            onClick={onOpenSettings}
            isActive={false} // This button is never "active" in the same way as a tool
          />

          <div className={cn("p-2 rounded-lg transition-all duration-300 ease-in-out", 
            isCollapsed 
              ? 'flex justify-center' 
              : 'flex items-center gap-3 hover:bg-accent/50 transform hover:-translate-y-1'
          )}>
             <Avatar className="h-10 w-10 border-2 border-primary/20">
                <AvatarFallback className="bg-primary/10 text-primary font-semibold">
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
            isActive={false} // This button is never "active"
          />
        </div>
        
        <Button
            variant="outline"
            size="icon"
            onClick={() => setIsCollapsed(!isCollapsed)}
            className={cn(
              'absolute top-1/2 z-20 -translate-y-1/2 rounded-full shadow-lg transition-all duration-300 ease-in-out transform hover:scale-110',
              'bg-background border-2 border-primary/20 text-primary hover:bg-accent',
               isCollapsed 
                ? 'h-10 w-10 right-[-20px]' 
                : 'h-12 w-12 right-[-24px]'
            )}
            aria-label="Toggle Sidebar"
        >
            {isCollapsed ? <ChevronRight size={20} /> : <ChevronLeft size={24} />}
        </Button>
      </aside>
    </TooltipProvider>
  );
}
