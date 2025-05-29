import { useState, useEffect } from "react";
import { CellLog } from "@/components/columns";

export interface LatLng {
  lat: number;
  lng: number;
}

export interface LatLngAcc {
  location: LatLng;
  accuracy?: number;
}

export const useGeolocations = (logs: CellLog[]) => {
  const [geolocations, setGeolocations] = useState<LatLngAcc[]>([]);
  const [isLoading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (logs.length === 0) {
      setGeolocations([]);
      return;
    }

    setLoading(true);
    setError(null);

    (async () => {
      try {
        const resArr = await Promise.all(
          logs.map(async ({ mcc, mnc, tac, cid }) => {
            const res = await fetch("/api/geolocation", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ mcc, mnc, tac, cid }),
            });
            if (!res.ok) {
              const { error: msg } = await res.json();
              throw new Error(msg || "Failed to fetch");
            }
            const json: { location: LatLng; accuracy?: number } = await res.json();
            return {
              location: json.location,
              accuracy: json.accuracy,
            };
          })
        );
        setGeolocations(resArr);
      } catch (e) {
        setError(e as Error);
      } finally {
        setLoading(false);
      }
    })();
  }, [logs]);

  return {
    geolocations,
    isLoading,
    isError: !!error,
  };
};
