export async function fetchMyCellLogs() {
  const res = await fetch("/api/cell-logs");
  if (!res.ok) throw new Error("Failed to fetch logs");
  return await res.json();
}

export async function postCellLog(log: {
  time: string;
  mcc: string;
  mnc: string;
  tac: string;
  cid: string;
}) {
  const res = await fetch("/api/cell-logs", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(log),
  });
  if (!res.ok) throw new Error("Failed to add log");
}

export async function patchCellLog(
  id: number,
  log: {
    time: string;
    mcc: string;
    mnc: string;
    tac: string;
    cid: string;
  }
) {
  const res = await fetch(`/api/cell-logs/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(log),
  });
  if (!res.ok) throw new Error("Failed to edit log");
}

export async function deleteCellLog(id: number) {
  const res = await fetch(`/api/cell-logs/${id}`, {
    method: "DELETE",
  });
  if (!res.ok) throw new Error("Failed to delete log");
}
