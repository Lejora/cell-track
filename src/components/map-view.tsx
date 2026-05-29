import { useSettings } from "@/contexts/settings-context";
import { SelectCellLog } from "@/db/schema";
import type { CellLogMapPoint } from "@/lib/queries";
import { formatCustomTimestamp } from "@/lib/utils";
import {
  Circle,
  GoogleMap,
  InfoWindowF,
  MarkerF,
  PolylineF,
  useLoadScript,
} from "@react-google-maps/api";
import {
  CSSProperties,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { Skeleton } from "./ui/skeleton";

interface MapViewProps {
  points: CellLogMapPoint[];
  projectId?: number | null;
  selectedIds?: Set<number>;
  activeId?: number | null;
  onMarkerClick?: (id: number) => void;
  onMapClick?: () => void;
  fitRequest?: { ids: number[]; nonce: number } | null;
  fitPadding?: google.maps.Padding;
  mapContainerStyle?: CSSProperties;
  mapContainerClassName?: string;
  legacyMode?: boolean;
  // TODO: TMP
  gpsPoints?: SelectCellLog[];
}

const DEFAULT_CENTER_LAT = 36.108905769550155;
const DEFAULT_CENTER_LNG = 140.0997873925421;
const DEFAULT_ZOOM_LEVEL = 15;

const MAP_STYLES = [
  {
    featureType: "poi.business",
    stylers: [{ visibility: "off" }],
  },
];

const MAP_OPTIONS: google.maps.MapOptions = {
  styles: MAP_STYLES,
  scaleControl: true,
  streetViewControl: false,
  rotateControl: false,
  mapTypeControl: false,
  fullscreenControl: false,
};

const DEFAULT_MAP_CONTAINER_STYLE: CSSProperties = {
  width: "100%",
  height: "100%",
  minHeight: "560px",
};

const MAX_VISIBLE_MARKERS = 300;
const MAX_SELECTED_POLYLINE_POINTS = 1500;

const DEFAULT_CIRCLE_OPTIONS = {
  fillColor: "#fa6e6e",
  fillOpacity: 0.05,
  strokeColor: "#fa6e6e",
  strokeOpacity: 0.7,
  strokeWeight: 1,
};

type PlottablePoint = {
  point: CellLogMapPoint;
  position: google.maps.LatLngLiteral;
};

type ManagedMarker = {
  marker: google.maps.Marker;
  clickListener: google.maps.MapsEventListener;
  signature: string;
};

type MarkerIconSet = {
  default: google.maps.Symbol;
  selected: google.maps.Symbol;
  active: google.maps.Symbol;
  cluster: google.maps.Symbol;
};

type LegacyMarkerIconSet = {
  cell: google.maps.Icon;
  gps: google.maps.Icon;
};

function toPosition(point: {
  lat: number | string | null;
  lng: number | string | null;
}): google.maps.LatLngLiteral | null {
  const lat = typeof point.lat === "string" ? Number(point.lat) : point.lat;
  const lng = typeof point.lng === "string" ? Number(point.lng) : point.lng;

  if (
    typeof lat !== "number" ||
    typeof lng !== "number" ||
    !Number.isFinite(lat) ||
    !Number.isFinite(lng)
  ) {
    return null;
  }

  return { lat, lng };
}

function sortByTime(a: PlottablePoint, b: PlottablePoint) {
  return String(a.point.time ?? "").localeCompare(String(b.point.time ?? ""));
}

function sortGpsByTime(
  a: { point: SelectCellLog },
  b: { point: SelectCellLog }
) {
  return String(a.point.time ?? "").localeCompare(String(b.point.time ?? ""));
}

function boundsAreClose(
  a: google.maps.LatLngBoundsLiteral | null,
  b: google.maps.LatLngBoundsLiteral
) {
  if (!a) return false;
  const epsilon = 0.000001;
  return (
    Math.abs(a.north - b.north) < epsilon &&
    Math.abs(a.south - b.south) < epsilon &&
    Math.abs(a.east - b.east) < epsilon &&
    Math.abs(a.west - b.west) < epsilon
  );
}

function expandBounds(bounds: google.maps.LatLngBoundsLiteral) {
  const latPadding = Math.max((bounds.north - bounds.south) * 0.2, 0.002);
  const lngSpan =
    bounds.west <= bounds.east
      ? bounds.east - bounds.west
      : 360 - bounds.west + bounds.east;
  const lngPadding = Math.max(lngSpan * 0.2, 0.002);

  return {
    north: Math.min(90, bounds.north + latPadding),
    south: Math.max(-90, bounds.south - latPadding),
    east: bounds.east + lngPadding,
    west: bounds.west - lngPadding,
  };
}

function isPositionWithinBounds(
  position: google.maps.LatLngLiteral,
  bounds: google.maps.LatLngBoundsLiteral
) {
  const withinLat = position.lat >= bounds.south && position.lat <= bounds.north;
  const west = ((bounds.west + 180) % 360) - 180;
  const east = ((bounds.east + 180) % 360) - 180;
  const lng = ((position.lng + 180) % 360) - 180;
  const withinLng =
    west <= east ? lng >= west && lng <= east : lng >= west || lng <= east;

  return withinLat && withinLng;
}

function createDotIcon(
  maps: typeof google.maps,
  color: string,
  scale: number
): google.maps.Symbol {
  return {
    path: maps.SymbolPath.CIRCLE,
    scale,
    fillColor: color,
    fillOpacity: 0.95,
    strokeColor: "#ffffff",
    strokeOpacity: 1,
    strokeWeight: 2,
  };
}

function getMarkerScale(point: CellLogMapPoint) {
  if (!point.cluster) return 6;
  const count = point.count ?? 1;
  return Math.min(18, 9 + Math.log10(count) * 5);
}

function samplePath<T>(items: T[], maxItems: number) {
  if (items.length <= maxItems) return items;
  if (maxItems <= 2) return [items[0], items[items.length - 1]];

  const step = (items.length - 1) / (maxItems - 1);
  return Array.from({ length: maxItems }, (_, index) => {
    const sourceIndex =
      index === maxItems - 1 ? items.length - 1 : Math.floor(index * step);
    return items[sourceIndex];
  });
}

function createLegacyPinIcon(
  maps: typeof google.maps,
  color: string
): google.maps.Icon {
  const svg = encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="28" height="40" viewBox="0 0 28 40"><path fill="${color}" stroke="#ffffff" stroke-width="2" d="M14 1C7.4 1 2 6.4 2 13c0 9 12 25 12 25s12-16 12-25C26 6.4 20.6 1 14 1z"/><circle cx="14" cy="13" r="4.5" fill="#ffffff"/></svg>`
  );

  return {
    url: `data:image/svg+xml;charset=UTF-8,${svg}`,
    scaledSize: new maps.Size(28, 40),
    anchor: new maps.Point(14, 40),
  };
}

function getComparableTimeValue(time: string | null | undefined) {
  if (!time) return null;
  const digits = String(time).replace(/\D/g, "");
  if (digits.length < 12) return null;
  return digits.slice(0, 12);
}

export const MapView = ({
  points,
  projectId,
  selectedIds = new Set<number>(),
  activeId,
  onMarkerClick,
  onMapClick,
  fitRequest,
  fitPadding,
  mapContainerStyle,
  mapContainerClassName,
  legacyMode = false,
  gpsPoints,
}: MapViewProps) => {
  const { isLoaded } = useLoadScript({
    googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || "",
  });

  const { settings } = useSettings();
  const mapRef = useRef<google.maps.Map | null>(null);
  const fittedProjectIdRef = useRef<number | null>(null);
  const markerByIdRef = useRef<Map<number, ManagedMarker>>(new Map());
  const onMarkerClickRef = useRef(onMarkerClick);
  const boundsFrameRef = useRef<number | null>(null);
  const [visibleBounds, setVisibleBounds] =
    useState<google.maps.LatLngBoundsLiteral | null>(null);

  useEffect(() => {
    onMarkerClickRef.current = onMarkerClick;
  }, [onMarkerClick]);

  const defaultCenter = useMemo<google.maps.LatLngLiteral>(
    () => ({
      lat: settings?.defaultMapLat ?? DEFAULT_CENTER_LAT,
      lng: settings?.defaultMapLng ?? DEFAULT_CENTER_LNG,
    }),
    [settings?.defaultMapLat, settings?.defaultMapLng]
  );

  const plottablePoints = useMemo<PlottablePoint[]>(
    () =>
      points.flatMap((point) => {
        const position = toPosition(point);
        return position ? [{ point, position }] : [];
      }),
    [points]
  );

  const plottableById = useMemo(
    () => new Map(plottablePoints.map((item) => [item.point.id, item])),
    [plottablePoints]
  );

  const emitBoundsChanged = useCallback(() => {
    if (boundsFrameRef.current !== null) {
      window.cancelAnimationFrame(boundsFrameRef.current);
    }

    boundsFrameRef.current = window.requestAnimationFrame(() => {
      boundsFrameRef.current = null;
      const bounds = mapRef.current?.getBounds();
      if (!bounds) return;
      const nextBounds = bounds.toJSON();
      setVisibleBounds((currentBounds) =>
        boundsAreClose(currentBounds, nextBounds) ? currentBounds : nextBounds
      );
    });
  }, []);

  useEffect(
    () => () => {
      if (boundsFrameRef.current !== null) {
        window.cancelAnimationFrame(boundsFrameRef.current);
      }
    },
    []
  );

  useEffect(() => {
    if (!mapRef.current) return;
    emitBoundsChanged();
  }, [emitBoundsChanged]);

  const fitToPositions = useCallback(
    (positions: google.maps.LatLngLiteral[]) => {
      if (!isLoaded || typeof window === "undefined" || !window.google) return;
      const map = mapRef.current;
      if (!map || positions.length === 0) return;

      if (positions.length === 1) {
        map.panTo(positions[0]);
        map.setZoom(Math.max(map.getZoom() ?? DEFAULT_ZOOM_LEVEL, 16));
        return;
      }

      const bounds = new window.google.maps.LatLngBounds();
      positions.forEach((position) => bounds.extend(position));
      map.fitBounds(bounds, fitPadding);
    },
    [fitPadding, isLoaded]
  );

  const onMapLoad = useCallback(
    (mapInstance: google.maps.Map) => {
      mapRef.current = mapInstance;
      emitBoundsChanged();
    },
    [emitBoundsChanged]
  );

  useEffect(() => {
    if (!mapRef.current || !projectId || plottablePoints.length === 0) return;
    if (fittedProjectIdRef.current === projectId) return;

    fittedProjectIdRef.current = projectId;
    fitToPositions(plottablePoints.map((item) => item.position));
  }, [fitToPositions, plottablePoints, projectId]);

  useEffect(() => {
    if (!projectId) {
      fittedProjectIdRef.current = null;
    }
  }, [projectId]);

  useEffect(() => {
    if (!fitRequest) return;
    const positions = fitRequest.ids.flatMap((id) => {
      const item = plottableById.get(id);
      return item ? [item.position] : [];
    });
    fitToPositions(positions);
  }, [fitRequest, fitToPositions, plottableById]);

  const circleOptions = useMemo(
    () => ({
      fillColor: settings?.circleColor ?? DEFAULT_CIRCLE_OPTIONS.fillColor,
      fillOpacity:
        settings?.circleOpacity ?? DEFAULT_CIRCLE_OPTIONS.fillOpacity,
      strokeColor: settings?.circleColor ?? DEFAULT_CIRCLE_OPTIONS.strokeColor,
      strokeOpacity: 0.7,
      strokeWeight: 1,
    }),
    [settings?.circleColor, settings?.circleOpacity]
  );

  const selectedPolylineOptions = useMemo<
    google.maps.PolylineOptions | undefined
  >(() => {
    if (!isLoaded || typeof window === "undefined" || !window.google) {
      return undefined;
    }
    const g = window.google as typeof google;
    return {
      strokeColor: "#fa6e6e",
      strokeOpacity: 0.9,
      strokeWeight: 3,
      icons: [
        {
          icon: {
            path: g.maps.SymbolPath.FORWARD_CLOSED_ARROW,
            scale: 4,
            strokeColor: "#fa6e6e",
            fillColor: "#fa6e6e",
            fillOpacity: 1,
          },
          offset: "100%",
          repeat: "140px",
        },
      ],
    };
  }, [isLoaded]);

  const gpsPolylineOptions = useMemo<
    google.maps.PolylineOptions | undefined
  >(() => {
    if (!isLoaded || typeof window === "undefined" || !window.google) {
      return undefined;
    }
    const g = window.google as typeof google;
    return {
      strokeColor: "#3b82f6",
      strokeOpacity: 0.8,
      strokeWeight: 2,
      icons: [
        {
          icon: {
            path: g.maps.SymbolPath.FORWARD_CLOSED_ARROW,
            scale: 4,
            strokeColor: "#3b82f6",
            fillColor: "#3b82f6",
            fillOpacity: 1,
          },
          offset: "100%",
          repeat: "140px",
        },
      ],
    };
  }, [isLoaded]);

  const legacyCellPolylineOptions = useMemo<
    google.maps.PolylineOptions | undefined
  >(() => {
    if (!isLoaded || typeof window === "undefined" || !window.google) {
      return undefined;
    }
    return {
      strokeColor: "#ef4444",
      strokeOpacity: 0.9,
      strokeWeight: 3,
    };
  }, [isLoaded]);

  const legacyGpsPolylineOptions = useMemo<
    google.maps.PolylineOptions | undefined
  >(() => {
    if (!isLoaded || typeof window === "undefined" || !window.google) {
      return undefined;
    }
    return {
      strokeColor: "#2563eb",
      strokeOpacity: 0.9,
      strokeWeight: 3,
    };
  }, [isLoaded]);

  const markerIcons = useMemo<MarkerIconSet | null>(() => {
    if (!isLoaded || typeof window === "undefined" || !window.google) {
      return null;
    }

    return {
      default: createDotIcon(window.google.maps, "#2563eb", 6),
      selected: createDotIcon(window.google.maps, "#ef4444", 8),
      active: createDotIcon(window.google.maps, "#111827", 9),
      cluster: createDotIcon(window.google.maps, "#7c3aed", 12),
    };
  }, [isLoaded]);

  const legacyMarkerIcons = useMemo<LegacyMarkerIconSet | null>(() => {
    if (!isLoaded || typeof window === "undefined" || !window.google) {
      return null;
    }

    return {
      cell: createLegacyPinIcon(window.google.maps, "#ef4444"),
      gps: createLegacyPinIcon(window.google.maps, "#2563eb"),
    };
  }, [isLoaded]);

  const selectedPolylinePath = useMemo(
    () => {
      if (selectedIds.size === 0) return [];

      const selectedPoints = Array.from(selectedIds)
        .flatMap((id) => {
          const item = plottableById.get(id);
          return item ? [item] : [];
        })
        .sort(sortByTime);

      return samplePath(selectedPoints, MAX_SELECTED_POLYLINE_POINTS)
        .map(({ position }) => position);
    },
    [plottableById, selectedIds]
  );

  const gpsPlottablePoints = useMemo<
    { point: SelectCellLog; position: google.maps.LatLngLiteral }[]
  >(
    () =>
      (gpsPoints ?? []).flatMap((point) => {
        const position = toPosition(point);
        return position ? [{ point, position }] : [];
      }),
    [gpsPoints]
  );

  const gpsPolylinePath = useMemo(
    () =>
      [...gpsPlottablePoints]
        .sort(sortGpsByTime)
        .map(({ position }) => position),
    [gpsPlottablePoints]
  );

  const legacyCellPoints = useMemo(() => {
    if (!legacyMode || selectedIds.size === 0) return [];

    return Array.from(selectedIds)
      .flatMap((id) => {
        const item = plottableById.get(id);
        return item && !item.point.cluster ? [item] : [];
      })
      .sort(sortByTime);
  }, [legacyMode, plottableById, selectedIds]);

  const legacyCellPath = useMemo(
    () => legacyCellPoints.map(({ position }) => position),
    [legacyCellPoints]
  );

  const legacyGpsPoints = useMemo(() => {
    if (!legacyMode || legacyCellPoints.length === 0) return [];

    const selectedTimes = legacyCellPoints
      .map(({ point }) => getComparableTimeValue(point.time))
      .filter((time): time is string => Boolean(time));
    if (selectedTimes.length === 0) return [];

    const from = selectedTimes[0];
    const to = selectedTimes[selectedTimes.length - 1];

    return gpsPlottablePoints
      .filter(({ point }) => {
        const time = getComparableTimeValue(point.time);
        return time !== null && time >= from && time <= to;
      })
      .sort(sortGpsByTime);
  }, [gpsPlottablePoints, legacyCellPoints, legacyMode]);

  const legacyGpsPath = useMemo(
    () => legacyGpsPoints.map(({ position }) => position),
    [legacyGpsPoints]
  );

  const activePoint = activeId ? plottableById.get(activeId) : null;
  const showAccuracyCircles = settings?.showAccuracyCircles ?? true;
  const zoomLevel = settings?.defaultZoomLevel ?? DEFAULT_ZOOM_LEVEL;

  const renderedPoints = useMemo(() => {
    const rendered = new Map<number, PlottablePoint>();

    if (activeId) {
      const item = plottableById.get(activeId);
      if (item) {
        rendered.set(activeId, item);
      }
    }

    if (visibleBounds) {
      for (const item of plottablePoints) {
        if (rendered.has(item.point.id)) continue;
        if (!isPositionWithinBounds(item.position, visibleBounds)) continue;
        rendered.set(item.point.id, item);
      }

      return Array.from(rendered.values());
    }

    for (const item of plottablePoints) {
      if (rendered.has(item.point.id)) continue;
      rendered.set(item.point.id, item);
      if (rendered.size >= MAX_VISIBLE_MARKERS) break;
    }

    return Array.from(rendered.values());
  }, [activeId, plottablePoints, selectedIds, visibleBounds]);

  useEffect(() => {
    if (legacyMode) {
      const markersById = markerByIdRef.current;
      for (const managedMarker of markersById.values()) {
        managedMarker.clickListener.remove();
        managedMarker.marker.setMap(null);
      }
      markersById.clear();
      return;
    }

    if (!markerIcons || !mapRef.current || typeof window === "undefined") {
      return;
    }

    const markersById = markerByIdRef.current;
    const nextIds = new Set<number>();

    for (const { point, position } of renderedPoints) {
      nextIds.add(point.id);

      const isSelected = selectedIds.has(point.id);
      const isActive = activeId === point.id;
      const icon = isActive
        ? markerIcons.active
        : isSelected
        ? markerIcons.selected
        : point.cluster
        ? { ...markerIcons.cluster, scale: getMarkerScale(point) }
        : markerIcons.default;
      const zIndex = isActive ? 30 : isSelected ? 20 : 10;
      const title = point.cluster
        ? `${(point.count ?? 1).toLocaleString()} points`
        : `ID ${point.id}`;
      const signature = `${position.lat}:${position.lng}:${
        isActive ? "active" : isSelected ? "selected" : point.cluster ? "cluster" : "default"
      }:${point.count ?? 1}`;
      const existing = markersById.get(point.id);

      if (existing) {
        if (existing.signature !== signature) {
          existing.marker.setPosition(position);
          existing.marker.setIcon(icon);
          existing.marker.setZIndex(zIndex);
          existing.marker.setTitle(title);
          existing.signature = signature;
        }
        continue;
      }

      const marker = new window.google.maps.Marker({
        clickable: true,
        icon,
        map: mapRef.current,
        optimized: true,
        position,
        title,
        zIndex,
      });
      const clickListener = marker.addListener("click", () => {
        if (point.cluster) return;
        onMarkerClickRef.current?.(point.id);
      });

      markersById.set(point.id, { marker, clickListener, signature });
    }

    for (const [id, managedMarker] of markersById) {
      if (nextIds.has(id)) continue;
      managedMarker.clickListener.remove();
      managedMarker.marker.setMap(null);
      markersById.delete(id);
    }
  }, [activeId, legacyMode, markerIcons, renderedPoints, selectedIds]);

  useEffect(() => {
    const markersById = markerByIdRef.current;
    return () => {
      for (const managedMarker of markersById.values()) {
        managedMarker.clickListener.remove();
        managedMarker.marker.setMap(null);
      }
      markersById.clear();
    };
  }, []);

  const circlePoints = useMemo(() => {
    const renderSelectedCircles = selectedIds.size <= 50;
    return renderedPoints.filter(({ point }) => {
      if (!point.accuracy) return false;
      if (activeId === point.id) return true;
      return renderSelectedCircles && selectedIds.has(point.id);
    });
  }, [activeId, renderedPoints, selectedIds]);

  if (!isLoaded) {
    return (
      <Skeleton
        className={mapContainerClassName}
        style={{ ...DEFAULT_MAP_CONTAINER_STYLE, ...mapContainerStyle }}
      />
    );
  }

  return (
    <GoogleMap
      onLoad={onMapLoad}
      onIdle={emitBoundsChanged}
      center={defaultCenter}
      zoom={zoomLevel}
      mapContainerClassName={mapContainerClassName}
      mapContainerStyle={{ ...DEFAULT_MAP_CONTAINER_STYLE, ...mapContainerStyle }}
      options={MAP_OPTIONS}
      onClick={onMapClick}
    >
      {showAccuracyCircles &&
        circlePoints.map(({ point, position }) => (
          <Circle
            key={`accuracy-${point.id}`}
            center={position}
            radius={point.accuracy!}
            options={circleOptions}
          />
        ))}

      {activePoint && (
        <InfoWindowF
          position={activePoint.position}
          onCloseClick={onMapClick}
        >
          <div className="flex min-w-[180px] flex-col items-start justify-center gap-2 p-1">
            <div>
              <p className="font-semibold">ID</p>
              <p className="font-mono text-sm text-slate-700">
                {activePoint.point.id}
              </p>
            </div>
            <div>
              <p className="font-semibold">取得時刻</p>
              <p className="font-mono text-sm text-slate-700">
                {formatCustomTimestamp(activePoint.point.time)}
              </p>
            </div>
            {(activePoint.point.tac || activePoint.point.cid) && (
            <div className="grid grid-cols-2 gap-x-4 gap-y-2">
              <div>
                <p className="font-semibold">TAC</p>
                <p className="font-mono text-sm text-slate-700">
                  {activePoint.point.tac}
                </p>
              </div>
              <div>
                <p className="font-semibold">CID</p>
                <p className="font-mono text-sm text-slate-700">
                  {activePoint.point.cid}
                </p>
              </div>
            </div>
            )}
          </div>
        </InfoWindowF>
      )}

      {!legacyMode && (
        <PolylineF
          path={selectedPolylinePath}
          options={selectedPolylineOptions}
        />
      )}
      {!legacyMode && (
        <PolylineF path={gpsPolylinePath} options={gpsPolylineOptions} />
      )}

      {legacyMode && legacyCellPath.length > 0 && (
        <PolylineF
          path={legacyCellPath}
          options={legacyCellPolylineOptions}
        />
      )}
      {legacyMode && legacyGpsPath.length > 0 && (
        <PolylineF path={legacyGpsPath} options={legacyGpsPolylineOptions} />
      )}

      {!legacyMode &&
        gpsPlottablePoints.map(({ point, position }) => (
        <MarkerF
          key={`gps-marker-${point.id}-${position.lat}-${position.lng}`}
          position={position}
          icon="/gps-marker-2.png"
          zIndex={5}
        />
        ))}

      {legacyMode &&
        legacyMarkerIcons &&
        legacyCellPoints.map(({ point, position }) => (
          <MarkerF
            key={`legacy-cell-marker-${point.id}`}
            position={position}
            icon={legacyMarkerIcons.cell}
            zIndex={45}
            onClick={() => onMarkerClick?.(point.id)}
          />
        ))}

      {legacyMode &&
        legacyMarkerIcons &&
        legacyGpsPoints.map(({ point, position }) => (
          <MarkerF
            key={`legacy-gps-marker-${point.id}-${position.lat}-${position.lng}`}
            position={position}
            icon={legacyMarkerIcons.gps}
            zIndex={40}
          />
        ))}
    </GoogleMap>
  );
};
