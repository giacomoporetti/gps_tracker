import type { Principal } from "@icp-sdk/core/principal";
export interface Some<T> {
    __kind__: "Some";
    value: T;
}
export interface None {
    __kind__: "None";
}
export type Option<T> = Some<T> | None;
export interface Point {
    lat: number;
    lon: number;
}
export interface Session {
    id: bigint;
    startTime: bigint;
    duration: bigint;
    skipperName: string;
    userId: string;
    distance: number;
    pointsCount: bigint;
    finalTime?: bigint;
    routeId: bigint;
    boatName: string;
    rating: bigint;
    positions: Array<Position>;
    intermediateTime?: bigint;
}
export interface Position {
    lat: number;
    lon: number;
    timestamp: bigint;
}
export interface UserProfile {
    boatCategory: string;
    username: string;
    email: string;
    boatRating: bigint;
    boatName: string;
}
export interface Route {
    id: bigint;
    userId: string;
    name: string;
    startPoint1: Point;
    startPoint2: Point;
    intermediatePoint1: Point;
    intermediatePoint2: Point;
}
export enum UserRole {
    admin = "admin",
    user = "user",
    guest = "guest"
}
export interface backendInterface {
    assignCallerUserRole(user: Principal, role: UserRole): Promise<void>;
    createRoute(name: string, startPoint1: Point, startPoint2: Point, intermediatePoint1: Point, intermediatePoint2: Point, userId: string): Promise<bigint>;
    deleteRoute(routeId: bigint, userId: string): Promise<boolean>;
    findRoutesWithinDistance(lat: number, lon: number, maxDistance: number, userId: string): Promise<Array<Route>>;
    getCallerUserProfile(): Promise<UserProfile | null>;
    getCallerUserRole(): Promise<UserRole>;
    getCurrentTime(): Promise<bigint>;
    getLastSessionForUser(userId: string): Promise<Session | null>;
    getRoute(routeId: bigint): Promise<Route | null>;
    getRoutes(userId: string): Promise<Array<Route>>;
    getSession(id: bigint): Promise<Session | null>;
    getSessionCount(): Promise<bigint>;
    getSessions(): Promise<Array<Session>>;
    getUserProfile(user: Principal): Promise<UserProfile | null>;
    getUserSessions(userId: string): Promise<Array<Session>>;
    initializeAccessControl(): Promise<void>;
    isCallerAdmin(): Promise<boolean>;
    saveCallerUserProfile(profile: UserProfile): Promise<void>;
    saveSession(startTime: bigint, duration: bigint, positions: Array<Position>, distance: number, skipperName: string, boatName: string, rating: bigint, userId: string, routeId: bigint, intermediateTime: bigint | null, finalTime: bigint | null): Promise<bigint>;
    updateRoute(routeId: bigint, name: string, startPoint1: Point, startPoint2: Point, intermediatePoint1: Point, intermediatePoint2: Point, userId: string): Promise<boolean>;
}