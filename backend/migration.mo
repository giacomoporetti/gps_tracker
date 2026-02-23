import OrderedMap "mo:base/OrderedMap";
import Nat "mo:base/Nat";
import Text "mo:base/Text";
import Principal "mo:base/Principal";

module {
  type OldActor = {
    sessions : OrderedMap.Map<Nat, {
      id : Nat;
      startTime : Int;
      duration : Int;
      positions : [{
        lat : Float;
        lon : Float;
        timestamp : Int;
      }];
      pointsCount : Nat;
      distance : Float;
      skipperName : Text;
      boatName : Text;
      rating : Nat;
      userId : Text;
      routeId : Nat;
      intermediateTime : ?Int;
      finalTime : ?Int;
    }>;
    userSessions : OrderedMap.Map<Text, [Nat]>;
    routes : OrderedMap.Map<Nat, {
      id : Nat;
      name : Text;
      startPoint1 : {
        lat : Float;
        lon : Float;
      };
      startPoint2 : {
        lat : Float;
        lon : Float;
      };
      intermediatePoint1 : {
        lat : Float;
        lon : Float;
      };
      intermediatePoint2 : {
        lat : Float;
        lon : Float;
      };
      userId : Text;
    }>;
    nextSessionId : Nat;
    nextRouteId : Nat;
    userProfiles : OrderedMap.Map<Principal, {
      name : Text;
    }>;
  };

  type NewActor = {
    sessions : OrderedMap.Map<Nat, {
      id : Nat;
      startTime : Int;
      duration : Int;
      positions : [{
        lat : Float;
        lon : Float;
        timestamp : Int;
      }];
      pointsCount : Nat;
      distance : Float;
      skipperName : Text;
      boatName : Text;
      rating : Nat;
      userId : Text;
      routeId : Nat;
      intermediateTime : ?Int;
      finalTime : ?Int;
    }>;
    userSessions : OrderedMap.Map<Text, [Nat]>;
    routes : OrderedMap.Map<Nat, {
      id : Nat;
      name : Text;
      startPoint1 : {
        lat : Float;
        lon : Float;
      };
      startPoint2 : {
        lat : Float;
        lon : Float;
      };
      intermediatePoint1 : {
        lat : Float;
        lon : Float;
      };
      intermediatePoint2 : {
        lat : Float;
        lon : Float;
      };
      userId : Text;
    }>;
    nextSessionId : Nat;
    nextRouteId : Nat;
    userProfiles : OrderedMap.Map<Principal, {
      username : Text;
      email : Text;
      boatName : Text;
      boatCategory : Text;
      boatRating : Nat;
    }>;
  };

  public func run(old : OldActor) : NewActor {
    let principalMap = OrderedMap.Make<Principal>(Principal.compare);
    let userProfiles = principalMap.map<{
      name : Text;
    }, {
      username : Text;
      email : Text;
      boatName : Text;
      boatCategory : Text;
      boatRating : Nat;
    }>(
      old.userProfiles,
      func(_principal, oldProfile) {
        {
          username = oldProfile.name;
          email = "";
          boatName = "";
          boatCategory = "";
          boatRating = 0;
        };
      },
    );

    {
      sessions = old.sessions;
      userSessions = old.userSessions;
      routes = old.routes;
      nextSessionId = old.nextSessionId;
      nextRouteId = old.nextRouteId;
      userProfiles;
    };
  };
};

