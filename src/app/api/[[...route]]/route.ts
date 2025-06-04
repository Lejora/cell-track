export const runtime = "edge";

import { auth } from "@/auth";
import {
  addCellLog,
  deleteCellLog,
  editCellLog,
  getMyCellLogs,
} from "@/lib/queries";
import { geolocationAPIResponseParser } from "@/utils/validator/geo-api-response-validator";
import { Hono } from "hono";

export const app = new Hono();

app.post("/api/geolocation", async (c) => {
  const { mcc, mnc, tac, cid } = await c.req.json();

  if (!mcc || !mnc || !tac || !cid) {
    return c.json(
      {
        error: "Missing parameters: mcc, mnc, tac, cid are all required",
      },
      400
    );
  }

  const cellTower = {
    cellId: parseInt(cid, 16),
    locationAreaCode: parseInt(tac, 16),
    mobileCountryCode: parseInt(mcc),
    mobileNetworkCode: parseInt(mnc),
  };

  const payload = {
    radioType: "lte",
    cellTowers: [cellTower],
    considerIp: false,
  };

  const GOOGLE_MAPS_API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

  if (!GOOGLE_MAPS_API_KEY) {
    return c.json({ error: "API key is missing" }, 500);
  }

  try {
    const response = await fetch(
      `https://www.googleapis.com/geolocation/v1/geolocate?key=${GOOGLE_MAPS_API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      }
    );

    if (!response.ok) {
      const errorDetails = await response.json();
      return c.json({ error: "Google API error", details: errorDetails }, 502);
    }

    const data = await response.json();

    const parsedData = geolocationAPIResponseParser(data);

    return c.json(parsedData);
  } catch (e: unknown) {
    return c.json({ error: "Internal Server Error", details: e }, 500);
  }
});

app.get("/api/cell-logs", async (c) => {
  try {
    const session = await auth();
    const userId = session?.user?.id;

    if (!userId) {
      return c.json({ error: "Unauthorized" }, 401);
    }
    const logs = await getMyCellLogs(userId);
    return c.json(logs);
  } catch (e: unknown) {
    return c.json({ error: "Unauthorized", details: e }, 401);
  }
});

app.post("/api/cell-logs", async (c) => {
  try {
    const log = await c.req.json();
    await addCellLog(log);
    return c.json({ ok: true });
  } catch (e: unknown) {
    return c.json({ error: e ?? "Error inserting log" }, 400);
  }
});

app.delete("/api/cell-logs/:id", async (c) => {
  try {
    const id = parseInt(c.req.param("id"));
    await deleteCellLog(id);
    return c.json({ ok: true });
  } catch (e: unknown) {
    return c.json({ error: e ?? "Error deleting log" }, 400);
  }
});

app.patch("/api/cell-logs/:id", async (c) => {
  try {
    const id = parseInt(c.req.param("id"));
    const log = await c.req.json();
    await editCellLog(id, log);
    return c.json({ ok: true });
  } catch (e: unknown) {
    return c.json({ error: e ?? "Error editing log" }, 400);
  }
});

export async function GET(request: Request) {
  return app.fetch(request);
}

export async function POST(request: Request) {
  return app.fetch(request);
}

export async function PATCH(request: Request) {
  return app.fetch(request);
}

export async function DELETE(request: Request) {
  return app.fetch(request);
}
