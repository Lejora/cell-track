import { auth } from "@/auth";
import { db } from "@/db/db";
import {
  accounts,
  cellLogs,
  InsertCellLog,
  InsertUserSettings,
  projects,
  SelectUserSettings,
  users,
  userSettings,
} from "@/db/schema";
import { geolocationAPIResponseParser } from "@/utils/validator/geo-api-response-validator";
import {
  and,
  asc,
  count,
  desc,
  eq,
  gte,
  inArray,
  lte,
  or,
  sql,
} from "drizzle-orm";

const GOOGLE_GEOLOCATION_API_URL =
  "https://www.googleapis.com/geolocation/v1/geolocate";
const GEOLOCATION_LOOKUP_CONCURRENCY = 8;
const GEOLOCATION_LOOKUP_MAX_RETRIES = 3;
const GEOLOCATION_LOOKUP_TIMEOUT_MS = 8_000;
const RETRYABLE_STATUS_CODES = new Set([408, 429, 500, 502, 503, 504]);

type CellLookupInput = {
  mcc?: string | null;
  mnc?: string | null;
  tac?: string | null;
  cid?: string | null;
};

type GeolocationLookupStatus = "resolved" | "failed" | "skipped";

type GeolocationLookupResult = {
  lat: number | null;
  lng: number | null;
  accuracy: number | null;
  status: GeolocationLookupStatus;
  error?: string;
};

export type AddMultipleCellLogsResult = {
  insertedCount: number;
  uniqueLookupCount: number;
  resolvedLookupCount: number;
  failedLookupCount: number;
  skippedLookupCount: number;
  resolvedLogCount: number;
  failedLogCount: number;
  skippedLogCount: number;
};

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function getGeolocationApiKey() {
  return (
    process.env.GOOGLE_MAPS_API_KEY ?? process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY
  );
}

function buildCellLookupKey(log: CellLookupInput) {
  return [
    log.mcc?.trim() ?? "",
    log.mnc?.trim() ?? "",
    log.tac?.trim().toUpperCase() ?? "",
    log.cid?.trim().toUpperCase() ?? "",
  ].join(":");
}

function toTowerPayload(log: CellLookupInput) {
  if (!log.mcc || !log.mnc || !log.tac || !log.cid) {
    return null;
  }

  const cellId = Number.parseInt(log.cid, 16);
  const locationAreaCode = Number.parseInt(log.tac, 16);
  const mobileCountryCode = Number.parseInt(log.mcc, 10);
  const mobileNetworkCode = Number.parseInt(log.mnc, 10);

  if (
    [cellId, locationAreaCode, mobileCountryCode, mobileNetworkCode].some(
      Number.isNaN
    )
  ) {
    return null;
  }

  return {
    cellId,
    locationAreaCode,
    mobileCountryCode,
    mobileNetworkCode,
  };
}

async function mapWithConcurrency<T, R>(
  items: T[],
  concurrency: number,
  mapper: (item: T, index: number) => Promise<R>
) {
  if (items.length === 0) {
    return [] as R[];
  }

  const results = new Array<R>(items.length);
  let nextIndex = 0;

  async function worker() {
    while (true) {
      const currentIndex = nextIndex;
      nextIndex += 1;

      if (currentIndex >= items.length) {
        return;
      }

      results[currentIndex] = await mapper(items[currentIndex], currentIndex);
    }
  }

  await Promise.all(
    Array.from({ length: Math.min(concurrency, items.length) }, () => worker())
  );

  return results;
}

