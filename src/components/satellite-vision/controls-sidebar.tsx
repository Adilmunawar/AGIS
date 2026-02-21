'use client';

import * as React from 'react';
import {
  LogOut,
  Bot,
  PenSquare,
  Server,
  ChevronsLeft,
  ChevronsRight,
  Minus,
  MoreHorizontal,
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
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { AccountSettingsDialog } from '@/components/account/account-settings-dialog';
import { Label } from '@/components/ui/label';

export type ActiveTool = 'detection' | 'digitize';

type ControlsSidebarProps = {
  activeTool: ActiveTool;
  setActiveTool: (tool: ActiveTool) => void;
  isCollapsed: boolean;
  setIsCollapsed: (collapsed: boolean) => void;
  onOpenSettings: () => void;
  drawColor: string;
  setDrawColor: (color: string) => void;
  lineStyle: 'solid' | 'dashed';
  setLineStyle: (style: 'solid' | 'dashed') => void;
};

const COLOR_PALETTE = [
  { name: 'Green', value: 'hsl(var(--primary))' },
  { name: 'Red', value: 'hsl(var(--destructive))' },
  { name: 'Blue', value: 'hsl(var(--chart-2))' },
  { name: 'Yellow', value: 'hsl(var(--chart-3))' },
  { name: 'Purple', value: 'hsl(var(--chart-5))' },
];

function SidebarButton({
  icon,
  label,
  isCollapsed,
  disableHoverEffect,
  ...props
}: {
  icon: React.ReactNode;
  label: string;
  isCollapsed: boolean;
  disableHoverEffect?: boolean;
  [key: string]: any;
}) {
  const activeClass = 'bg-accent text-accent-foreground';

  const interactionClasses = !disableHoverEffect
    ? 'transition-all duration-200 ease-in-out transform hover:-translate-y-1 hover:scale-105'
    : 'transition-colors duration-200';

  if (isCollapsed) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className={cn(
              'h-12 w-12 shrink-0 rounded-lg',
              props.isActive ? activeClass : '',
              interactionClasses
            )}
            aria-label={label}
            {...props}
          >
            {icon}
          </Button>
        </TooltipTrigger>
        <TooltipContent
          side="right"
          sideOffset={8}
          className="bg-popover text-popover-foreground border-border rounded-lg shadow-xl"
        >
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
        props.isActive ? activeClass : '',
        interactionClasses
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
  drawColor,
  setDrawColor,
  lineStyle,
  setLineStyle,
}: ControlsSidebarProps) {
  const auth = useAuth();
  const { user } = useUser();
  const { toast } = useToast();
  const [isAccountSettingsOpen, setIsAccountSettingsOpen] =
    React.useState(false);

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
          'absolute top-0 left-0 z-[1200] flex h-full shrink-0 flex-col bg-card shadow-2xl transition-all duration-300 ease-in-out rounded-tr-[2.5rem] rounded-br-[2.5rem]',
          isCollapsed ? 'w-20' : 'w-64'
        )}
      >
        <div className="flex flex-1 flex-col">
          {/* Main tools */}
          <div>
            <nav className="flex flex-col gap-2 p-4">
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

            {/* Contextual Options for Digitizing */}
            {!isCollapsed && activeTool === 'digitize' && (
              <div className="px-4 pb-4 animate-in fade-in duration-300">
                <Separator className="my-2" />
                <div className="space-y-4 pt-2">
                   <h3 className="text-sm font-semibold text-muted-foreground px-0">STYLE</h3>
                   <div className="space-y-3">
                      <Label className="text-sm">Color</Label>
                       <div className="flex items-center justify-between">
                        {COLOR_PALETTE.map((color) => (
                           <Tooltip key={color.name}>
                            <TooltipTrigger asChild>
                               <button
                                onClick={() => setDrawColor(color.value)}
                                className={cn(
                                    'h-7 w-7 rounded-full border-2 transition-all',
                                    drawColor === color.value
                                    ? 'border-ring scale-110'
                                    : 'border-transparent hover:scale-110'
                                )}
                                style={{ backgroundColor: color.value }}
                                aria-label={`Set color to ${color.name}`}
                                />
                            </TooltipTrigger>
                            <TooltipContent side="top"><p>{color.name}</p></TooltipContent>
                           </Tooltip>
                        ))}
                       </div>
                   </div>
                   <div className="space-y-3">
                       <Label className="text-sm">Line Style</Label>
                       <div className="grid grid-cols-2 gap-2">
                           <Button 
                                variant={lineStyle === 'solid' ? 'secondary' : 'ghost'} 
                                onClick={() => setLineStyle('solid')}
                                className="h-9"
                            >
                                <Minus className="h-4 w-4 mr-2" /> Solid
                           </Button>
                           <Button 
                                variant={lineStyle === 'dashed' ? 'secondary' : 'ghost'} 
                                onClick={() => setLineStyle('dashed')}
                                className="h-9"
                            >
                                <MoreHorizontal className="h-4 w-4 mr-2" /> Dashed
                           </Button>
                       </div>
                   </div>
                </div>
              </div>
            )}
          </div>
          
          <div className="flex-grow" />

          {/* Footer controls */}
          <div className="flex flex-col gap-2 p-2">
            <SidebarButton
              icon={<Server size={24} />}
              label="Backend Settings"
              isCollapsed={isCollapsed}
              onClick={onOpenSettings}
              isActive={false}
            />

            <button
              onClick={() => setIsAccountSettingsOpen(true)}
              className={cn(
                'p-2 rounded-lg transition-all duration-300 ease-in-out w-full',
                'flex items-center gap-3 transform hover:-translate-y-1',
                isCollapsed && 'justify-center'
              )}
            >
              <Avatar className="h-10 w-10 border-2 border-primary/20">
                <AvatarImage
                  src={user?.photoURL ?? ''}
                  alt={user?.displayName ?? ''}
                />
                <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                  {user?.displayName?.charAt(0).toUpperCase() ??
                    user?.email?.charAt(0).toUpperCase() ??
                    'U'}
                </AvatarFallback>
              </Avatar>
              {!isCollapsed && (
                <div className="flex-1 truncate text-left">
                  <p className="truncate text-sm font-medium">Account</p>
                </div>
              )}
            </button>

            <SidebarButton
              icon={<LogOut size={24} />}
              label="Sign Out"
              isCollapsed={isCollapsed}
              onClick={handleSignOut}
              isActive={false} // This button is never "active"
            />

            <Separator className="my-1" />

            <SidebarButton
              icon={
                isCollapsed ? (
                  <ChevronsRight size={24} />
                ) : (
                  <ChevronsLeft size={24} />
                )
              }
              label={isCollapsed ? 'Expand' : 'Collapse'}
              isCollapsed={isCollapsed}
              onClick={() => setIsCollapsed(!isCollapsed)}
              isActive={false}
              disableHoverEffect={true}
            />
          </div>
        </div>
        <AccountSettingsDialog
          isOpen={isAccountSettingsOpen}
          onOpenChange={setIsAccountSettingsOpen}
        />
      </aside>
    </TooltipProvider>
  );
}
