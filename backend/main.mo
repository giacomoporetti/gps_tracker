import OrderedMap "mo:base/OrderedMap";
import Nat "mo:base/Nat";
import Int "mo:base/Int";
import Iter "mo:base/Iter";
import Time "mo:base/Time";
import Text "mo:base/Text";
import Float "mo:base/Float";
import Array "mo:base/Array";
import Debug "mo:base/Debug";
import AccessControl "authorization/access-control";
import Principal "mo:base/Principal";
import Migration "migration";

(with migration = Migration.run)
actor GpsTracker {
  transient let sessionMap = OrderedMap.Make<Nat>(Nat.compare);
  transient let userMap = OrderedMap.Make<Text>(Text.compare);
  transient let routeMap = OrderedMap.Make<Nat>(Nat.compare);
  transient let principalMap = OrderedMap.Make<Principal>(Principal.compare);

  type Position = {
    lat : Float;
    lon : Float;
    timestamp : Int;
  };

  type Point = {
    lat : Float;
    lon : Float;
  };

  type Route = {
    id : Nat;
    name : Text;
    startPoint1 : Point;
    startPoint2 : Point;
    intermediatePoint1 : Point;
    intermediatePoint2 : Point;
    userId : Text;
  };

  type Session = {
    id : Nat;
    startTime : Int;
    duration : Int;
    positions : [Position];
    pointsCount : Nat;
    distance : Float;
    skipperName : Text;
    boatName : Text;
    rating : Nat;
    userId : Text;
    routeId : Nat;
    intermediateTime : ?Int;
    finalTime : ?Int;
  };

  type UserProfile = {
    username : Text;
    email : Text;
    boatName : Text;
    boatCategory : Text;
    boatRating : Nat;
  };

  var sessions : OrderedMap.Map<Nat, Session> = sessionMap.empty<Session>();
  var userSessions : OrderedMap.Map<Text, [Nat]> = userMap.empty<[Nat]>();
  var routes : OrderedMap.Map<Nat, Route> = routeMap.empty<Route>();
  var nextSessionId = 0;
  var nextRouteId = 0;
  var userProfiles : OrderedMap.Map<Principal, UserProfile> = principalMap.empty<UserProfile>();

  let accessControlState = AccessControl.initState();

  public shared ({ caller }) func initializeAccessControl() : async () {
    AccessControl.initialize(accessControlState, caller);
  };

  public query ({ caller }) func getCallerUserRole() : async AccessControl.UserRole {
    AccessControl.getUserRole(accessControlState, caller);
  };

  public shared ({ caller }) func assignCallerUserRole(user : Principal, role : AccessControl.UserRole) : async () {
    AccessControl.assignRole(accessControlState, caller, user, role);
  };

  public query ({ caller }) func isCallerAdmin() : async Bool {
    AccessControl.isAdmin(accessControlState, caller);
  };

  public query ({ caller }) func getCallerUserProfile() : async ?UserProfile {
    principalMap.get(userProfiles, caller);
  };

  public query func getUserProfile(user : Principal) : async ?UserProfile {
    principalMap.get(userProfiles, user);
  };

  public shared ({ caller }) func saveCallerUserProfile(profile : UserProfile) : async () {
    userProfiles := principalMap.put(userProfiles, caller, profile);
  };

  public shared ({ caller }) func saveSession(startTime : Int, duration : Int, positions : [Position], distance : Float, skipperName : Text, boatName : Text, rating : Nat, userId : Text, routeId : Nat, intermediateTime : ?Int, finalTime : ?Int) : async Nat {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Debug.trap("Non autorizzato: solo utenti autenticati possono salvare sessioni");
    };

    let sessionId = nextSessionId;
    let newSession : Session = {
      id = sessionId;
      startTime;
      duration;
      positions;
      pointsCount = positions.size();
      distance;
      skipperName;
      boatName;
      rating;
      userId;
      routeId;
      intermediateTime;
      finalTime;
    };

    sessions := sessionMap.put(sessions, sessionId, newSession);

    switch (userMap.get(userSessions, userId)) {
      case (null) {
        userSessions := userMap.put(userSessions, userId, [sessionId]);
      };
      case (?existingSessions) {
        let updatedSessions = Array.append(existingSessions, [sessionId]);
        userSessions := userMap.put(userSessions, userId, updatedSessions);
      };
    };

    nextSessionId += 1;
    sessionId;
  };

  public shared ({ caller }) func createRoute(name : Text, startPoint1 : Point, startPoint2 : Point, intermediatePoint1 : Point, intermediatePoint2 : Point, userId : Text) : async Nat {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Debug.trap("Non autorizzato: solo utenti autenticati possono creare percorsi");
    };

    // Validate points
    if (not isValidPoint(startPoint1) or not isValidPoint(startPoint2) or not isValidPoint(intermediatePoint1) or not isValidPoint(intermediatePoint2)) {
      Debug.trap("Errore di validazione: tutti i punti devono avere coordinate valide");
    };

    let routeId = nextRouteId;
    let newRoute : Route = {
      id = routeId;
      name;
      startPoint1;
      startPoint2;
      intermediatePoint1;
      intermediatePoint2;
      userId;
    };

    routes := routeMap.put(routes, routeId, newRoute);
    nextRouteId += 1;
    routeId;
  };

  func isValidPoint(point : Point) : Bool {
    point.lat >= -90.0 and point.lat <= 90.0 and point.lon >= -180.0 and point.lon <= 180.0
  };

  public shared ({ caller }) func updateRoute(routeId : Nat, name : Text, startPoint1 : Point, startPoint2 : Point, intermediatePoint1 : Point, intermediatePoint2 : Point, userId : Text) : async Bool {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Debug.trap("Non autorizzato: solo utenti autenticati possono modificare percorsi");
    };

    switch (routeMap.get(routes, routeId)) {
      case (null) { false };
      case (?existingRoute) {
        if (existingRoute.userId != userId) {
          Debug.trap("Non autorizzato: puoi modificare solo i tuoi percorsi");
        };

        // Validate points
        if (not isValidPoint(startPoint1) or not isValidPoint(startPoint2) or not isValidPoint(intermediatePoint1) or not isValidPoint(intermediatePoint2)) {
          Debug.trap("Errore di validazione: tutti i punti devono avere coordinate valide");
        };

        let updatedRoute : Route = {
          id = routeId;
          name;
          startPoint1;
          startPoint2;
          intermediatePoint1;
          intermediatePoint2;
          userId;
        };
        routes := routeMap.put(routes, routeId, updatedRoute);
        true;
      };
    };
  };

  public shared ({ caller }) func deleteRoute(routeId : Nat, userId : Text) : async Bool {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Debug.trap("Non autorizzato: solo utenti autenticati possono eliminare percorsi");
    };

    switch (routeMap.get(routes, routeId)) {
      case (null) { false };
      case (?existingRoute) {
        if (existingRoute.userId != userId) {
          Debug.trap("Non autorizzato: puoi eliminare solo i tuoi percorsi");
        };

        routes := routeMap.delete(routes, routeId);
        true;
      };
    };
  };

  public query ({ caller }) func getRoutes(userId : Text) : async [Route] {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Debug.trap("Non autorizzato: solo utenti autenticati possono visualizzare percorsi");
    };

    let userRoutes = Iter.toArray(routeMap.vals(routes));
    Array.filter<Route>(userRoutes, func(route) { route.userId == userId });
  };

  public query ({ caller }) func getRoute(routeId : Nat) : async ?Route {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Debug.trap("Non autorizzato: solo utenti autenticati possono visualizzare percorsi");
    };

    routeMap.get(routes, routeId);
  };

  public query ({ caller }) func getSessions() : async [Session] {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Debug.trap("Non autorizzato: solo utenti autenticati possono visualizzare sessioni");
    };

    Iter.toArray(sessionMap.vals(sessions));
  };

  public query ({ caller }) func getSession(id : Nat) : async ?Session {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Debug.trap("Non autorizzato: solo utenti autenticati possono visualizzare sessioni");
    };

    sessionMap.get(sessions, id);
  };

  public query ({ caller }) func getSessionCount() : async Nat {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Debug.trap("Non autorizzato: solo utenti autenticati possono visualizzare il conteggio delle sessioni");
    };

    sessionMap.size(sessions);
  };

  public query func getCurrentTime() : async Int {
    Time.now();
  };

  public query ({ caller }) func getLastSessionForUser(userId : Text) : async ?Session {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Debug.trap("Non autorizzato: solo utenti autenticati possono visualizzare l'ultima sessione");
    };

    switch (userMap.get(userSessions, userId)) {
      case (null) { null };
      case (?sessionIds) {
        if (sessionIds.size() == 0) {
          null;
        } else {
          let lastSessionId = sessionIds[sessionIds.size() - 1];
          sessionMap.get(sessions, lastSessionId);
        };
      };
    };
  };

  public query ({ caller }) func getUserSessions(userId : Text) : async [Session] {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Debug.trap("Non autorizzato: solo utenti autenticati possono visualizzare le proprie sessioni");
    };

    switch (userMap.get(userSessions, userId)) {
      case (null) { [] };
      case (?sessionIds) {
        let userSessions = Array.mapFilter<Nat, Session>(
          sessionIds,
          func(id) {
            sessionMap.get(sessions, id);
          },
        );
        userSessions;
      };
    };
  };

  public query ({ caller }) func findRoutesWithinDistance(lat : Float, lon : Float, maxDistance : Float, userId : Text) : async [Route] {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Debug.trap("Non autorizzato: solo utenti autenticati possono cercare percorsi");
    };

    let userRoutes = Iter.toArray(routeMap.vals(routes));
    let filteredRoutes = Array.filter<Route>(userRoutes, func(route) { route.userId == userId });

    Array.filter<Route>(
      filteredRoutes,
      func(route) {
        let distance = haversineDistance(lat, lon, route.startPoint1.lat, route.startPoint1.lon);
        distance <= maxDistance;
      },
    );
  };

  func haversineDistance(lat1 : Float, lon1 : Float, lat2 : Float, lon2 : Float) : Float {
    let R = 6371.0;
    let dLat = degreesToRadians(lat2 - lat1);
    let dLon = degreesToRadians(lon2 - lon1);
    let a = Float.sin(dLat / 2.0) ** 2.0 + Float.cos(degreesToRadians(lat1)) * Float.cos(degreesToRadians(lat2)) * Float.sin(dLon / 2.0) ** 2.0;
    let c = 2.0 * Float.arctan2(Float.sqrt(a), Float.sqrt(1.0 - a));
    R * c;
  };

  func degreesToRadians(degrees : Float) : Float {
    degrees * 3.141592653589793 / 180.0;
  };
};

