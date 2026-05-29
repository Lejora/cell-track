export const runtime = "nodejs";

import { auth } from "@/auth";
import {
  addCellLog,
  addMultipleCellLogs,
  createProject,
  deleteCellLog,
  deleteCellLogs,
  deleteProject,
  editCellLog,
  editCellLogs,
  exportUserData,
  getMyCellLogs,
  getMyCellLogSummary,
  getMyCellLogIds,
  getMyCellLogsPage,
  getMyCellMapPoints,
  getMyProjects,
  getUserAccountInfo,
  getUserSettings,
  updateProject,
  upsertUserSettings,
} from "@/lib/queries";
import { settingsUpdateSchema } from "@/utils/validator/settings-validator";
import { Hono } from "hono";

const app = new Hono();

function numberQuery(value: string | undefined) {
  if (value === undefined) return null;
  const numberValue = Number(value);
  return Number.isFinite(numberValue) ? numberValue : null;
}

app.get("/api/cell-logs", async (c) => {
  try {
    const session = await auth();
    const userId = session?.user?.id;

    if (!userId) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    const projectIdStr = c.req.query("projectId");

    if (!projectIdStr) {
      return c.json({ error: "Query parameter 'projectId' is required" }, 400);
    }

    const projectId = parseInt(projectIdStr);

    const pageStr = c.req.query("page");
    const pageSizeStr = c.req.query("pageSize");

    if (pageStr || pageSizeStr) {
      const page = pageStr ? Number(pageStr) : 1;
      const pageSize = pageSizeStr ? Number(pageSizeStr) : 100;

      if (!Number.isFinite(page) || !Number.isFinite(pageSize)) {
        return c.json({ error: "Invalid pagination parameters" }, 400);
      }

      const logsPage = await getMyCellLogsPage(projectId, {
        page,
        pageSize,
        from: c.req.query("from"),
        to: c.req.query("to"),
        sort: c.req.query("sort") === "time:asc" ? "time:asc" : "time:desc",
      });

      return c.json(logsPage);
    }

    const logs = await getMyCellLogs(projectId);
    return c.json(logs);
  } catch (e: unknown) {
    return c.json({ error: "Unauthorized", details: e }, 401);
  }
});

