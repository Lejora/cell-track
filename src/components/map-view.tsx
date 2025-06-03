import { LatLng, LatLngAcc } from "@/hooks/use-geolocation";
import {
  Circle,
  GoogleMap,
  MarkerF,
  useLoadScript,
} from "@react-google-maps/api";
import { useEffect, useState } from "react";
import { Skeleton } from "./ui/skeleton";

interface MapViewProps {
  points: LatLngAcc[];
}

export const MapView = ({ points }: MapViewProps) => {
  const INIT_CENTER_LAT = 36.108905769550155;
  const INIT_CENTER_LNG = 140.0997873925421;
  const INIT_ZOOM_LEVEL = 15;
  const MAP_WIDTH: number = 1240;
  const MAP_HEIGHT: number = 620;
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
  const [center, setCenter] = useState<LatLng>({ lat: INIT_CENTER_LAT, lng: INIT_CENTER_LNG })
  const zoom = INIT_ZOOM_LEVEL;

  useEffect(() => {
    if (points.length > 0 && map && center) {
      setCenter(points[0].location)
      map.panTo(center);
    }
  }, [center, map, points]);

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
      {points.map((point, index) => (
        <div key={index}>
          <MarkerF
            key={index}
            position={{ lat: point.location.lat, lng: point.location.lng }}
          />
          {point.accuracy && (
            <Circle
              center={{ lat: point.location.lat, lng: point.location.lng }}
              radius={point.accuracy}
              options={{
                fillColor: "#fa6e6e",
                fillOpacity: 0.05,
                strokeColor: "#fa6e6e",
                strokeOpacity: 0.7,
                strokeWeight: 1,
              }}
            />
          )}
        </div>
      ))}
    </GoogleMap>
  );
};