async function fetchGeolocationForCell(
  log: CellLookupInput
): Promise<GeolocationLookupResult> {
  const towerPayload = toTowerPayload(log);
  if (!towerPayload) {
    return {
      lat: null,
      lng: null,
      accuracy: null,
      status: "skipped",
      error: "Missing or invalid cell tower identifiers",
    };
  }

  const apiKey = getGeolocationApiKey();
  if (!apiKey) {
    console.error("Google Maps API key is missing for server geolocation");
    return {
      lat: null,
      lng: null,
      accuracy: null,
      status: "failed",
      error: "Google Maps API key is missing",
    };
  }

  const requestBody = JSON.stringify({
    radioType: "lte",
    cellTowers: [towerPayload],
  });

  let lastError = "Unknown geolocation error";

  for (let attempt = 1; attempt <= GEOLOCATION_LOOKUP_MAX_RETRIES; attempt += 1) {
    try {
      const response = await fetch(`${GOOGLE_GEOLOCATION_API_URL}?key=${apiKey}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: requestBody,
        signal: AbortSignal.timeout(GEOLOCATION_LOOKUP_TIMEOUT_MS),
      });

      if (!response.ok) {
        const responseText = await response.text();
        lastError = `HTTP ${response.status}: ${responseText.slice(0, 300)}`;

        if (
          RETRYABLE_STATUS_CODES.has(response.status) &&
          attempt < GEOLOCATION_LOOKUP_MAX_RETRIES
        ) {
          await sleep(250 * 2 ** (attempt - 1));
          continue;
        }

        console.error("Google Geolocation API error", {
          key: buildCellLookupKey(log),
          attempt,
          status: response.status,
          body: responseText.slice(0, 300),
        });

        return {
          lat: null,
          lng: null,
          accuracy: null,
          status: "failed",
          error: lastError,
        };
      }

      const data = geolocationAPIResponseParser(await response.json());
      return {
        lat: data.location.lat,
        lng: data.location.lng,
        accuracy: data.accuracy,
        status: "resolved",
      };
    } catch (error) {
      lastError = error instanceof Error ? error.message : String(error);

      if (attempt < GEOLOCATION_LOOKUP_MAX_RETRIES) {
        await sleep(250 * 2 ** (attempt - 1));
        continue;
      }

      console.error("Error fetching geolocation", {
        key: buildCellLookupKey(log),
        attempt,
        error: lastError,
      });
    }
  }

  return {
    lat: null,
    lng: null,
    accuracy: null,
    status: "failed",
    error: lastError,
  };
}

export async function getMyCellLogs(projectId: number) {
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error("Unauthorized");
  }

  return db
    .select()
    .from(cellLogs)
    .where(
      and(
        eq(cellLogs.userId, session.user.id),
        eq(cellLogs.projectId, projectId)
      )
    );
}

type GetMyCellLogsPageOptions = {
  page: number;
  pageSize: number;
  from?: string | null;
  to?: string | null;
  sort?: "time:asc" | "time:desc";
};

function buildCellLogListFilters(
  userId: string,
  projectId: number,
  options: { from?: string | null; to?: string | null } = {}
) {
  const filters = [
    eq(cellLogs.userId, userId),
    eq(cellLogs.projectId, projectId),
  ];

  if (options.from) {
    filters.push(gte(cellLogs.time, options.from));
  }

  if (options.to) {
    filters.push(lte(cellLogs.time, options.to));
  }

  return filters;
}

export type CellLogMapPoint = {
  id: number;
  lat: number;
  lng: number;
  accuracy: number | null;
  time: string;
  tac: string | null;
  cid: string | null;
  count?: number;
  cluster?: boolean;
};

type GetMyCellMapPointsOptions = {
  north?: number | null;
  south?: number | null;
  east?: number | null;
  west?: number | null;
  zoom?: number | null;
};

export async function getMyCellLogsPage(
  projectId: number,
  options: GetMyCellLogsPageOptions
) {
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error("Unauthorized");
  }

  const page = Math.max(1, Math.floor(options.page));
  const pageSize = Math.min(500, Math.max(1, Math.floor(options.pageSize)));
  const offset = (page - 1) * pageSize;
  const where = and(
    ...buildCellLogListFilters(session.user.id, projectId, options)
  );
  const orderBy =
    options.sort === "time:asc" ? asc(cellLogs.time) : desc(cellLogs.time);

  const [rows, totalRows] = await Promise.all([
    db
      .select()
      .from(cellLogs)
      .where(where)
      .orderBy(orderBy)
      .limit(pageSize)
      .offset(offset),
    db.select({ value: count() }).from(cellLogs).where(where),
  ]);

  return {
    rows,
    page,
    pageSize,
    totalCount: totalRows[0]?.value ?? 0,
  };
}

export async function getMyCellLogIds(
  projectId: number,
  options: { from?: string | null; to?: string | null } = {}
) {
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error("Unauthorized");
  }

  const rows = await db
    .select({ id: cellLogs.id })
    .from(cellLogs)
    .where(
      and(...buildCellLogListFilters(session.user.id, projectId, options))
    );

  return rows.map((row) => row.id);
}

function isFiniteNumber(value: number | null | undefined): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function isLngWithinBounds(lng: number, west: number, east: number) {
  const normalizedLng = ((lng + 180) % 360) - 180;
  const normalizedWest = ((west + 180) % 360) - 180;
  const normalizedEast = ((east + 180) % 360) - 180;

  return normalizedWest <= normalizedEast
    ? normalizedLng >= normalizedWest && normalizedLng <= normalizedEast
    : normalizedLng >= normalizedWest || normalizedLng <= normalizedEast;
}

function aggregateMapPoints(points: CellLogMapPoint[], zoom: number) {
  const precision = zoom <= 8 ? 1 : zoom <= 10 ? 2 : 3;
  const clusters = new Map<
    string,
    {
      id: number;
      latSum: number;
      lngSum: number;
      count: number;
      firstTime: string;
      tac: string | null;
      cid: string | null;
    }
  >();

  for (const point of points) {
    const key = `${point.lat.toFixed(precision)}:${point.lng.toFixed(precision)}`;
    const current = clusters.get(key);

    if (!current) {
      clusters.set(key, {
        id: -clusters.size - 1,
        latSum: point.lat,
        lngSum: point.lng,
        count: 1,
        firstTime: point.time,
        tac: point.tac,
        cid: point.cid,
      });
      continue;
    }

    current.latSum += point.lat;
    current.lngSum += point.lng;
    current.count += 1;
    if (point.time < current.firstTime) {
      current.firstTime = point.time;
    }
  }

  return Array.from(clusters.values()).map<CellLogMapPoint>((cluster) => ({
    id: cluster.id,
    lat: cluster.latSum / cluster.count,
    lng: cluster.lngSum / cluster.count,
    accuracy: null,
    time: cluster.firstTime,
    tac: cluster.count === 1 ? cluster.tac : null,
    cid: cluster.count === 1 ? cluster.cid : null,
    count: cluster.count,
    cluster: cluster.count > 1,
  }));
}

export async function getMyCellMapPoints(
  projectId: number,
  options: GetMyCellMapPointsOptions = {}
) {
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error("Unauthorized");
  }

  const filters = [
    eq(cellLogs.userId, session.user.id),
    eq(cellLogs.projectId, projectId),
  ];

  if (isFiniteNumber(options.north) && isFiniteNumber(options.south)) {
    filters.push(gte(cellLogs.lat, options.south));
    filters.push(lte(cellLogs.lat, options.north));
  }

  if (isFiniteNumber(options.west) && isFiniteNumber(options.east)) {
    const west = options.west;
    const east = options.east;
    const lngFilter =
      west <= east
        ? and(gte(cellLogs.lng, west), lte(cellLogs.lng, east))
        : or(gte(cellLogs.lng, west), lte(cellLogs.lng, east));

    if (lngFilter) {
      filters.push(lngFilter);
    }
  }

  const rows = await db
    .select({
      id: cellLogs.id,
      lat: cellLogs.lat,
      lng: cellLogs.lng,
      accuracy: cellLogs.accuracy,
      time: cellLogs.time,
      tac: cellLogs.tac,
      cid: cellLogs.cid,
    })
    .from(cellLogs)
    .where(and(...filters));

  const points = rows.flatMap<CellLogMapPoint>((row) => {
    if (!isFiniteNumber(row.lat) || !isFiniteNumber(row.lng)) return [];

    if (
      isFiniteNumber(options.north) &&
      isFiniteNumber(options.south) &&
      (row.lat < options.south || row.lat > options.north)
    ) {
      return [];
    }

    if (
      isFiniteNumber(options.west) &&
      isFiniteNumber(options.east) &&
      !isLngWithinBounds(row.lng, options.west, options.east)
    ) {
      return [];
    }

    return [
      {
        id: row.id,
        lat: row.lat,
        lng: row.lng,
        accuracy: row.accuracy,
        time: row.time,
        tac: row.tac,
        cid: row.cid,
      },
    ];
  });

  const zoom = options.zoom ?? 15;
  const shouldAggregate = zoom <= 12 && points.length > 500;
  const visiblePoints = shouldAggregate ? aggregateMapPoints(points, zoom) : points;

  return {
    points: visiblePoints,
    totalPointCount: points.length,
    aggregated: shouldAggregate,
  };
}

export async function getMyCellLogSummary(projectId: number) {
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error("Unauthorized");
  }

  const [summary] = await db
    .select({
      totalCount: count(),
      plottedCount: sql<number>`count(${cellLogs.lat})`,
      firstTimestamp: sql<string | null>`min(${cellLogs.time})`,
      lastTimestamp: sql<string | null>`max(${cellLogs.time})`,
    })
    .from(cellLogs)
    .where(
      and(
        eq(cellLogs.userId, session.user.id),
        eq(cellLogs.projectId, projectId)
      )
    );

  return {
    totalCount: summary?.totalCount ?? 0,
    plottedCount: Number(summary?.plottedCount ?? 0),
    firstTimestamp: summary?.firstTimestamp ?? null,
    lastTimestamp: summary?.lastTimestamp ?? null,
  };
}

export async function getMyAllCellLogs({ limit = 500 }: { limit: number }) {
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error("Unauthorized");
  }

  return db
    .select()
    .from(cellLogs)
    .where(eq(cellLogs.userId, session.user.id))
    .orderBy(desc(cellLogs.createdAt))
    .limit(limit);
}

export async function addCellLog(
  log: Omit<
    InsertCellLog,
    "userId" | "createdAt" | "id" | "lat" | "lng" | "accuracy"
  >
) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  const { lat, lng, accuracy } = await fetchGeolocationForCell(log);

  await db.insert(cellLogs).values({
    ...log,
    lat,
    lng,
    accuracy,
    userId: session.user.id,
  });
}

export async function addMultipleCellLogs(
  logs: Omit<
    InsertCellLog,
    "userId" | "createdAt" | "id" | "lat" | "lng" | "accuracy"
  >[]
): Promise<AddMultipleCellLogsResult> {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  const userId = session.user.id;

  const uniqueLookupInputs = Array.from(
    new Map(logs.map((log) => [buildCellLookupKey(log), log])).entries()
  );

  const lookupEntries = await mapWithConcurrency(
    uniqueLookupInputs,
    GEOLOCATION_LOOKUP_CONCURRENCY,
    async ([key, log]) => [key, await fetchGeolocationForCell(log)] as const
  );

  const lookupByKey = new Map(lookupEntries);
  const logCounts = {
    resolved: 0,
    failed: 0,
    skipped: 0,
  };

  const insertData = logs.map((log) => {
    const lookupResult = lookupByKey.get(buildCellLookupKey(log)) ?? {
      lat: null,
      lng: null,
      accuracy: null,
      status: "failed" as const,
    };

    logCounts[lookupResult.status] += 1;

    return {
      ...log,
      lat: lookupResult.lat,
      lng: lookupResult.lng,
      accuracy: lookupResult.accuracy,
      userId,
    };
  });

  await db.insert(cellLogs).values(insertData);

  const lookupCounts = {
    resolved: lookupEntries.filter(([, result]) => result.status === "resolved")
      .length,
    failed: lookupEntries.filter(([, result]) => result.status === "failed")
      .length,
    skipped: lookupEntries.filter(([, result]) => result.status === "skipped")
      .length,
  };

  return {
    insertedCount: insertData.length,
    uniqueLookupCount: lookupEntries.length,
    resolvedLookupCount: lookupCounts.resolved,
    failedLookupCount: lookupCounts.failed,
    skippedLookupCount: lookupCounts.skipped,
    resolvedLogCount: logCounts.resolved,
    failedLogCount: logCounts.failed,
    skippedLogCount: logCounts.skipped,
  };
}

export async function deleteCellLog(id: number) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  await db
    .delete(cellLogs)
    .where(and(eq(cellLogs.id, id), eq(cellLogs.userId, session.user.id)));
}

export async function deleteCellLogs(ids: number[]) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  const uniqueIds = Array.from(
    new Set(ids.filter((id) => Number.isInteger(id) && id > 0))
  );

  if (uniqueIds.length === 0) {
    return { deletedCount: 0 };
  }

  const deletedRows = await db
    .delete(cellLogs)
    .where(
      and(
        inArray(cellLogs.id, uniqueIds),
        eq(cellLogs.userId, session.user.id)
      )
    )
    .returning({ id: cellLogs.id });

  return { deletedCount: deletedRows.length };
}

export async function editCellLog(
  id: number,
  log: Omit<InsertCellLog, "userId" | "createdAt" | "id">
) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  await db
    .update(cellLogs)
    .set(log)
    .where(and(eq(cellLogs.id, id), eq(cellLogs.userId, session.user.id)));
}

type BulkCellLogChange = {
  id: number;
  patch: Partial<
    Pick<InsertCellLog, "projectId" | "time" | "mcc" | "mnc" | "tac" | "cid">
  >;
};

export async function editCellLogs(changes: BulkCellLogChange[]) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");
  const userId = session.user.id;

  const validChanges = changes.filter(
    (change) => Number.isInteger(change.id) && change.id > 0 && change.patch
  );

  if (validChanges.length === 0) {
    return { updatedCount: 0 };
  }

  let updatedCount = 0;

  await db.transaction(async (tx) => {
    for (const change of validChanges) {
      const [updated] = await tx
        .update(cellLogs)
        .set(change.patch)
        .where(
          and(
            eq(cellLogs.id, change.id),
            eq(cellLogs.userId, userId)
          )
        )
        .returning({ id: cellLogs.id });

      if (updated) {
        updatedCount += 1;
      }
    }
  });

  return { updatedCount };
}

export async function getUserSettings(
  userId: string
): Promise<SelectUserSettings | null> {
  if (!userId) {
    throw new Error("Unauthorized");
  }

  const result = await db
    .select()
    .from(userSettings)
    .where(eq(userSettings.userId, userId));
  return result[0] || null;
}

export async function createUserSettings(
  settings: Omit<
    InsertUserSettings,
    "id" | "userId" | "createdAt" | "updatedAt"
  >
) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  const result = await db
    .insert(userSettings)
    .values({
      ...settings,
      userId: session.user.id,
    })
    .returning();

  return result[0];
}

export async function updateUserSettings(
  settings: Partial<Omit<InsertUserSettings, "id" | "userId" | "createdAt">>
) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  const result = await db
    .update(userSettings)
    .set({
      ...settings,
      updatedAt: new Date(),
    })
    .where(eq(userSettings.userId, session.user.id))
    .returning();

  return result[0];
}

export async function upsertUserSettings(
  settings: Omit<
    InsertUserSettings,
    "id" | "userId" | "createdAt" | "updatedAt"
  >
) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  const existing = await getUserSettings(session.user.id);

  if (existing) {
    return updateUserSettings(settings);
  } else {
    return createUserSettings(settings);
  }
}

export async function getUserAccountInfo(userId: string) {
  if (!userId) {
    throw new Error("Unauthorized");
  }

  const result = await db
    .select({
      user: users,
      account: accounts,
    })
    .from(users)
    .leftJoin(accounts, eq(accounts.userId, users.id))
    .where(eq(users.id, userId));

  if (!result[0]) {
    throw new Error("User not found");
  }

  const user = result[0].user;
  const githubAccount = result.find(
    (r) => r.account?.provider === "github"
  )?.account;

  return {
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      image: user.image,
      emailVerified: user.emailVerified,
    },
    githubAccount: githubAccount
      ? {
          provider: githubAccount.provider,
          providerAccountId: githubAccount.providerAccountId,
          connectedAt: new Date(),
        }
      : null,
  };
}

export async function exportUserData(userId: string) {
  if (!userId) {
    throw new Error("Unauthorized");
  }
  
  const logs = await getMyAllCellLogs({limit: 1000});
  return {
    cellLogs: logs,
    exportedAt: new Date().toISOString(),
  };
}

export async function createProject(name: string) {
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error("Unauthorized");
  }

  const [newProject] = await db
    .insert(projects)
    .values({ name, userId: session.user.id })
    .returning();

  return newProject;
}

export async function getMyProjects() {
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error("Unauthorized");
  }

  return db
    .select()
    .from(projects)
    .where(eq(projects.userId, session.user.id))
    .orderBy(desc(projects.createdAt));
}

export async function updateProject(id: number, name: string) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  const [updatedProject] = await db
    .update(projects)
    .set({ name, updatedAt: new Date() })
    .where(and(eq(projects.id, id), eq(projects.userId, session.user.id)))
    .returning();

  return updatedProject;
}

export async function deleteProject(id: number) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  await db
    .delete(projects)
    .where(and(eq(projects.id, id), eq(projects.userId, session.user.id)));
}
