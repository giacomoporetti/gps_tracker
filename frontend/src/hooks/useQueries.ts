import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useActor } from './useActor';
import { useInternetIdentity } from './useInternetIdentity';
import type { Session, Position, Route, Point, UserProfile } from '@/backend';

export function useGetSessions() {
  const { actor, isFetching } = useActor();
  const { identity, loginStatus, isInitializing } = useInternetIdentity();
  const isReady = !!actor && !isFetching && !isInitializing && loginStatus !== 'logging-in';

  return useQuery<Session[]>({
    queryKey: ['sessions', identity?.getPrincipal().toString()],
    queryFn: async () => {
      if (!actor || !identity) return [];
      const userId = identity.getPrincipal().toString();
      return actor.getUserSessions(userId);
    },
    enabled: isReady && !!identity && !identity.getPrincipal().isAnonymous(),
  });
}

export function useGetSession(id: bigint) {
  const { actor, isFetching } = useActor();
  const { loginStatus, isInitializing } = useInternetIdentity();
  const isReady = !!actor && !isFetching && !isInitializing && loginStatus !== 'logging-in';

  return useQuery<Session | null>({
    queryKey: ['session', id.toString()],
    queryFn: async () => {
      if (!actor) return null;
      return actor.getSession(id);
    },
    enabled: isReady,
  });
}

export function useGetLastSession() {
  const { actor, isFetching } = useActor();
  const { identity, loginStatus, isInitializing } = useInternetIdentity();
  const isReady = !!actor && !isFetching && !isInitializing && loginStatus !== 'logging-in';

  return useQuery<Session | null>({
    queryKey: ['lastSession', identity?.getPrincipal().toString()],
    queryFn: async () => {
      if (!actor || !identity) return null;
      const userId = identity.getPrincipal().toString();
      return actor.getLastSessionForUser(userId);
    },
    enabled: isReady && !!identity && !identity.getPrincipal().isAnonymous(),
  });
}

export function useSaveSession() {
  const { actor, isFetching } = useActor();
  const { identity, loginStatus, isInitializing } = useInternetIdentity();
  const queryClient = useQueryClient();
  const isReady = !!actor && !isFetching && !isInitializing && loginStatus !== 'logging-in';

  return useMutation({
    mutationFn: async ({ 
      startTime, 
      duration, 
      positions, 
      distance, 
      skipperName, 
      boatName, 
      rating,
      routeId,
      intermediateTime,
      finalTime
    }: {
      startTime: bigint;
      duration: bigint;
      positions: Position[];
      distance: number;
      skipperName: string;
      boatName: string;
      rating: number;
      routeId: bigint;
      intermediateTime: bigint | null;
      finalTime: bigint | null;
    }) => {
      if (!actor || !identity || !isReady) {
        throw new Error('Sessione non valida. Effettua nuovamente il login.');
      }
      
      if (identity.getPrincipal().isAnonymous()) {
        throw new Error('Devi essere autenticato per salvare una sessione.');
      }
      
      const userId = identity.getPrincipal().toString();
      return actor.saveSession(
        startTime, 
        duration, 
        positions, 
        distance, 
        skipperName, 
        boatName, 
        BigInt(rating), 
        userId,
        routeId,
        intermediateTime,
        finalTime
      );
    },
    onSuccess: () => {
      const userId = identity?.getPrincipal().toString();
      if (userId) {
        queryClient.invalidateQueries({ queryKey: ['sessions', userId] });
        queryClient.invalidateQueries({ queryKey: ['lastSession', userId] });
      }
    },
  });
}

export function useGetSessionCount() {
  const { actor, isFetching } = useActor();
  const { loginStatus, isInitializing } = useInternetIdentity();
  const isReady = !!actor && !isFetching && !isInitializing && loginStatus !== 'logging-in';

  return useQuery<bigint>({
    queryKey: ['sessionCount'],
    queryFn: async () => {
      if (!actor) return BigInt(0);
      return actor.getSessionCount();
    },
    enabled: isReady,
  });
}

// Route management hooks
export function useGetRoutes() {
  const { actor, isFetching } = useActor();
  const { identity, loginStatus, isInitializing } = useInternetIdentity();
  const isReady = !!actor && !isFetching && !isInitializing && loginStatus !== 'logging-in';

  return useQuery<Route[]>({
    queryKey: ['routes', identity?.getPrincipal().toString()],
    queryFn: async () => {
      if (!actor || !identity) return [];
      const userId = identity.getPrincipal().toString();
      return actor.getRoutes(userId);
    },
    enabled: isReady && !!identity && !identity.getPrincipal().isAnonymous(),
  });
}

export function useGetRoute(routeId: bigint) {
  const { actor, isFetching } = useActor();
  const { loginStatus, isInitializing } = useInternetIdentity();
  const isReady = !!actor && !isFetching && !isInitializing && loginStatus !== 'logging-in';

  return useQuery<Route | null>({
    queryKey: ['route', routeId.toString()],
    queryFn: async () => {
      if (!actor) return null;
      return actor.getRoute(routeId);
    },
    enabled: isReady,
  });
}