app.get("/api/cell-logs/ids", async (c) => {
  try {
    const session = await auth();
    const userId = session?.user?.id;

    if (!userId) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    const projectIdStr = c.req.query("projectId");

    if (!projectIdStr) {
      return c.json({ error: "Query parameter 'projectId' is required" }, 400);
    }

    const projectId = Number(projectIdStr);
    if (!Number.isInteger(projectId)) {
      return c.json({ error: "Invalid projectId" }, 400);
    }

    const ids = await getMyCellLogIds(projectId, {
      from: c.req.query("from"),
      to: c.req.query("to"),
    });

    return c.json({ ids });
  } catch (e: unknown) {
    return c.json({ error: "Failed to fetch ids", details: e }, 400);
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

app.post("/api/cell-logs/bulk", async (c) => {
  try {
    const body = await c.req.json();
    const { logs, projectId } = body;

    if (!projectId) {
      return c.json(
        { error: "projectId is required in the request body" },
        400
      );
    }

    if (!Array.isArray(logs) || logs.length == 0) {
      return c.json({ error: "Request body must be a non-empty array" }, 400);
    }

    const logsWithProjectId = logs.map((log) => ({
      ...log,
      projectId,
    }));

    const result = await addMultipleCellLogs(logsWithProjectId);
    return c.json({ ok: true, ...result });
  } catch (e: unknown) {
    return c.json({ error: e ?? "Error inserting multiple logs" }, 400);
  }
});

app.delete("/api/cell-logs/bulk", async (c) => {
  try {
    const body = await c.req.json();
    const ids = Array.isArray(body?.ids) ? body.ids.map(Number) : [];

    if (ids.length === 0) {
      return c.json({ error: "ids must be a non-empty array" }, 400);
    }

    const result = await deleteCellLogs(ids);
    return c.json({ ok: true, ...result });
  } catch (e: unknown) {
    return c.json({ error: e ?? "Error deleting logs" }, 400);
  }
});

app.get("/api/cell-logs/map-points", async (c) => {
  try {
    const session = await auth();
    const userId = session?.user?.id;

    if (!userId) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    const projectIdStr = c.req.query("projectId");

    if (!projectIdStr) {
      return c.json({ error: "Query parameter 'projectId' is required" }, 400);
    }

    const projectId = Number(projectIdStr);
    if (!Number.isInteger(projectId)) {
      return c.json({ error: "Invalid projectId" }, 400);
    }

    const result = await getMyCellMapPoints(projectId, {
      north: numberQuery(c.req.query("north")),
      south: numberQuery(c.req.query("south")),
      east: numberQuery(c.req.query("east")),
      west: numberQuery(c.req.query("west")),
      zoom: numberQuery(c.req.query("zoom")),
    });

    return c.json(result);
  } catch (e: unknown) {
    return c.json({ error: "Failed to fetch map points", details: e }, 400);
  }
});

app.get("/api/cell-logs/summary", async (c) => {
  try {
    const session = await auth();
    const userId = session?.user?.id;

    if (!userId) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    const projectIdStr = c.req.query("projectId");

    if (!projectIdStr) {
      return c.json({ error: "Query parameter 'projectId' is required" }, 400);
    }

    const projectId = Number(projectIdStr);
    if (!Number.isInteger(projectId)) {
      return c.json({ error: "Invalid projectId" }, 400);
    }

    return c.json(await getMyCellLogSummary(projectId));
  } catch (e: unknown) {
    return c.json({ error: "Failed to fetch summary", details: e }, 400);
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

app.patch("/api/cell-logs/bulk", async (c) => {
  try {
    const body = await c.req.json();
    const changes = Array.isArray(body?.changes) ? body.changes : [];

    if (changes.length === 0) {
      return c.json({ error: "changes must be a non-empty array" }, 400);
    }

    const result = await editCellLogs(changes);
    return c.json({ ok: true, ...result });
  } catch (e: unknown) {
    return c.json({ error: e ?? "Error editing logs" }, 400);
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

app.get("/api/settings", async (c) => {
  try {
    const session = await auth();
    const userId = session?.user?.id;

    if (!userId) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    const settings = await getUserSettings(userId);

    if (!settings) {
      return c.json({
        defaultMapLat: 36.108905769550155,
        defaultMapLng: 140.0997873925421,
        defaultZoomLevel: 15,
        showAccuracyCircles: true,
        circleColor: "#fa6e6e",
        circleOpacity: 0.05,
      });
    }

    return c.json({
      defaultMapLat: settings.defaultMapLat,
      defaultMapLng: settings.defaultMapLng,
      defaultZoomLevel: settings.defaultZoomLevel,
      showAccuracyCircles: settings.showAccuracyCircles,
      circleColor: settings.circleColor,
      circleOpacity: settings.circleOpacity,
    });
  } catch (e: unknown) {
    return c.json({ error: "Failed to fetch settings", details: e }, 500);
  }
});

app.put("/api/settings", async (c) => {
  try {
    const session = await auth();
    const userId = session?.user?.id;

    if (!userId) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    const body = await c.req.json();

    const validationResult = settingsUpdateSchema.safeParse(body);

    if (!validationResult.success) {
      return c.json(
        {
          error: "Validation failed",
          details: validationResult.error.issues,
        },
        400
      );
    }

    const updatedSettings = await upsertUserSettings(validationResult.data);

    return c.json({
      message: "Settings updated successfully",
      settings: {
        defaultMapLat: updatedSettings.defaultMapLat,
        defaultMapLng: updatedSettings.defaultMapLng,
        defaultZoomLevel: updatedSettings.defaultZoomLevel,
        showAccuracyCircles: updatedSettings.showAccuracyCircles,
        circleColor: updatedSettings.circleColor,
        circleOpacity: updatedSettings.circleOpacity,
      },
    });
  } catch (e: unknown) {
    return c.json({ error: "Failed to update settings", details: e }, 500);
  }
});

app.get("/api/account", async (c) => {
  try {
    const session = await auth();
    const userId = session?.user?.id;

    if (!userId || !session.user) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    const accountInfo = await getUserAccountInfo(userId);

    return c.json(accountInfo);
  } catch (e: unknown) {
    return c.json({ error: "Failed to fetch account info", details: e }, 500);
  }
});

app.get("/api/account/export", async (c) => {
  try {
    const session = await auth();
    const userId = session?.user?.id;

    if (!userId || !session.user) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    const userData = await exportUserData(userId);

    return c.json({
      exportedAt: new Date().toISOString(),
      user: {
        id: session.user.id,
        name: session.user.name,
        email: session.user.email,
      },
      data: userData,
    });
  } catch (e: unknown) {
    return c.json({ error: "Failed to export data", details: e }, 500);
  }
});

app.get("/api/projects", async (c) => {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    const projects = await getMyProjects();
    return c.json(projects);
  } catch (err) {
    return c.json({ error: err ?? "Failed to fetch projects" }, 500);
  }
});

app.post("/api/projects", async (c) => {
  try {
    const projectName: string = await c.req.json();
    await createProject(projectName);
    return c.json({ ok: true });
  } catch (e: unknown) {
    return c.json({ error: e ?? "Error adding project" }, 400);
  }
});

app.patch("/api/projects/:id", async (c) => {
  try {
    const projectId = Number(c.req.param("id"));
    if (Number.isNaN(projectId)) {
      return c.json({ error: "Invalid project id" }, 400);
    }

    const body = await c.req.json();
    const name =
      typeof body?.name === "string" ? body.name.trim() : undefined;

    if (!name) {
      return c.json({ error: "Project name is required" }, 400);
    }

    await updateProject(projectId, name);
    return c.json({ ok: true });
  } catch (e: unknown) {
    return c.json({ error: e ?? "Error updating project" }, 400);
  }
});

app.delete("/api/projects/:id", async (c) => {
  try {
    const projectId = Number(c.req.param("id"));
    if (Number.isNaN(projectId)) {
      return c.json({ error: "Invalid project id" }, 400);
    }

    await deleteProject(projectId);
    return c.json({ ok: true });
  } catch (e: unknown) {
    return c.json({ error: e ?? "Error deleting project" }, 400);
  }
});

export async function GET(request: Request) {
  return app.fetch(request);
}

export async function POST(request: Request) {
  return app.fetch(request);
}

export async function PUT(request: Request) {
  return app.fetch(request);
}

export async function PATCH(request: Request) {
  return app.fetch(request);
}

export async function DELETE(request: Request) {
  return app.fetch(request);
}
