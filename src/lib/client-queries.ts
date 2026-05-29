import { SelectProject } from "@/db/schema";
import useSWR from "swr";
import { ParsedRow } from "./cell-import/parse";
import type { CellLogMapPoint } from "./queries";

const fetcher = (url: string) =>
  fetch(url, { credentials: "include" }).then((res) => {
    if (!res.ok) throw new Error("Failed to fetch");
    return res.json();
  });

export function useCellLogs(projectId: number | null) {
  const key = projectId ? `/api/cell-logs?projectId=${projectId}` : null;

  const { data, error, isLoading, mutate } = useSWR(key, fetcher);

  return {
    logs: data ?? [],
    isLoading,
    error,
    refresh: mutate,
  };
}

type UseCellLogsPageOptions = {
  pageIndex: number;
  pageSize: number;
  from?: string | null;
  to?: string | null;
  sort?: "time:asc" | "time:desc";
};

type CellLogsPageResponse = {
  rows: unknown[];
  page: number;
  pageSize: number;
  totalCount: number;
};

export function useCellLogsPage(
  projectId: number | null,
  options: UseCellLogsPageOptions
) {
  const params = new URLSearchParams();
  params.set("projectId", String(projectId ?? ""));
  params.set("page", String(options.pageIndex + 1));
  params.set("pageSize", String(options.pageSize));
  params.set("sort", options.sort ?? "time:desc");

  if (options.from) params.set("from", options.from);
  if (options.to) params.set("to", options.to);

  const key = projectId ? `/api/cell-logs?${params.toString()}` : null;
  const { data, error, isLoading, mutate } = useSWR<CellLogsPageResponse>(
    key,
    fetcher,
    { keepPreviousData: true }
  );

  return {
    logs: data?.rows ?? [],
    page: data?.page ?? options.pageIndex + 1,
    pageSize: data?.pageSize ?? options.pageSize,
    totalCount: data?.totalCount ?? 0,
    isLoading,
    error,
    refresh: mutate,
  };
}

type MapViewport = {
  north: number;
  south: number;
  east: number;
  west: number;
  zoom: number;
} | null;

type CellLogMapPointsResponse = {
  points: CellLogMapPoint[];
  totalPointCount: number;
  aggregated: boolean;
};

export function useCellLogMapPoints(
  projectId: number | null,
  viewport: MapViewport
) {
  const params = new URLSearchParams();
  params.set("projectId", String(projectId ?? ""));

  if (viewport) {
    params.set("north", String(viewport.north));
    params.set("south", String(viewport.south));
    params.set("east", String(viewport.east));
    params.set("west", String(viewport.west));
    params.set("zoom", String(viewport.zoom));
  }

  const key = projectId
    ? `/api/cell-logs/map-points?${params.toString()}`
    : null;
  const { data, error, isLoading, mutate } =
    useSWR<CellLogMapPointsResponse>(key, fetcher, {
      keepPreviousData: true,
    });

  return {
    points: data?.points ?? [],
    totalPointCount: data?.totalPointCount ?? 0,
    aggregated: data?.aggregated ?? false,
    isLoading,
    error,
    refresh: mutate,
  };
}

type CellLogSummaryResponse = {
  totalCount: number;
  plottedCount: number;
  firstTimestamp: string | null;
  lastTimestamp: string | null;
};

export function useCellLogSummary(projectId: number | null) {
  const key = projectId ? `/api/cell-logs/summary?projectId=${projectId}` : null;
  const { data, error, isLoading, mutate } = useSWR<CellLogSummaryResponse>(
    key,
    fetcher
  );

  return {
    summary: data ?? {
      totalCount: 0,
      plottedCount: 0,
      firstTimestamp: null,
      lastTimestamp: null,
    },
    isLoading,
    error,
    refresh: mutate,
  };
}

export async function fetchCellLogIds({
  projectId,
  from,
  to,
}: {
  projectId: number;
  from?: string | null;
  to?: string | null;
}) {
  const params = new URLSearchParams();
  params.set("projectId", String(projectId));
  if (from) params.set("from", from);
  if (to) params.set("to", to);

  const res = await fetch(`/api/cell-logs/ids?${params.toString()}`, {
    credentials: "include",
  });

  if (!res.ok) throw new Error("Failed to fetch ids");

  const data = (await res.json()) as { ids: number[] };
  return data.ids;
}

export function useProjects() {
  const { data, error, isLoading, mutate } = useSWR<SelectProject[]>(
    "/api/projects",
    fetcher
  );

  return {
    projects: data ?? [],
    isLoading,
    error,
    refresh: mutate,
  };
}

export async function postCellLog(
  log: {
    projectId: number;
    time: string;
    mcc: string;
    mnc: string;
    tac: string;
    cid: string;
  },
  mutate: () => void
) {
  const res = await fetch("/api/cell-logs", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(log),
  });

  if (!res.ok) throw new Error("Failed to add log");
  mutate();
}

export async function postMultipleCellLogs(
  logs: ParsedRow[],
  projectId: number,
  mutate: () => void
) {
  const res = await fetch("/api/cell-logs/bulk", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ logs, projectId }),
  });

  if (!res.ok) {
    throw new Error("Failed to add multiple logs");
  }

  mutate();
}

export async function patchCellLog(
  id: number,
  log: {
    time: string;
    mcc: string;
    mnc: string;
    tac: string;
    cid: string;
    projectId: number;
  },
  mutate: () => void
) {
  const res = await fetch(`/api/cell-logs/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(log),
  });

  if (!res.ok) throw new Error("Failed to edit log");

  mutate();
}

export async function patchCellLogs(
  changes: Array<{
    id: number;
    patch: {
      time?: string;
      mcc?: string;
      mnc?: string;
      tac?: string;
      cid?: string;
      projectId?: number;
    };
  }>,
  mutate: () => void
) {
  const res = await fetch("/api/cell-logs/bulk", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ changes }),
  });

  if (!res.ok) throw new Error("Failed to edit logs");

  mutate();
}

export async function deleteCellLog(id: number, mutate: () => void) {
  const res = await fetch(`/api/cell-logs/${id}`, {
    method: "DELETE",
  });

  if (!res.ok) throw new Error("Failed to delete log");

  mutate();
}

export async function deleteCellLogs(ids: number[], mutate: () => void) {
  const res = await fetch("/api/cell-logs/bulk", {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ids }),
  });

  if (!res.ok) throw new Error("Failed to delete logs");

  mutate();
}

export async function createProject(projectName: string, mutate: () => void) {
  const res = await fetch("/api/projects", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(projectName),
  });

  if (!res.ok) throw new Error("Failed to add log");
  mutate();
}

export async function updateProject(
  projectId: number,
  projectName: string,
  mutate: () => void
) {
  const res = await fetch(`/api/projects/${projectId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name: projectName }),
  });

  if (!res.ok) throw new Error("Failed to update project");
  mutate();
}

export async function deleteProject(projectId: number, mutate: () => void) {
  const res = await fetch(`/api/projects/${projectId}`, {
    method: "DELETE",
  });

  if (!res.ok) throw new Error("Failed to delete project");
  mutate();
}
