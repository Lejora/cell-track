import { SelectCellLog } from "@/db/schema";
import { useEffect, useState } from "react";

export interface LatLng {
  lat: number;
  lng: number;
}

export interface LatLngAcc {
  location: LatLng;
  accuracy?: number;
}

export const useGeolocation = (logs: SelectCellLog[]) => {
  const [geolocation, setGeolocation] = useState<LatLngAcc[]>([]);
  const [isLoading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (logs.length === 0) {
      setGeolocation([]);
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
            const json: { location: LatLng; accuracy?: number } =
              await res.json();
            return {
              location: json.location,
              accuracy: json.accuracy,
            };
          })
        );
        setGeolocation(resArr);
      } catch (e) {
        setError(e as Error);
      } finally {
        setLoading(false);
      }
    })();
  }, [logs]);

  return {
    geolocation,
    isLoading,
    isError: !!error,
  };
};
