import { useParams, Link } from '@tanstack/react-router';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { MapContainer } from '@/components/MapContainer';
import { useGetSession, useGetRoute } from '@/hooks/useQueries';
import { formatDistance } from '@/lib/utils';
import { ArrowLeft, MapPin, Clock, Route, Calendar, Navigation, User, Ship, Star, CheckCircle } from 'lucide-react';

export default function SessionDetailPage() {
  const { sessionId } = useParams({ from: '/sessions/$sessionId' });
  const { data: session, isLoading, error } = useGetSession(BigInt(sessionId));
  const { data: route } = useGetRoute(session?.routeId || BigInt(0));

  const formatDuration = (nanoseconds: bigint) => {
    const ms = Number(nanoseconds) / 1000000;
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    
    if (hours > 0) {
      return `${hours}h ${minutes % 60}m ${seconds % 60}s`;
    } else if (minutes > 0) {
      return `${minutes}m ${seconds % 60}s`;
    } else {
      return `${seconds}s`;
    }
  };

  const formatDateTime = (nanoseconds: bigint) => {
    const ms = Number(nanoseconds) / 1000000;
    const date = new Date(ms);
    return date.toLocaleString('it-IT', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatTime = (nanoseconds: bigint) => {
    const ms = Number(nanoseconds) / 1000000;
    const date = new Date(ms);
    return date.toLocaleTimeString('it-IT');
  };

  if (error) {
    return (
      <div className="container mx-auto p-4 max-w-md">
        <Card>
          <CardContent className="pt-6 text-center">
            <div className="text-destructive">Errore nel caricamento della sessione</div>
            <Link to="/sessions">
              <Button variant="outline" className="mt-4">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Torna alla cronologia
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="container mx-auto p-4 space-y-4 max-w-md">
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-3/4" />
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-3 gap-4">
              <Skeleton className="h-16" />
              <Skeleton className="h-16" />
              <Skeleton className="h-16" />
            </div>
            <Skeleton className="h-64" />
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="container mx-auto p-4 max-w-md">
        <Card>
          <CardContent className="pt-6 text-center">
            <div className="text-muted-foreground">Sessione non trovata</div>
            <Link to="/sessions">
              <Button variant="outline" className="mt-4">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Torna alla cronologia
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 space-y-4 max-w-md">
      <div className="flex items-center gap-2">
        <Link to="/sessions">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <h1 className="text-lg font-semibold">Dettagli Sessione</h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Ship className="h-5 w-5 text-primary" />
            {session.boatName}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Session Info */}
          <div className="bg-muted/50 rounded-lg p-3 space-y-2">
            <div className="flex items-center gap-2 text-sm">
              <User className="h-4 w-4 text-muted-foreground" />
              <span className="font-medium">{session.skipperName}</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <Ship className="h-4 w-4 text-muted-foreground" />
              <span className="font-medium">{session.boatName}</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <Star className="h-4 w-4 text-muted-foreground" />
              <span className="font-medium">Rating: {session.rating.toString()}</span>
            </div>
            {route && (
              <div className="flex items-center gap-2 text-sm">
                <Route className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium">{route.name}</span>
              </div>
            )}
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="text-center space-y-1">
              <div className="text-xl font-bold text-primary">
                {formatDuration(session.duration)}
              </div>
              <div className="text-xs text-muted-foreground flex items-center justify-center gap-1">
                <Clock className="h-3 w-3" />
                Durata
              </div>
            </div>
            
            <div className="text-center space-y-1">
              <div className="text-xl font-bold text-primary">
                {formatDistance(session.distance)}
              </div>
              <div className="text-xs text-muted-foreground flex items-center justify-center gap-1">
                <Navigation className="h-3 w-3" />
                Distanza
              </div>
            </div>

            <div className="text-center space-y-1">
              <div className="text-xl font-bold text-primary">
                {session.pointsCount.toString()}
              </div>
              <div className="text-xs text-muted-foreground flex items-center justify-center gap-1">
                <MapPin className="h-3 w-3" />
                Punti GPS
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <span className="text-muted-foreground">Inizio:</span>
              <span>{formatDateTime(session.startTime)}</span>
            </div>
          </div>

          {/* Timing data */}
          {(session.intermediateTime || session.finalTime) && (
            <div className="bg-muted/50 rounded-lg p-3 space-y-2">
              <div className="text-sm font-medium text-center">Tempi Registrati</div>
              <div className="space-y-1 text-xs">
                {session.intermediateTime && (
                  <div className="flex justify-between items-center">
                    <span className="flex items-center gap-1">
                      <CheckCircle className="h-3 w-3 text-green-600" />
                      Intermedio:
                    </span>
                    <span className="font-mono">{formatTime(session.intermediateTime)}</span>
                  </div>
                )}
                {session.finalTime && (
                  <div className="flex justify-between items-center">
                    <span className="flex items-center gap-1">
                      <CheckCircle className="h-3 w-3 text-green-600" />
                      Arrivo:
                    </span>
                    <span className="font-mono">{formatTime(session.finalTime)}</span>
                  </div>
                )}
              </div>
            </div>
          )}

          <div className="flex gap-2">
            <Badge variant="default">
              Completata
            </Badge>
            <Badge variant="outline">
              {session.positions.length} posizioni registrate
            </Badge>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Route className="h-4 w-4" />
            Percorso Registrato
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-64 rounded-lg overflow-hidden border">
            <MapContainer 
              positions={session.positions.map(p => ({ lat: p.lat, lon: p.lon }))}
              showPath={true}
              route={route || undefined}
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
