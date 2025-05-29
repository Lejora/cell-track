export const runtime = "edge";

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

  } catch (error: any) {
    return c.json({ error: "Internal Server Error", details: error }, 500);
  }
});

export async function POST(request: Request) {
  return app.fetch(request);
}