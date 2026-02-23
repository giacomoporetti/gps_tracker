import { Link } from '@tanstack/react-router';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useGetSessions, useGetRoute } from '@/hooks/useQueries';
import { useInternetIdentity } from '@/hooks/useInternetIdentity';
import { formatDistance } from '@/lib/utils';
import { History, MapPin, Clock, Route, ChevronRight, Navigation, User, Ship, Star, LogIn } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { it } from 'date-fns/locale';
import type { Session } from '@/backend';

function SessionCard({ session }: { session: Session }) {
  const { data: route } = useGetRoute(session.routeId);

  const formatDuration = (nanoseconds: bigint) => {
    const ms = Number(nanoseconds) / 1000000;
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    
    if (hours > 0) {
      return `${hours}h ${minutes % 60}m`;
    } else if (minutes > 0) {
      return `${minutes}m ${seconds % 60}s`;
    } else {
      return `${seconds}s`;
    }
  };

  const formatDate = (nanoseconds: bigint) => {
    const ms = Number(nanoseconds) / 1000000;
    const date = new Date(ms);
    return formatDistanceToNow(date, { addSuffix: true, locale: it });
  };

  return (
    <Link
      to="/sessions/$sessionId"
      params={{ sessionId: session.id.toString() }}
    >
      <Card className="hover:bg-accent/50 transition-colors cursor-pointer">
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div className="space-y-2 flex-1">
              <div className="flex items-center gap-2">
                <MapPin className="h-4 w-4 text-primary" />
                <span className="font-medium">
                  {session.boatName}
                </span>
              </div>

              <div className="space-y-1">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <User className="h-3 w-3" />
                  <span>{session.skipperName}</span>
                  <Star className="h-3 w-3 ml-2" />
                  <span>Rating: {session.rating.toString()}</span>
                </div>
                {route && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Route className="h-3 w-3" />
                    <span>{route.name}</span>
                  </div>
                )}
              </div>
              
              <div className="flex gap-2 flex-wrap">
                <Badge variant="secondary" className="text-xs">
                  <Clock className="h-3 w-3 mr-1" />
                  {formatDuration(session.duration)}
                </Badge>
                <Badge variant="outline" className="text-xs">
                  <Navigation className="h-3 w-3 mr-1" />
                  {formatDistance(session.distance)}
                </Badge>
                <Badge variant="outline" className="text-xs">
                  <MapPin className="h-3 w-3 mr-1" />
                  {session.pointsCount.toString()} punti
                </Badge>
              </div>
              
              <div className="text-sm text-muted-foreground">
                {formatDate(session.startTime)}
              </div>
            </div>
            
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}

export default function SessionsPage() {
  const { identity, login, isInitializing, isLoggingIn } = useInternetIdentity();
  const { data: sessions, isLoading, error } = useGetSessions();

  if (isInitializing) {
    return (
      <div className="container mx-auto p-4 max-w-md">
        <Card>
          <CardContent className="pt-6 text-center">
            <div className="text-muted-foreground">Inizializzazione...</div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!identity) {
    return (
      <div className="container mx-auto p-4 space-y-4 max-w-md">
        <Card>
          <CardHeader className="text-center">
            <CardTitle className="flex items-center justify-center gap-2">
              <History className="h-5 w-5 text-primary" />
              Cronologia Sessioni
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-center">
            <div className="space-y-2">
              <LogIn className="h-12 w-12 text-muted-foreground mx-auto" />
              <div className="text-muted-foreground">
                Effettua il login per visualizzare le tue sessioni
              </div>
            </div>
            <Button 
              onClick={login} 
              size="lg" 
              className="w-full"
              disabled={isLoggingIn}
            >
              {isLoggingIn ? 'Accesso in corso...' : 'Accedi'}
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto p-4 max-w-md">
        <Card>
          <CardContent className="pt-6 text-center">
            <div className="text-destructive">Errore nel caricamento delle sessioni</div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 space-y-4 max-w-md">
      <Card>
        <CardHeader className="text-center">
          <CardTitle className="flex items-center justify-center gap-2">
            <History className="h-5 w-5 text-primary" />
            Cronologia Sessioni
          </CardTitle>
        </CardHeader>
      </Card>

      {isLoading ? (
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => (
            <Card key={i}>
              <CardContent className="pt-6">
                <div className="space-y-3">
                  <Skeleton className="h-4 w-3/4" />
                  <div className="flex gap-2">
                    <Skeleton className="h-6 w-16" />
                    <Skeleton className="h-6 w-20" />
                    <Skeleton className="h-6 w-16" />
                  </div>
                  <Skeleton className="h-4 w-1/2" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : sessions && sessions.length > 0 ? (
        <div className="space-y-3">
          {sessions.map((session) => (
            <SessionCard key={session.id.toString()} session={session} />
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="pt-6 text-center">
            <div className="space-y-2">
              <History className="h-12 w-12 text-muted-foreground mx-auto" />
              <div className="text-muted-foreground">Nessuna sessione trovata</div>
              <div className="text-sm text-muted-foreground">
                Inizia il tuo primo tracciamento per vedere le sessioni qui
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
