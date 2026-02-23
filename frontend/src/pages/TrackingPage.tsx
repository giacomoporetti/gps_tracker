import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { MapContainer } from '@/components/MapContainer';
import { Timer } from '@/components/Timer';
import { Play, Square, MapPin, Clock, Route, Navigation, User, Ship, Star, LogIn, CheckCircle, Timer as TimerIcon, AlertTriangle, Plus, Edit, Trash2, Eye, Info, Loader2, Settings } from 'lucide-react';
import { useSaveSession, useGetLastSession, useFindRoutesWithinDistance, useGetRoutes, useCreateRoute, useUpdateRoute, useDeleteRoute, useGetCallerUserProfile, useSaveCallerUserProfile } from '@/hooks/useQueries';
import { useInternetIdentity } from '@/hooks/useInternetIdentity';
import { useActor } from '@/hooks/useActor';
import { calculateTotalDistance, formatDistance, checkCorrectDirectionCrossing, checkOppositeDirectionCrossing } from '@/lib/utils';
import { toast } from 'sonner';
import type { Position, Route as RouteType, Point, UserProfile } from '@/backend';

interface TrackingPosition extends Position {
  lat: number;
  lon: number;
  timestamp: bigint;
}

interface SessionConfig {
  skipperName: string;
  boatName: string;
  rating: number;
}

interface TimingData {
  startTime: number | null;
  intermediateTime: number | null;
  finalTime: number | null;
}

interface RouteFormData {
  name: string;
  startPoint1: Point;
  startPoint2: Point;
  intermediatePoint1: Point;
  intermediatePoint2: Point;
}

interface ProfileFormData {
  username: string;
  email: string;
  boatName: string;
  boatCategory: string;
  boatRating: number;
}

const initialFormData: RouteFormData = {
  name: '',
  startPoint1: { lat: 0, lon: 0 },
  startPoint2: { lat: 0, lon: 0 },
  intermediatePoint1: { lat: 0, lon: 0 },
  intermediatePoint2: { lat: 0, lon: 0 },
};

const initialProfileData: ProfileFormData = {
  username: '',
  email: '',
  boatName: '',
  boatCategory: '',
  boatRating: 0,
};

