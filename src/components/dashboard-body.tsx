"use client";

import { SelectCellLog } from "@/db/schema";
import {
  deleteCellLogs,
  fetchCellLogIds,
  patchCellLogs,
  useCellLogMapPoints,
  useCellLogSummary,
  useCellLogsPage,
  useProjects,
} from "@/lib/client-queries";
import { useToast } from "@/hooks/use-toast";
import type { CellLogMapPoint } from "@/lib/queries";
import { cn } from "@/lib/utils";
import {
  ColumnFiltersState,
  PaginationState,
  RowSelectionState,
  SortingState,
} from "@tanstack/react-table";
import {
  Crosshair,
  GripVertical,
  Layers,
  Map,
  PanelLeftOpen,
  Pencil,
  Save,
  Trash2,
  X,
} from "lucide-react";
import {
  type PointerEvent as ReactPointerEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import AddProjectDialog from "./add-project-dialog";
import { createColumns } from "./columns";
import {
  DateTimeRangeFilter,
  EMPTY_DATE_TIME_RANGE_FILTER,
  type DateTimeBoundary,
  type DateTimeRangeFilterValue,
} from "./date-time-range-filter";
import { DataTable } from "./data-table";
import { ManageProjectsDialog } from "./manage-projects-dialog";
import { MapView } from "./map-view";
import { Button } from "./ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "./ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "./ui/tooltip";

type FitRequest = { ids: number[]; nonce: number };
type OverlayPanelId = "controls" | "data";
type OverlayPanelPosition = { x: number; y: number };
type OverlayPanelPositions = Record<OverlayPanelId, OverlayPanelPosition>;
type OverlayDragState = {
  panelId: OverlayPanelId;
  pointerId: number;
  offsetX: number;
  offsetY: number;
};
type EditableCellLogField = "time" | "mcc" | "mnc" | "tac" | "cid";
type CellLogDraftEdits = Record<
  number,
  Partial<Record<EditableCellLogField, string>>
>;
type CellLogEditChange = {
  id: number;
  field: EditableCellLogField;
  from: string;
  to: string;
};

const OVERLAY_MARGIN = 16;
const EDITABLE_CELL_LOG_FIELDS: EditableCellLogField[] = [
  "time",
  "mcc",
  "mnc",
  "tac",
  "cid",
];
const DEFAULT_OVERLAY_POSITIONS: OverlayPanelPositions = {
  controls: { x: 16, y: 16 },
  data: { x: 16, y: 96 },
};
const OVERLAY_LAYOUT_STORAGE_KEY = "cell-track.dashboard.overlay-layout.v1";
const DEFAULT_TABLE_PAGE_SIZE = 100;

function isEditableCellLogField(value: string): value is EditableCellLogField {
  return EDITABLE_CELL_LOG_FIELDS.includes(value as EditableCellLogField);
}

function getCellLogFieldValue(
  log: SelectCellLog,
  field: EditableCellLogField
) {
  return log[field] ?? "";
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function constrainOverlayPosition(
  position: OverlayPanelPosition,
  container: HTMLElement | null,
  panel: HTMLElement | null
): OverlayPanelPosition {
  if (!container || !panel) return position;

  const containerRect = container.getBoundingClientRect();
  const panelRect = panel.getBoundingClientRect();
  const maxX = Math.max(
    OVERLAY_MARGIN,
    containerRect.width - panelRect.width - OVERLAY_MARGIN
  );
  const maxY = Math.max(
    OVERLAY_MARGIN,
    containerRect.height - panelRect.height - OVERLAY_MARGIN
  );

  return {
    x: clamp(position.x, OVERLAY_MARGIN, maxX),
    y: clamp(position.y, OVERLAY_MARGIN, maxY),
  };
}

function getPanelPosition(
  container: HTMLElement,
  panel: HTMLElement
): OverlayPanelPosition {
  const containerRect = container.getBoundingClientRect();
  const panelRect = panel.getBoundingClientRect();

  return {
    x: panelRect.left - containerRect.left,
    y: panelRect.top - containerRect.top,
  };
}

function pad2(value: number) {
  return String(value).padStart(2, "0");
}

function boundaryToTimestamp(
  boundary: DateTimeBoundary,
  fraction: "00" | "99"
) {
  if (!boundary.date) return null;
  const [hour, minute, second = "0"] = boundary.time.split(":");
  const hourNumber = Number(hour);
  const minuteNumber = Number(minute);
  const secondNumber = Number(second);

  if (
    !Number.isInteger(hourNumber) ||
    !Number.isInteger(minuteNumber) ||
    !Number.isInteger(secondNumber)
  ) {
    return null;
  }

  const year = boundary.date.getFullYear() % 100;
  const month = boundary.date.getMonth() + 1;
  const day = boundary.date.getDate();

  return `${pad2(year)}${pad2(month)}${pad2(day)}${pad2(hourNumber)}${pad2(
    minuteNumber
  )}${pad2(secondNumber)}${fraction}`;
}

function timestampToDate(timestamp: string) {
  if (!/^\d{14}$/.test(timestamp)) return null;

  const year = 2000 + Number(timestamp.slice(0, 2));
  const month = Number(timestamp.slice(2, 4));
  const day = Number(timestamp.slice(4, 6));
  const hour = Number(timestamp.slice(6, 8));
  const minute = Number(timestamp.slice(8, 10));
  const second = Number(timestamp.slice(10, 12));
  const date = new Date(year, month - 1, day, hour, minute, second);

  if (Number.isNaN(date.getTime())) return null;
  return date;
}

function timestampToBoundary(timestamp: string): DateTimeBoundary | null {
  const date = timestampToDate(timestamp);
  if (!date) return null;

  return {
    date,
    time: `${timestamp.slice(6, 8)}:${timestamp.slice(8, 10)}:${timestamp.slice(
      10,
      12
    )}`,
  };
}

function getLogPosition(log: SelectCellLog) {
  const lat = typeof log.lat === "string" ? Number(log.lat) : log.lat;
  const lng = typeof log.lng === "string" ? Number(log.lng) : log.lng;

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

function isOverlayPanelPosition(value: unknown): value is OverlayPanelPosition {
  if (!value || typeof value !== "object") return false;

  const position = value as Partial<OverlayPanelPosition>;
  return (
    typeof position.x === "number" &&
    Number.isFinite(position.x) &&
    typeof position.y === "number" &&
    Number.isFinite(position.y)
  );
}

function normalizeStoredOverlayPositions(
  value: unknown
): OverlayPanelPositions | null {
  if (!value || typeof value !== "object") return null;

  const candidate = value as {
    positions?: unknown;
    controls?: unknown;
    data?: unknown;
  };
  const positions =
    candidate.positions && typeof candidate.positions === "object"
      ? (candidate.positions as { controls?: unknown; data?: unknown })
      : candidate;

  if (
    !isOverlayPanelPosition(positions.controls) ||
    !isOverlayPanelPosition(positions.data)
  ) {
    return null;
  }

  return {
    controls: positions.controls,
    data: positions.data,
  };
}

function readStoredOverlayPositions() {
  if (typeof window === "undefined") return null;

  try {
    const raw = window.localStorage.getItem(OVERLAY_LAYOUT_STORAGE_KEY);
    if (!raw) return null;

    return normalizeStoredOverlayPositions(JSON.parse(raw));
  } catch {
    return null;
  }
}

function writeStoredOverlayPositions(positions: OverlayPanelPositions) {
  if (typeof window === "undefined") return;

  try {
    window.localStorage.setItem(
      OVERLAY_LAYOUT_STORAGE_KEY,
      JSON.stringify({ positions })
    );
  } catch {
    // Ignore storage failures, such as private mode quota restrictions.
  }
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div className="select-none rounded-md border bg-background/70 px-3 py-2">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="font-mono text-lg font-semibold tabular-nums">
        {value.toLocaleString()}
      </p>
    </div>
  );
}

function OverlayMoveHandle({
  panelId,
  onDragStart,
  onDragMove,
  onDragEnd,
}: {
  panelId: OverlayPanelId;
  onDragStart: (
    panelId: OverlayPanelId,
    event: ReactPointerEvent<HTMLElement>
  ) => void;
  onDragMove: (event: ReactPointerEvent<HTMLElement>) => void;
  onDragEnd: (event: ReactPointerEvent<HTMLElement>) => void;
}) {
  const label = "ドラッグしてパネルを移動";

  return (
    <TooltipProvider delayDuration={200}>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            type="button"
            className="flex h-9 w-9 touch-none cursor-grab items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-accent-foreground active:cursor-grabbing"
            aria-label={label}
            title={label}
            onPointerDown={(event) => onDragStart(panelId, event)}
            onPointerMove={onDragMove}
            onPointerUp={onDragEnd}
            onPointerCancel={onDragEnd}
          >
            <GripVertical className="h-4 w-4" />
          </button>
        </TooltipTrigger>
        <TooltipContent>{label}</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

export const DashboardBody = () => {
  const { toast } = useToast();
  const [projectId, setProjectId] = useState<number | null>(null);
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({});
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [tablePagination, setTablePagination] = useState<PaginationState>(() => {
    if (typeof window === "undefined") {
      return { pageIndex: 0, pageSize: DEFAULT_TABLE_PAGE_SIZE };
    }

    const savedPageSize = Number(
      window.localStorage.getItem("celltrack.pageSize")
    );
    return {
      pageIndex: 0,
      pageSize:
        Number.isFinite(savedPageSize) && savedPageSize > 0
          ? savedPageSize
          : DEFAULT_TABLE_PAGE_SIZE,
    };
  });
  const [activeLogId, setActiveLogId] = useState<number | null>(null);
  const [panelOpen, setPanelOpen] = useState(true);
  const [fitRequest, setFitRequest] = useState<FitRequest | null>(null);
  const [showGpsLayer, setShowGpsLayer] = useState(false);
  const [showLegacyMapMode, setShowLegacyMapMode] = useState(false);
  const [inlineEditMode, setInlineEditMode] = useState(false);
  const [draftEdits, setDraftEdits] = useState<CellLogDraftEdits>({});
  const [confirmSaveOpen, setConfirmSaveOpen] = useState(false);
  const [isSavingEdits, setIsSavingEdits] = useState(false);
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
  const [isDeletingSelected, setIsDeletingSelected] = useState(false);
  const [isSelectingAllRows, setIsSelectingAllRows] = useState(false);
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [showLoadingProgress, setShowLoadingProgress] = useState(false);
  const [dateTimeFilter, setDateTimeFilter] =
    useState<DateTimeRangeFilterValue>(EMPTY_DATE_TIME_RANGE_FILTER);
  const [overlayLayoutDetached, setOverlayLayoutDetached] = useState(false);
  const [overlayPositions, setOverlayPositions] =
    useState<OverlayPanelPositions>(DEFAULT_OVERLAY_POSITIONS);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const controlsPanelRef = useRef<HTMLDivElement | null>(null);
  const dataPanelRef = useRef<HTMLElement | null>(null);
  const overlayDragRef = useRef<OverlayDragState | null>(null);
  const overlayLayoutLoadedRef = useRef(false);
  const appliedDateTimeDefaultsRef = useRef<string | null>(null);
  const panelsFloating = overlayLayoutDetached;

  const { projects, refresh: refreshProjects } = useProjects();
  const {
    summary,
    refresh: refreshSummary,
    isLoading: isSummaryLoading,
  } = useCellLogSummary(projectId);
  const {
    points: mapPoints,
    refresh: refreshMapPoints,
    isLoading: isMapLoading,
  } = useCellLogMapPoints(projectId, null);
  const columns = useMemo(() => createColumns(), []);

  useEffect(() => {
    const storedPositions = readStoredOverlayPositions();
    overlayLayoutLoadedRef.current = true;

    if (!storedPositions) return;

    setOverlayPositions(storedPositions);
    setOverlayLayoutDetached(true);
  }, []);

  useEffect(() => {
    if (projects.length > 0 && !projectId) {
      setProjectId(projects[0].id);
    }
  }, [projectId, projects]);

  useEffect(() => {
    setRowSelection({});
    setActiveLogId(null);
    setInlineEditMode(false);
    setDraftEdits({});
    setConfirmSaveOpen(false);
    setConfirmDeleteOpen(false);
    appliedDateTimeDefaultsRef.current = null;
  }, [projectId]);

  const selectedLogIds = useMemo(() => {
    const ids = Object.entries(rowSelection)
      .filter(([, selected]) => selected)
      .map(([id]) => Number(id))
      .filter((id): id is number => Number.isFinite(id));

    return new Set(ids);
  }, [rowSelection]);

  const projectDateTimeDefaults = useMemo(() => {
    const firstTimestamp = summary.firstTimestamp;
    const lastTimestamp = summary.lastTimestamp;

    const from = firstTimestamp ? timestampToBoundary(firstTimestamp) : null;
    const to = lastTimestamp ? timestampToBoundary(lastTimestamp) : null;
    const value =
      from && to
        ? { from, to }
        : EMPTY_DATE_TIME_RANGE_FILTER;

    return {
      signature: `${projectId ?? "none"}:${firstTimestamp ?? "none"}:${
        lastTimestamp ?? "none"
      }`,
      value,
    };
  }, [projectId, summary.firstTimestamp, summary.lastTimestamp]);

  useEffect(() => {
    if (isSummaryLoading) return;
    if (
      appliedDateTimeDefaultsRef.current === projectDateTimeDefaults.signature
    ) {
      return;
    }

    appliedDateTimeDefaultsRef.current = projectDateTimeDefaults.signature;
    setDateTimeFilter(projectDateTimeDefaults.value);
  }, [isSummaryLoading, projectDateTimeDefaults]);

  const fromTimestamp = useMemo(
    () => boundaryToTimestamp(dateTimeFilter.from, "00"),
    [dateTimeFilter.from]
  );
  const toTimestamp = useMemo(
    () => boundaryToTimestamp(dateTimeFilter.to, "99"),
    [dateTimeFilter.to]
  );
  const tableTimeSort = useMemo<"time:asc" | "time:desc">(() => {
    const timeSorting = sorting.find((item) => item.id === "time");
    return timeSorting?.desc === false ? "time:asc" : "time:desc";
  }, [sorting]);
  const {
    logs: pagedLogs,
    refresh: refreshPagedLogs,
    isLoading: isPageLoading,
    error: pageError,
    totalCount: tableTotalCount,
  } = useCellLogsPage(projectId, {
    pageIndex: tablePagination.pageIndex,
    pageSize: tablePagination.pageSize,
    from: fromTimestamp,
    to: toTimestamp,
    sort: tableTimeSort,
  });

  useEffect(() => {
    setTablePagination((current) => ({ ...current, pageIndex: 0 }));
  }, [fromTimestamp, projectId, tableTimeSort, toTimestamp]);

  const tableLogs = pagedLogs as SelectCellLog[];
  const isTableInitialLoading = isPageLoading && tableLogs.length === 0;
  const isBackgroundLoading =
    Boolean(projectId) &&
    (isSummaryLoading ||
      isMapLoading ||
      isPageLoading ||
      isSelectingAllRows ||
      isSavingEdits ||
      isDeletingSelected);

  useEffect(() => {
    if (!isBackgroundLoading) {
      setLoadingProgress((current) => (current > 0 ? 100 : 0));
      const timeout = window.setTimeout(() => {
        setShowLoadingProgress(false);
        setLoadingProgress(0);
      }, 350);

      return () => window.clearTimeout(timeout);
    }

    setShowLoadingProgress(true);
    setLoadingProgress((current) => Math.max(current, 12));

    const interval = window.setInterval(() => {
      setLoadingProgress((current) => {
        if (current < 55) return current + 8;
        if (current < 78) return current + 4;
        if (current < 92) return current + 1.5;
        return current;
      });
    }, 180);

    return () => window.clearInterval(interval);
  }, [isBackgroundLoading]);
  const allFilteredRowsSelected =
    tableTotalCount > 0 && selectedLogIds.size >= tableTotalCount;

  const refreshCellLogViews = useCallback(async () => {
    await Promise.all([
      refreshSummary(),
      refreshMapPoints(),
      refreshPagedLogs(),
    ]);
  }, [refreshMapPoints, refreshPagedLogs, refreshSummary]);

  const selectedLogs = useMemo(() => {
    const logsById = new globalThis.Map<
      number,
      SelectCellLog | CellLogMapPoint
    >();
    for (const log of tableLogs) {
      logsById.set(log.id, log);
    }
    for (const point of mapPoints) {
      if (!point.cluster) {
        logsById.set(point.id, point);
      }
    }

    return Array.from(selectedLogIds).flatMap((id) => {
      const log = logsById.get(id);
      return log ? [log] : [];
    });
  }, [mapPoints, selectedLogIds, tableLogs]);

  const unresolvedCount = summary.totalCount - summary.plottedCount;
  const logById = useMemo(
    () => new globalThis.Map(tableLogs.map((log) => [log.id, log])),
    [tableLogs]
  );
  const draftChanges = useMemo<CellLogEditChange[]>(() => {
    const changes: CellLogEditChange[] = [];

    for (const [idText, fields] of Object.entries(draftEdits)) {
      const id = Number(idText);
      const log = logById.get(id);
      if (!log) continue;

      for (const field of EDITABLE_CELL_LOG_FIELDS) {
        if (!(field in fields)) continue;

        const from = getCellLogFieldValue(log, field);
        const to = fields[field] ?? "";

        if (from !== to) {
          changes.push({ id, field, from, to });
        }
      }
    }

    return changes.sort((a, b) => a.id - b.id || a.field.localeCompare(b.field));
  }, [draftEdits, logById]);
  const draftChangeCount = draftChanges.length;

  const requestFit = useCallback((ids: number[]) => {
    if (ids.length === 0) return;
    setFitRequest({ ids, nonce: Date.now() });
  }, []);

  const fitTargetIds = useMemo(() => {
    if (selectedLogIds.size > 0) {
      return mapPoints
        .filter((point) => !point.cluster && selectedLogIds.has(point.id))
        .map((point) => point.id);
    }
    return mapPoints
      .filter((point) => !point.cluster)
      .map((point) => point.id);
  }, [mapPoints, selectedLogIds]);

  const getDraftCellValue = useCallback(
    (log: SelectCellLog, columnId: string) => {
      if (!isEditableCellLogField(columnId)) {
        return "";
      }

      return draftEdits[log.id]?.[columnId] ?? getCellLogFieldValue(log, columnId);
    },
    [draftEdits]
  );

  const updateDraftCellValue = useCallback(
    (log: SelectCellLog, columnId: string, value: string) => {
      if (!isEditableCellLogField(columnId)) return;

      setDraftEdits((currentEdits) => {
        const originalValue = getCellLogFieldValue(log, columnId);
        const currentRowEdits = currentEdits[log.id] ?? {};
        const nextRowEdits = { ...currentRowEdits };

        if (value === originalValue) {
          delete nextRowEdits[columnId];
        } else {
          nextRowEdits[columnId] = value;
        }

        const nextEdits = { ...currentEdits };
        if (Object.keys(nextRowEdits).length === 0) {
          delete nextEdits[log.id];
        } else {
          nextEdits[log.id] = nextRowEdits;
        }

        return nextEdits;
      });
    },
    []
  );

  const isDraftCellDirty = useCallback(
    (log: SelectCellLog, columnId: string) => {
      if (!isEditableCellLogField(columnId)) return false;
      return draftEdits[log.id]?.[columnId] !== undefined;
    },
    [draftEdits]
  );

  const cancelInlineEditMode = useCallback(() => {
    setInlineEditMode(false);
    setDraftEdits({});
    setConfirmSaveOpen(false);
  }, []);

  const openSaveConfirmation = useCallback(() => {
    if (draftChanges.length === 0) {
      setInlineEditMode(false);
      return;
    }

    setConfirmSaveOpen(true);
  }, [draftChanges.length]);

  const applyDraftChanges = useCallback(async () => {
    const changedRowIds = Array.from(
      new Set(draftChanges.map((change) => change.id))
    );

    if (changedRowIds.length === 0) {
      setConfirmSaveOpen(false);
      setInlineEditMode(false);
      return;
    }

    const invalidRowIds = changedRowIds.filter((id) => {
      const log = logById.get(id);
      if (!log) return true;

      return EDITABLE_CELL_LOG_FIELDS.some(
        (field) => getDraftCellValue(log, field).trim().length === 0
      );
    });

    if (invalidRowIds.length > 0) {
      toast({
        variant: "destructive",
        title: "入力エラー",
        description: `未入力の項目がある行があります: ${invalidRowIds.join(", ")}`,
      });
      return;
    }

    try {
      setIsSavingEdits(true);

      const changes = changedRowIds.flatMap((id) => {
        const log = logById.get(id);
        if (!log) return [];

        return [
          {
            id,
            patch: {
            projectId: log.projectId,
            time: getDraftCellValue(log, "time").trim(),
            mcc: getDraftCellValue(log, "mcc").trim(),
            mnc: getDraftCellValue(log, "mnc").trim(),
            tac: getDraftCellValue(log, "tac").trim(),
            cid: getDraftCellValue(log, "cid").trim(),
            },
          },
        ];
      });

      await patchCellLogs(changes, () => {});

      await refreshCellLogViews();
      setDraftEdits({});
      setInlineEditMode(false);
      setConfirmSaveOpen(false);
      toast({
        title: "保存しました",
        description: `${changedRowIds.length} 行の変更を適用しました。`,
      });
    } catch (error) {
      console.error(error);
      toast({
        variant: "destructive",
        title: "保存エラー",
        description: "テーブルの変更を保存できませんでした。",
      });
    } finally {
      setIsSavingEdits(false);
    }
  }, [
    draftChanges,
    getDraftCellValue,
    logById,
    refreshCellLogViews,
    toast,
  ]);

  const handleRowActivate = useCallback(
    (log: SelectCellLog) => {
      setActiveLogId(log.id);
    },
    []
  );

  const handleMarkerClick = useCallback((id: number) => {
    setActiveLogId(id);
    setPanelOpen(true);
  }, []);

  const clearSelection = useCallback(() => {
    setRowSelection({});
    setActiveLogId(null);
  }, []);

  const toggleAllFilteredRows = useCallback(async () => {
    if (!projectId) return;

    if (allFilteredRowsSelected) {
      clearSelection();
      return;
    }

    try {
      setIsSelectingAllRows(true);
      const ids = await fetchCellLogIds({
        projectId,
        from: fromTimestamp,
        to: toTimestamp,
      });

      setRowSelection(
        Object.fromEntries(ids.map((id) => [String(id), true]))
      );
    } catch (error) {
      console.error(error);
      toast({
        variant: "destructive",
        title: "選択エラー",
        description: "全件選択に必要なIDを取得できませんでした。",
      });
    } finally {
      setIsSelectingAllRows(false);
    }
  }, [
    allFilteredRowsSelected,
    clearSelection,
    fromTimestamp,
    projectId,
    toTimestamp,
    toast,
  ]);

  const openDeleteConfirmation = useCallback(() => {
    if (selectedLogIds.size === 0) return;
    setConfirmDeleteOpen(true);
  }, [selectedLogIds.size]);

  const deleteSelectedLogs = useCallback(async () => {
    const targetIds = Array.from(selectedLogIds);

    if (targetIds.length === 0) {
      setConfirmDeleteOpen(false);
      return;
    }

    try {
      setIsDeletingSelected(true);

      await deleteCellLogs(targetIds, () => {});

      await refreshCellLogViews();
      setRowSelection({});
      setActiveLogId((currentId) =>
        currentId !== null && targetIds.includes(currentId) ? null : currentId
      );
      setDraftEdits((currentEdits) => {
        const nextEdits = { ...currentEdits };
        for (const id of targetIds) {
          delete nextEdits[id];
        }
        return nextEdits;
      });
      setConfirmDeleteOpen(false);
      toast({
        title: "削除しました",
        description: `${targetIds.length}件のデータを削除しました。`,
      });
    } catch (error) {
      console.error(error);
      toast({
        variant: "destructive",
        title: "削除エラー",
        description: "選択したデータを削除できませんでした。",
      });
    } finally {
      setIsDeletingSelected(false);
    }
  }, [refreshCellLogViews, selectedLogIds, toast]);

  const getOverlayPanel = useCallback((panelId: OverlayPanelId) => {
    return panelId === "controls"
      ? controlsPanelRef.current
      : dataPanelRef.current;
  }, []);

  const captureCurrentOverlayPositions = useCallback((currentPositions: OverlayPanelPositions) => {
    const container = containerRef.current;
    if (!container) return currentPositions;

    const nextPositions: OverlayPanelPositions = {
      controls: currentPositions.controls,
      data: currentPositions.data,
    };
    const controlsPanel = controlsPanelRef.current;
    const dataPanel = dataPanelRef.current;

    if (controlsPanel) {
      nextPositions.controls = constrainOverlayPosition(
        getPanelPosition(container, controlsPanel),
        container,
        controlsPanel
      );
    }

    if (dataPanel) {
      nextPositions.data = constrainOverlayPosition(
        getPanelPosition(container, dataPanel),
        container,
        dataPanel
      );
    }

    return nextPositions;
  }, []);

  const clampOverlayPositions = useCallback(() => {
    const container = containerRef.current;
    if (!container) return;

    setOverlayPositions((currentPositions) => ({
      controls: constrainOverlayPosition(
        currentPositions.controls,
        container,
        controlsPanelRef.current
      ),
      data: constrainOverlayPosition(
        currentPositions.data,
        container,
        dataPanelRef.current
      ),
    }));
  }, []);

  const startOverlayDrag = useCallback(
    (
      panelId: OverlayPanelId,
      event: ReactPointerEvent<HTMLElement>
    ) => {
      if (event.button !== 0) return;

      const panel = getOverlayPanel(panelId);
      if (!panel) return;

      const panelRect = panel.getBoundingClientRect();
      overlayDragRef.current = {
        panelId,
        pointerId: event.pointerId,
        offsetX: event.clientX - panelRect.left,
        offsetY: event.clientY - panelRect.top,
      };

      setOverlayPositions(captureCurrentOverlayPositions);
      setOverlayLayoutDetached(true);
      event.currentTarget.setPointerCapture(event.pointerId);
      event.preventDefault();
    },
    [captureCurrentOverlayPositions, getOverlayPanel]
  );

  const moveOverlayDrag = useCallback(
    (event: ReactPointerEvent<HTMLElement>) => {
      const dragState = overlayDragRef.current;
      if (!dragState || dragState.pointerId !== event.pointerId) return;

      const container = containerRef.current;
      const panel = getOverlayPanel(dragState.panelId);
      if (!container || !panel) return;

      const containerRect = container.getBoundingClientRect();
      const nextPosition = constrainOverlayPosition(
        {
          x: event.clientX - containerRect.left - dragState.offsetX,
          y: event.clientY - containerRect.top - dragState.offsetY,
        },
        container,
        panel
      );

      setOverlayPositions((currentPositions) => {
        const currentPosition = currentPositions[dragState.panelId];
        if (
          currentPosition.x === nextPosition.x &&
          currentPosition.y === nextPosition.y
        ) {
          return currentPositions;
        }

        return {
          ...currentPositions,
          [dragState.panelId]: nextPosition,
        };
      });
      event.preventDefault();
    },
    [getOverlayPanel]
  );

  const stopOverlayDrag = useCallback(
    (event: ReactPointerEvent<HTMLElement>) => {
      const dragState = overlayDragRef.current;
      if (!dragState || dragState.pointerId !== event.pointerId) return;

      if (event.currentTarget.hasPointerCapture(event.pointerId)) {
        event.currentTarget.releasePointerCapture(event.pointerId);
      }
      overlayDragRef.current = null;
    },
    []
  );

  useEffect(() => {
    if (!panelsFloating || typeof window === "undefined") return;

    const frame = window.requestAnimationFrame(clampOverlayPositions);
    window.addEventListener("resize", clampOverlayPositions);

    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener("resize", clampOverlayPositions);
    };
  }, [clampOverlayPositions, panelOpen, panelsFloating]);

  useEffect(() => {
    if (
      !overlayLayoutLoadedRef.current ||
      !overlayLayoutDetached ||
      typeof window === "undefined"
    ) {
      return;
    }

    const timeout = window.setTimeout(() => {
      writeStoredOverlayPositions(overlayPositions);
    }, 150);

    return () => window.clearTimeout(timeout);
  }, [overlayLayoutDetached, overlayPositions]);

  const fitPadding = useMemo<google.maps.Padding>(
    () => ({
      top: 96,
      right: 96,
      bottom: 96,
      left: panelOpen && !panelsFloating ? 960 : 96,
    }),
    [panelOpen, panelsFloating]
  );

  return (
    <div
      ref={containerRef}
      className="relative h-[calc(100dvh-60px)] min-h-[640px] w-full overflow-hidden bg-muted"
    >
      <MapView
        points={mapPoints}
        selectedIds={selectedLogIds}
        activeId={activeLogId}
        onMarkerClick={handleMarkerClick}
        onMapClick={() => setActiveLogId(null)}
        projectId={projectId}
        fitRequest={fitRequest}
        fitPadding={fitPadding}
        mapContainerClassName="absolute inset-0"
        mapContainerStyle={{ minHeight: "640px" }}
        legacyMode={showLegacyMapMode}
        gpsPoints={undefined}
      />

      {showLoadingProgress && (
        <div className="pointer-events-none absolute inset-x-0 top-0 z-30 h-1 bg-blue-500/15">
          <div
            className="h-full bg-blue-500 shadow-[0_0_10px_rgba(59,130,246,0.65)] transition-[width] duration-500 ease-out"
            style={{ width: `${loadingProgress}%` }}
          />
        </div>
      )}

      <div
        ref={controlsPanelRef}
        className={cn(
          "pointer-events-none absolute z-20 flex justify-end",
          !panelsFloating && "right-4 top-4"
        )}
        style={
          panelsFloating
            ? {
                left: overlayPositions.controls.x,
                top: overlayPositions.controls.y,
              }
            : undefined
        }
      >
        <div className="pointer-events-auto flex flex-wrap items-center justify-end gap-2 rounded-lg border bg-background/95 p-2 shadow-lg backdrop-blur">
          <ManageProjectsDialog
            projects={projects}
            currentProjectId={projectId}
            refreshProjects={refreshProjects}
            onProjectDeleted={(deletedId) => {
              if (projectId === deletedId) {
                setProjectId(null);
              }
            }}
          />
          <Select
            value={projectId ? String(projectId) : ""}
            onValueChange={(value) => setProjectId(Number(value))}
          >
            <SelectTrigger className="w-[260px]">
              <SelectValue placeholder="プロジェクトを選択" />
            </SelectTrigger>
            <SelectContent>
              {projects.map((project) => (
                <SelectItem key={project.id} value={String(project.id)}>
                  {project.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <AddProjectDialog />
          <div className="ml-1 border-l pl-2">
            <OverlayMoveHandle
              panelId="controls"
              onDragStart={startOverlayDrag}
              onDragMove={moveOverlayDrag}
              onDragEnd={stopOverlayDrag}
            />
          </div>
        </div>
      </div>

      {!panelOpen && (
        <Button
          className={cn(
            "absolute z-20 shadow-lg",
            !panelsFloating && "left-4 top-4"
          )}
          style={
            panelsFloating
              ? { left: overlayPositions.data.x, top: overlayPositions.data.y }
              : undefined
          }
          onClick={() => setPanelOpen(true)}
        >
          <PanelLeftOpen className="h-4 w-4" />
          データ
        </Button>
      )}

      {panelOpen && (
        <aside
          ref={dataPanelRef}
          className={cn(
            "pointer-events-auto absolute z-20",
            panelsFloating
              ? "h-[62dvh] min-h-[360px] max-h-[calc(100%_-_2rem)] w-[920px] max-w-[calc(100%_-_2rem)] xl:h-[calc(100%_-_2rem)] xl:w-[760px] 2xl:w-[920px]"
              : "inset-x-4 bottom-4 h-[62dvh] min-h-[360px] xl:bottom-4 xl:left-4 xl:right-auto xl:top-4 xl:h-auto xl:w-[760px] 2xl:w-[920px]"
          )}
          style={
            panelsFloating
              ? { left: overlayPositions.data.x, top: overlayPositions.data.y }
              : undefined
          }
        >
          <div className="flex h-full min-h-0 flex-col overflow-hidden rounded-lg border bg-background/95 shadow-xl backdrop-blur">
            <div className="border-b p-3">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <Map className="h-4 w-4 text-muted-foreground" />
                  <h2 className="font-semibold">データ選択</h2>
                </div>
                <div className="flex items-center gap-1">
                  <OverlayMoveHandle
                    panelId="data"
                    onDragStart={startOverlayDrag}
                    onDragMove={moveOverlayDrag}
                    onDragEnd={stopOverlayDrag}
                  />
                </div>
              </div>

              <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
                <Metric label="全件" value={summary.totalCount} />
                <Metric label="地図表示" value={summary.plottedCount} />
                <Metric label="未解決" value={unresolvedCount} />
                <Metric label="選択" value={selectedLogIds.size} />
              </div>

              <div className="mt-3 flex flex-col gap-2 lg:flex-row lg:items-start lg:justify-between">
                <div className="flex min-w-0 flex-wrap items-center gap-2">
                  <Button
                    variant="outline"
                    onClick={clearSelection}
                    disabled={selectedLogIds.size === 0 && !activeLogId}
                  >
                    <X className="h-4 w-4" />
                    選択解除
                  </Button>
                  <Button
                    variant="destructive"
                    onClick={openDeleteConfirmation}
                    disabled={selectedLogIds.size === 0 || isDeletingSelected}
                  >
                    <Trash2 className="h-4 w-4" />
                    削除
                    {selectedLogIds.size > 0 &&
                      ` (${selectedLogIds.size.toLocaleString()})`}
                  </Button>
                  {!inlineEditMode ? (
                    <Button
                      variant="outline"
                      onClick={() => setInlineEditMode(true)}
                    >
                      <Pencil className="h-4 w-4" />
                      編集モード
                    </Button>
                  ) : (
                    <>
                      <Button
                        variant="default"
                        onClick={openSaveConfirmation}
                        disabled={draftChangeCount === 0 || isSavingEdits}
                      >
                        <Save className="h-4 w-4" />
                        保存
                        {draftChangeCount > 0 && ` (${draftChangeCount})`}
                      </Button>
                      <Button
                        variant="outline"
                        onClick={cancelInlineEditMode}
                        disabled={isSavingEdits}
                      >
                        編集終了
                      </Button>
                    </>
                  )}
                  <DateTimeRangeFilter
                    value={dateTimeFilter}
                    fallbackFromDate={projectDateTimeDefaults.value.from.date}
                    fallbackToDate={projectDateTimeDefaults.value.to.date}
                    resetValue={projectDateTimeDefaults.value}
                    onChange={setDateTimeFilter}
                  />
                </div>
                <div className="flex shrink-0 flex-wrap items-center gap-2 lg:justify-end">
                  <Button
                    variant="outline"
                    onClick={() => requestFit(fitTargetIds)}
                    disabled={fitTargetIds.length === 0}
                  >
                    <Crosshair className="h-4 w-4" />
                    {selectedLogIds.size > 0 ? "選択へ移動" : "全体へ移動"}
                  </Button>
                  <Button
                    variant={showGpsLayer ? "default" : "outline"}
                    onClick={() => setShowGpsLayer((value) => !value)}
                  >
                    <Layers className="h-4 w-4" />
                    GNSS
                  </Button>
                  <Button
                    variant={showLegacyMapMode ? "default" : "outline"}
                    onClick={() => setShowLegacyMapMode((value) => !value)}
                  >
                    <Map className="h-4 w-4" />
                    レガシー
                  </Button>
                </div>
              </div>
            </div>

            <div className="min-h-0 flex-1 p-3">
              {isTableInitialLoading ? (
                <div className="flex h-full min-h-[240px] flex-col items-center justify-center rounded-md border bg-muted/20 text-sm text-muted-foreground">
                  <div className="mb-4 h-8 w-8 animate-spin rounded-full border-b-2 border-primary" />
                  位置情報を取得しています...
                </div>
              ) : pageError ? (
                <div className="flex h-full min-h-[240px] flex-col items-center justify-center rounded-md border bg-red-50 p-6 text-center">
                  <Map className="mb-3 h-10 w-10 text-red-500" />
                  <h3 className="font-semibold text-red-700">
                    データの取得に失敗しました
                  </h3>
                  <p className="mt-2 text-sm text-red-600">
                    ネットワークまたはAPIレスポンスを確認してください。
                  </p>
                </div>
              ) : tableLogs.length === 0 ? (
                <div className="flex h-full min-h-[240px] flex-col items-center justify-center rounded-md border bg-muted/10 p-6 text-center">
                  <Map className="mb-3 h-10 w-10 text-muted-foreground" />
                  <h3 className="font-semibold text-muted-foreground">
                    表示できるデータがありません
                  </h3>
                  <p className="mt-2 text-sm text-muted-foreground">
                    プロジェクトを選択するか、時刻条件を見直してください。
                  </p>
                </div>
              ) : (
                <DataTable
                  columns={columns}
                  data={tableLogs}
                  getRowId={(row) => String(row.id)}
                  rowSelection={rowSelection}
                  setRowSelection={setRowSelection}
                  sorting={sorting}
                  setSorting={setSorting}
                  columnFilters={columnFilters}
                  setColumnFilters={setColumnFilters}
                  allRowsSelected={allFilteredRowsSelected}
                  allRowsSelectDisabled={
                    isSelectingAllRows || tableTotalCount === 0
                  }
                  onToggleAllRows={toggleAllFilteredRows}
                  projectId={projectId}
                  refresh={refreshCellLogViews}
                  manualPagination
                  pageCount={Math.max(
                    1,
                    Math.ceil(tableTotalCount / tablePagination.pageSize)
                  )}
                  rowCount={tableTotalCount}
                  pagination={tablePagination}
                  setPagination={setTablePagination}
                  activeRowId={activeLogId}
                  onRowActivate={handleRowActivate}
                  inlineEditEnabled={inlineEditMode}
                  editableColumnIds={EDITABLE_CELL_LOG_FIELDS}
                  getEditableCellValue={getDraftCellValue}
                  onEditableCellChange={updateDraftCellValue}
                  isEditableCellDirty={isDraftCellDirty}
                  compact
                  className="h-full"
                  tableContainerClassName="overflow-auto"
                />
              )}
            </div>
          </div>
        </aside>
      )}

      <Dialog
        open={confirmDeleteOpen}
        onOpenChange={(open) => {
          if (!isDeletingSelected) {
            setConfirmDeleteOpen(open);
          }
        }}
      >
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              本当に{selectedLogIds.size.toLocaleString()}件削除しますか？
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 text-sm">
            <p className="text-muted-foreground">
              この操作は取り消せません。選択したデータを完全に削除します。
            </p>
            {selectedLogs.length > 0 && (
              <div className="rounded-md border bg-muted/20 p-3">
                <div className="font-medium">削除対象</div>
                <div className="mt-2 max-h-40 space-y-1 overflow-auto text-xs">
                  {selectedLogs.slice(0, 10).map((log) => (
                    <div
                      key={log.id}
                      className="flex items-center justify-between gap-4"
                    >
                      <span className="font-mono">ID {log.id}</span>
                      <span className="font-mono text-muted-foreground">
                        {log.time}
                      </span>
                    </div>
                  ))}
                  {selectedLogIds.size > 10 && (
                    <div className="pt-1 text-muted-foreground">
                      ほか{(selectedLogIds.size - 10).toLocaleString()}件
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setConfirmDeleteOpen(false)}
              disabled={isDeletingSelected}
            >
              キャンセル
            </Button>
            <Button
              variant="destructive"
              onClick={deleteSelectedLogs}
              disabled={isDeletingSelected || selectedLogIds.size === 0}
            >
              {isDeletingSelected ? "削除中..." : "削除する"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={confirmSaveOpen}
        onOpenChange={(open) => {
          if (!isSavingEdits) {
            setConfirmSaveOpen(open);
          }
        }}
      >
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>変更内容を保存しますか？</DialogTitle>
          </DialogHeader>
          <div className="max-h-[50vh] overflow-auto rounded-md border">
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-background">
                <tr className="border-b">
                  <th className="px-3 py-2 text-left font-medium text-muted-foreground">
                    ID
                  </th>
                  <th className="px-3 py-2 text-left font-medium text-muted-foreground">
                    項目
                  </th>
                  <th className="px-3 py-2 text-left font-medium text-muted-foreground">
                    変更前
                  </th>
                  <th className="px-3 py-2 text-left font-medium text-muted-foreground">
                    変更後
                  </th>
                </tr>
              </thead>
              <tbody>
                {draftChanges.map((change) => (
                  <tr
                    key={`${change.id}-${change.field}`}
                    className="border-b last:border-b-0"
                  >
                    <td className="px-3 py-2 font-mono">{change.id}</td>
                    <td className="px-3 py-2 font-mono uppercase">
                      {change.field}
                    </td>
                    <td className="px-3 py-2 font-mono text-muted-foreground">
                      {change.from || "(empty)"}
                    </td>
                    <td className="px-3 py-2 font-mono font-medium">
                      {change.to || "(empty)"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setConfirmSaveOpen(false)}
              disabled={isSavingEdits}
            >
              キャンセル
            </Button>
            <Button onClick={applyDraftChanges} disabled={isSavingEdits}>
              {isSavingEdits ? "保存中..." : "変更を保存"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
