import { Marker, Tooltip } from "react-leaflet";
import L from "leaflet";

interface UserMarkerProps {
  position: L.LatLng;
  speed: number;
}

const UserMarker = ({ position, speed }: UserMarkerProps) => {
  return (
    <Marker position={position}>
      <Tooltip direction="top" offset={[0, -10]} permanent>
        Speed: {speed.toFixed(2)} knots
      </Tooltip>
    </Marker>
  );
};

export default UserMarker;
