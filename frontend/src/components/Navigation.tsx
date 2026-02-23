import { Link, useLocation } from '@tanstack/react-router';
import { MapPin, History } from 'lucide-react';
import { cn } from '@/lib/utils';

export function Navigation() {
  const location = useLocation();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-card border-t border-border">
      <div className="flex items-center justify-around py-2">
        <Link
          to="/"
          className={cn(
            "flex flex-col items-center gap-1 px-3 py-2 rounded-lg transition-colors",
            location.pathname === '/' 
              ? "text-primary bg-primary/10" 
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          <MapPin className="h-5 w-5" />
          <span className="text-xs font-medium">Traccia</span>
        </Link>
        
        <Link
          to="/sessions"
          className={cn(
            "flex flex-col items-center gap-1 px-3 py-2 rounded-lg transition-colors",
            location.pathname.startsWith('/sessions')
              ? "text-primary bg-primary/10"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          <History className="h-5 w-5" />
          <span className="text-xs font-medium">Cronologia</span>
        </Link>
      </div>
    </nav>
  );
}
