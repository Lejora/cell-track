import useSWR from "swr";

const fetcher = (url: string) =>
  fetch(url, { credentials: "include" }).then((res) => {
    if (!res.ok) throw new Error("Failed to fetch");
    return res.json();
  });

export function useCellLogs() {
  const { data, error, isLoading, mutate } = useSWR("/api/cell-logs", fetcher);

  return {
    logs: data ?? [],
    isLoading,
    error,
    refresh: mutate,
  };
}

export async function postCellLog(
  log: { time: string; mcc: string; mnc: string; tac: string; cid: string },
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

export async function patchCellLog(
  id: number,
  log: { time: string; mcc: string; mnc: string; tac: string; cid: string },
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

export async function deleteCellLog(id: number, mutate: () => void) {
  const res = await fetch(`/api/cell-logs/${id}`, {
    method: "DELETE",
  });
  if (!res.ok) throw new Error("Failed to delete log");
  mutate();
}
