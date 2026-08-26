import { Link, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

const navItems = [
  { icon: '🏠', label: 'Home', path: '/home' },
  { icon: '💬', label: 'Chat', path: '/chat' },
  { icon: '🏆', label: 'Fitness Hub', path: '/fitness' },
  { icon: '📋', label: 'Schemes', path: '/schemes' },
];

export default function Sidebar() {
  const location = useLocation();

  return (
    <aside className="w-[84px] h-screen flex flex-col items-center pt-6 pb-8 border-r border-[#F3DCB8]/60 bg-white/50 backdrop-blur-sm sticky top-0 shrink-0">
      {/* Logo */}
      <div className="w-10 h-10 rounded-full bg-orange-500 text-white flex items-center justify-center font-bold text-lg shadow-lg shadow-orange-500/25 mb-6">
        ₹
      </div>

      {/* Nav Items */}
      <TooltipProvider delayDuration={200}>
        <nav className="flex flex-col gap-2">
          {navItems.map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <Tooltip key={item.path}>
                <TooltipTrigger asChild>
                  <Link to={item.path}>
                    <Button
                      variant="ghost"
                      className={cn(
                        "w-12 h-12 rounded-xl text-xl hover:bg-orange-50 transition-all",
                        isActive && "bg-orange-50 text-orange-600 shadow-sm"
                      )}
                    >
                      {item.icon}
                    </Button>
                  </Link>
                </TooltipTrigger>
                <TooltipContent side="right">{item.label}</TooltipContent>
              </Tooltip>
            );
          })}
        </nav>
      </TooltipProvider>

      <div className="flex-1" />

      {/* Profile */}
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 text-lg">
              Y
            </Button>
          </TooltipTrigger>
          <TooltipContent side="right">Profile</TooltipContent>
        </Tooltip>
      </TooltipProvider>
    </aside>
  );
}