export default function TrackingPage() {
  const [isTracking, setIsTracking] = useState(false);
  const [positions, setPositions] = useState<TrackingPosition[]>([]);
  const [startTime, setStartTime] = useState<number | null>(null);
  const [currentPosition, setCurrentPosition] = useState<{ lat: number; lon: number } | null>(null);
  const [showSummary, setShowSummary] = useState(false);
  const [showConfig, setShowConfig] = useState(false);
  const [showProfileSetup, setShowProfileSetup] = useState(false);
  const [showProfileEdit, setShowProfileEdit] = useState(false);
  const [profileFormData, setProfileFormData] = useState<ProfileFormData>(initialProfileData);
  const [sessionSummary, setSessionSummary] = useState<{ duration: number; distance: number; config: SessionConfig; timing: TimingData; routeName: string } | null>(null);
  const [sessionConfig, setSessionConfig] = useState<SessionConfig>({
    skipperName: '',
    boatName: '',
    rating: 0
  });
  const [timingData, setTimingData] = useState<TimingData>({
    startTime: null,
    intermediateTime: null,
    finalTime: null
  });
  const [selectedRoute, setSelectedRoute] = useState<RouteType | null>(null);
  const [isSearchingRoute, setIsSearchingRoute] = useState(false);
  const [noRouteFound, setNoRouteFound] = useState(false);
  
  // Route management states
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showViewDialog, setShowViewDialog] = useState(false);
  const [editingRoute, setEditingRoute] = useState<RouteType | null>(null);
  const [viewingRoute, setViewingRoute] = useState<RouteType | null>(null);
  const [formData, setFormData] = useState<RouteFormData>(initialFormData);
  
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const watchIdRef = useRef<number | null>(null);

  const { identity, login, isInitializing, isLoggingIn, clear, loginStatus } = useInternetIdentity();
  const { actor, isFetching } = useActor();
  const isReady = !!actor && !isFetching && !isInitializing && loginStatus !== 'logging-in';
  const saveSessionMutation = useSaveSession();
  const { data: lastSession } = useGetLastSession();
  const findRoutesMutation = useFindRoutesWithinDistance();
  
  // Route management hooks
  const { data: routes = [], isLoading: routesLoading } = useGetRoutes();
  const createRouteMutation = useCreateRoute();
  const updateRouteMutation = useUpdateRoute();
  const deleteRouteMutation = useDeleteRoute();

  // User profile hooks
  const { data: userProfile, isLoading: profileLoading, isFetched: profileFetched } = useGetCallerUserProfile();
  const saveProfileMutation = useSaveCallerUserProfile();

  const isAuthenticated = !!identity && !identity.getPrincipal().isAnonymous();

  useEffect(() => {
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      if (watchIdRef.current) navigator.geolocation.clearWatch(watchIdRef.current);
    };
  }, []);

  // Handle profile setup - show modal for new users
  useEffect(() => {
    if (isAuthenticated && profileFetched && userProfile === null && !showProfileSetup) {
      setShowProfileSetup(true);
    }
  }, [isAuthenticated, profileFetched, userProfile, showProfileSetup]);

  // Pre-fill session config from user profile
  useEffect(() => {
    if (userProfile && !isTracking) {
      setSessionConfig({
        skipperName: userProfile.username,
        boatName: userProfile.boatName,
        rating: Number(userProfile.boatRating)
      });
    } else if (lastSession && !isTracking && !userProfile) {
      // Fallback to last session if no profile
      setSessionConfig({
        skipperName: lastSession.skipperName,
        boatName: lastSession.boatName,
        rating: Number(lastSession.rating)
      });
    }
  }, [userProfile, lastSession, isTracking]);

  const getCurrentPosition = (): Promise<GeolocationPosition> => {
    return new Promise((resolve, reject) => {
      navigator.geolocation.getCurrentPosition(resolve, reject, {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      });
    });
  };

  const checkLineCrossings = (prevPos: TrackingPosition, currentPos: TrackingPosition) => {
    if (!selectedRoute) return;

    const now = Date.now();
    const prevPosition = { lat: prevPos.lat, lon: prevPos.lon };
    const currentPosition = { lat: currentPos.lat, lon: currentPos.lon };

    // Check start line crossing (left to right: start time)
    if (!timingData.startTime) {
      const startLineCrossed = checkCorrectDirectionCrossing(
        prevPosition,
        currentPosition,
        selectedRoute.startPoint1,
        selectedRoute.startPoint2
      );

      if (startLineCrossed) {
        setTimingData(prev => ({ ...prev, startTime: now }));
        toast.success('Partenza registrata!', {
          description: `Tempo: ${new Date(now).toLocaleTimeString('it-IT')}`
        });
      }
    }

    // Check intermediate line crossing (left to right)
    if (timingData.startTime && !timingData.intermediateTime) {
      const intermediateLineCrossed = checkCorrectDirectionCrossing(
        prevPosition,
        currentPosition,
        selectedRoute.intermediatePoint1,
        selectedRoute.intermediatePoint2
      );

      if (intermediateLineCrossed) {
        setTimingData(prev => ({ ...prev, intermediateTime: now }));
        toast.success('Intermedio registrato!', {
          description: `Tempo: ${new Date(now).toLocaleTimeString('it-IT')}`
        });
      }
    }

    // Check start line crossing in opposite direction (right to left: final time)
    if (timingData.startTime && !timingData.finalTime) {
      const finalLineCrossed = checkOppositeDirectionCrossing(
        prevPosition,
        currentPosition,
        selectedRoute.startPoint1,
        selectedRoute.startPoint2
      );

      if (finalLineCrossed) {
        setTimingData(prev => ({ ...prev, finalTime: now }));
        toast.success('Arrivo registrato!', {
          description: `Tempo: ${new Date(now).toLocaleTimeString('it-IT')}`
        });
      }
    }
  };

  const handleStartTracking = () => {
    if (!isAuthenticated || !isReady) {
      toast.error('Effettua il login per iniziare il tracciamento');
      return;
    }
    setShowConfig(true);
  };

  const validateConfig = (): boolean => {
    if (!sessionConfig.skipperName.trim()) {
      toast.error('Inserisci il nome dello skipper');
      return false;
    }
    if (!sessionConfig.boatName.trim()) {
      toast.error('Inserisci il nome della barca');
      return false;
    }
    if (sessionConfig.rating <= 0) {
      toast.error('Inserisci un rating valido');
      return false;
    }
    return true;
  };

  const findNearbyRoute = async () => {
    if (!validateConfig()) return;
    if (!isAuthenticated || !isReady) {
      toast.error('Sessione non valida. Effettua nuovamente il login.');
      return;
    }

    setIsSearchingRoute(true);
    setNoRouteFound(false);
    setSelectedRoute(null);

    try {
      // Get current position first
      const position = await getCurrentPosition();
      
      // Find routes within 5km
      const nearbyRoutes = await findRoutesMutation.mutateAsync({
        lat: position.coords.latitude,
        lon: position.coords.longitude,
        maxDistance: 5.0 // 5km
      });

      if (nearbyRoutes.length === 0) {
        setNoRouteFound(true);
        setIsSearchingRoute(false);
        toast.error('Nessun percorso nelle vicinanze', {
          description: 'Assicurati di essere entro 5 km da un percorso esistente'
        });
        return;
      }

      // Select the first route found (closest one)
      const route = nearbyRoutes[0];
      setSelectedRoute(route);
      setNoRouteFound(false);
      
      toast.success(`Percorso selezionato: ${route.name}`, {
        description: 'Iniziando il tracciamento GPS...'
      });

      // Now start tracking with the selected route
      await startTracking(position);
      
    } catch (error: any) {
      console.error('Error finding nearby route:', error);
      
      let errorMessage = 'Errore nella ricerca dei percorsi nelle vicinanze';
      if (error?.message) {
        if (error.message.includes('Sessione non valida') || error.message.includes('Non autorizzato')) {
          errorMessage = 'Sessione scaduta. Effettua nuovamente il login.';
          await clear();
        } else if (error.message.toLowerCase().includes('permission') || error.message.toLowerCase().includes('denied')) {
          errorMessage = 'Impossibile accedere alla posizione. Controlla i permessi del browser.';
        } else {
          errorMessage = error.message;
        }
      }
      
      toast.error(errorMessage);
      setIsSearchingRoute(false);
    }
  };

  const startTracking = async (position?: GeolocationPosition) => {
    try {
      const pos = position || await getCurrentPosition();
      const now = Date.now();
      
      setIsTracking(true);
      setStartTime(now);
      setShowConfig(false);
      setIsSearchingRoute(false);
      
      // Reset timing data
      setTimingData({
        startTime: null,
        intermediateTime: null,
        finalTime: null
      });
      
      const initialPos: TrackingPosition = {
        lat: pos.coords.latitude,
        lon: pos.coords.longitude,
        timestamp: BigInt(now * 1000000), // Convert to nanoseconds
      };
      
      setPositions([initialPos]);
      setCurrentPosition({ lat: initialPos.lat, lon: initialPos.lon });
      
      toast.success('Tracciamento avviato!');

      // Record position every 5 seconds
      intervalRef.current = setInterval(async () => {
        try {
          const newPos = await getCurrentPosition();
          const timestamp = Date.now();
          
          const trackingPos: TrackingPosition = {
            lat: newPos.coords.latitude,
            lon: newPos.coords.longitude,
            timestamp: BigInt(timestamp * 1000000), // Convert to nanoseconds
          };
          
          setPositions(prev => {
            const lastPos = prev[prev.length - 1];
            if (lastPos) {
              checkLineCrossings(lastPos, trackingPos);
            }
            return [...prev, trackingPos];
          });
          setCurrentPosition({ lat: trackingPos.lat, lon: trackingPos.lon });
        } catch (error) {
          console.error('Error getting position:', error);
          toast.error('Errore nel rilevamento della posizione');
        }
      }, 5000);

    } catch (error) {
      console.error('Error starting tracking:', error);
      toast.error('Impossibile accedere alla posizione. Controlla i permessi del browser.');
      setIsSearchingRoute(false);
    }
  };

  const stopTracking = async () => {
    if (!startTime || positions.length === 0 || !selectedRoute) return;
    if (!isAuthenticated || !isReady) {
      toast.error('Sessione non valida. Impossibile salvare la sessione.');
      return;
    }

    const endTime = Date.now();
    const duration = endTime - startTime;
    const distance = calculateTotalDistance(positions.map(p => ({ lat: p.lat, lon: p.lon })));

    // Show summary dialog
    setSessionSummary({ 
      duration, 
      distance, 
      config: sessionConfig, 
      timing: timingData,
      routeName: selectedRoute.name 
    });
    setShowSummary(true);

    try {
      await saveSessionMutation.mutateAsync({
        startTime: BigInt(startTime * 1000000), // Convert to nanoseconds
        duration: BigInt(duration * 1000000), // Convert to nanoseconds
        positions: positions,
        distance: distance,
        skipperName: sessionConfig.skipperName,
        boatName: sessionConfig.boatName,
        rating: sessionConfig.rating,
        routeId: selectedRoute.id,
        intermediateTime: timingData.intermediateTime ? BigInt(timingData.intermediateTime * 1000000) : null,
        finalTime: timingData.finalTime ? BigInt(timingData.finalTime * 1000000) : null,
      });

      toast.success('Sessione salvata con successo!');
      
    } catch (error: any) {
      console.error('Error saving session:', error);
      
      let errorMessage = 'Errore nel salvare la sessione';
      if (error?.message) {
        if (error.message.includes('Sessione non valida') || error.message.includes('Non autorizzato')) {
          errorMessage = 'Sessione scaduta. La sessione non è stata salvata.';
          await clear();
        } else {
          errorMessage = error.message;
        }
      }
      
      toast.error(errorMessage);
    }
  };

  const resetTracking = () => {
    setIsTracking(false);
    setPositions([]);
    setStartTime(null);
    setCurrentPosition(null);
    setShowSummary(false);
    setSessionSummary(null);
    setSelectedRoute(null);
    setNoRouteFound(false);
    setIsSearchingRoute(false);
    setTimingData({
      startTime: null,
      intermediateTime: null,
      finalTime: null
    });
    
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  };

  // Profile setup functions
  const validateProfileForm = (): boolean => {
    if (!profileFormData.username.trim()) {
      toast.error('Inserisci il tuo nome utente');
      return false;
    }
    if (!profileFormData.email.trim()) {
      toast.error('Inserisci la tua email');
      return false;
    }
    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(profileFormData.email)) {
      toast.error('Inserisci un indirizzo email valido');
      return false;
    }
    if (!profileFormData.boatName.trim()) {
      toast.error('Inserisci il nome della barca');
      return false;
    }
    if (!profileFormData.boatCategory.trim()) {
      toast.error('Inserisci la categoria della barca');
      return false;
    }
    if (profileFormData.boatRating <= 0) {
      toast.error('Inserisci un rating valido (maggiore di 0)');
      return false;
    }
    return true;
  };

  const handleSaveProfile = async () => {
    if (!validateProfileForm()) return;

    try {
      await saveProfileMutation.mutateAsync({
        username: profileFormData.username.trim(),
        email: profileFormData.email.trim(),
        boatName: profileFormData.boatName.trim(),
        boatCategory: profileFormData.boatCategory.trim(),
        boatRating: BigInt(profileFormData.boatRating),
      });
      toast.success('Profilo salvato con successo!');
      setShowProfileSetup(false);
      setShowProfileEdit(false);
      setProfileFormData(initialProfileData);
    } catch (error: any) {
      console.error('Error saving profile:', error);
      
      let errorMessage = 'Errore nel salvare il profilo';
      if (error?.message) {
        if (error.message.includes('Sessione non valida') || error.message.includes('Non autorizzato')) {
          errorMessage = 'Sessione scaduta. Effettua nuovamente il login.';
          await clear();
        } else {
          errorMessage = error.message;
        }
      }
      
      toast.error(errorMessage);
    }
  };

  const handleEditProfile = () => {
    if (!userProfile) return;
    
    setProfileFormData({
      username: userProfile.username,
      email: userProfile.email,
      boatName: userProfile.boatName,
      boatCategory: userProfile.boatCategory,
      boatRating: Number(userProfile.boatRating),
    });
    setShowProfileEdit(true);
  };

  // Route management functions
  const handleCreateRoute = () => {
    if (!isAuthenticated || !isReady) {
      toast.error('Effettua il login per creare un percorso');
      return;
    }
    setFormData(initialFormData);
    setShowCreateDialog(true);
  };

  const handleEditRoute = (route: RouteType) => {
    if (!isAuthenticated || !isReady) {
      toast.error('Effettua il login per modificare un percorso');
      return;
    }
    setEditingRoute(route);
    setFormData({
      name: route.name,
      startPoint1: route.startPoint1,
      startPoint2: route.startPoint2,
      intermediatePoint1: route.intermediatePoint1,
      intermediatePoint2: route.intermediatePoint2,
    });
    setShowEditDialog(true);
  };

  const handleViewRoute = (route: RouteType) => {
    setViewingRoute(route);
    setShowViewDialog(true);
  };

  const validateRouteForm = (): boolean => {
    if (!formData.name.trim()) {
      toast.error('Inserisci il nome del percorso');
      return false;
    }

    const points = [
      { point: formData.startPoint1, name: 'Punto 1 (Linea di partenza)' },
      { point: formData.startPoint2, name: 'Punto 2 (Linea di partenza)' },
      { point: formData.intermediatePoint1, name: 'Punto 3 (Linea intermedia)' },
      { point: formData.intermediatePoint2, name: 'Punto 4 (Linea intermedia)' },
    ];

    for (const { point, name } of points) {
      // Check if coordinates are set (not the initial 0,0)
      if (point.lat === 0 && point.lon === 0) {
        toast.error(`Inserisci le coordinate per ${name}`);
        return false;
      }
      
      // Validate latitude range
      if (point.lat < -90 || point.lat > 90) {
        toast.error(`Latitudine non valida per ${name}. Deve essere tra -90 e 90 gradi.`);
        return false;
      }
      
      // Validate longitude range
      if (point.lon < -180 || point.lon > 180) {
        toast.error(`Longitudine non valida per ${name}. Deve essere tra -180 e 180 gradi.`);
        return false;
      }

      // Check for reasonable precision (not too many decimal places)
      const latStr = point.lat.toString();
      const lonStr = point.lon.toString();
      const latDecimals = latStr.includes('.') ? latStr.split('.')[1].length : 0;
      const lonDecimals = lonStr.includes('.') ? lonStr.split('.')[1].length : 0;
      
      if (latDecimals > 8 || lonDecimals > 8) {
        toast.error(`Coordinate troppo precise per ${name}. Usa massimo 8 cifre decimali.`);
        return false;
      }
    }

    // Check that start line points are different
    if (formData.startPoint1.lat === formData.startPoint2.lat && 
        formData.startPoint1.lon === formData.startPoint2.lon) {
      toast.error('I punti della linea di partenza devono essere diversi');
      return false;
    }

    // Check that intermediate line points are different
    if (formData.intermediatePoint1.lat === formData.intermediatePoint2.lat && 
        formData.intermediatePoint1.lon === formData.intermediatePoint2.lon) {
      toast.error('I punti della linea intermedia devono essere diversi');
      return false;
    }

    return true;
  };

  const handleSubmitCreate = async () => {
    if (!validateRouteForm()) return;
    if (!isAuthenticated || !isReady) {
      toast.error('Sessione non valida. Effettua nuovamente il login.');
      return;
    }

    try {
      await createRouteMutation.mutateAsync(formData);
      toast.success('Percorso creato con successo!');
      setShowCreateDialog(false);
      setFormData(initialFormData);
    } catch (error: any) {
      console.error('Error creating route:', error);
      
      let errorMessage = 'Errore nella creazione del percorso';
      if (error?.message) {
        if (error.message.includes('coordinate valide')) {
          errorMessage = 'Errore di validazione: verifica che tutte le coordinate siano corrette';
        } else if (error.message.includes('Sessione non valida') || error.message.includes('Non autorizzato')) {
          errorMessage = 'Sessione scaduta. Effettua nuovamente il login.';
          await clear();
        } else {
          errorMessage = error.message;
        }
      }
      
      toast.error(errorMessage);
    }
  };

  const handleSubmitEdit = async () => {
    if (!validateRouteForm() || !editingRoute) return;
    if (!isAuthenticated || !isReady) {
      toast.error('Sessione non valida. Effettua nuovamente il login.');
      return;
    }

    try {
      await updateRouteMutation.mutateAsync({
        routeId: editingRoute.id,
        ...formData,
      });
      toast.success('Percorso aggiornato con successo!');
      setShowEditDialog(false);
      setEditingRoute(null);
      setFormData(initialFormData);
    } catch (error: any) {
      console.error('Error updating route:', error);
      
      let errorMessage = 'Errore nell\'aggiornamento del percorso';
      if (error?.message) {
        if (error.message.includes('coordinate valide')) {
          errorMessage = 'Errore di validazione: verifica che tutte le coordinate siano corrette';
        } else if (error.message.includes('Sessione non valida') || error.message.includes('Non autorizzato')) {
          errorMessage = 'Sessione scaduta. Effettua nuovamente il login.';
          await clear();
        } else if (error.message.includes('puoi modificare solo i tuoi percorsi')) {
          errorMessage = 'Non autorizzato: puoi modificare solo i tuoi percorsi';
        } else {
          errorMessage = error.message;
        }
      }
      
      toast.error(errorMessage);
    }
  };

  const handleDeleteRoute = async (routeId: bigint) => {
    if (!isAuthenticated || !isReady) {
      toast.error('Sessione non valida. Effettua nuovamente il login.');
      return;
    }

    try {
      await deleteRouteMutation.mutateAsync(routeId);
      toast.success('Percorso eliminato con successo!');
    } catch (error: any) {
      console.error('Error deleting route:', error);
      
      let errorMessage = 'Errore nell\'eliminazione del percorso';
      if (error?.message) {
        if (error.message.includes('Sessione non valida') || error.message.includes('Non autorizzato')) {
          errorMessage = 'Sessione scaduta. Effettua nuovamente il login.';
          await clear();
        } else if (error.message.includes('puoi eliminare solo i tuoi percorsi')) {
          errorMessage = 'Non autorizzato: puoi eliminare solo i tuoi percorsi';
        } else {
          errorMessage = error.message;
        }
      }
      
      toast.error(errorMessage);
    }
  };

  const updatePoint = (pointKey: keyof RouteFormData, field: 'lat' | 'lon', value: string) => {
    const numValue = value === '' ? 0 : parseFloat(value);
    if (!isNaN(numValue)) {
      setFormData(prev => ({
        ...prev,
        [pointKey]: {
          ...(prev[pointKey] as Point),
          [field]: numValue,
        },
      }));
    }
  };

  const formatDuration = (ms: number) => {
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

  const formatTime = (timestamp: number) => {
    return new Date(timestamp).toLocaleTimeString('it-IT');
  };

  const hasValidRouteCoordinates = (route: RouteType | null): boolean => {
    if (!route) return false;
    return route.startPoint1.lat !== 0 || route.startPoint1.lon !== 0 ||
           route.startPoint2.lat !== 0 || route.startPoint2.lon !== 0 ||
           route.intermediatePoint1.lat !== 0 || route.intermediatePoint1.lon !== 0 ||
           route.intermediatePoint2.lat !== 0 || route.intermediatePoint2.lon !== 0;
  };

  const hasValidFormCoordinates = (data: RouteFormData): boolean => {
    return (data.startPoint1.lat !== 0 || data.startPoint1.lon !== 0) &&
           (data.startPoint2.lat !== 0 || data.startPoint2.lon !== 0) &&
           (data.intermediatePoint1.lat !== 0 || data.intermediatePoint1.lon !== 0) &&
           (data.intermediatePoint2.lat !== 0 || data.intermediatePoint2.lon !== 0);
  };

  const currentDistance = positions.length > 1 ? calculateTotalDistance(positions.map(p => ({ lat: p.lat, lon: p.lon }))) : 0;

  if (isInitializing) {
    return (
      <div className="container mx-auto p-4 space-y-4 max-w-md">
        <Card>
          <CardContent className="pt-6 text-center space-y-4">
            <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
            <div className="text-muted-foreground">Inizializzazione...</div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!isReady && !isInitializing) {
    return (
      <div className="container mx-auto p-4 space-y-4 max-w-md">
        <Card>
          <CardContent className="pt-6 text-center space-y-4">
            <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
            <div className="text-muted-foreground">Caricamento...</div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="container mx-auto p-4 space-y-4 max-w-md">
        <Card>
          <CardHeader className="text-center">
            <CardTitle className="flex items-center justify-center gap-2">
              <MapPin className="h-5 w-5 text-primary" />
              Tracciamento GPS
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-center">
            <div className="space-y-2">
              <LogIn className="h-12 w-12 text-muted-foreground mx-auto" />
              <div className="text-muted-foreground">
                Effettua il login per iniziare il tracciamento GPS
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

  return (
    <div className="container mx-auto p-4 space-y-4 max-w-md">
      <Tabs defaultValue="tracking" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="tracking" className="flex items-center gap-2">
            <MapPin className="h-4 w-4" />
            Tracciamento
          </TabsTrigger>
          <TabsTrigger value="routes" className="flex items-center gap-2">
            <Route className="h-4 w-4" />
            Percorsi
          </TabsTrigger>
        </TabsList>

        <TabsContent value="tracking" className="space-y-4">
          {/* User Profile Card */}
          {userProfile && (
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base flex items-center gap-2">
                    <User className="h-4 w-4 text-primary" />
                    Profilo Utente
                  </CardTitle>
                  <Button 
                    variant="ghost" 
                    size="sm"
                    onClick={handleEditProfile}
                    disabled={!isReady}
                  >
                    <Settings className="h-4 w-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <div className="flex items-center gap-2">
                  <User className="h-3 w-3 text-muted-foreground" />
                  <span className="font-medium">{userProfile.username}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Ship className="h-3 w-3 text-muted-foreground" />
                  <span>{userProfile.boatName} ({userProfile.boatCategory})</span>
                </div>
                <div className="flex items-center gap-2">
                  <Star className="h-3 w-3 text-muted-foreground" />
                  <span>Rating: {userProfile.boatRating.toString()}</span>
                </div>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader className="text-center">
              <CardTitle className="flex items-center justify-center gap-2">
                <MapPin className="h-5 w-5 text-primary" />
                Tracciamento GPS
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-center">
                <Badge variant={isTracking ? "default" : "secondary"} className="text-sm">
                  {isTracking ? "In corso" : "Fermo"}
                </Badge>
              </div>

              {isTracking && startTime && (
                <div className="space-y-3">
                  <div className="flex items-center justify-center gap-2 text-lg font-mono">
                    <Clock className="h-4 w-4" />
                    <Timer startTime={startTime} />
                  </div>
                  
                  <div className="grid grid-cols-3 gap-2 text-center">
                    <div className="space-y-1">
                      <div className="text-lg font-bold text-primary">{positions.length}</div>
                      <div className="text-xs text-muted-foreground">Punti</div>
                    </div>
                    <div className="space-y-1">
                      <div className="text-lg font-bold text-primary">
                        {formatDistance(currentDistance)}
                      </div>
                      <div className="text-xs text-muted-foreground">Distanza</div>
                    </div>
                    <div className="space-y-1">
                      <div className="text-lg font-bold text-primary">
                        {currentPosition ? `${currentPosition.lat.toFixed(4)}` : '--'}
                      </div>
                      <div className="text-xs text-muted-foreground">Lat</div>
                    </div>
                  </div>

                  {selectedRoute && (
                    <div className="bg-muted/50 rounded-lg p-3 space-y-2">
                      <div className="text-sm font-medium text-center mb-2">Tempi Registrati</div>
                      <div className="grid grid-cols-3 gap-2 text-xs">
                        <div className="text-center">
                          <div className={`flex items-center justify-center gap-1 ${timingData.startTime ? 'text-green-600' : 'text-muted-foreground'}`}>
                            {timingData.startTime ? <CheckCircle className="h-3 w-3" /> : <TimerIcon className="h-3 w-3" />}
                            <span>Partenza</span>
                          </div>
                          {timingData.startTime && (
                            <div className="font-mono text-xs mt-1">{formatTime(timingData.startTime)}</div>
                          )}
                        </div>
                        <div className="text-center">
                          <div className={`flex items-center justify-center gap-1 ${timingData.intermediateTime ? 'text-green-600' : 'text-muted-foreground'}`}>
                            {timingData.intermediateTime ? <CheckCircle className="h-3 w-3" /> : <TimerIcon className="h-3 w-3" />}
                            <span>Intermedio</span>
                          </div>
                          {timingData.intermediateTime && (
                            <div className="font-mono text-xs mt-1">{formatTime(timingData.intermediateTime)}</div>
                          )}
                        </div>
                        <div className="text-center">
                          <div className={`flex items-center justify-center gap-1 ${timingData.finalTime ? 'text-green-600' : 'text-muted-foreground'}`}>
                            {timingData.finalTime ? <CheckCircle className="h-3 w-3" /> : <TimerIcon className="h-3 w-3" />}
                            <span>Arrivo</span>
                          </div>
                          {timingData.finalTime && (
                            <div className="font-mono text-xs mt-1">{formatTime(timingData.finalTime)}</div>
                          )}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Session info during tracking */}
                  <div className="bg-muted/50 rounded-lg p-3 space-y-2">
                    <div className="flex items-center gap-2 text-sm">
                      <User className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium">{sessionConfig.skipperName}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <Ship className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium">{sessionConfig.boatName}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <Star className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium">Rating: {sessionConfig.rating}</span>
                    </div>
                    {selectedRoute && (
                      <div className="flex items-center gap-2 text-sm">
                        <Route className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium">{selectedRoute.name}</span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              <div className="flex justify-center">
                {!isTracking ? (
                  <Button 
                    onClick={handleStartTracking} 
                    size="lg" 
                    className="w-full"
                    disabled={!isReady}
                  >
                    <Play className="h-4 w-4 mr-2" />
                    Inizia Tracciamento
                  </Button>
                ) : (
                  <Button 
                    onClick={stopTracking} 
                    variant="destructive" 
                    size="lg" 
                    className="w-full"
                    disabled={saveSessionMutation.isPending}
                  >
                    <Square className="h-4 w-4 mr-2" />
                    {saveSessionMutation.isPending ? 'Salvando...' : 'Ferma Tracciamento'}
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>

          {(isTracking || positions.length > 0) && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Route className="h-4 w-4" />
                  Mappa del Percorso
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-64 rounded-lg overflow-hidden border">
                  <MapContainer 
                    positions={positions.map(p => ({ lat: p.lat, lon: p.lon }))}
                    currentPosition={currentPosition}
                    route={selectedRoute}
                  />
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="routes" className="space-y-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="flex items-center gap-2">
                <Route className="h-5 w-5 text-primary" />
                Percorsi
              </CardTitle>
              <Button onClick={handleCreateRoute} size="sm" disabled={!isReady}>
                <Plus className="h-4 w-4 mr-2" />
                Nuovo
              </Button>
            </CardHeader>
            <CardContent>
              {routesLoading ? (
                <div className="text-center text-muted-foreground">Caricamento percorsi...</div>
              ) : routes.length === 0 ? (
                <div className="text-center space-y-2">
                  <div className="text-muted-foreground">Nessun percorso creato</div>
                  <Button onClick={handleCreateRoute} variant="outline" size="sm" disabled={!isReady}>
                    <Plus className="h-4 w-4 mr-2" />
                    Crea il primo percorso
                  </Button>
                </div>
              ) : (
                <div className="space-y-3">
                  {routes.map((route) => (
                    <Card key={route.id.toString()} className="border-l-4 border-l-primary">
                      <CardContent className="pt-4">
                        <div className="flex items-start justify-between">
                          <div className="space-y-1">
                            <div className="font-medium">{route.name}</div>
                            <Badge variant="outline" className="text-xs">
                              ID: {route.id.toString()}
                            </Badge>
                          </div>
                          <div className="flex gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleViewRoute(route)}
                              title="Visualizza percorso"
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleEditRoute(route)}
                              title="Modifica percorso"
                              disabled={!isReady}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button variant="ghost" size="sm" title="Elimina percorso" disabled={!isReady}>
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent className="max-w-sm">
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Elimina Percorso</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    Sei sicuro di voler eliminare il percorso "{route.name}"? 
                                    Questa azione non può essere annullata.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Annulla</AlertDialogCancel>
                                  <AlertDialogAction
                                    onClick={() => handleDeleteRoute(route.id)}
                                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                  >
                                    Elimina
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </div>
                        </div>
                        <div className="mt-3 grid grid-cols-2 gap-2 text-xs text-muted-foreground">
                          <div>
                            <div className="font-medium text-green-600">Linea di Partenza</div>
                            <div>P1: {route.startPoint1.lat.toFixed(4)}, {route.startPoint1.lon.toFixed(4)}</div>
                            <div>P2: {route.startPoint2.lat.toFixed(4)}, {route.startPoint2.lon.toFixed(4)}</div>
                          </div>
                          <div>
                            <div className="font-medium text-red-600">Linea Intermedia</div>
                            <div>P3: {route.intermediatePoint1.lat.toFixed(4)}, {route.intermediatePoint1.lon.toFixed(4)}</div>
                            <div>P4: {route.intermediatePoint2.lat.toFixed(4)}, {route.intermediatePoint2.lon.toFixed(4)}</div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Profile Setup Dialog (for new users) */}
      <Dialog open={showProfileSetup} onOpenChange={() => {}}>
        <DialogContent className="max-w-sm max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <User className="h-5 w-5 text-primary" />
              Completa il Profilo
            </DialogTitle>
            <DialogDescription>
              Inserisci i tuoi dati per completare la configurazione del profilo
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="profileUsername">Nome Utente *</Label>
              <Input
                id="profileUsername"
                value={profileFormData.username}
                onChange={(e) => setProfileFormData(prev => ({ ...prev, username: e.target.value }))}
                placeholder="Es. Mario Rossi"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="profileEmail">Email *</Label>
              <Input
                id="profileEmail"
                type="email"
                value={profileFormData.email}
                onChange={(e) => setProfileFormData(prev => ({ ...prev, email: e.target.value }))}
                placeholder="Es. mario.rossi@example.com"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="profileBoatName">Nome Barca *</Label>
              <Input
                id="profileBoatName"
                value={profileFormData.boatName}
                onChange={(e) => setProfileFormData(prev => ({ ...prev, boatName: e.target.value }))}
                placeholder="Es. Vento del Sud"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="profileBoatCategory">Categoria Barca *</Label>
              <Input
                id="profileBoatCategory"
                value={profileFormData.boatCategory}
                onChange={(e) => setProfileFormData(prev => ({ ...prev, boatCategory: e.target.value }))}
                placeholder="Es. Classe 470, Laser, ecc."
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="profileBoatRating">Rating Barca *</Label>
              <Input
                id="profileBoatRating"
                type="number"
                min="1"
                value={profileFormData.boatRating || ''}
                onChange={(e) => setProfileFormData(prev => ({ ...prev, boatRating: parseInt(e.target.value) || 0 }))}
                placeholder="Es. 100"
              />
            </div>

            <Alert>
              <Info className="h-4 w-4" />
              <AlertDescription className="text-xs">
                Tutti i campi sono obbligatori. Potrai modificare questi dati in qualsiasi momento.
              </AlertDescription>
            </Alert>

            <Button 
              onClick={handleSaveProfile} 
              className="w-full"
              disabled={saveProfileMutation.isPending}
            >
              {saveProfileMutation.isPending ? 'Salvando...' : 'Salva Profilo'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Profile Edit Dialog */}
      <Dialog open={showProfileEdit} onOpenChange={setShowProfileEdit}>
        <DialogContent className="max-w-sm max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5 text-primary" />
              Modifica Profilo
            </DialogTitle>
            <DialogDescription>
              Aggiorna i tuoi dati personali e della barca
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="editUsername">Nome Utente *</Label>
              <Input
                id="editUsername"
                value={profileFormData.username}
                onChange={(e) => setProfileFormData(prev => ({ ...prev, username: e.target.value }))}
                placeholder="Es. Mario Rossi"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="editEmail">Email *</Label>
              <Input
                id="editEmail"
                type="email"
                value={profileFormData.email}
                onChange={(e) => setProfileFormData(prev => ({ ...prev, email: e.target.value }))}
                placeholder="Es. mario.rossi@example.com"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="editBoatName">Nome Barca *</Label>
              <Input
                id="editBoatName"
                value={profileFormData.boatName}
                onChange={(e) => setProfileFormData(prev => ({ ...prev, boatName: e.target.value }))}
                placeholder="Es. Vento del Sud"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="editBoatCategory">Categoria Barca *</Label>
              <Input
                id="editBoatCategory"
                value={profileFormData.boatCategory}
                onChange={(e) => setProfileFormData(prev => ({ ...prev, boatCategory: e.target.value }))}
                placeholder="Es. Classe 470, Laser, ecc."
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="editBoatRating">Rating Barca *</Label>
              <Input
                id="editBoatRating"
                type="number"
                min="1"
                value={profileFormData.boatRating || ''}
                onChange={(e) => setProfileFormData(prev => ({ ...prev, boatRating: parseInt(e.target.value) || 0 }))}
                placeholder="Es. 100"
              />
            </div>

            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setShowProfileEdit(false)} className="flex-1">
                Annulla
              </Button>
              <Button 
                onClick={handleSaveProfile} 
                className="flex-1"
                disabled={saveProfileMutation.isPending}
              >
                {saveProfileMutation.isPending ? 'Salvando...' : 'Salva'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Session Configuration Dialog */}
      <Dialog open={showConfig} onOpenChange={setShowConfig}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Ship className="h-5 w-5 text-primary" />
              Configurazione Sessione
            </DialogTitle>
            <DialogDescription>
              Inserisci i dettagli per questa sessione di tracciamento
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="skipperName" className="flex items-center gap-2">
                <User className="h-4 w-4" />
                Nome Skipper
              </Label>
              <Input
                id="skipperName"
                value={sessionConfig.skipperName}
                onChange={(e) => setSessionConfig(prev => ({ ...prev, skipperName: e.target.value }))}
                placeholder="Inserisci nome skipper"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="boatName" className="flex items-center gap-2">
                <Ship className="h-4 w-4" />
                Nome Barca
              </Label>
              <Input
                id="boatName"
                value={sessionConfig.boatName}
                onChange={(e) => setSessionConfig(prev => ({ ...prev, boatName: e.target.value }))}
                placeholder="Inserisci nome barca"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="rating" className="flex items-center gap-2">
                <Star className="h-4 w-4" />
                Rating
              </Label>
              <Input
                id="rating"
                type="number"
                min="1"
                value={sessionConfig.rating || ''}
                onChange={(e) => setSessionConfig(prev => ({ ...prev, rating: parseInt(e.target.value) || 0 }))}
                placeholder="Inserisci rating"
              />
            </div>

            {noRouteFound && (
              <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  Nessun percorso nelle vicinanze. Assicurati di essere entro 5 km da un percorso esistente.
                </AlertDescription>
              </Alert>
            )}

            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setShowConfig(false)} className="flex-1">
                Annulla
              </Button>
              <Button 
                onClick={findNearbyRoute} 
                className="flex-1"
                disabled={isSearchingRoute || !isReady}
              >
                {isSearchingRoute ? (
                  <>
                    <Route className="h-4 w-4 mr-2 animate-spin" />
                    Cercando...
                  </>
                ) : (
                  <>
                    <Play className="h-4 w-4 mr-2" />
                    Inizia
                  </>
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Session Summary Dialog */}
      <Dialog open={showSummary} onOpenChange={setShowSummary}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Navigation className="h-5 w-5 text-primary" />
              Sessione Completata
            </DialogTitle>
            <DialogDescription>
              Ecco il riepilogo del tuo tracciamento
            </DialogDescription>
          </DialogHeader>
          
          {sessionSummary && (
            <div className="space-y-4">
              <div className="bg-muted/50 rounded-lg p-3 space-y-2">
                <div className="flex items-center gap-2 text-sm">
                  <User className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium">{sessionSummary.config.skipperName}</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Ship className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium">{sessionSummary.config.boatName}</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Star className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium">Rating: {sessionSummary.config.rating}</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Route className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium">{sessionSummary.routeName}</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 text-center">
                <div className="space-y-2">
                  <div className="text-2xl font-bold text-primary">
                    {formatDuration(sessionSummary.duration)}
                  </div>
                  <div className="text-sm text-muted-foreground flex items-center justify-center gap-1">
                    <Clock className="h-3 w-3" />
                    Tempo trascorso
                  </div>
                </div>
                
                <div className="space-y-2">
                  <div className="text-2xl font-bold text-primary">
                    {formatDistance(sessionSummary.distance)}
                  </div>
                  <div className="text-sm text-muted-foreground flex items-center justify-center gap-1">
                    <Route className="h-3 w-3" />
                    Distanza totale
                  </div>
                </div>
              </div>

              {/* Timing summary */}
              {(sessionSummary.timing.startTime || sessionSummary.timing.intermediateTime || sessionSummary.timing.finalTime) && (
                <div className="bg-muted/50 rounded-lg p-3 space-y-2">
                  <div className="text-sm font-medium text-center">Tempi Registrati</div>
                  <div className="space-y-1 text-xs">
                    {sessionSummary.timing.startTime && (
                      <div className="flex justify-between">
                        <span>Partenza:</span>
                        <span className="font-mono">{formatTime(sessionSummary.timing.startTime)}</span>
                      </div>
                    )}
                    {sessionSummary.timing.intermediateTime && (
                      <div className="flex justify-between">
                        <span>Intermedio:</span>
                        <span className="font-mono">{formatTime(sessionSummary.timing.intermediateTime)}</span>
                      </div>
                    )}
                    {sessionSummary.timing.finalTime && (
                      <div className="flex justify-between">
                        <span>Arrivo:</span>
                        <span className="font-mono">{formatTime(sessionSummary.timing.finalTime)}</span>
                      </div>
                    )}
                  </div>
                </div>
              )}
              
              <div className="text-center">
                <Button onClick={resetTracking} className="w-full">
                  Inizia Nuovo Tracciamento
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* View Route Dialog */}
      <Dialog open={showViewDialog} onOpenChange={setShowViewDialog}>
        <DialogContent className="max-w-sm max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Eye className="h-5 w-5 text-primary" />
              Visualizza Percorso
            </DialogTitle>
            <DialogDescription>
              {viewingRoute?.name}
            </DialogDescription>
          </DialogHeader>
          
          {viewingRoute && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Mappa Satellitare</Label>
                <div className="h-64 rounded-lg overflow-hidden border">
                  <MapContainer 
                    positions={[]}
                    route={viewingRoute}
                    showRouteOnly={true}
                  />
                </div>
              </div>

              <div className="space-y-3">
                <div className="space-y-2">
                  <div className="font-medium text-sm flex items-center gap-2 text-green-600">
                    <MapPin className="h-4 w-4" />
                    Linea di Partenza (Verde)
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <div className="font-medium">Punto 1</div>
                      <div>Lat: {viewingRoute.startPoint1.lat.toFixed(6)}</div>
                      <div>Lon: {viewingRoute.startPoint1.lon.toFixed(6)}</div>
                    </div>
                    <div>
                      <div className="font-medium">Punto 2</div>
                      <div>Lat: {viewingRoute.startPoint2.lat.toFixed(6)}</div>
                      <div>Lon: {viewingRoute.startPoint2.lon.toFixed(6)}</div>
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="font-medium text-sm flex items-center gap-2 text-red-600">
                    <MapPin className="h-4 w-4" />
                    Linea Intermedia (Rossa)
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <div className="font-medium">Punto 3</div>
                      <div>Lat: {viewingRoute.intermediatePoint1.lat.toFixed(6)}</div>
                      <div>Lon: {viewingRoute.intermediatePoint1.lon.toFixed(6)}</div>
                    </div>
                    <div>
                      <div className="font-medium">Punto 4</div>
                      <div>Lat: {viewingRoute.intermediatePoint2.lat.toFixed(6)}</div>
                      <div>Lon: {viewingRoute.intermediatePoint2.lon.toFixed(6)}</div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setShowViewDialog(false)} className="flex-1">
                  Chiudi
                </Button>
                <Button 
                  onClick={() => {
                    setShowViewDialog(false);
                    handleEditRoute(viewingRoute);
                  }} 
                  className="flex-1"
                  disabled={!isReady}
                >
                  <Edit className="h-4 w-4 mr-2" />
                  Modifica
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Create Route Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="max-w-sm max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Plus className="h-5 w-5 text-primary" />
              Nuovo Percorso
            </DialogTitle>
            <DialogDescription>
              Crea un nuovo percorso inserendo i 4 punti di riferimento
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="routeName">Nome Percorso</Label>
              <Input
                id="routeName"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                placeholder="Es. Percorso Golfo"
              />
            </div>

            <Alert>
              <Info className="h-4 w-4" />
              <AlertDescription className="text-xs">
                Inserisci coordinate GPS valide. Esempio: Latitudine 41.9028, Longitudine 12.4964 (Roma).
                Usa il punto come separatore decimale.
              </AlertDescription>
            </Alert>

            {hasValidFormCoordinates(formData) && (
              <div className="space-y-2">
                <Label>Anteprima Mappa</Label>
                <div className="h-48 rounded-lg overflow-hidden border">
                  <MapContainer 
                    positions={[]}
                    route={{
                      id: BigInt(0),
                      name: formData.name || 'Nuovo Percorso',
                      userId: '',
                      startPoint1: formData.startPoint1,
                      startPoint2: formData.startPoint2,
                      intermediatePoint1: formData.intermediatePoint1,
                      intermediatePoint2: formData.intermediatePoint2,
                    }}
                    showRouteOnly={true}
                  />
                </div>
              </div>
            )}

            <div className="space-y-3">
              <div className="font-medium text-sm flex items-center gap-2 text-green-600">
                <MapPin className="h-4 w-4" />
                Linea di Partenza (Verde)
              </div>
              
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <Label className="text-xs">Punto 1 - Latitudine</Label>
                  <Input
                    type="number"
                    step="any"
                    value={formData.startPoint1.lat === 0 ? '' : formData.startPoint1.lat}
                    onChange={(e) => updatePoint('startPoint1', 'lat', e.target.value)}
                    placeholder="41.9028"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Punto 1 - Longitudine</Label>
                  <Input
                    type="number"
                    step="any"
                    value={formData.startPoint1.lon === 0 ? '' : formData.startPoint1.lon}
                    onChange={(e) => updatePoint('startPoint1', 'lon', e.target.value)}
                    placeholder="12.4964"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <Label className="text-xs">Punto 2 - Latitudine</Label>
                  <Input
                    type="number"
                    step="any"
                    value={formData.startPoint2.lat === 0 ? '' : formData.startPoint2.lat}
                    onChange={(e) => updatePoint('startPoint2', 'lat', e.target.value)}
                    placeholder="41.9030"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Punto 2 - Longitudine</Label>
                  <Input
                    type="number"
                    step="any"
                    value={formData.startPoint2.lon === 0 ? '' : formData.startPoint2.lon}
                    onChange={(e) => updatePoint('startPoint2', 'lon', e.target.value)}
                    placeholder="12.4966"
                  />
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <div className="font-medium text-sm flex items-center gap-2 text-red-600">
                <MapPin className="h-4 w-4" />
                Linea Intermedia (Rossa)
              </div>
              
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <Label className="text-xs">Punto 3 - Latitudine</Label>
                  <Input
                    type="number"
                    step="any"
                    value={formData.intermediatePoint1.lat === 0 ? '' : formData.intermediatePoint1.lat}
                    onChange={(e) => updatePoint('intermediatePoint1', 'lat', e.target.value)}
                    placeholder="41.9040"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Punto 3 - Longitudine</Label>
                  <Input
                    type="number"
                    step="any"
                    value={formData.intermediatePoint1.lon === 0 ? '' : formData.intermediatePoint1.lon}
                    onChange={(e) => updatePoint('intermediatePoint1', 'lon', e.target.value)}
                    placeholder="12.4970"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <Label className="text-xs">Punto 4 - Latitudine</Label>
                  <Input
                    type="number"
                    step="any"
                    value={formData.intermediatePoint2.lat === 0 ? '' : formData.intermediatePoint2.lat}
                    onChange={(e) => updatePoint('intermediatePoint2', 'lat', e.target.value)}
                    placeholder="41.9042"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Punto 4 - Longitudine</Label>
                  <Input
                    type="number"
                    step="any"
                    value={formData.intermediatePoint2.lon === 0 ? '' : formData.intermediatePoint2.lon}
                    onChange={(e) => updatePoint('intermediatePoint2', 'lon', e.target.value)}
                    placeholder="12.4972"
                  />
                </div>
              </div>
            </div>

            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setShowCreateDialog(false)} className="flex-1">
                Annulla
              </Button>
              <Button 
                onClick={handleSubmitCreate} 
                className="flex-1"
                disabled={createRouteMutation.isPending || !isReady}
              >
                {createRouteMutation.isPending ? 'Creando...' : 'Crea'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Route Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="max-w-sm max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Edit className="h-5 w-5 text-primary" />
              Modifica Percorso
            </DialogTitle>
            <DialogDescription>
              Modifica i punti di riferimento del percorso
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="editRouteName">Nome Percorso</Label>
              <Input
                id="editRouteName"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                placeholder="Es. Percorso Golfo"
              />
            </div>

            <Alert>
              <Info className="h-4 w-4" />
              <AlertDescription className="text-xs">
                Modifica le coordinate GPS. Usa il punto come separatore decimale.
                Le coordinate devono essere diverse da 0,0 per essere valide.
              </AlertDescription>
            </Alert>

            {editingRoute && hasValidFormCoordinates(formData) && (
              <div className="space-y-2">
                <Label>Anteprima Mappa</Label>
                <div className="h-48 rounded-lg overflow-hidden border">
                  <MapContainer 
                    positions={[]}
                    route={{
                      id: editingRoute.id,
                      name: formData.name || editingRoute.name,
                      userId: editingRoute.userId,
                      startPoint1: formData.startPoint1,
                      startPoint2: formData.startPoint2,
                      intermediatePoint1: formData.intermediatePoint1,
                      intermediatePoint2: formData.intermediatePoint2,
                    }}
                    showRouteOnly={true}
                  />
                </div>
              </div>
            )}

            <div className="space-y-3">
              <div className="font-medium text-sm flex items-center gap-2 text-green-600">
                <MapPin className="h-4 w-4" />
                Linea di Partenza (Verde)
              </div>
              
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <Label className="text-xs">Punto 1 - Latitudine</Label>
                  <Input
                    type="number"
                    step="any"
                    value={formData.startPoint1.lat === 0 ? '' : formData.startPoint1.lat}
                    onChange={(e) => updatePoint('startPoint1', 'lat', e.target.value)}
                    placeholder="41.9028"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Punto 1 - Longitudine</Label>
                  <Input
                    type="number"
                    step="any"
                    value={formData.startPoint1.lon === 0 ? '' : formData.startPoint1.lon}
                    onChange={(e) => updatePoint('startPoint1', 'lon', e.target.value)}
                    placeholder="12.4964"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <Label className="text-xs">Punto 2 - Latitudine</Label>
                  <Input
                    type="number"
                    step="any"
                    value={formData.startPoint2.lat === 0 ? '' : formData.startPoint2.lat}
                    onChange={(e) => updatePoint('startPoint2', 'lat', e.target.value)}
                    placeholder="41.9030"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Punto 2 - Longitudine</Label>
                  <Input
                    type="number"
                    step="any"
                    value={formData.startPoint2.lon === 0 ? '' : formData.startPoint2.lon}
                    placeholder="12.4966"
                    onChange={(e) => updatePoint('startPoint2', 'lon', e.target.value)}
                  />
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <div className="font-medium text-sm flex items-center gap-2 text-red-600">
                <MapPin className="h-4 w-4" />
                Linea Intermedia (Rossa)
              </div>
              
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <Label className="text-xs">Punto 3 - Latitudine</Label>
                  <Input
                    type="number"
                    step="any"
                    value={formData.intermediatePoint1.lat === 0 ? '' : formData.intermediatePoint1.lat}
                    onChange={(e) => updatePoint('intermediatePoint1', 'lat', e.target.value)}
                    placeholder="41.9040"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Punto 3 - Longitudine</Label>
                  <Input
                    type="number"
                    step="any"
                    value={formData.intermediatePoint1.lon === 0 ? '' : formData.intermediatePoint1.lon}
                    onChange={(e) => updatePoint('intermediatePoint1', 'lon', e.target.value)}
                    placeholder="12.4970"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <Label className="text-xs">Punto 4 - Latitudine</Label>
                  <Input
                    type="number"
                    step="any"
                    value={formData.intermediatePoint2.lat === 0 ? '' : formData.intermediatePoint2.lat}
                    onChange={(e) => updatePoint('intermediatePoint2', 'lat', e.target.value)}
                    placeholder="41.9042"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Punto 4 - Longitudine</Label>
                  <Input
                    type="number"
                    step="any"
                    value={formData.intermediatePoint2.lon === 0 ? '' : formData.intermediatePoint2.lon}
                    onChange={(e) => updatePoint('intermediatePoint2', 'lon', e.target.value)}
                    placeholder="12.4972"
                  />
                </div>
              </div>
            </div>

            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setShowEditDialog(false)} className="flex-1">
                Annulla
              </Button>
              <Button 
                onClick={handleSubmitEdit} 
                className="flex-1"
                disabled={updateRouteMutation.isPending || !isReady}
              >
                {updateRouteMutation.isPending ? 'Salvando...' : 'Salva'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