export function useCreateRoute() {
  const { actor, isFetching } = useActor();
  const { identity, loginStatus, isInitializing } = useInternetIdentity();
  const queryClient = useQueryClient();
  const isReady = !!actor && !isFetching && !isInitializing && loginStatus !== 'logging-in';

  return useMutation({
    mutationFn: async ({
      name,
      startPoint1,
      startPoint2,
      intermediatePoint1,
      intermediatePoint2
    }: {
      name: string;
      startPoint1: Point;
      startPoint2: Point;
      intermediatePoint1: Point;
      intermediatePoint2: Point;
    }) => {
      if (!actor || !identity || !isReady) {
        throw new Error('Sessione non valida. Effettua nuovamente il login.');
      }
      
      if (identity.getPrincipal().isAnonymous()) {
        throw new Error('Devi essere autenticato per creare un percorso.');
      }
      
      const userId = identity.getPrincipal().toString();
      return actor.createRoute(name, startPoint1, startPoint2, intermediatePoint1, intermediatePoint2, userId);
    },
    onSuccess: () => {
      const userId = identity?.getPrincipal().toString();
      if (userId) {
        queryClient.invalidateQueries({ queryKey: ['routes', userId] });
      }
    },
  });
}

export function useUpdateRoute() {
  const { actor, isFetching } = useActor();
  const { identity, loginStatus, isInitializing } = useInternetIdentity();
  const queryClient = useQueryClient();
  const isReady = !!actor && !isFetching && !isInitializing && loginStatus !== 'logging-in';

  return useMutation({
    mutationFn: async ({
      routeId,
      name,
      startPoint1,
      startPoint2,
      intermediatePoint1,
      intermediatePoint2
    }: {
      routeId: bigint;
      name: string;
      startPoint1: Point;
      startPoint2: Point;
      intermediatePoint1: Point;
      intermediatePoint2: Point;
    }) => {
      if (!actor || !identity || !isReady) {
        throw new Error('Sessione non valida. Effettua nuovamente il login.');
      }
      
      if (identity.getPrincipal().isAnonymous()) {
        throw new Error('Devi essere autenticato per modificare un percorso.');
      }
      
      const userId = identity.getPrincipal().toString();
      return actor.updateRoute(routeId, name, startPoint1, startPoint2, intermediatePoint1, intermediatePoint2, userId);
    },
    onSuccess: (_, variables) => {
      const userId = identity?.getPrincipal().toString();
      if (userId) {
        queryClient.invalidateQueries({ queryKey: ['routes', userId] });
        queryClient.invalidateQueries({ queryKey: ['route', variables.routeId.toString()] });
      }
    },
  });
}

export function useDeleteRoute() {
  const { actor, isFetching } = useActor();
  const { identity, loginStatus, isInitializing } = useInternetIdentity();
  const queryClient = useQueryClient();
  const isReady = !!actor && !isFetching && !isInitializing && loginStatus !== 'logging-in';

  return useMutation({
    mutationFn: async (routeId: bigint) => {
      if (!actor || !identity || !isReady) {
        throw new Error('Sessione non valida. Effettua nuovamente il login.');
      }
      
      if (identity.getPrincipal().isAnonymous()) {
        throw new Error('Devi essere autenticato per eliminare un percorso.');
      }
      
      const userId = identity.getPrincipal().toString();
      return actor.deleteRoute(routeId, userId);
    },
    onSuccess: () => {
      const userId = identity?.getPrincipal().toString();
      if (userId) {
        queryClient.invalidateQueries({ queryKey: ['routes', userId] });
      }
    },
  });
}

export function useFindRoutesWithinDistance() {
  const { actor, isFetching } = useActor();
  const { identity, loginStatus, isInitializing } = useInternetIdentity();
  const isReady = !!actor && !isFetching && !isInitializing && loginStatus !== 'logging-in';

  return useMutation({
    mutationFn: async ({ lat, lon, maxDistance }: { lat: number; lon: number; maxDistance: number }) => {
      if (!actor || !identity || !isReady) {
        throw new Error('Sessione non valida. Effettua nuovamente il login.');
      }
      
      if (identity.getPrincipal().isAnonymous()) {
        throw new Error('Devi essere autenticato per cercare percorsi.');
      }
      
      const userId = identity.getPrincipal().toString();
      return actor.findRoutesWithinDistance(lat, lon, maxDistance, userId);
    },
  });
}

// User profile hooks
export function useGetCallerUserProfile() {
  const { actor, isFetching } = useActor();
  const { identity, loginStatus, isInitializing } = useInternetIdentity();
  const isReady = !!actor && !isFetching && !isInitializing && loginStatus !== 'logging-in';

  const query = useQuery<UserProfile | null>({
    queryKey: ['currentUserProfile', identity?.getPrincipal().toString()],
    queryFn: async () => {
      if (!actor) throw new Error('Actor non disponibile');
      return actor.getCallerUserProfile();
    },
    enabled: isReady && !!identity && !identity.getPrincipal().isAnonymous(),
    retry: false,
  });

  return {
    ...query,
    isLoading: !isReady || query.isLoading,
    isFetched: isReady && query.isFetched,
  };
}

export function useSaveCallerUserProfile() {
  const { actor, isFetching } = useActor();
  const { identity, loginStatus, isInitializing } = useInternetIdentity();
  const queryClient = useQueryClient();
  const isReady = !!actor && !isFetching && !isInitializing && loginStatus !== 'logging-in';

  return useMutation({
    mutationFn: async (profile: UserProfile) => {
      if (!actor || !identity || !isReady) {
        throw new Error('Sessione non valida. Effettua nuovamente il login.');
      }
      
      if (identity.getPrincipal().isAnonymous()) {
        throw new Error('Devi essere autenticato per salvare il profilo.');
      }
      
      return actor.saveCallerUserProfile(profile);
    },
    onSuccess: () => {
      const userId = identity?.getPrincipal().toString();
      if (userId) {
        queryClient.invalidateQueries({ queryKey: ['currentUserProfile', userId] });
      }
    },
  });
}
