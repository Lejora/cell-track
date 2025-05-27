import {
  GoogleMap,
  Circle,
  MarkerF,
  useLoadScript,
} from "@react-google-maps/api";
import { useEffect, useState } from "react";
import { Skeleton } from "./ui/skeleton";
import { CellLog } from "./columns";

interface MapViewProps {
  logs: CellLog[];
}

export const MapView = ({ logs }: MapViewProps) => {
  const INIT_CENTER_LAT = 36.108905769550155;
  const INIT_CENTER_LNG = 140.0997873925421;
  const INIT_ZOOM_LEVEL = 15;
  const MAP_WIDTH: number = 1240;
  const MAP_HEIGHT: number = 720;
  const { isLoaded } = useLoadScript({
    googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || "",
  });
  const [map, setMap] = useState<google.maps.Map | null>(null);
  const mapStyles = [
    {
      featureType: "poi.business",
      stylers: [{ visibility: "off" }],
    },
  ];

  // TODO: fix below
  const center = { lat: INIT_CENTER_LAT, lng: INIT_CENTER_LNG };
  const zoom = INIT_ZOOM_LEVEL;

  // useEffect(() => {
  //   if (map && center) {
  //     map.panTo(center);
  //   }
  // }, [center, map]);

  if (!isLoaded) {
    return (
      <Skeleton
        style={{ width: `${MAP_WIDTH}px`, height: `${MAP_HEIGHT}px` }}
      />
    );
  }

  return (
    <GoogleMap
      onLoad={(mapInstance) => setMap(mapInstance)}
      center={center}
      zoom={zoom}
      mapContainerStyle={{ width: `${MAP_WIDTH}px`, height: `${MAP_HEIGHT}px` }}
      options={{
        styles: mapStyles,
        scaleControl: true,
        streetViewControl: false,
        rotateControl: false,
      }}
    >
      {logs.map((log, index) => (
        <MarkerF
          key={index}
          // TODO: FIX THIS
          position={{
            lat: 1,
            lng: 1,
          }}
        />
      ))}
    </GoogleMap>
  );
};
