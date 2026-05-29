// import { SelectCellLog } from "@/db/schema";
// import { useEffect, useRef, useState } from "react";

// export interface LatLng {
//   lat: number;
//   lng: number;
// }

// export interface LatLngAcc {
//   location: LatLng;
//   accuracy?: number | null;
//   // TODO: null is this ok?
// }

// export type GeolocationResult = SelectCellLog & LatLngAcc;

// type GeolocationCache = Map<number, LatLngAcc>;

// export const useGeolocation = (logs: SelectCellLog[]) => {
//   const [geolocation, setGeolocation] = useState<GeolocationResult[]>([]);
//   const [isLoading, setLoading] = useState(false);
//   const [error, setError] = useState<Error | null>(null);

//   const fetchedChacheRef = useRef<GeolocationCache>(new Map());

//   useEffect(() => {
//     if (logs.length === 0) {
//       setGeolocation([]);
//       fetchedChacheRef.current.clear();
//       return;
//     }

//     const fetchData = async () => {
//       // 新規で取得が必要なログをフィルタリング
//       const logsToFetch = logs.filter(
//         (log) => !fetchedChacheRef.current.has(log.id)
//       );

//       // 新規取得ログがない場合
//       if (logsToFetch.length == 0) {
//         const updatedGeolocation = logs.map((log) => ({
//           ...log,
//           ...fetchedChacheRef.current.get(log.id)!,
//         }));
//         setGeolocation(updatedGeolocation);
//         return;
//       }

//       // 新しく取得が必要な場合
//       setLoading(true);
//       setError(null);

//       try {
//         const promises = logsToFetch.map(async (log) => {
//           const { mcc, mnc, tac, cid } = log;

//           const res = await fetch("/api/geolocation", {
//             method: "POST",
//             headers: { "Content-Type": "application/json" },
//             body: JSON.stringify({ mcc, mnc, tac, cid }),
//           });

//           if (!res.ok) {
//             const { error: msg } = await res.json();
//             throw new Error(msg || "Failed to fetch geolocation");
//           }

//           const json: LatLngAcc = await res.json();

//           return {
//             id: log.id,
//             data: json,
//           };
//         });

//         const newResults = await Promise.all(promises);

//         newResults.forEach((result) => {
//           fetchedChacheRef.current.set(result.id, result.data);
//         });

//         const updatedGeolocation = logs.map((log) => ({
//           ...log,
//           ...fetchedChacheRef.current.get(log.id)!,
//         }));
//         setGeolocation(updatedGeolocation);
//       } catch (e) {
//         setError(e as Error);
//       } finally {
//         setLoading(false);
//       }
//     };

//     fetchData();
//   }, [logs]);

//   return {
//     geolocation,
//     isLoading,
//     isError: !!error,
//   };
// };
