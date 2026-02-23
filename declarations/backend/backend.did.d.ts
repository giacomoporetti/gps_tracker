import type { Principal } from '@dfinity/principal';
import type { ActorMethod } from '@dfinity/agent';
import type { IDL } from '@dfinity/candid';

export interface Point { 'lat' : number, 'lon' : number }
export interface Position {
  'lat' : number,
  'lon' : number,
  'timestamp' : bigint,
}
export interface Route {
  'id' : bigint,
  'userId' : string,
  'name' : string,
  'startPoint1' : Point,
  'startPoint2' : Point,
  'intermediatePoint1' : Point,
  'intermediatePoint2' : Point,
}
export interface Session {
  'id' : bigint,
  'startTime' : bigint,
  'duration' : bigint,
  'skipperName' : string,
  'userId' : string,
  'distance' : number,
  'pointsCount' : bigint,
  'finalTime' : [] | [bigint],
  'routeId' : bigint,
  'boatName' : string,
  'rating' : bigint,
  'positions' : Array<Position>,
  'intermediateTime' : [] | [bigint],
}
export interface UserProfile { 'name' : string }
export type UserRole = { 'admin' : null } |
  { 'user' : null } |
  { 'guest' : null };
export interface _SERVICE {
  'assignCallerUserRole' : ActorMethod<[Principal, UserRole], undefined>,
  'createRoute' : ActorMethod<
    [string, Point, Point, Point, Point, string],
    bigint
  >,
  'deleteRoute' : ActorMethod<[bigint, string], boolean>,
  'findRoutesWithinDistance' : ActorMethod<
    [number, number, number, string],
    Array<Route>
  >,
  'getCallerUserProfile' : ActorMethod<[], [] | [UserProfile]>,
  'getCallerUserRole' : ActorMethod<[], UserRole>,
  'getCurrentTime' : ActorMethod<[], bigint>,
  'getLastSessionForUser' : ActorMethod<[string], [] | [Session]>,
  'getRoute' : ActorMethod<[bigint], [] | [Route]>,
  'getRoutes' : ActorMethod<[string], Array<Route>>,
  'getSession' : ActorMethod<[bigint], [] | [Session]>,
  'getSessionCount' : ActorMethod<[], bigint>,
  'getSessions' : ActorMethod<[], Array<Session>>,
  'getUserProfile' : ActorMethod<[Principal], [] | [UserProfile]>,
  'getUserSessions' : ActorMethod<[string], Array<Session>>,
  'initializeAccessControl' : ActorMethod<[], undefined>,
  'isCallerAdmin' : ActorMethod<[], boolean>,
  'saveCallerUserProfile' : ActorMethod<[UserProfile], undefined>,
  'saveSession' : ActorMethod<
    [
      bigint,
      bigint,
      Array<Position>,
      number,
      string,
      string,
      bigint,
      string,
      bigint,
      [] | [bigint],
      [] | [bigint],
    ],
    bigint
  >,
  'updateRoute' : ActorMethod<
    [bigint, string, Point, Point, Point, Point, string],
    boolean
  >,
}
export declare const idlFactory: IDL.InterfaceFactory;
export declare const init: (args: { IDL: typeof IDL }) => IDL.Type[];
